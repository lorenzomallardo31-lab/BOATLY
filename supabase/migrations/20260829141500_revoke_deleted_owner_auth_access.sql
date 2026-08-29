-- When the two-minute deletion window expires, revoke the rejected owner's
-- sessions and future authentication without destroying historical audit FKs.

begin;

create or replace function private.revoke_deleted_operator_owner_access()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_user_id uuid;
begin
  if OLD.deleted_at is not null or NEW.deleted_at is null then
    return NEW;
  end if;

  select om.user_id into v_owner_user_id
  from public.operator_members om
  where om.operator_id = NEW.id
    and om.role = 'OWNER'::public.operator_member_role
  order by om.created_at
  limit 1;

  if v_owner_user_id is null
     or exists (
       select 1
       from public.platform_user_roles pur
       where pur.user_id = v_owner_user_id
     )
     or exists (
       select 1
       from public.operator_members om
       join public.operators o on o.id = om.operator_id
       where om.user_id = v_owner_user_id
         and om.operator_id <> NEW.id
         and om.role = 'OWNER'::public.operator_member_role
         and om.status = 'ACTIVE'::public.operator_member_status
         and o.deleted_at is null
         and o.status <> 'REJECTED'::public.operator_status
     ) then
    return NEW;
  end if;

  delete from auth.sessions s
  where s.user_id = v_owner_user_id;

  update auth.users u
  set banned_until = 'infinity'::timestamptz,
      updated_at = statement_timestamp()
  where u.id = v_owner_user_id;

  return NEW;
end;
$$;

drop trigger if exists operators_revoke_owner_auth_when_deleted on public.operators;
create trigger operators_revoke_owner_auth_when_deleted
after update of deleted_at on public.operators
for each row
execute function private.revoke_deleted_operator_owner_access();

revoke all on function private.revoke_deleted_operator_owner_access()
from public, anon, authenticated;

commit;
