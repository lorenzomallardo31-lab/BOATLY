-- Keep the commercial pilot intentionally small: two boat states, one owner
-- workspace per account and one administrative decision surface.

begin;

alter table public.boats
  add constraint boats_operational_status_only
  check (status in (
    'ACTIVE'::public.boat_status,
    'INACTIVE'::public.boat_status
  )) not valid;

alter table public.boats
  validate constraint boats_operational_status_only;

alter table public.operators
  add constraint operators_pilot_status_only
  check (status in (
    'DRAFT'::public.operator_status,
    'PENDING_VERIFICATION'::public.operator_status,
    'ACTIVE'::public.operator_status,
    'REJECTED'::public.operator_status
  )) not valid;

alter table public.operators
  validate constraint operators_pilot_status_only;

-- These legacy administrative paths exposed internal states that are no
-- longer part of the product. All operator decisions now go through
-- admin_decide_operator and therefore require the sole SUPER_ADMIN role.
revoke all on function public.admin_set_operator_status(
  uuid,
  public.operator_status,
  text
) from public, anon, authenticated;

revoke all on function public.admin_review_operator_verification(
  uuid,
  public.verification_review_status,
  text
) from public, anon, authenticated;

create or replace function private.prevent_duplicate_or_closed_owner_workspace()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.operator_members om
    join public.operators o on o.id = om.operator_id
    where om.user_id = NEW.created_by
      and om.role = 'OWNER'::public.operator_member_role
      and (
        om.status = 'REMOVED'::public.operator_member_status
        or o.deleted_at is not null
        or o.status = 'REJECTED'::public.operator_status
      )
  ) then
    raise exception using errcode = '42501', message = 'operator_account_closed';
  end if;

  if exists (
    select 1
    from public.operator_members om
    join public.operators o on o.id = om.operator_id
    where om.user_id = NEW.created_by
      and om.role = 'OWNER'::public.operator_member_role
      and om.status = 'ACTIVE'::public.operator_member_status
      and o.deleted_at is null
  ) then
    raise exception using errcode = '23505', message = 'operator_workspace_already_exists';
  end if;

  return NEW;
end;
$$;

drop trigger if exists operators_prevent_duplicate_or_closed_owner on public.operators;
create trigger operators_prevent_duplicate_or_closed_owner
before insert on public.operators
for each row
execute function private.prevent_duplicate_or_closed_owner_workspace();

revoke all on function private.prevent_duplicate_or_closed_owner_workspace()
from public, anon, authenticated;

commit;
