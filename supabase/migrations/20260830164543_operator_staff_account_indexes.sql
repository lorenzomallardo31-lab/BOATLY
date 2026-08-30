-- Cover the two foreign keys introduced by operator_staff_accounts.
-- The existing (operator_id, created_at) index remains useful for roster
-- ordering, while these indexes cover delete/update checks on the FKs.

create index if not exists operator_staff_accounts_membership_idx
  on public.operator_staff_accounts (operator_id, user_id);

create index if not exists operator_staff_accounts_created_by_idx
  on public.operator_staff_accounts (created_by);
