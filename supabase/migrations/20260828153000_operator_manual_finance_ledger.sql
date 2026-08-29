-- ============================================================
-- BOATLY OPS
-- Trusted, append-only off-platform finance ledger for manual
-- bookings. Commercial receipts and security deposits are kept
-- distinct, over-collection/refund is rejected under a booking
-- row lock, and corrections happen only through audited voids.
-- ============================================================

begin;

create type public.manual_payment_purpose as enum (
  'DEPOSIT',
  'BALANCE',
  'FULL_PAYMENT',
  'SECURITY_DEPOSIT',
  'OTHER'
);

alter table public.manual_payment_records
  add column purpose public.manual_payment_purpose
    not null default 'OTHER'::public.manual_payment_purpose;

create index manual_payment_records_operator_occurred_idx
  on public.manual_payment_records(operator_id, occurred_at desc)
  where status = 'RECORDED'::public.manual_payment_record_status;

create index manual_payment_records_booking_purpose_idx
  on public.manual_payment_records(booking_id, purpose, record_type)
  where status = 'RECORDED'::public.manual_payment_record_status;

-- Recorded facts, including their accounting purpose and note,
-- are immutable. A correction is a RECORDED -> VOIDED transition.
create or replace function public.protect_manual_payment_record()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'VOIDED'::public.manual_payment_record_status then
    raise exception using errcode = '22023', message = 'voided_manual_payment_is_immutable';
  end if;

  if new.operator_id is distinct from old.operator_id
     or new.booking_id is distinct from old.booking_id
     or new.record_type is distinct from old.record_type
     or new.purpose is distinct from old.purpose
     or new.payment_method is distinct from old.payment_method
     or new.amount_cents is distinct from old.amount_cents
     or new.currency is distinct from old.currency
     or new.external_reference is distinct from old.external_reference
     or new.note is distinct from old.note
     or new.occurred_at is distinct from old.occurred_at
     or new.recorded_by is distinct from old.recorded_by then
    raise exception using errcode = '22023', message = 'recorded_manual_payment_is_immutable';
  end if;

  if old.status = 'RECORDED'::public.manual_payment_record_status
     and new.status = 'VOIDED'::public.manual_payment_record_status then
    if nullif(pg_catalog.btrim(coalesce(new.void_reason, '')), '') is null then
      raise exception using errcode = '22023', message = 'manual_payment_void_reason_required';
    end if;
    if new.voided_at is null then
      new.voided_at := pg_catalog.now();
    end if;
    if new.voided_by is null then
      raise exception using errcode = '22023', message = 'manual_payment_void_actor_required';
    end if;
    return new;
  end if;

  if new.status is distinct from old.status then
    raise exception using errcode = '22023', message = 'invalid_manual_payment_status_transition';
  end if;

  return new;
end;
$$;

create or replace function public.operator_record_manual_payment(
  p_operator_id uuid,
  p_booking_id uuid,
  p_record_type public.manual_payment_record_type,
  p_purpose public.manual_payment_purpose,
  p_payment_method public.manual_payment_method,
  p_amount_cents integer,
  p_occurred_at timestamptz,
  p_external_reference text default null,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_booking public.bookings%rowtype;
  v_record_id uuid := pg_catalog.gen_random_uuid();
  v_reference text := nullif(pg_catalog.btrim(coalesce(p_external_reference, '')), '');
  v_note text := nullif(pg_catalog.btrim(coalesce(p_note, '')), '');
  v_paid_cents bigint := 0;
  v_refunded_cents bigint := 0;
  v_new_net_cents bigint;
  v_total_cents bigint;
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
    raise exception using errcode = '42501', message = 'manual_payment_record_not_allowed';
  end if;

  if not exists (
    select 1
    from public.operators o
    where o.id = p_operator_id
      and o.status = 'ACTIVE'::public.operator_status
  ) then
    raise exception using errcode = '22023', message = 'operator_must_be_active';
  end if;

  if p_record_type is null or p_purpose is null or p_payment_method is null then
    raise exception using errcode = '22023', message = 'manual_payment_classification_required';
  end if;

  if p_amount_cents is null or p_amount_cents <= 0 or p_amount_cents > 1000000000 then
    raise exception using errcode = '22023', message = 'invalid_manual_payment_amount';
  end if;

  if p_occurred_at is null
     or p_occurred_at < timestamptz '2000-01-01 00:00:00+00'
     or p_occurred_at > pg_catalog.now() + interval '5 minutes' then
    raise exception using errcode = '22023', message = 'invalid_manual_payment_date';
  end if;

  if v_reference is not null and pg_catalog.length(v_reference) > 160 then
    raise exception using errcode = '22023', message = 'manual_payment_reference_too_long';
  end if;

  if v_note is not null and pg_catalog.length(v_note) > 1000 then
    raise exception using errcode = '22023', message = 'manual_payment_note_too_long';
  end if;

  -- Serializes concurrent ledger writes for the same booking.
  select * into v_booking
  from public.bookings b
  where b.id = p_booking_id
    and b.operator_id = p_operator_id
  for update;

  if not found then
    raise exception using errcode = '22023', message = 'booking_not_found';
  end if;

  if v_booking.source <> 'MANUAL'::public.booking_source then
    raise exception using errcode = '22023', message = 'manual_payment_requires_manual_booking';
  end if;

  if v_booking.currency_snapshot is null then
    raise exception using errcode = '22023', message = 'booking_currency_missing';
  end if;

  if p_record_type = 'PAYMENT'::public.manual_payment_record_type
     and v_booking.status not in (
       'CONFIRMED'::public.booking_status,
       'IN_PROGRESS'::public.booking_status,
       'COMPLETED'::public.booking_status,
       'NO_SHOW'::public.booking_status
     ) then
    raise exception using errcode = '22023', message = 'booking_status_does_not_accept_payment';
  end if;

  select
    coalesce(sum(m.amount_cents) filter (
      where m.record_type = 'PAYMENT'::public.manual_payment_record_type
    ), 0),
    coalesce(sum(m.amount_cents) filter (
      where m.record_type = 'REFUND'::public.manual_payment_record_type
    ), 0)
  into v_paid_cents, v_refunded_cents
  from public.manual_payment_records m
  where m.booking_id = p_booking_id
    and m.operator_id = p_operator_id
    and m.status = 'RECORDED'::public.manual_payment_record_status
    and (
      (p_purpose = 'SECURITY_DEPOSIT'::public.manual_payment_purpose
       and m.purpose = 'SECURITY_DEPOSIT'::public.manual_payment_purpose)
      or
      (p_purpose <> 'SECURITY_DEPOSIT'::public.manual_payment_purpose
       and m.purpose <> 'SECURITY_DEPOSIT'::public.manual_payment_purpose)
    );

  if p_record_type = 'PAYMENT'::public.manual_payment_record_type then
    v_new_net_cents := v_paid_cents - v_refunded_cents + p_amount_cents;
    if p_purpose <> 'SECURITY_DEPOSIT'::public.manual_payment_purpose then
      v_total_cents := coalesce(v_booking.customer_total_cents_snapshot, 0);
      if v_new_net_cents > v_total_cents then
        raise exception using errcode = '22023', message = 'manual_payment_exceeds_booking_total';
      end if;
    end if;
  else
    v_new_net_cents := v_paid_cents - v_refunded_cents - p_amount_cents;
    if v_new_net_cents < 0 then
      raise exception using errcode = '22023', message = 'manual_refund_exceeds_recorded_payments';
    end if;
  end if;

  insert into public.manual_payment_records (
    id, operator_id, booking_id, record_type, purpose, payment_method,
    amount_cents, currency, external_reference, note, occurred_at, recorded_by
  ) values (
    v_record_id, p_operator_id, p_booking_id, p_record_type, p_purpose,
    p_payment_method, p_amount_cents, v_booking.currency_snapshot,
    v_reference, v_note, p_occurred_at, v_user_id
  );

  insert into public.booking_events (
    operator_id, booking_id, event_type, actor_type, actor_user_id,
    from_status, to_status, message, metadata
  ) values (
    p_operator_id, p_booking_id,
    case
      when p_record_type = 'PAYMENT'::public.manual_payment_record_type
        then 'MANUAL_PAYMENT_RECORDED'
      else 'MANUAL_REFUND_RECORDED'
    end,
    'OPERATOR'::public.booking_event_actor_type,
    v_user_id, v_booking.status, v_booking.status,
    v_note,
    pg_catalog.jsonb_build_object(
      'record_id', v_record_id,
      'record_type', p_record_type,
      'purpose', p_purpose,
      'payment_method', p_payment_method,
      'amount_cents', p_amount_cents,
      'currency', v_booking.currency_snapshot,
      'off_platform', true
    )
  );

  insert into public.audit_logs (
    actor_type, actor_user_id, operator_id, booking_id, action,
    entity_type, entity_id, metadata
  ) values (
    'OPERATOR'::public.audit_actor_type, v_user_id, p_operator_id, p_booking_id,
    case
      when p_record_type = 'PAYMENT'::public.manual_payment_record_type
        then 'MANUAL_PAYMENT_RECORDED'
      else 'MANUAL_REFUND_RECORDED'
    end,
    'MANUAL_PAYMENT_RECORD', v_record_id::text,
    pg_catalog.jsonb_build_object(
      'record_type', p_record_type,
      'purpose', p_purpose,
      'payment_method', p_payment_method,
      'amount_cents', p_amount_cents,
      'currency', v_booking.currency_snapshot,
      'sensitive_values_omitted', true
    )
  );

  return v_record_id;
end;
$$;

create or replace function public.operator_void_manual_payment(
  p_operator_id uuid,
  p_record_id uuid,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_record public.manual_payment_records%rowtype;
  v_reason text := nullif(pg_catalog.btrim(coalesce(p_reason, '')), '');
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
    raise exception using errcode = '42501', message = 'manual_payment_void_not_allowed';
  end if;

  if not exists (
    select 1 from public.operators o
    where o.id = p_operator_id
      and o.status = 'ACTIVE'::public.operator_status
  ) then
    raise exception using errcode = '22023', message = 'operator_must_be_active';
  end if;

  if v_reason is null or pg_catalog.length(v_reason) < 5 or pg_catalog.length(v_reason) > 1000 then
    raise exception using errcode = '22023', message = 'manual_payment_void_reason_required';
  end if;

  select * into v_record
  from public.manual_payment_records m
  where m.id = p_record_id
    and m.operator_id = p_operator_id
  for update;

  if not found then
    raise exception using errcode = '22023', message = 'manual_payment_record_not_found';
  end if;

  if v_record.status = 'VOIDED'::public.manual_payment_record_status then
    raise exception using errcode = '22023', message = 'manual_payment_already_voided';
  end if;

  -- Lock the parent as well so a void and a concurrent insert cannot
  -- produce a transiently inconsistent balance decision.
  perform 1
  from public.bookings b
  where b.id = v_record.booking_id
    and b.operator_id = p_operator_id
  for update;

  update public.manual_payment_records
  set
    status = 'VOIDED'::public.manual_payment_record_status,
    voided_at = pg_catalog.now(),
    voided_by = v_user_id,
    void_reason = v_reason
  where id = p_record_id;

  insert into public.booking_events (
    operator_id, booking_id, event_type, actor_type, actor_user_id,
    message, metadata
  ) values (
    p_operator_id, v_record.booking_id, 'MANUAL_PAYMENT_VOIDED',
    'OPERATOR'::public.booking_event_actor_type, v_user_id,
    v_reason,
    pg_catalog.jsonb_build_object(
      'record_id', p_record_id,
      'record_type', v_record.record_type,
      'purpose', v_record.purpose,
      'amount_cents', v_record.amount_cents,
      'currency', v_record.currency,
      'off_platform', true
    )
  );

  insert into public.audit_logs (
    actor_type, actor_user_id, operator_id, booking_id, action,
    entity_type, entity_id, reason, metadata
  ) values (
    'OPERATOR'::public.audit_actor_type, v_user_id, p_operator_id,
    v_record.booking_id, 'MANUAL_PAYMENT_VOIDED',
    'MANUAL_PAYMENT_RECORD', p_record_id::text, v_reason,
    pg_catalog.jsonb_build_object(
      'record_type', v_record.record_type,
      'purpose', v_record.purpose,
      'amount_cents', v_record.amount_cents,
      'currency', v_record.currency,
      'sensitive_values_omitted', true
    )
  );

  return p_record_id;
end;
$$;

revoke all on function public.operator_record_manual_payment(
  uuid, uuid, public.manual_payment_record_type, public.manual_payment_purpose,
  public.manual_payment_method, integer, timestamptz, text, text
) from public, anon;
grant execute on function public.operator_record_manual_payment(
  uuid, uuid, public.manual_payment_record_type, public.manual_payment_purpose,
  public.manual_payment_method, integer, timestamptz, text, text
) to authenticated, service_role;

revoke all on function public.operator_void_manual_payment(uuid, uuid, text)
  from public, anon;
grant execute on function public.operator_void_manual_payment(uuid, uuid, text)
  to authenticated, service_role;

-- All authenticated writes go through the trusted commands above.
revoke insert, update, delete on table public.manual_payment_records
  from authenticated, anon;

comment on column public.manual_payment_records.purpose is
  'Accounting purpose. SECURITY_DEPOSIT is excluded from commercial revenue and balance calculations.';

comment on function public.operator_record_manual_payment(
  uuid, uuid, public.manual_payment_record_type, public.manual_payment_purpose,
  public.manual_payment_method, integer, timestamptz, text, text
) is
  'Records an off-platform manual booking payment/refund under a booking lock, with balance validation and append-only audit.';

comment on function public.operator_void_manual_payment(uuid, uuid, text) is
  'Audited management-only void for an immutable off-platform finance record.';

commit;
