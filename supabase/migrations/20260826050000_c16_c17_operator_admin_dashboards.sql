-- ============================================================
-- BOATLY
-- C16 + C17: Operator Dashboard + Platform Admin trusted flows
-- ============================================================

begin;

-- ============================================================
-- OPERATOR: CREATE A MANUAL / OFF-PLATFORM BOOKING
-- ============================================================

create or replace function public.operator_create_manual_booking(
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
  p_operator_note text default null
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
  v_customer_id uuid;
  v_booking_id uuid;
  v_reference text;
  v_email text;
  v_name text;
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
  for update;

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

  v_name := nullif(pg_catalog.btrim(coalesce(p_customer_name, '')), '');
  if v_name is null then
    raise exception using errcode = '22023', message = 'customer_name_required';
  end if;

  v_email := nullif(pg_catalog.lower(pg_catalog.btrim(coalesce(p_customer_email, ''))), '');

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

  if v_email is not null then
    select oc.id into v_customer_id
    from public.operator_customers oc
    where oc.operator_id = p_operator_id
      and oc.email = v_email
    order by oc.updated_at desc
    limit 1;
  end if;

  if v_customer_id is null then
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
      nullif(pg_catalog.btrim(coalesce(p_customer_phone, '')), ''),
      v_user_id
    )
    returning id into v_customer_id;
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
    'CONFIRMED'::public.booking_status,
    v_reference,
    v_customer_id,
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
      'display_name', v_name,
      'email', v_email,
      'phone', nullif(pg_catalog.btrim(coalesce(p_customer_phone, '')), ''),
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
    null,
    'CONFIRMED'::public.booking_status,
    'Prenotazione manuale creata dall’operatore.',
    '{"source":"manual_off_platform"}'::jsonb
  );

  return v_booking_id;
end;
$$;


-- ============================================================
-- OPERATOR: BOOKING LIFECYCLE
-- ============================================================

create or replace function public.operator_change_booking_status(
  p_operator_id uuid,
  p_booking_id uuid,
  p_status public.booking_status,
  p_note text default null
)
returns public.booking_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_booking public.bookings%rowtype;
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
    raise exception using errcode = '42501', message = 'booking_status_change_not_allowed';
  end if;

  select * into v_booking
  from public.bookings b
  where b.id = p_booking_id
    and b.operator_id = p_operator_id
  for update;

  if not found then
    raise exception using errcode = '22023', message = 'booking_not_found';
  end if;

  if p_status not in (
    'IN_PROGRESS'::public.booking_status,
    'COMPLETED'::public.booking_status,
    'CANCELLED_BY_OPERATOR'::public.booking_status,
    'NO_SHOW'::public.booking_status
  ) then
    raise exception using errcode = '22023', message = 'unsupported_operator_booking_status';
  end if;

  if p_status = 'IN_PROGRESS'::public.booking_status
     and v_booking.status <> 'CONFIRMED'::public.booking_status then
    raise exception using errcode = '22023', message = 'invalid_booking_status_transition';
  end if;

  if p_status in ('COMPLETED'::public.booking_status, 'NO_SHOW'::public.booking_status)
     and v_booking.status not in ('CONFIRMED'::public.booking_status, 'IN_PROGRESS'::public.booking_status) then
    raise exception using errcode = '22023', message = 'invalid_booking_status_transition';
  end if;

  if p_status = 'CANCELLED_BY_OPERATOR'::public.booking_status
     and v_booking.status not in (
       'PENDING_PAYMENT'::public.booking_status,
       'PAYMENT_PROCESSING'::public.booking_status,
       'CONFIRMED'::public.booking_status
     ) then
    raise exception using errcode = '22023', message = 'invalid_booking_status_transition';
  end if;

  update public.bookings
  set
    status = p_status,
    operator_note = coalesce(nullif(pg_catalog.btrim(coalesce(p_note, '')), ''), operator_note)
  where id = p_booking_id;

  if p_status = 'CANCELLED_BY_OPERATOR'::public.booking_status then
    update public.boat_occupancies
    set
      is_active = false,
      released_at = pg_catalog.now(),
      released_by = v_user_id,
      release_reason = 'Booking cancelled by operator'
    where booking_id = p_booking_id
      and is_active = true;
  end if;

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
    p_booking_id,
    'OPERATOR_STATUS_CHANGED',
    'OPERATOR'::public.booking_event_actor_type,
    v_user_id,
    v_booking.status,
    p_status,
    nullif(pg_catalog.btrim(coalesce(p_note, '')), ''),
    '{}'::jsonb
  );

  return p_status;
end;
$$;


-- ============================================================
-- OPERATOR: RESOLVE CUSTOMER CANCELLATION REQUEST
-- ============================================================

create or replace function public.operator_resolve_cancellation_request(
  p_operator_id uuid,
  p_request_id uuid,
  p_approve boolean,
  p_note text default null
)
returns public.booking_cancellation_request_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_request public.booking_cancellation_requests%rowtype;
  v_booking public.bookings%rowtype;
  v_status public.booking_cancellation_request_status;
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
    raise exception using errcode = '42501', message = 'cancellation_resolution_not_allowed';
  end if;

  select * into v_request
  from public.booking_cancellation_requests r
  where r.id = p_request_id
    and r.operator_id = p_operator_id
  for update;

  if not found or v_request.status <> 'PENDING'::public.booking_cancellation_request_status then
    raise exception using errcode = '22023', message = 'cancellation_request_not_pending';
  end if;

  select * into v_booking
  from public.bookings b
  where b.id = v_request.booking_id
    and b.operator_id = p_operator_id
  for update;

  if not found then
    raise exception using errcode = '22023', message = 'booking_not_found';
  end if;

  v_status := case
    when p_approve then 'APPROVED'::public.booking_cancellation_request_status
    else 'REJECTED'::public.booking_cancellation_request_status
  end;

  update public.booking_cancellation_requests
  set
    status = v_status,
    resolved_at = pg_catalog.now(),
    resolved_by = v_user_id,
    resolution_note = nullif(pg_catalog.btrim(coalesce(p_note, '')), '')
  where id = p_request_id;

  if p_approve then
    if v_booking.status in (
      'CONFIRMED'::public.booking_status,
      'PENDING_PAYMENT'::public.booking_status,
      'PAYMENT_PROCESSING'::public.booking_status
    ) then
      update public.bookings
      set status = case
        when v_booking.status in ('PENDING_PAYMENT'::public.booking_status, 'PAYMENT_PROCESSING'::public.booking_status)
          then 'PAYMENT_FAILED'::public.booking_status
        else 'CANCELLED_BY_CUSTOMER'::public.booking_status
      end
      where id = v_booking.id;

      update public.boat_occupancies
      set
        is_active = false,
        released_at = pg_catalog.now(),
        released_by = v_user_id,
        release_reason = 'Customer cancellation request approved'
      where booking_id = v_booking.id
        and is_active = true;
    end if;
  end if;

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
    v_booking.id,
    case when p_approve then 'CANCELLATION_REQUEST_APPROVED' else 'CANCELLATION_REQUEST_REJECTED' end,
    'OPERATOR'::public.booking_event_actor_type,
    v_user_id,
    v_booking.status,
    case
      when p_approve and v_booking.status = 'CONFIRMED'::public.booking_status then 'CANCELLED_BY_CUSTOMER'::public.booking_status
      when p_approve and v_booking.status in ('PENDING_PAYMENT'::public.booking_status, 'PAYMENT_PROCESSING'::public.booking_status) then 'PAYMENT_FAILED'::public.booking_status
      else v_booking.status
    end,
    nullif(pg_catalog.btrim(coalesce(p_note, '')), ''),
    pg_catalog.jsonb_build_object('request_id', p_request_id)
  );

  return v_status;
end;
$$;


-- ============================================================
-- PLATFORM ADMIN: OPERATOR VERIFICATION REVIEW
-- ============================================================

create or replace function public.admin_review_operator_verification(
  p_verification_id uuid,
  p_decision public.verification_review_status,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_review public.operator_verifications%rowtype;
  v_note text := nullif(pg_catalog.btrim(coalesce(p_note, '')), '');
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  if not private.has_platform_role(array[
    'SUPER_ADMIN'::public.platform_role,
    'ADMIN'::public.platform_role,
    'COMPLIANCE'::public.platform_role
  ]) then
    raise exception using errcode = '42501', message = 'verification_review_not_allowed';
  end if;

  if p_decision not in (
    'APPROVED'::public.verification_review_status,
    'NEEDS_CHANGES'::public.verification_review_status,
    'REJECTED'::public.verification_review_status
  ) then
    raise exception using errcode = '22023', message = 'invalid_review_decision';
  end if;

  if p_decision in ('NEEDS_CHANGES'::public.verification_review_status, 'REJECTED'::public.verification_review_status)
     and v_note is null then
    raise exception using errcode = '22023', message = 'decision_note_required';
  end if;

  select * into v_review
  from public.operator_verifications ov
  where ov.id = p_verification_id
  for update;

  if not found or v_review.status in (
    'APPROVED'::public.verification_review_status,
    'REJECTED'::public.verification_review_status,
    'WITHDRAWN'::public.verification_review_status
  ) then
    raise exception using errcode = '22023', message = 'verification_review_not_open';
  end if;

  update public.operator_verifications
  set
    status = p_decision,
    reviewed_by = v_user_id,
    reviewed_at = pg_catalog.now(),
    decision_note = v_note
  where id = p_verification_id;

  update public.operators
  set status = case
    when p_decision = 'APPROVED'::public.verification_review_status then 'ACTIVE'::public.operator_status
    when p_decision = 'REJECTED'::public.verification_review_status then 'REJECTED'::public.operator_status
    else 'PENDING_VERIFICATION'::public.operator_status
  end
  where id = v_review.operator_id;

  insert into public.audit_logs (
    actor_type,
    actor_user_id,
    operator_id,
    action,
    entity_type,
    entity_id,
    reason,
    metadata
  ) values (
    'PLATFORM'::public.audit_actor_type,
    v_user_id,
    v_review.operator_id,
    'OPERATOR_VERIFICATION_REVIEWED',
    'OPERATOR_VERIFICATION',
    p_verification_id::text,
    v_note,
    pg_catalog.jsonb_build_object('decision', p_decision::text)
  );

  return pg_catalog.jsonb_build_object(
    'verification_id', p_verification_id,
    'operator_id', v_review.operator_id,
    'decision', p_decision
  );
end;
$$;


-- ============================================================
-- PLATFORM ADMIN: BOAT PUBLICATION REVIEW
-- ============================================================

create or replace function public.admin_review_boat_publication(
  p_review_id uuid,
  p_decision public.verification_review_status,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_review public.boat_publication_reviews%rowtype;
  v_note text := nullif(pg_catalog.btrim(coalesce(p_note, '')), '');
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  if not private.has_platform_role(array[
    'SUPER_ADMIN'::public.platform_role,
    'ADMIN'::public.platform_role,
    'COMPLIANCE'::public.platform_role,
    'MODERATOR'::public.platform_role
  ]) then
    raise exception using errcode = '42501', message = 'publication_review_not_allowed';
  end if;

  if p_decision not in (
    'APPROVED'::public.verification_review_status,
    'NEEDS_CHANGES'::public.verification_review_status,
    'REJECTED'::public.verification_review_status
  ) then
    raise exception using errcode = '22023', message = 'invalid_review_decision';
  end if;

  if p_decision in ('NEEDS_CHANGES'::public.verification_review_status, 'REJECTED'::public.verification_review_status)
     and v_note is null then
    raise exception using errcode = '22023', message = 'decision_note_required';
  end if;

  select * into v_review
  from public.boat_publication_reviews br
  where br.id = p_review_id
  for update;

  if not found or v_review.status in (
    'APPROVED'::public.verification_review_status,
    'REJECTED'::public.verification_review_status,
    'WITHDRAWN'::public.verification_review_status
  ) then
    raise exception using errcode = '22023', message = 'publication_review_not_open';
  end if;

  update public.boat_publication_reviews
  set
    status = p_decision,
    reviewed_by = v_user_id,
    reviewed_at = pg_catalog.now(),
    decision_note = v_note
  where id = p_review_id;

  insert into public.audit_logs (
    actor_type,
    actor_user_id,
    operator_id,
    action,
    entity_type,
    entity_id,
    reason,
    metadata
  ) values (
    'PLATFORM'::public.audit_actor_type,
    v_user_id,
    v_review.operator_id,
    'BOAT_PUBLICATION_REVIEWED',
    'BOAT_PUBLICATION_REVIEW',
    p_review_id::text,
    v_note,
    pg_catalog.jsonb_build_object(
      'decision', p_decision::text,
      'boat_id', v_review.boat_id
    )
  );

  return pg_catalog.jsonb_build_object(
    'review_id', p_review_id,
    'boat_id', v_review.boat_id,
    'operator_id', v_review.operator_id,
    'decision', p_decision
  );
end;
$$;


-- ============================================================
-- PLATFORM ADMIN: CASE MANAGEMENT
-- ============================================================

create or replace function public.admin_update_platform_case(
  p_case_id uuid,
  p_status public.platform_case_status,
  p_priority public.platform_case_priority,
  p_resolution_summary text default null
)
returns public.platform_case_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_case public.platform_cases%rowtype;
  v_summary text := nullif(pg_catalog.btrim(coalesce(p_resolution_summary, '')), '');
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  if not private.can_access_platform_case(p_case_id) then
    raise exception using errcode = '42501', message = 'platform_case_update_not_allowed';
  end if;

  select * into v_case
  from public.platform_cases pc
  where pc.id = p_case_id
  for update;

  if not found then
    raise exception using errcode = '22023', message = 'platform_case_not_found';
  end if;

  if p_status in ('RESOLVED'::public.platform_case_status, 'CLOSED'::public.platform_case_status)
     and v_summary is null
     and v_case.resolution_summary is null then
    raise exception using errcode = '22023', message = 'resolution_summary_required';
  end if;

  update public.platform_cases
  set
    status = p_status,
    priority = p_priority,
    resolution_summary = coalesce(v_summary, resolution_summary),
    assigned_to_user_id = coalesce(assigned_to_user_id, v_user_id)
  where id = p_case_id;

  insert into public.platform_case_events (
    platform_case_id,
    event_type,
    actor_user_id,
    message,
    metadata
  ) values (
    p_case_id,
    'CASE_UPDATED',
    v_user_id,
    v_summary,
    pg_catalog.jsonb_build_object(
      'from_status', v_case.status::text,
      'to_status', p_status::text,
      'priority', p_priority::text
    )
  );

  insert into public.audit_logs (
    actor_type,
    actor_user_id,
    operator_id,
    booking_id,
    action,
    entity_type,
    entity_id,
    reason,
    metadata
  ) values (
    'PLATFORM'::public.audit_actor_type,
    v_user_id,
    v_case.operator_id,
    v_case.booking_id,
    'PLATFORM_CASE_UPDATED',
    'PLATFORM_CASE',
    p_case_id::text,
    v_summary,
    pg_catalog.jsonb_build_object(
      'status', p_status::text,
      'priority', p_priority::text
    )
  );

  return p_status;
end;
$$;


-- ============================================================
-- PRIVILEGES
-- ============================================================

revoke execute on function public.operator_create_manual_booking(
  uuid, uuid, uuid, uuid, timestamptz, timestamptz, integer, text, text, text, integer, text
) from public, anon;
grant execute on function public.operator_create_manual_booking(
  uuid, uuid, uuid, uuid, timestamptz, timestamptz, integer, text, text, text, integer, text
) to authenticated;

revoke execute on function public.operator_change_booking_status(
  uuid, uuid, public.booking_status, text
) from public, anon;
grant execute on function public.operator_change_booking_status(
  uuid, uuid, public.booking_status, text
) to authenticated;

revoke execute on function public.operator_resolve_cancellation_request(
  uuid, uuid, boolean, text
) from public, anon;
grant execute on function public.operator_resolve_cancellation_request(
  uuid, uuid, boolean, text
) to authenticated;

revoke execute on function public.admin_review_operator_verification(
  uuid, public.verification_review_status, text
) from public, anon;
grant execute on function public.admin_review_operator_verification(
  uuid, public.verification_review_status, text
) to authenticated;

revoke execute on function public.admin_review_boat_publication(
  uuid, public.verification_review_status, text
) from public, anon;
grant execute on function public.admin_review_boat_publication(
  uuid, public.verification_review_status, text
) to authenticated;

revoke execute on function public.admin_update_platform_case(
  uuid, public.platform_case_status, public.platform_case_priority, text
) from public, anon;
grant execute on function public.admin_update_platform_case(
  uuid, public.platform_case_status, public.platform_case_priority, text
) to authenticated;

-- Sensitive mutations remain behind trusted RPC/server flows.
revoke insert, update, delete on table public.operator_verifications from public, anon, authenticated;
revoke insert, update, delete on table public.boat_publication_reviews from public, anon, authenticated;
revoke insert, update, delete on table public.platform_cases from public, anon, authenticated;
revoke insert, update, delete on table public.platform_case_events from public, anon, authenticated;
revoke insert, update, delete on table public.booking_cancellation_requests from public, anon, authenticated;

commit;
