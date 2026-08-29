-- ============================================================
-- BOATLY OPS
-- Trusted platform controls for operator lifecycle and profile
-- correction. Every mutation is authenticated, role-checked and
-- appended to audit_logs.
-- ============================================================

begin;

create or replace function public.admin_set_operator_status(
  p_operator_id uuid,
  p_status public.operator_status,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_operator public.operators%rowtype;
  v_reason text := nullif(pg_catalog.btrim(coalesce(p_reason, '')), '');
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  if not private.has_platform_role(array[
    'SUPER_ADMIN'::public.platform_role,
    'ADMIN'::public.platform_role
  ]) then
    raise exception using errcode = '42501', message = 'operator_status_change_not_allowed';
  end if;

  if v_reason is null or pg_catalog.length(v_reason) > 1000 then
    raise exception using errcode = '22023', message = 'operator_status_reason_required';
  end if;

  select * into v_operator
  from public.operators o
  where o.id = p_operator_id
  for update;

  if not found then
    raise exception using errcode = '22023', message = 'operator_not_found';
  end if;

  if v_operator.status = p_status then
    raise exception using errcode = '22023', message = 'operator_status_unchanged';
  end if;

  update public.operators
  set status = p_status
  where id = p_operator_id;

  insert into public.audit_logs (
    actor_type,
    actor_user_id,
    operator_id,
    action,
    entity_type,
    entity_id,
    reason,
    metadata
  ) values (
    'PLATFORM'::public.audit_actor_type,
    v_user_id,
    p_operator_id,
    'OPERATOR_STATUS_CHANGED',
    'OPERATOR',
    p_operator_id::text,
    v_reason,
    pg_catalog.jsonb_build_object(
      'from_status', v_operator.status::text,
      'to_status', p_status::text,
      'manual_override', true
    )
  );

  return pg_catalog.jsonb_build_object(
    'operator_id', p_operator_id,
    'from_status', v_operator.status,
    'to_status', p_status
  );
end;
$$;


create or replace function public.admin_update_operator_workspace(
  p_operator_id uuid,
  p_name text,
  p_country_code text,
  p_currency text,
  p_timezone text,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_operator public.operators%rowtype;
  v_name text := nullif(pg_catalog.btrim(coalesce(p_name, '')), '');
  v_country_code text := pg_catalog.upper(nullif(pg_catalog.btrim(coalesce(p_country_code, '')), ''));
  v_currency text := pg_catalog.upper(nullif(pg_catalog.btrim(coalesce(p_currency, '')), ''));
  v_timezone text := nullif(pg_catalog.btrim(coalesce(p_timezone, '')), '');
  v_reason text := nullif(pg_catalog.btrim(coalesce(p_reason, '')), '');
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  if not private.has_platform_role(array[
    'SUPER_ADMIN'::public.platform_role,
    'ADMIN'::public.platform_role
  ]) then
    raise exception using errcode = '42501', message = 'operator_update_not_allowed';
  end if;

  if v_reason is null or pg_catalog.length(v_reason) > 1000 then
    raise exception using errcode = '22023', message = 'operator_update_reason_required';
  end if;

  if v_name is null or pg_catalog.length(v_name) > 160 then
    raise exception using errcode = '22023', message = 'invalid_operator_name';
  end if;

  if v_country_code is null or pg_catalog.length(v_country_code) <> 2 then
    raise exception using errcode = '22023', message = 'invalid_operator_country';
  end if;

  if v_currency is null or pg_catalog.length(v_currency) <> 3 then
    raise exception using errcode = '22023', message = 'invalid_operator_currency';
  end if;

  if v_timezone is null or not exists (
    select 1 from pg_catalog.pg_timezone_names where name = v_timezone
  ) then
    raise exception using errcode = '22023', message = 'invalid_operator_timezone';
  end if;

  select * into v_operator
  from public.operators o
  where o.id = p_operator_id
  for update;

  if not found then
    raise exception using errcode = '22023', message = 'operator_not_found';
  end if;

  update public.operators
  set
    name = v_name,
    country_code = v_country_code,
    currency = v_currency,
    timezone = v_timezone
  where id = p_operator_id;

  insert into public.audit_logs (
    actor_type, actor_user_id, operator_id, action,
    entity_type, entity_id, reason, metadata
  ) values (
    'PLATFORM'::public.audit_actor_type,
    v_user_id,
    p_operator_id,
    'OPERATOR_PROFILE_CORRECTED',
    'OPERATOR',
    p_operator_id::text,
    v_reason,
    pg_catalog.jsonb_build_object(
      'before', pg_catalog.jsonb_build_object(
        'name', v_operator.name,
        'country_code', v_operator.country_code,
        'currency', v_operator.currency,
        'timezone', v_operator.timezone
      ),
      'after', pg_catalog.jsonb_build_object(
        'name', v_name,
        'country_code', v_country_code,
        'currency', v_currency,
        'timezone', v_timezone
      )
    )
  );

  return pg_catalog.jsonb_build_object('operator_id', p_operator_id, 'updated', true);
end;
$$;


create or replace function public.admin_update_operator_legal_profile(
  p_operator_id uuid,
  p_profile jsonb,
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
  v_legal_name text;
  v_legal_form text;
  v_vat_number text;
  v_tax_code text;
  v_pec_email text;
  v_registered_country_code text;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  if not private.has_platform_role(array[
    'SUPER_ADMIN'::public.platform_role,
    'ADMIN'::public.platform_role
  ]) then
    raise exception using errcode = '42501', message = 'legal_profile_update_not_allowed';
  end if;

  if not exists (select 1 from public.operators where id = p_operator_id) then
    raise exception using errcode = '22023', message = 'operator_not_found';
  end if;

  if v_reason is null or pg_catalog.length(v_reason) > 1000 then
    raise exception using errcode = '22023', message = 'operator_update_reason_required';
  end if;

  if p_profile is null or pg_catalog.jsonb_typeof(p_profile) <> 'object' then
    raise exception using errcode = '22023', message = 'invalid_legal_profile_payload';
  end if;

  if exists (
    select 1 from pg_catalog.jsonb_object_keys(p_profile) as key_name
    where key_name not in (
      'legal_name', 'legal_form', 'vat_number', 'tax_code',
      'business_register_number', 'rea_number', 'pec_email', 'sdi_code',
      'registered_address_line_1', 'registered_address_line_2',
      'registered_city', 'registered_administrative_area',
      'registered_postal_code', 'registered_country_code',
      'legal_representative_first_name', 'legal_representative_last_name'
    )
  ) then
    raise exception using errcode = '22023', message = 'unknown_legal_profile_field';
  end if;

  v_legal_name := nullif(pg_catalog.btrim(p_profile ->> 'legal_name'), '');
  v_legal_form := nullif(pg_catalog.btrim(p_profile ->> 'legal_form'), '');
  v_vat_number := pg_catalog.upper(nullif(pg_catalog.btrim(p_profile ->> 'vat_number'), ''));
  v_tax_code := pg_catalog.upper(nullif(pg_catalog.btrim(p_profile ->> 'tax_code'), ''));
  v_pec_email := pg_catalog.lower(nullif(pg_catalog.btrim(p_profile ->> 'pec_email'), ''));
  v_registered_country_code := pg_catalog.upper(coalesce(
    nullif(pg_catalog.btrim(p_profile ->> 'registered_country_code'), ''),
    'IT'
  ));

  if v_legal_name is not null and pg_catalog.length(v_legal_name) > 200 then
    raise exception using errcode = '22023', message = 'invalid_legal_name';
  end if;
  if v_legal_form is not null and pg_catalog.length(v_legal_form) > 100 then
    raise exception using errcode = '22023', message = 'invalid_legal_form';
  end if;
  if v_vat_number is not null and pg_catalog.length(v_vat_number) > 32 then
    raise exception using errcode = '22023', message = 'invalid_vat_number';
  end if;
  if v_tax_code is not null and pg_catalog.length(v_tax_code) > 32 then
    raise exception using errcode = '22023', message = 'invalid_tax_code';
  end if;
  if v_pec_email is not null and v_pec_email !~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$' then
    raise exception using errcode = '22023', message = 'invalid_pec_email';
  end if;
  if pg_catalog.length(v_registered_country_code) <> 2 then
    raise exception using errcode = '22023', message = 'invalid_registered_country';
  end if;

  insert into public.operator_legal_profiles (
    operator_id, legal_name, legal_form, vat_number, tax_code,
    business_register_number, rea_number, pec_email, sdi_code,
    registered_address_line_1, registered_address_line_2,
    registered_city, registered_administrative_area,
    registered_postal_code, registered_country_code,
    legal_representative_first_name, legal_representative_last_name
  ) values (
    p_operator_id,
    v_legal_name,
    v_legal_form,
    v_vat_number,
    v_tax_code,
    nullif(pg_catalog.btrim(p_profile ->> 'business_register_number'), ''),
    pg_catalog.upper(nullif(pg_catalog.btrim(p_profile ->> 'rea_number'), '')),
    v_pec_email,
    pg_catalog.upper(nullif(pg_catalog.btrim(p_profile ->> 'sdi_code'), '')),
    nullif(pg_catalog.btrim(p_profile ->> 'registered_address_line_1'), ''),
    nullif(pg_catalog.btrim(p_profile ->> 'registered_address_line_2'), ''),
    nullif(pg_catalog.btrim(p_profile ->> 'registered_city'), ''),
    pg_catalog.upper(nullif(pg_catalog.btrim(p_profile ->> 'registered_administrative_area'), '')),
    nullif(pg_catalog.btrim(p_profile ->> 'registered_postal_code'), ''),
    v_registered_country_code,
    nullif(pg_catalog.btrim(p_profile ->> 'legal_representative_first_name'), ''),
    nullif(pg_catalog.btrim(p_profile ->> 'legal_representative_last_name'), '')
  )
  on conflict (operator_id) do update set
    legal_name = excluded.legal_name,
    legal_form = excluded.legal_form,
    vat_number = excluded.vat_number,
    tax_code = excluded.tax_code,
    business_register_number = excluded.business_register_number,
    rea_number = excluded.rea_number,
    pec_email = excluded.pec_email,
    sdi_code = excluded.sdi_code,
    registered_address_line_1 = excluded.registered_address_line_1,
    registered_address_line_2 = excluded.registered_address_line_2,
    registered_city = excluded.registered_city,
    registered_administrative_area = excluded.registered_administrative_area,
    registered_postal_code = excluded.registered_postal_code,
    registered_country_code = excluded.registered_country_code,
    legal_representative_first_name = excluded.legal_representative_first_name,
    legal_representative_last_name = excluded.legal_representative_last_name;

  insert into public.audit_logs (
    actor_type, actor_user_id, operator_id, action,
    entity_type, entity_id, reason, metadata
  ) values (
    'PLATFORM'::public.audit_actor_type,
    v_user_id,
    p_operator_id,
    'OPERATOR_LEGAL_PROFILE_CORRECTED',
    'OPERATOR_LEGAL_PROFILE',
    p_operator_id::text,
    v_reason,
    pg_catalog.jsonb_build_object(
      'changed_fields', (
        select pg_catalog.jsonb_agg(field_name)
        from pg_catalog.jsonb_object_keys(p_profile) as fields(field_name)
      ),
      'sensitive_values_omitted', true
    )
  );

  return pg_catalog.jsonb_build_object('operator_id', p_operator_id, 'updated', true);
end;
$$;


create or replace function public.admin_update_operator_location(
  p_operator_id uuid,
  p_location_id uuid,
  p_location jsonb,
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
  v_name text;
  v_country_code text;
  v_timezone text;
  v_email text;
  v_is_primary boolean;
  v_is_public boolean;
  v_is_active boolean;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  if not private.has_platform_role(array[
    'SUPER_ADMIN'::public.platform_role,
    'ADMIN'::public.platform_role
  ]) then
    raise exception using errcode = '42501', message = 'location_update_not_allowed';
  end if;

  if v_reason is null or pg_catalog.length(v_reason) > 1000 then
    raise exception using errcode = '22023', message = 'operator_update_reason_required';
  end if;

  if p_location is null or pg_catalog.jsonb_typeof(p_location) <> 'object' then
    raise exception using errcode = '22023', message = 'invalid_location_payload';
  end if;

  if not exists (
    select 1 from public.operator_locations
    where id = p_location_id and operator_id = p_operator_id
    for update
  ) then
    raise exception using errcode = '22023', message = 'location_not_found';
  end if;

  if exists (
    select 1 from pg_catalog.jsonb_object_keys(p_location) as key_name
    where key_name not in (
      'name', 'address_line_1', 'address_line_2', 'city',
      'administrative_area', 'postal_code', 'country_code', 'timezone',
      'phone', 'email', 'pickup_instructions', 'is_primary', 'is_public', 'is_active'
    )
  ) then
    raise exception using errcode = '22023', message = 'unknown_location_field';
  end if;

  v_name := nullif(pg_catalog.btrim(p_location ->> 'name'), '');
  v_country_code := pg_catalog.upper(coalesce(nullif(pg_catalog.btrim(p_location ->> 'country_code'), ''), 'IT'));
  v_timezone := coalesce(nullif(pg_catalog.btrim(p_location ->> 'timezone'), ''), 'Europe/Rome');
  v_email := pg_catalog.lower(nullif(pg_catalog.btrim(p_location ->> 'email'), ''));
  v_is_primary := coalesce((p_location ->> 'is_primary')::boolean, false);
  v_is_public := coalesce((p_location ->> 'is_public')::boolean, false);
  v_is_active := coalesce((p_location ->> 'is_active')::boolean, true);

  if v_name is null or pg_catalog.length(v_name) > 160 then
    raise exception using errcode = '22023', message = 'invalid_location_name';
  end if;
  if pg_catalog.length(v_country_code) <> 2 then
    raise exception using errcode = '22023', message = 'invalid_location_country';
  end if;
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = v_timezone) then
    raise exception using errcode = '22023', message = 'invalid_location_timezone';
  end if;
  if v_email is not null and v_email !~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$' then
    raise exception using errcode = '22023', message = 'invalid_location_email';
  end if;
  if v_is_primary and not v_is_active then
    raise exception using errcode = '22023', message = 'primary_location_must_be_active';
  end if;

  if v_is_primary then
    update public.operator_locations
    set is_primary = false
    where operator_id = p_operator_id
      and id <> p_location_id
      and is_primary = true;
  end if;

  update public.operator_locations
  set
    name = v_name,
    address_line_1 = nullif(pg_catalog.btrim(p_location ->> 'address_line_1'), ''),
    address_line_2 = nullif(pg_catalog.btrim(p_location ->> 'address_line_2'), ''),
    city = nullif(pg_catalog.btrim(p_location ->> 'city'), ''),
    administrative_area = pg_catalog.upper(nullif(pg_catalog.btrim(p_location ->> 'administrative_area'), '')),
    postal_code = nullif(pg_catalog.btrim(p_location ->> 'postal_code'), ''),
    country_code = v_country_code,
    timezone = v_timezone,
    phone = nullif(pg_catalog.btrim(p_location ->> 'phone'), ''),
    email = v_email,
    pickup_instructions = nullif(pg_catalog.btrim(p_location ->> 'pickup_instructions'), ''),
    is_primary = v_is_primary,
    is_public = v_is_public,
    is_active = v_is_active
  where id = p_location_id;

  insert into public.audit_logs (
    actor_type, actor_user_id, operator_id, action,
    entity_type, entity_id, reason, metadata
  ) values (
    'PLATFORM'::public.audit_actor_type,
    v_user_id,
    p_operator_id,
    'OPERATOR_LOCATION_CORRECTED',
    'OPERATOR_LOCATION',
    p_location_id::text,
    v_reason,
    pg_catalog.jsonb_build_object(
      'changed_fields', (
        select pg_catalog.jsonb_agg(field_name)
        from pg_catalog.jsonb_object_keys(p_location) as fields(field_name)
      ),
      'sensitive_values_omitted', true
    )
  );

  return pg_catalog.jsonb_build_object('operator_id', p_operator_id, 'location_id', p_location_id, 'updated', true);
exception
  when unique_violation then
    raise exception using errcode = '23505', message = 'location_name_already_exists';
end;
$$;


create or replace function public.admin_set_operator_member_status(
  p_operator_id uuid,
  p_user_id uuid,
  p_status public.operator_member_status,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_user_id uuid := auth.uid();
  v_member public.operator_members%rowtype;
  v_reason text := nullif(pg_catalog.btrim(coalesce(p_reason, '')), '');
begin
  if v_actor_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  if not private.has_platform_role(array[
    'SUPER_ADMIN'::public.platform_role,
    'ADMIN'::public.platform_role
  ]) then
    raise exception using errcode = '42501', message = 'member_status_change_not_allowed';
  end if;

  if v_reason is null or pg_catalog.length(v_reason) > 1000 then
    raise exception using errcode = '22023', message = 'member_status_reason_required';
  end if;

  select * into v_member
  from public.operator_members om
  where om.operator_id = p_operator_id and om.user_id = p_user_id
  for update;

  if not found then
    raise exception using errcode = '22023', message = 'operator_member_not_found';
  end if;

  if v_member.status = p_status then
    raise exception using errcode = '22023', message = 'member_status_unchanged';
  end if;

  if v_member.role = 'OWNER'::public.operator_member_role
     and v_member.status = 'ACTIVE'::public.operator_member_status
     and p_status <> 'ACTIVE'::public.operator_member_status
     and not exists (
       select 1 from public.operator_members other
       where other.operator_id = p_operator_id
         and other.user_id <> p_user_id
         and other.role = 'OWNER'::public.operator_member_role
         and other.status = 'ACTIVE'::public.operator_member_status
     ) then
    raise exception using errcode = '22023', message = 'last_active_owner_cannot_be_suspended';
  end if;

  update public.operator_members
  set status = p_status
  where operator_id = p_operator_id and user_id = p_user_id;

  insert into public.audit_logs (
    actor_type, actor_user_id, operator_id, action,
    entity_type, entity_id, reason, metadata
  ) values (
    'PLATFORM'::public.audit_actor_type,
    v_actor_user_id,
    p_operator_id,
    'OPERATOR_MEMBER_STATUS_CHANGED',
    'OPERATOR_MEMBER',
    p_user_id::text,
    v_reason,
    pg_catalog.jsonb_build_object(
      'role', v_member.role::text,
      'from_status', v_member.status::text,
      'to_status', p_status::text
    )
  );

  return pg_catalog.jsonb_build_object(
    'operator_id', p_operator_id,
    'user_id', p_user_id,
    'from_status', v_member.status,
    'to_status', p_status
  );
end;
$$;


create or replace function public.admin_update_operator_member_profile(
  p_operator_id uuid,
  p_user_id uuid,
  p_first_name text,
  p_last_name text,
  p_phone text,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_user_id uuid := auth.uid();
  v_first_name text := nullif(pg_catalog.btrim(coalesce(p_first_name, '')), '');
  v_last_name text := nullif(pg_catalog.btrim(coalesce(p_last_name, '')), '');
  v_phone text := nullif(pg_catalog.btrim(coalesce(p_phone, '')), '');
  v_reason text := nullif(pg_catalog.btrim(coalesce(p_reason, '')), '');
begin
  if v_actor_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  if not private.has_platform_role(array[
    'SUPER_ADMIN'::public.platform_role,
    'ADMIN'::public.platform_role
  ]) then
    raise exception using errcode = '42501', message = 'member_profile_update_not_allowed';
  end if;

  if not exists (
    select 1 from public.operator_members
    where operator_id = p_operator_id and user_id = p_user_id
  ) then
    raise exception using errcode = '22023', message = 'operator_member_not_found';
  end if;

  if v_reason is null or pg_catalog.length(v_reason) > 1000 then
    raise exception using errcode = '22023', message = 'member_update_reason_required';
  end if;

  if (v_first_name is not null and pg_catalog.length(v_first_name) > 100)
     or (v_last_name is not null and pg_catalog.length(v_last_name) > 100)
     or (v_phone is not null and pg_catalog.length(v_phone) > 40) then
    raise exception using errcode = '22023', message = 'invalid_member_profile';
  end if;

  insert into public.profiles (id, first_name, last_name, phone)
  values (p_user_id, v_first_name, v_last_name, v_phone)
  on conflict (id) do update set
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    phone = excluded.phone;

  insert into public.audit_logs (
    actor_type, actor_user_id, operator_id, action,
    entity_type, entity_id, reason, metadata
  ) values (
    'PLATFORM'::public.audit_actor_type,
    v_actor_user_id,
    p_operator_id,
    'OPERATOR_MEMBER_PROFILE_CORRECTED',
    'OPERATOR_MEMBER',
    p_user_id::text,
    v_reason,
    pg_catalog.jsonb_build_object(
      'changed_fields', pg_catalog.jsonb_build_array('first_name', 'last_name', 'phone'),
      'sensitive_values_omitted', true
    )
  );

  return pg_catalog.jsonb_build_object('operator_id', p_operator_id, 'user_id', p_user_id, 'updated', true);
end;
$$;


revoke all on function public.admin_set_operator_status(uuid, public.operator_status, text) from public, anon, authenticated;
revoke all on function public.admin_update_operator_workspace(uuid, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.admin_update_operator_legal_profile(uuid, jsonb, text) from public, anon, authenticated;
revoke all on function public.admin_update_operator_location(uuid, uuid, jsonb, text) from public, anon, authenticated;
revoke all on function public.admin_set_operator_member_status(uuid, uuid, public.operator_member_status, text) from public, anon, authenticated;
revoke all on function public.admin_update_operator_member_profile(uuid, uuid, text, text, text, text) from public, anon, authenticated;

grant execute on function public.admin_set_operator_status(uuid, public.operator_status, text) to authenticated;
grant execute on function public.admin_update_operator_workspace(uuid, text, text, text, text, text) to authenticated;
grant execute on function public.admin_update_operator_legal_profile(uuid, jsonb, text) to authenticated;
grant execute on function public.admin_update_operator_location(uuid, uuid, jsonb, text) to authenticated;
grant execute on function public.admin_set_operator_member_status(uuid, uuid, public.operator_member_status, text) to authenticated;
grant execute on function public.admin_update_operator_member_profile(uuid, uuid, text, text, text, text) to authenticated;

comment on function public.admin_set_operator_status(uuid, public.operator_status, text) is
  'SUPER_ADMIN/ADMIN lifecycle override for an operator. Every change requires a reason and is audited.';

comment on function public.admin_update_operator_workspace(uuid, text, text, text, text, text) is
  'Audited SUPER_ADMIN/ADMIN correction of operator workspace identity fields.';

comment on function public.admin_update_operator_legal_profile(uuid, jsonb, text) is
  'Audited SUPER_ADMIN/ADMIN correction of an operator legal profile. Sensitive field values are omitted from audit metadata.';

comment on function public.admin_update_operator_location(uuid, uuid, jsonb, text) is
  'Audited SUPER_ADMIN/ADMIN correction of an existing operator location.';

comment on function public.admin_set_operator_member_status(uuid, uuid, public.operator_member_status, text) is
  'Audited SUPER_ADMIN/ADMIN member suspension/reactivation with last-owner protection.';

comment on function public.admin_update_operator_member_profile(uuid, uuid, text, text, text, text) is
  'Audited SUPER_ADMIN/ADMIN correction of an operator member public profile.';

commit;
