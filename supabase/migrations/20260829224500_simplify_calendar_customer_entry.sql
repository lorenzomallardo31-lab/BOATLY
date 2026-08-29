-- ============================================================
-- BOATLY OPS
-- Simple calendar customer entry with automatic identity reuse
-- ============================================================

begin;

create or replace function public.operator_create_simple_calendar_booking(
  p_operator_id uuid,
  p_boat_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_passenger_count integer,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_total_cents integer,
  p_operator_note text,
  p_legal_offering_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_customer_id uuid;
  v_email_customer_id uuid;
  v_phone_customer_id uuid;
  v_name text := nullif(pg_catalog.btrim(coalesce(p_customer_name, '')), '');
  v_email text := nullif(pg_catalog.lower(pg_catalog.btrim(coalesce(p_customer_email, ''))), '');
  v_phone text := nullif(pg_catalog.btrim(coalesce(p_customer_phone, '')), '');
  v_phone_key text;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  if not private.has_operator_role(
    p_operator_id,
    array[
      'OWNER'::public.operator_member_role,
      'MANAGER'::public.operator_member_role,
      'EMPLOYEE'::public.operator_member_role
    ]
  ) then
    raise exception using errcode = '42501', message = 'manual_booking_not_allowed';
  end if;

  if v_name is null or pg_catalog.length(v_name) < 2 then
    raise exception using errcode = '22023', message = 'customer_name_required';
  end if;

  if v_email is not null
     and v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception using errcode = '22023', message = 'invalid_customer_email';
  end if;

  if v_phone is not null then
    v_phone_key := private.boatly_normalize_phone(v_phone);
    if v_phone_key is null or pg_catalog.length(v_phone_key) not between 8 and 15 then
      raise exception using errcode = '22023', message = 'invalid_customer_phone';
    end if;
  end if;

  -- Serialize only identical supplied identities. The stable lock order avoids
  -- deadlocks when two requests contain both email and phone.
  if v_email is not null then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(
        'boatly-customer-email:' || p_operator_id::text || ':' || v_email,
        0
      )
    );
  end if;

  if v_phone_key is not null then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(
        'boatly-customer-phone:' || p_operator_id::text || ':' || v_phone_key,
        0
      )
    );
  end if;

  if v_email is not null then
    select oc.id into v_email_customer_id
    from public.operator_customers oc
    where oc.operator_id = p_operator_id
      and pg_catalog.lower(pg_catalog.btrim(oc.email)) = v_email
    limit 1;
  end if;

  if v_phone_key is not null then
    select oc.id into v_phone_customer_id
    from public.operator_customers oc
    where oc.operator_id = p_operator_id
      and private.boatly_normalize_phone(oc.phone) = v_phone_key
    limit 1;
  end if;

  if v_email_customer_id is not null
     and v_phone_customer_id is not null
     and v_email_customer_id <> v_phone_customer_id then
    raise exception using errcode = '23505', message = 'customer_identity_conflict';
  end if;

  v_customer_id := coalesce(v_email_customer_id, v_phone_customer_id);

  if v_customer_id is null then
    begin
      insert into public.operator_customers (
        operator_id,
        display_name,
        email,
        phone,
        created_by
      ) values (
        p_operator_id,
        v_name,
        v_email,
        v_phone,
        v_user_id
      )
      returning id into v_customer_id;
    exception
      when unique_violation then
        raise exception using errcode = '23505', message = 'customer_identity_conflict';
    end;
  end if;

  -- The existing calendar function owns all boat, passenger, offering,
  -- location and overlap checks. A failure rolls back the customer insert too.
  return public.operator_create_calendar_booking(
    p_operator_id,
    p_boat_id,
    p_starts_at,
    p_ends_at,
    p_passenger_count,
    v_name,
    v_email,
    v_phone,
    p_total_cents,
    p_operator_note,
    v_customer_id,
    p_legal_offering_id
  );
end;
$$;

revoke all on function public.operator_create_simple_calendar_booking(
  uuid, uuid, timestamptz, timestamptz, integer, text, text, text, integer, text, uuid
) from public;

revoke execute on function public.operator_create_simple_calendar_booking(
  uuid, uuid, timestamptz, timestamptz, integer, text, text, text, integer, text, uuid
) from anon;

grant execute on function public.operator_create_simple_calendar_booking(
  uuid, uuid, timestamptz, timestamptz, integer, text, text, text, integer, text, uuid
) to authenticated, service_role;

commit;
