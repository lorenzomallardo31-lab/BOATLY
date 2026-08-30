begin;

-- Collaborators are provisioned by the workspace owner with a username and
-- password. Their internal Supabase Auth email is an implementation detail
-- and is never exposed in Boatly Ops.
create table public.operator_staff_accounts (
  user_id uuid primary key
    references auth.users(id)
    on delete cascade,
  operator_id uuid not null,
  username text not null unique,
  created_by uuid not null
    references auth.users(id)
    on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint operator_staff_accounts_membership_fkey
    foreign key (operator_id, user_id)
    references public.operator_members(operator_id, user_id)
    on delete cascade,
  constraint operator_staff_accounts_username_normalized
    check (
      username = pg_catalog.lower(pg_catalog.btrim(username))
      and username ~ '^[a-z0-9][a-z0-9._-]{2,30}[a-z0-9]$'
    )
);

create index operator_staff_accounts_operator_id_idx
  on public.operator_staff_accounts(operator_id, created_at);

create trigger operator_staff_accounts_set_updated_at
before update on public.operator_staff_accounts
for each row
execute function public.set_updated_at();

alter table public.operator_staff_accounts enable row level security;

create policy operator_staff_accounts_select_self
on public.operator_staff_accounts
for select
to authenticated
using (user_id = (select auth.uid()));

revoke all on table public.operator_staff_accounts from public, anon, authenticated;
grant select on table public.operator_staff_accounts to authenticated;

create or replace function public.operator_register_staff_account(
  p_operator_id uuid,
  p_user_id uuid,
  p_username text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := auth.uid();
  v_username text := pg_catalog.lower(pg_catalog.btrim(coalesce(p_username, '')));
begin
  if v_actor_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;
  if not exists (
    select 1
    from public.operator_members om
    join public.operators o on o.id = om.operator_id
    where om.operator_id = p_operator_id
      and om.user_id = v_actor_id
      and om.role = 'OWNER'::public.operator_member_role
      and om.status = 'ACTIVE'::public.operator_member_status
      and o.status = 'ACTIVE'
      and o.deleted_at is null
  ) then
    raise exception using errcode = '42501', message = 'staff_management_not_allowed';
  end if;
  if v_username !~ '^[a-z0-9][a-z0-9._-]{2,30}[a-z0-9]$' then
    raise exception using errcode = '22023', message = 'invalid_staff_username';
  end if;
  if exists (select 1 from public.operator_staff_accounts osa where osa.username = v_username) then
    raise exception using errcode = '23505', message = 'staff_username_already_exists';
  end if;
  if not exists (select 1 from auth.users au where au.id = p_user_id) then
    raise exception using errcode = '22023', message = 'staff_auth_user_not_found';
  end if;

  insert into public.operator_members (
    operator_id, user_id, role, status, invited_by, joined_at
  ) values (
    p_operator_id,
    p_user_id,
    'EMPLOYEE'::public.operator_member_role,
    'ACTIVE'::public.operator_member_status,
    v_actor_id,
    pg_catalog.now()
  );

  insert into public.operator_staff_accounts (
    user_id, operator_id, username, created_by
  ) values (
    p_user_id, p_operator_id, v_username, v_actor_id
  );

  insert into public.audit_logs (
    actor_type, actor_user_id, operator_id, action,
    entity_type, entity_id, metadata
  ) values (
    'OPERATOR'::public.audit_actor_type,
    v_actor_id,
    p_operator_id,
    'STAFF_ACCOUNT_CREATED',
    'OPERATOR_MEMBER',
    p_user_id::text,
    pg_catalog.jsonb_build_object('username', v_username, 'role', 'EMPLOYEE')
  );
end;
$$;

create or replace function public.operator_staff_roster(p_operator_id uuid)
returns table (
  user_id uuid,
  username text,
  status public.operator_member_status,
  joined_at timestamptz
)
language plpgsql
security definer
set search_path = ''
stable
as $$
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;
  if not exists (
    select 1
    from public.operator_members om
    join public.operators o on o.id = om.operator_id
    where om.operator_id = p_operator_id
      and om.user_id = auth.uid()
      and om.role = 'OWNER'::public.operator_member_role
      and om.status = 'ACTIVE'::public.operator_member_status
      and o.status = 'ACTIVE'
      and o.deleted_at is null
  ) then
    raise exception using errcode = '42501', message = 'staff_roster_not_allowed';
  end if;

  return query
  select osa.user_id, osa.username, om.status, om.joined_at
  from public.operator_staff_accounts osa
  join public.operator_members om
    on om.operator_id = osa.operator_id
   and om.user_id = osa.user_id
  where osa.operator_id = p_operator_id
  order by
    case om.status when 'ACTIVE' then 1 when 'SUSPENDED' then 2 else 3 end,
    osa.username;
end;
$$;

create or replace function public.operator_record_staff_password_reset(
  p_operator_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := auth.uid();
begin
  if v_actor_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;
  if not exists (
    select 1
    from public.operator_members owner_membership
    join public.operators o on o.id = owner_membership.operator_id
    where owner_membership.operator_id = p_operator_id
      and owner_membership.user_id = v_actor_id
      and owner_membership.role = 'OWNER'::public.operator_member_role
      and owner_membership.status = 'ACTIVE'::public.operator_member_status
      and o.status = 'ACTIVE'
      and o.deleted_at is null
  ) or not exists (
    select 1
    from public.operator_staff_accounts osa
    where osa.operator_id = p_operator_id and osa.user_id = p_user_id
  ) then
    raise exception using errcode = '42501', message = 'staff_password_reset_not_allowed';
  end if;

  insert into public.audit_logs (
    actor_type, actor_user_id, operator_id, action,
    entity_type, entity_id, metadata
  ) values (
    'OPERATOR'::public.audit_actor_type,
    v_actor_id,
    p_operator_id,
    'STAFF_PASSWORD_RESET',
    'OPERATOR_MEMBER',
    p_user_id::text,
    '{}'::jsonb
  );
end;
$$;

-- The username/password workflow replaces every pending email invitation.
update public.operator_invitations
set revoked_at = pg_catalog.now()
where accepted_at is null and revoked_at is null;

revoke all on function public.operator_register_staff_account(uuid, uuid, text)
  from public, anon, authenticated;
revoke all on function public.operator_staff_roster(uuid)
  from public, anon, authenticated;
revoke all on function public.operator_record_staff_password_reset(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.operator_register_staff_account(uuid, uuid, text)
  to authenticated, service_role;
grant execute on function public.operator_staff_roster(uuid)
  to authenticated, service_role;
grant execute on function public.operator_record_staff_password_reset(uuid, uuid)
  to authenticated, service_role;

revoke execute on function public.operator_create_invitation(uuid, text, public.operator_member_role, text, timestamptz)
  from authenticated;
revoke execute on function public.operator_revoke_invitation(uuid, uuid, text)
  from authenticated;
revoke execute on function public.operator_invitation_preview(text)
  from authenticated;
revoke execute on function public.operator_accept_invitation(text)
  from authenticated;

comment on table public.operator_staff_accounts is
  'Username identities for owner-provisioned Boatly Ops collaborators. Authentication emails are intentionally internal.';
comment on function public.operator_register_staff_account(uuid, uuid, text) is
  'OWNER-only attachment of a server-created Auth user to the workspace as an EMPLOYEE account.';
comment on function public.operator_staff_roster(uuid) is
  'OWNER-only collaborator roster exposing usernames, never internal Auth emails.';

commit;
