-- ============================================================
-- BOATLY
-- Migration: Boat Fleet Readiness + Lifecycle
-- ============================================================

begin;


-- ============================================================
-- INTERNAL READINESS PROJECTION
--
-- ACTIVE means:
--   complete and enabled inside the operator fleet.
--
-- It does NOT mean:
--   publicly listed on the Boatly marketplace.
-- ============================================================

create or replace function private.boat_fleet_readiness(
  p_boat_id uuid
)
returns table (
  boat_id uuid,
  boat_status public.boat_status,

  identity_complete boolean,
  descriptions_complete boolean,
  technical_complete boolean,
  legal_offering_complete boolean,
  photos_complete boolean,

  completed_checks integer,
  total_checks integer,
  completion_percent integer,

  ready_for_activation boolean,

  active_legal_offerings integer,
  image_count integer
)
language sql
stable
security definer
set search_path = ''
as $$
  with metrics as (
    select
      b.id as boat_id,
      b.status as boat_status,

      (
        nullif(
          pg_catalog.btrim(b.name),
          ''
        ) is not null

        and b.boat_type_id is not null

        and b.primary_location_id is not null

        and nullif(
          pg_catalog.btrim(
            coalesce(
              b.manufacturer,
              ''
            )
          ),
          ''
        ) is not null

        and nullif(
          pg_catalog.btrim(
            coalesce(
              b.model,
              ''
            )
          ),
          ''
        ) is not null

        and b.manufacture_year is not null
      ) as identity_complete,


      (
        nullif(
          pg_catalog.btrim(
            coalesce(
              b.short_description,
              ''
            )
          ),
          ''
        ) is not null

        and nullif(
          pg_catalog.btrim(
            coalesce(
              b.description,
              ''
            )
          ),
          ''
        ) is not null
      ) as descriptions_complete,


      (
        b.length_cm is not null
        and b.length_cm > 0

        and b.beam_cm is not null
        and b.beam_cm > 0

        and b.technical_passenger_capacity is not null
        and b.technical_passenger_capacity > 0

        and b.operator_passenger_limit is not null
        and b.operator_passenger_limit > 0

        and b.operator_passenger_limit <=
          b.technical_passenger_capacity

        and b.license_required is not null
      ) as technical_complete,


      (
        select count(*)::integer

        from public.boat_legal_offerings blo

        where blo.boat_id =
          b.id

          and blo.is_active =
            true
      ) as active_legal_offerings,


      (
        select count(*)::integer

        from public.boat_images bi

        where bi.boat_id =
          b.id
      ) as image_count

    from public.boats b

    where b.id =
      p_boat_id
  ),


  evaluated as (
    select
      m.*,

      (
        m.active_legal_offerings > 0
      ) as legal_offering_complete,

      (
        m.image_count > 0
      ) as photos_complete

    from metrics m
  ),


  scored as (
    select
      e.*,

      (
        case
          when e.identity_complete
          then 1
          else 0
        end

        +

        case
          when e.descriptions_complete
          then 1
          else 0
        end

        +

        case
          when e.technical_complete
          then 1
          else 0
        end

        +

        case
          when e.legal_offering_complete
          then 1
          else 0
        end

        +

        case
          when e.photos_complete
          then 1
          else 0
        end
      )::integer as completed_checks

    from evaluated e
  )


  select
    s.boat_id,
    s.boat_status,

    s.identity_complete,
    s.descriptions_complete,
    s.technical_complete,
    s.legal_offering_complete,
    s.photos_complete,

    s.completed_checks,

    5::integer
      as total_checks,

    (
      s.completed_checks * 20
    )::integer
      as completion_percent,

    (
      s.completed_checks = 5
    ) as ready_for_activation,

    s.active_legal_offerings,
    s.image_count

  from scored s;
$$;


revoke execute
on function private.boat_fleet_readiness(
  uuid
)
from public, anon, authenticated;


-- ============================================================
-- SAFE OWNER / MEMBER READ PROJECTION
-- ============================================================

create or replace function public.get_boat_fleet_readiness(
  p_operator_id uuid,
  p_boat_id uuid
)
returns table (
  boat_id uuid,
  boat_status public.boat_status,

  identity_complete boolean,
  descriptions_complete boolean,
  technical_complete boolean,
  legal_offering_complete boolean,
  photos_complete boolean,

  completed_checks integer,
  total_checks integer,
  completion_percent integer,

  ready_for_activation boolean,

  active_legal_offerings integer,
  image_count integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
begin

  v_user_id :=
    auth.uid();


  if v_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'authentication_required';
  end if;


  if not (
    private.is_operator_member(
      p_operator_id
    )

    or private.is_platform_user()
  ) then
    raise exception using
      errcode = '42501',
      message = 'boat_readiness_read_not_allowed';
  end if;


  if not exists (
    select 1

    from public.boats b

    where b.id =
        p_boat_id

      and b.operator_id =
        p_operator_id
  ) then
    raise exception using
      errcode = '22023',
      message = 'boat_not_found';
  end if;


  return query

  select
    r.boat_id,
    r.boat_status,

    r.identity_complete,
    r.descriptions_complete,
    r.technical_complete,
    r.legal_offering_complete,
    r.photos_complete,

    r.completed_checks,
    r.total_checks,
    r.completion_percent,

    r.ready_for_activation,

    r.active_legal_offerings,
    r.image_count

  from private.boat_fleet_readiness(
    p_boat_id
  ) r;

end;
$$;


-- ============================================================
-- TRUSTED STATUS CHANGE
-- ============================================================

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
  v_user_id uuid;

  v_operator_status public.operator_status;
  v_current_status public.boat_status;

  v_ready boolean;
begin

  v_user_id :=
    auth.uid();


  if v_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'authentication_required';
  end if;


  if not exists (
    select 1

    from public.operator_members om

    where om.operator_id =
        p_operator_id

      and om.user_id =
        v_user_id

      and om.status =
        'ACTIVE'::public.operator_member_status

      and om.role in (
        'OWNER'::public.operator_member_role,
        'MANAGER'::public.operator_member_role
      )
  ) then
    raise exception using
      errcode = '42501',
      message = 'boat_status_change_not_allowed';
  end if;


  select
    o.status,
    b.status

  into
    v_operator_status,
    v_current_status

  from public.boats b

  join public.operators o
    on o.id =
      b.operator_id

  where b.id =
      p_boat_id

    and b.operator_id =
      p_operator_id

  for update;


  if not found then
    raise exception using
      errcode = '22023',
      message = 'boat_not_found';
  end if;


  if v_operator_status not in (
    'DRAFT'::public.operator_status,
    'PENDING_VERIFICATION'::public.operator_status,
    'ACTIVE'::public.operator_status
  ) then
    raise exception using
      errcode = '22023',
      message = 'operator_not_manageable';
  end if;


  if
    v_current_status =
      'ARCHIVED'::public.boat_status

    and p_status <>
      'ARCHIVED'::public.boat_status
  then
    raise exception using
      errcode = '22023',
      message = 'archived_boat_is_immutable';
  end if;


  if
    v_current_status in (
      'ACTIVE'::public.boat_status,
      'INACTIVE'::public.boat_status
    )

    and p_status =
      'DRAFT'::public.boat_status
  then
    raise exception using
      errcode = '22023',
      message = 'cannot_return_boat_to_draft';
  end if;


  if p_status =
    'ACTIVE'::public.boat_status
  then

    select
      r.ready_for_activation

    into
      v_ready

    from private.boat_fleet_readiness(
      p_boat_id
    ) r;


    if coalesce(
      v_ready,
      false
    ) = false
    then
      raise exception using
        errcode = '22023',
        message = 'boat_not_ready_for_activation';
    end if;

  end if;


  update public.boats
  set
    status =
      p_status

  where id =
      p_boat_id

    and operator_id =
      p_operator_id;


  return
    p_status;

end;
$$;


-- ============================================================
-- DATABASE GUARD:
-- ACTIVE BOATS MUST REMAIN COMPLETE
-- ============================================================

create or replace function private.enforce_boat_readiness_on_boat()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ready boolean;
begin

  if TG_OP = 'UPDATE' then

    if
      OLD.status =
        'ARCHIVED'::public.boat_status

      and NEW.status <>
        'ARCHIVED'::public.boat_status
    then
      raise exception using
        errcode = '22023',
        message = 'archived_boat_is_immutable';
    end if;


    if
      OLD.status in (
        'ACTIVE'::public.boat_status,
        'INACTIVE'::public.boat_status
      )

      and NEW.status =
        'DRAFT'::public.boat_status
    then
      raise exception using
        errcode = '22023',
        message = 'cannot_return_boat_to_draft';
    end if;

  end if;


  if NEW.status =
    'ACTIVE'::public.boat_status
  then

    select
      r.ready_for_activation

    into
      v_ready

    from private.boat_fleet_readiness(
      NEW.id
    ) r;


    if coalesce(
      v_ready,
      false
    ) = false
    then
      raise exception using
        errcode = '22023',
        message = 'active_boat_must_remain_complete';
    end if;

  end if;


  return NEW;

end;
$$;


drop trigger if exists
  boats_enforce_fleet_readiness
on public.boats;


create trigger
  boats_enforce_fleet_readiness

after insert or update
on public.boats

for each row

execute function
  private.enforce_boat_readiness_on_boat();


-- ============================================================
-- CHILD TABLE GUARD
--
-- Prevent removal of the last legal offering / image while
-- the boat is ACTIVE.
-- ============================================================

create or replace function private.enforce_active_boat_readiness_after_child_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_boat_id uuid;

  v_boat_status public.boat_status;

  v_ready boolean;
begin

  if TG_OP = 'DELETE' then

    v_boat_id :=
      OLD.boat_id;

  else

    v_boat_id :=
      NEW.boat_id;

  end if;


  select b.status

  into v_boat_status

  from public.boats b

  where b.id =
    v_boat_id;


  if v_boat_status =
    'ACTIVE'::public.boat_status
  then

    select
      r.ready_for_activation

    into
      v_ready

    from private.boat_fleet_readiness(
      v_boat_id
    ) r;


    if coalesce(
      v_ready,
      false
    ) = false
    then
      raise exception using
        errcode = '22023',
        message = 'active_boat_would_be_incomplete';
    end if;

  end if;


  if TG_OP = 'DELETE' then
    return OLD;
  end if;


  return NEW;

end;
$$;


drop trigger if exists
  boat_legal_offerings_enforce_active_readiness
on public.boat_legal_offerings;


create trigger
  boat_legal_offerings_enforce_active_readiness

after insert or update or delete
on public.boat_legal_offerings

for each row

execute function
  private.enforce_active_boat_readiness_after_child_change();


drop trigger if exists
  boat_images_enforce_active_readiness
on public.boat_images;


create trigger
  boat_images_enforce_active_readiness

after insert or update or delete
on public.boat_images

for each row

execute function
  private.enforce_active_boat_readiness_after_child_change();


-- ============================================================
-- PRIVILEGES
-- ============================================================

revoke execute
on function public.get_boat_fleet_readiness(
  uuid,
  uuid
)
from public, anon;


grant execute
on function public.get_boat_fleet_readiness(
  uuid,
  uuid
)
to authenticated;


revoke execute
on function public.set_boat_fleet_status(
  uuid,
  uuid,
  public.boat_status
)
from public, anon;


grant execute
on function public.set_boat_fleet_status(
  uuid,
  uuid,
  public.boat_status
)
to authenticated;


revoke execute
on function private.enforce_boat_readiness_on_boat()
from public, anon, authenticated;


revoke execute
on function private.enforce_active_boat_readiness_after_child_change()
from public, anon, authenticated;


commit;