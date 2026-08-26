-- ============================================================
-- BOATLY
-- Migration: Boat Image Management
-- ============================================================

begin;


-- ============================================================
-- STORAGE BUCKET
-- ============================================================

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'boat-images',
  'boat-images',
  false,
  10485760,
  array[
    'image/jpeg',
    'image/png',
    'image/webp'
  ]::text[]
)

on conflict (id)
do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;


-- ============================================================
-- BOAT IMAGE INDEXES
-- ============================================================

create unique index if not exists
  boat_images_storage_path_unique_idx

on public.boat_images (
  storage_path
);


create unique index if not exists
  boat_images_one_cover_per_boat_idx

on public.boat_images (
  boat_id
)

where is_cover = true;


-- ============================================================
-- STORAGE ACCESS HELPER
--
-- Expected path:
--
-- operator_uuid / boat_uuid / random_uuid.ext
-- ============================================================

create or replace function private.can_access_boat_image_storage(
  p_object_name text,
  p_require_manage boolean default false
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;

  v_parts text[];

  v_operator_id uuid;
  v_boat_id uuid;
begin

  v_user_id :=
    auth.uid();


  if v_user_id is null then
    return false;
  end if;


  if
    p_object_name is null
    or pg_catalog.btrim(p_object_name) = ''
  then
    return false;
  end if;


  v_parts :=
    pg_catalog.string_to_array(
      p_object_name,
      '/'
    );


  if
    pg_catalog.array_length(
      v_parts,
      1
    ) <> 3
  then
    return false;
  end if;


  if v_parts[1] !~
    '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  then
    return false;
  end if;


  if v_parts[2] !~
    '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  then
    return false;
  end if;


  if v_parts[3] !~
    '^[0-9a-fA-F-]+\.(jpg|jpeg|png|webp)$'
  then
    return false;
  end if;


  v_operator_id :=
    v_parts[1]::uuid;


  v_boat_id :=
    v_parts[2]::uuid;


  if not exists (
    select 1

    from public.boats b

    where b.id =
        v_boat_id

      and b.operator_id =
        v_operator_id
  ) then
    return false;
  end if;


  if p_require_manage then

    return exists (
      select 1

      from public.operator_members om

      join public.operators o
        on o.id = om.operator_id

      join public.boats b
        on b.operator_id = o.id

      where om.operator_id =
          v_operator_id

        and om.user_id =
          v_user_id

        and om.status =
          'ACTIVE'::public.operator_member_status

        and om.role in (
          'OWNER'::public.operator_member_role,
          'MANAGER'::public.operator_member_role
        )

        and o.status in (
          'DRAFT'::public.operator_status,
          'PENDING_VERIFICATION'::public.operator_status,
          'ACTIVE'::public.operator_status
        )

        and b.id =
          v_boat_id

        and b.status <>
          'ARCHIVED'::public.boat_status
    );

  end if;


  return (
    private.is_operator_member(
      v_operator_id
    )

    or private.is_platform_user()
  );

end;
$$;


revoke execute
on function private.can_access_boat_image_storage(
  text,
  boolean
)
from public, anon;


grant execute
on function private.can_access_boat_image_storage(
  text,
  boolean
)
to authenticated;


-- ============================================================
-- STORAGE POLICIES
-- ============================================================

drop policy if exists
  boat_images_storage_select
on storage.objects;


create policy
  boat_images_storage_select

on storage.objects

for select

to authenticated

using (
  bucket_id = 'boat-images'

  and private.can_access_boat_image_storage(
    name,
    false
  )
);


drop policy if exists
  boat_images_storage_insert
on storage.objects;


create policy
  boat_images_storage_insert

on storage.objects

for insert

to authenticated

with check (
  bucket_id = 'boat-images'

  and private.can_access_boat_image_storage(
    name,
    true
  )
);


drop policy if exists
  boat_images_storage_delete
on storage.objects;


create policy
  boat_images_storage_delete

on storage.objects

for delete

to authenticated

using (
  bucket_id = 'boat-images'

  and private.can_access_boat_image_storage(
    name,
    true
  )
);


-- ============================================================
-- SAFE IMAGE LIST
-- ============================================================

create or replace function public.get_boat_images(
  p_operator_id uuid,
  p_boat_id uuid
)
returns table (
  id uuid,
  storage_path text,
  alt_text text,
  sort_order integer,
  is_cover boolean,
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
      message = 'boat_images_read_not_allowed';
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
    bi.id,
    bi.storage_path,
    bi.alt_text,
    bi.sort_order,
    bi.is_cover,
    bi.created_at,
    bi.updated_at

  from public.boat_images bi

  where bi.boat_id =
    p_boat_id

  order by
    bi.sort_order asc,
    bi.created_at asc,
    bi.id asc;

end;
$$;


-- ============================================================
-- REGISTER UPLOADED IMAGE
-- ============================================================

create or replace function public.register_boat_image_upload(
  p_operator_id uuid,
  p_boat_id uuid,
  p_storage_path text,
  p_alt_text text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;

  v_operator_status public.operator_status;
  v_boat_status public.boat_status;

  v_alt_text text;

  v_sort_order integer;
  v_is_cover boolean;

  v_image_id uuid;
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
      message = 'boat_image_upload_not_allowed';
  end if;


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


  if
    p_storage_path is null
    or pg_catalog.array_length(
      pg_catalog.string_to_array(
        p_storage_path,
        '/'
      ),
      1
    ) <> 3
    or p_storage_path not like
      p_operator_id::text
      || '/'
      || p_boat_id::text
      || '/%'
  then
    raise exception using
      errcode = '22023',
      message = 'invalid_storage_path';
  end if;


  if p_storage_path !~
    '/[0-9a-fA-F-]+\.(jpg|jpeg|png|webp)$'
  then
    raise exception using
      errcode = '22023',
      message = 'invalid_storage_path';
  end if;


  if not exists (
    select 1

    from storage.objects so

    where so.bucket_id =
        'boat-images'

      and so.name =
        p_storage_path
  ) then
    raise exception using
      errcode = '22023',
      message = 'storage_object_not_found';
  end if;


  v_alt_text :=
    nullif(
      pg_catalog.btrim(
        coalesce(
          p_alt_text,
          ''
        )
      ),
      ''
    );


  perform
    pg_advisory_xact_lock(
      pg_catalog.hashtext(
        p_boat_id::text
        || ':boat-images'
      )
    );


  select
    coalesce(
      max(bi.sort_order),
      -1
    ) + 1

  into
    v_sort_order

  from public.boat_images bi

  where bi.boat_id =
    p_boat_id;


  v_is_cover :=
    not exists (
      select 1

      from public.boat_images bi

      where bi.boat_id =
        p_boat_id
    );


  insert into public.boat_images (
    boat_id,
    storage_path,
    alt_text,
    sort_order,
    is_cover
  )
  values (
    p_boat_id,
    p_storage_path,
    v_alt_text,
    v_sort_order,
    v_is_cover
  )

  returning id
  into v_image_id;


  return
    v_image_id;

end;
$$;


-- ============================================================
-- SET COVER
-- ============================================================

create or replace function public.set_boat_cover_image(
  p_operator_id uuid,
  p_boat_id uuid,
  p_image_id uuid
)
returns void
language plpgsql
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


  if not exists (
    select 1

    from public.operator_members om

    join public.operators o
      on o.id = om.operator_id

    join public.boats b
      on b.operator_id = o.id

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

      and o.status in (
        'DRAFT'::public.operator_status,
        'PENDING_VERIFICATION'::public.operator_status,
        'ACTIVE'::public.operator_status
      )

      and b.id =
        p_boat_id

      and b.status <>
        'ARCHIVED'::public.boat_status
  ) then
    raise exception using
      errcode = '42501',
      message = 'boat_image_manage_not_allowed';
  end if;


  if not exists (
    select 1

    from public.boat_images bi

    where bi.id =
        p_image_id

      and bi.boat_id =
        p_boat_id
  ) then
    raise exception using
      errcode = '22023',
      message = 'boat_image_not_found';
  end if;


  update public.boat_images
  set
    is_cover = false

  where boat_id =
    p_boat_id

    and is_cover = true;


  update public.boat_images
  set
    is_cover = true

  where id =
      p_image_id

    and boat_id =
      p_boat_id;

end;
$$;


-- ============================================================
-- MOVE IMAGE
-- ============================================================

create or replace function public.move_boat_image(
  p_operator_id uuid,
  p_boat_id uuid,
  p_image_id uuid,
  p_direction text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;

  v_current_order integer;

  v_neighbor_id uuid;
  v_neighbor_order integer;
begin

  v_user_id :=
    auth.uid();


  if v_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'authentication_required';
  end if;


  if p_direction not in (
    'UP',
    'DOWN'
  ) then
    raise exception using
      errcode = '22023',
      message = 'invalid_direction';
  end if;


  if not exists (
    select 1

    from public.operator_members om

    join public.operators o
      on o.id = om.operator_id

    join public.boats b
      on b.operator_id = o.id

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

      and o.status in (
        'DRAFT'::public.operator_status,
        'PENDING_VERIFICATION'::public.operator_status,
        'ACTIVE'::public.operator_status
      )

      and b.id =
        p_boat_id

      and b.status <>
        'ARCHIVED'::public.boat_status
  ) then
    raise exception using
      errcode = '42501',
      message = 'boat_image_manage_not_allowed';
  end if;


  perform
    pg_advisory_xact_lock(
      pg_catalog.hashtext(
        p_boat_id::text
        || ':boat-images'
      )
    );


  select
    bi.sort_order

  into
    v_current_order

  from public.boat_images bi

  where bi.id =
      p_image_id

    and bi.boat_id =
      p_boat_id

  for update;


  if not found then
    raise exception using
      errcode = '22023',
      message = 'boat_image_not_found';
  end if;


  if p_direction = 'UP' then

    select
      bi.id,
      bi.sort_order

    into
      v_neighbor_id,
      v_neighbor_order

    from public.boat_images bi

    where bi.boat_id =
        p_boat_id

      and bi.sort_order <
        v_current_order

    order by
      bi.sort_order desc,
      bi.id desc

    limit 1

    for update;

  else

    select
      bi.id,
      bi.sort_order

    into
      v_neighbor_id,
      v_neighbor_order

    from public.boat_images bi

    where bi.boat_id =
        p_boat_id

      and bi.sort_order >
        v_current_order

    order by
      bi.sort_order asc,
      bi.id asc

    limit 1

    for update;

  end if;


  if v_neighbor_id is null then
    return;
  end if;


  update public.boat_images
  set
    sort_order =
      v_neighbor_order

  where id =
    p_image_id;


  update public.boat_images
  set
    sort_order =
      v_current_order

  where id =
    v_neighbor_id;

end;
$$;


-- ============================================================
-- DELETE METADATA
-- ============================================================

create or replace function public.delete_boat_image(
  p_operator_id uuid,
  p_boat_id uuid,
  p_image_id uuid
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;

  v_storage_path text;
  v_was_cover boolean;
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

    join public.operators o
      on o.id = om.operator_id

    join public.boats b
      on b.operator_id = o.id

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

      and o.status in (
        'DRAFT'::public.operator_status,
        'PENDING_VERIFICATION'::public.operator_status,
        'ACTIVE'::public.operator_status
      )

      and b.id =
        p_boat_id

      and b.status <>
        'ARCHIVED'::public.boat_status
  ) then
    raise exception using
      errcode = '42501',
      message = 'boat_image_manage_not_allowed';
  end if;


  perform
    pg_advisory_xact_lock(
      pg_catalog.hashtext(
        p_boat_id::text
        || ':boat-images'
      )
    );


  select
    bi.storage_path,
    bi.is_cover

  into
    v_storage_path,
    v_was_cover

  from public.boat_images bi

  where bi.id =
      p_image_id

    and bi.boat_id =
      p_boat_id

  for update;


  if not found then
    raise exception using
      errcode = '22023',
      message = 'boat_image_not_found';
  end if;


  delete from public.boat_images

  where id =
    p_image_id

    and boat_id =
      p_boat_id;


  if v_was_cover then

    update public.boat_images
    set
      is_cover = true

    where id = (
      select bi.id

      from public.boat_images bi

      where bi.boat_id =
        p_boat_id

      order by
        bi.sort_order asc,
        bi.created_at asc,
        bi.id asc

      limit 1
    );

  end if;


  return
    v_storage_path;

end;
$$;


-- ============================================================
-- RPC PRIVILEGES
-- ============================================================

revoke execute
on function public.get_boat_images(
  uuid,
  uuid
)
from public, anon;

grant execute
on function public.get_boat_images(
  uuid,
  uuid
)
to authenticated;


revoke execute
on function public.register_boat_image_upload(
  uuid,
  uuid,
  text,
  text
)
from public, anon;

grant execute
on function public.register_boat_image_upload(
  uuid,
  uuid,
  text,
  text
)
to authenticated;


revoke execute
on function public.set_boat_cover_image(
  uuid,
  uuid,
  uuid
)
from public, anon;

grant execute
on function public.set_boat_cover_image(
  uuid,
  uuid,
  uuid
)
to authenticated;


revoke execute
on function public.move_boat_image(
  uuid,
  uuid,
  uuid,
  text
)
from public, anon;

grant execute
on function public.move_boat_image(
  uuid,
  uuid,
  uuid,
  text
)
to authenticated;


revoke execute
on function public.delete_boat_image(
  uuid,
  uuid,
  uuid
)
from public, anon;

grant execute
on function public.delete_boat_image(
  uuid,
  uuid,
  uuid
)
to authenticated;


-- Raw mutations remain behind trusted workflows.

revoke insert, update, delete
on table public.boat_images
from anon, authenticated;


commit;