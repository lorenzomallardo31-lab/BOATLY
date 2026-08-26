-- ============================================================
-- BOATLY
-- C14-C15: Marketplace Booking Engine + Customer Area
-- ============================================================
--
-- Goals:
--   - authoritative server-side quotes;
--   - short checkout holds protected by GiST exclusion;
--   - immutable booking snapshots before confirmation;
--   - Stripe Connect destination-charge hand-off;
--   - booking confirmation only from verified Stripe webhooks;
--   - customer-safe booking projections;
--   - cancellation requests without mutating confirmed bookings
--     from the browser.
-- ============================================================

begin;


-- ============================================================
-- CHECKOUT IDEMPOTENCY
-- ============================================================

alter table public.bookings
  add column if not exists checkout_idempotency_key uuid;

create unique index if not exists
  bookings_checkout_idempotency_key_unique_idx
on public.bookings(checkout_idempotency_key)
where checkout_idempotency_key is not null;


-- ============================================================
-- CHECKOUT SESSION PERSISTENCE
-- ============================================================

create table if not exists public.payment_checkout_sessions (
  id uuid primary key default gen_random_uuid(),

  operator_id uuid not null,
  booking_id uuid not null,

  provider public.payment_provider not null default 'STRIPE',

  provider_session_id text not null unique,
  provider_payment_intent_id text,

  status text not null default 'OPEN',

  checkout_url text,
  expires_at timestamptz not null,

  provider_state_snapshot jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint payment_checkout_sessions_booking_operator_fk
    foreign key (operator_id, booking_id)
    references public.bookings(operator_id, id)
    on delete cascade,

  constraint payment_checkout_sessions_provider_session_not_blank
    check (length(trim(provider_session_id)) > 0),

  constraint payment_checkout_sessions_payment_intent_not_blank
    check (
      provider_payment_intent_id is null
      or length(trim(provider_payment_intent_id)) > 0
    ),

  constraint payment_checkout_sessions_status_valid
    check (status in ('OPEN', 'COMPLETE', 'EXPIRED', 'FAILED')),

  constraint payment_checkout_sessions_checkout_url_not_blank
    check (
      checkout_url is null
      or length(trim(checkout_url)) > 0
    ),

  constraint payment_checkout_sessions_snapshot_object
    check (jsonb_typeof(provider_state_snapshot) = 'object')
);

create index if not exists
  payment_checkout_sessions_booking_idx
on public.payment_checkout_sessions(booking_id);

create index if not exists
  payment_checkout_sessions_operator_idx
on public.payment_checkout_sessions(operator_id);

create index if not exists
  payment_checkout_sessions_status_expiry_idx
on public.payment_checkout_sessions(status, expires_at);

create trigger payment_checkout_sessions_set_updated_at
before update on public.payment_checkout_sessions
for each row
execute function public.set_updated_at();

alter table public.payment_checkout_sessions
  enable row level security;

revoke all
on table public.payment_checkout_sessions
from public, anon, authenticated;

grant all
on table public.payment_checkout_sessions
 to service_role;


-- ============================================================
-- CUSTOMER CANCELLATION REQUESTS
-- ============================================================

create type public.booking_cancellation_request_status as enum (
  'PENDING',
  'APPROVED',
  'REJECTED',
  'WITHDRAWN',
  'PROCESSED'
);

create table public.booking_cancellation_requests (
  id uuid primary key default gen_random_uuid(),

  operator_id uuid not null,
  booking_id uuid not null,
  customer_user_id uuid not null
    references auth.users(id)
    on delete restrict,

  status public.booking_cancellation_request_status
    not null default 'PENDING',

  reason text,

  estimated_refund_cents integer not null default 0,
  currency text not null,
  policy_snapshot jsonb not null default '{}'::jsonb,

  requested_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid
    references auth.users(id)
    on delete set null,
  resolution_note text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint booking_cancellation_requests_booking_operator_fk
    foreign key (operator_id, booking_id)
    references public.bookings(operator_id, id)
    on delete restrict,

  constraint booking_cancellation_requests_refund_non_negative
    check (estimated_refund_cents >= 0),

  constraint booking_cancellation_requests_currency_format
    check (currency = upper(currency) and length(currency) = 3),

  constraint booking_cancellation_requests_policy_object
    check (jsonb_typeof(policy_snapshot) = 'object'),

  constraint booking_cancellation_requests_reason_not_blank
    check (reason is null or length(trim(reason)) > 0),

  constraint booking_cancellation_requests_resolution_note_not_blank
    check (
      resolution_note is null
      or length(trim(resolution_note)) > 0
    ),

  constraint booking_cancellation_requests_resolution_consistency
    check (
      (
        status = 'PENDING'
        and resolved_at is null
        and resolved_by is null
      )
      or
      (
        status <> 'PENDING'
        and resolved_at is not null
      )
    )
);

create index booking_cancellation_requests_booking_idx
  on public.booking_cancellation_requests(booking_id);

create index booking_cancellation_requests_operator_status_idx
  on public.booking_cancellation_requests(operator_id, status);

create index booking_cancellation_requests_customer_idx
  on public.booking_cancellation_requests(customer_user_id);

create unique index booking_cancellation_requests_one_pending_idx
  on public.booking_cancellation_requests(booking_id)
  where status = 'PENDING';

create trigger booking_cancellation_requests_set_updated_at
before update on public.booking_cancellation_requests
for each row
execute function public.set_updated_at();

alter table public.booking_cancellation_requests
  enable row level security;

revoke all
on table public.booking_cancellation_requests
from public, anon, authenticated;

-- Internal staff may inspect requests through RLS.
grant select
on table public.booking_cancellation_requests
to authenticated;

create policy booking_cancellation_requests_select_internal
on public.booking_cancellation_requests
for select
to authenticated
using (
  private.has_operator_role(
    operator_id,
    array[
      'OWNER'::public.operator_member_role,
      'MANAGER'::public.operator_member_role,
      'EMPLOYEE'::public.operator_member_role
    ]
  )
  or private.has_platform_role(
    array[
      'SUPER_ADMIN'::public.platform_role,
      'ADMIN'::public.platform_role,
      'SUPPORT'::public.platform_role,
      'FINANCE'::public.platform_role,
      'COMPLIANCE'::public.platform_role
    ]
  )
);


-- ============================================================
-- CURRENT BOOKING TERMS
-- ============================================================

create or replace function private.current_booking_terms_version()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select ldv.id
  from public.legal_document_versions ldv
  where ldv.document_key = 'BOOKING_TERMS'
    and ldv.status = 'PUBLISHED'::public.legal_document_status
    and ldv.audience in (
      'CUSTOMER'::public.legal_document_audience,
      'BOTH'::public.legal_document_audience
    )
    and ldv.language_code = 'it'
    and (
      ldv.jurisdiction_country_code is null
      or ldv.jurisdiction_country_code = 'IT'
    )
    and ldv.effective_at <= pg_catalog.now()
  order by
    (ldv.jurisdiction_country_code = 'IT') desc,
    ldv.effective_at desc,
    ldv.published_at desc,
    ldv.id desc
  limit 1;
$$;

revoke execute
on function private.current_booking_terms_version()
from public, anon, authenticated;


-- ============================================================
-- COMMERCIAL TERMS RESOLUTION
-- ============================================================

create or replace function private.marketplace_commercial_terms(
  p_operator_id uuid,
  p_at timestamptz default pg_catalog.now()
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_plan_id uuid;
  v_plan_code text;
  v_plan_name text;
  v_commission_bps integer;
begin
  select
    sp.id,
    sp.code,
    sp.name
  into
    v_plan_id,
    v_plan_code,
    v_plan_name
  from public.operator_subscriptions os
  join public.subscription_plans sp
    on sp.id = os.subscription_plan_id
  where os.operator_id = p_operator_id
    and os.status = 'ACTIVE'::public.operator_subscription_status
    and os.valid_from <= p_at
    and (os.valid_to is null or os.valid_to > p_at)
    and sp.is_active = true
  order by os.valid_from desc, os.id desc
  limit 1;

  if v_plan_id is null then
    return jsonb_build_object(
      'ready', false,
      'reason', 'commercial_plan_missing'
    );
  end if;

  select cr.commission_bps
  into v_commission_bps
  from public.commission_rules cr
  where cr.is_active = true
    and cr.effective_from <= p_at
    and (cr.effective_to is null or cr.effective_to > p_at)
    and (
      cr.operator_id = p_operator_id
      or (
        cr.operator_id is null
        and cr.subscription_plan_id = v_plan_id
      )
    )
  order by
    (cr.operator_id = p_operator_id) desc,
    cr.priority asc,
    cr.effective_from desc,
    cr.id desc
  limit 1;

  if v_commission_bps is null then
    return jsonb_build_object(
      'ready', false,
      'reason', 'commission_rule_missing',
      'plan_id', v_plan_id,
      'plan_code', v_plan_code,
      'plan_name', v_plan_name
    );
  end if;

  return jsonb_build_object(
    'ready', true,
    'plan_id', v_plan_id,
    'plan_code', v_plan_code,
    'plan_name', v_plan_name,
    'commission_bps', v_commission_bps
  );
end;
$$;

revoke execute
on function private.marketplace_commercial_terms(uuid,timestamptz)
from public, anon, authenticated;


-- ============================================================
-- AUTHORITATIVE RATE QUOTE
-- ============================================================

create or replace function private.marketplace_rate_quote(
  p_rate_plan_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_rate public.boat_rate_plans%rowtype;
  v_timezone text;
  v_local_start timestamp;
  v_duration integer;
  v_price integer;
  v_steps integer;
  v_first_rule record;
  v_rule record;
  v_applied_rules jsonb := '[]'::jsonb;
begin
  select *
  into v_rate
  from public.boat_rate_plans rp
  where rp.id = p_rate_plan_id
    and rp.is_active = true;

  if not found then
    return jsonb_build_object('ready', false, 'reason', 'rate_plan_not_found');
  end if;

  select ol.timezone
  into v_timezone
  from public.boats b
  join public.operator_locations ol
    on ol.id = b.primary_location_id
   and ol.operator_id = b.operator_id
  where b.id = v_rate.boat_id;

  v_timezone := coalesce(nullif(pg_catalog.btrim(v_timezone), ''), 'Europe/Rome');
  v_local_start := p_starts_at at time zone v_timezone;

  v_duration := ceil(
    extract(epoch from (p_ends_at - p_starts_at)) / 60.0
  )::integer;

  if v_duration <= 0 then
    return jsonb_build_object('ready', false, 'reason', 'invalid_duration');
  end if;

  if v_rate.duration_mode = 'FIXED'::public.rate_plan_duration_mode then
    if v_duration <> v_rate.base_duration_minutes then
      return jsonb_build_object('ready', false, 'reason', 'duration_not_supported');
    end if;

    v_price := v_rate.base_price_cents;
  else
    if v_duration < v_rate.base_duration_minutes
       or v_duration > v_rate.max_duration_minutes
       or (
         (v_duration - v_rate.base_duration_minutes)
         % v_rate.duration_step_minutes
       ) <> 0
    then
      return jsonb_build_object('ready', false, 'reason', 'duration_not_supported');
    end if;

    v_steps :=
      (v_duration - v_rate.base_duration_minutes)
      / v_rate.duration_step_minutes;

    v_price :=
      v_rate.base_price_cents
      + v_steps * v_rate.additional_step_price_cents;
  end if;

  select pr.*
  into v_first_rule
  from public.boat_pricing_rules pr
  where pr.rate_plan_id = v_rate.id
    and pr.is_active = true
    and (pr.valid_from is null or v_local_start::date >= pr.valid_from)
    and (pr.valid_to is null or v_local_start::date <= pr.valid_to)
    and (
      pr.weekdays is null
      or extract(isodow from v_local_start)::smallint = any(pr.weekdays)
    )
    and (
      pr.start_time_from is null
      or v_local_start::time >= pr.start_time_from
    )
    and (
      pr.start_time_to is null
      or v_local_start::time < pr.start_time_to
    )
    and (
      pr.minimum_duration_minutes is null
      or v_duration >= pr.minimum_duration_minutes
    )
    and (
      pr.maximum_duration_minutes is null
      or v_duration <= pr.maximum_duration_minutes
    )
  order by pr.priority asc, pr.id asc
  limit 1;

  if found then
    if v_first_rule.is_stackable = false then
      if v_first_rule.adjustment_type = 'OVERRIDE_PRICE'::public.pricing_adjustment_type then
        v_price := v_first_rule.price_override_cents;
      elsif v_first_rule.adjustment_type = 'FIXED_DELTA'::public.pricing_adjustment_type then
        v_price := greatest(0, v_price + v_first_rule.price_delta_cents);
      else
        v_price := greatest(
          0,
          round(v_price * (10000 + v_first_rule.price_delta_bps)::numeric / 10000)::integer
        );
      end if;

      v_applied_rules := jsonb_build_array(
        jsonb_build_object(
          'id', v_first_rule.id,
          'name', v_first_rule.name,
          'adjustment_type', v_first_rule.adjustment_type,
          'priority', v_first_rule.priority
        )
      );
    else
      for v_rule in
        select pr.*
        from public.boat_pricing_rules pr
        where pr.rate_plan_id = v_rate.id
          and pr.is_active = true
          and pr.is_stackable = true
          and (pr.valid_from is null or v_local_start::date >= pr.valid_from)
          and (pr.valid_to is null or v_local_start::date <= pr.valid_to)
          and (
            pr.weekdays is null
            or extract(isodow from v_local_start)::smallint = any(pr.weekdays)
          )
          and (
            pr.start_time_from is null
            or v_local_start::time >= pr.start_time_from
          )
          and (
            pr.start_time_to is null
            or v_local_start::time < pr.start_time_to
          )
          and (
            pr.minimum_duration_minutes is null
            or v_duration >= pr.minimum_duration_minutes
          )
          and (
            pr.maximum_duration_minutes is null
            or v_duration <= pr.maximum_duration_minutes
          )
        order by pr.priority asc, pr.id asc
      loop
        if v_rule.adjustment_type = 'OVERRIDE_PRICE'::public.pricing_adjustment_type then
          v_price := v_rule.price_override_cents;
        elsif v_rule.adjustment_type = 'FIXED_DELTA'::public.pricing_adjustment_type then
          v_price := greatest(0, v_price + v_rule.price_delta_cents);
        else
          v_price := greatest(
            0,
            round(v_price * (10000 + v_rule.price_delta_bps)::numeric / 10000)::integer
          );
        end if;

        v_applied_rules := v_applied_rules || jsonb_build_array(
          jsonb_build_object(
            'id', v_rule.id,
            'name', v_rule.name,
            'adjustment_type', v_rule.adjustment_type,
            'priority', v_rule.priority
          )
        );
      end loop;
    end if;
  end if;

  return jsonb_build_object(
    'ready', true,
    'rate_plan_id', v_rate.id,
    'rate_plan_name', v_rate.name,
    'duration_mode', v_rate.duration_mode,
    'duration_minutes', v_duration,
    'base_duration_minutes', v_rate.base_duration_minutes,
    'base_price_cents', v_rate.base_price_cents,
    'rental_price_cents', v_price,
    'applied_rules', v_applied_rules
  );
end;
$$;

revoke execute
on function private.marketplace_rate_quote(uuid,timestamptz,timestamptz)
from public, anon, authenticated;


-- ============================================================
-- CHECKOUT OPTIONS
-- ============================================================

create or replace function public.marketplace_checkout_options(
  p_boat_slug text,
  p_booking_date date,
  p_passengers integer
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_boat record;
  v_terms_id uuid;
  v_commercial jsonb;
  v_stripe_ready boolean;
  v_options jsonb;
  v_extras jsonb;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'authentication_required';
  end if;

  if p_booking_date is null then
    raise exception using
      errcode = '22023',
      message = 'invalid_booking_date';
  end if;

  if p_passengers is null or p_passengers <= 0 then
    raise exception using
      errcode = '22023',
      message = 'invalid_passenger_count';
  end if;

  select
    b.id,
    b.operator_id,
    b.name,
    b.slug,
    b.operator_passenger_limit,
    b.license_required,
    b.primary_location_id,
    o.name as operator_name,
    o.currency,
    ol.name as location_name,
    ol.city as location_city,
    ol.timezone as location_timezone
  into v_boat
  from public.boats b
  join public.operators o
    on o.id = b.operator_id
  join public.operator_locations ol
    on ol.id = b.primary_location_id
   and ol.operator_id = b.operator_id
  where b.slug = p_boat_slug
    and private.is_boat_marketplace_eligible(b.id)
  limit 1;

  if not found then
    raise exception using
      errcode = '22023',
      message = 'marketplace_boat_not_found';
  end if;

  if p_booking_date < (pg_catalog.now() at time zone v_boat.location_timezone)::date then
    raise exception using
      errcode = '22023',
      message = 'invalid_booking_date';
  end if;

  if p_passengers > v_boat.operator_passenger_limit then
    raise exception using
      errcode = '22023',
      message = 'passenger_limit_exceeded';
  end if;

  v_terms_id := private.current_booking_terms_version();
  v_commercial := private.marketplace_commercial_terms(v_boat.operator_id, pg_catalog.now());

  select exists (
    select 1
    from public.stripe_connected_accounts sca
    where sca.operator_id = v_boat.operator_id
      and sca.status = 'ACTIVE'::public.stripe_connected_account_status
      and sca.charges_enabled = true
      and sca.payouts_enabled = true
      and sca.details_submitted = true
  ) into v_stripe_ready;

  select coalesce(
    jsonb_agg(option_row.option_json order by option_row.starts_at, option_row.rental_price_cents),
    '[]'::jsonb
  )
  into v_options
  from (
    select distinct
      starts.starts_at,
      quote.rental_price_cents,
      jsonb_build_object(
        'rate_plan_id', rp.id,
        'rate_plan_name', rp.name,
        'legal_offering_id', blo.id,
        'legal_type', blo.legal_type,
        'skipper_mode', blo.skipper_mode,
        'self_drive_allowed', blo.self_drive_allowed,
        'minimum_driver_age', blo.minimum_driver_age,
        'starts_at', starts.starts_at,
        'ends_at', starts.ends_at,
        'duration_minutes', quote.duration_minutes,
        'rental_price_cents', quote.rental_price_cents,
        'currency', v_boat.currency
      ) as option_json
    from public.boat_availability_rules ar
    join public.boat_rate_plans rp
      on rp.boat_id = v_boat.id
     and rp.operator_id = v_boat.operator_id
     and rp.is_active = true
     and (rp.valid_from is null or p_booking_date >= rp.valid_from)
     and (rp.valid_to is null or p_booking_date <= rp.valid_to)
    join public.boat_legal_offerings blo
      on blo.boat_id = v_boat.id
     and blo.is_active = true
     and (
       rp.legal_offering_id is null
       or rp.legal_offering_id = blo.id
     )
    cross join lateral (
      select
        (
          p_booking_date + ar.available_from
        ) at time zone ar.timezone as starts_at,
        (
          (
            p_booking_date + ar.available_from
          ) at time zone ar.timezone
          + make_interval(mins => rp.base_duration_minutes)
        ) as ends_at
    ) starts
    cross join lateral (
      select private.marketplace_rate_quote(
        rp.id,
        starts.starts_at,
        starts.ends_at
      ) as quote_json
    ) quote_raw
    cross join lateral (
      select
        (quote_raw.quote_json ->> 'duration_minutes')::integer as duration_minutes,
        (quote_raw.quote_json ->> 'rental_price_cents')::integer as rental_price_cents,
        (quote_raw.quote_json ->> 'ready')::boolean as ready
    ) quote
    where ar.boat_id = v_boat.id
      and ar.operator_id = v_boat.operator_id
      and ar.is_active = true
      and ar.weekday = extract(isodow from p_booking_date)::smallint
      and (ar.valid_from is null or p_booking_date >= ar.valid_from)
      and (ar.valid_to is null or p_booking_date <= ar.valid_to)
      and starts.ends_at <= ((p_booking_date + ar.available_to) at time zone ar.timezone)
      and quote.ready = true
      and private.boat_slot_is_free(
        v_boat.id,
        starts.starts_at,
        starts.ends_at,
        null
      )
  ) option_row;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'extra_id', e.id,
        'name', e.name,
        'description', e.description,
        'pricing_unit', e.pricing_unit,
        'price_cents', coalesce(be.price_override_cents, e.price_cents),
        'max_quantity', coalesce(be.max_quantity_override, e.max_quantity)
      )
      order by lower(e.name), e.id
    ),
    '[]'::jsonb
  )
  into v_extras
  from public.boat_extras be
  join public.extras e
    on e.id = be.extra_id
   and e.operator_id = be.operator_id
  where be.boat_id = v_boat.id
    and be.operator_id = v_boat.operator_id
    and be.is_active = true
    and e.is_active = true;

  return jsonb_build_object(
    'boat', jsonb_build_object(
      'id', v_boat.id,
      'operator_id', v_boat.operator_id,
      'name', v_boat.name,
      'slug', v_boat.slug,
      'operator_name', v_boat.operator_name,
      'passenger_limit', v_boat.operator_passenger_limit,
      'license_required', v_boat.license_required,
      'location_id', v_boat.primary_location_id,
      'location_name', v_boat.location_name,
      'location_city', v_boat.location_city,
      'timezone', v_boat.location_timezone,
      'currency', v_boat.currency
    ),
    'booking_date', p_booking_date,
    'passengers', p_passengers,
    'booking_terms_ready', v_terms_id is not null,
    'booking_terms_version_id', v_terms_id,
    'booking_terms', (
      select jsonb_build_object(
        'id', ldv.id,
        'title', ldv.title,
        'version', ldv.version,
        'document_key', ldv.document_key
      )
      from public.legal_document_versions ldv
      where ldv.id = v_terms_id
    ),
    'commercial_ready', coalesce((v_commercial ->> 'ready')::boolean, false),
    'commercial', v_commercial,
    'stripe_ready', v_stripe_ready,
    'options', v_options,
    'extras', v_extras
  );
end;
$$;


-- ============================================================
-- BOOKING + HOLD CREATION
-- ============================================================

create or replace function public.create_marketplace_booking_hold(
  p_boat_slug text,
  p_rate_plan_id uuid,
  p_legal_offering_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_passengers integer,
  p_first_name text,
  p_last_name text,
  p_phone text,
  p_date_of_birth date,
  p_driver_is_customer boolean,
  p_driver_has_required_license boolean,
  p_customer_note text,
  p_extra_items jsonb,
  p_terms_accepted boolean,
  p_checkout_idempotency_key uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_email text;
  v_boat record;
  v_legal public.boat_legal_offerings%rowtype;
  v_rate public.boat_rate_plans%rowtype;
  v_location public.operator_locations%rowtype;
  v_operator_customer_id uuid;
  v_terms_id uuid;
  v_terms record;
  v_commercial jsonb;
  v_commission_bps integer;
  v_plan_code text;
  v_quote jsonb;
  v_rental_cents integer;
  v_extras_cents integer := 0;
  v_customer_total integer;
  v_commission_amount integer;
  v_operator_amount integer;
  v_reference text;
  v_booking_id uuid;
  v_hold_id uuid;
  v_hold_expires_at timestamptz;
  v_cancellation_policy public.cancellation_policies%rowtype;
  v_cancellation_rules jsonb := '[]'::jsonb;
  v_customer_snapshot jsonb;
  v_boat_snapshot jsonb;
  v_legal_snapshot jsonb;
  v_location_snapshot jsonb;
  v_driver_snapshot jsonb;
  v_cancellation_snapshot jsonb;
  v_pricing_snapshot jsonb;
  v_commercial_snapshot jsonb;
  v_item jsonb;
  v_extra record;
  v_requested_quantity integer;
  v_effective_quantity integer;
  v_unit_price integer;
  v_line_total integer;
  v_duration_minutes integer;
  v_driver_age integer;
  v_existing record;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'authentication_required';
  end if;

  if p_checkout_idempotency_key is null then
    raise exception using
      errcode = '22023',
      message = 'checkout_idempotency_key_required';
  end if;

  select
    b.id,
    b.operator_id,
    b.name,
    b.slug,
    b.primary_location_id,
    b.operator_passenger_limit,
    b.license_required,
    b.manufacturer,
    b.model,
    b.manufacture_year,
    o.currency,
    o.name as operator_name
  into v_boat
  from public.boats b
  join public.operators o
    on o.id = b.operator_id
  where b.slug = p_boat_slug
    and private.is_boat_marketplace_eligible(b.id)
  for update of b;

  if not found then
    raise exception using
      errcode = '22023',
      message = 'marketplace_boat_not_found';
  end if;

  select
    b.id,
    b.reference,
    bo.id as hold_id,
    bo.hold_expires_at
  into v_existing
  from public.bookings b
  left join public.boat_occupancies bo
    on bo.booking_id = b.id
   and bo.occupancy_type = 'HOLD'::public.boat_occupancy_type
   and bo.is_active = true
  where b.checkout_idempotency_key = p_checkout_idempotency_key
    and b.customer_user_id = v_user_id
  limit 1;

  if found then
    return jsonb_build_object(
      'booking_id', v_existing.id,
      'reference', v_existing.reference,
      'hold_id', v_existing.hold_id,
      'hold_expires_at', v_existing.hold_expires_at,
      'idempotent_replay', true
    );
  end if;

  if p_passengers is null
     or p_passengers <= 0
     or p_passengers > v_boat.operator_passenger_limit
  then
    raise exception using
      errcode = '22023',
      message = 'invalid_passenger_count';
  end if;

  if p_ends_at <= p_starts_at
     or p_starts_at <= pg_catalog.now()
  then
    raise exception using
      errcode = '22023',
      message = 'invalid_booking_window';
  end if;

  perform private.release_expired_boat_holds(null);

  if (
    select count(*)
    from public.boat_occupancies existing_hold
    where existing_hold.occupancy_type = 'HOLD'::public.boat_occupancy_type
      and existing_hold.is_active = true
      and existing_hold.hold_expires_at > pg_catalog.now()
      and existing_hold.created_by = v_user_id
  ) >= 3 then
    raise exception using
      errcode = '22023',
      message = 'too_many_active_checkout_holds';
  end if;

  if not private.boat_slot_within_availability(
    v_boat.id,
    p_starts_at,
    p_ends_at
  ) then
    raise exception using
      errcode = '22023',
      message = 'slot_outside_availability';
  end if;

  if not private.boat_slot_is_free(
    v_boat.id,
    p_starts_at,
    p_ends_at,
    null
  ) then
    raise exception using
      errcode = '23P01',
      message = 'slot_not_available';
  end if;

  select *
  into v_location
  from public.operator_locations ol
  where ol.id = v_boat.primary_location_id
    and ol.operator_id = v_boat.operator_id;

  if not found then
    raise exception using
      errcode = '22023',
      message = 'pickup_location_not_found';
  end if;

  select *
  into v_legal
  from public.boat_legal_offerings blo
  where blo.id = p_legal_offering_id
    and blo.boat_id = v_boat.id
    and blo.is_active = true;

  if not found then
    raise exception using
      errcode = '22023',
      message = 'legal_offering_not_available';
  end if;

  select *
  into v_rate
  from public.boat_rate_plans rp
  where rp.id = p_rate_plan_id
    and rp.operator_id = v_boat.operator_id
    and rp.boat_id = v_boat.id
    and rp.is_active = true
    and (rp.valid_from is null or (p_starts_at at time zone v_location.timezone)::date >= rp.valid_from)
    and (rp.valid_to is null or (p_starts_at at time zone v_location.timezone)::date <= rp.valid_to)
    and (
      rp.legal_offering_id is null
      or rp.legal_offering_id = v_legal.id
    );

  if not found then
    raise exception using
      errcode = '22023',
      message = 'rate_plan_not_available';
  end if;

  v_quote := private.marketplace_rate_quote(
    v_rate.id,
    p_starts_at,
    p_ends_at
  );

  if coalesce((v_quote ->> 'ready')::boolean, false) = false then
    raise exception using
      errcode = '22023',
      message = coalesce(v_quote ->> 'reason', 'rate_quote_failed');
  end if;

  v_rental_cents := (v_quote ->> 'rental_price_cents')::integer;
  v_duration_minutes := (v_quote ->> 'duration_minutes')::integer;

  if v_rate.cancellation_policy_id is null then
    raise exception using
      errcode = '22023',
      message = 'cancellation_policy_missing';
  end if;

  select *
  into v_cancellation_policy
  from public.cancellation_policies cp
  where cp.id = v_rate.cancellation_policy_id
    and cp.operator_id = v_boat.operator_id
    and cp.is_active = true;

  if not found then
    raise exception using
      errcode = '22023',
      message = 'cancellation_policy_missing';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'min_hours_before_start', cpr.min_hours_before_start,
        'max_hours_before_start', cpr.max_hours_before_start,
        'refund_bps', cpr.refund_bps,
        'cancellation_fee_cents', cpr.cancellation_fee_cents
      )
      order by cpr.min_hours_before_start asc
    ),
    '[]'::jsonb
  )
  into v_cancellation_rules
  from public.cancellation_policy_rules cpr
  where cpr.cancellation_policy_id = v_cancellation_policy.id;

  if jsonb_array_length(v_cancellation_rules) = 0 then
    raise exception using
      errcode = '22023',
      message = 'cancellation_policy_rules_missing';
  end if;

  v_terms_id := private.current_booking_terms_version();

  if v_terms_id is null or p_terms_accepted is distinct from true then
    raise exception using
      errcode = '22023',
      message = 'booking_terms_not_accepted';
  end if;

  select
    ldv.id,
    ldv.document_key,
    ldv.version,
    ldv.title,
    ldv.content_hash_sha256
  into v_terms
  from public.legal_document_versions ldv
  where ldv.id = v_terms_id;

  v_commercial := private.marketplace_commercial_terms(
    v_boat.operator_id,
    pg_catalog.now()
  );

  if coalesce((v_commercial ->> 'ready')::boolean, false) = false then
    raise exception using
      errcode = '22023',
      message = coalesce(v_commercial ->> 'reason', 'commercial_configuration_missing');
  end if;

  v_commission_bps := (v_commercial ->> 'commission_bps')::integer;
  v_plan_code := v_commercial ->> 'plan_code';

  if not exists (
    select 1
    from public.stripe_connected_accounts sca
    where sca.operator_id = v_boat.operator_id
      and sca.status = 'ACTIVE'::public.stripe_connected_account_status
      and sca.charges_enabled = true
      and sca.payouts_enabled = true
      and sca.details_submitted = true
  ) then
    raise exception using
      errcode = '22023',
      message = 'stripe_account_not_ready';
  end if;

  select au.email
  into v_email
  from auth.users au
  where au.id = v_user_id;

  if v_email is null then
    raise exception using
      errcode = '22023',
      message = 'customer_email_missing';
  end if;

  if nullif(pg_catalog.btrim(coalesce(p_first_name, '')), '') is null
     or nullif(pg_catalog.btrim(coalesce(p_last_name, '')), '') is null
  then
    raise exception using
      errcode = '22023',
      message = 'customer_name_required';
  end if;

  if p_driver_is_customer then
    if v_legal.self_drive_allowed = false
       or v_legal.skipper_mode in (
         'INCLUDED'::public.skipper_service_mode,
         'REQUIRED'::public.skipper_service_mode
       )
    then
      raise exception using
        errcode = '22023',
        message = 'self_drive_not_allowed';
    end if;

    if v_legal.minimum_driver_age is not null then
      if p_date_of_birth is null then
        raise exception using
          errcode = '22023',
          message = 'driver_date_of_birth_required';
      end if;

      v_driver_age := date_part(
        'year',
        age((p_starts_at at time zone v_location.timezone)::date, p_date_of_birth)
      )::integer;

      if v_driver_age < v_legal.minimum_driver_age then
        raise exception using
          errcode = '22023',
          message = 'minimum_driver_age_not_met';
      end if;
    end if;

    if v_boat.license_required = true
       and p_driver_has_required_license is distinct from true
    then
      raise exception using
        errcode = '22023',
        message = 'required_license_not_confirmed';
    end if;
  else
    if v_legal.skipper_mode = 'NOT_AVAILABLE'::public.skipper_service_mode then
      raise exception using
        errcode = '22023',
        message = 'skipper_not_available';
    end if;
  end if;

  select oc.id
  into v_operator_customer_id
  from public.operator_customers oc
  where oc.operator_id = v_boat.operator_id
    and oc.user_id = v_user_id
  for update;

  if v_operator_customer_id is null then
    insert into public.operator_customers (
      operator_id,
      user_id,
      display_name,
      first_name,
      last_name,
      email,
      phone,
      date_of_birth,
      country_code,
      created_by
    )
    values (
      v_boat.operator_id,
      v_user_id,
      pg_catalog.btrim(p_first_name) || ' ' || pg_catalog.btrim(p_last_name),
      pg_catalog.btrim(p_first_name),
      pg_catalog.btrim(p_last_name),
      lower(v_email),
      nullif(pg_catalog.btrim(coalesce(p_phone, '')), ''),
      p_date_of_birth,
      'IT',
      v_user_id
    )
    returning id into v_operator_customer_id;
  else
    update public.operator_customers
    set
      display_name = pg_catalog.btrim(p_first_name) || ' ' || pg_catalog.btrim(p_last_name),
      first_name = pg_catalog.btrim(p_first_name),
      last_name = pg_catalog.btrim(p_last_name),
      email = lower(v_email),
      phone = nullif(pg_catalog.btrim(coalesce(p_phone, '')), ''),
      date_of_birth = p_date_of_birth
    where id = v_operator_customer_id;
  end if;

  if p_extra_items is null then
    p_extra_items := '[]'::jsonb;
  end if;

  if jsonb_typeof(p_extra_items) <> 'array' then
    raise exception using
      errcode = '22023',
      message = 'invalid_booking_extras_payload';
  end if;

  if exists (
    select 1
    from (
      select item ->> 'extra_id' as extra_id, count(*) as occurrences
      from jsonb_array_elements(p_extra_items) item
      group by item ->> 'extra_id'
      having count(*) > 1
    ) duplicate_items
  ) then
    raise exception using
      errcode = '22023',
      message = 'duplicate_booking_extra';
  end if;

  for v_item in
    select item
    from jsonb_array_elements(p_extra_items) item
  loop
    if coalesce(v_item ->> 'extra_id', '') !~
      '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    then
      raise exception using
        errcode = '22023',
        message = 'invalid_booking_extra';
    end if;

    select
      e.id,
      e.name,
      e.pricing_unit,
      coalesce(be.price_override_cents, e.price_cents) as unit_price_cents,
      coalesce(be.max_quantity_override, e.max_quantity) as max_quantity
    into v_extra
    from public.boat_extras be
    join public.extras e
      on e.id = be.extra_id
     and e.operator_id = be.operator_id
    where be.boat_id = v_boat.id
      and be.operator_id = v_boat.operator_id
      and be.extra_id = (v_item ->> 'extra_id')::uuid
      and be.is_active = true
      and e.is_active = true;

    if not found then
      raise exception using
        errcode = '22023',
        message = 'booking_extra_not_available';
    end if;

    if coalesce(v_item ->> 'quantity', '') !~ '^[1-9][0-9]*$' then
      raise exception using
        errcode = '22023',
        message = 'invalid_booking_extra_quantity';
    end if;

    v_requested_quantity := (v_item ->> 'quantity')::integer;
    v_unit_price := v_extra.unit_price_cents;

    if v_extra.pricing_unit = 'FIXED'::public.extra_pricing_unit then
      v_effective_quantity := 1;
    elsif v_extra.pricing_unit = 'PER_HOUR'::public.extra_pricing_unit then
      v_effective_quantity := greatest(1, ceil(v_duration_minutes / 60.0)::integer);
    elsif v_extra.pricing_unit = 'PER_DAY'::public.extra_pricing_unit then
      v_effective_quantity := greatest(1, ceil(v_duration_minutes / 1440.0)::integer);
    else
      v_effective_quantity := v_requested_quantity;
    end if;

    if v_extra.pricing_unit = 'PER_PERSON'::public.extra_pricing_unit
       and v_effective_quantity > p_passengers
    then
      raise exception using
        errcode = '22023',
        message = 'extra_quantity_exceeds_passengers';
    end if;

    if v_extra.max_quantity is not null
       and v_effective_quantity > v_extra.max_quantity
    then
      raise exception using
        errcode = '22023',
        message = 'extra_quantity_exceeds_limit';
    end if;

    v_line_total := v_unit_price * v_effective_quantity;
    v_extras_cents := v_extras_cents + v_line_total;
  end loop;

  v_customer_total := v_rental_cents + v_extras_cents;

  if v_customer_total <= 0 then
    raise exception using
      errcode = '22023',
      message = 'marketplace_payment_amount_must_be_positive';
  end if;

  v_commission_amount := round(
    v_customer_total * v_commission_bps::numeric / 10000
  )::integer;
  v_operator_amount := v_customer_total - v_commission_amount;

  v_reference :=
    'BTY-'
    || to_char(pg_catalog.now() at time zone 'UTC', 'YYYYMMDD')
    || '-'
    || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  v_customer_snapshot := jsonb_build_object(
    'user_id', v_user_id,
    'first_name', pg_catalog.btrim(p_first_name),
    'last_name', pg_catalog.btrim(p_last_name),
    'email', lower(v_email),
    'phone', nullif(pg_catalog.btrim(coalesce(p_phone, '')), ''),
    'date_of_birth', p_date_of_birth
  );

  v_boat_snapshot := jsonb_build_object(
    'id', v_boat.id,
    'name', v_boat.name,
    'slug', v_boat.slug,
    'manufacturer', v_boat.manufacturer,
    'model', v_boat.model,
    'manufacture_year', v_boat.manufacture_year,
    'operator_name', v_boat.operator_name
  );

  v_legal_snapshot := jsonb_build_object(
    'id', v_legal.id,
    'legal_type', v_legal.legal_type,
    'skipper_mode', v_legal.skipper_mode,
    'self_drive_allowed', v_legal.self_drive_allowed,
    'minimum_driver_age', v_legal.minimum_driver_age,
    'navigation_limit_notes', v_legal.navigation_limit_notes,
    'eligibility_notes', v_legal.eligibility_notes
  );

  v_location_snapshot := jsonb_build_object(
    'id', v_location.id,
    'name', v_location.name,
    'address_line_1', v_location.address_line_1,
    'address_line_2', v_location.address_line_2,
    'city', v_location.city,
    'administrative_area', v_location.administrative_area,
    'postal_code', v_location.postal_code,
    'country_code', v_location.country_code,
    'timezone', v_location.timezone,
    'pickup_instructions', v_location.pickup_instructions
  );

  v_driver_snapshot := jsonb_build_object(
    'driver_is_customer', p_driver_is_customer,
    'driver_has_required_license_confirmed', p_driver_has_required_license,
    'boat_license_required', v_boat.license_required,
    'minimum_driver_age', v_legal.minimum_driver_age,
    'customer_age_at_start', v_driver_age
  );

  v_cancellation_snapshot := jsonb_build_object(
    'policy_id', v_cancellation_policy.id,
    'name', v_cancellation_policy.name,
    'description', v_cancellation_policy.description,
    'rules', v_cancellation_rules
  );

  v_pricing_snapshot := jsonb_build_object(
    'rate_plan_id', v_rate.id,
    'rate_plan_name', v_rate.name,
    'quote', v_quote,
    'extras_total_cents', v_extras_cents
  );

  v_commercial_snapshot := jsonb_build_object(
    'plan_id', v_commercial -> 'plan_id',
    'plan_code', v_plan_code,
    'plan_name', v_commercial ->> 'plan_name',
    'commission_bps', v_commission_bps
  );

  insert into public.bookings (
    operator_id,
    source,
    status,
    reference,
    operator_customer_id,
    customer_user_id,
    boat_id,
    legal_offering_id,
    pickup_location_id,
    rate_plan_id,
    starts_at,
    ends_at,
    passenger_count,
    driver_is_customer,
    customer_note,
    currency_snapshot,
    rental_subtotal_cents_snapshot,
    extras_total_cents_snapshot,
    discount_total_cents_snapshot,
    tax_total_cents_snapshot,
    customer_total_cents_snapshot,
    security_deposit_cents_snapshot,
    commission_base_cents_snapshot,
    commission_bps_snapshot,
    commission_amount_cents_snapshot,
    operator_amount_cents_snapshot,
    commercial_plan_code_snapshot,
    customer_snapshot,
    boat_snapshot,
    legal_offering_snapshot,
    pickup_location_snapshot,
    driver_eligibility_snapshot,
    cancellation_policy_snapshot,
    pricing_snapshot,
    commercial_snapshot,
    created_by,
    checkout_idempotency_key
  )
  values (
    v_boat.operator_id,
    'MARKETPLACE'::public.booking_source,
    'PENDING_PAYMENT'::public.booking_status,
    v_reference,
    v_operator_customer_id,
    v_user_id,
    v_boat.id,
    v_legal.id,
    v_location.id,
    v_rate.id,
    p_starts_at,
    p_ends_at,
    p_passengers,
    p_driver_is_customer,
    nullif(pg_catalog.btrim(coalesce(p_customer_note, '')), ''),
    v_boat.currency,
    v_rental_cents,
    v_extras_cents,
    0,
    0,
    v_customer_total,
    0,
    v_customer_total,
    v_commission_bps,
    v_commission_amount,
    v_operator_amount,
    v_plan_code,
    v_customer_snapshot,
    v_boat_snapshot,
    v_legal_snapshot,
    v_location_snapshot,
    v_driver_snapshot,
    v_cancellation_snapshot,
    v_pricing_snapshot,
    v_commercial_snapshot,
    v_user_id,
    p_checkout_idempotency_key
  )
  returning id into v_booking_id;

  for v_item in
    select item
    from jsonb_array_elements(p_extra_items) item
  loop
    select
      e.id,
      e.name,
      e.pricing_unit,
      coalesce(be.price_override_cents, e.price_cents) as unit_price_cents,
      coalesce(be.max_quantity_override, e.max_quantity) as max_quantity
    into v_extra
    from public.boat_extras be
    join public.extras e
      on e.id = be.extra_id
     and e.operator_id = be.operator_id
    where be.boat_id = v_boat.id
      and be.operator_id = v_boat.operator_id
      and be.extra_id = (v_item ->> 'extra_id')::uuid
      and be.is_active = true
      and e.is_active = true;

    v_requested_quantity := (v_item ->> 'quantity')::integer;
    v_unit_price := v_extra.unit_price_cents;

    if v_extra.pricing_unit = 'FIXED'::public.extra_pricing_unit then
      v_effective_quantity := 1;
    elsif v_extra.pricing_unit = 'PER_HOUR'::public.extra_pricing_unit then
      v_effective_quantity := greatest(1, ceil(v_duration_minutes / 60.0)::integer);
    elsif v_extra.pricing_unit = 'PER_DAY'::public.extra_pricing_unit then
      v_effective_quantity := greatest(1, ceil(v_duration_minutes / 1440.0)::integer);
    else
      v_effective_quantity := v_requested_quantity;
    end if;

    v_line_total := v_unit_price * v_effective_quantity;

    insert into public.booking_extras (
      operator_id,
      booking_id,
      boat_id,
      extra_id,
      extra_name_snapshot,
      pricing_unit_snapshot,
      quantity,
      unit_price_cents,
      total_price_cents
    )
    values (
      v_boat.operator_id,
      v_booking_id,
      v_boat.id,
      v_extra.id,
      v_extra.name,
      v_extra.pricing_unit,
      v_effective_quantity,
      v_unit_price,
      v_line_total
    );
  end loop;

  insert into public.booking_price_items (
    operator_id,
    booking_id,
    item_type,
    code,
    label,
    quantity,
    unit_amount_cents,
    amount_cents,
    is_commissionable,
    sort_order,
    metadata
  )
  values (
    v_boat.operator_id,
    v_booking_id,
    'RENTAL'::public.booking_price_item_type,
    'RENTAL',
    'Noleggio ' || v_boat.name,
    1,
    v_rental_cents,
    v_rental_cents,
    true,
    10,
    v_quote
  );

  insert into public.booking_price_items (
    operator_id,
    booking_id,
    item_type,
    code,
    label,
    quantity,
    unit_amount_cents,
    amount_cents,
    is_commissionable,
    sort_order,
    metadata
  )
  select
    be.operator_id,
    be.booking_id,
    'EXTRA'::public.booking_price_item_type,
    'EXTRA_' || be.extra_id::text,
    be.extra_name_snapshot,
    be.quantity,
    be.unit_price_cents,
    be.total_price_cents,
    true,
    100 + row_number() over (order by be.created_at, be.id),
    jsonb_build_object(
      'extra_id', be.extra_id,
      'pricing_unit', be.pricing_unit_snapshot
    )
  from public.booking_extras be
  where be.booking_id = v_booking_id;

  -- Stripe Checkout only accepts explicit expirations at least 30 minutes
  -- in the future. The Boatly resource hold lasts 35 minutes so provider
  -- session creation latency cannot create a gap in inventory protection.
  v_hold_expires_at := pg_catalog.now() + interval '35 minutes';

  insert into public.boat_occupancies (
    operator_id,
    boat_id,
    occupancy_type,
    starts_at,
    ends_at,
    hold_expires_at,
    title,
    notes,
    is_active,
    created_by,
    booking_id
  )
  values (
    v_boat.operator_id,
    v_boat.id,
    'HOLD'::public.boat_occupancy_type,
    p_starts_at,
    p_ends_at,
    v_hold_expires_at,
    'Checkout ' || v_reference,
    'Temporary marketplace checkout hold',
    true,
    v_user_id,
    v_booking_id
  )
  returning id into v_hold_id;

  insert into public.legal_acceptances (
    legal_document_version_id,
    user_id,
    context,
    operator_id,
    booking_id,
    acceptance_text_snapshot,
    evidence
  )
  values (
    v_terms.id,
    v_user_id,
    'BOOKING'::public.legal_acceptance_context,
    v_boat.operator_id,
    v_booking_id,
    'Accetto ' || v_terms.title || ' - versione ' || v_terms.version,
    jsonb_build_object(
      'source', 'MARKETPLACE_CHECKOUT',
      'document_key', v_terms.document_key,
      'version', v_terms.version,
      'content_hash_sha256', v_terms.content_hash_sha256,
      'accepted_server_at', pg_catalog.now()
    )
  );

  insert into public.booking_events (
    operator_id,
    booking_id,
    event_type,
    actor_type,
    actor_user_id,
    from_status,
    to_status,
    message,
    metadata
  )
  values (
    v_boat.operator_id,
    v_booking_id,
    'MARKETPLACE_CHECKOUT_STARTED',
    'CUSTOMER'::public.booking_event_actor_type,
    v_user_id,
    null,
    'PENDING_PAYMENT'::public.booking_status,
    'Marketplace checkout started and temporary hold created.',
    jsonb_build_object(
      'hold_id', v_hold_id,
      'hold_expires_at', v_hold_expires_at,
      'checkout_idempotency_key', p_checkout_idempotency_key
    )
  );

  return jsonb_build_object(
    'booking_id', v_booking_id,
    'reference', v_reference,
    'hold_id', v_hold_id,
    'hold_expires_at', v_hold_expires_at,
    'customer_total_cents', v_customer_total,
    'currency', v_boat.currency,
    'idempotent_replay', false
  );

exception
  when exclusion_violation then
    raise exception using
      errcode = '23P01',
      message = 'slot_not_available';
end;
$$;


-- ============================================================
-- PAYMENT SETUP FOR THE AUTHENTICATED BOOKING CUSTOMER
-- ============================================================

create or replace function public.get_marketplace_payment_setup(
  p_booking_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_booking record;
  v_account record;
  v_hold record;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'authentication_required';
  end if;

  select
    b.id,
    b.operator_id,
    b.reference,
    b.status,
    b.customer_user_id,
    b.customer_total_cents_snapshot,
    b.commission_amount_cents_snapshot,
    b.currency_snapshot,
    b.boat_snapshot
  into v_booking
  from public.bookings b
  where b.id = p_booking_id
    and b.customer_user_id = v_user_id
    and b.source = 'MARKETPLACE'::public.booking_source;

  if not found then
    raise exception using
      errcode = '42501',
      message = 'booking_not_accessible';
  end if;

  if v_booking.status not in (
    'PENDING_PAYMENT'::public.booking_status,
    'PAYMENT_PROCESSING'::public.booking_status
  ) then
    raise exception using
      errcode = '22023',
      message = 'booking_not_payable';
  end if;

  select
    bo.id,
    bo.hold_expires_at
  into v_hold
  from public.boat_occupancies bo
  where bo.booking_id = v_booking.id
    and bo.occupancy_type = 'HOLD'::public.boat_occupancy_type
    and bo.is_active = true
    and bo.hold_expires_at > pg_catalog.now();

  if not found then
    raise exception using
      errcode = '22023',
      message = 'booking_hold_expired';
  end if;

  select
    sca.id,
    sca.stripe_account_id
  into v_account
  from public.stripe_connected_accounts sca
  where sca.operator_id = v_booking.operator_id
    and sca.status = 'ACTIVE'::public.stripe_connected_account_status
    and sca.charges_enabled = true
    and sca.payouts_enabled = true
    and sca.details_submitted = true;

  if not found then
    raise exception using
      errcode = '22023',
      message = 'stripe_account_not_ready';
  end if;

  return jsonb_build_object(
    'booking_id', v_booking.id,
    'operator_id', v_booking.operator_id,
    'reference', v_booking.reference,
    'amount_cents', v_booking.customer_total_cents_snapshot,
    'platform_fee_cents', v_booking.commission_amount_cents_snapshot,
    'currency', lower(v_booking.currency_snapshot),
    'boat_name', v_booking.boat_snapshot ->> 'name',
    'stripe_connected_account_row_id', v_account.id,
    'stripe_account_id', v_account.stripe_account_id,
    'hold_expires_at', v_hold.hold_expires_at
  );
end;
$$;


-- ============================================================
-- ABANDON CHECKOUT AFTER PROVIDER CREATION FAILURE
-- ============================================================

create or replace function public.abandon_marketplace_booking_checkout(
  p_booking_id uuid,
  p_reason text default 'CHECKOUT_CREATION_FAILED'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_booking record;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'authentication_required';
  end if;

  select b.*
  into v_booking
  from public.bookings b
  where b.id = p_booking_id
    and b.customer_user_id = v_user_id
    and b.source = 'MARKETPLACE'::public.booking_source
  for update;

  if not found then
    raise exception using
      errcode = '42501',
      message = 'booking_not_accessible';
  end if;

  if v_booking.status not in (
    'PENDING_PAYMENT'::public.booking_status,
    'PAYMENT_PROCESSING'::public.booking_status
  ) then
    return;
  end if;

  update public.boat_occupancies
  set
    is_active = false,
    released_at = pg_catalog.now(),
    released_by = v_user_id,
    release_reason = left(coalesce(nullif(pg_catalog.btrim(p_reason), ''), 'CHECKOUT_ABANDONED'), 250)
  where booking_id = v_booking.id
    and occupancy_type = 'HOLD'::public.boat_occupancy_type
    and is_active = true;

  update public.bookings
  set status = 'PAYMENT_FAILED'::public.booking_status
  where id = v_booking.id;

  insert into public.booking_events (
    operator_id,
    booking_id,
    event_type,
    actor_type,
    actor_user_id,
    from_status,
    to_status,
    message,
    metadata
  )
  values (
    v_booking.operator_id,
    v_booking.id,
    'MARKETPLACE_CHECKOUT_ABANDONED',
    'SYSTEM'::public.booking_event_actor_type,
    null,
    v_booking.status,
    'PAYMENT_FAILED'::public.booking_status,
    'Checkout was abandoned before a successful provider confirmation.',
    jsonb_build_object('reason', p_reason)
  );
end;
$$;


-- ============================================================
-- SERVICE-ROLE STRIPE EVENT PROCESSOR
-- ============================================================

create or replace function public.process_marketplace_stripe_event(
  p_stripe_event_row_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event public.stripe_events%rowtype;
  v_object jsonb;
  v_booking_id uuid;
  v_booking public.bookings%rowtype;
  v_connected_account public.stripe_connected_accounts%rowtype;
  v_session_id text;
  v_payment_intent_id text;
  v_payment_status text;
  v_amount_total integer;
  v_currency text;
  v_hold public.boat_occupancies%rowtype;
  v_payment_id uuid;
begin
  select *
  into v_event
  from public.stripe_events se
  where se.id = p_stripe_event_row_id
  for update;

  if not found then
    raise exception using
      errcode = '22023',
      message = 'stripe_event_not_found';
  end if;

  if v_event.signature_verified = false then
    raise exception using
      errcode = '42501',
      message = 'stripe_event_not_verified';
  end if;

  if v_event.processing_status = 'PROCESSED'::public.stripe_event_processing_status then
    return jsonb_build_object('processed', true, 'idempotent_replay', true);
  end if;

  update public.stripe_events
  set
    processing_status = 'PROCESSING'::public.stripe_event_processing_status,
    processing_attempt_count = processing_attempt_count + 1,
    last_error = null
  where id = v_event.id;

  if v_event.event_type not in (
    'checkout.session.completed',
    'checkout.session.async_payment_succeeded',
    'checkout.session.async_payment_failed',
    'checkout.session.expired'
  ) then
    update public.stripe_events
    set
      processing_status = 'IGNORED'::public.stripe_event_processing_status,
      processed_at = pg_catalog.now()
    where id = v_event.id;

    return jsonb_build_object('processed', true, 'ignored', true);
  end if;

  v_object := v_event.payload #> '{data,object}';
  v_session_id := nullif(v_object ->> 'id', '');
  v_payment_intent_id := nullif(v_object ->> 'payment_intent', '');
  v_payment_status := nullif(v_object ->> 'payment_status', '');
  v_currency := upper(coalesce(v_object ->> 'currency', 'EUR'));

  if coalesce(v_object ->> 'amount_total', '') ~ '^[0-9]+$' then
    v_amount_total := (v_object ->> 'amount_total')::integer;
  end if;

  if coalesce(v_object #>> '{metadata,booking_id}', '') !~
    '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  then
    update public.stripe_events
    set
      processing_status = 'FAILED'::public.stripe_event_processing_status,
      last_error = 'booking_id metadata missing or invalid'
    where id = v_event.id;

    raise exception using
      errcode = '22023',
      message = 'stripe_booking_metadata_invalid';
  end if;

  v_booking_id := (v_object #>> '{metadata,booking_id}')::uuid;

  select *
  into v_booking
  from public.bookings b
  where b.id = v_booking_id
    and b.source = 'MARKETPLACE'::public.booking_source
  for update;

  if not found then
    update public.stripe_events
    set
      processing_status = 'FAILED'::public.stripe_event_processing_status,
      last_error = 'booking not found'
    where id = v_event.id;

    raise exception using
      errcode = '22023',
      message = 'stripe_booking_not_found';
  end if;

  select *
  into v_connected_account
  from public.stripe_connected_accounts sca
  where sca.operator_id = v_booking.operator_id;

  if not found then
    update public.stripe_events
    set
      processing_status = 'FAILED'::public.stripe_event_processing_status,
      last_error = 'connected account not found'
    where id = v_event.id;

    raise exception using
      errcode = '22023',
      message = 'stripe_connected_account_not_found';
  end if;

  if v_session_id is not null then
    update public.payment_checkout_sessions
    set
      provider_payment_intent_id = coalesce(v_payment_intent_id, provider_payment_intent_id),
      status = case
        when v_event.event_type in (
          'checkout.session.completed',
          'checkout.session.async_payment_succeeded'
        ) then 'COMPLETE'
        when v_event.event_type = 'checkout.session.expired' then 'EXPIRED'
        else 'FAILED'
      end,
      provider_state_snapshot = v_object
    where provider_session_id = v_session_id;
  end if;

  if v_event.event_type in (
    'checkout.session.expired',
    'checkout.session.async_payment_failed'
  ) then
    if v_booking.status in (
      'PENDING_PAYMENT'::public.booking_status,
      'PAYMENT_PROCESSING'::public.booking_status
    ) then
      update public.boat_occupancies
      set
        is_active = false,
        released_at = pg_catalog.now(),
        release_reason = case
          when v_event.event_type = 'checkout.session.expired'
          then 'CHECKOUT_EXPIRED'
          else 'PAYMENT_FAILED'
        end
      where booking_id = v_booking.id
        and occupancy_type = 'HOLD'::public.boat_occupancy_type
        and is_active = true;

      update public.bookings
      set status = 'PAYMENT_FAILED'::public.booking_status
      where id = v_booking.id;

      insert into public.booking_events (
        operator_id,
        booking_id,
        event_type,
        actor_type,
        from_status,
        to_status,
        message,
        metadata
      )
      values (
        v_booking.operator_id,
        v_booking.id,
        'PAYMENT_FAILED_OR_EXPIRED',
        'SYSTEM'::public.booking_event_actor_type,
        v_booking.status,
        'PAYMENT_FAILED'::public.booking_status,
        'Stripe checkout expired or payment failed.',
        jsonb_build_object('stripe_event_id', v_event.stripe_event_id)
      );
    end if;

    update public.stripe_events
    set
      processing_status = 'PROCESSED'::public.stripe_event_processing_status,
      processed_at = pg_catalog.now()
    where id = v_event.id;

    return jsonb_build_object('processed', true, 'booking_id', v_booking.id, 'result', 'payment_failed');
  end if;

  if v_payment_status <> 'paid' then
    update public.bookings
    set status = 'PAYMENT_PROCESSING'::public.booking_status
    where id = v_booking.id
      and status = 'PENDING_PAYMENT'::public.booking_status;

    update public.stripe_events
    set
      processing_status = 'PROCESSED'::public.stripe_event_processing_status,
      processed_at = pg_catalog.now()
    where id = v_event.id;

    return jsonb_build_object('processed', true, 'booking_id', v_booking.id, 'result', 'payment_processing');
  end if;

  if v_payment_intent_id is null or v_amount_total is null then
    update public.stripe_events
    set
      processing_status = 'FAILED'::public.stripe_event_processing_status,
      last_error = 'paid checkout missing payment intent or amount'
    where id = v_event.id;

    raise exception using
      errcode = '22023',
      message = 'stripe_paid_session_incomplete';
  end if;

  if v_amount_total <> v_booking.customer_total_cents_snapshot
     or v_currency <> v_booking.currency_snapshot
  then
    insert into public.payments (
      operator_id,
      booking_id,
      stripe_connected_account_id,
      provider,
      purpose,
      provider_payment_intent_id,
      provider_create_idempotency_key,
      amount_cents,
      currency,
      status,
      amount_received_cents,
      platform_fee_cents,
      reconciliation_status,
      reconciliation_note,
      provider_status_raw,
      provider_state_snapshot,
      succeeded_via_stripe_event_id,
      last_stripe_event_id,
      succeeded_at
    )
    values (
      v_booking.operator_id,
      v_booking.id,
      v_connected_account.id,
      'STRIPE'::public.payment_provider,
      'BOOKING_PAYMENT'::public.payment_purpose,
      v_payment_intent_id,
      'stripe-checkout:' || v_booking.id::text || ':' || v_payment_intent_id,
      greatest(v_amount_total, 1),
      v_currency,
      'SUCCEEDED'::public.payment_status,
      greatest(v_amount_total, 0),
      greatest(coalesce(v_booking.commission_amount_cents_snapshot, 0), 0),
      'MISMATCH'::public.financial_reconciliation_status,
      'Stripe amount or currency differs from immutable Boatly booking snapshot.',
      v_payment_status,
      v_object,
      v_event.id,
      v_event.id,
      pg_catalog.now()
    )
    on conflict (provider_payment_intent_id)
    do update set
      amount_received_cents = excluded.amount_received_cents,
      status = 'SUCCEEDED'::public.payment_status,
      platform_fee_cents = excluded.platform_fee_cents,
      reconciliation_status = 'MISMATCH'::public.financial_reconciliation_status,
      reconciliation_note = excluded.reconciliation_note,
      provider_status_raw = excluded.provider_status_raw,
      provider_state_snapshot = excluded.provider_state_snapshot,
      succeeded_via_stripe_event_id = excluded.succeeded_via_stripe_event_id,
      last_stripe_event_id = excluded.last_stripe_event_id,
      succeeded_at = coalesce(public.payments.succeeded_at, excluded.succeeded_at);

    update public.boat_occupancies
    set
      is_active = false,
      released_at = pg_catalog.now(),
      release_reason = 'PAYMENT_RECONCILIATION_MISMATCH'
    where booking_id = v_booking.id
      and occupancy_type = 'HOLD'::public.boat_occupancy_type
      and is_active = true;

    if v_booking.status in (
      'PENDING_PAYMENT'::public.booking_status,
      'PAYMENT_PROCESSING'::public.booking_status,
      'PAYMENT_FAILED'::public.booking_status
    ) then
      update public.bookings
      set
        status = 'REFUND_PENDING'::public.booking_status,
        cancelled_at = coalesce(cancelled_at, pg_catalog.now())
      where id = v_booking.id;
    end if;

    insert into public.booking_events (
      operator_id,
      booking_id,
      event_type,
      actor_type,
      from_status,
      to_status,
      message,
      metadata
    )
    values (
      v_booking.operator_id,
      v_booking.id,
      'PAYMENT_AMOUNT_MISMATCH',
      'SYSTEM'::public.booking_event_actor_type,
      v_booking.status,
      case
        when v_booking.status in (
          'PENDING_PAYMENT'::public.booking_status,
          'PAYMENT_PROCESSING'::public.booking_status,
          'PAYMENT_FAILED'::public.booking_status
        )
        then 'REFUND_PENDING'::public.booking_status
        else v_booking.status
      end,
      'Verified Stripe payment did not match the immutable Boatly booking amount or currency.',
      jsonb_build_object(
        'stripe_event_id', v_event.stripe_event_id,
        'payment_intent_id', v_payment_intent_id,
        'provider_amount_cents', v_amount_total,
        'provider_currency', v_currency,
        'booking_amount_cents', v_booking.customer_total_cents_snapshot,
        'booking_currency', v_booking.currency_snapshot
      )
    );

    update public.stripe_events
    set
      processing_status = 'PROCESSED'::public.stripe_event_processing_status,
      processed_at = pg_catalog.now()
    where id = v_event.id;

    return jsonb_build_object('processed', true, 'booking_id', v_booking.id, 'result', 'reconciliation_mismatch');
  end if;

  select *
  into v_hold
  from public.boat_occupancies bo
  where bo.booking_id = v_booking.id
    and bo.occupancy_type = 'HOLD'::public.boat_occupancy_type
    and bo.is_active = true
  for update;

  insert into public.payments (
    operator_id,
    booking_id,
    stripe_connected_account_id,
    provider,
    purpose,
    provider_payment_intent_id,
    provider_create_idempotency_key,
    amount_cents,
    currency,
    status,
    amount_received_cents,
    platform_fee_cents,
    reconciliation_status,
    provider_status_raw,
    provider_state_snapshot,
    succeeded_via_stripe_event_id,
    last_stripe_event_id,
    succeeded_at
  )
  values (
    v_booking.operator_id,
    v_booking.id,
    v_connected_account.id,
    'STRIPE'::public.payment_provider,
    'BOOKING_PAYMENT'::public.payment_purpose,
    v_payment_intent_id,
    'stripe-checkout:' || v_booking.id::text || ':' || v_payment_intent_id,
    v_amount_total,
    v_currency,
    'SUCCEEDED'::public.payment_status,
    v_amount_total,
    v_booking.commission_amount_cents_snapshot,
    case
      when v_booking.status in (
        'PENDING_PAYMENT'::public.booking_status,
        'PAYMENT_PROCESSING'::public.booking_status
      )
      and v_hold.id is not null
      and v_hold.hold_expires_at > pg_catalog.now()
      then 'MATCHED'::public.financial_reconciliation_status
      else 'MISMATCH'::public.financial_reconciliation_status
    end,
    v_payment_status,
    v_object,
    v_event.id,
    v_event.id,
    pg_catalog.now()
  )
  on conflict (provider_payment_intent_id)
  do update set
    amount_received_cents = excluded.amount_received_cents,
    status = 'SUCCEEDED'::public.payment_status,
    platform_fee_cents = excluded.platform_fee_cents,
    reconciliation_status = excluded.reconciliation_status,
    provider_status_raw = excluded.provider_status_raw,
    provider_state_snapshot = excluded.provider_state_snapshot,
    succeeded_via_stripe_event_id = excluded.succeeded_via_stripe_event_id,
    last_stripe_event_id = excluded.last_stripe_event_id,
    succeeded_at = coalesce(public.payments.succeeded_at, excluded.succeeded_at)
  returning id into v_payment_id;

  if v_booking.status in (
      'PENDING_PAYMENT'::public.booking_status,
      'PAYMENT_PROCESSING'::public.booking_status
    )
    and v_hold.id is not null
    and v_hold.hold_expires_at > pg_catalog.now()
  then
    update public.boat_occupancies
    set
      occupancy_type = 'BOOKING'::public.boat_occupancy_type,
      hold_expires_at = null,
      title = 'Prenotazione ' || v_booking.reference,
      notes = 'Confirmed marketplace booking'
    where id = v_hold.id;

    update public.bookings
    set status = 'CONFIRMED'::public.booking_status
    where id = v_booking.id;

    insert into public.booking_events (
      operator_id,
      booking_id,
      event_type,
      actor_type,
      from_status,
      to_status,
      message,
      metadata
    )
    values (
      v_booking.operator_id,
      v_booking.id,
      'PAYMENT_CONFIRMED_BY_STRIPE',
      'SYSTEM'::public.booking_event_actor_type,
      v_booking.status,
      'CONFIRMED'::public.booking_status,
      'Verified Stripe checkout event confirmed the booking.',
      jsonb_build_object(
        'stripe_event_id', v_event.stripe_event_id,
        'payment_id', v_payment_id,
        'payment_intent_id', v_payment_intent_id
      )
    );

    update public.stripe_events
    set
      processing_status = 'PROCESSED'::public.stripe_event_processing_status,
      processed_at = pg_catalog.now()
    where id = v_event.id;

    return jsonb_build_object('processed', true, 'booking_id', v_booking.id, 'result', 'confirmed');
  end if;

  -- A successful provider payment arrived after the Boatly hold was
  -- lost/expired or after the booking left the payable lifecycle.
  -- Never resurrect the booking automatically.
  update public.payments
  set
    reconciliation_status = 'MISMATCH'::public.financial_reconciliation_status,
    reconciliation_note = 'Successful Stripe payment arrived without a valid active Boatly checkout hold.'
  where id = v_payment_id;

  if v_booking.status in (
    'PENDING_PAYMENT'::public.booking_status,
    'PAYMENT_PROCESSING'::public.booking_status,
    'PAYMENT_FAILED'::public.booking_status
  ) then
    update public.bookings
    set
      status = 'REFUND_PENDING'::public.booking_status,
      cancelled_at = coalesce(cancelled_at, pg_catalog.now())
    where id = v_booking.id;
  end if;

  insert into public.booking_events (
    operator_id,
    booking_id,
    event_type,
    actor_type,
    from_status,
    to_status,
    message,
    metadata
  )
  values (
    v_booking.operator_id,
    v_booking.id,
    'LATE_PAYMENT_REQUIRES_RECONCILIATION',
    'SYSTEM'::public.booking_event_actor_type,
    v_booking.status,
    case
      when v_booking.status in (
        'PENDING_PAYMENT'::public.booking_status,
        'PAYMENT_PROCESSING'::public.booking_status,
        'PAYMENT_FAILED'::public.booking_status
      )
      then 'REFUND_PENDING'::public.booking_status
      else v_booking.status
    end,
    'A verified Stripe payment arrived after the checkout hold was no longer valid.',
    jsonb_build_object(
      'stripe_event_id', v_event.stripe_event_id,
      'payment_id', v_payment_id,
      'payment_intent_id', v_payment_intent_id
    )
  );

  update public.stripe_events
  set
    processing_status = 'PROCESSED'::public.stripe_event_processing_status,
    processed_at = pg_catalog.now()
  where id = v_event.id;

  return jsonb_build_object('processed', true, 'booking_id', v_booking.id, 'result', 'late_payment_reconciliation');

exception
  when others then
    update public.stripe_events
    set
      processing_status = 'FAILED'::public.stripe_event_processing_status,
      last_error = sqlerrm
    where id = p_stripe_event_row_id;

    return jsonb_build_object(
      'processed', false,
      'error', sqlerrm
    );
end;
$$;


-- ============================================================
-- CUSTOMER BOOKING PROJECTION
-- ============================================================

create or replace function public.customer_bookings()
returns setof jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_strip_nulls(
    jsonb_build_object(
      'id', b.id,
      'reference', b.reference,
      'status', b.status,
      'starts_at', b.starts_at,
      'ends_at', b.ends_at,
      'passenger_count', b.passenger_count,
      'currency', b.currency_snapshot,
      'customer_total_cents', b.customer_total_cents_snapshot,
      'boat', b.boat_snapshot,
      'location', b.pickup_location_snapshot,
      'legal_offering', b.legal_offering_snapshot,
      'created_at', b.created_at,
      'confirmed_at', b.confirmed_at,
      'cancelled_at', b.cancelled_at,
      'has_pending_cancellation_request', exists (
        select 1
        from public.booking_cancellation_requests bcr
        where bcr.booking_id = b.id
          and bcr.status = 'PENDING'::public.booking_cancellation_request_status
      )
    )
  )
  from public.bookings b
  where b.customer_user_id = auth.uid()
  order by b.starts_at desc, b.created_at desc;
$$;


create or replace function public.customer_booking_detail(
  p_booking_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_booking public.bookings%rowtype;
  v_extras jsonb;
  v_price_items jsonb;
  v_cancellation_request jsonb;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'authentication_required';
  end if;

  select *
  into v_booking
  from public.bookings b
  where b.id = p_booking_id
    and b.customer_user_id = v_user_id;

  if not found then
    raise exception using
      errcode = '42501',
      message = 'booking_not_accessible';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', be.id,
        'name', be.extra_name_snapshot,
        'pricing_unit', be.pricing_unit_snapshot,
        'quantity', be.quantity,
        'unit_price_cents', be.unit_price_cents,
        'total_price_cents', be.total_price_cents
      )
      order by be.created_at, be.id
    ),
    '[]'::jsonb
  )
  into v_extras
  from public.booking_extras be
  where be.booking_id = v_booking.id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', bpi.id,
        'type', bpi.item_type,
        'label', bpi.label,
        'quantity', bpi.quantity,
        'unit_amount_cents', bpi.unit_amount_cents,
        'amount_cents', bpi.amount_cents
      )
      order by bpi.sort_order, bpi.created_at, bpi.id
    ),
    '[]'::jsonb
  )
  into v_price_items
  from public.booking_price_items bpi
  where bpi.booking_id = v_booking.id;

  select jsonb_build_object(
    'id', bcr.id,
    'status', bcr.status,
    'reason', bcr.reason,
    'estimated_refund_cents', bcr.estimated_refund_cents,
    'currency', bcr.currency,
    'requested_at', bcr.requested_at,
    'resolved_at', bcr.resolved_at,
    'resolution_note', bcr.resolution_note
  )
  into v_cancellation_request
  from public.booking_cancellation_requests bcr
  where bcr.booking_id = v_booking.id
  order by bcr.created_at desc
  limit 1;

  return jsonb_strip_nulls(
    jsonb_build_object(
      'id', v_booking.id,
      'reference', v_booking.reference,
      'status', v_booking.status,
      'source', v_booking.source,
      'starts_at', v_booking.starts_at,
      'ends_at', v_booking.ends_at,
      'passenger_count', v_booking.passenger_count,
      'driver_is_customer', v_booking.driver_is_customer,
      'customer_note', v_booking.customer_note,
      'currency', v_booking.currency_snapshot,
      'rental_subtotal_cents', v_booking.rental_subtotal_cents_snapshot,
      'extras_total_cents', v_booking.extras_total_cents_snapshot,
      'discount_total_cents', v_booking.discount_total_cents_snapshot,
      'tax_total_cents', v_booking.tax_total_cents_snapshot,
      'customer_total_cents', v_booking.customer_total_cents_snapshot,
      'security_deposit_cents', v_booking.security_deposit_cents_snapshot,
      'customer', v_booking.customer_snapshot,
      'boat', v_booking.boat_snapshot,
      'legal_offering', v_booking.legal_offering_snapshot,
      'location', v_booking.pickup_location_snapshot,
      'driver_eligibility', v_booking.driver_eligibility_snapshot,
      'cancellation_policy', v_booking.cancellation_policy_snapshot,
      'pricing', v_booking.pricing_snapshot,
      'extras', v_extras,
      'price_items', v_price_items,
      'cancellation_request', v_cancellation_request,
      'created_at', v_booking.created_at,
      'confirmed_at', v_booking.confirmed_at,
      'cancelled_at', v_booking.cancelled_at
    )
  );
end;
$$;


-- ============================================================
-- CUSTOMER CANCELLATION REQUEST
-- ============================================================

create or replace function public.request_customer_booking_cancellation(
  p_booking_id uuid,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_booking public.bookings%rowtype;
  v_hours_before bigint;
  v_rule jsonb;
  v_refund_bps integer := 0;
  v_fee_cents integer := 0;
  v_estimated_refund integer := 0;
  v_request_id uuid;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'authentication_required';
  end if;

  select *
  into v_booking
  from public.bookings b
  where b.id = p_booking_id
    and b.customer_user_id = v_user_id
  for update;

  if not found then
    raise exception using
      errcode = '42501',
      message = 'booking_not_accessible';
  end if;

  if v_booking.status <> 'CONFIRMED'::public.booking_status then
    raise exception using
      errcode = '22023',
      message = 'booking_not_cancellable';
  end if;

  if v_booking.starts_at <= pg_catalog.now() then
    raise exception using
      errcode = '22023',
      message = 'booking_already_started';
  end if;

  if exists (
    select 1
    from public.booking_cancellation_requests bcr
    where bcr.booking_id = v_booking.id
      and bcr.status = 'PENDING'::public.booking_cancellation_request_status
  ) then
    raise exception using
      errcode = '23505',
      message = 'cancellation_request_already_pending';
  end if;

  v_hours_before := greatest(
    0,
    floor(extract(epoch from (v_booking.starts_at - pg_catalog.now())) / 3600)::bigint
  );

  select rule
  into v_rule
  from jsonb_array_elements(
    coalesce(v_booking.cancellation_policy_snapshot -> 'rules', '[]'::jsonb)
  ) rule
  where coalesce(rule ->> 'min_hours_before_start', '') ~ '^[0-9]+$'
    and (rule ->> 'min_hours_before_start')::bigint <= v_hours_before
    and (
      rule ->> 'max_hours_before_start' is null
      or rule ->> 'max_hours_before_start' = ''
      or (
        (rule ->> 'max_hours_before_start') ~ '^[0-9]+$'
        and v_hours_before < (rule ->> 'max_hours_before_start')::bigint
      )
    )
  order by (rule ->> 'min_hours_before_start')::bigint desc
  limit 1;

  if v_rule is not null then
    v_refund_bps := coalesce((v_rule ->> 'refund_bps')::integer, 0);
    v_fee_cents := coalesce((v_rule ->> 'cancellation_fee_cents')::integer, 0);
  end if;

  v_estimated_refund := greatest(
    0,
    round(
      v_booking.customer_total_cents_snapshot * v_refund_bps::numeric / 10000
    )::integer - v_fee_cents
  );

  insert into public.booking_cancellation_requests (
    operator_id,
    booking_id,
    customer_user_id,
    status,
    reason,
    estimated_refund_cents,
    currency,
    policy_snapshot
  )
  values (
    v_booking.operator_id,
    v_booking.id,
    v_user_id,
    'PENDING'::public.booking_cancellation_request_status,
    nullif(pg_catalog.btrim(coalesce(p_reason, '')), ''),
    v_estimated_refund,
    v_booking.currency_snapshot,
    v_booking.cancellation_policy_snapshot
  )
  returning id into v_request_id;

  insert into public.booking_events (
    operator_id,
    booking_id,
    event_type,
    actor_type,
    actor_user_id,
    from_status,
    to_status,
    message,
    metadata
  )
  values (
    v_booking.operator_id,
    v_booking.id,
    'CUSTOMER_CANCELLATION_REQUESTED',
    'CUSTOMER'::public.booking_event_actor_type,
    v_user_id,
    v_booking.status,
    v_booking.status,
    'Customer requested booking cancellation.',
    jsonb_build_object(
      'cancellation_request_id', v_request_id,
      'estimated_refund_cents', v_estimated_refund,
      'refund_bps', v_refund_bps,
      'cancellation_fee_cents', v_fee_cents,
      'hours_before_start', v_hours_before
    )
  );

  return jsonb_build_object(
    'request_id', v_request_id,
    'estimated_refund_cents', v_estimated_refund,
    'currency', v_booking.currency_snapshot,
    'status', 'PENDING'
  );
end;
$$;


-- ============================================================
-- PRIVILEGES
-- ============================================================

revoke execute
on function public.marketplace_checkout_options(text,date,integer)
from public, anon;
grant execute
on function public.marketplace_checkout_options(text,date,integer)
to authenticated;

revoke execute
on function public.create_marketplace_booking_hold(
  text,uuid,uuid,timestamptz,timestamptz,integer,text,text,text,date,boolean,boolean,text,jsonb,boolean,uuid
)
from public, anon;
grant execute
on function public.create_marketplace_booking_hold(
  text,uuid,uuid,timestamptz,timestamptz,integer,text,text,text,date,boolean,boolean,text,jsonb,boolean,uuid
)
to authenticated;

revoke execute
on function public.get_marketplace_payment_setup(uuid)
from public, anon;
grant execute
on function public.get_marketplace_payment_setup(uuid)
to authenticated;

revoke execute
on function public.abandon_marketplace_booking_checkout(uuid,text)
from public, anon;
grant execute
on function public.abandon_marketplace_booking_checkout(uuid,text)
to authenticated;

revoke execute
on function public.process_marketplace_stripe_event(uuid)
from public, anon, authenticated;
grant execute
on function public.process_marketplace_stripe_event(uuid)
to service_role;

revoke execute
on function public.customer_bookings()
from public, anon;
grant execute
on function public.customer_bookings()
to authenticated;

revoke execute
on function public.customer_booking_detail(uuid)
from public, anon;
grant execute
on function public.customer_booking_detail(uuid)
to authenticated;

revoke execute
on function public.request_customer_booking_cancellation(uuid,text)
from public, anon;
grant execute
on function public.request_customer_booking_cancellation(uuid,text)
to authenticated;

-- Browser writes remain behind trusted RPC workflows.
revoke insert, update, delete
on table public.bookings,
  public.booking_extras,
  public.booking_price_items,
  public.booking_events,
  public.legal_acceptances
from public, anon, authenticated;

commit;
