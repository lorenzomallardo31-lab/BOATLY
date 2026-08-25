-- ============================================================
-- BOATLY
-- Migration: Compliance, Staff, Privacy & Admin RLS
-- ============================================================
--
-- Purpose:
--   Complete the first Boatly RLS authorization pass for:
--
--   - operator invitations;
--   - legal/commercial configuration;
--   - document/compliance metadata;
--   - staff/skipper records;
--   - raw reviews/moderation;
--   - audit logs;
--   - privacy/data-governance records;
--   - Boatly internal platform cases.
--
-- Security model:
--
--   - anon receives no direct access to these raw tables;
--   - sensitive client-side mutations remain disabled;
--   - platform roles receive only domain-relevant read access;
--   - operator data remains workspace-scoped;
--   - raw moderation/compliance/privacy data is not exposed to
--     ordinary customers;
--   - public reviews continue to use marketplace_reviews();
--   - future writes use trusted Server Actions/RPC workflows.
--
-- ============================================================

begin;


-- ============================================================
-- PLATFORM CASE AUTHORIZATION HELPER
-- ============================================================
--
-- Platform cases are segmented by operational responsibility.
--
-- SUPER_ADMIN / ADMIN
--   -> every case
--
-- SUPPORT
--   -> SUPPORT / OTHER
--
-- FINANCE
--   -> FINANCE / TAX
--
-- MODERATOR
--   -> MODERATION
--
-- COMPLIANCE
--   -> COMPLIANCE / PRIVACY / SECURITY_INCIDENT
--
-- ============================================================

create or replace function private.can_access_platform_case(
  target_case_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.platform_cases pc
    where pc.id = target_case_id
      and (
        private.has_platform_role(
          array[
            'SUPER_ADMIN'::public.platform_role,
            'ADMIN'::public.platform_role
          ]
        )

        or (
          pc.case_type in (
            'SUPPORT'::public.platform_case_type,
            'OTHER'::public.platform_case_type
          )
          and private.has_platform_role(
            array[
              'SUPPORT'::public.platform_role
            ]
          )
        )

        or (
          pc.case_type in (
            'FINANCE'::public.platform_case_type,
            'TAX'::public.platform_case_type
          )
          and private.has_platform_role(
            array[
              'FINANCE'::public.platform_role
            ]
          )
        )

        or (
          pc.case_type =
            'MODERATION'::public.platform_case_type
          and private.has_platform_role(
            array[
              'MODERATOR'::public.platform_role
            ]
          )
        )

        or (
          pc.case_type in (
            'COMPLIANCE'::public.platform_case_type,
            'PRIVACY'::public.platform_case_type,
            'SECURITY_INCIDENT'::public.platform_case_type
          )
          and private.has_platform_role(
            array[
              'COMPLIANCE'::public.platform_role
            ]
          )
        )
      )
  );
$$;


revoke execute
on function private.can_access_platform_case(uuid)
from public, anon, authenticated;


grant execute
on function private.can_access_platform_case(uuid)
to authenticated;


comment on function private.can_access_platform_case(uuid) is
  'Returns true when auth.uid() has a Boatly platform role allowed to access the requested internal platform case.';


-- ============================================================
-- REMOVE CLIENT PRIVILEGES FIRST
-- ============================================================

revoke all
on table
  public.operator_invitations,

  public.legal_document_versions,
  public.subscription_plans,
  public.operator_subscriptions,
  public.commission_rules,

  public.document_types,
  public.operator_documents,
  public.boat_documents,
  public.operator_verifications,
  public.boat_publication_reviews,
  public.compliance_checks,

  public.operator_staff_profiles,
  public.skipper_profiles,
  public.skipper_documents,

  public.reviews,
  public.audit_logs,

  public.privacy_requests,
  public.privacy_request_events,
  public.consent_records,
  public.data_retention_policies,

  public.platform_cases,
  public.platform_case_events
from anon, authenticated;


-- ============================================================
-- MINIMUM AUTHENTICATED GRANTS
-- ============================================================
--
-- C6.5 intentionally grants SELECT only.
--
-- No authenticated INSERT / UPDATE / DELETE is introduced on
-- these raw tables.
-- ============================================================

grant select
on table
  public.operator_invitations,

  public.legal_document_versions,
  public.subscription_plans,
  public.operator_subscriptions,
  public.commission_rules,

  public.document_types,
  public.operator_documents,
  public.boat_documents,
  public.operator_verifications,
  public.boat_publication_reviews,
  public.compliance_checks,

  public.operator_staff_profiles,
  public.skipper_profiles,
  public.skipper_documents,

  public.reviews,
  public.audit_logs,

  public.privacy_requests,
  public.privacy_request_events,
  public.consent_records,
  public.data_retention_policies,

  public.platform_cases,
  public.platform_case_events
to authenticated;


-- ============================================================
-- OPERATOR INVITATIONS
-- ============================================================
--
-- Only workspace OWNER/MANAGER and Boatly administration may
-- read raw invitation rows.
--
-- Invitation creation/acceptance/revocation remains a trusted
-- workflow because invitation tokens and role assignment require
-- anti-escalation validation.
-- ============================================================

create policy operator_invitations_select_internal
on public.operator_invitations
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

  or private.has_platform_role(
    array[
      'SUPER_ADMIN'::public.platform_role,
      'ADMIN'::public.platform_role
    ]
  )
);


-- ============================================================
-- LEGAL DOCUMENT VERSIONS
-- ============================================================
--
-- Raw draft/published/superseded version management remains
-- internal.
--
-- Customer/operator legal-document presentation will use a
-- controlled public/authenticated surface later.
-- ============================================================

create policy legal_document_versions_select_platform
on public.legal_document_versions
for select
to authenticated
using (
  private.has_platform_role(
    array[
      'SUPER_ADMIN'::public.platform_role,
      'ADMIN'::public.platform_role,
      'COMPLIANCE'::public.platform_role
    ]
  )
);


-- ============================================================
-- SUBSCRIPTION PLANS
-- ============================================================
--
-- Product plan configuration is non-sensitive enough for
-- authenticated users to read.
--
-- Public marketing presentation can later use its own public
-- projection.
-- ============================================================

create policy subscription_plans_select_authenticated
on public.subscription_plans
for select
to authenticated
using (
  true
);


-- ============================================================
-- OPERATOR SUBSCRIPTIONS
-- ============================================================

create policy operator_subscriptions_select_allowed
on public.operator_subscriptions
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

  or private.has_platform_role(
    array[
      'SUPER_ADMIN'::public.platform_role,
      'ADMIN'::public.platform_role,
      'FINANCE'::public.platform_role
    ]
  )
);


-- ============================================================
-- COMMISSION RULES
-- ============================================================
--
-- Raw commission configuration remains finance/internal.
--
-- Operators will later receive the effective commercial terms
-- through a safe workflow/projection rather than the full rule
-- engine.
-- ============================================================

create policy commission_rules_select_financial
on public.commission_rules
for select
to authenticated
using (
  private.has_platform_role(
    array[
      'SUPER_ADMIN'::public.platform_role,
      'ADMIN'::public.platform_role,
      'FINANCE'::public.platform_role
    ]
  )
);


-- ============================================================
-- DOCUMENT TYPES
-- ============================================================
--
-- Authenticated users may read document taxonomy.
-- Actual document files/metadata remain separately protected.
-- ============================================================

create policy document_types_select_authenticated
on public.document_types
for select
to authenticated
using (
  true
);


-- ============================================================
-- OPERATOR DOCUMENTS
-- ============================================================

create policy operator_documents_select_allowed
on public.operator_documents
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

  or private.has_platform_role(
    array[
      'SUPER_ADMIN'::public.platform_role,
      'ADMIN'::public.platform_role,
      'COMPLIANCE'::public.platform_role
    ]
  )
);


-- ============================================================
-- BOAT DOCUMENTS
-- ============================================================

create policy boat_documents_select_allowed
on public.boat_documents
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

  or private.has_platform_role(
    array[
      'SUPER_ADMIN'::public.platform_role,
      'ADMIN'::public.platform_role,
      'COMPLIANCE'::public.platform_role
    ]
  )
);


-- ============================================================
-- OPERATOR VERIFICATIONS
-- ============================================================
--
-- Raw review notes/history remain internal.
--
-- Operator-facing verification feedback will later be exposed
-- through a safe workflow rather than raw table SELECT.
-- ============================================================

create policy operator_verifications_select_compliance
on public.operator_verifications
for select
to authenticated
using (
  private.has_platform_role(
    array[
      'SUPER_ADMIN'::public.platform_role,
      'ADMIN'::public.platform_role,
      'COMPLIANCE'::public.platform_role
    ]
  )
);


-- ============================================================
-- BOAT PUBLICATION REVIEWS
-- ============================================================

create policy boat_publication_reviews_select_compliance
on public.boat_publication_reviews
for select
to authenticated
using (
  private.has_platform_role(
    array[
      'SUPER_ADMIN'::public.platform_role,
      'ADMIN'::public.platform_role,
      'COMPLIANCE'::public.platform_role
    ]
  )
);


-- ============================================================
-- COMPLIANCE CHECKS
-- ============================================================

create policy compliance_checks_select_compliance
on public.compliance_checks
for select
to authenticated
using (
  private.has_platform_role(
    array[
      'SUPER_ADMIN'::public.platform_role,
      'ADMIN'::public.platform_role,
      'COMPLIANCE'::public.platform_role
    ]
  )
);


-- ============================================================
-- OPERATOR STAFF PROFILES
-- ============================================================
--
-- Raw staff records may contain internal notes.
--
-- Team-safe/user-safe profile projections will be introduced
-- when the B2B dashboard is implemented.
-- ============================================================

create policy operator_staff_profiles_select_management
on public.operator_staff_profiles
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

  or private.has_platform_role(
    array[
      'SUPER_ADMIN'::public.platform_role,
      'ADMIN'::public.platform_role
    ]
  )
);


-- ============================================================
-- SKIPPER PROFILES
-- ============================================================

create policy skipper_profiles_select_allowed
on public.skipper_profiles
for select
to authenticated
using (
  user_id = (select auth.uid())

  or private.has_operator_role(
    operator_id,
    array[
      'OWNER'::public.operator_member_role,
      'MANAGER'::public.operator_member_role
    ]
  )

  or private.has_platform_role(
    array[
      'SUPER_ADMIN'::public.platform_role,
      'ADMIN'::public.platform_role,
      'COMPLIANCE'::public.platform_role
    ]
  )
);


-- ============================================================
-- SKIPPER DOCUMENTS
-- ============================================================

create policy skipper_documents_select_allowed
on public.skipper_documents
for select
to authenticated
using (
  skipper_user_id = (select auth.uid())

  or private.has_operator_role(
    operator_id,
    array[
      'OWNER'::public.operator_member_role,
      'MANAGER'::public.operator_member_role
    ]
  )

  or private.has_platform_role(
    array[
      'SUPER_ADMIN'::public.platform_role,
      'ADMIN'::public.platform_role,
      'COMPLIANCE'::public.platform_role
    ]
  )
);


-- ============================================================
-- RAW REVIEWS / MODERATION
-- ============================================================
--
-- Public reviews continue to use:
--
--   public.marketplace_reviews()
--
-- Raw moderation data remains accessible only to moderation/
-- administrative roles.
-- ============================================================

create policy reviews_select_moderation
on public.reviews
for select
to authenticated
using (
  private.has_platform_role(
    array[
      'SUPER_ADMIN'::public.platform_role,
      'ADMIN'::public.platform_role,
      'MODERATOR'::public.platform_role
    ]
  )
);


-- ============================================================
-- AUDIT LOGS
-- ============================================================
--
-- Audit logs are not operator/customer data surfaces.
--
-- Writes remain trusted-backend only.
-- ============================================================

create policy audit_logs_select_admin
on public.audit_logs
for select
to authenticated
using (
  private.has_platform_role(
    array[
      'SUPER_ADMIN'::public.platform_role,
      'ADMIN'::public.platform_role
    ]
  )
);


-- ============================================================
-- PRIVACY REQUESTS
-- ============================================================
--
-- Raw privacy workflow rows can include internal decisions,
-- metadata and response artifact references.
--
-- Customer-facing privacy UX will use a safe server-side
-- interface rather than exposing the complete row.
-- ============================================================

create policy privacy_requests_select_privacy_staff
on public.privacy_requests
for select
to authenticated
using (
  private.has_platform_role(
    array[
      'SUPER_ADMIN'::public.platform_role,
      'ADMIN'::public.platform_role,
      'COMPLIANCE'::public.platform_role
    ]
  )
);


-- ============================================================
-- PRIVACY REQUEST EVENTS
-- ============================================================

create policy privacy_request_events_select_privacy_staff
on public.privacy_request_events
for select
to authenticated
using (
  private.has_platform_role(
    array[
      'SUPER_ADMIN'::public.platform_role,
      'ADMIN'::public.platform_role,
      'COMPLIANCE'::public.platform_role
    ]
  )
);


-- ============================================================
-- CONSENT RECORDS
-- ============================================================

create policy consent_records_select_privacy_staff
on public.consent_records
for select
to authenticated
using (
  private.has_platform_role(
    array[
      'SUPER_ADMIN'::public.platform_role,
      'ADMIN'::public.platform_role,
      'COMPLIANCE'::public.platform_role
    ]
  )
);


-- ============================================================
-- DATA RETENTION POLICIES
-- ============================================================

create policy data_retention_policies_select_privacy_staff
on public.data_retention_policies
for select
to authenticated
using (
  private.has_platform_role(
    array[
      'SUPER_ADMIN'::public.platform_role,
      'ADMIN'::public.platform_role,
      'COMPLIANCE'::public.platform_role
    ]
  )
);


-- ============================================================
-- PLATFORM CASES
-- ============================================================

create policy platform_cases_select_scoped
on public.platform_cases
for select
to authenticated
using (
  private.can_access_platform_case(id)
);


-- ============================================================
-- PLATFORM CASE EVENTS
-- ============================================================

create policy platform_case_events_select_scoped
on public.platform_case_events
for select
to authenticated
using (
  private.can_access_platform_case(
    platform_case_id
  )
);


commit;