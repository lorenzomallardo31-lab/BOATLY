-- ============================================================
-- BOATLY
-- Migration: Operator Onboarding Status Projection
-- ============================================================
--
-- Purpose:
--
--   Allow an authenticated OWNER to read the safe status of the
--   latest Boatly verification for one of their own workspaces.
--
-- Raw public.operator_verifications remains private to platform
-- roles according to the existing C6 RLS model.
--
-- Exposed operator-facing fields:
--
--   - verification id
--   - verification status
--   - submitted_at
--   - reviewed_at
--   - decision_note
--   - current operator status
--
-- Sensitive/internal fields such as reviewed_by and the complete
-- submission snapshot are not exposed through this RPC.
--
-- ============================================================

begin;


create or replace function public.get_operator_onboarding_verification_status(
  p_operator_id uuid
)
returns table (
  verification_id uuid,
  verification_status public.verification_review_status,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  decision_note text,
  operator_status public.operator_status
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
begin

  -- ----------------------------------------------------------
  -- AUTHENTICATION
  -- ----------------------------------------------------------

  v_user_id :=
    auth.uid();


  if v_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'authentication_required';
  end if;


  -- ----------------------------------------------------------
  -- OWNER AUTHORIZATION
  -- ----------------------------------------------------------

  if not exists (
    select 1

    from public.operator_members om

    where om.operator_id =
        p_operator_id

      and om.user_id =
        v_user_id

      and om.role =
        'OWNER'::public.operator_member_role

      and om.status =
        'ACTIVE'::public.operator_member_status
  ) then
    raise exception using
      errcode = '42501',
      message = 'operator_onboarding_status_not_allowed';
  end if;


  -- ----------------------------------------------------------
  -- SAFE PROJECTION
  -- ----------------------------------------------------------

  return query

  select
    latest_verification.id,
    latest_verification.status,
    latest_verification.submitted_at,
    latest_verification.reviewed_at,
    latest_verification.decision_note,
    o.status

  from public.operators o

  left join lateral (

    select
      ov.id,
      ov.status,
      ov.submitted_at,
      ov.reviewed_at,
      ov.decision_note

    from public.operator_verifications ov

    where ov.operator_id =
      o.id

    order by
      ov.created_at desc,
      ov.id desc

    limit 1

  ) latest_verification
    on true

  where o.id =
    p_operator_id;

end;
$$;


-- ============================================================
-- PRIVILEGES
-- ============================================================

revoke execute
on function public.get_operator_onboarding_verification_status(
  uuid
)
from public, anon;


grant execute
on function public.get_operator_onboarding_verification_status(
  uuid
)
to authenticated;


comment on function public.get_operator_onboarding_verification_status(
  uuid
) is
  'Safe operator-facing projection of the latest Boatly verification status for an ACTIVE OWNER workspace. Raw operator_verifications remains platform-private.';


commit;