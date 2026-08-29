-- ============================================================
-- BOATLY OPS
-- Validated CRM mutations and auditable manual-booking
-- rescheduling by immutable replacement.
-- ============================================================

begin;

create or replace function public.operator_save_customer(
  p_operator_id uuid,
  p_customer_id uuid,
  p_display_name text,
  p_email text default null,
  p_phone text default null,
  p_country_code text default null,
  p_date_of_birth date default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_customer public.operator_customers%rowtype;
  v_customer_id uuid;
  v_display_name text := nullif(pg_catalog.btrim(coalesce(p_display_name, '')), '');
  v_email text := nullif(pg_catalog.lower(pg_catalog.btrim(coalesce(p_email, ''))), '');
  v_phone text := nullif(pg_catalog.btrim(coalesce(p_phone, '')), '');
  v_phone_key text;
  v_country_code text := pg_catalog.upper(nullif(pg_catalog.btrim(coalesce(p_country_code, '')), ''));
  v_notes text := nullif(pg_catalog.btrim(coalesce(p_notes, '')), '');
  v_email_customer_id uuid;
  v_phone_customer_id uuid;
  v_action text;
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
    raise exception using errcode = '42501', message = 'customer_save_not_allowed';
  end if;

  if not exists (
    select 1 from public.operators o
    where o.id = p_operator_id
      and o.status = 'ACTIVE'::public.operator_status
  ) then
    raise exception using errcode = '22023', message = 'operator_must_be_active';
  end if;

  if v_display_name is null or pg_catalog.length(v_display_name) < 2
     or pg_catalog.length(v_display_name) > 160 then
    raise exception using errcode = '22023', message = 'invalid_customer_name';
  end if;

  if v_email is null and v_phone is null then
    raise exception using errcode = '22023', message = 'customer_contact_required';
  end if;

  if v_email is not null
     and (pg_catalog.length(v_email) > 320
       or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$') then
    raise exception using errcode = '22023', message = 'invalid_customer_email';
  end if;

  if v_phone is not null then
    v_phone_key := private.boatly_normalize_phone(v_phone);
    if v_phone_key is null or pg_catalog.length(v_phone_key) not between 8 and 15 then
      raise exception using errcode = '22023', message = 'invalid_customer_phone';
    end if;
  end if;

  if v_country_code is not null and pg_catalog.length(v_country_code) <> 2 then
    raise exception using errcode = '22023', message = 'invalid_customer_country';
  end if;

  if p_date_of_birth is not null and (
    p_date_of_birth > current_date
    or p_date_of_birth < date '1900-01-01'
  ) then
    raise exception using errcode = '22023', message = 'invalid_customer_birth_date';
  end if;

  if v_notes is not null and pg_catalog.length(v_notes) > 5000 then
    raise exception using errcode = '22023', message = 'customer_notes_too_long';
  end if;

  if p_customer_id is not null then
    select * into v_customer
    from public.operator_customers oc
    where oc.id = p_customer_id
      and oc.operator_id = p_operator_id
    for update;

    if not found then
      raise exception using errcode = '22023', message = 'customer_not_found';
    end if;
    v_customer_id := v_customer.id;
    v_action := 'CRM_CUSTOMER_UPDATED';
  else
    v_customer_id := pg_catalog.gen_random_uuid();
    v_action := 'CRM_CUSTOMER_CREATED';
  end if;

  if v_email is not null then
    select oc.id into v_email_customer_id
    from public.operator_customers oc
    where oc.operator_id = p_operator_id
      and oc.id <> v_customer_id
      and pg_catalog.lower(pg_catalog.btrim(oc.email)) = v_email
    limit 1;
  end if;

  if v_phone_key is not null then
    select oc.id into v_phone_customer_id
    from public.operator_customers oc
    where oc.operator_id = p_operator_id
      and oc.id <> v_customer_id
      and private.boatly_normalize_phone(oc.phone) = v_phone_key
    limit 1;
  end if;

  if v_email_customer_id is not null
     and v_phone_customer_id is not null
     and v_email_customer_id <> v_phone_customer_id then
    raise exception using errcode = '23505', message = 'customer_identity_conflict';
  end if;

  if v_email_customer_id is not null then
    raise exception using errcode = '23505', message = 'customer_email_already_exists';
  end if;

  if v_phone_customer_id is not null then
    raise exception using errcode = '23505', message = 'customer_phone_already_exists';
  end if;

  begin
    if p_customer_id is null then
      insert into public.operator_customers (
        id, operator_id, display_name, email, phone,
        date_of_birth, country_code, notes, created_by
      ) values (
        v_customer_id, p_operator_id, v_display_name, v_email, v_phone,
        p_date_of_birth, v_country_code, v_notes, v_user_id
      );
    else
      update public.operator_customers
      set
        display_name = v_display_name,
        email = v_email,
        phone = v_phone,
        date_of_birth = p_date_of_birth,
        country_code = v_country_code,
        notes = v_notes
      where id = v_customer_id;
    end if;
  exception
    when unique_violation then
      -- Defensive fallback for a concurrent mutation that wins after the
      -- explicit checks above. Do not leak database constraint names.
      raise exception using errcode = '23505', message = 'customer_identity_conflict';
  end;

  insert into public.audit_logs (
    actor_type, actor_user_id, operator_id, action,
    entity_type, entity_id, metadata
  ) values (
    'OPERATOR'::public.audit_actor_type,
    v_user_id,
    p_operator_id,
    v_action,
    'OPERATOR_CUSTOMER',
    v_customer_id::text,
    pg_catalog.jsonb_build_object(
      'changed_fields', pg_catalog.jsonb_build_array(
        'display_name', 'email', 'phone', 'country_code', 'date_of_birth', 'notes'
      ),
      'sensitive_values_omitted', true
    )
  );

  return v_customer_id;
end;
$$;


create or replace function public.operator_reschedule_manual_booking(
  p_operator_id uuid,
  p_booking_id uuid,
  p_boat_id uuid,
  p_legal_offering_id uuid,
  p_pickup_location_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_passenger_count integer,
  p_total_cents integer,
  p_operator_note text default null,
  p_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_operator public.operators%rowtype;
  v_old public.bookings%rowtype;
  v_boat public.boats%rowtype;
  v_offering public.boat_legal_offerings%rowtype;
  v_location public.operator_locations%rowtype;
  v_customer public.operator_customers%rowtype;
  v_new_booking_id uuid;
  v_reference text;
  v_note text := nullif(pg_catalog.btrim(coalesce(p_operator_note, '')), '');
  v_reason text := nullif(pg_catalog.btrim(coalesce(p_reason, '')), '');
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
    raise exception using errcode = '42501', message = 'booking_reschedule_not_allowed';
  end if;

  if v_reason is null or pg_catalog.length(v_reason) > 1000 then
    raise exception using errcode = '22023', message = 'reschedule_reason_required';
  end if;

  select * into v_operator
  from public.operators o
  where o.id = p_operator_id
  for share;

  if not found or v_operator.status <> 'ACTIVE'::public.operator_status then
    raise exception using errcode = '22023', message = 'operator_must_be_active';
  end if;

  select * into v_old
  from public.bookings b
  where b.id = p_booking_id
    and b.operator_id = p_operator_id
  for update;

  if not found then
    raise exception using errcode = '22023', message = 'booking_not_found';
  end if;

  if v_old.source <> 'MANUAL'::public.booking_source
     or v_old.status <> 'CONFIRMED'::public.booking_status then
    raise exception using errcode = '22023', message = 'booking_not_reschedulable';
  end if;

  if v_old.starts_at <= pg_catalog.now() then
    raise exception using errcode = '22023', message = 'started_booking_not_reschedulable';
  end if;

  if exists (
    select 1 from public.payments p
    where p.booking_id = p_booking_id
      and p.amount_received_cents > p.amount_refunded_cents
  ) then
    raise exception using errcode = '22023', message = 'paid_booking_requires_finance_workflow';
  end if;

  if p_starts_at is null or p_ends_at is null or p_ends_at <= p_starts_at
     or p_starts_at <= pg_catalog.now() then
    raise exception using errcode = '22023', message = 'invalid_booking_window';
  end if;

  if p_passenger_count is null or p_passenger_count <= 0 then
    raise exception using errcode = '22023', message = 'invalid_passenger_count';
  end if;

  if p_total_cents is null or p_total_cents < 0 then
    raise exception using errcode = '22023', message = 'invalid_total';
  end if;

  select * into v_boat
  from public.boats b
  where b.id = p_boat_id
    and b.operator_id = p_operator_id
    and b.status = 'ACTIVE'::public.boat_status
  for no key update;

  if not found then
    raise exception using errcode = '22023', message = 'boat_must_be_active';
  end if;

  if v_boat.operator_passenger_limit is not null
     and p_passenger_count > v_boat.operator_passenger_limit then
    raise exception using errcode = '22023', message = 'passenger_limit_exceeded';
  end if;

  select * into v_offering
  from public.boat_legal_offerings blo
  where blo.id = p_legal_offering_id
    and blo.boat_id = p_boat_id
    and blo.is_active = true;

  if not found then
    raise exception using errcode = '22023', message = 'legal_offering_not_available';
  end if;

  select * into v_location
  from public.operator_locations ol
  where ol.id = p_pickup_location_id
    and ol.operator_id = p_operator_id
    and ol.is_active = true;

  if not found then
    raise exception using errcode = '22023', message = 'pickup_location_not_available';
  end if;

  select * into v_customer
  from public.operator_customers oc
  where oc.id = v_old.operator_customer_id
    and oc.operator_id = p_operator_id
  for key share;

  if not found then
    raise exception using errcode = '22023', message = 'customer_not_found';
  end if;

  -- Release the old reservation first. Any later error rolls this complete
  -- function call back, so the original reservation can never be lost.
  update public.bookings
  set status = 'CANCELLED_BY_OPERATOR'::public.booking_status
  where id = v_old.id;

  update public.boat_occupancies
  set
    is_active = false,
    released_at = pg_catalog.now(),
    released_by = v_user_id,
    release_reason = 'REPLACED_BY_RESCHEDULE'
  where booking_id = v_old.id
    and is_active = true;

  v_reference := 'MNL-' || pg_catalog.upper(
    pg_catalog.substr(
      pg_catalog.replace(pg_catalog.gen_random_uuid()::text, '-', ''),
      1,
      12
    )
  );

  insert into public.bookings (
    operator_id, source, status, reference,
    operator_customer_id, customer_user_id,
    boat_id, legal_offering_id, pickup_location_id, rate_plan_id,
    starts_at, ends_at, passenger_count, driver_is_customer,
    customer_note, operator_note,
    currency_snapshot, rental_subtotal_cents_snapshot,
    extras_total_cents_snapshot, discount_total_cents_snapshot,
    tax_total_cents_snapshot, customer_total_cents_snapshot,
    security_deposit_cents_snapshot, commission_base_cents_snapshot,
    commission_bps_snapshot, commission_amount_cents_snapshot,
    operator_amount_cents_snapshot, commercial_plan_code_snapshot,
    customer_snapshot, boat_snapshot, legal_offering_snapshot,
    pickup_location_snapshot, driver_eligibility_snapshot,
    cancellation_policy_snapshot, pricing_snapshot, commercial_snapshot,
    created_by
  ) values (
    p_operator_id, 'MANUAL'::public.booking_source,
    'DRAFT'::public.booking_status, v_reference,
    v_customer.id, v_old.customer_user_id,
    p_boat_id, p_legal_offering_id, p_pickup_location_id, null,
    p_starts_at, p_ends_at, p_passenger_count, v_old.driver_is_customer,
    v_old.customer_note, v_note,
    coalesce(v_old.currency_snapshot, v_operator.currency), p_total_cents,
    0, 0, 0, p_total_cents, 0, 0, 0, 0, p_total_cents,
    'MANUAL_OFF_PLATFORM',
    pg_catalog.jsonb_build_object(
      'display_name', v_customer.display_name,
      'email', v_customer.email,
      'phone', v_customer.phone,
      'source', 'operator_manual_booking'
    ),
    pg_catalog.jsonb_build_object(
      'id', v_boat.id,
      'name', v_boat.name,
      'slug', v_boat.slug,
      'manufacturer', v_boat.manufacturer,
      'model', v_boat.model,
      'operator_passenger_limit', v_boat.operator_passenger_limit
    ),
    pg_catalog.to_jsonb(v_offering) - 'created_at' - 'updated_at',
    pg_catalog.jsonb_build_object(
      'id', v_location.id,
      'name', v_location.name,
      'city', v_location.city,
      'address_line_1', v_location.address_line_1,
      'country_code', v_location.country_code,
      'timezone', v_location.timezone
    ),
    pg_catalog.jsonb_build_object(
      'source', 'operator_manual_booking',
      'captured_by_operator', true
    ),
    pg_catalog.jsonb_build_object(
      'source', 'manual_off_platform',
      'policy', 'managed_outside_boatly'
    ),
    pg_catalog.jsonb_build_object(
      'source', 'operator_manual_booking',
      'total_cents', p_total_cents,
      'currency', coalesce(v_old.currency_snapshot, v_operator.currency)
    ),
    pg_catalog.jsonb_build_object(
      'source', 'MANUAL',
      'commission_bps', 0,
      'commission_amount_cents', 0
    ),
    v_user_id
  ) returning id into v_new_booking_id;

  insert into public.booking_price_items (
    operator_id, booking_id, item_type, code, label,
    quantity, unit_amount_cents, amount_cents,
    is_commissionable, sort_order, metadata
  ) values (
    p_operator_id, v_new_booking_id,
    'RENTAL'::public.booking_price_item_type,
    'MANUAL_RENTAL', 'Prenotazione manuale',
    1, p_total_cents, p_total_cents,
    false, 0,
    pg_catalog.jsonb_build_object(
      'source', 'manual_off_platform',
      'replaces_booking_id', v_old.id
    )
  );

  insert into public.boat_occupancies (
    operator_id, boat_id, occupancy_type,
    starts_at, ends_at, title, notes,
    is_active, created_by, booking_id
  ) values (
    p_operator_id, p_boat_id,
    'MANUAL_BOOKING'::public.boat_occupancy_type,
    p_starts_at, p_ends_at,
    'Prenotazione ' || v_reference,
    'Prenotazione manuale riprogrammata',
    true, v_user_id, v_new_booking_id
  );

  update public.bookings
  set status = 'CONFIRMED'::public.booking_status
  where id = v_new_booking_id;

  insert into public.booking_events (
    operator_id, booking_id, event_type, actor_type, actor_user_id,
    from_status, to_status, message, metadata
  ) values
  (
    p_operator_id, v_old.id, 'MANUAL_BOOKING_RESCHEDULED',
    'OPERATOR'::public.booking_event_actor_type, v_user_id,
    'CONFIRMED'::public.booking_status,
    'CANCELLED_BY_OPERATOR'::public.booking_status,
    v_reason,
    pg_catalog.jsonb_build_object('replacement_booking_id', v_new_booking_id)
  ),
  (
    p_operator_id, v_new_booking_id, 'MANUAL_BOOKING_CREATED_FROM_RESCHEDULE',
    'OPERATOR'::public.booking_event_actor_type, v_user_id,
    'DRAFT'::public.booking_status,
    'CONFIRMED'::public.booking_status,
    v_reason,
    pg_catalog.jsonb_build_object('replaced_booking_id', v_old.id)
  );

  insert into public.audit_logs (
    actor_type, actor_user_id, operator_id, booking_id,
    action, entity_type, entity_id, reason, metadata
  ) values (
    'OPERATOR'::public.audit_actor_type,
    v_user_id,
    p_operator_id,
    v_old.id,
    'MANUAL_BOOKING_RESCHEDULED',
    'BOOKING',
    v_old.id::text,
    v_reason,
    pg_catalog.jsonb_build_object(
      'replacement_booking_id', v_new_booking_id,
      'from_boat_id', v_old.boat_id,
      'to_boat_id', p_boat_id,
      'from_starts_at', v_old.starts_at,
      'to_starts_at', p_starts_at
    )
  );

  return v_new_booking_id;
exception
  when exclusion_violation then
    if exists (
      select 1 from public.bookings b
      where b.operator_id = p_operator_id
        and b.operator_customer_id = v_old.operator_customer_id
        and b.id not in (v_old.id, coalesce(v_new_booking_id, v_old.id))
        and b.status in (
          'DRAFT'::public.booking_status,
          'PENDING_PAYMENT'::public.booking_status,
          'PAYMENT_PROCESSING'::public.booking_status,
          'CONFIRMED'::public.booking_status,
          'IN_PROGRESS'::public.booking_status
        )
        and pg_catalog.tstzrange(b.starts_at, b.ends_at, '[)')
          && pg_catalog.tstzrange(p_starts_at, p_ends_at, '[)')
    ) then
      raise exception using errcode = '23P01', message = 'customer_booking_overlap';
    end if;
    raise exception using errcode = '23P01', message = 'boat_booking_overlap';
end;
$$;


revoke insert, update, delete on table public.operator_customers from authenticated;

revoke all on function public.operator_save_customer(uuid, uuid, text, text, text, text, date, text) from public, anon, authenticated;
revoke all on function public.operator_reschedule_manual_booking(uuid, uuid, uuid, uuid, uuid, timestamptz, timestamptz, integer, integer, text, text) from public, anon, authenticated;

grant execute on function public.operator_save_customer(uuid, uuid, text, text, text, text, date, text) to authenticated, service_role;
grant execute on function public.operator_reschedule_manual_booking(uuid, uuid, uuid, uuid, uuid, timestamptz, timestamptz, integer, integer, text, text) to authenticated, service_role;

comment on function public.operator_save_customer(uuid, uuid, text, text, text, text, date, text) is
  'Validated create/update for an operator CRM customer. Identity collisions are rejected and every mutation is audited.';

comment on function public.operator_reschedule_manual_booking(uuid, uuid, uuid, uuid, uuid, timestamptz, timestamptz, integer, integer, text, text) is
  'Atomically reschedules a future confirmed MANUAL booking by immutable replacement, preserving history and database conflict protection.';

commit;
