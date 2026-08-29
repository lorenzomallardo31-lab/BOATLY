-- Closing an operator must close its entire operational workspace.

begin;

create or replace function private.deactivate_rejected_operator_fleet()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if NEW.status = 'REJECTED'::public.operator_status
     and OLD.status is distinct from NEW.status then
    update public.boats b
    set status = 'INACTIVE'::public.boat_status
    where b.operator_id = NEW.id
      and b.deleted_at is null
      and b.status = 'ACTIVE'::public.boat_status;

    update public.boat_occupancies bo
    set is_active = false,
        released_at = coalesce(bo.released_at, statement_timestamp()),
        release_reason = coalesce(bo.release_reason, 'Account noleggiatore chiuso')
    where bo.operator_id = NEW.id
      and bo.booking_id is null
      and bo.is_active = true;
  end if;

  return NEW;
end;
$$;

drop trigger if exists operators_deactivate_fleet_when_rejected on public.operators;
create trigger operators_deactivate_fleet_when_rejected
after update of status on public.operators
for each row
execute function private.deactivate_rejected_operator_fleet();

revoke all on function private.deactivate_rejected_operator_fleet()
from public, anon, authenticated;

create or replace function private.purge_due_ops_records()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_boats_deleted integer := 0;
  v_boats_tombstoned integer := 0;
  v_operators_tombstoned integer := 0;
begin
  -- An operator deletion schedules every remaining boat for the same purge.
  update public.boats b
  set status = 'INACTIVE'::public.boat_status,
      deletion_requested_at = coalesce(b.deletion_requested_at, statement_timestamp()),
      purge_after = statement_timestamp()
  where b.deleted_at is null
    and exists (
      select 1
      from public.operators o
      where o.id = b.operator_id
        and o.deleted_at is null
        and o.purge_after is not null
        and o.purge_after <= statement_timestamp()
    );

  -- Boats without booking history can be physically removed.
  delete from public.boats b
  where b.deleted_at is null
    and b.purge_after is not null
    and b.purge_after <= statement_timestamp()
    and not exists (select 1 from public.bookings bk where bk.boat_id = b.id);
  get diagnostics v_boats_deleted = row_count;

  -- Booking history remains referentially valid but disappears from every
  -- operational query through an irreversible tombstone.
  update public.boats b
  set status = 'INACTIVE'::public.boat_status,
      deleted_at = statement_timestamp(),
      purge_after = null,
      name = 'Imbarcazione eliminata',
      internal_code = null,
      slug = null,
      short_description = null,
      description = null
  where b.deleted_at is null
    and b.purge_after is not null
    and b.purge_after <= statement_timestamp();
  get diagnostics v_boats_tombstoned = row_count;

  update public.operator_members om
  set status = 'REMOVED'::public.operator_member_status
  where exists (
    select 1 from public.operators o
    where o.id = om.operator_id
      and o.deleted_at is null
      and o.purge_after is not null
      and o.purge_after <= statement_timestamp()
  );

  update public.operators o
  set deleted_at = statement_timestamp(),
      purge_after = null,
      slug = null,
      name = 'Account eliminato'
  where o.deleted_at is null
    and o.purge_after is not null
    and o.purge_after <= statement_timestamp();
  get diagnostics v_operators_tombstoned = row_count;

  return pg_catalog.jsonb_build_object(
    'boats_deleted', v_boats_deleted,
    'boats_tombstoned', v_boats_tombstoned,
    'operators_tombstoned', v_operators_tombstoned
  );
end;
$$;

revoke all on function private.purge_due_ops_records()
from public, anon, authenticated;

commit;
