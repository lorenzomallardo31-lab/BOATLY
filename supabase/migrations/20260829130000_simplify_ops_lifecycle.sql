-- ============================================================
-- BOATLY OPS — simplified lifecycle for the commercial pilot
--
-- Operational availability is deliberately independent from
-- marketplace completeness. Deletions are delayed for two minutes,
-- then become irreversible and invisible to the product.
-- ============================================================

begin;

alter table public.operators
  add column if not exists deletion_requested_at timestamptz,
  add column if not exists purge_after timestamptz,
  add column if not exists deleted_at timestamptz;

alter table public.boats
  add column if not exists deletion_requested_at timestamptz,
  add column if not exists purge_after timestamptz,
  add column if not exists deleted_at timestamptz;

alter table public.operators
  add constraint operators_deletion_window_consistency
  check (
    (deletion_requested_at is null and purge_after is null)
    or (deletion_requested_at is not null and purge_after is not null and purge_after >= deletion_requested_at)
    or deleted_at is not null
  ) not valid;

alter table public.boats
  add constraint boats_deletion_window_consistency
  check (
    (deletion_requested_at is null and purge_after is null)
    or (deletion_requested_at is not null and purge_after is not null and purge_after >= deletion_requested_at)
    or deleted_at is not null
  ) not valid;

create index if not exists operators_visible_status_idx
  on public.operators(status, created_at desc)
  where deleted_at is null;

create index if not exists operators_purge_due_idx
  on public.operators(purge_after)
  where purge_after is not null and deleted_at is null;

create index if not exists boats_visible_operator_status_idx
  on public.boats(operator_id, status, name)
  where deleted_at is null;

create index if not exists boats_purge_due_idx
  on public.boats(purge_after)
  where purge_after is not null and deleted_at is null;

-- Exactly one founder account can hold the top-level administration role.
create unique index if not exists platform_single_super_admin_idx
  on public.platform_user_roles(role)
  where role = 'SUPER_ADMIN'::public.platform_role;

-- Fleet readiness still exists for the future marketplace, but it must not
-- block day-to-day use of the management product.
drop trigger if exists boats_enforce_fleet_readiness on public.boats;
drop trigger if exists boat_legal_offerings_enforce_active_readiness on public.boat_legal_offerings;
drop trigger if exists boat_images_enforce_active_readiness on public.boat_images;

create or replace function public.set_boat_fleet_status(
  p_operator_id uuid,
  p_boat_id uuid,
  p_status public.boat_status
)
returns public.boat_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  if p_status not in ('ACTIVE'::public.boat_status, 'INACTIVE'::public.boat_status) then
    raise exception using errcode = '22023', message = 'invalid_operational_boat_status';
  end if;

  if not exists (
    select 1
    from public.operator_members om
    join public.operators o on o.id = om.operator_id
    where om.operator_id = p_operator_id
      and om.user_id = v_user_id
      and om.status = 'ACTIVE'::public.operator_member_status
      and om.role in ('OWNER'::public.operator_member_role, 'MANAGER'::public.operator_member_role)
      and o.status in (
        'DRAFT'::public.operator_status,
        'PENDING_VERIFICATION'::public.operator_status,
        'ACTIVE'::public.operator_status
      )
      and o.deleted_at is null
  ) then
    raise exception using errcode = '42501', message = 'boat_status_change_not_allowed';
  end if;

  update public.boats b
  set status = p_status
  where b.id = p_boat_id
    and b.operator_id = p_operator_id
    and b.deleted_at is null
    and b.deletion_requested_at is null;

  if not found then
    raise exception using errcode = '22023', message = 'boat_not_found';
  end if;

  return p_status;
end;
$$;

create or replace function public.operator_create_operational_boat(
  p_operator_id uuid,
  p_name text,
  p_engine_power_hp numeric,
  p_license_required boolean,
  p_internal_code text default null,
  p_boat_type_id uuid default null,
  p_primary_location_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_name text := nullif(pg_catalog.btrim(coalesce(p_name, '')), '');
  v_internal_code text := nullif(pg_catalog.btrim(coalesce(p_internal_code, '')), '');
  v_boat_id uuid;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  if v_name is null or pg_catalog.length(v_name) > 160 then
    raise exception using errcode = '22023', message = 'invalid_boat_name';
  end if;

  if p_engine_power_hp is null or p_engine_power_hp <= 0 or p_engine_power_hp > 100000 then
    raise exception using errcode = '22023', message = 'invalid_engine_power';
  end if;

  if v_internal_code is not null and pg_catalog.length(v_internal_code) > 80 then
    raise exception using errcode = '22023', message = 'invalid_internal_code';
  end if;

  if not exists (
    select 1
    from public.operator_members om
    join public.operators o on o.id = om.operator_id
    where om.operator_id = p_operator_id
      and om.user_id = v_user_id
      and om.status = 'ACTIVE'::public.operator_member_status
      and om.role in ('OWNER'::public.operator_member_role, 'MANAGER'::public.operator_member_role)
      and o.status in (
        'DRAFT'::public.operator_status,
        'PENDING_VERIFICATION'::public.operator_status,
        'ACTIVE'::public.operator_status
      )
      and o.deleted_at is null
  ) then
    raise exception using errcode = '42501', message = 'boat_create_not_allowed';
  end if;

  if p_boat_type_id is not null and not exists (
    select 1 from public.boat_types bt where bt.id = p_boat_type_id and bt.is_active = true
  ) then
    raise exception using errcode = '22023', message = 'invalid_boat_type';
  end if;

  if p_primary_location_id is not null and not exists (
    select 1
    from public.operator_locations ol
    where ol.id = p_primary_location_id
      and ol.operator_id = p_operator_id
      and ol.is_active = true
  ) then
    raise exception using errcode = '22023', message = 'invalid_location';
  end if;

  insert into public.boats (
    operator_id,
    primary_location_id,
    boat_type_id,
    status,
    internal_code,
    name,
    engine_power_hp,
    license_required
  ) values (
    p_operator_id,
    p_primary_location_id,
    p_boat_type_id,
    'ACTIVE'::public.boat_status,
    v_internal_code,
    v_name,
    p_engine_power_hp,
    p_license_required
  )
  returning id into v_boat_id;

  -- A neutral internal offering makes the boat immediately usable for
  -- direct bookings. It does not publish the boat on the marketplace.
  insert into public.boat_legal_offerings (
    boat_id,
    legal_type,
    skipper_mode,
    self_drive_allowed,
    is_active
  ) values (
    v_boat_id,
    'LOCAZIONE'::public.boat_legal_offering_type,
    'NOT_AVAILABLE'::public.skipper_service_mode,
    true,
    true
  );

  return v_boat_id;
end;
$$;

create or replace function public.operator_schedule_boat_deletion(
  p_operator_id uuid,
  p_boat_id uuid,
  p_confirmation text
)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_boat public.boats%rowtype;
  v_purge_after timestamptz := statement_timestamp() + interval '2 minutes';
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  if not exists (
    select 1
    from public.operator_members om
    join public.operators o on o.id = om.operator_id
    where om.operator_id = p_operator_id
      and om.user_id = v_user_id
      and om.status = 'ACTIVE'::public.operator_member_status
      and om.role in ('OWNER'::public.operator_member_role, 'MANAGER'::public.operator_member_role)
      and o.deleted_at is null
  ) then
    raise exception using errcode = '42501', message = 'boat_delete_not_allowed';
  end if;

  select * into v_boat
  from public.boats b
  where b.id = p_boat_id
    and b.operator_id = p_operator_id
    and b.deleted_at is null
  for update;

  if not found then
    raise exception using errcode = '22023', message = 'boat_not_found';
  end if;

  if pg_catalog.btrim(coalesce(p_confirmation, '')) <> v_boat.name then
    raise exception using errcode = '22023', message = 'boat_delete_confirmation_mismatch';
  end if;

  update public.boats
  set
    status = 'INACTIVE'::public.boat_status,
    deletion_requested_at = statement_timestamp(),
    purge_after = v_purge_after
  where id = p_boat_id;

  update public.boat_occupancies
  set is_active = false,
      released_at = coalesce(released_at, statement_timestamp()),
      release_reason = coalesce(release_reason, 'Barca eliminata dal gestionale')
  where boat_id = p_boat_id
    and booking_id is null
    and is_active = true;

  return v_purge_after;
end;
$$;

create or replace function public.admin_decide_operator(
  p_operator_id uuid,
  p_decision text,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_reason text := nullif(pg_catalog.btrim(coalesce(p_reason, '')), '');
  v_decision text := pg_catalog.upper(pg_catalog.btrim(coalesce(p_decision, '')));
  v_status public.operator_status;
  v_purge_after timestamptz;
begin
  if v_user_id is null or not private.has_platform_role(array['SUPER_ADMIN'::public.platform_role]) then
    raise exception using errcode = '42501', message = 'super_admin_required';
  end if;

  if v_reason is null or pg_catalog.length(v_reason) > 1000 then
    raise exception using errcode = '22023', message = 'operator_decision_reason_required';
  end if;

  if v_decision not in ('CONFIRM', 'REJECT', 'DELETE') then
    raise exception using errcode = '22023', message = 'invalid_operator_decision';
  end if;

  perform 1
  from public.operators o
  where o.id = p_operator_id and o.deleted_at is null
  for update;

  if not found then
    raise exception using errcode = '22023', message = 'operator_not_found';
  end if;

  if v_decision = 'CONFIRM' then
    v_status := 'ACTIVE'::public.operator_status;
    update public.operators
    set status = v_status,
        deletion_requested_at = null,
        purge_after = null
    where id = p_operator_id;
  else
    v_status := 'REJECTED'::public.operator_status;
    v_purge_after := statement_timestamp() + interval '2 minutes';
    update public.operators
    set status = v_status,
        deletion_requested_at = statement_timestamp(),
        purge_after = v_purge_after
    where id = p_operator_id;
  end if;

  insert into public.audit_logs (
    actor_type, actor_user_id, operator_id, action,
    entity_type, entity_id, reason, metadata
  ) values (
    'PLATFORM'::public.audit_actor_type,
    v_user_id,
    p_operator_id,
    case v_decision
      when 'CONFIRM' then 'OPERATOR_CONFIRMED'
      when 'REJECT' then 'OPERATOR_REJECTED'
      else 'OPERATOR_DELETION_SCHEDULED'
    end,
    'OPERATOR',
    p_operator_id::text,
    v_reason,
    pg_catalog.jsonb_build_object(
      'decision', v_decision,
      'purge_after', v_purge_after
    )
  );

  return pg_catalog.jsonb_build_object(
    'operator_id', p_operator_id,
    'status', v_status,
    'purge_after', v_purge_after
  );
end;
$$;

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
  -- Boats without history can be physically removed.
  delete from public.boats b
  where b.deleted_at is null
    and b.purge_after is not null
    and b.purge_after <= statement_timestamp()
    and not exists (select 1 from public.bookings bk where bk.boat_id = b.id);
  get diagnostics v_boats_deleted = row_count;

  -- Historical booking snapshots must remain referentially valid. The
  -- operational row becomes an irreversible, invisible tombstone.
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

revoke all on function public.operator_create_operational_boat(uuid,text,numeric,boolean,text,uuid,uuid) from public, anon;
grant execute on function public.operator_create_operational_boat(uuid,text,numeric,boolean,text,uuid,uuid) to authenticated;

revoke all on function public.operator_schedule_boat_deletion(uuid,uuid,text) from public, anon;
grant execute on function public.operator_schedule_boat_deletion(uuid,uuid,text) to authenticated;

revoke all on function public.admin_decide_operator(uuid,text,text) from public, anon, authenticated;
grant execute on function public.admin_decide_operator(uuid,text,text) to authenticated;

revoke all on function private.purge_due_ops_records() from public, anon, authenticated;

-- Supabase exposes pg_cron on supported projects. The job is idempotent and
-- runs once per minute, so a two-minute grace window never depends on a user
-- revisiting the page.
create extension if not exists pg_cron;

do $$
declare
  v_job_id bigint;
begin
  select jobid into v_job_id from cron.job where jobname = 'boatly_ops_purge_due_records';
  if v_job_id is not null then
    perform cron.unschedule(v_job_id);
  end if;
  perform cron.schedule(
    'boatly_ops_purge_due_records',
    '* * * * *',
    'select private.purge_due_ops_records()'
  );
end;
$$;

commit;
