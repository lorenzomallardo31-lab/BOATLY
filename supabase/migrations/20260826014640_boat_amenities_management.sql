-- ============================================================
-- BOATLY
-- Migration: Boat Amenities Management
-- ============================================================

begin;


-- ============================================================
-- GLOBAL AMENITIES CATALOG
-- ============================================================

insert into public.amenities (
  code,
  name,
  category,
  icon_name,
  is_active,
  sort_order
)

select
  seed.code,
  seed.name,
  seed.category,
  seed.icon_name,
  true,
  seed.sort_order

from (
  values

    -- NAVIGATION
    (
      'GPS_CHARTPLOTTER',
      'GPS / Chartplotter',
      'NAVIGATION',
      'navigation',
      10
    ),

    (
      'DEPTH_SOUNDER',
      'Ecoscandaglio',
      'NAVIGATION',
      'waves',
      20
    ),

    (
      'VHF_RADIO',
      'Radio VHF',
      'NAVIGATION',
      'radio',
      30
    ),

    (
      'AUTOPILOT',
      'Pilota automatico',
      'NAVIGATION',
      'waypoints',
      40
    ),


    -- COMFORT
    (
      'BIMINI',
      'Tendalino / Bimini',
      'COMFORT',
      'umbrella',
      100
    ),

    (
      'DECK_SHOWER',
      'Doccia esterna',
      'COMFORT',
      'shower-head',
      110
    ),

    (
      'SUN_DECK',
      'Prendisole',
      'COMFORT',
      'sun',
      120
    ),

    (
      'SWIM_LADDER',
      'Scaletta da bagno',
      'COMFORT',
      'ladder',
      130
    ),

    (
      'DINING_TABLE',
      'Tavolo',
      'COMFORT',
      'table',
      140
    ),


    -- ENTERTAINMENT
    (
      'BLUETOOTH_AUDIO',
      'Audio Bluetooth',
      'ENTERTAINMENT',
      'bluetooth',
      200
    ),

    (
      'SPEAKERS',
      'Altoparlanti',
      'ENTERTAINMENT',
      'speaker',
      210
    ),


    -- KITCHEN
    (
      'FRIDGE',
      'Frigorifero',
      'KITCHEN',
      'refrigerator',
      300
    ),

    (
      'SINK',
      'Lavello',
      'KITCHEN',
      'utensils',
      310
    ),

    (
      'STOVE',
      'Fornello',
      'KITCHEN',
      'cooking-pot',
      320
    ),


    -- ELECTRICAL
    (
      'USB_CHARGING',
      'Prese USB',
      'ELECTRICAL',
      'usb',
      400
    ),

    (
      'SHORE_POWER',
      'Alimentazione da banchina',
      'ELECTRICAL',
      'plug-zap',
      410
    ),


    -- WATER SPORTS
    (
      'SNORKEL_KIT',
      'Kit snorkeling',
      'WATER_SPORTS',
      'waves',
      500
    ),

    (
      'SUP',
      'Stand Up Paddle',
      'WATER_SPORTS',
      'waves',
      510
    ),

    (
      'WATER_SKIS',
      'Sci nautici',
      'WATER_SPORTS',
      'waves',
      520
    )

) as seed(
  code,
  name,
  category,
  icon_name,
  sort_order
)

where not exists (
  select 1

  from public.amenities a

  where a.code = seed.code
);


-- ============================================================
-- SAFE READ
-- ============================================================

create or replace function public.get_boat_amenities(
  p_operator_id uuid,
  p_boat_id uuid
)
returns table (
  amenity_id uuid,
  notes text
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
      message = 'boat_amenities_read_not_allowed';
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
    ba.amenity_id,
    ba.notes

  from public.boat_amenities ba

  join public.amenities a
    on a.id = ba.amenity_id

  where ba.boat_id =
    p_boat_id

  order by
    a.sort_order asc,
    a.name asc;

end;
$$;


-- ============================================================
-- TRUSTED REPLACE / SAVE
-- ============================================================

create or replace function public.save_boat_amenities(
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

  v_user_id :=
    auth.uid();


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
      message = 'boat_amenities_save_not_allowed';
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
  -- PAYLOAD VALIDATION
  -- ==========================================================

  if
    p_items is null
    or jsonb_typeof(
      p_items
    ) <> 'array'
  then
    raise exception using
      errcode = '22023',
      message = 'invalid_amenities_payload';
  end if;


  if exists (
    select 1

    from jsonb_array_elements(
      p_items
    ) item

    where jsonb_typeof(
      item
    ) <> 'object'
  ) then
    raise exception using
      errcode = '22023',
      message = 'invalid_amenities_payload';
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
      'amenity_id',
      'notes'
    )
  ) then
    raise exception using
      errcode = '22023',
      message = 'unsupported_amenity_field';
  end if;


  if exists (
    select 1

    from jsonb_array_elements(
      p_items
    ) item

    where coalesce(
      item ->> 'amenity_id',
      ''
    ) !~
      '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  ) then
    raise exception using
      errcode = '22023',
      message = 'invalid_amenity_id';
  end if;


  -- No duplicate amenities.

  if exists (
    select 1

    from (
      select
        item ->> 'amenity_id'
          as amenity_id,

        count(*) as occurrences

      from jsonb_array_elements(
        p_items
      ) item

      group by
        item ->> 'amenity_id'

      having count(*) > 1
    ) duplicates
  ) then
    raise exception using
      errcode = '22023',
      message = 'duplicate_amenity';
  end if;


  v_item_count :=
    jsonb_array_length(
      p_items
    );


  -- Every requested amenity must exist and be active.

  select
    count(*)

  into
    v_valid_count

  from jsonb_array_elements(
    p_items
  ) item

  join public.amenities a
    on a.id =
      (
        item
          ->> 'amenity_id'
      )::uuid

  where a.is_active =
    true;


  if v_valid_count <>
    v_item_count
  then
    raise exception using
      errcode = '22023',
      message = 'inactive_or_unknown_amenity';
  end if;


  -- ==========================================================
  -- ATOMIC REPLACEMENT
  -- ==========================================================

  perform
    pg_advisory_xact_lock(
      pg_catalog.hashtext(
        p_boat_id::text
        || ':boat-amenities'
      )
    );


  delete from public.boat_amenities

  where boat_id =
    p_boat_id;


  insert into public.boat_amenities (
    boat_id,
    amenity_id,
    notes
  )

  select
    p_boat_id,

    (
      item
        ->> 'amenity_id'
    )::uuid,

    nullif(
      pg_catalog.btrim(
        coalesce(
          item ->> 'notes',
          ''
        )
      ),
      ''
    )

  from jsonb_array_elements(
    p_items
  ) item;


  get diagnostics
    v_saved_count =
      row_count;


  return
    v_saved_count;

end;
$$;


-- ============================================================
-- PRIVILEGES
-- ============================================================

revoke execute
on function public.get_boat_amenities(
  uuid,
  uuid
)
from public, anon;


grant execute
on function public.get_boat_amenities(
  uuid,
  uuid
)
to authenticated;


revoke execute
on function public.save_boat_amenities(
  uuid,
  uuid,
  jsonb
)
from public, anon;


grant execute
on function public.save_boat_amenities(
  uuid,
  uuid,
  jsonb
)
to authenticated;


-- Association writes go through trusted RPC only.

revoke insert, update, delete
on table public.boat_amenities
from anon, authenticated;


commit;