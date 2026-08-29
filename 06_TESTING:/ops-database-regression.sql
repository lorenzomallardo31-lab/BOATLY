-- Boatly Ops database regression suite.
-- Run only from the Supabase SQL editor against a TEST project.
-- Every synthetic row is enclosed in one transaction and rolled back.

begin;

select set_config(
  'request.jwt.claim.sub',
  (
    select om.user_id::text
    from public.operator_members om
    join public.operators o on o.id = om.operator_id and o.status = 'ACTIVE'
    join public.boats b on b.operator_id = o.id and b.status = 'ACTIVE'
    join public.boat_legal_offerings blo on blo.boat_id = b.id and blo.is_active
    join public.operator_locations ol on ol.operator_id = o.id and ol.is_active
    where om.role = 'OWNER' and om.status = 'ACTIVE'
    limit 1
  ),
  true
);

do $regression$
declare
  v_operator_id uuid;
  v_other_operator_id uuid;
  v_boat_id uuid;
  v_offering_id uuid;
  v_location_id uuid;
  v_booking_id uuid;
  v_adjacent_booking_id uuid;
  v_customer_id uuid;
  v_payment_id uuid;
  v_refund_id uuid;
  v_expected boolean;
begin
  select o.id, b.id, blo.id, ol.id
  into v_operator_id, v_boat_id, v_offering_id, v_location_id
  from public.operator_members om
  join public.operators o on o.id = om.operator_id and o.status = 'ACTIVE'
  join public.boats b on b.operator_id = o.id and b.status = 'ACTIVE'
  join public.boat_legal_offerings blo on blo.boat_id = b.id and blo.is_active
  join public.operator_locations ol on ol.operator_id = o.id and ol.is_active
  where om.user_id = auth.uid() and om.role = 'OWNER' and om.status = 'ACTIVE'
  limit 1;

  if v_operator_id is null then
    raise exception 'fixture_missing: active owner, boat, offering and location required';
  end if;

  select o.id into v_other_operator_id
  from public.operators o
  where o.id <> v_operator_id
  order by o.created_at
  limit 1;

  v_booking_id := public.operator_create_manual_booking(
    v_operator_id, v_boat_id, v_offering_id, v_location_id,
    now() + interval '1000 days', now() + interval '1000 days 4 hours',
    1, 'Regression Customer',
    'ops-regression-' || gen_random_uuid()::text || '@example.invalid',
    null, 50000, 'Synthetic row; transaction rollback', null
  );

  select b.operator_customer_id into v_customer_id
  from public.bookings b where b.id = v_booking_id;

  -- A different customer cannot occupy the same boat during any overlap.
  v_expected := false;
  begin
    perform public.operator_create_manual_booking(
      v_operator_id, v_boat_id, v_offering_id, v_location_id,
      now() + interval '1000 days 1 hour', now() + interval '1000 days 2 hours',
      1, 'Other Regression Customer',
      'ops-regression-other-' || gen_random_uuid()::text || '@example.invalid',
      null, 10000, null, null
    );
  exception when others then
    if sqlerrm = 'boat_booking_overlap' then v_expected := true; else raise; end if;
  end;
  if not v_expected then raise exception 'boat_overlap_not_blocked'; end if;

  -- The same customer cannot overlap even if the caller reuses the CRM id.
  v_expected := false;
  begin
    perform public.operator_create_manual_booking(
      v_operator_id, v_boat_id, v_offering_id, v_location_id,
      now() + interval '1000 days 2 hours', now() + interval '1000 days 3 hours',
      1, 'ignored', null, null, 10000, null, v_customer_id
    );
  exception when others then
    if sqlerrm = 'customer_booking_overlap' then v_expected := true; else raise; end if;
  end;
  if not v_expected then raise exception 'customer_overlap_not_blocked'; end if;

  -- Half-open intervals permit a booking that starts exactly at the prior end.
  v_adjacent_booking_id := public.operator_create_manual_booking(
    v_operator_id, v_boat_id, v_offering_id, v_location_id,
    now() + interval '1000 days 4 hours', now() + interval '1000 days 5 hours',
    1, 'Adjacent Regression Customer',
    'ops-regression-adjacent-' || gen_random_uuid()::text || '@example.invalid',
    null, 10000, null, null
  );
  if v_adjacent_booking_id is null then raise exception 'adjacent_booking_rejected'; end if;

  -- Existing CRM identities cannot be silently duplicated.
  v_expected := false;
  begin
    perform public.operator_save_customer(
      v_operator_id, null, 'Duplicate Regression Customer',
      (select oc.email from public.operator_customers oc where oc.id = v_customer_id),
      null, 'IT', null, null
    );
  exception when others then
    if sqlerrm = 'customer_email_already_exists' then v_expected := true; else raise; end if;
  end;
  if not v_expected then raise exception 'duplicate_customer_email_not_blocked'; end if;

  v_payment_id := public.operator_record_manual_payment(
    v_operator_id, v_booking_id, 'PAYMENT', 'DEPOSIT', 'BANK_TRANSFER',
    30000, now(), 'REGRESSION-DEPOSIT', 'Synthetic movement'
  );
  perform public.operator_record_manual_payment(
    v_operator_id, v_booking_id, 'PAYMENT', 'BALANCE', 'CASH',
    20000, now(), null, 'Synthetic movement'
  );

  v_expected := false;
  begin
    perform public.operator_record_manual_payment(
      v_operator_id, v_booking_id, 'PAYMENT', 'OTHER', 'OTHER',
      1, now(), null, null
    );
  exception when others then
    if sqlerrm = 'manual_payment_exceeds_booking_total' then v_expected := true; else raise; end if;
  end;
  if not v_expected then raise exception 'overpayment_not_blocked'; end if;

  v_refund_id := public.operator_record_manual_payment(
    v_operator_id, v_booking_id, 'REFUND', 'OTHER', 'BANK_TRANSFER',
    10000, now(), 'REGRESSION-REFUND', 'Synthetic movement'
  );

  v_expected := false;
  begin
    perform public.operator_record_manual_payment(
      v_operator_id, v_booking_id, 'REFUND', 'OTHER', 'OTHER',
      40001, now(), null, null
    );
  exception when others then
    if sqlerrm = 'manual_refund_exceeds_recorded_payments' then v_expected := true; else raise; end if;
  end;
  if not v_expected then raise exception 'excess_refund_not_blocked'; end if;

  perform public.operator_record_manual_payment(
    v_operator_id, v_booking_id, 'PAYMENT', 'SECURITY_DEPOSIT', 'CARD_EXTERNAL',
    25000, now(), 'REGRESSION-SECURITY', 'Synthetic movement'
  );

  -- Active finance facts prevent immutable replacement/rescheduling.
  v_expected := false;
  begin
    perform public.operator_reschedule_manual_booking(
      v_operator_id, v_booking_id, v_boat_id, v_offering_id, v_location_id,
      now() + interval '1001 days', now() + interval '1001 days 4 hours',
      1, 50000, null, 'Finance regression'
    );
  exception when others then
    if sqlerrm = 'paid_booking_requires_finance_workflow' then v_expected := true; else raise; end if;
  end;
  if not v_expected then raise exception 'financed_reschedule_not_blocked'; end if;

  perform public.operator_void_manual_payment(
    v_operator_id, v_refund_id, 'Synthetic correction regression'
  );
  if not exists (
    select 1 from public.manual_payment_records m
    where m.id = v_refund_id and m.status = 'VOIDED'
  ) then raise exception 'void_not_persisted'; end if;

  -- An owner from tenant A cannot invoke trusted commands for tenant B.
  if v_other_operator_id is not null then
    v_expected := false;
    begin
      perform public.operator_save_customer(
        v_other_operator_id, null, 'Cross Tenant Probe',
        'cross-tenant-' || gen_random_uuid()::text || '@example.invalid',
        null, 'IT', null, null
      );
    exception when others then
      if sqlerrm = 'customer_save_not_allowed' then v_expected := true; else raise; end if;
    end;
    if not v_expected then raise exception 'cross_tenant_customer_write_not_blocked'; end if;
  end if;

  if (select count(*) from public.audit_logs a where a.booking_id = v_booking_id
      and a.action in ('MANUAL_PAYMENT_RECORDED', 'MANUAL_REFUND_RECORDED', 'MANUAL_PAYMENT_VOIDED')) < 5 then
    raise exception 'finance_audit_incomplete';
  end if;

  raise notice 'boatly_ops_database_regression=ok';
end;
$regression$;

rollback;

-- Expected result: false / false / false / true / true.
select
  has_table_privilege('authenticated', 'public.manual_payment_records', 'INSERT') as direct_insert,
  has_table_privilege('authenticated', 'public.manual_payment_records', 'UPDATE') as direct_update,
  has_table_privilege('authenticated', 'public.manual_payment_records', 'DELETE') as direct_delete,
  has_function_privilege(
    'authenticated',
    'public.operator_record_manual_payment(uuid,uuid,public.manual_payment_record_type,public.manual_payment_purpose,public.manual_payment_method,integer,timestamptz,text,text)',
    'EXECUTE'
  ) as record_rpc,
  has_function_privilege(
    'authenticated',
    'public.operator_void_manual_payment(uuid,uuid,text)',
    'EXECUTE'
  ) as void_rpc;

