-- ============================================================
-- BOATLY
-- C8 Fleet Management - Final Hardening
-- ============================================================

begin;


-- ============================================================
-- 1. LEGAL OFFERINGS
--
-- Mutations must go through save_boat_legal_offering().
-- ============================================================

revoke insert, update, delete
on table public.boat_legal_offerings
from public, anon, authenticated;


-- ============================================================
-- 2. REASSERT TRUSTED MUTATION SURFACE FOR C8 CHILD TABLES
-- ============================================================

revoke insert, update, delete
on table public.boat_images
from public, anon, authenticated;


revoke insert, update, delete
on table public.boat_amenities
from public, anon, authenticated;


revoke insert, update, delete
on table public.extras
from public, anon, authenticated;


revoke insert, update, delete
on table public.boat_extras
from public, anon, authenticated;


-- ============================================================
-- 3. STORAGE DELETE HARDENING
--
-- A Storage object may only be deleted after its boat_images
-- metadata row has already been removed by the trusted RPC.
--
-- This prevents:
--
-- authenticated client
--      ↓
-- delete Storage object directly
--      ↓
-- boat_images metadata left pointing to a missing object
--
-- Expected trusted workflow:
--
-- delete_boat_image()
--      ↓
-- metadata removed
--      ↓
-- Storage DELETE becomes allowed
-- ============================================================

create or replace function private.can_delete_unregistered_boat_image_storage(
  p_object_name text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    private.can_access_boat_image_storage(
      p_object_name,
      true
    )

    and not exists (
      select 1

      from public.boat_images bi

      where bi.storage_path =
        p_object_name
    );
$$;


revoke execute
on function private.can_delete_unregistered_boat_image_storage(
  text
)
from public, anon;


grant execute
on function private.can_delete_unregistered_boat_image_storage(
  text
)
to authenticated;


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

  and private.can_delete_unregistered_boat_image_storage(
    name
  )
);


commit;