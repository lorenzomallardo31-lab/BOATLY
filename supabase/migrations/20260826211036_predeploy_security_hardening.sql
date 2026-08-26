-- Keep the repository aligned with the pre-deploy ACL hardening already
-- applied to the hosted project.
--
-- PostgreSQL grants EXECUTE on new functions to PUBLIC by default. For the
-- public SECURITY DEFINER surface we replace that implicit grant with the
-- explicit role grants that were effective before this migration. The signup
-- trigger is the exception: it must only be callable by Supabase Auth.

begin;

create temporary table boatly_security_definer_acl_snapshot
on commit drop
as
select
  pg_catalog.format(
    '%I.%I(%s)',
    namespace.nspname,
    procedure.proname,
    pg_catalog.pg_get_function_identity_arguments(procedure.oid)
  ) as function_signature,
  pg_catalog.has_function_privilege('anon', procedure.oid, 'EXECUTE') as anon_can_execute,
  pg_catalog.has_function_privilege('authenticated', procedure.oid, 'EXECUTE') as authenticated_can_execute,
  pg_catalog.has_function_privilege('service_role', procedure.oid, 'EXECUTE') as service_role_can_execute
from pg_catalog.pg_proc as procedure
join pg_catalog.pg_namespace as namespace
  on namespace.oid = procedure.pronamespace
where namespace.nspname = 'public'
  and procedure.prosecdef
  and procedure.proname <> 'handle_new_user';

do $migration$
declare
  target record;
begin
  for target in
    select *
    from boatly_security_definer_acl_snapshot
  loop
    execute pg_catalog.format(
      'revoke execute on function %s from public, anon, authenticated, service_role',
      target.function_signature
    );

    if target.anon_can_execute then
      execute pg_catalog.format(
        'grant execute on function %s to anon',
        target.function_signature
      );
    end if;

    if target.authenticated_can_execute then
      execute pg_catalog.format(
        'grant execute on function %s to authenticated',
        target.function_signature
      );
    end if;

    if target.service_role_can_execute then
      execute pg_catalog.format(
        'grant execute on function %s to service_role',
        target.function_signature
      );
    end if;
  end loop;
end;
$migration$;

revoke execute on function public.handle_new_user()
from public, anon, authenticated, service_role;

grant execute on function public.handle_new_user()
to supabase_auth_admin;

commit;
