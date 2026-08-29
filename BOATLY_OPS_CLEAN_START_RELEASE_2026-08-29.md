# Boatly Ops — clean-start release

## Product behavior

- The operator home is the 45-day fleet calendar.
- The primary navigation contains Calendar, Bookings, Customers, Fleet and More.
- A new operator enters only the business name. The request is immediately
  visible to the founder as `Da verificare`.
- Only the sole `SUPER_ADMIN` can confirm, reject, correct or delete an
  operator account.
- The only visible operator states are `Da verificare`, `Confermato` and
  `Rifiutato`.
- A rejected or deleted operator loses operational access immediately and is
  removed from the visible product within two minutes.
- An operator owns at most one workspace. A closed account cannot bootstrap a
  new workspace with the same identity.
- A boat has only two states: `Disponibile` and `Non disponibile`.
- A boat becomes operational with name, engine power and license requirement.
  Internal code, type, location, services, equipment and price remain optional.
- Boat deletion is irreversible after two minutes. Operators deleted by the
  founder also deactivate and remove their complete fleet.
- Booking and accounting references are preserved only as invisible historical
  tombstones when a physical delete would break referential integrity.

## Database changes already active

- `20260829130000_simplify_ops_lifecycle.sql`
- `20260829133000_confirmed_operator_operational_defaults.sql`
- `20260829134500_lock_simplified_ops_surface.sql`
- `20260829140000_cascade_operator_deletion.sql`
- `20260829141500_revoke_deleted_owner_auth_access.sql`

The minute-based purge job is active in Supabase. When the deletion window
expires it also closes the rejected owner sessions and bans future sign-ins,
while preserving historical audit references. Legacy admin RPCs that could
restore technical statuses are no longer executable by authenticated users.

## Clean-start state

The remote database contains only the founder authentication identity and its
single `SUPER_ADMIN` role. Operators, boats, bookings, customers and payments
have been reset to zero.

Seven obsolete TEST files remain in protected Supabase Storage buckets. Direct
SQL deletion is intentionally blocked by Supabase. After the application
deployment, open `/admin/operators` and use `Completa pulizia file TEST` once;
the server action removes them through the supported Storage API.

## Verification completed

- ESLint passed.
- TypeScript passed.
- 10 unit tests passed.
- Next.js production build passed.
- npm audit found 0 vulnerabilities.
- Transactional database tests passed for boat creation, two-state enforcement,
  account decisions, fleet cascade, two-minute purge and re-bootstrap blocking.
- Supabase advisors reported no ERROR or CRITICAL finding.

## Deliberately unchanged

- Marketplace remains disabled.
- Stripe remains TEST-only.
- Existing booking, CRM, finance and team integrity rules remain in place.
