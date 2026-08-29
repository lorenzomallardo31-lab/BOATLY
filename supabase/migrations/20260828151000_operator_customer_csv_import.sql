-- ============================================================
-- BOATLY OPS
-- Bounded, auditable customer CSV import. Each row is isolated:
-- invalid rows are reported while valid rows are committed.
-- ============================================================

begin;

create or replace function public.operator_import_customers(
  p_operator_id uuid,
  p_rows jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row jsonb;
  v_index bigint;
  v_created integer := 0;
  v_errors jsonb := '[]'::jsonb;
  v_message text;
  v_error_code text;
  v_birth_date date;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;
  if pg_catalog.jsonb_typeof(p_rows) <> 'array' then
    raise exception using errcode = '22023', message = 'import_rows_must_be_array';
  end if;
  if pg_catalog.jsonb_array_length(p_rows) < 1
     or pg_catalog.jsonb_array_length(p_rows) > 500 then
    raise exception using errcode = '22023', message = 'import_row_limit_exceeded';
  end if;

  for v_row, v_index in
    select item.value, item.ordinality
    from pg_catalog.jsonb_array_elements(p_rows) with ordinality as item(value, ordinality)
  loop
    begin
      if pg_catalog.jsonb_typeof(v_row) <> 'object' then
        raise exception using errcode = '22023', message = 'invalid_import_row';
      end if;
      begin
        v_birth_date := nullif(pg_catalog.btrim(coalesce(v_row ->> 'date_of_birth', '')), '')::date;
      exception when invalid_datetime_format or datetime_field_overflow then
        raise exception using errcode = '22023', message = 'invalid_customer_birth_date';
      end;

      perform public.operator_save_customer(
        p_operator_id,
        null,
        v_row ->> 'display_name',
        v_row ->> 'email',
        v_row ->> 'phone',
        v_row ->> 'country_code',
        v_birth_date,
        v_row ->> 'notes'
      );
      v_created := v_created + 1;
    exception when others then
      get stacked diagnostics v_message = message_text;
      v_error_code := case
        when v_message in (
          'invalid_customer_name', 'customer_contact_required',
          'invalid_customer_email', 'invalid_customer_phone',
          'invalid_customer_country', 'invalid_customer_birth_date',
          'customer_notes_too_long', 'customer_email_already_exists',
          'customer_phone_already_exists', 'customer_identity_conflict'
        ) then v_message
        else 'import_row_failed'
      end;
      v_errors := v_errors || pg_catalog.jsonb_build_array(
        pg_catalog.jsonb_build_object(
          'row', v_index + 1,
          'code', v_error_code
        )
      );
    end;
  end loop;

  insert into public.audit_logs (
    actor_type, actor_user_id, operator_id, action,
    entity_type, entity_id, metadata
  ) values (
    'OPERATOR'::public.audit_actor_type, auth.uid(), p_operator_id,
    'CRM_CUSTOMER_IMPORT_COMPLETED', 'OPERATOR_CUSTOMER_IMPORT',
    pg_catalog.gen_random_uuid()::text,
    pg_catalog.jsonb_build_object(
      'input_rows', pg_catalog.jsonb_array_length(p_rows),
      'created_rows', v_created,
      'error_rows', pg_catalog.jsonb_array_length(v_errors)
    )
  );

  return pg_catalog.jsonb_build_object('created', v_created, 'errors', v_errors);
end;
$$;

revoke all on function public.operator_import_customers(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.operator_import_customers(uuid, jsonb) to authenticated, service_role;

comment on function public.operator_import_customers(uuid, jsonb) is
  'Imports at most 500 normalized CRM rows through operator_save_customer and returns non-PII row errors.';

commit;
