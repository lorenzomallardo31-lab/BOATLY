-- ============================================================
-- BOATLY OPS
-- A booking with active off-platform ledger entries cannot be
-- replaced by the rescheduling workflow. The booking lock makes
-- this check atomic with concurrent finance writes.
-- ============================================================

begin;

alter function public.operator_reschedule_manual_booking(
  uuid, uuid, uuid, uuid, uuid, timestamptz, timestamptz,
  integer, integer, text, text
) rename to operator_reschedule_manual_booking_unchecked;

revoke all on function public.operator_reschedule_manual_booking_unchecked(
  uuid, uuid, uuid, uuid, uuid, timestamptz, timestamptz,
  integer, integer, text, text
) from public, anon, authenticated;

create function public.operator_reschedule_manual_booking(
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
  v_result uuid;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  -- This lock is deliberately taken before inspecting the ledger.
  -- operator_record_manual_payment takes the same parent lock.
  perform 1
  from public.bookings b
  where b.id = p_booking_id
    and b.operator_id = p_operator_id
  for update;

  if not found then
    raise exception using errcode = '22023', message = 'booking_not_found';
  end if;

  if exists (
    select 1
    from public.manual_payment_records m
    where m.booking_id = p_booking_id
      and m.operator_id = p_operator_id
      and m.status = 'RECORDED'::public.manual_payment_record_status
  ) then
    raise exception using errcode = '22023', message = 'paid_booking_requires_finance_workflow';
  end if;

  v_result := public.operator_reschedule_manual_booking_unchecked(
    p_operator_id,
    p_booking_id,
    p_boat_id,
    p_legal_offering_id,
    p_pickup_location_id,
    p_starts_at,
    p_ends_at,
    p_passenger_count,
    p_total_cents,
    p_operator_note,
    p_reason
  );

  return v_result;
end;
$$;

revoke all on function public.operator_reschedule_manual_booking(
  uuid, uuid, uuid, uuid, uuid, timestamptz, timestamptz,
  integer, integer, text, text
) from public, anon;

grant execute on function public.operator_reschedule_manual_booking(
  uuid, uuid, uuid, uuid, uuid, timestamptz, timestamptz,
  integer, integer, text, text
) to authenticated, service_role;

comment on function public.operator_reschedule_manual_booking(
  uuid, uuid, uuid, uuid, uuid, timestamptz, timestamptz,
  integer, integer, text, text
) is
  'Finance-aware wrapper around immutable booking rescheduling. Active manual ledger entries block replacement under the same booking lock used by finance writes.';

commit;
