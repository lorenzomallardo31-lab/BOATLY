-- ============================================================
-- BOATLY
-- Phase C final gate fix: deterministic customer time semantics
-- ============================================================
--
-- React's purity lint correctly rejects Date.now() during render.
-- Time-sensitive booking decisions belong on the trusted server side
-- anyway, so expose them from the existing SECURITY DEFINER RPCs using
-- PostgreSQL's transaction-stable now().
-- ============================================================

begin;

create or replace function public.customer_bookings()
returns setof jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_strip_nulls(
    jsonb_build_object(
      'id', b.id,
      'reference', b.reference,
      'status', b.status,
      'starts_at', b.starts_at,
      'ends_at', b.ends_at,
      'passenger_count', b.passenger_count,
      'currency', b.currency_snapshot,
      'customer_total_cents', b.customer_total_cents_snapshot,
      'boat', b.boat_snapshot,
      'location', b.pickup_location_snapshot,
      'legal_offering', b.legal_offering_snapshot,
      'created_at', b.created_at,
      'confirmed_at', b.confirmed_at,
      'cancelled_at', b.cancelled_at,
      'is_upcoming', b.ends_at >= pg_catalog.now(),
      'has_pending_cancellation_request', exists (
        select 1
        from public.booking_cancellation_requests bcr
        where bcr.booking_id = b.id
          and bcr.status = 'PENDING'::public.booking_cancellation_request_status
      )
    )
  )
  from public.bookings b
  where b.customer_user_id = auth.uid()
  order by b.starts_at desc, b.created_at desc;
$$;


create or replace function public.customer_booking_detail(
  p_booking_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_booking public.bookings%rowtype;
  v_extras jsonb;
  v_price_items jsonb;
  v_cancellation_request jsonb;
  v_can_request_cancellation boolean;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'authentication_required';
  end if;

  select *
  into v_booking
  from public.bookings b
  where b.id = p_booking_id
    and b.customer_user_id = v_user_id;

  if not found then
    raise exception using
      errcode = '42501',
      message = 'booking_not_accessible';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', be.id,
        'name', be.extra_name_snapshot,
        'pricing_unit', be.pricing_unit_snapshot,
        'quantity', be.quantity,
        'unit_price_cents', be.unit_price_cents,
        'total_price_cents', be.total_price_cents
      )
      order by be.created_at, be.id
    ),
    '[]'::jsonb
  )
  into v_extras
  from public.booking_extras be
  where be.booking_id = v_booking.id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', bpi.id,
        'type', bpi.item_type,
        'label', bpi.label,
        'quantity', bpi.quantity,
        'unit_amount_cents', bpi.unit_amount_cents,
        'amount_cents', bpi.amount_cents
      )
      order by bpi.sort_order, bpi.created_at, bpi.id
    ),
    '[]'::jsonb
  )
  into v_price_items
  from public.booking_price_items bpi
  where bpi.booking_id = v_booking.id;

  select jsonb_build_object(
    'id', bcr.id,
    'status', bcr.status,
    'reason', bcr.reason,
    'estimated_refund_cents', bcr.estimated_refund_cents,
    'currency', bcr.currency,
    'requested_at', bcr.requested_at,
    'resolved_at', bcr.resolved_at,
    'resolution_note', bcr.resolution_note
  )
  into v_cancellation_request
  from public.booking_cancellation_requests bcr
  where bcr.booking_id = v_booking.id
  order by bcr.created_at desc
  limit 1;

  v_can_request_cancellation :=
    v_booking.status = 'CONFIRMED'::public.booking_status
    and v_booking.starts_at > pg_catalog.now()
    and not exists (
      select 1
      from public.booking_cancellation_requests bcr
      where bcr.booking_id = v_booking.id
        and bcr.status = 'PENDING'::public.booking_cancellation_request_status
    );

  return jsonb_strip_nulls(
    jsonb_build_object(
      'id', v_booking.id,
      'reference', v_booking.reference,
      'status', v_booking.status,
      'source', v_booking.source,
      'starts_at', v_booking.starts_at,
      'ends_at', v_booking.ends_at,
      'passenger_count', v_booking.passenger_count,
      'driver_is_customer', v_booking.driver_is_customer,
      'customer_note', v_booking.customer_note,
      'currency', v_booking.currency_snapshot,
      'rental_subtotal_cents', v_booking.rental_subtotal_cents_snapshot,
      'extras_total_cents', v_booking.extras_total_cents_snapshot,
      'discount_total_cents', v_booking.discount_total_cents_snapshot,
      'tax_total_cents', v_booking.tax_total_cents_snapshot,
      'customer_total_cents', v_booking.customer_total_cents_snapshot,
      'security_deposit_cents', v_booking.security_deposit_cents_snapshot,
      'customer', v_booking.customer_snapshot,
      'boat', v_booking.boat_snapshot,
      'legal_offering', v_booking.legal_offering_snapshot,
      'location', v_booking.pickup_location_snapshot,
      'driver_eligibility', v_booking.driver_eligibility_snapshot,
      'cancellation_policy', v_booking.cancellation_policy_snapshot,
      'pricing', v_booking.pricing_snapshot,
      'extras', v_extras,
      'price_items', v_price_items,
      'cancellation_request', v_cancellation_request,
      'can_request_cancellation', v_can_request_cancellation,
      'created_at', v_booking.created_at,
      'confirmed_at', v_booking.confirmed_at,
      'cancelled_at', v_booking.cancelled_at
    )
  );
end;
$$;

-- Reassert the intended execution surface after CREATE OR REPLACE.
revoke execute on function public.customer_bookings() from public, anon;
grant execute on function public.customer_bookings() to authenticated;

revoke execute on function public.customer_booking_detail(uuid) from public, anon;
grant execute on function public.customer_booking_detail(uuid) to authenticated;

commit;
