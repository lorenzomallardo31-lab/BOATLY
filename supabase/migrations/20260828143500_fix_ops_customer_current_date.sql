-- PostgreSQL keywords such as CURRENT_DATE cannot be schema-qualified.
-- The source migration is also corrected for clean installations; this
-- incremental migration repairs databases where it was already applied.

begin;

do $migration$
declare
  v_definition text;
begin
  select pg_catalog.pg_get_functiondef(p.oid)
  into v_definition
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'operator_save_customer'
    and pg_catalog.pg_get_function_identity_arguments(p.oid) =
      'p_operator_id uuid, p_customer_id uuid, p_display_name text, p_email text, p_phone text, p_country_code text, p_date_of_birth date, p_notes text';

  if v_definition is null then
    raise exception 'operator_save_customer function not found';
  end if;

  execute pg_catalog.replace(
    v_definition,
    'pg_catalog.current_date',
    'current_date'
  );
end
$migration$;

commit;
