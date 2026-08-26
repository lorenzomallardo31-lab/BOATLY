-- ============================================================
-- BOATLY
-- Migration: Fleet Extras Management
-- ============================================================

begin;


-- ============================================================
-- SAFE OPERATOR EXTRA CATALOG
-- ============================================================

create or replace function public.get_operator_extras(
  p_operator_id uuid
)
returns table (
  id uuid,
  name text,
  description text,
  pricing_unit public.extra_pricing_unit,
  price_cents integer,
  max_quantity integer,
  is_active boolean,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
begin

  v_user_id := auth.uid();


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
      message = 'operator_extras_read_not_allowed';
  end if;


  return query

  select
    e.id,
    e.name,
    e.description,
    e.pricing_unit,
    e.price_cents,
    e.max_quantity,
    e.is_active,
    e.created_at,
    e.updated_at

  from public.extras e

  where e.operator_id =
    p_operator_id

  order by
    e.is_active desc,
    pg_catalog.lower(e.name) asc,
    e.id asc;

end;
$$;


-- ============================================================
-- CREATE / UPDATE OPERATOR EXTRA
-- ============================================================

create or replace function public.save_operator_extra(
  p_operator_id uuid,
  p_extra_id uuid,
  p_payload jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_operator_status public.operator_status;

  v_name text;
  v_description text;

  v_pricing_unit public.extra_pricing_unit;

  v_price_cents integer;
  v_max_quantity integer;

  v_is_active boolean;

  v_price_text text;
  v_quantity_text text;
  v_boolean_text text;

  v_extra_id uuid;
begin

  -- ==========================================================
  -- AUTH
  -- ==========================================================

  v_user_id := auth.uid();


  if v_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'authentication_required';
  end if;


  -- ==========================================================
  -- PAYLOAD
  -- ==========================================================

  if
    p_payload is null
    or jsonb_typeof(p_payload) <> 'object'
  then
    raise exception using
      errcode = '22023',
      message = 'invalid_payload';
  end if;


  if exists (
    select 1

    from jsonb_object_keys(
      p_payload
    ) payload_key

    where payload_key not in (
      'name',
      'description',
      'pricing_unit',
      'price_cents',
      'max_quantity',
      'is_active'
    )
  ) then
    raise exception using
      errcode = '22023',
      message = 'unsupported_payload_field';
  end if;


  -- ==========================================================
  -- OWNER / MANAGER
  -- ==========================================================

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
      message = 'operator_extra_save_not_allowed';
  end if;


  select o.status
  into v_operator_status

  from public.operators o

  where o.id =
    p_operator_id

  for update;


  if not found then
    raise exception using
      errcode = '22023',
      message = 'operator_not_found';
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


  -- ==========================================================
  -- NAME
  -- ==========================================================

  v_name :=
    nullif(
      pg_catalog.btrim(
        coalesce(
          p_payload ->> 'name',
          ''
        )
      ),
      ''
    );


  if v_name is null then
    raise exception using
      errcode = '22023',
      message = 'invalid_extra_name';
  end if;


  if pg_catalog.length(v_name) > 120 then
    raise exception using
      errcode = '22023',
      message = 'invalid_extra_name';
  end if;


  -- ==========================================================
  -- DESCRIPTION
  -- ==========================================================

  v_description :=
    nullif(
      pg_catalog.btrim(
        coalesce(
          p_payload ->> 'description',
          ''
        )
      ),
      ''
    );


  -- ==========================================================
  -- PRICING UNIT
  -- ==========================================================

  if coalesce(
    p_payload ->> 'pricing_unit',
    ''
  ) not in (
    'FIXED',
    'PER_PERSON',
    'PER_HOUR',
    'PER_DAY',
    'PER_UNIT'
  ) then
    raise exception using
      errcode = '22023',
      message = 'invalid_extra_pricing_unit';
  end if;


  v_pricing_unit :=
    (
      p_payload ->> 'pricing_unit'
    )::public.extra_pricing_unit;


  -- ==========================================================
  -- PRICE
  -- ==========================================================

  v_price_text :=
    coalesce(
      p_payload ->> 'price_cents',
      ''
    );


  if v_price_text !~
    '^[0-9]+$'
  then
    raise exception using
      errcode = '22023',
      message = 'invalid_extra_price';
  end if;


  v_price_cents :=
    v_price_text::integer;


  if v_price_cents < 0 then
    raise exception using
      errcode = '22023',
      message = 'invalid_extra_price';
  end if;


  -- ==========================================================
  -- MAX QUANTITY
  -- ==========================================================

  v_quantity_text :=
    nullif(
      pg_catalog.btrim(
        coalesce(
          p_payload ->> 'max_quantity',
          ''
        )
      ),
      ''
    );


  if v_quantity_text is null then

    v_max_quantity :=
      null;

  else

    if v_quantity_text !~
      '^[0-9]+$'
    then
      raise exception using
        errcode = '22023',
        message = 'invalid_extra_max_quantity';
    end if;


    v_max_quantity :=
      v_quantity_text::integer;


    if v_max_quantity <= 0 then
      raise exception using
        errcode = '22023',
        message = 'invalid_extra_max_quantity';
    end if;

  end if;


  -- ==========================================================
  -- ACTIVE
  -- ==========================================================

  v_boolean_text :=
    p_payload ->> 'is_active';


  if v_boolean_text = 'true' then

    v_is_active := true;

  elsif v_boolean_text = 'false' then

    v_is_active := false;

  else

    raise exception using
      errcode = '22023',
      message = 'invalid_extra_active';
  end if;


  -- ==========================================================
  -- DUPLICATE NAME
  -- ==========================================================

  if exists (
    select 1

    from public.extras e

    where e.operator_id =
        p_operator_id

      and pg_catalog.lower(e.name) =
        pg_catalog.lower(v_name)

      and (
        p_extra_id is null
        or e.id <> p_extra_id
      )
  ) then
    raise exception using
      errcode = '23505',
      message = 'duplicate_extra_name';
  end if;


  -- ==========================================================
  -- CREATE
  -- ==========================================================

  if p_extra_id is null then

    insert into public.extras (
      operator_id,
      name,
      description,
      pricing_unit,
      price_cents,
      max_quantity,
      is_active
    )
    values (
      p_operator_id,
      v_name,
      v_description,
      v_pricing_unit,
      v_price_cents,
      v_max_quantity,
      v_is_active
    )

    returning id
    into v_extra_id;


  -- ==========================================================
  -- UPDATE
  -- ==========================================================

  else

    update public.extras
    set
      name =
        v_name,

      description =
        v_description,

      pricing_unit =
        v_pricing_unit,

      price_cents =
        v_price_cents,

      max_quantity =
        v_max_quantity,

      is_active =
        v_is_active

    where id =
        p_extra_id

      and operator_id =
        p_operator_id

    returning id
    into v_extra_id;


    if v_extra_id is null then
      raise exception using
        errcode = '22023',
        message = 'extra_not_found';
    end if;

  end if;


  return v_extra_id;

end;
$$;


-- ============================================================
-- SAFE BOAT EXTRA PROJECTION
-- ============================================================

create or replace function public.get_boat_extras(
  p_operator_id uuid,
  p_boat_id uuid
)
returns table (
  extra_id uuid,
  price_override_cents integer,
  max_quantity_override integer,
  is_active boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
begin

  v_user_id := auth.uid();


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
      message = 'boat_extras_read_not_allowed';
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
    be.extra_id,
    be.price_override_cents,
    be.max_quantity_override,
    be.is_active

  from public.boat_extras be

  where be.operator_id =
      p_operator_id

    and be.boat_id =
      p_boat_id

  order by
    be.created_at asc,
    be.extra_id asc;

end;
$$;


-- ============================================================
-- ATOMIC BOAT EXTRA REPLACEMENT
-- ============================================================

create or replace function public.save_boat_extras(
  p_operator_id uuid,
  p_boat_id uuid,
  p_items jsonb
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;

  v_operator_status public.operator_status;
  v_boat_status public.boat_status;

  v_item_count integer;
  v_valid_count integer;

  v_saved_count integer;
begin

  -- ==========================================================
  -- AUTH
  -- ==========================================================

  v_user_id := auth.uid();


  if v_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'authentication_required';
  end if;


  -- ==========================================================
  -- OWNER / MANAGER
  -- ==========================================================

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
      message = 'boat_extras_save_not_allowed';
  end if;


  -- ==========================================================
  -- OPERATOR + BOAT
  -- ==========================================================

  select
    o.status,
    b.status

  into
    v_operator_status,
    v_boat_status

  from public.boats b

  join public.operators o
    on o.id = b.operator_id

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


  if v_boat_status =
    'ARCHIVED'::public.boat_status
  then
    raise exception using
      errcode = '22023',
      message = 'boat_archived';
  end if;


  -- ==========================================================
  -- PAYLOAD
  -- ==========================================================

  if
    p_items is null
    or jsonb_typeof(p_items) <> 'array'
  then
    raise exception using
      errcode = '22023',
      message = 'invalid_boat_extras_payload';
  end if;


  if exists (
    select 1

    from jsonb_array_elements(
      p_items
    ) item

    where jsonb_typeof(item) <>
      'object'
  ) then
    raise exception using
      errcode = '22023',
      message = 'invalid_boat_extras_payload';
  end if;


  if exists (
    select 1

    from jsonb_array_elements(
      p_items
    ) item

    cross join lateral
      jsonb_object_keys(
        item
      ) payload_key

    where payload_key not in (
      'extra_id',
      'price_override_cents',
      'max_quantity_override'
    )
  ) then
    raise exception using
      errcode = '22023',
      message = 'unsupported_boat_extra_field';
  end if;


  if exists (
    select 1

    from jsonb_array_elements(
      p_items
    ) item

    where coalesce(
      item ->> 'extra_id',
      ''
    ) !~
      '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  ) then
    raise exception using
      errcode = '22023',
      message = 'invalid_extra_id';
  end if;


  -- No duplicate extras.

  if exists (
    select 1

    from (
      select
        item ->> 'extra_id'
          as extra_id,

        count(*) as occurrences

      from jsonb_array_elements(
        p_items
      ) item

      group by
        item ->> 'extra_id'

      having count(*) > 1
    ) duplicate_items
  ) then
    raise exception using
      errcode = '22023',
      message = 'duplicate_boat_extra';
  end if;


  -- Override validation.

  if exists (
    select 1

    from jsonb_array_elements(
      p_items
    ) item

    where
      (
        nullif(
          item ->> 'price_override_cents',
          ''
        ) is not null

        and (
          item ->> 'price_override_cents'
        ) !~ '^[0-9]+$'
      )

      or
      (
        nullif(
          item ->> 'max_quantity_override',
          ''
        ) is not null

        and (
          item ->> 'max_quantity_override'
        ) !~ '^[1-9][0-9]*$'
      )
  ) then
    raise exception using
      errcode = '22023',
      message = 'invalid_boat_extra_override';
  end if;


  v_item_count :=
    jsonb_array_length(
      p_items
    );


  -- Every extra must belong to this operator and be active.

  select count(*)

  into v_valid_count

  from jsonb_array_elements(
    p_items
  ) item

  join public.extras e
    on e.id =
      (
        item ->> 'extra_id'
      )::uuid

  where e.operator_id =
      p_operator_id

    and e.is_active =
      true;


  if v_valid_count <>
    v_item_count
  then
    raise exception using
      errcode = '22023',
      message = 'inactive_or_unknown_extra';
  end if;


  -- ==========================================================
  -- ATOMIC REPLACEMENT
  -- ==========================================================

  perform pg_advisory_xact_lock(
    pg_catalog.hashtext(
      p_boat_id::text
      || ':boat-extras'
    )
  );


  delete from public.boat_extras

  where operator_id =
      p_operator_id

    and boat_id =
      p_boat_id;


  insert into public.boat_extras (
    boat_id,
    extra_id,
    operator_id,
    price_override_cents,
    max_quantity_override,
    is_active
  )

  select
    p_boat_id,

    (
      item ->> 'extra_id'
    )::uuid,

    p_operator_id,

    case
      when nullif(
        item ->> 'price_override_cents',
        ''
      ) is null
      then null

      else (
        item ->> 'price_override_cents'
      )::integer
    end,

    case
      when nullif(
        item ->> 'max_quantity_override',
        ''
      ) is null
      then null

      else (
        item ->> 'max_quantity_override'
      )::integer
    end,

    true

  from jsonb_array_elements(
    p_items
  ) item;


  get diagnostics
    v_saved_count =
      row_count;


  return v_saved_count;

end;
$$;


-- ============================================================
-- PRIVILEGES
-- ============================================================

revoke execute
on function public.get_operator_extras(
  uuid
)
from public, anon;

grant execute
on function public.get_operator_extras(
  uuid
)
to authenticated;


revoke execute
on function public.save_operator_extra(
  uuid,
  uuid,
  jsonb
)
from public, anon;

grant execute
on function public.save_operator_extra(
  uuid,
  uuid,
  jsonb
)
to authenticated;


revoke execute
on function public.get_boat_extras(
  uuid,
  uuid
)
from public, anon;

grant execute
on function public.get_boat_extras(
  uuid,
  uuid
)
to authenticated;


revoke execute
on function public.save_boat_extras(
  uuid,
  uuid,
  jsonb
)
from public, anon;

grant execute
on function public.save_boat_extras(
  uuid,
  uuid,
  jsonb
)
to authenticated;


-- Trusted mutation surface.

revoke insert, update, delete
on table public.extras
from anon, authenticated;


revoke insert, update, delete
on table public.boat_extras
from anon, authenticated;


commit;