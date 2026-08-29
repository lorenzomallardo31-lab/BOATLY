# Boatly Ops — Today dashboard and simple customer entry

## Outcome

- The calendar no longer asks whether a customer is new or already present.
- Every booking uses one compact form: customer name is required; phone and
  email are optional.
- The calendar no longer downloads or renders the operator's complete customer
  list. Only customers attached to visible bookings are loaded.
- When an optional email or phone already exists for that operator, Boatly
  reuses the matching internal customer automatically.
- Email and phone pointing to different people are rejected. Concurrent
  requests with the same identity are serialized, preventing duplicate
  customer records.
- Name-only bookings remain supported. Boatly deliberately does not merge
  people by name because homonyms cannot be identified safely.

## Cruscotto operativo Oggi

The top of the fleet calendar now contains a live daily control panel with:

- today's bookings, blocked boats, unique customers and missing phone count;
- first departure and last return;
- a chronological agenda for departures, returns, multi-day rentals and boat
  blocks;
- operational alerts for missing phone numbers, less than 60 minutes between a
  return and the next departure, impossible booking/block combinations and
  bookings attached to unavailable boats;
- direct interaction: every agenda card and alert opens the same calendar cell
  used to edit or remove the relevant booking or block.

The dashboard stays on today even when the operator browses another 45-day
calendar window. It uses the same server-fetched records as the calendar and
does not maintain a second source of truth.

## Database already active

- `20260829224500_simplify_calendar_customer_entry.sql`
- `20260829225000_fix_simple_calendar_customer_entry.sql`
- RPC: `operator_create_simple_calendar_booking(...)`
- Anonymous execution is denied. Authenticated execution is still protected by
  the internal operator membership check.

## Verification completed

- A transactional probe created two non-overlapping bookings with the same
  email and confirmed that only one customer identity was used.
- An overlapping booking was rejected and its provisional name-only customer
  was rolled back.
- Both successful probe bookings created active boat occupancies.
- The complete probe transaction was rolled back; no test data was retained.
- ESLint passed.
- TypeScript passed.
- 13 unit tests passed, including the daily agenda and alert cases.
- Next.js production build passed.
- npm audit found 0 vulnerabilities.

## Deliberately unchanged

- Existing customers and bookings were not modified or deleted.
- Booking and boat overlap constraints remain enforced by PostgreSQL.
- Marketplace remains disabled.
- Stripe remains TEST-only.
- WhatsApp actions are not included in this release.

