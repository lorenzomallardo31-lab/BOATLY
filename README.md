# Boatly

Boatly is a boat-rental platform combining:

- a B2C marketplace for customers;
- a B2B fleet-management SaaS for professional rental operators;
- an internal Boatly administration back office.

## Product Vision

Boatly aims to make recreational boat rental simpler for customers and easier to manage for professional rental operators.

The platform combines:

- marketplace discovery;
- map-based search;
- real availability;
- online bookings;
- marketplace payments;
- manual/off-platform bookings;
- fleet calendar;
- CRM;
- staff and skipper management;
- compliance;
- analytics;
- platform administration.

## Initial Market

Initial jurisdiction: Italy.

Initial supply: professional rental operators only.

Private/P2P boat owners are not part of the initial MVP.

## Application Stack

The application is based on:

- Next.js
- React
- TypeScript
- Tailwind CSS

The current implementation also uses:

- Supabase
- PostgreSQL
- Supabase Auth
- Supabase Storage
- Mapbox
- Stripe
- Stripe Connect
- Vercel

Centralized error monitoring, product analytics and browser CI remain external
pilot-readiness tasks; see `03_TECHNICAL:/PILOT_OPERATIONS_RUNBOOK.md`.

## Repository Structure

The repository contains:

- `src/` — application source code
- `public/` — public static assets
- `01_PRODUCT:/` — product specifications
- `02_DESIGN:/` — brand, design system and UI specifications
- `03_TECHNICAL:/` — architecture, database and permissions
- `04_DEVELOOPMENT:/` — development documentation (legacy directory name)
- `05_PAYMENTS:/` — payment-related documentation
- `06_TESTING:/` — testing documentation
- `07_BUSINESS:/` — business model and legal requirements

## Specification Sources

### Product

- `01_PRODUCT:/BOATLY_PRD.md`
- `01_PRODUCT:/USER_STORIES.md`
- `01_PRODUCT:/SITEMAP.md`
- `01_PRODUCT:/USER_FLOWS.md`

### Design

- `02_DESIGN:/BRAND_IDENTITY.md`
- `02_DESIGN:/DESIGN_SYSTEM.md`
- `02_DESIGN:/WIREFRAMES.md`
- `02_DESIGN:/MARKETPLACE_UI.md`
- `02_DESIGN:/OPERATOR_UI.md`
- `02_DESIGN:/ADMIN_UI.md`
- `02_DESIGN:/RESPONSIVE_MOBILE.md`

### Technical

- `03_TECHNICAL:/DATABASE_SCHEMA.md`
- `03_TECHNICAL:/ERD.md`
- `03_TECHNICAL:/ROLES_PERMISSION.md`
- `03_TECHNICAL:/ARCHITECTURE.md`
- `03_TECHNICAL:/PILOT_OPERATIONS_RUNBOOK.md`

### Business / Legal

- `07_BUSINESS:/BUSINESS_MODEL-md`
- `07_BUSINESS:/LEGAL_REQUIREMENTS.md`

## Project Status

Phase A — Product & Technical Planning: Complete.

Phase B — Design: Complete.

Phase C — Technical beta: complete.

Phase D — Boatly Ops pilot: persistent multi-tenant calendar, bookings, CRM,
fleet, team, admin approval, off-platform finance and CSV import implemented.

The marketplace remains intentionally disabled and Stripe remains in TEST.
Before unassisted paid SaaS sales, complete the external operational, legal,
billing, monitoring and backup gates documented in the pilot runbook.

## Quality gate

```bash
npm run verify
```

Database regressions are in `06_TESTING:/ops-database-regression.sql`; the
manual end-to-end checklist is `06_TESTING:/PILOT_ACCEPTANCE.md`.

---

Boatly development must remain consistent with the approved specifications before implementation changes are introduced.
