begin;

-- The current Boatly Ops product exposes two collaborator profiles only:
-- MANAGER (calendar, fleet and team) and EMPLOYEE (daily calendar work).
-- SKIPPER remains in the historical enum so old records and migrations stay
-- compatible, but it can no longer be assigned through supported workflows.
create or replace function public.operator_create_invitation(
  p_operator_id uuid,
  p_email text,
  p_role public.operator_member_role,
  p_token_hash text,
  p_expires_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_actor_role public.operator_member_role;
  v_email text := pg_catalog.lower(pg_catalog.btrim(coalesce(p_email, '')));
  v_invitation_id uuid;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  select om.role into v_actor_role
  from public.operator_members om
  join public.operators o on o.id = om.operator_id
  where om.operator_id = p_operator_id
    and om.user_id = v_user_id
    and om.status = 'ACTIVE'
    and o.status = 'ACTIVE';

  if v_actor_role is null
     or v_actor_role not in ('OWNER'::public.operator_member_role, 'MANAGER'::public.operator_member_role) then
    raise exception using errcode = '42501', message = 'team_invitation_not_allowed';
  end if;
  if p_role is null
     or p_role not in ('MANAGER'::public.operator_member_role, 'EMPLOYEE'::public.operator_member_role)
     or (v_actor_role = 'MANAGER'::public.operator_member_role and p_role = 'MANAGER'::public.operator_member_role) then
    raise exception using errcode = '42501', message = 'team_role_escalation_not_allowed';
  end if;
  if v_email = '' or pg_catalog.length(v_email) > 320
     or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception using errcode = '22023', message = 'invalid_invitation_email';
  end if;
  if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'invalid_invitation_token_hash';
  end if;
  if p_expires_at < pg_catalog.now() + interval '15 minutes'
     or p_expires_at > pg_catalog.now() + interval '14 days' then
    raise exception using errcode = '22023', message = 'invalid_invitation_expiry';
  end if;

  if exists (
    select 1
    from public.operator_members om
    join auth.users au on au.id = om.user_id
    where om.operator_id = p_operator_id
      and pg_catalog.lower(au.email) = v_email
      and om.status = 'ACTIVE'
  ) then
    raise exception using errcode = '23505', message = 'team_member_already_active';
  end if;

  update public.operator_invitations
  set revoked_at = pg_catalog.now()
  where operator_id = p_operator_id
    and email = v_email
    and accepted_at is null
    and revoked_at is null
    and expires_at <= pg_catalog.now();

  if exists (
    select 1 from public.operator_invitations oi
    where oi.operator_id = p_operator_id
      and oi.email = v_email
      and oi.accepted_at is null
      and oi.revoked_at is null
      and oi.expires_at > pg_catalog.now()
  ) then
    raise exception using errcode = '23505', message = 'team_invitation_already_pending';
  end if;

  insert into public.operator_invitations (
    operator_id, email, role, token_hash, invited_by, expires_at
  ) values (
    p_operator_id, v_email, p_role, p_token_hash, v_user_id, p_expires_at
  ) returning id into v_invitation_id;

  insert into public.audit_logs (
    actor_type, actor_user_id, operator_id, action,
    entity_type, entity_id, metadata
  ) values (
    'OPERATOR'::public.audit_actor_type, v_user_id, p_operator_id,
    'TEAM_INVITATION_CREATED', 'OPERATOR_INVITATION', v_invitation_id::text,
    pg_catalog.jsonb_build_object('role', p_role, 'email_omitted', true, 'expires_at', p_expires_at)
  );

  return v_invitation_id;
end;
$$;

create or replace function public.operator_revoke_invitation(
  p_operator_id uuid,
  p_invitation_id uuid,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_reason text := nullif(pg_catalog.btrim(coalesce(p_reason, '')), '');
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;
  if not private.has_operator_role(
    p_operator_id,
    array['OWNER'::public.operator_member_role, 'MANAGER'::public.operator_member_role]
  ) then
    raise exception using errcode = '42501', message = 'team_invitation_not_allowed';
  end if;
  if pg_catalog.length(v_reason) > 1000 then
    raise exception using errcode = '22023', message = 'invitation_revoke_reason_too_long';
  end if;

  update public.operator_invitations
  set revoked_at = pg_catalog.now()
  where id = p_invitation_id
    and operator_id = p_operator_id
    and accepted_at is null
    and revoked_at is null;

  if not found then
    raise exception using errcode = '22023', message = 'pending_invitation_not_found';
  end if;

  insert into public.audit_logs (
    actor_type, actor_user_id, operator_id, action,
    entity_type, entity_id, reason
  ) values (
    'OPERATOR'::public.audit_actor_type, v_user_id, p_operator_id,
    'TEAM_INVITATION_REVOKED', 'OPERATOR_INVITATION', p_invitation_id::text, v_reason
  );
end;
$$;

create or replace function public.operator_update_team_member(
  p_operator_id uuid,
  p_user_id uuid,
  p_action text,
  p_role public.operator_member_role default null,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := auth.uid();
  v_actor_role public.operator_member_role;
  v_target public.operator_members%rowtype;
  v_action text := pg_catalog.upper(pg_catalog.btrim(coalesce(p_action, '')));
  v_reason text := nullif(pg_catalog.btrim(coalesce(p_reason, '')), '');
begin
  if v_actor_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;
  select om.role into v_actor_role
  from public.operator_members om
  join public.operators o on o.id = om.operator_id
  where om.operator_id = p_operator_id and om.user_id = v_actor_id
    and om.status = 'ACTIVE' and o.status = 'ACTIVE';
  if v_actor_role is null
     or v_actor_role not in ('OWNER'::public.operator_member_role, 'MANAGER'::public.operator_member_role) then
    raise exception using errcode = '42501', message = 'team_management_not_allowed';
  end if;
  if p_user_id = v_actor_id then
    raise exception using errcode = '42501', message = 'team_self_management_not_allowed';
  end if;
  if pg_catalog.length(v_reason) > 1000 then
    raise exception using errcode = '22023', message = 'team_change_reason_too_long';
  end if;
  if v_action not in ('SET_ROLE', 'ACTIVATE', 'SUSPEND', 'REMOVE') then
    raise exception using errcode = '22023', message = 'invalid_team_action';
  end if;

  select * into v_target from public.operator_members om
  where om.operator_id = p_operator_id and om.user_id = p_user_id for update;
  if not found then raise exception using errcode = '22023', message = 'team_member_not_found'; end if;
  if v_target.role = 'OWNER'::public.operator_member_role then
    raise exception using errcode = '42501', message = 'owner_membership_is_protected';
  end if;
  if v_actor_role = 'MANAGER'::public.operator_member_role
     and (v_target.role = 'MANAGER'::public.operator_member_role or p_role = 'MANAGER'::public.operator_member_role) then
    raise exception using errcode = '42501', message = 'team_role_escalation_not_allowed';
  end if;

  if v_action = 'SET_ROLE' then
    if p_role is null
       or p_role not in ('MANAGER'::public.operator_member_role, 'EMPLOYEE'::public.operator_member_role) then
      raise exception using errcode = '22023', message = 'invalid_team_role';
    end if;
    update public.operator_members set role = p_role where operator_id = p_operator_id and user_id = p_user_id;
  elsif v_action = 'ACTIVATE' then
    update public.operator_members set status = 'ACTIVE' where operator_id = p_operator_id and user_id = p_user_id;
  elsif v_action = 'SUSPEND' then
    update public.operator_members set status = 'SUSPENDED' where operator_id = p_operator_id and user_id = p_user_id;
  else
    update public.operator_members set status = 'REMOVED' where operator_id = p_operator_id and user_id = p_user_id;
  end if;

  insert into public.audit_logs (
    actor_type, actor_user_id, operator_id, action,
    entity_type, entity_id, reason, metadata
  ) values (
    'OPERATOR'::public.audit_actor_type, v_actor_id, p_operator_id,
    'TEAM_MEMBER_' || v_action, 'OPERATOR_MEMBER', p_user_id::text, v_reason,
    pg_catalog.jsonb_build_object('previous_role', v_target.role, 'previous_status', v_target.status, 'new_role', p_role)
  );
end;
$$;

-- Revoking or restoring a collaborator is an immediate access-control action.
-- It stays audited, but no free-text justification is required.
create or replace function public.admin_set_operator_member_status(
  p_operator_id uuid,
  p_user_id uuid,
  p_status public.operator_member_status,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_user_id uuid := auth.uid();
  v_member public.operator_members%rowtype;
  v_reason text := nullif(pg_catalog.btrim(coalesce(p_reason, '')), '');
begin
  if v_actor_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  if not private.has_platform_role(array['SUPER_ADMIN'::public.platform_role]) then
    raise exception using errcode = '42501', message = 'member_status_change_not_allowed';
  end if;

  if pg_catalog.length(v_reason) > 1000 then
    raise exception using errcode = '22023', message = 'member_status_reason_too_long';
  end if;

  select * into v_member
  from public.operator_members om
  where om.operator_id = p_operator_id and om.user_id = p_user_id
  for update;

  if not found then
    raise exception using errcode = '22023', message = 'operator_member_not_found';
  end if;
  if v_member.status = p_status then
    raise exception using errcode = '22023', message = 'member_status_unchanged';
  end if;
  if v_member.role = 'OWNER'::public.operator_member_role
     and v_member.status = 'ACTIVE'::public.operator_member_status
     and p_status <> 'ACTIVE'::public.operator_member_status
     and not exists (
       select 1 from public.operator_members other
       where other.operator_id = p_operator_id
         and other.user_id <> p_user_id
         and other.role = 'OWNER'::public.operator_member_role
         and other.status = 'ACTIVE'::public.operator_member_status
     ) then
    raise exception using errcode = '22023', message = 'last_active_owner_cannot_be_suspended';
  end if;

  update public.operator_members
  set status = p_status
  where operator_id = p_operator_id and user_id = p_user_id;

  insert into public.audit_logs (
    actor_type, actor_user_id, operator_id, action,
    entity_type, entity_id, reason, metadata
  ) values (
    'PLATFORM'::public.audit_actor_type, v_actor_user_id, p_operator_id,
    'OPERATOR_MEMBER_STATUS_CHANGED', 'OPERATOR_MEMBER', p_user_id::text, v_reason,
    pg_catalog.jsonb_build_object(
      'role', v_member.role::text,
      'from_status', v_member.status::text,
      'to_status', p_status::text
    )
  );

  return pg_catalog.jsonb_build_object(
    'operator_id', p_operator_id,
    'user_id', p_user_id,
    'from_status', v_member.status,
    'to_status', p_status
  );
end;
$$;

revoke all on function public.operator_create_invitation(uuid, text, public.operator_member_role, text, timestamptz) from public, anon, authenticated;
revoke all on function public.operator_revoke_invitation(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.operator_update_team_member(uuid, uuid, text, public.operator_member_role, text) from public, anon, authenticated;
revoke all on function public.admin_set_operator_member_status(uuid, uuid, public.operator_member_status, text) from public, anon, authenticated;

grant execute on function public.operator_create_invitation(uuid, text, public.operator_member_role, text, timestamptz) to authenticated, service_role;
grant execute on function public.operator_revoke_invitation(uuid, uuid, text) to authenticated, service_role;
grant execute on function public.operator_update_team_member(uuid, uuid, text, public.operator_member_role, text) to authenticated, service_role;
grant execute on function public.admin_set_operator_member_status(uuid, uuid, public.operator_member_status, text) to authenticated;

comment on function public.operator_create_invitation(uuid, text, public.operator_member_role, text, timestamptz) is
  'Creates an auditable MANAGER or EMPLOYEE invitation from a server-generated SHA-256 token hash.';
comment on function public.operator_revoke_invitation(uuid, uuid, text) is
  'Revokes a pending collaborator invitation immediately; an optional reason is retained in audit.';
comment on function public.operator_update_team_member(uuid, uuid, text, public.operator_member_role, text) is
  'Changes MANAGER/EMPLOYEE role or access state with an optional audit reason.';
comment on function public.admin_set_operator_member_status(uuid, uuid, public.operator_member_status, text) is
  'SUPER_ADMIN-only collaborator suspension/reactivation with last-owner protection and optional reason.';

commit;
