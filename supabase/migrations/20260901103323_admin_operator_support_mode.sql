begin;

-- Boatly platform administrators must never need an operator's credentials.
-- This migration creates a short-lived, audited support session and a
-- temporary OWNER membership that keeps the existing tenant RLS boundary
-- intact. The membership is removed when the session ends or expires.

create table private.admin_operator_support_sessions (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null
    references auth.users(id)
    on delete cascade,
  operator_id uuid not null
    references public.operators(id)
    on delete cascade,
  created_membership boolean not null default false,
  started_at timestamptz not null default pg_catalog.now(),
  expires_at timestamptz not null,
  ended_at timestamptz,
  ended_by uuid
    references auth.users(id)
    on delete set null,
  end_reason text,
  constraint admin_operator_support_sessions_expiry_check
    check (expires_at > started_at),
  constraint admin_operator_support_sessions_end_check
    check (ended_at is null or ended_at >= started_at)
);

create unique index admin_operator_support_sessions_one_active_per_admin_idx
  on private.admin_operator_support_sessions(admin_user_id)
  where ended_at is null;

create index admin_operator_support_sessions_operator_history_idx
  on private.admin_operator_support_sessions(operator_id, started_at desc);

create index admin_operator_support_sessions_expiry_idx
  on private.admin_operator_support_sessions(expires_at)
  where ended_at is null;

revoke all on table private.admin_operator_support_sessions
from public, anon, authenticated;

alter table public.operator_members
  add column support_session_id uuid
    references private.admin_operator_support_sessions(id)
    on delete cascade;

alter table public.operator_members
  add constraint operator_members_support_owner_check
  check (support_session_id is null or role = 'OWNER'::public.operator_member_role);

create unique index operator_members_support_session_idx
  on public.operator_members(support_session_id)
  where support_session_id is not null;

create or replace function private.is_active_admin_operator_support(
  target_operator_id uuid,
  target_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    target_user_id is not null
    and exists (
      select 1
      from public.platform_user_roles pur
      where pur.user_id = target_user_id
        and pur.role = 'SUPER_ADMIN'::public.platform_role
    )
    and exists (
      select 1
      from private.admin_operator_support_sessions support
      where support.admin_user_id = target_user_id
        and support.operator_id = target_operator_id
        and support.ended_at is null
        and support.expires_at > pg_catalog.now()
    );
$$;

revoke execute
on function private.is_active_admin_operator_support(uuid, uuid)
from public, anon;

grant execute
on function private.is_active_admin_operator_support(uuid, uuid)
to authenticated;

-- Preserve the existing authorization API while making temporary support
-- memberships invalid immediately after their session expires.
create or replace function private.is_operator_member(
  target_operator_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.operator_members om
    where om.operator_id = target_operator_id
      and om.user_id = (select auth.uid())
      and om.status = 'ACTIVE'::public.operator_member_status
      and (
        om.support_session_id is null
        or private.is_active_admin_operator_support(
          target_operator_id,
          (select auth.uid())
        )
      )
  );
$$;

create or replace function private.has_operator_role(
  target_operator_id uuid,
  allowed_roles public.operator_member_role[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.operator_members om
    where om.operator_id = target_operator_id
      and om.user_id = (select auth.uid())
      and om.status = 'ACTIVE'::public.operator_member_status
      and om.role = any(allowed_roles)
      and (
        om.support_session_id is null
        or private.is_active_admin_operator_support(
          target_operator_id,
          (select auth.uid())
        )
      )
  );
$$;

revoke execute on function private.is_operator_member(uuid) from public, anon;
revoke execute on function private.has_operator_role(uuid, public.operator_member_role[]) from public, anon;
grant execute on function private.is_operator_member(uuid) to authenticated;
grant execute on function private.has_operator_role(uuid, public.operator_member_role[]) to authenticated;

create or replace function public.admin_start_operator_support(
  p_operator_id uuid
)
returns table (
  session_id uuid,
  operator_id uuid,
  operator_name text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_user_id uuid := auth.uid();
  v_operator public.operators%rowtype;
  v_existing_member public.operator_members%rowtype;
  v_previous private.admin_operator_support_sessions%rowtype;
  v_session_id uuid;
  v_expires_at timestamptz := pg_catalog.now() + interval '2 hours';
  v_created_membership boolean := false;
begin
  if v_admin_user_id is null
     or not private.has_platform_role(
       array['SUPER_ADMIN'::public.platform_role]
     ) then
    raise exception 'platform_super_admin_required';
  end if;

  if p_operator_id is null then
    raise exception 'operator_required';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('boatly-admin-support:' || v_admin_user_id::text, 0)
  );

  select *
  into v_operator
  from public.operators o
  where o.id = p_operator_id
    and o.deleted_at is null
  for update;

  if not found then
    raise exception 'operator_not_found';
  end if;

  if v_operator.status <> 'ACTIVE'::public.operator_status then
    raise exception 'operator_must_be_active';
  end if;

  -- Close any previous support session before opening a new workspace.
  for v_previous in
    select support.*
    from private.admin_operator_support_sessions support
    where support.admin_user_id = v_admin_user_id
      and support.ended_at is null
    for update
  loop
    delete from public.operator_members om
    where om.support_session_id = v_previous.id;

    update private.admin_operator_support_sessions support
    set ended_at = pg_catalog.now(),
        ended_by = v_admin_user_id,
        end_reason = 'SWITCHED_WORKSPACE'
    where support.id = v_previous.id;

    insert into public.audit_logs (
      actor_type,
      actor_user_id,
      operator_id,
      action,
      entity_type,
      entity_id,
      reason,
      metadata
    ) values (
      'PLATFORM'::public.audit_actor_type,
      v_admin_user_id,
      v_previous.operator_id,
      'ADMIN_SUPPORT_ACCESS_ENDED',
      'ADMIN_SUPPORT_SESSION',
      v_previous.id::text,
      'SWITCHED_WORKSPACE',
      pg_catalog.jsonb_build_object('session_id', v_previous.id)
    );
  end loop;

  select *
  into v_existing_member
  from public.operator_members om
  where om.operator_id = p_operator_id
    and om.user_id = v_admin_user_id
  for update;

  if found and (
    v_existing_member.status <> 'ACTIVE'::public.operator_member_status
    or v_existing_member.support_session_id is not null
  ) then
    raise exception 'admin_membership_conflict';
  end if;

  v_created_membership := v_existing_member.operator_id is null;

  insert into private.admin_operator_support_sessions (
    admin_user_id,
    operator_id,
    created_membership,
    expires_at
  ) values (
    v_admin_user_id,
    p_operator_id,
    v_created_membership,
    v_expires_at
  )
  returning id into v_session_id;

  if v_created_membership then
    insert into public.operator_members (
      operator_id,
      user_id,
      role,
      status,
      invited_by,
      joined_at,
      support_session_id
    ) values (
      p_operator_id,
      v_admin_user_id,
      'OWNER'::public.operator_member_role,
      'ACTIVE'::public.operator_member_status,
      v_admin_user_id,
      pg_catalog.now(),
      v_session_id
    );

    update private.admin_operator_support_sessions support
    set created_membership = true
    where support.id = v_session_id;
  end if;

  insert into public.audit_logs (
    actor_type,
    actor_user_id,
    operator_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) values (
    'PLATFORM'::public.audit_actor_type,
    v_admin_user_id,
    p_operator_id,
    'ADMIN_SUPPORT_ACCESS_STARTED',
    'ADMIN_SUPPORT_SESSION',
    v_session_id::text,
    pg_catalog.jsonb_build_object(
      'session_id', v_session_id,
      'expires_at', v_expires_at,
      'temporary_membership_created', v_created_membership
    )
  );

  return query
  select v_session_id, v_operator.id, v_operator.name, v_expires_at;
end;
$$;

create or replace function public.admin_end_operator_support(
  p_operator_id uuid default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_user_id uuid := auth.uid();
  v_session private.admin_operator_support_sessions%rowtype;
begin
  if v_admin_user_id is null
     or not private.has_platform_role(
       array['SUPER_ADMIN'::public.platform_role]
     ) then
    raise exception 'platform_super_admin_required';
  end if;

  select support.*
  into v_session
  from private.admin_operator_support_sessions support
  where support.admin_user_id = v_admin_user_id
    and support.ended_at is null
    and (p_operator_id is null or support.operator_id = p_operator_id)
  order by support.started_at desc
  limit 1
  for update;

  if not found then
    return false;
  end if;

  delete from public.operator_members om
  where om.support_session_id = v_session.id;

  update private.admin_operator_support_sessions support
  set ended_at = pg_catalog.now(),
      ended_by = v_admin_user_id,
      end_reason = 'ADMIN_EXIT'
  where support.id = v_session.id;

  insert into public.audit_logs (
    actor_type,
    actor_user_id,
    operator_id,
    action,
    entity_type,
    entity_id,
    reason,
    metadata
  ) values (
    'PLATFORM'::public.audit_actor_type,
    v_admin_user_id,
    v_session.operator_id,
    'ADMIN_SUPPORT_ACCESS_ENDED',
    'ADMIN_SUPPORT_SESSION',
    v_session.id::text,
    'ADMIN_EXIT',
    pg_catalog.jsonb_build_object('session_id', v_session.id)
  );

  return true;
end;
$$;

create or replace function public.admin_current_operator_support()
returns table (
  session_id uuid,
  operator_id uuid,
  operator_name text,
  expires_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    support.id,
    support.operator_id,
    o.name,
    support.expires_at
  from private.admin_operator_support_sessions support
  join public.operators o on o.id = support.operator_id
  where support.admin_user_id = (select auth.uid())
    and support.ended_at is null
    and support.expires_at > pg_catalog.now()
    and o.deleted_at is null
    and private.has_platform_role(
      array['SUPER_ADMIN'::public.platform_role]
    )
  order by support.started_at desc
  limit 1;
$$;

create or replace function private.purge_expired_admin_operator_support_sessions()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session private.admin_operator_support_sessions%rowtype;
begin
  for v_session in
    select support.*
    from private.admin_operator_support_sessions support
    where support.ended_at is null
      and support.expires_at <= pg_catalog.now()
    for update skip locked
  loop
    delete from public.operator_members om
    where om.support_session_id = v_session.id;

    update private.admin_operator_support_sessions support
    set ended_at = pg_catalog.now(),
        end_reason = 'EXPIRED'
    where support.id = v_session.id;

    insert into public.audit_logs (
      actor_type,
      operator_id,
      action,
      entity_type,
      entity_id,
      reason,
      metadata
    ) values (
      'SYSTEM'::public.audit_actor_type,
      v_session.operator_id,
      'ADMIN_SUPPORT_ACCESS_EXPIRED',
      'ADMIN_SUPPORT_SESSION',
      v_session.id::text,
      'EXPIRED',
      pg_catalog.jsonb_build_object(
        'session_id', v_session.id,
        'admin_user_id', v_session.admin_user_id
      )
    );
  end loop;
end;
$$;

revoke all on function public.admin_start_operator_support(uuid)
from public, anon, authenticated;
revoke all on function public.admin_end_operator_support(uuid)
from public, anon, authenticated;
revoke all on function public.admin_current_operator_support()
from public, anon, authenticated;
revoke all on function private.purge_expired_admin_operator_support_sessions()
from public, anon, authenticated;

grant execute on function public.admin_start_operator_support(uuid)
to authenticated;
grant execute on function public.admin_end_operator_support(uuid)
to authenticated;
grant execute on function public.admin_current_operator_support()
to authenticated;

do $$
begin
  if exists (
    select 1
    from cron.job
    where jobname = 'boatly-purge-expired-admin-support'
  ) then
    perform cron.unschedule('boatly-purge-expired-admin-support');
  end if;

  perform cron.schedule(
    'boatly-purge-expired-admin-support',
    '* * * * *',
    'select private.purge_expired_admin_operator_support_sessions()'
  );
end;
$$;

comment on table private.admin_operator_support_sessions is
  'Audited, time-limited Boatly super-admin access to one operator workspace.';

comment on column public.operator_members.support_session_id is
  'Non-null only for a temporary membership created by an admin support session.';

comment on function public.admin_start_operator_support(uuid) is
  'Starts a two-hour, audited SUPER_ADMIN support session for one active operator.';

comment on function public.admin_end_operator_support(uuid) is
  'Ends the current SUPER_ADMIN support session and removes its temporary membership.';

comment on function public.admin_current_operator_support() is
  'Returns the caller current unexpired SUPER_ADMIN support session, if any.';

commit;
