-- ============================================================
-- BOATLY OPS
-- Keep the lock order identical for record and void operations:
-- parent booking first, ledger row second. This prevents a void
-- racing a refund from leaving a refund without its payment.
-- ============================================================

begin;

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
  v_booking_id uuid;
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

  -- Discover the parent without taking a child lock, then acquire the
  -- canonical parent-first lock used by every finance mutation.
  select m.booking_id into v_booking_id
  from public.manual_payment_records m
  where m.id = p_record_id
    and m.operator_id = p_operator_id;

  if not found then
    raise exception using errcode = '22023', message = 'manual_payment_record_not_found';
  end if;

  perform 1
  from public.bookings b
  where b.id = v_booking_id
    and b.operator_id = p_operator_id
  for update;

  if not found then
    raise exception using errcode = '22023', message = 'booking_not_found';
  end if;

  select * into v_record
  from public.manual_payment_records m
  where m.id = p_record_id
    and m.operator_id = p_operator_id
    and m.booking_id = v_booking_id
  for update;

  if not found then
    raise exception using errcode = '22023', message = 'manual_payment_record_not_found';
  end if;

  if v_record.status = 'VOIDED'::public.manual_payment_record_status then
    raise exception using errcode = '22023', message = 'manual_payment_already_voided';
  end if;

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

revoke all on function public.operator_void_manual_payment(uuid, uuid, text)
  from public, anon;
grant execute on function public.operator_void_manual_payment(uuid, uuid, text)
  to authenticated, service_role;

comment on function public.operator_void_manual_payment(uuid, uuid, text) is
  'Audited management-only void using the canonical booking-first lock order shared by every off-platform finance mutation.';

commit;
