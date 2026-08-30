-- Boatly Ops: lifecycle controls used by the calendar-first operator UI.
--
-- 1. An operator can release one civil day from a longer block without
--    deleting the rest of the period.
-- 2. An operator can duplicate a physical boat configuration without
--    copying operational history, files, reviews or occupancies.

begin;

create or replace function public.operator_release_boat_occupancy_scope(
  p_operator_id uuid,
  p_boat_id uuid,
  p_occupancy_id uuid,
  p_scope text default 'ALL',
  p_day_start timestamptz default null,
  p_day_end timestamptz default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_scope text := pg_catalog.upper(pg_catalog.btrim(coalesce(p_scope, '')));
  v_occupancy public.boat_occupancies%rowtype;
  v_segments_created integer := 0;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  if not private.has_operator_role(
    p_operator_id,
    array[
      'OWNER'::public.operator_member_role,
      'MANAGER'::public.operator_member_role
    ]
  ) then
    raise exception using errcode = '42501', message = 'occupancy_release_not_allowed';
  end if;

  if v_scope not in ('ALL', 'DAY') then
    raise exception using errcode = '22023', message = 'invalid_release_scope';
  end if;

  select bo.*
  into v_occupancy
  from public.boat_occupancies bo
  where bo.id = p_occupancy_id
    and bo.operator_id = p_operator_id
    and bo.boat_id = p_boat_id
    and bo.is_active = true
  for update;

  if not found then
    raise exception using errcode = '22023', message = 'active_occupancy_not_found';
  end if;

  if v_occupancy.occupancy_type in (
    'BOOKING'::public.boat_occupancy_type,
    'MANUAL_BOOKING'::public.boat_occupancy_type,
    'HOLD'::public.boat_occupancy_type
  ) then
    raise exception using errcode = '42501', message = 'system_occupancy_cannot_be_released_here';
  end if;

  if v_scope = 'DAY' then
    if p_day_start is null
       or p_day_end is null
       or p_day_end <= p_day_start then
      raise exception using errcode = '22023', message = 'invalid_release_day';
    end if;

    if v_occupancy.starts_at >= p_day_end
       or v_occupancy.ends_at <= p_day_start then
      raise exception using errcode = '22023', message = 'release_day_outside_occupancy';
    end if;
  end if;

  -- Release first so the exclusion constraint never sees the replacement
  -- fragments as overlapping the original row.
  update public.boat_occupancies
  set
    is_active = false,
    released_at = pg_catalog.now(),
    released_by = v_user_id,
    release_reason = case
      when v_scope = 'DAY' then 'DAY_RELEASED_FROM_CALENDAR'
      else 'PERIOD_RELEASED_FROM_CALENDAR'
    end
  where id = v_occupancy.id;

  if v_scope = 'DAY' and v_occupancy.starts_at < p_day_start then
    insert into public.boat_occupancies (
      operator_id,
      boat_id,
      occupancy_type,
      starts_at,
      ends_at,
      title,
      notes,
      is_active,
      created_by
    ) values (
      v_occupancy.operator_id,
      v_occupancy.boat_id,
      v_occupancy.occupancy_type,
      v_occupancy.starts_at,
      least(v_occupancy.ends_at, p_day_start),
      v_occupancy.title,
      v_occupancy.notes,
      true,
      v_occupancy.created_by
    );
    v_segments_created := v_segments_created + 1;
  end if;

  if v_scope = 'DAY' and v_occupancy.ends_at > p_day_end then
    insert into public.boat_occupancies (
      operator_id,
      boat_id,
      occupancy_type,
      starts_at,
      ends_at,
      title,
      notes,
      is_active,
      created_by
    ) values (
      v_occupancy.operator_id,
      v_occupancy.boat_id,
      v_occupancy.occupancy_type,
      greatest(v_occupancy.starts_at, p_day_end),
      v_occupancy.ends_at,
      v_occupancy.title,
      v_occupancy.notes,
      true,
      v_occupancy.created_by
    );
    v_segments_created := v_segments_created + 1;
  end if;

  return v_segments_created;
end;
$$;

revoke all on function public.operator_release_boat_occupancy_scope(
  uuid,
  uuid,
  uuid,
  text,
  timestamptz,
  timestamptz
) from public, anon;

grant execute on function public.operator_release_boat_occupancy_scope(
  uuid,
  uuid,
  uuid,
  text,
  timestamptz,
  timestamptz
) to authenticated;

comment on function public.operator_release_boat_occupancy_scope(
  uuid,
  uuid,
  uuid,
  text,
  timestamptz,
  timestamptz
) is
  'Releases an entire operator block or one civil day by atomically splitting the remaining period.';

create or replace function public.operator_duplicate_boat(
  p_operator_id uuid,
  p_source_boat_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_source public.boats%rowtype;
  v_new_boat_id uuid := pg_catalog.gen_random_uuid();
  v_copy_number integer := 1;
  v_suffix text;
  v_name text;
  v_internal_code text;
  v_legal record;
  v_new_legal_id uuid;
  v_rate record;
  v_new_rate_id uuid;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  if not private.has_operator_role(
    p_operator_id,
    array[
      'OWNER'::public.operator_member_role,
      'MANAGER'::public.operator_member_role
    ]
  ) or not exists (
    select 1
    from public.operators o
    where o.id = p_operator_id
      and o.status in (
        'DRAFT'::public.operator_status,
        'PENDING_VERIFICATION'::public.operator_status,
        'ACTIVE'::public.operator_status
      )
      and o.deleted_at is null
  ) then
    raise exception using errcode = '42501', message = 'boat_duplicate_not_allowed';
  end if;

  select b.*
  into v_source
  from public.boats b
  where b.id = p_source_boat_id
    and b.operator_id = p_operator_id
    and b.deleted_at is null
    and b.deletion_requested_at is null
  for update;

  if not found then
    raise exception using errcode = '22023', message = 'boat_not_found';
  end if;

  loop
    v_suffix := case
      when v_copy_number = 1 then ' (copia)'
      else pg_catalog.format(' (copia %s)', v_copy_number)
    end;
    v_name := pg_catalog.left(
      v_source.name,
      greatest(1, 160 - pg_catalog.char_length(v_suffix))
    ) || v_suffix;

    exit when not exists (
      select 1
      from public.boats b
      where b.operator_id = p_operator_id
        and b.deleted_at is null
        and pg_catalog.lower(b.name) = pg_catalog.lower(v_name)
    );

    v_copy_number := v_copy_number + 1;
    if v_copy_number > 9999 then
      raise exception using errcode = '54000', message = 'too_many_boat_copies';
    end if;
  end loop;

  if v_source.internal_code is not null then
    v_copy_number := 1;
    loop
      v_suffix := case
        when v_copy_number = 1 then '-COPY'
        else pg_catalog.format('-COPY-%s', v_copy_number)
      end;
      v_internal_code := pg_catalog.left(
        v_source.internal_code,
        greatest(1, 80 - pg_catalog.char_length(v_suffix))
      ) || v_suffix;

      exit when not exists (
        select 1
        from public.boats b
        where b.operator_id = p_operator_id
          and b.internal_code is not null
          and pg_catalog.lower(b.internal_code) = pg_catalog.lower(v_internal_code)
      );

      v_copy_number := v_copy_number + 1;
      if v_copy_number > 9999 then
        raise exception using errcode = '54000', message = 'too_many_internal_code_copies';
      end if;
    end loop;
  end if;

  insert into public.boats (
    id,
    operator_id,
    primary_location_id,
    boat_type_id,
    status,
    internal_code,
    name,
    slug,
    short_description,
    description,
    manufacturer,
    model,
    manufacture_year,
    registration_number,
    registration_country_code,
    hull_identification_number,
    length_cm,
    beam_cm,
    draft_cm,
    technical_passenger_capacity,
    operator_passenger_limit,
    cabins,
    berths,
    bathrooms,
    engine_count,
    engine_manufacturer,
    engine_model,
    engine_installation,
    engine_fuel_type,
    engine_combustion_cycle,
    engine_direct_injection,
    engine_power_kw,
    engine_power_hp,
    engine_displacement_cc,
    max_speed_knots,
    license_required,
    deletion_requested_at,
    purge_after,
    deleted_at
  ) values (
    v_new_boat_id,
    v_source.operator_id,
    v_source.primary_location_id,
    v_source.boat_type_id,
    'ACTIVE'::public.boat_status,
    v_internal_code,
    v_name,
    null,
    v_source.short_description,
    v_source.description,
    v_source.manufacturer,
    v_source.model,
    v_source.manufacture_year,
    v_source.registration_number,
    v_source.registration_country_code,
    v_source.hull_identification_number,
    v_source.length_cm,
    v_source.beam_cm,
    v_source.draft_cm,
    v_source.technical_passenger_capacity,
    v_source.operator_passenger_limit,
    v_source.cabins,
    v_source.berths,
    v_source.bathrooms,
    v_source.engine_count,
    v_source.engine_manufacturer,
    v_source.engine_model,
    v_source.engine_installation,
    v_source.engine_fuel_type,
    v_source.engine_combustion_cycle,
    v_source.engine_direct_injection,
    v_source.engine_power_kw,
    v_source.engine_power_hp,
    v_source.engine_displacement_cc,
    v_source.max_speed_knots,
    v_source.license_required,
    null,
    null,
    null
  );

  insert into public.boat_amenities (boat_id, amenity_id, notes)
  select v_new_boat_id, ba.amenity_id, ba.notes
  from public.boat_amenities ba
  where ba.boat_id = v_source.id;

  insert into public.boat_extras (
    boat_id,
    extra_id,
    operator_id,
    price_override_cents,
    max_quantity_override,
    is_active
  )
  select
    v_new_boat_id,
    be.extra_id,
    be.operator_id,
    be.price_override_cents,
    be.max_quantity_override,
    be.is_active
  from public.boat_extras be
  where be.boat_id = v_source.id;

  insert into public.boat_availability_rules (
    operator_id,
    boat_id,
    weekday,
    available_from,
    available_to,
    timezone,
    valid_from,
    valid_to,
    is_active
  )
  select
    bar.operator_id,
    v_new_boat_id,
    bar.weekday,
    bar.available_from,
    bar.available_to,
    bar.timezone,
    bar.valid_from,
    bar.valid_to,
    bar.is_active
  from public.boat_availability_rules bar
  where bar.boat_id = v_source.id;

  for v_legal in
    select blo.*
    from public.boat_legal_offerings blo
    where blo.boat_id = v_source.id
    order by blo.created_at, blo.id
  loop
    insert into public.boat_legal_offerings (
      boat_id,
      legal_type,
      skipper_mode,
      self_drive_allowed,
      minimum_driver_age,
      navigation_limit_notes,
      eligibility_notes,
      is_active
    ) values (
      v_new_boat_id,
      v_legal.legal_type,
      v_legal.skipper_mode,
      v_legal.self_drive_allowed,
      v_legal.minimum_driver_age,
      v_legal.navigation_limit_notes,
      v_legal.eligibility_notes,
      v_legal.is_active
    ) returning id into v_new_legal_id;

    for v_rate in
      select brp.*
      from public.boat_rate_plans brp
      where brp.boat_id = v_source.id
        and brp.legal_offering_id = v_legal.id
      order by brp.created_at, brp.id
    loop
      insert into public.boat_rate_plans (
        operator_id,
        boat_id,
        legal_offering_id,
        cancellation_policy_id,
        name,
        code,
        duration_mode,
        base_duration_minutes,
        base_price_cents,
        duration_step_minutes,
        additional_step_price_cents,
        max_duration_minutes,
        valid_from,
        valid_to,
        priority,
        is_default,
        is_active
      ) values (
        v_rate.operator_id,
        v_new_boat_id,
        v_new_legal_id,
        v_rate.cancellation_policy_id,
        v_rate.name,
        v_rate.code,
        v_rate.duration_mode,
        v_rate.base_duration_minutes,
        v_rate.base_price_cents,
        v_rate.duration_step_minutes,
        v_rate.additional_step_price_cents,
        v_rate.max_duration_minutes,
        v_rate.valid_from,
        v_rate.valid_to,
        v_rate.priority,
        v_rate.is_default,
        v_rate.is_active
      ) returning id into v_new_rate_id;

      insert into public.boat_pricing_rules (
        rate_plan_id,
        name,
        valid_from,
        valid_to,
        weekdays,
        start_time_from,
        start_time_to,
        minimum_duration_minutes,
        maximum_duration_minutes,
        adjustment_type,
        price_override_cents,
        price_delta_cents,
        price_delta_bps,
        priority,
        is_stackable,
        is_active
      )
      select
        v_new_rate_id,
        bpr.name,
        bpr.valid_from,
        bpr.valid_to,
        bpr.weekdays,
        bpr.start_time_from,
        bpr.start_time_to,
        bpr.minimum_duration_minutes,
        bpr.maximum_duration_minutes,
        bpr.adjustment_type,
        bpr.price_override_cents,
        bpr.price_delta_cents,
        bpr.price_delta_bps,
        bpr.priority,
        bpr.is_stackable,
        bpr.is_active
      from public.boat_pricing_rules bpr
      where bpr.rate_plan_id = v_rate.id;
    end loop;
  end loop;

  for v_rate in
    select brp.*
    from public.boat_rate_plans brp
    where brp.boat_id = v_source.id
      and brp.legal_offering_id is null
    order by brp.created_at, brp.id
  loop
    insert into public.boat_rate_plans (
      operator_id,
      boat_id,
      legal_offering_id,
      cancellation_policy_id,
      name,
      code,
      duration_mode,
      base_duration_minutes,
      base_price_cents,
      duration_step_minutes,
      additional_step_price_cents,
      max_duration_minutes,
      valid_from,
      valid_to,
      priority,
      is_default,
      is_active
    ) values (
      v_rate.operator_id,
      v_new_boat_id,
      null,
      v_rate.cancellation_policy_id,
      v_rate.name,
      v_rate.code,
      v_rate.duration_mode,
      v_rate.base_duration_minutes,
      v_rate.base_price_cents,
      v_rate.duration_step_minutes,
      v_rate.additional_step_price_cents,
      v_rate.max_duration_minutes,
      v_rate.valid_from,
      v_rate.valid_to,
      v_rate.priority,
      v_rate.is_default,
      v_rate.is_active
    ) returning id into v_new_rate_id;

    insert into public.boat_pricing_rules (
      rate_plan_id,
      name,
      valid_from,
      valid_to,
      weekdays,
      start_time_from,
      start_time_to,
      minimum_duration_minutes,
      maximum_duration_minutes,
      adjustment_type,
      price_override_cents,
      price_delta_cents,
      price_delta_bps,
      priority,
      is_stackable,
      is_active
    )
    select
      v_new_rate_id,
      bpr.name,
      bpr.valid_from,
      bpr.valid_to,
      bpr.weekdays,
      bpr.start_time_from,
      bpr.start_time_to,
      bpr.minimum_duration_minutes,
      bpr.maximum_duration_minutes,
      bpr.adjustment_type,
      bpr.price_override_cents,
      bpr.price_delta_cents,
      bpr.price_delta_bps,
      bpr.priority,
      bpr.is_stackable,
      bpr.is_active
    from public.boat_pricing_rules bpr
    where bpr.rate_plan_id = v_rate.id;
  end loop;

  return v_new_boat_id;
end;
$$;

revoke all on function public.operator_duplicate_boat(uuid, uuid)
from public, anon;

grant execute on function public.operator_duplicate_boat(uuid, uuid)
to authenticated;

comment on function public.operator_duplicate_boat(uuid, uuid) is
  'Duplicates boat configuration and commercial setup while excluding bookings, occupancies, media, documents and history.';

commit;
