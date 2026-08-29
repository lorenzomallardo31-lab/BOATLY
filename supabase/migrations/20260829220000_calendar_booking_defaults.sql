-- ============================================================
-- BOATLY OPS
-- Calendar bookings without location/formula gates
-- ============================================================

begin;

create or replace function public.operator_create_calendar_booking(
  p_operator_id uuid,
  p_boat_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_passenger_count integer,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_total_cents integer,
  p_operator_note text,
  p_operator_customer_id uuid,
  p_legal_offering_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_operator public.operators%rowtype;
  v_boat public.boats%rowtype;
  v_legal_offering_id uuid;
  v_pickup_location_id uuid;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  if not private.has_operator_role(
    p_operator_id,
    array[
      'OWNER'::public.operator_member_role,
      'MANAGER'::public.operator_member_role,
      'EMPLOYEE'::public.operator_member_role
    ]
  ) then
    raise exception using errcode = '42501', message = 'manual_booking_not_allowed';
  end if;

  select * into v_operator
  from public.operators o
  where o.id = p_operator_id
  for update;

  if not found or v_operator.status <> 'ACTIVE'::public.operator_status then
    raise exception using errcode = '22023', message = 'operator_must_be_active';
  end if;

  select * into v_boat
  from public.boats b
  where b.id = p_boat_id
    and b.operator_id = p_operator_id
  for no key update;

  if not found or v_boat.status <> 'ACTIVE'::public.boat_status then
    raise exception using errcode = '22023', message = 'boat_must_be_active';
  end if;

  if p_legal_offering_id is not null then
    select blo.id into v_legal_offering_id
    from public.boat_legal_offerings blo
    where blo.id = p_legal_offering_id
      and blo.boat_id = p_boat_id
      and blo.is_active = true;

    if not found then
      raise exception using errcode = '22023', message = 'legal_offering_not_available';
    end if;
  else
    select blo.id into v_legal_offering_id
    from public.boat_legal_offerings blo
    where blo.boat_id = p_boat_id
      and blo.is_active = true
    order by blo.created_at, blo.id
    limit 1;

    if v_legal_offering_id is null then
      insert into public.boat_legal_offerings (
        boat_id,
        legal_type,
        skipper_mode,
        self_drive_allowed,
        is_active
      ) values (
        p_boat_id,
        'LOCAZIONE'::public.boat_legal_offering_type,
        'NOT_AVAILABLE'::public.skipper_service_mode,
        true,
        true
      ) returning id into v_legal_offering_id;
    end if;
  end if;

  select ol.id into v_pickup_location_id
  from public.operator_locations ol
  where ol.operator_id = p_operator_id
    and ol.is_active = true
  order by ol.is_primary desc, ol.created_at, ol.id
  limit 1;

  if v_pickup_location_id is null then
    insert into public.operator_locations (
      operator_id,
      name,
      timezone,
      is_primary,
      is_public,
      is_active
    ) values (
      p_operator_id,
      pg_catalog.left(v_operator.name || ' · Sede operativa', 160),
      v_operator.timezone,
      true,
      false,
      true
    ) returning id into v_pickup_location_id;
  end if;

  return public.operator_create_manual_booking(
    p_operator_id,
    p_boat_id,
    v_legal_offering_id,
    v_pickup_location_id,
    p_starts_at,
    p_ends_at,
    p_passenger_count,
    p_customer_name,
    p_customer_email,
    p_customer_phone,
    p_total_cents,
    p_operator_note,
    p_operator_customer_id
  );
end;
$$;

revoke all on function public.operator_create_calendar_booking(
  uuid, uuid, timestamptz, timestamptz, integer, text, text, text, integer, text, uuid, uuid
) from public;

revoke execute on function public.operator_create_calendar_booking(
  uuid, uuid, timestamptz, timestamptz, integer, text, text, text, integer, text, uuid, uuid
) from anon;

grant execute on function public.operator_create_calendar_booking(
  uuid, uuid, timestamptz, timestamptz, integer, text, text, text, integer, text, uuid, uuid
) to authenticated, service_role;

commit;
