# Boatly Ops — calendar lifecycle release

## Outcome

- A booking-linked occupancy can no longer be rendered as an operator block.
- Closing a booking always releases its boat through a database trigger,
  regardless of which application workflow changes the booking status.
- Existing active occupancies linked to `COMPLETED` and `NO_SHOW` bookings were
  reconciled without deleting booking or occupancy history.
- The operator calendar exposes one booking lifecycle action only:
  `Elimina prenotazione`.
- Calendar deletion is atomic and idempotent for manual bookings: the booking
  is cancelled, the boat is released, and an append-only event is recorded.
- Marketplace bookings remain protected from calendar deletion because their
  cancellation may require a financial/refund workflow.
- Manual boat blocks remain independently reversible with
  `Rendi di nuovo libera`.
- Booking cells and detail cards are green; operator blocks are red.

## Defensive consistency

The UI now refuses to reinterpret an occupancy carrying a `booking_id` as an
operator block when its active booking cannot be loaded. This keeps the
calendar truthful even during a delayed deployment or an unexpected external
write. The database remains the primary enforcement layer.

## Database already active

- `20260829223000_calendar_booking_occupancy_lifecycle.sql`
- Trigger: `bookings_release_terminal_occupancies`
- RPC: `operator_cancel_calendar_booking(uuid, uuid)`
- `anon` cannot execute the RPC; authenticated operator roles are checked
  inside the function; `service_role` remains available for controlled
  back-office use.

## Verification completed

- Existing `NO_SHOW` and `COMPLETED` occupancies reconciled to inactive.
- Only the real `CONFIRMED` booking occupancy remains active.
- Transactional cancellation is idempotent and releases the linked occupancy.
- Transactional operator block creation and release passed.
- ESLint passed.
- TypeScript passed.
- 10 unit tests passed.
- Next.js production build passed.
- npm audit found 0 vulnerabilities.

## Deliberately unchanged

- No user, boat, customer, booking or payment was deleted.
- Historical booking records remain auditable.
- Marketplace remains disabled.
- Stripe remains TEST-only.
