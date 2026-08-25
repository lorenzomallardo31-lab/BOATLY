-- ============================================================
-- BOATLY
-- Migration: Verification & Compliance Foundation
-- ============================================================
--
-- Purpose:
--   Create controlled review workflows for:
--
--   - professional operator verification;
--   - boat marketplace publication review;
--   - individual compliance checklist results.
--
-- Important:
--   - operator ACTIVE status is not inferred merely from having
--     uploaded documents;
--   - boat ACTIVE status is not equivalent to marketplace
--     publication approval;
--   - review history is preserved;
--   - compliance decisions remain separate from raw documents.
--
-- Security:
--   RLS enabled immediately.
--   Authorization policies remain deferred to C6.
-- ============================================================

begin;


-- ============================================================
-- ENUM TYPES
-- ============================================================

create type public.verification_review_status as enum (
  'PENDING',
  'IN_REVIEW',
  'NEEDS_CHANGES',
  'APPROVED',
  'REJECTED',
  'WITHDRAWN'
);


create type public.compliance_check_status as enum (
  'PENDING',
  'PASSED',
  'FAILED',
  'WAIVED',
  'NOT_APPLICABLE'
);


-- ============================================================
-- OPERATOR VERIFICATIONS
-- ============================================================
--
-- Each row represents one verification submission/review cycle.
--
-- submission_snapshot preserves the state submitted for review.
-- ============================================================

create table public.operator_verifications (
  id uuid primary key default gen_random_uuid(),

  operator_id uuid not null
    references public.operators(id)
    on delete cascade,

  status public.verification_review_status
    not null default 'PENDING',

  submission_snapshot jsonb not null,

  submitted_by uuid
    references auth.users(id)
    on delete set null,

  submitted_at timestamptz not null default now(),

  reviewed_by uuid
    references auth.users(id)
    on delete set null,

  reviewed_at timestamptz,

  decision_note text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint operator_verifications_snapshot_object
    check (
      jsonb_typeof(submission_snapshot) = 'object'
    ),

  constraint operator_verifications_review_consistency
    check (
      (
        status in (
          'NEEDS_CHANGES',
          'APPROVED',
          'REJECTED'
        )
        and reviewed_by is not null
        and reviewed_at is not null
      )
      or
      (
        status not in (
          'NEEDS_CHANGES',
          'APPROVED',
          'REJECTED'
        )
      )
    ),

  constraint operator_verifications_decision_note
    check (
      status not in (
        'NEEDS_CHANGES',
        'REJECTED'
      )
      or (
        decision_note is not null
        and length(trim(decision_note)) > 0
      )
    ),

  constraint operator_verifications_note_not_blank
    check (
      decision_note is null
      or length(trim(decision_note)) > 0
    ),

  constraint operator_verifications_operator_id_id_unique
    unique (
      operator_id,
      id
    )
);


create index operator_verifications_operator_idx
  on public.operator_verifications(operator_id);


create index operator_verifications_status_idx
  on public.operator_verifications(status);


create unique index operator_verifications_one_open_review_idx
  on public.operator_verifications(operator_id)
  where status in (
    'PENDING',
    'IN_REVIEW',
    'NEEDS_CHANGES'
  );


create trigger operator_verifications_set_updated_at
before update on public.operator_verifications
for each row
execute function public.set_updated_at();


-- ============================================================
-- BOAT PUBLICATION REVIEWS
-- ============================================================
--
-- Separate from boats.status.
--
-- A boat may therefore be ACTIVE as an operator fleet asset
-- while still not being approved for marketplace publication.
-- ============================================================

create table public.boat_publication_reviews (
  id uuid primary key default gen_random_uuid(),

  operator_id uuid not null,

  boat_id uuid not null,

  status public.verification_review_status
    not null default 'PENDING',

  submission_snapshot jsonb not null,

  submitted_by uuid
    references auth.users(id)
    on delete set null,

  submitted_at timestamptz not null default now(),

  reviewed_by uuid
    references auth.users(id)
    on delete set null,

  reviewed_at timestamptz,

  decision_note text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint boat_publication_reviews_boat_operator_fk
    foreign key (
      operator_id,
      boat_id
    )
    references public.boats(
      operator_id,
      id
    )
    on delete cascade,

  constraint boat_publication_reviews_snapshot_object
    check (
      jsonb_typeof(submission_snapshot) = 'object'
    ),

  constraint boat_publication_reviews_review_consistency
    check (
      (
        status in (
          'NEEDS_CHANGES',
          'APPROVED',
          'REJECTED'
        )
        and reviewed_by is not null
        and reviewed_at is not null
      )
      or
      (
        status not in (
          'NEEDS_CHANGES',
          'APPROVED',
          'REJECTED'
        )
      )
    ),

  constraint boat_publication_reviews_decision_note
    check (
      status not in (
        'NEEDS_CHANGES',
        'REJECTED'
      )
      or (
        decision_note is not null
        and length(trim(decision_note)) > 0
      )
    ),

  constraint boat_publication_reviews_note_not_blank
    check (
      decision_note is null
      or length(trim(decision_note)) > 0
    ),

  constraint boat_publication_reviews_operator_id_id_unique
    unique (
      operator_id,
      id
    )
);


create index boat_publication_reviews_operator_idx
  on public.boat_publication_reviews(operator_id);


create index boat_publication_reviews_boat_idx
  on public.boat_publication_reviews(boat_id);


create index boat_publication_reviews_status_idx
  on public.boat_publication_reviews(status);


create unique index boat_publication_reviews_one_open_review_idx
  on public.boat_publication_reviews(boat_id)
  where status in (
    'PENDING',
    'IN_REVIEW',
    'NEEDS_CHANGES'
  );


create trigger boat_publication_reviews_set_updated_at
before update on public.boat_publication_reviews
for each row
execute function public.set_updated_at();


-- ============================================================
-- FINAL REVIEW IMMUTABILITY
-- ============================================================

create or replace function public.protect_final_verification_review()
returns trigger
language plpgsql
set search_path = ''
as $$
begin

  if old.status in (
    'APPROVED',
    'REJECTED',
    'WITHDRAWN'
  ) then

    raise exception
      'Final verification review records are immutable';

  end if;


  return new;
end;
$$;


create trigger operator_verifications_protect_final
before update or delete
on public.operator_verifications
for each row
execute function public.protect_final_verification_review();


create trigger boat_publication_reviews_protect_final
before update or delete
on public.boat_publication_reviews
for each row
execute function public.protect_final_verification_review();


-- ============================================================
-- COMPLIANCE CHECKS
-- ============================================================
--
-- A check belongs to exactly one review:
--
--   operator verification
--
-- OR
--
--   boat publication review.
--
-- check_code remains extensible because the exact compliance
-- checklist may evolve with law, jurisdiction and product scope.
-- ============================================================

create table public.compliance_checks (
  id uuid primary key default gen_random_uuid(),

  operator_id uuid not null,

  operator_verification_id uuid,

  boat_publication_review_id uuid,

  check_code text not null,

  status public.compliance_check_status
    not null default 'PENDING',

  result_note text,

  evidence jsonb not null default '{}'::jsonb,

  reviewed_by uuid
    references auth.users(id)
    on delete set null,

  reviewed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint compliance_checks_operator_verification_fk
    foreign key (
      operator_id,
      operator_verification_id
    )
    references public.operator_verifications(
      operator_id,
      id
    )
    on delete cascade,

  constraint compliance_checks_boat_review_fk
    foreign key (
      operator_id,
      boat_publication_review_id
    )
    references public.boat_publication_reviews(
      operator_id,
      id
    )
    on delete cascade,

  constraint compliance_checks_exactly_one_parent
    check (
      (
        operator_verification_id is not null
        and boat_publication_review_id is null
      )
      or
      (
        operator_verification_id is null
        and boat_publication_review_id is not null
      )
    ),

  constraint compliance_checks_code_format
    check (
      check_code = upper(check_code)
      and check_code ~ '^[A-Z0-9_]+$'
    ),

  constraint compliance_checks_note_not_blank
    check (
      result_note is null
      or length(trim(result_note)) > 0
    ),

  constraint compliance_checks_evidence_object
    check (
      jsonb_typeof(evidence) = 'object'
    ),

  constraint compliance_checks_review_consistency
    check (
      (
        status = 'PENDING'
      )
      or
      (
        status <> 'PENDING'
        and reviewed_by is not null
        and reviewed_at is not null
      )
    ),

  constraint compliance_checks_reason_required
    check (
      status not in (
        'FAILED',
        'WAIVED',
        'NOT_APPLICABLE'
      )
      or (
        result_note is not null
        and length(trim(result_note)) > 0
      )
    )
);


create unique index compliance_checks_operator_review_code_idx
  on public.compliance_checks(
    operator_verification_id,
    check_code
  )
  where operator_verification_id is not null;


create unique index compliance_checks_boat_review_code_idx
  on public.compliance_checks(
    boat_publication_review_id,
    check_code
  )
  where boat_publication_review_id is not null;


create index compliance_checks_operator_idx
  on public.compliance_checks(operator_id);


create index compliance_checks_status_idx
  on public.compliance_checks(status);


create trigger compliance_checks_set_updated_at
before update on public.compliance_checks
for each row
execute function public.set_updated_at();


-- ============================================================
-- PROTECT CHECKS AFTER FINAL REVIEW
-- ============================================================

create or replace function public.protect_final_review_compliance_checks()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  target_operator_verification_id uuid;
  target_boat_review_id uuid;
  review_locked boolean := false;
begin

  if tg_op = 'DELETE' then
    target_operator_verification_id =
      old.operator_verification_id;

    target_boat_review_id =
      old.boat_publication_review_id;
  else
    target_operator_verification_id =
      new.operator_verification_id;

    target_boat_review_id =
      new.boat_publication_review_id;
  end if;


  if target_operator_verification_id is not null then

    select exists (
      select 1
      from public.operator_verifications ov
      where ov.id = target_operator_verification_id
        and ov.status in (
          'APPROVED',
          'REJECTED',
          'WITHDRAWN'
        )
    )
    into review_locked;

  elsif target_boat_review_id is not null then

    select exists (
      select 1
      from public.boat_publication_reviews br
      where br.id = target_boat_review_id
        and br.status in (
          'APPROVED',
          'REJECTED',
          'WITHDRAWN'
        )
    )
    into review_locked;

  end if;


  if review_locked then
    raise exception
      'Compliance checks for final reviews are immutable';
  end if;


  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;


create trigger compliance_checks_protect_final_review
before insert or update or delete
on public.compliance_checks
for each row
execute function public.protect_final_review_compliance_checks();


-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.operator_verifications
  enable row level security;

alter table public.boat_publication_reviews
  enable row level security;

alter table public.compliance_checks
  enable row level security;


-- ============================================================
-- COMMENTS
-- ============================================================

comment on table public.operator_verifications is
  'Historical verification submission/review cycles for professional Boatly operators.';


comment on table public.boat_publication_reviews is
  'Historical marketplace publication review cycles for individual boats. Separate from fleet boat status.';


comment on table public.compliance_checks is
  'Structured compliance checklist results attached to operator-verification or boat-publication review cycles.';


commit;