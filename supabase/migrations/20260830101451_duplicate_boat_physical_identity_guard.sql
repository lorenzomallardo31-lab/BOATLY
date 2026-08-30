-- Separate reusable configuration from the identity of one physical unit.
-- The first migration contains the complete copier; it is moved behind a
-- private helper and wrapped so registration and hull identifiers can never
-- leak into the duplicate.

begin;

alter function public.operator_duplicate_boat(uuid, uuid)
  set schema private;

alter function private.operator_duplicate_boat(uuid, uuid)
  rename to duplicate_boat_configuration_copy;

revoke all on function private.duplicate_boat_configuration_copy(uuid, uuid)
from public, anon, authenticated;

create or replace function public.operator_duplicate_boat(
  p_operator_id uuid,
  p_source_boat_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_new_boat_id uuid;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  if not private.has_operator_role(
    p_operator_id,
    array[
      'OWNER'::public.operator_member_role,
      'MANAGER'::public.operator_member_role
    ]
  ) then
    raise exception using errcode = '42501', message = 'boat_duplicate_not_allowed';
  end if;

  v_new_boat_id := private.duplicate_boat_configuration_copy(
    p_operator_id,
    p_source_boat_id
  );

  update public.boats
  set
    registration_number = null,
    registration_country_code = null,
    hull_identification_number = null
  where id = v_new_boat_id
    and operator_id = p_operator_id;

  if not found then
    raise exception using errcode = '22023', message = 'duplicated_boat_not_found';
  end if;

  return v_new_boat_id;
end;
$$;

revoke all on function public.operator_duplicate_boat(uuid, uuid)
from public, anon;

grant execute on function public.operator_duplicate_boat(uuid, uuid)
to authenticated;

comment on function private.duplicate_boat_configuration_copy(uuid, uuid) is
  'Internal boat configuration copier. Call only through public.operator_duplicate_boat.';

comment on function public.operator_duplicate_boat(uuid, uuid) is
  'Duplicates reusable boat configuration while clearing physical registration and hull identifiers.';

commit;
