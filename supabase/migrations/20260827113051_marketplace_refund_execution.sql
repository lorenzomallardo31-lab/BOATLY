-- ============================================================
-- BOATLY
-- Migration: Marketplace refund execution and reconciliation
-- ============================================================
--
-- Adds the missing trusted-server refund lifecycle for Stripe
-- destination charges. Financial staff prepare a bounded refund,
-- the application creates it at Stripe with an idempotency key,
-- and verified refund webhooks remain the source of truth for the
-- final booking/payment state.
-- ============================================================

begin;


-- ============================================================
-- CUMULATIVE REFUND INTEGRITY
-- ============================================================

create or replace function public.validate_stripe_refund()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_payment_currency text;
  v_payment_received integer;
  v_other_active_refunds integer;
begin
  select
    p.currency,
    p.amount_received_cents
  into
    v_payment_currency,
    v_payment_received
  from public.payments p
  where p.id = new.payment_id
    and p.operator_id = new.operator_id
    and p.booking_id = new.booking_id;

  if not found then
    raise exception 'Linked Stripe payment does not exist';
  end if;

  if new.currency <> v_payment_currency then
    raise exception 'Refund currency must match payment currency';
  end if;

  if new.amount_cents > v_payment_received then
    raise exception 'Single refund amount cannot exceed received payment amount';
  end if;

  if new.status in (
    'PENDING'::public.refund_status,
    'REQUIRES_ACTION'::public.refund_status,
    'SUCCEEDED'::public.refund_status
  ) then
    select coalesce(sum(r.amount_cents), 0)::integer
    into v_other_active_refunds
    from public.refunds r
    where r.payment_id = new.payment_id
      and r.id <> new.id
      and r.status in (
        'PENDING'::public.refund_status,
        'REQUIRES_ACTION'::public.refund_status,
        'SUCCEEDED'::public.refund_status
      );

    if v_other_active_refunds + new.amount_cents > v_payment_received then
      raise exception 'Cumulative refund amount cannot exceed received payment amount';
    end if;
  end if;

  if new.status = 'SUCCEEDED'::public.refund_status
     and new.succeeded_at is null then
    new.succeeded_at = pg_catalog.now();
  end if;

  if new.status = 'FAILED'::public.refund_status
     and new.failed_at is null then
    new.failed_at = pg_catalog.now();
  end if;

  return new;
end;
$$;


-- ============================================================
-- FINANCE: PREPARE A REFUND
-- ============================================================

create or replace function public.admin_marketplace_refund_setup(
  p_booking_id uuid,
  p_amount_cents integer,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_booking public.bookings%rowtype;
  v_payment public.payments%rowtype;
  v_reserved_refund_cents integer;
  v_remaining_cents integer;
  v_reason text := nullif(pg_catalog.btrim(coalesce(p_reason, '')), '');
  v_refund_id uuid := pg_catalog.gen_random_uuid();
  v_idempotency_key text;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  if not private.has_platform_role(
    array[
      'SUPER_ADMIN'::public.platform_role,
      'ADMIN'::public.platform_role,
      'FINANCE'::public.platform_role
    ]
  ) then
    raise exception using errcode = '42501', message = 'refund_not_allowed';
  end if;

  if p_amount_cents is null or p_amount_cents <= 0 then
    raise exception using errcode = '22023', message = 'refund_amount_invalid';
  end if;

  if v_reason is null then
    raise exception using errcode = '22023', message = 'refund_reason_required';
  end if;

  select *
  into v_booking
  from public.bookings b
  where b.id = p_booking_id
  for update;

  if not found then
    raise exception using errcode = '22023', message = 'booking_not_found';
  end if;

  if v_booking.source <> 'MARKETPLACE'::public.booking_source then
    raise exception using errcode = '22023', message = 'marketplace_payment_required';
  end if;

  if v_booking.status not in (
    'CANCELLED_BY_CUSTOMER'::public.booking_status,
    'CANCELLED_BY_OPERATOR'::public.booking_status,
    'CANCELLED_BY_BOATLY'::public.booking_status,
    'REFUND_PENDING'::public.booking_status,
    'PARTIALLY_REFUNDED'::public.booking_status
  ) then
    raise exception using errcode = '22023', message = 'booking_not_refundable';
  end if;

  select *
  into v_payment
  from public.payments p
  where p.booking_id = v_booking.id
    and p.operator_id = v_booking.operator_id
    and p.purpose = 'BOOKING_PAYMENT'::public.payment_purpose
    and p.status in (
      'SUCCEEDED'::public.payment_status,
      'PARTIALLY_REFUNDED'::public.payment_status
    )
    and p.amount_received_cents > 0
  order by p.succeeded_at desc nulls last, p.created_at desc
  limit 1
  for update;

  if not found then
    raise exception using errcode = '22023', message = 'refundable_payment_not_found';
  end if;

  select coalesce(sum(r.amount_cents), 0)::integer
  into v_reserved_refund_cents
  from public.refunds r
  where r.payment_id = v_payment.id
    and r.status in (
      'PENDING'::public.refund_status,
      'REQUIRES_ACTION'::public.refund_status,
      'SUCCEEDED'::public.refund_status
    );

  v_remaining_cents := v_payment.amount_received_cents - v_reserved_refund_cents;

  if v_remaining_cents <= 0 then
    raise exception using errcode = '22023', message = 'payment_already_fully_refunded';
  end if;

  if p_amount_cents > v_remaining_cents then
    raise exception using errcode = '22023', message = 'refund_amount_exceeds_remaining';
  end if;

  v_idempotency_key := 'boatly-refund:' || v_refund_id;

  insert into public.refunds (
    id,
    operator_id,
    booking_id,
    payment_id,
    provider_refund_id,
    provider_create_idempotency_key,
    amount_cents,
    currency,
    status,
    reason_code,
    provider_status_raw,
    provider_state_snapshot,
    reconciliation_status
  ) values (
    v_refund_id,
    v_payment.operator_id,
    v_booking.id,
    v_payment.id,
    'pending:' || v_refund_id,
    v_idempotency_key,
    p_amount_cents,
    v_payment.currency,
    'PENDING'::public.refund_status,
    v_reason,
    'local_reserved',
    pg_catalog.jsonb_build_object('reserved_at', pg_catalog.now()),
    'PENDING'::public.financial_reconciliation_status
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
    v_booking.operator_id,
    v_booking.id,
    'REFUND_REQUESTED',
    'PLATFORM'::public.booking_event_actor_type,
    v_user_id,
    v_booking.status,
    v_booking.status,
    'A refund was reserved by Boatly financial operations.',
    pg_catalog.jsonb_build_object(
      'refund_id', v_refund_id,
      'amount_cents', p_amount_cents,
      'currency', v_payment.currency
    )
  );

  return pg_catalog.jsonb_build_object(
    'refund_id', v_refund_id,
    'booking_id', v_booking.id,
    'booking_reference', v_booking.reference,
    'operator_id', v_booking.operator_id,
    'payment_id', v_payment.id,
    'payment_intent_id', v_payment.provider_payment_intent_id,
    'amount_cents', p_amount_cents,
    'currency', v_payment.currency,
    'remaining_cents_before_refund', v_remaining_cents,
    'reason', v_reason,
    'idempotency_key', v_idempotency_key
  );
end;
$$;


-- ============================================================
-- FINANCE: RESUME AN IDEMPOTENT REFUND ATTEMPT
-- ============================================================

create or replace function public.admin_marketplace_refund_retry_setup(
  p_refund_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_refund public.refunds%rowtype;
  v_payment public.payments%rowtype;
  v_booking public.bookings%rowtype;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  if not private.has_platform_role(
    array[
      'SUPER_ADMIN'::public.platform_role,
      'ADMIN'::public.platform_role,
      'FINANCE'::public.platform_role
    ]
  ) then
    raise exception using errcode = '42501', message = 'refund_not_allowed';
  end if;

  select *
  into v_refund
  from public.refunds r
  where r.id = p_refund_id
    and r.status in (
      'PENDING'::public.refund_status,
      'REQUIRES_ACTION'::public.refund_status
    )
  for update;

  if not found then
    raise exception using errcode = '22023', message = 'refund_not_retryable';
  end if;

  select *
  into v_payment
  from public.payments p
  where p.id = v_refund.payment_id
    and p.booking_id = v_refund.booking_id
    and p.operator_id = v_refund.operator_id
  for update;

  if not found then
    raise exception using errcode = '22023', message = 'refundable_payment_not_found';
  end if;

  select *
  into v_booking
  from public.bookings b
  where b.id = v_refund.booking_id
    and b.operator_id = v_refund.operator_id;

  if not found then
    raise exception using errcode = '22023', message = 'booking_not_found';
  end if;

  update public.refunds
  set
    reconciliation_status = 'PENDING'::public.financial_reconciliation_status,
    reconciliation_note = null,
    provider_status_raw = 'retry_requested'
  where id = v_refund.id;

  return pg_catalog.jsonb_build_object(
    'refund_id', v_refund.id,
    'booking_id', v_booking.id,
    'booking_reference', v_booking.reference,
    'operator_id', v_booking.operator_id,
    'payment_id', v_payment.id,
    'payment_intent_id', v_payment.provider_payment_intent_id,
    'amount_cents', v_refund.amount_cents,
    'currency', v_refund.currency,
    'reason', coalesce(v_refund.reason_code, 'financial_retry'),
    'idempotency_key', v_refund.provider_create_idempotency_key
  );
end;
$$;


-- ============================================================
-- SERVICE ROLE: RECORD PROVIDER CREATION RESPONSE
-- ============================================================

create or replace function public.record_marketplace_refund_creation(
  p_refund_id uuid,
  p_booking_id uuid,
  p_payment_id uuid,
  p_provider_refund_id text,
  p_idempotency_key text,
  p_amount_cents integer,
  p_currency text,
  p_provider_status text,
  p_provider_state jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payment public.payments%rowtype;
  v_booking public.bookings%rowtype;
  v_refund public.refunds%rowtype;
  v_refund_status public.refund_status;
begin
  if nullif(pg_catalog.btrim(coalesce(p_provider_refund_id, '')), '') is null
     or nullif(pg_catalog.btrim(coalesce(p_idempotency_key, '')), '') is null then
    raise exception using errcode = '22023', message = 'refund_provider_identity_required';
  end if;

  if p_provider_state is null or pg_catalog.jsonb_typeof(p_provider_state) <> 'object' then
    raise exception using errcode = '22023', message = 'refund_provider_state_invalid';
  end if;

  select *
  into v_payment
  from public.payments p
  where p.id = p_payment_id
    and p.booking_id = p_booking_id
  for update;

  if not found then
    raise exception using errcode = '22023', message = 'refundable_payment_not_found';
  end if;

  select *
  into v_booking
  from public.bookings b
  where b.id = p_booking_id
    and b.operator_id = v_payment.operator_id
  for update;

  if not found then
    raise exception using errcode = '22023', message = 'booking_not_found';
  end if;

  v_refund_status := case lower(coalesce(p_provider_status, ''))
    when 'requires_action' then 'REQUIRES_ACTION'::public.refund_status
    when 'failed' then 'FAILED'::public.refund_status
    when 'canceled' then 'CANCELLED'::public.refund_status
    when 'cancelled' then 'CANCELLED'::public.refund_status
    else 'PENDING'::public.refund_status
  end;

  select *
  into v_refund
  from public.refunds r
  where r.id = p_refund_id
    and r.payment_id = p_payment_id
    and r.booking_id = p_booking_id
    and r.operator_id = v_payment.operator_id
    and r.provider_create_idempotency_key = p_idempotency_key
  for update;

  if not found then
    raise exception using errcode = '22023', message = 'refund_reservation_not_found';
  end if;

  if v_refund.amount_cents <> p_amount_cents
     or v_refund.currency <> upper(p_currency) then
    raise exception using errcode = '22023', message = 'refund_reservation_mismatch';
  end if;

  if v_refund.provider_refund_id <> p_provider_refund_id
     and v_refund.provider_refund_id !~ '^pending:' then
    raise exception using errcode = '22023', message = 'refund_provider_identity_mismatch';
  end if;

  update public.refunds
  set
    provider_refund_id = p_provider_refund_id,
    status = case
      when status = 'SUCCEEDED'::public.refund_status then status
      else v_refund_status
    end,
    provider_status_raw = p_provider_status,
    provider_state_snapshot = p_provider_state,
    reconciliation_status = case
      when status = 'SUCCEEDED'::public.refund_status
        then 'MATCHED'::public.financial_reconciliation_status
      else 'PENDING'::public.financial_reconciliation_status
    end,
    reconciliation_note = null
  where id = v_refund.id;

  return v_refund.id;
end;
$$;


-- ============================================================
-- SERVICE ROLE: VERIFIED REFUND EVENT PROCESSOR
-- ============================================================

create or replace function public.process_marketplace_refund_event(
  p_stripe_event_row_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event public.stripe_events%rowtype;
  v_object jsonb;
  v_provider_refund_id text;
  v_metadata_refund_id text;
  v_payment_intent_id text;
  v_provider_status text;
  v_amount_cents integer;
  v_currency text;
  v_payment public.payments%rowtype;
  v_booking public.bookings%rowtype;
  v_refund public.refunds%rowtype;
  v_target_refund_status public.refund_status;
  v_total_succeeded_refunds integer;
  v_target_booking_status public.booking_status;
begin
  select *
  into v_event
  from public.stripe_events se
  where se.id = p_stripe_event_row_id
  for update;

  if not found then
    raise exception using errcode = '22023', message = 'stripe_event_not_found';
  end if;

  if v_event.signature_verified = false then
    raise exception using errcode = '42501', message = 'stripe_event_not_verified';
  end if;

  if v_event.processing_status = 'PROCESSED'::public.stripe_event_processing_status then
    return pg_catalog.jsonb_build_object('processed', true, 'idempotent_replay', true);
  end if;

  if v_event.event_type not in ('refund.created', 'refund.updated', 'refund.failed') then
    update public.stripe_events
    set
      processing_status = 'IGNORED'::public.stripe_event_processing_status,
      processed_at = pg_catalog.now()
    where id = v_event.id;

    return pg_catalog.jsonb_build_object('processed', true, 'ignored', true);
  end if;

  update public.stripe_events
  set
    processing_status = 'PROCESSING'::public.stripe_event_processing_status,
    processing_attempt_count = processing_attempt_count + 1,
    last_error = null
  where id = v_event.id;

  v_object := v_event.payload -> 'data' -> 'object';
  v_provider_refund_id := nullif(v_object ->> 'id', '');
  v_metadata_refund_id := nullif(v_object -> 'metadata' ->> 'refund_id', '');
  v_payment_intent_id := nullif(v_object ->> 'payment_intent', '');
  v_provider_status := lower(coalesce(v_object ->> 'status', 'pending'));
  v_amount_cents := nullif(v_object ->> 'amount', '')::integer;
  v_currency := upper(coalesce(nullif(v_object ->> 'currency', ''), ''));

  if v_provider_refund_id is null
     or v_amount_cents is null
     or v_amount_cents <= 0
     or length(v_currency) <> 3 then
    raise exception using errcode = '22023', message = 'stripe_refund_event_incomplete';
  end if;

  select *
  into v_refund
  from public.refunds r
  where r.provider_refund_id = v_provider_refund_id
  for update;

  if not found
     and v_metadata_refund_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    select *
    into v_refund
    from public.refunds r
    where r.id = v_metadata_refund_id::uuid
    for update;

    if found then
      if v_refund.provider_refund_id <> v_provider_refund_id
         and v_refund.provider_refund_id !~ '^pending:' then
        raise exception using errcode = '22023', message = 'stripe_refund_identity_mismatch';
      end if;

      update public.refunds
      set provider_refund_id = v_provider_refund_id
      where id = v_refund.id;
    end if;
  end if;

  if found then
    select *
    into v_payment
    from public.payments p
    where p.id = v_refund.payment_id
    for update;
  else
    if v_payment_intent_id is null then
      raise exception using errcode = '22023', message = 'stripe_refund_payment_intent_missing';
    end if;

    select *
    into v_payment
    from public.payments p
    where p.provider_payment_intent_id = v_payment_intent_id
    for update;

    if not found then
      raise exception using errcode = '22023', message = 'stripe_refund_payment_not_found';
    end if;

    insert into public.refunds (
      operator_id,
      booking_id,
      payment_id,
      provider_refund_id,
      provider_create_idempotency_key,
      amount_cents,
      currency,
      status,
      reason_code,
      provider_status_raw,
      provider_state_snapshot,
      reconciliation_status,
      last_stripe_event_id
    ) values (
      v_payment.operator_id,
      v_payment.booking_id,
      v_payment.id,
      v_provider_refund_id,
      'stripe-event:' || v_provider_refund_id,
      v_amount_cents,
      v_currency,
      'PENDING'::public.refund_status,
      coalesce(nullif(v_object ->> 'reason', ''), 'provider_discovered'),
      v_provider_status,
      v_object,
      'PENDING'::public.financial_reconciliation_status,
      v_event.id
    )
    returning * into v_refund;
  end if;

  if not found then
    raise exception using errcode = '22023', message = 'stripe_refund_payment_not_found';
  end if;

  if nullif(v_object -> 'metadata' ->> 'payment_id', '') is not null
     and v_object -> 'metadata' ->> 'payment_id' <> v_payment.id::text then
    raise exception using errcode = '22023', message = 'stripe_refund_payment_metadata_mismatch';
  end if;

  if nullif(v_object -> 'metadata' ->> 'booking_id', '') is not null
     and v_object -> 'metadata' ->> 'booking_id' <> v_payment.booking_id::text then
    raise exception using errcode = '22023', message = 'stripe_refund_booking_metadata_mismatch';
  end if;

  select *
  into v_booking
  from public.bookings b
  where b.id = v_payment.booking_id
    and b.operator_id = v_payment.operator_id
  for update;

  if not found then
    raise exception using errcode = '22023', message = 'booking_not_found';
  end if;

  if v_amount_cents <> v_refund.amount_cents
     or v_currency <> v_refund.currency then
    update public.refunds
    set
      reconciliation_status = 'MISMATCH'::public.financial_reconciliation_status,
      reconciliation_note = 'Stripe refund amount or currency differs from the Boatly refund record.',
      provider_status_raw = v_provider_status,
      provider_state_snapshot = v_object,
      last_stripe_event_id = v_event.id
    where id = v_refund.id;

    update public.stripe_events
    set
      processing_status = 'FAILED'::public.stripe_event_processing_status,
      last_error = 'stripe_refund_reconciliation_mismatch'
    where id = v_event.id;

    return pg_catalog.jsonb_build_object(
      'processed', false,
      'error', 'stripe_refund_reconciliation_mismatch'
    );
  end if;

  v_target_refund_status := case v_provider_status
    when 'succeeded' then 'SUCCEEDED'::public.refund_status
    when 'failed' then 'FAILED'::public.refund_status
    when 'canceled' then 'CANCELLED'::public.refund_status
    when 'cancelled' then 'CANCELLED'::public.refund_status
    when 'requires_action' then 'REQUIRES_ACTION'::public.refund_status
    else 'PENDING'::public.refund_status
  end;

  update public.refunds
  set
    status = v_target_refund_status,
    provider_status_raw = v_provider_status,
    provider_state_snapshot = v_object,
    reconciliation_status = case
      when v_target_refund_status = 'SUCCEEDED'::public.refund_status
        then 'MATCHED'::public.financial_reconciliation_status
      when v_target_refund_status in ('FAILED'::public.refund_status, 'CANCELLED'::public.refund_status)
        then 'MISMATCH'::public.financial_reconciliation_status
      else 'PENDING'::public.financial_reconciliation_status
    end,
    reconciliation_note = case
      when v_target_refund_status = 'FAILED'::public.refund_status
        then coalesce(nullif(v_object ->> 'failure_reason', ''), 'Stripe refund failed.')
      when v_target_refund_status = 'CANCELLED'::public.refund_status
        then 'Stripe refund was cancelled.'
      else null
    end,
    last_stripe_event_id = v_event.id,
    succeeded_at = case
      when v_target_refund_status = 'SUCCEEDED'::public.refund_status
        then coalesce(succeeded_at, pg_catalog.now())
      else succeeded_at
    end,
    failed_at = case
      when v_target_refund_status = 'FAILED'::public.refund_status
        then coalesce(failed_at, pg_catalog.now())
      else failed_at
    end
  where id = v_refund.id;

  if v_target_refund_status = 'SUCCEEDED'::public.refund_status then
    select coalesce(sum(r.amount_cents), 0)::integer
    into v_total_succeeded_refunds
    from public.refunds r
    where r.payment_id = v_payment.id
      and r.status = 'SUCCEEDED'::public.refund_status;

    update public.payments
    set
      amount_refunded_cents = least(v_total_succeeded_refunds, amount_received_cents),
      status = case
        when v_total_succeeded_refunds >= amount_received_cents
          then 'REFUNDED'::public.payment_status
        else 'PARTIALLY_REFUNDED'::public.payment_status
      end,
      reconciliation_status = 'MATCHED'::public.financial_reconciliation_status,
      reconciliation_note = null,
      last_stripe_event_id = v_event.id
    where id = v_payment.id;

    v_target_booking_status := case
      when v_total_succeeded_refunds >= v_payment.amount_received_cents
        then 'REFUNDED'::public.booking_status
      else 'PARTIALLY_REFUNDED'::public.booking_status
    end;

    update public.bookings
    set status = v_target_booking_status
    where id = v_booking.id;

    if v_refund.status is distinct from v_target_refund_status then
      insert into public.booking_events (
        operator_id,
        booking_id,
        event_type,
        actor_type,
        from_status,
        to_status,
        message,
        metadata
      ) values (
        v_booking.operator_id,
        v_booking.id,
        'REFUND_SUCCEEDED',
        'SYSTEM'::public.booking_event_actor_type,
        v_booking.status,
        v_target_booking_status,
        'Stripe confirmed the customer refund.',
        pg_catalog.jsonb_build_object(
          'refund_id', v_refund.id,
          'provider_refund_id', v_provider_refund_id,
          'amount_cents', v_amount_cents,
          'currency', v_currency,
          'stripe_event_id', v_event.stripe_event_id
        )
      );
    end if;
  elsif v_target_refund_status in (
    'FAILED'::public.refund_status,
    'CANCELLED'::public.refund_status
  ) and v_refund.status is distinct from v_target_refund_status then
    insert into public.booking_events (
      operator_id,
      booking_id,
      event_type,
      actor_type,
      from_status,
      to_status,
      message,
      metadata
    ) values (
      v_booking.operator_id,
      v_booking.id,
      'REFUND_FAILED',
      'SYSTEM'::public.booking_event_actor_type,
      v_booking.status,
      v_booking.status,
      'Stripe did not complete the requested refund; financial review is required.',
      pg_catalog.jsonb_build_object(
        'refund_id', v_refund.id,
        'provider_refund_id', v_provider_refund_id,
        'stripe_event_id', v_event.stripe_event_id
      )
    );
  end if;

  update public.stripe_events
  set
    processing_status = 'PROCESSED'::public.stripe_event_processing_status,
    processed_at = pg_catalog.now(),
    last_error = null
  where id = v_event.id;

  return pg_catalog.jsonb_build_object(
    'processed', true,
    'booking_id', v_booking.id,
    'refund_id', v_refund.id,
    'refund_status', v_target_refund_status
  );

exception
  when others then
    update public.stripe_events
    set
      processing_status = 'FAILED'::public.stripe_event_processing_status,
      last_error = sqlerrm
    where id = p_stripe_event_row_id;

    return pg_catalog.jsonb_build_object(
      'processed', false,
      'error', sqlerrm
    );
end;
$$;


-- ============================================================
-- CUSTOMER-SAFE REFUND PROJECTION
-- ============================================================

create or replace function public.customer_booking_refunds(
  p_booking_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  if not exists (
    select 1
    from public.bookings b
    where b.id = p_booking_id
      and b.customer_user_id = v_user_id
  ) then
    raise exception using errcode = '42501', message = 'booking_not_accessible';
  end if;

  select coalesce(
    pg_catalog.jsonb_agg(
      pg_catalog.jsonb_strip_nulls(
        pg_catalog.jsonb_build_object(
          'id', r.id,
          'amount_cents', r.amount_cents,
          'currency', r.currency,
          'status', r.status,
          'created_at', r.created_at,
          'succeeded_at', r.succeeded_at,
          'failed_at', r.failed_at
        )
      )
      order by r.created_at desc
    ),
    '[]'::jsonb
  )
  into v_result
  from public.refunds r
  where r.booking_id = p_booking_id;

  return v_result;
end;
$$;


-- ============================================================
-- FUNCTION ACLS
-- ============================================================

revoke all on function public.admin_marketplace_refund_setup(uuid, integer, text)
from public, anon, authenticated, service_role;

grant execute on function public.admin_marketplace_refund_setup(uuid, integer, text)
to authenticated, service_role;

revoke all on function public.admin_marketplace_refund_retry_setup(uuid)
from public, anon, authenticated, service_role;

grant execute on function public.admin_marketplace_refund_retry_setup(uuid)
to authenticated, service_role;

revoke all on function public.record_marketplace_refund_creation(
  uuid, uuid, uuid, text, text, integer, text, text, jsonb
)
from public, anon, authenticated, service_role;

grant execute on function public.record_marketplace_refund_creation(
  uuid, uuid, uuid, text, text, integer, text, text, jsonb
)
to service_role;

revoke all on function public.process_marketplace_refund_event(uuid)
from public, anon, authenticated, service_role;

grant execute on function public.process_marketplace_refund_event(uuid)
to service_role;

revoke all on function public.customer_booking_refunds(uuid)
from public, anon, authenticated, service_role;

grant execute on function public.customer_booking_refunds(uuid)
to authenticated, service_role;


commit;
