-- Calendar-first operator controls: reversible workspace suspension and
-- reasonless admission decisions. Destructive deletion keeps an audit reason.

begin;

alter table public.operators
  drop constraint if exists operators_pilot_status_only;

alter table public.operators
  add constraint operators_pilot_status_only
  check (status in (
    'DRAFT'::public.operator_status,
    'PENDING_VERIFICATION'::public.operator_status,
    'ACTIVE'::public.operator_status,
    'SUSPENDED'::public.operator_status,
    'REJECTED'::public.operator_status
  )) not valid;

alter table public.operators
  validate constraint operators_pilot_status_only;

create or replace function public.admin_decide_operator(
  p_operator_id uuid,
  p_decision text,
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
  v_decision text := pg_catalog.upper(pg_catalog.btrim(coalesce(p_decision, '')));
  v_status public.operator_status;
  v_purge_after timestamptz;
begin
  if v_user_id is null or not private.has_platform_role(array['SUPER_ADMIN'::public.platform_role]) then
    raise exception using errcode = '42501', message = 'super_admin_required';
  end if;

  if v_reason is not null and pg_catalog.length(v_reason) > 1000 then
    raise exception using errcode = '22023', message = 'operator_decision_reason_too_long';
  end if;

  if v_decision = 'DELETE' and v_reason is null then
    raise exception using errcode = '22023', message = 'operator_decision_reason_required';
  end if;

  if v_decision not in ('CONFIRM', 'REJECT', 'SUSPEND', 'RESUME', 'DELETE') then
    raise exception using errcode = '22023', message = 'invalid_operator_decision';
  end if;

  perform 1
  from public.operators o
  where o.id = p_operator_id and o.deleted_at is null
  for update;

  if not found then
    raise exception using errcode = '22023', message = 'operator_not_found';
  end if;

  if v_decision in ('CONFIRM', 'RESUME') then
    v_status := 'ACTIVE'::public.operator_status;
    update public.operators
    set status = v_status,
        deletion_requested_at = null,
        purge_after = null
    where id = p_operator_id;

    -- A name-only signup must still be able to create a direct booking as
    -- soon as it is approved. The placeholder is private and editable later.
    if not exists (
      select 1 from public.operator_locations ol
      where ol.operator_id = p_operator_id and ol.is_active = true
    ) then
      insert into public.operator_locations (
        operator_id, name, country_code, timezone,
        is_primary, is_public, is_active
      )
      select o.id, 'Sede operativa', o.country_code, o.timezone,
             true, false, true
      from public.operators o
      where o.id = p_operator_id;
    end if;
  elsif v_decision = 'SUSPEND' then
    v_status := 'SUSPENDED'::public.operator_status;
    update public.operators
    set status = v_status,
        deletion_requested_at = null,
        purge_after = null
    where id = p_operator_id;
  else
    v_status := 'REJECTED'::public.operator_status;
    v_purge_after := statement_timestamp() + interval '2 minutes';
    update public.operators
    set status = v_status,
        deletion_requested_at = statement_timestamp(),
        purge_after = v_purge_after
    where id = p_operator_id;
  end if;

  insert into public.audit_logs (
    actor_type, actor_user_id, operator_id, action,
    entity_type, entity_id, reason, metadata
  ) values (
    'PLATFORM'::public.audit_actor_type,
    v_user_id,
    p_operator_id,
    case v_decision
      when 'CONFIRM' then 'OPERATOR_CONFIRMED'
      when 'REJECT' then 'OPERATOR_REJECTED'
      when 'SUSPEND' then 'OPERATOR_SUSPENDED'
      when 'RESUME' then 'OPERATOR_RESUMED'
      else 'OPERATOR_DELETION_SCHEDULED'
    end,
    'OPERATOR',
    p_operator_id::text,
    v_reason,
    pg_catalog.jsonb_build_object(
      'decision', v_decision,
      'purge_after', v_purge_after
    )
  );

  return pg_catalog.jsonb_build_object(
    'operator_id', p_operator_id,
    'status', v_status,
    'purge_after', v_purge_after
  );
end;
$$;

revoke all on function public.admin_decide_operator(uuid,text,text) from public, anon, authenticated;
grant execute on function public.admin_decide_operator(uuid,text,text) to authenticated;

comment on function public.admin_decide_operator(uuid,text,text) is
  'SUPER_ADMIN-only lifecycle control. Admission and reversible suspension do not require a reason; destructive deletion does.';

commit;
