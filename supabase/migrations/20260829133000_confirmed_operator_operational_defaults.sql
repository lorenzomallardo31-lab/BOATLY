-- Confirmed operators only, with a ready-to-use calendar for every new boat.

begin;

create or replace function private.enforce_confirmed_operator_for_operational_boat()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if NEW.status = 'ACTIVE'::public.boat_status and not exists (
    select 1
    from public.operators o
    where o.id = NEW.operator_id
      and o.status = 'ACTIVE'::public.operator_status
      and o.deleted_at is null
  ) then
    raise exception using errcode = '42501', message = 'operator_confirmation_required';
  end if;

  return NEW;
end;
$$;

drop trigger if exists boats_require_confirmed_operator on public.boats;
create trigger boats_require_confirmed_operator
before insert or update of status, operator_id on public.boats
for each row
execute function private.enforce_confirmed_operator_for_operational_boat();

create or replace function private.seed_new_boat_calendar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_timezone text;
begin
  if NEW.status <> 'ACTIVE'::public.boat_status then
    return NEW;
  end if;

  select o.timezone into v_timezone
  from public.operators o
  where o.id = NEW.operator_id;

  insert into public.boat_availability_rules (
    operator_id,
    boat_id,
    weekday,
    available_from,
    available_to,
    timezone,
    is_active
  )
  select
    NEW.operator_id,
    NEW.id,
    day_number::smallint,
    time '00:00:00',
    time '23:59:59.999999',
    coalesce(v_timezone, 'Europe/Rome'),
    true
  from pg_catalog.generate_series(1, 7) as day_number
  on conflict do nothing;

  return NEW;
end;
$$;

drop trigger if exists boats_seed_new_calendar on public.boats;
create trigger boats_seed_new_calendar
after insert on public.boats
for each row
execute function private.seed_new_boat_calendar();

revoke all on function private.enforce_confirmed_operator_for_operational_boat() from public, anon, authenticated;
revoke all on function private.seed_new_boat_calendar() from public, anon, authenticated;

commit;
