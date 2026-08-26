-- ============================================================
-- BOATLY
-- Migration: Operator Verification Submission
-- ============================================================
--
-- Purpose:
--   Submit a completed DRAFT operator workspace to Boatly
--   Compliance for verification.
--
-- Trusted transition:
--
--   operators:
--     DRAFT -> PENDING_VERIFICATION
--
--   operator_verifications:
--     PENDING
--
-- The RPC performs all onboarding completeness checks again
-- server-side and creates an immutable submission snapshot.
--
-- ============================================================

begin;


create or replace function public.submit_operator_verification(
  p_operator_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;

  v_operator_status public.operator_status;
  v_operator_name text;

  v_required_document_type_count integer;
  v_invalid_document_count integer;

  v_snapshot jsonb;

  v_verification_id uuid;
  v_open_verification_status public.verification_review_status;
begin

  -- ==========================================================
  -- AUTHENTICATION
  -- ==========================================================

  v_user_id :=
    auth.uid();


  if v_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'authentication_required';
  end if;


  -- ==========================================================
  -- LOCK OPERATOR ROW
  --
  -- Serializes simultaneous submissions for the same operator.
  -- ==========================================================

  select
    o.status,
    o.name
  into
    v_operator_status,
    v_operator_name

  from public.operators o

  where o.id =
    p_operator_id

  for update;


  if not found then
    raise exception using
      errcode = '22023',
      message = 'operator_not_found';
  end if;


  -- ==========================================================
  -- OWNER AUTHORIZATION
  -- ==========================================================

  if not exists (
    select 1
    from public.operator_members om

    where om.operator_id =
        p_operator_id

      and om.user_id =
        v_user_id

      and om.role =
        'OWNER'::public.operator_member_role

      and om.status =
        'ACTIVE'::public.operator_member_status
  ) then
    raise exception using
      errcode = '42501',
      message = 'operator_verification_submit_not_allowed';
  end if;


  -- ==========================================================
  -- OPERATOR STATE
  -- ==========================================================

  if v_operator_status =
    'PENDING_VERIFICATION'::public.operator_status
  then
    raise exception using
      errcode = '22023',
      message = 'operator_verification_already_submitted';
  end if;


  if v_operator_status <>
    'DRAFT'::public.operator_status
  then
    raise exception using
      errcode = '22023',
      message = 'operator_not_submittable';
  end if;


  -- ==========================================================
  -- LEGAL PROFILE COMPLETENESS
  -- ==========================================================

  if not exists (
    select 1

    from public.operator_legal_profiles lp

    where lp.operator_id =
        p_operator_id

      and nullif(
        pg_catalog.btrim(lp.legal_name),
        ''
      ) is not null

      and nullif(
        pg_catalog.btrim(lp.legal_form),
        ''
      ) is not null

      and lp.vat_number ~
        '^[0-9]{11}$'

      and (
        lp.tax_code ~
          '^[0-9]{11}$'

        or pg_catalog.upper(
          lp.tax_code
        ) ~
          '^[A-Z0-9]{16}$'
      )

      and nullif(
        pg_catalog.btrim(
          lp.registered_address_line_1
        ),
        ''
      ) is not null

      and nullif(
        pg_catalog.btrim(
          lp.registered_city
        ),
        ''
      ) is not null

      and nullif(
        pg_catalog.btrim(
          lp.registered_administrative_area
        ),
        ''
      ) is not null

      and lp.registered_postal_code ~
        '^[0-9]{5}$'

      and lp.registered_country_code =
        'IT'

      and nullif(
        pg_catalog.btrim(
          lp.legal_representative_first_name
        ),
        ''
      ) is not null

      and nullif(
        pg_catalog.btrim(
          lp.legal_representative_last_name
        ),
        ''
      ) is not null
  ) then
    raise exception using
      errcode = '22023',
      message = 'operator_legal_profile_incomplete';
  end if;


  -- ==========================================================
  -- PRIMARY LOCATION COMPLETENESS
  -- ==========================================================

  if not exists (
    select 1

    from public.operator_locations ol

    where ol.operator_id =
        p_operator_id

      and ol.is_primary =
        true

      and ol.is_public =
        true

      and ol.is_active =
        true

      and nullif(
        pg_catalog.btrim(ol.name),
        ''
      ) is not null

      and nullif(
        pg_catalog.btrim(
          ol.address_line_1
        ),
        ''
      ) is not null

      and nullif(
        pg_catalog.btrim(ol.city),
        ''
      ) is not null

      and nullif(
        pg_catalog.btrim(
          ol.administrative_area
        ),
        ''
      ) is not null

      and ol.postal_code ~
        '^[0-9]{5}$'

      and ol.country_code =
        'IT'

      and ol.timezone =
        'Europe/Rome'
  ) then
    raise exception using
      errcode = '22023',
      message = 'operator_primary_location_incomplete';
  end if;


  -- ==========================================================
  -- REQUIRED DOCUMENT-TYPE CONFIGURATION
  -- ==========================================================

  select
    count(*)
  into
    v_required_document_type_count

  from public.document_types dt

  where dt.subject_type =
      'OPERATOR'::public.document_subject_type

    and dt.is_active =
      true

    and dt.code in (
      'COMPANY_REGISTRY_EXTRACT',
      'LEGAL_REPRESENTATIVE_ID'
    );


  if v_required_document_type_count <> 2
  then
    raise exception using
      errcode = '22023',
      message = 'operator_document_configuration_incomplete';
  end if;


  -- ==========================================================
  -- REQUIRED DOCUMENT COMPLETENESS
  --
  -- Only the latest version of each required type matters.
  --
  -- Accepted latest states at submission:
  --
  --   UPLOADED
  --   APPROVED
  --
  -- REJECTED / unexpected review states block submission.
  -- ==========================================================

  select
    count(*)
  into
    v_invalid_document_count

  from public.document_types dt

  left join lateral (

    select
      od.id,
      od.status,
      od.expires_at

    from public.operator_documents od

    where od.operator_id =
        p_operator_id

      and od.document_type_id =
        dt.id

    order by
      od.created_at desc,
      od.id desc

    limit 1

  ) latest_document
    on true

  where dt.subject_type =
      'OPERATOR'::public.document_subject_type

    and dt.is_active =
      true

    and dt.code in (
      'COMPANY_REGISTRY_EXTRACT',
      'LEGAL_REPRESENTATIVE_ID'
    )

    and (
      latest_document.id is null

      or latest_document.status::text
        not in (
          'UPLOADED',
          'APPROVED'
        )

      or (
        latest_document.expires_at
          is not null

        and latest_document.expires_at <
          current_date
      )

      or (
        dt.requires_expiry_date =
          true

        and (
          latest_document.expires_at
            is null

          or latest_document.expires_at <
            current_date
        )
      )
    );


  if v_invalid_document_count > 0
  then
    raise exception using
      errcode = '22023',
      message = 'operator_required_documents_incomplete';
  end if;


  -- ==========================================================
  -- IMMUTABLE SUBMISSION SNAPSHOT
  -- ==========================================================

  select
    pg_catalog.jsonb_build_object(

      'schema_version',
      1,

      'captured_at',
      pg_catalog.clock_timestamp(),

      'submitted_by',
      v_user_id,

      'operator',
      pg_catalog.jsonb_build_object(
        'id',
        p_operator_id,

        'name',
        v_operator_name,

        'status_at_submission',
        v_operator_status
      ),

      'legal_profile',
      (
        select
          pg_catalog.jsonb_build_object(

            'legal_name',
            lp.legal_name,

            'legal_form',
            lp.legal_form,

            'vat_number',
            lp.vat_number,

            'tax_code',
            lp.tax_code,

            'business_register_number',
            lp.business_register_number,

            'rea_number',
            lp.rea_number,

            'pec_email',
            lp.pec_email,

            'sdi_code',
            lp.sdi_code,

            'registered_address_line_1',
            lp.registered_address_line_1,

            'registered_address_line_2',
            lp.registered_address_line_2,

            'registered_city',
            lp.registered_city,

            'registered_administrative_area',
            lp.registered_administrative_area,

            'registered_postal_code',
            lp.registered_postal_code,

            'registered_country_code',
            lp.registered_country_code,

            'legal_representative_first_name',
            lp.legal_representative_first_name,

            'legal_representative_last_name',
            lp.legal_representative_last_name
          )

        from public.operator_legal_profiles lp

        where lp.operator_id =
          p_operator_id
      ),

      'primary_location',
      (
        select
          pg_catalog.jsonb_build_object(

            'id',
            ol.id,

            'name',
            ol.name,

            'address_line_1',
            ol.address_line_1,

            'address_line_2',
            ol.address_line_2,

            'city',
            ol.city,

            'administrative_area',
            ol.administrative_area,

            'postal_code',
            ol.postal_code,

            'country_code',
            ol.country_code,

            'timezone',
            ol.timezone,

            'phone',
            ol.phone,

            'email',
            ol.email,

            'pickup_instructions',
            ol.pickup_instructions,

            'is_primary',
            ol.is_primary,

            'is_public',
            ol.is_public,

            'is_active',
            ol.is_active
          )

        from public.operator_locations ol

        where ol.operator_id =
            p_operator_id

          and ol.is_primary =
            true

        order by
          ol.created_at asc

        limit 1
      ),

      'required_documents',
      (
        select
          coalesce(

            pg_catalog.jsonb_agg(
              pg_catalog.jsonb_build_object(

                'document_id',
                latest_document.id,

                'document_type_id',
                dt.id,

                'document_type_code',
                dt.code,

                'document_type_name',
                dt.name,

                'original_filename',
                latest_document.original_filename,

                'mime_type',
                latest_document.mime_type,

                'file_size_bytes',
                latest_document.file_size_bytes,

                'content_hash_sha256',
                latest_document.content_hash_sha256,

                'issued_at',
                latest_document.issued_at,

                'expires_at',
                latest_document.expires_at,

                'status',
                latest_document.status,

                'storage_path',
                latest_document.storage_path,

                'created_at',
                latest_document.created_at
              )

              order by
                dt.sort_order,
                dt.code
            ),

            '[]'::jsonb
          )

        from public.document_types dt

        join lateral (

          select
            od.id,
            od.original_filename,
            od.mime_type,
            od.file_size_bytes,
            od.content_hash_sha256,
            od.issued_at,
            od.expires_at,
            od.status,
            od.storage_path,
            od.created_at

          from public.operator_documents od

          where od.operator_id =
              p_operator_id

            and od.document_type_id =
              dt.id

          order by
            od.created_at desc,
            od.id desc

          limit 1

        ) latest_document
          on true

        where dt.subject_type =
            'OPERATOR'::public.document_subject_type

          and dt.is_active =
            true

          and dt.code in (
            'COMPANY_REGISTRY_EXTRACT',
            'LEGAL_REPRESENTATIVE_ID'
          )
      )
    )

  into
    v_snapshot;


  -- ==========================================================
  -- EXISTING OPEN VERIFICATION
  -- ==========================================================
  --
  -- NEEDS_CHANGES is intentionally supported for a future
  -- resubmission workflow.
  --
  -- PENDING / IN_REVIEW cannot be submitted again.
  -- ==========================================================

  select
    ov.id,
    ov.status

  into
    v_verification_id,
    v_open_verification_status

  from public.operator_verifications ov

  where ov.operator_id =
      p_operator_id

    and ov.status in (
      'PENDING'::public.verification_review_status,
      'IN_REVIEW'::public.verification_review_status,
      'NEEDS_CHANGES'::public.verification_review_status
    )

  order by
    ov.created_at desc,
    ov.id desc

  limit 1

  for update;


  if found then

    if v_open_verification_status =
      'NEEDS_CHANGES'::public.verification_review_status
    then

      update public.operator_verifications
      set
        status =
          'PENDING'::public.verification_review_status,

        submission_snapshot =
          v_snapshot,

        submitted_by =
          v_user_id,

        submitted_at =
          pg_catalog.clock_timestamp(),

        reviewed_by =
          null,

        reviewed_at =
          null,

        decision_note =
          null

      where id =
        v_verification_id;

    else

      raise exception using
        errcode = '22023',
        message = 'operator_verification_already_open';

    end if;

  else

    insert into public.operator_verifications (
      operator_id,
      status,
      submission_snapshot,
      submitted_by
    )
    values (
      p_operator_id,
      'PENDING'::public.verification_review_status,
      v_snapshot,
      v_user_id
    )
    returning id
    into v_verification_id;

  end if;


  -- ==========================================================
  -- OPERATOR STATE TRANSITION
  -- ==========================================================

  update public.operators
  set
    status =
      'PENDING_VERIFICATION'::public.operator_status

  where id =
    p_operator_id;


  return
    v_verification_id;

end;
$$;


-- ============================================================
-- RPC PRIVILEGES
-- ============================================================

revoke execute
on function public.submit_operator_verification(
  uuid
)
from public, anon;


grant execute
on function public.submit_operator_verification(
  uuid
)
to authenticated;


-- ============================================================
-- RAW VERIFICATION MUTATIONS REMAIN SERVER-CONTROLLED
-- ============================================================

revoke insert, update, delete
on table public.operator_verifications
from anon, authenticated;


comment on function public.submit_operator_verification(
  uuid
) is
  'Submits a completed DRAFT operator workspace for Boatly verification, captures an immutable snapshot, creates or resubmits the review record, and transitions the operator to PENDING_VERIFICATION.';


commit;