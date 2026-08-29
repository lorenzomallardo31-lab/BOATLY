-- ============================================================
-- BOATLY OPS
-- Calendar performance + CRM identity + booking integrity
-- ============================================================

begin;

-- Normalize the only canonical email representation before the
-- unique index is introduced. Empty values remain NULL.
update public.operator_customers
set email = nullif(pg_catalog.lower(pg_catalog.btrim(email)), '')
where email is distinct from nullif(pg_catalog.lower(pg_catalog.btrim(email)), '');

create or replace function private.boatly_normalize_phone(p_phone text)
returns text
language plpgsql
immutable
strict
set search_path = ''
as $$
declare
  v_digits text := pg_catalog.regexp_replace(p_phone, '[^0-9]', '', 'g');
begin
  if v_digits = '' then
    return null;
  end if;

  if pg_catalog.left(v_digits, 2) = '00' then
    v_digits := pg_catalog.substr(v_digits, 3);
  end if;

  -- Boatly Ops currently onboards Italian operators. Store a stable
  -- comparison key so +39 333..., 0039 333... and 333... match.
  if pg_catalog.length(v_digits) between 8 and 10
     and pg_catalog.left(v_digits, 2) <> '39' then
    v_digits := '39' || v_digits;
  end if;

  return nullif(v_digits, '');
end;
$$;

revoke all on function private.boatly_normalize_phone(text) from public;
revoke all on function private.boatly_normalize_phone(text) from anon;
revoke all on function private.boatly_normalize_phone(text) from authenticated;

create unique index if not exists operator_customers_unique_email_per_operator_idx
  on public.operator_customers(operator_id, pg_catalog.lower(pg_catalog.btrim(email)))
  where nullif(pg_catalog.btrim(email), '') is not null;

create unique index if not exists operator_customers_unique_phone_per_operator_idx
  on public.operator_customers(operator_id, private.boatly_normalize_phone(phone))
  where private.boatly_normalize_phone(phone) is not null;

create index if not exists operator_customers_operator_name_idx
  on public.operator_customers(operator_id, pg_catalog.lower(pg_catalog.btrim(display_name)));

create index if not exists bookings_operator_starts_at_idx
  on public.bookings(operator_id, starts_at);

create index if not exists boat_occupancies_operator_active_window_idx
  on public.boat_occupancies(operator_id, starts_at, ends_at)
  where is_active;

-- A customer cannot be in two active rentals at the same time, even
-- when different boats are involved. Back-to-back [start, end) slots
-- remain valid.
alter table public.bookings
  add constraint bookings_no_active_customer_overlap
  exclude using gist (
    operator_customer_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  )
  where (
    operator_customer_id is not null
    and status in (
      'DRAFT'::public.booking_status,
      'PENDING_PAYMENT'::public.booking_status,
      'PAYMENT_PROCESSING'::public.booking_status,
      'CONFIRMED'::public.booking_status,
      'IN_PROGRESS'::public.booking_status
    )
  );

-- Replace the function atomically. The extra argument is optional, so
-- the currently deployed form remains compatible until the UI release.
drop function public.operator_create_manual_booking(
  uuid,
  uuid,
  uuid,
  uuid,
  timestamptz,
  timestamptz,
  integer,
  text,
  text,
  text,
  integer,
  text
);

create function public.operator_create_manual_booking(
  p_operator_id uuid,
  p_boat_id uuid,
  p_legal_offering_id uuid,
  p_pickup_location_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_passenger_count integer,
  p_customer_name text,
  p_customer_email text default null,
  p_customer_phone text default null,
  p_total_cents integer default 0,
  p_operator_note text default null,
  p_operator_customer_id uuid default null
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
  v_offering public.boat_legal_offerings%rowtype;
  v_location public.operator_locations%rowtype;
  v_customer public.operator_customers%rowtype;
  v_email_customer_id uuid;
  v_phone_customer_id uuid;
  v_booking_id uuid;
  v_reference text;
  v_email text := nullif(pg_catalog.lower(pg_catalog.btrim(coalesce(p_customer_email, ''))), '');
  v_phone text := nullif(pg_catalog.btrim(coalesce(p_customer_phone, '')), '');
  v_phone_key text;
  v_name text := nullif(pg_catalog.btrim(coalesce(p_customer_name, '')), '');
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
  for share;

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

  if p_starts_at is null or p_ends_at is null or p_ends_at <= p_starts_at then
    raise exception using errcode = '22023', message = 'invalid_booking_window';
  end if;

  if p_starts_at <= pg_catalog.now() then
    raise exception using errcode = '22023', message = 'manual_booking_must_start_in_future';
  end if;

  if p_passenger_count is null or p_passenger_count <= 0 then
    raise exception using errcode = '22023', message = 'invalid_passenger_count';
  end if;

  if v_boat.operator_passenger_limit is not null
     and p_passenger_count > v_boat.operator_passenger_limit then
    raise exception using errcode = '22023', message = 'passenger_limit_exceeded';
  end if;

  if p_total_cents is null or p_total_cents < 0 then
    raise exception using errcode = '22023', message = 'invalid_total';
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

  if p_operator_customer_id is not null then
    select * into v_customer
    from public.operator_customers oc
    where oc.id = p_operator_customer_id
      and oc.operator_id = p_operator_id
    for key share;

    if not found then
      raise exception using errcode = '22023', message = 'customer_not_found';
    end if;
  else
    if v_name is null or pg_catalog.length(v_name) < 2 then
      raise exception using errcode = '22023', message = 'customer_name_required';
    end if;

    if v_email is null and v_phone is null then
      raise exception using errcode = '22023', message = 'customer_contact_required';
    end if;

    if v_email is not null
       and v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
      raise exception using errcode = '22023', message = 'invalid_customer_email';
    end if;

    if v_phone is not null then
      v_phone_key := private.boatly_normalize_phone(v_phone);
      if v_phone_key is null or pg_catalog.length(v_phone_key) not between 8 and 15 then
        raise exception using errcode = '22023', message = 'invalid_customer_phone';
      end if;
    end if;

    if v_email is not null then
      select oc.id into v_email_customer_id
      from public.operator_customers oc
      where oc.operator_id = p_operator_id
        and pg_catalog.lower(pg_catalog.btrim(oc.email)) = v_email
      limit 1;
    end if;

    if v_phone_key is not null then
      select oc.id into v_phone_customer_id
      from public.operator_customers oc
      where oc.operator_id = p_operator_id
        and private.boatly_normalize_phone(oc.phone) = v_phone_key
      limit 1;
    end if;

    if v_email_customer_id is not null
       and v_phone_customer_id is not null
       and v_email_customer_id <> v_phone_customer_id then
      raise exception using errcode = '23505', message = 'customer_identity_conflict';
    end if;

    if v_email_customer_id is not null or v_phone_customer_id is not null then
      raise exception using errcode = '23505', message = 'customer_already_exists';
    end if;

    begin
      insert into public.operator_customers (
        operator_id,
        display_name,
        email,
        phone,
        created_by
      ) values (
        p_operator_id,
        v_name,
        v_email,
        v_phone,
        v_user_id
      )
      returning * into v_customer;
    exception
      when unique_violation then
        raise exception using errcode = '23505', message = 'customer_identity_conflict';
    end;
  end if;

  v_reference := 'MNL-' || pg_catalog.upper(
    pg_catalog.substr(
      pg_catalog.replace(pg_catalog.gen_random_uuid()::text, '-', ''),
      1,
      12
    )
  );

  insert into public.bookings (
    operator_id,
    source,
    status,
    reference,
    operator_customer_id,
    customer_user_id,
    boat_id,
    legal_offering_id,
    pickup_location_id,
    rate_plan_id,
    starts_at,
    ends_at,
    passenger_count,
    driver_is_customer,
    customer_note,
    operator_note,
    currency_snapshot,
    rental_subtotal_cents_snapshot,
    extras_total_cents_snapshot,
    discount_total_cents_snapshot,
    tax_total_cents_snapshot,
    customer_total_cents_snapshot,
    security_deposit_cents_snapshot,
    commission_base_cents_snapshot,
    commission_bps_snapshot,
    commission_amount_cents_snapshot,
    operator_amount_cents_snapshot,
    commercial_plan_code_snapshot,
    customer_snapshot,
    boat_snapshot,
    legal_offering_snapshot,
    pickup_location_snapshot,
    driver_eligibility_snapshot,
    cancellation_policy_snapshot,
    pricing_snapshot,
    commercial_snapshot,
    created_by
  ) values (
    p_operator_id,
    'MANUAL'::public.booking_source,
    'DRAFT'::public.booking_status,
    v_reference,
    v_customer.id,
    null,
    p_boat_id,
    p_legal_offering_id,
    p_pickup_location_id,
    null,
    p_starts_at,
    p_ends_at,
    p_passenger_count,
    true,
    null,
    nullif(pg_catalog.btrim(coalesce(p_operator_note, '')), ''),
    v_operator.currency,
    p_total_cents,
    0,
    0,
    0,
    p_total_cents,
    0,
    0,
    0,
    0,
    p_total_cents,
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
      'currency', v_operator.currency
    ),
    pg_catalog.jsonb_build_object(
      'source', 'MANUAL',
      'commission_bps', 0,
      'commission_amount_cents', 0
    ),
    v_user_id
  )
  returning id into v_booking_id;

  insert into public.booking_price_items (
    operator_id,
    booking_id,
    item_type,
    code,
    label,
    quantity,
    unit_amount_cents,
    amount_cents,
    is_commissionable,
    sort_order,
    metadata
  ) values (
    p_operator_id,
    v_booking_id,
    'RENTAL'::public.booking_price_item_type,
    'MANUAL_RENTAL',
    'Prenotazione manuale',
    1,
    p_total_cents,
    p_total_cents,
    false,
    0,
    '{"source":"manual_off_platform"}'::jsonb
  );

  insert into public.boat_occupancies (
    operator_id,
    boat_id,
    occupancy_type,
    starts_at,
    ends_at,
    title,
    notes,
    is_active,
    created_by,
    booking_id
  ) values (
    p_operator_id,
    p_boat_id,
    'MANUAL_BOOKING'::public.boat_occupancy_type,
    p_starts_at,
    p_ends_at,
    'Prenotazione ' || v_reference,
    'Prenotazione manuale/off-platform',
    true,
    v_user_id,
    v_booking_id
  );

  -- Build every immutable child snapshot before the parent enters a
  -- snapshot-locking status. The status update below locks the complete
  -- booking atomically in the same transaction.
  update public.bookings
  set status = 'CONFIRMED'::public.booking_status
  where id = v_booking_id;

  insert into public.booking_events (
    operator_id,
    booking_id,
    event_type,
    actor_type,
    actor_user_id,
    from_status,
    to_status,
    message,
    metadata
  ) values (
    p_operator_id,
    v_booking_id,
    'MANUAL_BOOKING_CREATED',
    'OPERATOR'::public.booking_event_actor_type,
    v_user_id,
    'DRAFT'::public.booking_status,
    'CONFIRMED'::public.booking_status,
    'Prenotazione manuale creata dall’operatore.',
    '{"source":"manual_off_platform"}'::jsonb
  );

  return v_booking_id;
exception
  when exclusion_violation then
    if exists (
      select 1
      from public.bookings b
      where b.operator_id = p_operator_id
        and b.operator_customer_id = v_customer.id
        and b.status in (
          'DRAFT'::public.booking_status,
          'PENDING_PAYMENT'::public.booking_status,
          'PAYMENT_PROCESSING'::public.booking_status,
          'CONFIRMED'::public.booking_status,
          'IN_PROGRESS'::public.booking_status
        )
        and tstzrange(b.starts_at, b.ends_at, '[)') && tstzrange(p_starts_at, p_ends_at, '[)')
    ) then
      raise exception using errcode = '23P01', message = 'customer_booking_overlap';
    end if;

    raise exception using errcode = '23P01', message = 'boat_booking_overlap';
end;
$$;

revoke all on function public.operator_create_manual_booking(
  uuid,
  uuid,
  uuid,
  uuid,
  timestamptz,
  timestamptz,
  integer,
  text,
  text,
  text,
  integer,
  text,
  uuid
) from public;

revoke execute on function public.operator_create_manual_booking(
  uuid,
  uuid,
  uuid,
  uuid,
  timestamptz,
  timestamptz,
  integer,
  text,
  text,
  text,
  integer,
  text,
  uuid
) from anon;

grant execute on function public.operator_create_manual_booking(
  uuid,
  uuid,
  uuid,
  uuid,
  timestamptz,
  timestamptz,
  integer,
  text,
  text,
  text,
  integer,
  text,
  uuid
) to authenticated, service_role;

-- MARKETPLACE_ENABLED=false closes the Next.js routes. These grants are
-- also removed so the public Data API cannot bypass that application gate.
revoke execute on function public.marketplace_boat_amenities() from anon, authenticated;
revoke execute on function public.marketplace_boat_extras() from anon, authenticated;
revoke execute on function public.marketplace_boat_images() from anon, authenticated;
revoke execute on function public.marketplace_boat_legal_offerings() from anon, authenticated;
revoke execute on function public.marketplace_boat_rate_plans() from anon, authenticated;
revoke execute on function public.marketplace_boats() from anon, authenticated;
revoke execute on function public.marketplace_check_boat_availability(uuid, timestamptz, timestamptz, integer) from anon, authenticated;
revoke execute on function public.marketplace_operator_locations() from anon, authenticated;
revoke execute on function public.marketplace_operators() from anon, authenticated;
revoke execute on function public.marketplace_reviews() from anon, authenticated;
revoke execute on function public.marketplace_search_boats_v2(text, timestamptz, timestamptz, integer, uuid, boolean) from anon, authenticated;

commit;
