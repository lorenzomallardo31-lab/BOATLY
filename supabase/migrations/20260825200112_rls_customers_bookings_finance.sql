-- ============================================================
-- BOATLY
-- Migration: Customers, Bookings & Finance RLS
-- ============================================================
--
-- Purpose:
--   Introduce explicit privileges and Row Level Security for:
--
--   - operator CRM customers;
--   - bookings and immutable booking snapshots;
--   - booking events/contracts;
--   - legal acceptances;
--   - Stripe Connect account state;
--   - Stripe events;
--   - payments;
--   - manual/off-platform payment records;
--   - refunds;
--   - payouts;
--   - booking skipper assignments.
--
-- Security model:
--
--   - raw booking/financial tables are not exposed directly to
--     customers because they contain internal/provider fields;
--   - customer-facing safe projections/API responses will be
--     introduced later;
--   - Stripe provider tables are never client-writable;
--   - stripe_events receives no anon/authenticated privileges;
--   - operator financial visibility is narrower than general
--     operational booking visibility;
--   - SKIPPER never receives the complete raw booking row merely
--     because they are assigned to a booking.
--
-- ============================================================

begin;


-- ============================================================
-- TRUSTED BOOKING OWNERSHIP HELPERS
-- ============================================================


create or replace function private.booking_operator_id(
  target_booking_id uuid
)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select b.operator_id
  from public.bookings b
  where b.id = target_booking_id;
$$;


create or replace function private.is_booking_customer(
  target_booking_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.bookings b
    where b.id = target_booking_id
      and b.customer_user_id = (select auth.uid())
  );
$$;


-- ============================================================
-- HELPER PRIVILEGES
-- ============================================================

revoke execute
on function private.booking_operator_id(uuid)
from public, anon;

revoke execute
on function private.is_booking_customer(uuid)
from public, anon;


grant execute
on function private.booking_operator_id(uuid)
to authenticated;

grant execute
on function private.is_booking_customer(uuid)
to authenticated;


-- ============================================================
-- REMOVE DEFAULT CLIENT PRIVILEGES
-- ============================================================

revoke all
on table
  public.operator_customers,
  public.bookings,
  public.booking_extras,
  public.booking_price_items,
  public.booking_events,
  public.booking_contracts,
  public.legal_acceptances,
  public.stripe_connected_accounts,
  public.stripe_events,
  public.payments,
  public.manual_payment_records,
  public.refunds,
  public.payouts,
  public.booking_skipper_assignments
from anon, authenticated;


-- ============================================================
-- GRANT BACK MINIMUM AUTHENTICATED PRIVILEGES
-- ============================================================


-- ------------------------------------------------------------
-- Operator CRM
-- ------------------------------------------------------------

grant select, insert, update
on table public.operator_customers
to authenticated;


-- ------------------------------------------------------------
-- Raw booking domain
--
-- Read only.
--
-- Booking creation/state transitions/financial snapshots will
-- later go through trusted booking-engine workflows.
-- ------------------------------------------------------------

grant select
on table
  public.bookings,
  public.booking_extras,
  public.booking_price_items,
  public.booking_events,
  public.booking_contracts
to authenticated;


-- ------------------------------------------------------------
-- Legal acceptance history
--
-- Direct INSERT remains deferred to a trusted acceptance
-- workflow so evidence cannot be arbitrarily forged by client
-- code.
-- ------------------------------------------------------------

grant select
on table public.legal_acceptances
to authenticated;


-- ------------------------------------------------------------
-- Finance/provider visibility
--
-- All provider mutations remain trusted-server only.
-- ------------------------------------------------------------

grant select
on table
  public.stripe_connected_accounts,
  public.payments,
  public.refunds,
  public.payouts
to authenticated;


-- ------------------------------------------------------------
-- Manual/off-platform records
--
-- Operator staff may record and controlledly void these rows.
-- Database triggers created in C4 still enforce immutable facts.
-- ------------------------------------------------------------

grant select, insert, update
on table public.manual_payment_records
to authenticated;


-- ------------------------------------------------------------
-- Skipper assignments
-- ------------------------------------------------------------

grant select, insert, update
on table public.booking_skipper_assignments
to authenticated;


-- stripe_events intentionally receives NO grant.


-- ============================================================
-- OPERATOR CUSTOMERS
-- ============================================================
--
-- CRM customer records belong to the operator workspace.
--
-- CUSTOMER accounts do not automatically receive access to the
-- operator's internal CRM record about them.
-- ============================================================

create policy operator_customers_select_internal
on public.operator_customers
for select
to authenticated
using (
  private.has_operator_role(
    operator_id,
    array[
      'OWNER'::public.operator_member_role,
      'MANAGER'::public.operator_member_role,
      'EMPLOYEE'::public.operator_member_role
    ]
  )

  or (
    select private.has_platform_role(
      array[
        'SUPER_ADMIN'::public.platform_role,
        'ADMIN'::public.platform_role,
        'SUPPORT'::public.platform_role,
        'COMPLIANCE'::public.platform_role
      ]
    )
  )
);


create policy operator_customers_manage_operator_staff
on public.operator_customers
for all
to authenticated
using (
  private.has_operator_role(
    operator_id,
    array[
      'OWNER'::public.operator_member_role,
      'MANAGER'::public.operator_member_role,
      'EMPLOYEE'::public.operator_member_role
    ]
  )
)
with check (
  private.has_operator_role(
    operator_id,
    array[
      'OWNER'::public.operator_member_role,
      'MANAGER'::public.operator_member_role,
      'EMPLOYEE'::public.operator_member_role
    ]
  )
);


-- ============================================================
-- BOOKINGS
-- ============================================================
--
-- Raw booking rows contain internal financial/legal snapshots.
--
-- Customers will later receive a safe customer-facing
-- projection rather than direct SELECT on this table.
-- ============================================================

create policy bookings_select_internal
on public.bookings
for select
to authenticated
using (
  private.has_operator_role(
    operator_id,
    array[
      'OWNER'::public.operator_member_role,
      'MANAGER'::public.operator_member_role,
      'EMPLOYEE'::public.operator_member_role
    ]
  )

  or (
    select private.has_platform_role(
      array[
        'SUPER_ADMIN'::public.platform_role,
        'ADMIN'::public.platform_role,
        'SUPPORT'::public.platform_role,
        'FINANCE'::public.platform_role,
        'COMPLIANCE'::public.platform_role
      ]
    )
  )
);


-- ============================================================
-- BOOKING EXTRAS
-- ============================================================

create policy booking_extras_select_internal
on public.booking_extras
for select
to authenticated
using (
  private.has_operator_role(
    private.booking_operator_id(booking_id),
    array[
      'OWNER'::public.operator_member_role,
      'MANAGER'::public.operator_member_role,
      'EMPLOYEE'::public.operator_member_role
    ]
  )

  or (
    select private.has_platform_role(
      array[
        'SUPER_ADMIN'::public.platform_role,
        'ADMIN'::public.platform_role,
        'SUPPORT'::public.platform_role,
        'FINANCE'::public.platform_role,
        'COMPLIANCE'::public.platform_role
      ]
    )
  )
);


-- ============================================================
-- BOOKING PRICE ITEMS
-- ============================================================

create policy booking_price_items_select_internal
on public.booking_price_items
for select
to authenticated
using (
  private.has_operator_role(
    private.booking_operator_id(booking_id),
    array[
      'OWNER'::public.operator_member_role,
      'MANAGER'::public.operator_member_role,
      'EMPLOYEE'::public.operator_member_role
    ]
  )

  or (
    select private.has_platform_role(
      array[
        'SUPER_ADMIN'::public.platform_role,
        'ADMIN'::public.platform_role,
        'SUPPORT'::public.platform_role,
        'FINANCE'::public.platform_role
      ]
    )
  )
);


-- ============================================================
-- BOOKING EVENTS
-- ============================================================
--
-- Raw event history may contain internal operational metadata.
-- It is not exposed directly to customers.
-- ============================================================

create policy booking_events_select_internal
on public.booking_events
for select
to authenticated
using (
  private.has_operator_role(
    private.booking_operator_id(booking_id),
    array[
      'OWNER'::public.operator_member_role,
      'MANAGER'::public.operator_member_role,
      'EMPLOYEE'::public.operator_member_role
    ]
  )

  or (
    select private.has_platform_role(
      array[
        'SUPER_ADMIN'::public.platform_role,
        'ADMIN'::public.platform_role,
        'SUPPORT'::public.platform_role,
        'COMPLIANCE'::public.platform_role
      ]
    )
  )
);


-- ============================================================
-- BOOKING CONTRACTS
-- ============================================================
--
-- Contract binaries remain private Storage objects.
-- Raw metadata is limited to operator/internal roles.
-- ============================================================

create policy booking_contracts_select_internal
on public.booking_contracts
for select
to authenticated
using (
  private.has_operator_role(
    operator_id,
    array[
      'OWNER'::public.operator_member_role,
      'MANAGER'::public.operator_member_role,
      'EMPLOYEE'::public.operator_member_role
    ]
  )

  or (
    select private.has_platform_role(
      array[
        'SUPER_ADMIN'::public.platform_role,
        'ADMIN'::public.platform_role,
        'SUPPORT'::public.platform_role,
        'COMPLIANCE'::public.platform_role
      ]
    )
  )
);


-- ============================================================
-- LEGAL ACCEPTANCES
-- ============================================================
--
-- A user may see their own acceptance evidence.
--
-- Operator staff may see booking/operator-related acceptance
-- evidence belonging to their workspace.
-- ============================================================

create policy legal_acceptances_select_allowed
on public.legal_acceptances
for select
to authenticated
using (
  user_id = (select auth.uid())

  or (
    operator_id is not null
    and private.has_operator_role(
      operator_id,
      array[
        'OWNER'::public.operator_member_role,
        'MANAGER'::public.operator_member_role,
        'EMPLOYEE'::public.operator_member_role
      ]
    )
  )

  or (
    select private.has_platform_role(
      array[
        'SUPER_ADMIN'::public.platform_role,
        'ADMIN'::public.platform_role,
        'SUPPORT'::public.platform_role,
        'COMPLIANCE'::public.platform_role
      ]
    )
  )
);


-- ============================================================
-- STRIPE CONNECTED ACCOUNTS
-- ============================================================

create policy stripe_connected_accounts_select_financial
on public.stripe_connected_accounts
for select
to authenticated
using (
  private.has_operator_role(
    operator_id,
    array[
      'OWNER'::public.operator_member_role,
      'MANAGER'::public.operator_member_role
    ]
  )

  or (
    select private.has_platform_role(
      array[
        'SUPER_ADMIN'::public.platform_role,
        'ADMIN'::public.platform_role,
        'FINANCE'::public.platform_role,
        'COMPLIANCE'::public.platform_role
      ]
    )
  )
);


-- ============================================================
-- STRIPE EVENTS
-- ============================================================
--
-- INTENTIONALLY NO POLICY.
--
-- INTENTIONALLY NO anon/authenticated grants.
--
-- Verified webhook persistence is trusted-server/provider
-- infrastructure only.
-- ============================================================


-- ============================================================
-- PAYMENTS
-- ============================================================
--
-- Raw provider/payment state is not exposed directly to the
-- customer.
-- ============================================================

create policy payments_select_financial
on public.payments
for select
to authenticated
using (
  private.has_operator_role(
    operator_id,
    array[
      'OWNER'::public.operator_member_role,
      'MANAGER'::public.operator_member_role
    ]
  )

  or (
    select private.has_platform_role(
      array[
        'SUPER_ADMIN'::public.platform_role,
        'ADMIN'::public.platform_role,
        'FINANCE'::public.platform_role,
        'SUPPORT'::public.platform_role
      ]
    )
  )
);


-- ============================================================
-- MANUAL PAYMENT RECORDS
-- ============================================================

create policy manual_payment_records_select_internal
on public.manual_payment_records
for select
to authenticated
using (
  private.has_operator_role(
    operator_id,
    array[
      'OWNER'::public.operator_member_role,
      'MANAGER'::public.operator_member_role,
      'EMPLOYEE'::public.operator_member_role
    ]
  )

  or (
    select private.has_platform_role(
      array[
        'SUPER_ADMIN'::public.platform_role,
        'ADMIN'::public.platform_role,
        'FINANCE'::public.platform_role,
        'SUPPORT'::public.platform_role
      ]
    )
  )
);


create policy manual_payment_records_insert_operator_staff
on public.manual_payment_records
for insert
to authenticated
with check (
  private.has_operator_role(
    operator_id,
    array[
      'OWNER'::public.operator_member_role,
      'MANAGER'::public.operator_member_role,
      'EMPLOYEE'::public.operator_member_role
    ]
  )
);


create policy manual_payment_records_update_management
on public.manual_payment_records
for update
to authenticated
using (
  private.has_operator_role(
    operator_id,
    array[
      'OWNER'::public.operator_member_role,
      'MANAGER'::public.operator_member_role
    ]
  )
)
with check (
  private.has_operator_role(
    operator_id,
    array[
      'OWNER'::public.operator_member_role,
      'MANAGER'::public.operator_member_role
    ]
  )
);


-- ============================================================
-- REFUNDS
-- ============================================================

create policy refunds_select_financial
on public.refunds
for select
to authenticated
using (
  private.has_operator_role(
    operator_id,
    array[
      'OWNER'::public.operator_member_role,
      'MANAGER'::public.operator_member_role
    ]
  )

  or (
    select private.has_platform_role(
      array[
        'SUPER_ADMIN'::public.platform_role,
        'ADMIN'::public.platform_role,
        'FINANCE'::public.platform_role,
        'SUPPORT'::public.platform_role
      ]
    )
  )
);


-- ============================================================
-- PAYOUTS
-- ============================================================

create policy payouts_select_financial
on public.payouts
for select
to authenticated
using (
  private.has_operator_role(
    operator_id,
    array[
      'OWNER'::public.operator_member_role,
      'MANAGER'::public.operator_member_role
    ]
  )

  or (
    select private.has_platform_role(
      array[
        'SUPER_ADMIN'::public.platform_role,
        'ADMIN'::public.platform_role,
        'FINANCE'::public.platform_role
      ]
    )
  )
);


-- ============================================================
-- BOOKING SKIPPER ASSIGNMENTS
-- ============================================================
--
-- The skipper sees the assignment record itself.
--
-- They do NOT gain raw booking-table access from this policy.
-- ============================================================

create policy booking_skipper_assignments_select_allowed
on public.booking_skipper_assignments
for select
to authenticated
using (
  skipper_user_id = (select auth.uid())

  or private.has_operator_role(
    operator_id,
    array[
      'OWNER'::public.operator_member_role,
      'MANAGER'::public.operator_member_role,
      'EMPLOYEE'::public.operator_member_role
    ]
  )

  or (
    select private.has_platform_role(
      array[
        'SUPER_ADMIN'::public.platform_role,
        'ADMIN'::public.platform_role,
        'SUPPORT'::public.platform_role
      ]
    )
  )
);


create policy booking_skipper_assignments_manage_operator_staff
on public.booking_skipper_assignments
for all
to authenticated
using (
  private.has_operator_role(
    operator_id,
    array[
      'OWNER'::public.operator_member_role,
      'MANAGER'::public.operator_member_role,
      'EMPLOYEE'::public.operator_member_role
    ]
  )
)
with check (
  private.has_operator_role(
    operator_id,
    array[
      'OWNER'::public.operator_member_role,
      'MANAGER'::public.operator_member_role,
      'EMPLOYEE'::public.operator_member_role
    ]
  )
);


-- ============================================================
-- COMMENTS
-- ============================================================

comment on function private.booking_operator_id(uuid) is
  'Trusted RLS helper resolving the operator that owns a booking.';


comment on function private.is_booking_customer(uuid) is
  'Trusted RLS helper checking whether auth.uid() is the marketplace customer linked to a booking.';


commit;