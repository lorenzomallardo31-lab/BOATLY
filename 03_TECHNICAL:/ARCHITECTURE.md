# BOATLY — TECHNICAL ARCHITECTURE

**Version:** 1.1
**Status:** Phase A — Final Approved Specification

---

# 1. PURPOSE

This document defines Boatly's technical architecture including:

* frontend;
* backend;
* repository;
* database;
* auth;
* authorization;
* storage;
* marketplace search;
* geospatial architecture;
* booking;
* availability;
* pricing;
* payments;
* Stripe Connect;
* subscriptions;
* contracts;
* compliance;
* notifications;
* email;
* analytics;
* monitoring;
* privacy;
* tax reporting;
* testing;
* environments;
* deployment;
* security;
* vibecoding rules.

---

# 2. ARCHITECTURAL STYLE

Boatly begins as a modular full-stack application.

Not:

* microservices;
* separate frontend/backend repositories;
* native app suite;
* distributed event infrastructure.

One codebase with strong module boundaries is preferred.

Reason:

* less operational complexity;
* fewer duplicated rules;
* easier solo/AI-assisted development;
* simpler testing/deployment;
* easier domain consistency.

---

# 3. FINAL MVP STACK

Framework:

Next.js with App Router.

Language:

TypeScript.

UI:

React.

Styling/components:

Tailwind CSS + shadcn/ui.

Database:

PostgreSQL through Supabase.

Authentication:

Supabase Auth.

Database authorization:

Supabase RLS + server authorization.

Storage:

Supabase Storage.

Geospatial database:

PostGIS.

Maps:

Mapbox GL JS.

Search/geocoding:

Mapbox services where appropriate.

Payments:

Stripe + Stripe Connect.

Future SaaS billing:

Stripe Billing.

Transactional application email:

Resend.

Hosting:

Vercel.

Source control:

GitHub.

Product analytics:

PostHog.

Error monitoring:

Sentry.

Unit/integration:

Vitest + React Testing Library where useful.

E2E:

Playwright.

Package manager:

npm.

---

# 4. HIGH-LEVEL ARCHITECTURE

```text
CUSTOMER BROWSER
OPERATOR BROWSER
ADMIN BROWSER
       ↓
      HTTPS
       ↓
     VERCEL
       ↓
    NEXT.JS
       ├── Public Marketplace
       ├── Customer Account
       ├── Operator Workspace
       ├── Admin Back Office
       ├── Server Components
       ├── Server Actions
       ├── Route Handlers
       └── Domain Services
             ↓
          SUPABASE
          ├── PostgreSQL
          ├── Auth
          ├── RLS
          ├── Storage
          └── PostGIS
```

Next.js server also integrates with:

* Stripe;
* Mapbox;
* Resend;
* Sentry;
* PostHog.

---

# 5. PRIMARY BACKEND DECISION

The primary Boatly application backend lives inside trusted Next.js server-side code.

Use:

* Server Components;
* Server Actions;
* Route Handlers;
* server-only domain services.

Supabase Edge Functions are not the default home for application business logic.

They may be introduced only where a clearly independent runtime is justified.

Do not duplicate booking/payment rules across runtimes.

---

# 6. DATABASE RESPONSIBILITIES

PostgreSQL protects:

* foreign keys;
* uniqueness;
* check constraints;
* non-overlap constraints;
* RLS;
* transactions;
* historical relationships;
* geospatial data;
* indexes.

Database must protect integrity even when application code has defects.

---

# 7. APPLICATION SERVER RESPONSIBILITIES

Next.js server handles:

* auth context;
* permissions;
* operator context;
* pricing;
* availability orchestration;
* booking state machine;
* booking holds;
* legal/compliance gate;
* contract generation orchestration;
* Stripe;
* refunds;
* subscriptions;
* email;
* external APIs;
* admin workflows;
* reconciliation;
* privacy workflows;
* tax-reporting workflows.

---

# 8. CLIENT RESPONSIBILITIES

Browser handles:

* presentation;
* forms;
* map interaction;
* navigation;
* UI state;
* safe optimistic interaction.

Browser is not authoritative for:

* final price;
* commission;
* availability;
* booking state;
* legal eligibility;
* compliance;
* payment status;
* refund status;
* operator ownership;
* admin permissions.

---

# 9. NEXT.JS ROUTE ORGANIZATION

Conceptual:

```text
src/app/
├── (public)/
├── (auth)/
├── checkout/
├── account/
├── operator/
├── admin/
└── api/
```

Actual route tree follows `SITEMAP.md`.

---

# 10. SOURCE ORGANIZATION

```text
src/
├── app/
├── components/
├── features/
├── server/
├── lib/
├── config/
├── types/
├── emails/
└── styles/
```

---

# 11. GENERIC COMPONENTS

`src/components/`

contains reusable presentation/UI.

Suggested:

```text
components/
├── ui/
├── layout/
├── navigation/
├── forms/
├── feedback/
└── maps/
```

Do not duplicate equivalent controls.

---

# 12. FEATURE MODULES

```text
src/features/
├── auth/
├── search/
├── boats/
├── operators/
├── bookings/
├── checkout/
├── fleet/
├── availability/
├── pricing/
├── customers/
├── staff/
├── skippers/
├── payments/
├── subscriptions/
├── reviews/
├── documents/
├── compliance/
├── contracts/
├── notifications/
├── moderation/
├── privacy/
├── tax/
└── analytics/
```

---

# 13. SERVER MODULES

```text
src/server/
├── auth/
├── permissions/
├── search/
├── boats/
├── operators/
├── bookings/
├── availability/
├── pricing/
├── payments/
├── refunds/
├── stripe/
├── subscriptions/
├── compliance/
├── contracts/
├── legal/
├── notifications/
├── documents/
├── moderation/
├── privacy/
├── tax/
├── analytics/
└── admin/
```

---

# 14. DOMAIN SERVICE PRINCIPLE

Complex business logic must not live directly in pages.

Bad:

checkout page directly:

* calculates price;
* creates Stripe;
* checks overlaps;
* calculates commission.

Good:

page

→ booking service

→ pricing service

→ availability service

→ compliance service

→ payment service.

---

# 15. INFRASTRUCTURE LIBRARIES

```text
src/lib/
├── supabase/
├── stripe/
├── mapbox/
├── resend/
├── posthog/
├── sentry/
├── validation/
├── money/
├── dates/
├── contracts/
└── utils/
```

Third-party calls should not be scattered through page components.

---

# 16. SUPABASE CLIENT TYPES

## Browser Client

Uses public project credentials.

RLS active.

## Server User Client

Uses authenticated session.

RLS active.

## Privileged Server Client

Uses service role only for tightly controlled system/admin workflows.

Never client bundled.

---

# 17. AUTHENTICATION

MVP:

* email;
* password;
* email verification;
* password reset.

Potential future:

* Google;
* Apple.

Use Supabase SSR/session architecture.

Server derives actual user identity.

Never trust user ID submitted by browser.

---

# 18. AUTHENTICATED ROUTES

Protected areas:

* `/account/*`
* `/operator/*`
* `/admin/*`

Flow:

session

→ identity

→ context

→ authorization

→ permitted data.

Avoid unsafe shared caching for user-specific data.

---

# 19. OPERATOR WORKSPACE CONTEXT

One user may belong to multiple operators.

UI can store active workspace preference.

But every server operation must verify:

* user membership;
* status ACTIVE;
* operator;
* role;
* permission.

Selected operator ID is not trusted proof.

---

# 20. RLS

RLS mandatory for exposed tenant/private data.

Examples:

* boats private management fields;
* bookings;
* customers;
* payments;
* documents;
* staff;
* notifications;
* favorites;
* legal contracts.

Application authorization remains another layer.

---

# 21. SERVICE ROLE SECURITY

`SUPABASE_SERVICE_ROLE_KEY`:

* server only;
* never `NEXT_PUBLIC`;
* never repository;
* never browser;
* used sparingly.

Service role is not a shortcut around authorization logic.

---

# 22. DATABASE MIGRATIONS

Target:

```text
supabase/
├── config.toml
├── migrations/
├── seed.sql
└── tests/
```

Repository is source of truth.

Avoid production-only dashboard schema modifications.

---

# 23. DATABASE TYPE GENERATION

Generate/update Supabase TypeScript database types.

Example:

`src/types/database.types.ts`

Regenerate after schema migration changes.

---

# 24. DATABASE RPC / FUNCTIONS

Use PostgreSQL functions when atomicity/data integrity benefits.

Examples:

* create booking hold;
* create manual booking + occupancy;
* release/expire hold;
* atomic reservation transition.

Do not move all product logic into SQL.

---

# 25. SEARCH ARCHITECTURE

Search input:

* location;
* date;
* time;
* duration;
* passengers;
* filters.

↓

server search service.

↓

PostgreSQL/PostGIS.

↓

filter:

* eligible operator;
* published boat;
* active location;
* legal offering;
* capacity;
* availability;
* filters.

↓

pricing summary.

↓

results.

---

# 26. SEARCH DATABASE STRATEGY

Prefer optimized server/database query rather than multiple sequential browser requests.

Potential future database function:

`search_boats(...)`

Inputs may include:

* coordinates;
* radius/bounds;
* requested interval;
* passengers;
* boat type;
* filter values.

Return only search-card/map-safe fields.

---

# 27. SEARCH URL STATE

Represent non-sensitive search state in query parameters where useful.

Benefits:

* shareability;
* reload;
* navigation;
* analytics;
* SEO where appropriate.

Do not put private booking/customer details in URL.

---

# 28. MAP ARCHITECTURE

Mapbox GL JS:

visualization.

PostGIS:

Boatly inventory geography.

Mapbox token intended for browser must be configured/restricted appropriately.

No secret server credentials exposed.

---

# 29. GEOCODING

Used for:

* search autocomplete;
* operator location setup;
* destination management.

Flow:

user query

→ Mapbox search/geocoding

→ normalized location

→ coordinates

→ Boatly spatial query/storage where permitted.

Provider rules on permanent/temporary geocoding storage must be respected.

---

# 30. POSTGIS

Supports:

* radius search;
* nearest inventory;
* distance sorting;
* viewport bounds.

Use GiST indexes.

---

# 31. LICENCE ELIGIBILITY ENGINE

Do not hardcode simplistic threshold.

Trusted server module evaluates legally validated rule set using available inputs.

Potential inputs:

* boat type;
* engine power kW;
* horsepower;
* displacement;
* engine configuration;
* navigation limit;
* legal offering;
* customer age;
* licence category;
* issuing country.

Rule set must be maintainable/version-aware because legislation may change.

---

# 32. MARKETPLACE COMPLIANCE GATE

Search/bookability depends on:

* operator eligibility;
* boat status;
* legal offering approval;
* compliance requirements;
* document validity;
* location status.

Critical checks repeated before payment.

---

# 33. PRICING ARCHITECTURE

Trusted server-side.

Inputs:

* boat;
* date;
* interval;
* duration;
* rate plan;
* pricing rules;
* extras;
* mandatory charges;
* commercial plan;
* commission;
* applicable taxes/fees.

Output:

immutable trusted calculation.

---

# 34. MONEY

Use integer minor units.

Avoid JS floating-point arithmetic for money.

Provide shared money utilities.

Potential functions:

* formatMoney;
* addMoney;
* percentage/basis points;
* currency validation;
* allocation helpers.

---

# 35. TIME / TIMEZONE

Database instants:

UTC.

Operator location:

IANA timezone such as `Europe/Rome`.

Rental business time is interpreted at location timezone.

Do not assume every location shares one timezone.

---

# 36. BOOKING ARCHITECTURE

```text
Search
↓
Boat
↓
Checkout draft
↓
Legal/compliance gate
↓
Availability revalidation
↓
Trusted price
↓
Terms acceptance
↓
Atomic hold
↓
Stripe session/payment
↓
Verified webhook
↓
Booking confirmation
↓
Confirmed occupancy
↓
Contract generation
↓
Notifications
```

---

# 37. BOOKING HOLD

Database creates temporary blocking occupancy.

Requirements:

* atomic;
* expiry;
* non-overlap;
* linked to booking/draft where appropriate.

Exact duration decided during implementation.

---

# 38. PAYMENT CREATION FAILURE

Hold exists

↓

Stripe creation fails.

Expected:

* no confirmed booking;
* failure logged;
* hold expires/releases.

---

# 39. PAYMENT CONFIRMATION

Never confirm via frontend success page.

Correct:

Stripe webhook

→ signature validation

→ event idempotency

→ expected amount/currency/reference validation

→ state transaction.

---

# 40. STRIPE WEBHOOK ENDPOINT

Conceptual route:

`/api/webhooks/stripe`

Characteristics:

* public to Stripe;
* no standard user session required;
* signature verification;
* raw body handling where required;
* supported event filtering;
* idempotency;
* quick appropriate HTTP response;
* trusted server operations.

---

# 41. STRIPE CONNECT

Operator links to Stripe connected account.

Store:

* account identifier;
* onboarding status;
* charges enabled;
* payouts enabled;
* requirements status.

Do not unnecessarily copy sensitive financial/bank details.

---

# 42. CONNECT CHARGE MODEL

Destination charges remain a leading candidate from architecture planning.

However exact charge model must be finalized only after:

* business model;
* legal marketplace role;
* PSD2/payment review;
* refund/payout responsibilities.

Payment provider module must isolate Connect implementation details.

---

# 43. CHECKOUT UI STRATEGY

Prefer Stripe-supported checkout that minimizes Boatly's handling of card data.

Exact D3 choice later among:

* hosted Checkout;
* embedded Checkout;
* Elements/custom flow.

Server creates payment object.

---

# 44. PAYMENT IDEMPOTENCY

Protect against:

* duplicate checkout requests;
* duplicate webhook delivery;
* retries;
* network ambiguity.

Use:

* Stripe event IDs;
* unique provider IDs;
* idempotency keys where useful;
* database constraints;
* state transition guards.

---

# 45. REFUND ARCHITECTURE

Authorized request

↓

permission

↓

cancellation/refund calculation

↓

internal refund

↓

Stripe API

↓

provider result/webhook

↓

internal reconciliation

↓

notifications.

---

# 46. FINANCIAL RECONCILIATION

Need to compare:

booking

↔ internal payment

↔ Stripe Payment Intent/Charge

↔ refunds

↔ payouts where relevant.

Mismatch example:

Stripe PAID

but internal PROCESSING.

↓

flag/reconcile.

Never silently ignore mismatch.

---

# 47. MANUAL PAYMENT

Separate module/table for:

* cash;
* bank transfer;
* card at location;
* other.

These records are operator-reported and visibly not Stripe verified.

---

# 48. SUBSCRIPTIONS

Commercial plans:

* Founding;
* Starter;
* Pro;
* Business;
* Enterprise.

Plan/commission data configurable.

Future automated billing:

Stripe Billing.

Pilot:

admin assignment acceptable.

---

# 49. CONTRACT ARCHITECTURE

Flow:

active/versioned legal template

↓

booking snapshots

↓

correct contract-type selection

↓

generated immutable record

↓

protected storage

↓

authorized retrieval.

Current template changes never mutate old contract.

---

# 50. LEGAL ACCEPTANCE

Store:

* exact legal version;
* user;
* context;
* booking/operator association;
* timestamp;
* locale;
* reasonable evidence.

Acceptance persistence is server-controlled.

---

# 51. COMPLIANCE ARCHITECTURE

Dedicated module handles:

* requirements;
* document evidence;
* review;
* status;
* expiration;
* operator eligibility;
* boat eligibility;
* legal offerings;
* skipper qualifications.

Do not scatter regulatory rules throughout UI components.

---

# 52. COMPLIANCE REQUIREMENTS ENGINE

Architecture should support rule scoping by:

* country;
* region;
* location;
* boat type;
* operator type;
* contract type.

MVP may initially use a limited Italian rule set while keeping extensible data model.

---

# 53. COMPLIANCE EXPIRATION

Scheduled workflow:

find expiring requirements

↓

notify

↓

expire when appropriate

↓

re-evaluate marketplace eligibility

↓

restrict future booking if required

↓

handle existing bookings explicitly.

---

# 54. SCHEDULED JOBS

Potential scheduled needs:

* expire booking holds;
* compliance reminders;
* compliance expiration;
* booking reminders;
* payment reconciliation;
* DAC7/report preparation;
* other periodic housekeeping.

Use simplest secure scheduler supported by deployment architecture.

Do not introduce complex job infrastructure prematurely.

Scheduled endpoints must be authenticated/secured.

---

# 55. FILE STORAGE

Buckets target:

* boat-images;
* operator-public-media;
* private-documents;
* booking-contracts;
* avatars.

---

# 56. BOAT IMAGES

Flow:

authorized upload

↓

validate file

↓

storage

↓

metadata

↓

public only when appropriate.

---

# 57. PRIVATE DOCUMENTS

Access:

request

↓

authorization

↓

temporary signed/private access.

No permanent public document URL.

---

# 58. FILE VALIDATION

Validate:

* permission;
* file type;
* size;
* destination;
* ownership.

Do not trust filename extension alone.

Potential malware scanning can be considered later if risk requires.

---

# 59. CONTRACT STORAGE

Booking contracts use protected storage.

Access limited to:

* customer;
* owning operator roles;
* authorized platform staff.

---

# 60. EMAIL ARCHITECTURE

Resend handles transactional app email.

Examples:

* booking confirmation;
* cancellation;
* refund;
* new operator booking;
* compliance warning;
* operator verification;
* boat verification;
* reminders.

Server side only.

---

# 61. EMAIL TEMPLATES

Version-controlled.

Target:

```text
src/emails/
├── booking-confirmed.tsx
├── booking-cancelled.tsx
├── refund-confirmed.tsx
├── operator-approved.tsx
├── boat-approved.tsx
├── compliance-expiring.tsx
└── booking-reminder.tsx
```

Avoid giant inline HTML strings in domain services.

---

# 62. AUTH EMAILS

Supabase Auth handles authentication emails.

Application transactional email and auth email remain separate concerns.

Production may use appropriately configured custom SMTP/provider.

---

# 63. NOTIFICATION ARCHITECTURE

Domain event

→ notification DB record

→ in-app

→ email where appropriate.

Future:

SMS/WhatsApp.

Booking domain should not hardcode email implementation throughout its logic.

---

# 64. ANALYTICS

PostHog.

Potential events:

* search_started
* search_completed
* boat_viewed
* favorite_added
* checkout_started
* checkout_abandoned
* payment_started
* booking_confirmed
* manual_booking_created
* operator_onboarding_started
* boat_created
* listing_published

Naming standardized.

---

# 65. ANALYTICS PRIVACY

Never send unnecessary:

* passwords;
* card data;
* sensitive provider payloads;
* private documents;
* tax documents;
* excessive PII.

Consent architecture applies where legally required.

---

# 66. SENTRY

Sentry monitors application errors.

Use separate environments.

Filter sensitive data.

Useful safe metadata:

* release;
* route;
* internal event type;
* safe resource identifiers when appropriate.

---

# 67. APPLICATION LOGGING

Structured logs may include:

* operation;
* booking code/ID;
* internal payment ID;
* event type;
* error category.

Never log:

* passwords;
* card data;
* service-role key;
* Stripe secret;
* private document content.

---

# 68. APPLICATION LOG VS AUDIT LOG

Technical failure:

application log.

Sensitive business/security action:

audit log.

Example:

Stripe timeout → app log.

Commission changed → audit.

---

# 69. PROVIDER EVENT HISTORY

Stripe events remain separate from:

* application log;
* audit log;
* booking event history.

Different histories serve different purposes.

---

# 70. ENVIRONMENTS

Minimum:

## Development

Local Mac.

## Preview

Feature branch/PR deployments.

## Production

Real users/data/payments.

Potential later:

dedicated staging.

---

# 71. SUPABASE ENVIRONMENTS

At minimum:

* development project;
* production project.

Do not use real production data casually in local development.

Preview may initially share development backend with synthetic/test data discipline.

Dedicated staging can be introduced before larger pilot/team scale.

---

# 72. STRIPE ENVIRONMENTS

Development/Preview:

test environment.

Production:

live.

Webhook secrets differ by environment.

Never mix test and live transaction data.

---

# 73. ENVIRONMENT FILES

Repository:

`.env.example`

contains names only.

Local:

`.env.local`

contains secrets.

`.env.local` gitignored.

---

# 74. PUBLIC VARIABLES

Potential:

* NEXT_PUBLIC_APP_URL
* NEXT_PUBLIC_SUPABASE_URL
* NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
* NEXT_PUBLIC_MAPBOX_TOKEN
* NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
* NEXT_PUBLIC_POSTHOG_KEY
* NEXT_PUBLIC_POSTHOG_HOST
* NEXT_PUBLIC_SENTRY_DSN

Only truly public values use `NEXT_PUBLIC_`.

---

# 75. SERVER-ONLY VARIABLES

Potential:

* SUPABASE_SERVICE_ROLE_KEY
* STRIPE_SECRET_KEY
* STRIPE_WEBHOOK_SECRET
* RESEND_API_KEY
* RESEND_FROM_EMAIL
* CRON_SECRET
* SENTRY_AUTH_TOKEN
* POSTHOG_SERVER_API_KEY where needed

---

# 76. ENVIRONMENT VALIDATION

Use typed startup/build-time validation where practical.

Missing critical config should fail explicitly.

Potential:

`src/config/env.ts`.

---

# 77. SECRET MANAGEMENT

Never:

* commit;
* README-paste;
* hardcode;
* browser expose;
* casually include in screenshots/prompts.

Rotate accidentally exposed secret.

---

# 78. VERCEL

Vercel hosts Next.js.

Flow:

feature branch

↓

Preview deployment

↓

test

↓

merge main

↓

Production.

Environment variables correctly scoped.

---

# 79. GITHUB

Primary repository:

`boatly`.

Recommended:

`main` + short-lived feature branches.

Examples:

* feature/operator-onboarding
* feature/fleet-calendar
* feature/stripe-checkout
* fix/booking-conflict

---

# 80. COMMITS

Use meaningful focused commits.

Examples:

* `feat: add operator onboarding`
* `feat: implement booking hold`
* `fix: prevent overlapping manual bookings`
* `refactor: centralize booking permissions`
* `chore: add database migration`

Avoid huge unrelated AI-generated commits.

---

# 81. CI QUALITY GATES

Before production:

* TypeScript typecheck;
* ESLint;
* unit tests;
* integration tests;
* production build;
* migration validation;
* critical security tests.

Later as suite matures:

* Playwright;
* RLS tests;
* accessibility checks.

---

# 82. UNIT TESTS

Examples:

* money;
* pricing;
* commission;
* cancellation;
* eligibility;
* overlap/date helpers;
* state-machine rules.

---

# 83. INTEGRATION TESTS

Examples:

* database functions;
* RLS;
* hold creation;
* manual booking;
* compliance gates;
* legal acceptance;
* webhook transitions;
* refund reconciliation.

---

# 84. END-TO-END TESTS

Customer:

search

→ booking

→ test payment

→ confirmation.

Operator:

login

→ create manual booking.

Admin:

approve operator/boat.

---

# 85. RLS TESTS

Mandatory attempted attacks:

* Operator A reads B;
* Customer A reads B;
* Employee edits prohibited data;
* Skipper reads payout;
* anonymous private document;
* manipulated operator ID.

Expected:

deny.

---

# 86. PAYMENT TESTING

Stripe test scenarios:

* successful payment;
* failed payment;
* additional authentication where applicable;
* browser close;
* duplicate webhook;
* webhook delay;
* refund;
* partial refund where supported;
* Connect account incomplete;
* reconciliation mismatch.

---

# 87. CONCURRENCY TEST

Two simultaneous attempts:

same boat

same overlap.

Expected:

exactly one succeeds.

If both succeed:

production blocker.

---

# 88. SEARCH / PUBLIC RENDERING

Public SEO pages can use appropriate server rendering/static optimization.

Dynamic availability remains non-static/authoritative only after revalidation.

---

# 89. AUTHENTICATED CACHING

Do not use unsafe cross-user shared caching for authenticated dashboards.

Data must correspond to actual authenticated context.

---

# 90. SEARCH CACHING

Static reference data can be cached:

* boat types;
* amenities;
* destinations.

Availability cannot be treated as permanently cached truth.

Final availability revalidated before booking.

---

# 91. PERFORMANCE

Targets:

* minimize client JS;
* Server Components where beneficial;
* optimized images;
* database indexes;
* server pagination;
* no N+1;
* map clustering;
* lazy loading;
* efficient calendar windows.

---

# 92. FLEET CALENDAR

Large calendar cannot load unlimited history.

Query by:

* operator;
* location;
* date range;
* visible boats.

Potential UI needs:

* virtualization;
* date-window loading;
* incremental events.

Calendar dependency must be checked for:

* features;
* performance;
* mobile behavior;
* commercial license.

Do not accidentally adopt expensive/incorrect licensed dependency.

---

# 93. TABLE PAGINATION

Large lists use server-side pagination:

* bookings;
* customers;
* boats;
* payments;
* documents;
* reports;
* audit logs.

Never fetch enormous datasets into browser.

---

# 94. SECURITY HEADERS

Evaluate:

* Content-Security-Policy;
* Strict-Transport-Security;
* X-Content-Type-Options;
* Referrer-Policy;
* Permissions-Policy.

Configuration must support required Stripe/Mapbox/Supabase/analytics resources safely.

---

# 95. RATE LIMITING

Consider for:

* auth abuse;
* registration;
* password reset;
* geocoding/search abuse;
* support forms;
* payment creation;
* sensitive admin operations.

Exact mechanism selected during implementation.

---

# 96. BOT PROTECTION

Potentially for:

* signup;
* login abuse;
* support/public forms.

Do not add unnecessary friction to ordinary booking flow.

---

# 97. INPUT VALIDATION

Layers:

browser UX validation

*

server validation

*

database constraints.

Zod may be used for shared schemas.

Browser validation alone insufficient.

---

# 98. STANDARD ERROR MODEL

Potential codes:

* VALIDATION_ERROR
* UNAUTHORIZED
* FORBIDDEN
* NOT_FOUND
* BOAT_UNAVAILABLE
* BOAT_NOT_ELIGIBLE
* LICENCE_REQUIREMENT_NOT_MET
* COMPLIANCE_BLOCKED
* PAYMENT_FAILED
* BOOKING_CONFLICT
* INVALID_STATE_TRANSITION
* RATE_LIMITED
* INTERNAL_ERROR

Do not expose stack traces to users.

---

# 99. BOOKING STATE MACHINE

Use domain functions such as:

* confirmBooking()
* cancelBookingByCustomer()
* cancelBookingByOperator()
* startRental()
* completeRental()

Avoid direct arbitrary status updates.

---

# 100. FINANCIAL STATE MACHINE

Provider financial state reconciles into Boatly state through controlled services.

Users cannot choose provider truth.

---

# 101. EVENT HISTORY

Three separate histories:

## Booking Events

Operational transaction timeline.

## Audit Logs

Security/business administrative decisions.

## Stripe Events

Provider integration processing.

Do not collapse into one table.

---

# 102. OBSERVABILITY IDENTIFIERS

Important investigation should connect:

booking_code

↓

booking ID

↓

payment ID

↓

Stripe Payment Intent

↓

Stripe event

↓

refund

↓

payout where relevant.

---

# 103. DOMAIN IDENTIFIERS

Internal IDs:

UUID.

Human-facing booking reference:

booking_code.

Example concept:

`BT-2026-AB12CD`.

Raw UUID is not a security mechanism.

---

# 104. SEO

Support:

* metadata;
* canonicals;
* sitemap;
* destination pages;
* category pages;
* boat pages;
* operator pages;
* structured data where appropriate.

Avoid empty programmatic SEO spam.

---

# 105. ACCESSIBILITY

Build toward:

* semantic HTML;
* keyboard operation;
* visible focus;
* labels;
* adequate contrast;
* screen-reader feedback;
* accessible dialogs;
* accessible errors;
* map/list alternative.

---

# 106. RESPONSIVE

Customer:

mobile-first.

Operator:

responsive, desktop-optimized for complex management.

Admin:

desktop-optimized, still responsive.

---

# 107. NATIVE APPS

Not MVP.

Future native apps should reuse the same business/domain backend concepts where practical.

---

# 108. PWA

Potential future enhancement.

Do not delay marketplace/operator/payment MVP for PWA functionality.

---

# 109. EXTERNAL SERVICE FAILURE

Every external dependency can fail.

Stripe failure:

never false-confirm payment.

Resend failure:

booking can remain confirmed; delivery failure handled separately.

PostHog failure:

must not break application.

Sentry failure:

application continues.

Mapbox failure:

stored Boatly inventory remains intact.

---

# 110. THIRD-PARTY WRAPPERS

Wrap external integrations:

* Stripe;
* Mapbox;
* Resend;
* PostHog;
* Sentry;
* privileged Supabase.

Avoid calls scattered through UI.

---

# 111. MOCK DATA

Development:

synthetic seed data allowed.

Production:

no fake fallback boats/customers when backend fails.

Failure should show safe error/empty state.

---

# 112. SEED DATA

Potential development seed:

* destinations;
* boat types;
* amenities;
* demo operator;
* locations;
* boats;
* bookings.

Never use real customer PII for development seeds.

---

# 113. BACKUP / RECOVERY

Production needs:

* database backup strategy;
* migration history;
* storage recovery planning;
* restoration procedure.

Backups do not replace migrations.

---

# 114. DEPLOYMENT FLOW

Mac

↓

feature branch

↓

GitHub

↓

Vercel Preview

↓

automated checks

↓

review/test

↓

merge main

↓

Production.

Database migrations coordinated with application compatibility.

---

# 115. MIGRATION SAFETY

Prefer backward-compatible production migration patterns.

Example:

add nullable field

↓

deploy compatible code

↓

backfill

↓

tighten constraint later.

Avoid high-risk instant breaking changes.

---

# 116. FEATURE FLAGS

May be introduced when useful for risky/incomplete features.

Do not build complex feature-flag infrastructure prematurely.

---

# 117. DEPENDENCY POLICY

Before adding dependency:

* why needed?
* maintained?
* secure?
* licence?
* bundle impact?
* existing stack already solves problem?

Do not let AI install duplicate libraries casually.

---

# 118. VERSION POLICY

Use supported stable versions at implementation time.

Pin via package-lock.

AI must inspect package.json before suggesting version-specific APIs.

---

# 119. PACKAGE MANAGER

npm.

Commit:

package-lock.json.

Do not mix npm/yarn/pnpm within project.

---

# 120. TARGET REPOSITORY

```text
boatly/
├── src/
│   ├── app/
│   ├── components/
│   ├── features/
│   ├── server/
│   ├── lib/
│   ├── config/
│   ├── types/
│   ├── emails/
│   └── styles/
│
├── public/
│
├── supabase/
│   ├── migrations/
│   ├── tests/
│   ├── seed.sql
│   └── config.toml
│
├── tests/
│   ├── e2e/
│   ├── integration/
│   └── fixtures/
│
├── .env.example
├── .env.local
├── .gitignore
├── package.json
├── package-lock.json
├── tsconfig.json
├── next.config.*
└── README.md
```

Actual scaffolding happens later.

---

# 121. SOURCES OF TRUTH

Authentication:

Supabase Auth.

Business data:

PostgreSQL.

Availability:

PostgreSQL occupancy model.

Payment-provider truth:

Stripe.

Geographic Boatly inventory:

PostGIS.

Map/geocoding:

Mapbox.

Files:

Supabase Storage.

Source code:

GitHub.

Deployment:

Vercel.

AI chat:

never a production source of truth.

---

# 122. AI / VIBECODING RULES

Every coding AI must:

1. inspect repository before editing;
2. read relevant specs;
3. preserve architecture;
4. never create duplicate auth;
5. never create second database;
6. never fake payment logic;
7. never bypass RLS;
8. never expose secrets;
9. never trust client price;
10. never trust client availability;
11. never trust client compliance/legal eligibility;
12. never confirm payment from frontend redirect;
13. never directly modify production schema without migration;
14. preserve tenant isolation;
15. preserve historical snapshots;
16. reuse components;
17. reuse domain services;
18. avoid unrelated file changes;
19. explain architecture divergence before implementing;
20. keep documentation and code aligned.

---

# 123. SPECIFICATION PRIORITY

For implementation, inspect:

1. ARCHITECTURE.md
2. DATABASE_SCHEMA.md
3. ROLES_PERMISSIONS.md
4. USER_FLOWS.md
5. USER_STORIES.md
6. SITEMAP.md
7. BOATLY_PRD.md
8. BUSINESS_MODEL.md
9. LEGAL_REQUIREMENTS.md

If legal compliance conflicts with convenience:

legal requirement wins.

---

# 124. ARCHITECTURE CHANGE PROCESS

If architecture must change:

1. identify issue;
2. describe proposed change;
3. assess consequences;
4. update specs;
5. update affected schema/flows;
6. implement.

Never silently diverge.

---

# 125. MVP INFRASTRUCTURE BOUNDARIES

Do not initially introduce:

* Kubernetes;
* microservices;
* Kafka;
* custom broker;
* Elasticsearch;
* Redis without demonstrated need;
* separate API repo;
* separate frontend repo;
* GraphQL layer;
* complex event bus;
* data warehouse;
* native backend;
* AI infrastructure.

---

# 126. FINAL ARCHITECTURAL GOAL

Boatly combines:

SIMPLE INFRASTRUCTURE

*

STRICT DOMAIN RULES

*

STRONG DATABASE INTEGRITY

*

TENANT SECURITY

*

IMMUTABLE BUSINESS HISTORY

*

PAYMENT INTEGRITY

*

LEGAL / COMPLIANCE GATES

*

CLEAR MODULE BOUNDARIES.
