-- ============================================================
-- BOATLY
-- Migration: Auth Profile Provisioning
-- ============================================================
--
-- Purpose:
--   Automatically create exactly one public.profiles row
--   whenever Supabase Auth creates a new auth.users row.
--
-- Architecture:
--
--   auth.users
--       ↓
--   on_auth_user_created
--       ↓
--   public.handle_new_user()
--       ↓
--   public.profiles
--
-- Important:
--   - Supabase Auth owns authentication identity.
--   - public.profiles owns Boatly application profile data.
--   - No role/authorization data is trusted from user metadata.
--   - RBAC and RLS authorization remain deferred to C6.
-- ============================================================

begin;


-- ============================================================
-- PROFILE PROVISIONING FUNCTION
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin

  insert into public.profiles (
    id
  )
  values (
    new.id
  );

  return new;

end;
$$;


comment on function public.handle_new_user() is
  'Creates the Boatly public profile corresponding to a newly created Supabase Auth user.';


-- ============================================================
-- AUTH USER TRIGGER
-- ============================================================

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();


commit;