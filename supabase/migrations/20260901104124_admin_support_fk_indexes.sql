create index if not exists admin_operator_support_sessions_ended_by_idx
  on private.admin_operator_support_sessions(ended_by)
  where ended_by is not null;
