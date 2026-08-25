# BOATLY

## PRODUCT REQUIREMENTS DOCUMENT

**Status:** Phase A — Final Approved Specification
**Version:** 1.1
**Last updated:** 25 August 2026
**Initial jurisdiction:** Italy
**Initial product:** Responsive Web Application

---

# 1. PRODUCT VISION

Boatly is a digital platform for professional recreational boat rental combining three products in one ecosystem:

1. a B2C marketplace for customers;
2. a B2B fleet-management SaaS for professional rental operators;
3. an administrative back office for Boatly.

Boatly is not intended to be only a directory of boats.

The long-term objective is to become the central operating system used by rental operators to manage their entire business while simultaneously providing customers with a modern marketplace for discovering and booking boats.

---

# 2. CORE PRODUCT PROPOSITION

For customers:

Search

→ Compare

→ Check real availability

→ Book

→ Pay

→ Manage rental

→ Review.

For operators:

Fleet

→ Availability

→ Marketplace bookings

→ Manual bookings

→ Customers

→ Staff

→ Skippers

→ Payments

→ Compliance

→ Analytics.

For Boatly:

Supply management

→ Marketplace operations

→ Payments

→ Verification

→ Moderation

→ Compliance

→ Financial reconciliation

→ Platform administration.

---

# 3. INITIAL MARKET

Initial geographic jurisdiction:

Italy.

Initial supply model:

professional rental operators only.

Excluded from MVP:

private owners offering occasional P2P rentals.

Reason:

private recreational rental introduces separate legal, tax, insurance and marketplace requirements that should not be mixed into the initial professional marketplace.

---

# 4. INITIAL LAUNCH STRATEGY

Boatly should prioritize geographical concentration of supply.

A marketplace with sufficient inventory in one destination cluster creates more customer value than the same number of boats dispersed across the entire country.

Potential initial cluster:

Campania.

Possible destinations include:

* Napoli
* Pozzuoli
* Bacoli
* Procida
* Ischia
* Capri
* Sorrento
* Amalfi Coast

Exact commercial launch geography remains a business decision.

---

# 5. PRIMARY USER GROUPS

## Public Visitor

Unauthenticated marketplace visitor.

## Customer

Authenticated marketplace user who searches and books boats.

## Operator OWNER

Highest business role for a rental operator.

## Operator MANAGER

Operational management role.

## Operator EMPLOYEE

Restricted operational staff role.

## Operator SKIPPER

Restricted role for assigned rental operations.

## Boatly SUPER_ADMIN

Highest platform administrative role.

## Boatly ADMIN

General platform operations role.

## Boatly SUPPORT

Customer/operator support role.

## Boatly FINANCE

Payments, commissions, reconciliation and tax-reporting role.

## Boatly MODERATOR

Marketplace content/review moderation role.

## Boatly COMPLIANCE

Operator, vessel and professional-document verification role.

---

# 6. PRODUCT AREAS

Boatly contains three main product areas.

## Public Marketplace / Customer Area

Used by:

* public visitors
* customers

## Operator Workspace

Used by:

* OWNER
* MANAGER
* EMPLOYEE
* SKIPPER

## Boatly Admin Back Office

Used by authorized platform personnel.

These areas remain part of one application but use strict authorization boundaries.

---

# 7. CUSTOMER MARKETPLACE

Customers must be able to:

* search by location;
* search by date;
* specify starting time;
* specify duration;
* specify passenger count;
* apply filters;
* compare boats;
* see map and list simultaneously;
* inspect boat details;
* inspect operator information;
* save favorites;
* view transparent pricing;
* understand licence requirements;
* understand skipper/commander configuration;
* select extras;
* complete checkout;
* pay securely;
* view bookings;
* cancel where permitted;
* receive refunds;
* download booking/contractual documentation;
* receive notifications;
* submit verified reviews;
* contact support;
* report marketplace problems.

---

# 8. SEARCH INPUTS

Primary search fields:

* location;
* date;
* start time;
* duration;
* passenger count.

Search must support location-based discovery rather than requiring users to know the rental operator name.

---

# 9. SEARCH FILTERS

Initial filters may include:

* boat category;
* price;
* distance;
* maximum passengers;
* horsepower;
* engine characteristics where useful;
* licence eligibility;
* skipper availability;
* skipper included;
* skipper required;
* amenities;
* rating;
* operator;
* location;
* security deposit;
* fuel policy;
* relevant legal rental offering.

Filters must operate server/database-side where appropriate.

The browser must not download the entire marketplace inventory and perform all filtering locally.

---

# 10. MAP + LIST EXPERIENCE

Search results contain:

LIST

*

MAP.

The views remain synchronized.

Expected behavior:

Select result in list

→ corresponding map marker highlighted.

Select map marker

→ corresponding boat/result highlighted.

Move map

→ user may request/update results in visible area.

Map interactions must remain usable on mobile.

An accessible list-based alternative must always exist.

---

# 11. SEARCH RESULT ELIGIBILITY

A boat can appear in marketplace results only when:

* operator is marketplace eligible;
* boat is published;
* boat location is active;
* selected legal offering is allowed;
* required compliance is valid;
* passenger requirements can be satisfied;
* requested period can be offered;
* boat is not blocked by platform/operator policy.

Search-result availability remains indicative until final booking validation.

---

# 12. BOAT DETAIL PAGE

Boat page includes:

* boat name;
* boat type;
* image gallery;
* operator;
* pickup location;
* map;
* public description;
* technical specifications;
* length;
* passenger capacity;
* engine data;
* horsepower;
* amenities;
* licence information;
* skipper information;
* legal rental configuration where relevant;
* price;
* rate information;
* extras;
* availability;
* security deposit;
* fuel policy;
* cancellation policy;
* reviews;
* public operator information.

Private documents and internal compliance information must never leak to public pages.

---

# 13. FAVORITES

Authenticated customers can:

* add boat to favorites;
* view favorites;
* remove favorite.

Favorites belong only to the user.

A customer must never see another customer's favorites.

---

# 14. LEGAL NAUTICAL CONTRACT MODEL

Boatly must distinguish operational skipper configuration from legal contractual model.

Operational configuration:

* NOT_AVAILABLE
* AVAILABLE
* INCLUDED
* REQUIRED

Potential legally validated contract types for Italy include:

* LOCAZIONE
* LOCAZIONE_WITH_COMMANDER
* NOLEGGIO

The product must not infer legal contract type simply from skipper availability.

The applicable legal contract type must be explicitly stored and snapshotted for confirmed bookings.

---

# 15. BOATING LICENCE ELIGIBILITY

The product must not use:

`horsepower <= 40 → licence not required`

as its legal model.

Licence eligibility may depend on:

* engine power;
* engine displacement;
* engine technology/type;
* boat/vessel category;
* navigation distance/limitations;
* legal offering;
* driver age;
* customer licence;
* issuing jurisdiction;
* applicable legislation.

The marketplace filter "senza patente" must ultimately be based on a validated eligibility engine.

---

# 16. PASSENGER ELIGIBILITY

Booking passenger count must not exceed the strictest applicable capacity.

Possible limits include:

* vessel certification;
* technical maximum;
* contractual configuration;
* legal contract-type requirements;
* skipper/crew impact where applicable.

Checkout must reject invalid passenger counts server-side.

---

# 17. CUSTOMER DRIVER INFORMATION

Where customer will personally conduct the vessel, Boatly may need to collect:

* date of birth/age eligibility;
* licence possession;
* licence type/category;
* issuing country;
* validity information.

Only data actually needed for legal/operational purposes should be collected.

Document images should not be collected merely because they are technically possible.

---

# 18. AVAILABILITY MODEL

Actual boat availability is determined from:

Recurring availability rules

MINUS

active blocking occupancies.

Blocking occupancy types include:

* marketplace booking;
* manual booking;
* checkout hold;
* maintenance;
* transfer;
* private use;
* operator block;
* other explicitly blocking events.

---

# 19. DOUBLE-BOOKING PROTECTION

Double-booking prevention is a critical platform invariant.

Protection layers:

1. marketplace/search availability;
2. checkout availability validation;
3. final server-side booking validation;
4. database-level non-overlap constraint.

Two concurrent requests for the same boat and overlapping interval must never both succeed.

The database is the final line of defense.

---

# 20. CHECKOUT

Checkout must include:

* final boat;
* operator;
* pickup location;
* dates/times;
* passenger count;
* driver/licence information where applicable;
* extras;
* price breakdown;
* total amount;
* deposit;
* fuel policy;
* cancellation policy;
* withdrawal information where applicable;
* contractual supplier information;
* required legal Terms;
* explicit payment-obligation CTA.

Users must be able to correct information before final payment.

---

# 21. BOOKING LEGAL / COMPLIANCE GATE

Before payment creation the server verifies:

* operator still marketplace eligible;
* boat still eligible;
* required documents still valid;
* required insurance still valid where applicable;
* legal offering valid;
* passenger count valid;
* licence/driver requirements satisfied;
* selected dates still allowed;
* required legal document versions available;
* final cancellation treatment known;
* price recalculated;
* availability still available.

Failure of mandatory requirement stops payment.

---

# 22. TEMPORARY BOOKING HOLD

Before customer pays, Boatly can create a short-lived blocking hold.

Hold:

* belongs to boat/time interval;
* blocks competing checkout attempts;
* has expiration;
* is created atomically;
* cannot overlap another active blocking occupancy.

If payment succeeds:

hold becomes or is replaced by confirmed booking occupancy.

If payment fails/expires:

hold expires/releases.

Exact hold duration is decided during booking implementation.

---

# 23. MARKETPLACE PAYMENT FLOW

Customer checkout

↓

secure server-side payment creation

↓

Stripe

↓

customer completes payment

↓

Stripe sends webhook

↓

Boatly verifies webhook signature

↓

Boatly checks event idempotency

↓

Boatly validates booking/payment references

↓

payment state updated

↓

booking confirmed

↓

boat occupancy confirmed

↓

financial snapshots preserved

↓

contractual record generated

↓

notifications created.

---

# 24. PAYMENT SOURCE OF TRUTH

Frontend success redirect is not authoritative.

The following is forbidden:

Stripe redirect

→ immediately set booking `CONFIRMED`.

The verified payment-provider event is authoritative for provider payment success.

---

# 25. PAYMENT FAILURE

If payment fails:

* booking must not be confirmed;
* provider/internal payment state is updated;
* hold eventually releases;
* customer may retry if slot remains valid.

If browser closes after successful payment:

server-side webhook processing must still confirm the booking.

---

# 26. PAYMENT IDEMPOTENCY

Duplicate provider events must not duplicate:

* bookings;
* payments;
* occupancy;
* refunds;
* emails;
* notifications;
* commissions.

Provider event IDs must be stored uniquely.

---

# 27. BOOKINGS

A booking represents the commercial/operational reservation.

Booking source:

* MARKETPLACE
* MANUAL

Marketplace booking:

potential Boatly commission.

Manual booking:

0% marketplace commission.

---

# 28. BOOKING STATUSES

Core states:

* DRAFT
* PENDING_PAYMENT
* PAYMENT_PROCESSING
* CONFIRMED
* IN_PROGRESS
* COMPLETED
* CANCELLED_BY_CUSTOMER
* CANCELLED_BY_OPERATOR
* CANCELLED_BY_BOATLY
* PAYMENT_FAILED
* REFUND_PENDING
* REFUNDED
* PARTIALLY_REFUNDED
* NO_SHOW

State transitions occur only through controlled business operations.

Frontend cannot freely write status fields.

---

# 29. BOOKING SNAPSHOTS

Confirmed bookings must preserve historical values including:

* customer;
* boat;
* operator;
* pickup location;
* legal offering;
* contract type;
* driver eligibility outcome;
* price;
* extras;
* cancellation policy;
* commission;
* commercial plan where relevant;
* currency.

Changing future configurations must not rewrite history.

---

# 30. CANCELLATION

Cancellation flow considers:

1. mandatory statutory rights;
2. immutable cancellation policy snapshot;
3. booking state;
4. time remaining;
5. actor;
6. exceptional circumstances;
7. weather/safety rules;
8. operator/platform policies.

The result is calculated server-side.

---

# 31. REFUNDS

Refunds:

* are created through authorized server logic;
* reference payment and booking;
* communicate with payment provider;
* preserve provider references;
* track processing state;
* update booking/payment states;
* adjust economic reconciliation.

Users cannot manually write `refund = SUCCEEDED`.

---

# 32. WEATHER / SAFETY CANCELLATION

The product must support specific cancellation reasons for unsafe weather/sea conditions.

Final commercial/legal rules must define:

* authority/decision source;
* refund;
* rescheduling;
* evidence;
* responsibilities.

Weather handling is distinct from generic operator cancellation.

---

# 33. REVIEWS

Only customers linked to eligible completed bookings can review.

Principles:

* one review per eligible booking;
* rating 1–5;
* review moderation;
* negative rating alone is not grounds for removal;
* platform must be able to explain how verified reviews are verified.

---

# 34. OPERATOR ONBOARDING

Professional operator onboarding includes:

1. user account;
2. business creation;
3. public profile;
4. legal/tax profile;
5. locations;
6. compliance documents;
7. Stripe Connect onboarding;
8. operator verification.

Operator remains unavailable for marketplace bookings until required gates are complete.

---

# 35. MULTI-LOCATION OPERATORS

One operator can own many locations.

One location can host many boats.

Location data includes:

* name;
* address;
* port/marina;
* coordinates;
* timezone;
* contact details;
* operating status.

---

# 36. FLEET MANAGEMENT

Operator fleet management supports:

* multiple boats;
* creation/editing;
* images;
* cover image;
* technical specs;
* engine specs;
* passenger capacity;
* licence-related data;
* legal offering;
* location;
* amenities;
* extras;
* pricing;
* availability;
* documents;
* publication status;
* archive/pause.

---

# 37. BOAT PUBLICATION WORKFLOW

DRAFT

↓

complete boat information

↓

technical data

↓

legal offering

↓

photos

↓

amenities

↓

pricing

↓

extras

↓

availability

↓

required documents/compliance

↓

submit

↓

PENDING_REVIEW

↓

admin/compliance review

↓

PUBLISHED

or:

CHANGES_REQUESTED / REJECTED.

---

# 38. BOAT PUBLICATION GATE

Boat can become marketplace-bookable only if:

* operator eligible;
* boat data complete;
* legal offering valid;
* compliance complete;
* mandatory documents valid;
* insurance valid where applicable;
* price configured;
* availability configured;
* marketplace review approved.

---

# 39. MANUAL BOOKINGS

Operator can create bookings originating from:

* telephone;
* WhatsApp;
* walk-in;
* returning customer;
* direct website;
* other direct source.

Manual booking supports:

* existing/new operator customer;
* boat;
* date/time;
* passenger count;
* notes;
* extras;
* offline payment record;
* availability blocking.

Manual booking is part of Boatly calendar but generates 0% marketplace commission.

---

# 40. OPERATOR CRM

CRM supports:

## Platform customer

Linked to Boatly user.

## Direct customer

No Boatly account required.

Operator customer data remains tenant-specific.

One rental business cannot inspect another operator's CRM.

---

# 41. OPERATOR STAFF

Roles:

* OWNER
* MANAGER
* EMPLOYEE
* SKIPPER

Staff workflow supports:

* invitation;
* acceptance;
* role;
* active/suspended/removed status.

A business must never accidentally end with zero active OWNERs.

Users cannot promote themselves beyond authorized privileges.

---

# 42. SKIPPER MANAGEMENT

Operators can manage skipper records.

A skipper can:

* be an operator member with Boatly account;
* exist only as internal operator record.

System supports:

* identity;
* contact;
* qualification metadata;
* document verification;
* schedule;
* booking assignment;
* conflict prevention.

An operational skipper record does not automatically prove legally required commander qualification.

---

# 43. SKIPPER CONFLICTS

A skipper cannot be assigned to overlapping blocking assignments.

Server/database protection should reject overlapping incompatible assignments.

---

# 44. OPERATOR DOCUMENTS

Document scopes:

* operator;
* boat;
* skipper/commander.

Document statuses:

* PENDING
* UNDER_REVIEW
* APPROVED
* REJECTED
* EXPIRED

Private documents remain in protected storage.

---

# 45. COMPLIANCE EXPIRATION

System must detect:

* expiring documents;
* expired documents;
* compliance changes.

Flow:

warning

↓

expiration

↓

re-evaluate affected entity/offering

↓

restrict future marketplace booking if required

↓

notify operator/admin.

Existing confirmed bookings require explicit resolution and must not silently disappear.

---

# 46. LEGAL DOCUMENT VERSIONING

Boatly needs immutable legal document versions for:

* Customer Terms;
* Operator Terms;
* Privacy Notice;
* Cookie Policy;
* Cancellation Terms;
* Review Policy;
* rental/noleggio contract templates;
* other legally required documents.

---

# 47. LEGAL ACCEPTANCE

For required legal documents Boatly stores:

* exact version;
* user;
* operator context where applicable;
* booking context where applicable;
* timestamp;
* locale;
* proportional evidence.

Past acceptance records are immutable.

---

# 48. BOOKING CONTRACTS

Confirmed bookings may require generated contractual records.

Contract record preserves:

* booking;
* legal contract type;
* contract/template version;
* parties snapshot;
* booking details snapshot;
* file/hash;
* generation time;
* acceptance information.

Past contracts never dynamically change because a template is updated.

---

# 49. MARKETPLACE TRANSPARENCY

Customer must understand:

* who is supplying the rental service;
* Boatly's role;
* professional status of operator;
* price;
* cancellation rules;
* deposit;
* payment obligation;
* ranking principles;
* sponsored placement where applicable;
* review verification method.

---

# 50. CONTENT REPORTING

Users may report:

* illegal listing;
* fraudulent operator;
* unsafe/misleading listing;
* fake review;
* prohibited content;
* other marketplace issue.

Admin/moderator workflows preserve:

* report;
* status;
* decision;
* reason;
* actor;
* timestamp.

---

# 51. ADMIN

Admin product includes:

* users;
* operators;
* operator verification;
* boats;
* boat verification;
* compliance;
* bookings;
* payments;
* refunds;
* payouts;
* commissions;
* disputes/support;
* reviews;
* content reports;
* documents;
* audit logs;
* privacy requests;
* DAC7/tax workflow;
* platform settings.

---

# 52. BUSINESS MODEL

Initial commercial hypotheses:

| Plan              |     Monthly Fee | Marketplace Commission |
| ----------------- | --------------: | ---------------------: |
| Founding Operator | €0 during pilot |                     8% |
| Starter           |              €0 |                    15% |
| Pro               |       €49/month |                    10% |
| Business          |       €99/month |                     7% |
| Enterprise        |          Custom |                 Custom |

Commercial values remain configurable and subject to validation.

---

# 53. MANUAL BOOKING ECONOMICS

Manual booking:

0% marketplace commission.

This is a strategic requirement.

The operator should be encouraged to place all bookings inside the Boatly calendar.

---

# 54. CUSTOMER PLATFORM FEE

Initial launch:

no separate mandatory Boatly customer booking fee.

Price transparency is preferred.

Future fees remain possible only after commercial/legal validation and clear pre-checkout disclosure.

---

# 55. COMMISSION INTEGRITY

Commission:

* applies according to configurable rule;
* may vary by operator/plan;
* is calculated server-side;
* is snapshotted at booking;
* cannot retroactively change.

---

# 56. STRIPE CONNECT

Marketplace payments use Stripe Connect.

Exact Connect charge model remains subject to legal/payment validation.

Boatly must not create an unregulated custom wallet or pooled-money system.

---

# 57. SUBSCRIPTION BILLING

Future SaaS subscriptions may use Stripe Billing.

During pilot:

Founding Operator plan can be assigned manually.

Automated subscription billing is not required for initial operational testing.

---

# 58. FINANCIAL METRICS

Boatly distinguishes:

## Marketplace GMV

Value of marketplace-originated bookings.

## Managed Booking Volume

Marketplace + manual bookings managed in Boatly.

## Marketplace Commission Revenue

Platform commission earned.

## Subscription Revenue

Recurring SaaS revenue.

## Take Rate

Commission revenue / Marketplace GMV.

## Contribution Margin

Commission revenue minus transaction-specific costs.

GMV is never treated as Boatly revenue.

---

# 59. PRIVACY / GDPR

Product supports:

* privacy by design;
* data minimization;
* role-based access;
* tenant isolation;
* private storage;
* retention policies;
* rights requests;
* consent management where needed;
* processor review;
* data-breach process;
* audit trails.

---

# 60. COOKIE / ANALYTICS CONSENT

Non-essential analytics/tracking must only activate under the applicable legal consent model.

Cookie/preferences UI should support where required:

* accept;
* reject;
* granular categories;
* later modification.

No dark-pattern consent.

---

# 61. DAC7

Production architecture must support applicable seller reporting from the first reportable transaction.

Data architecture should preserve:

* seller legal/tax information;
* reportable consideration;
* transaction count;
* commissions/fees;
* reporting periods;
* report history.

Final implementation requires professional tax validation.

---

# 62. ACCESSIBILITY

Boatly should be designed accessibly regardless of whether a temporary legal microenterprise exemption applies.

Important requirements:

* semantic HTML;
* keyboard navigation;
* focus indicators;
* labels;
* accessible dialogs;
* contrast;
* screen-reader support;
* accessible errors;
* list alternative to map.

---

# 63. SECURITY

Core security architecture includes:

* Supabase Auth;
* RLS;
* server-side authorization;
* operator tenant isolation;
* customer isolation;
* least privilege;
* protected storage;
* service secret isolation;
* server-side pricing;
* server-side booking validation;
* payment webhook verification;
* audit logs;
* database constraints;
* default deny;
* role escalation prevention.

---

# 64. AUDITABILITY

Sensitive actions create audit records.

Examples:

* operator approval;
* operator suspension;
* boat approval;
* legal offering approval;
* document approval/rejection;
* refund;
* commission change;
* admin role change;
* compliance override;
* moderation decision;
* administrative cancellation.

---

# 65. NOTIFICATIONS

MVP supports:

* in-app notifications;
* transactional email.

Possible future:

* SMS;
* WhatsApp.

Important events include:

* booking confirmation;
* cancellation;
* refund;
* new operator booking;
* compliance warning;
* operator approval;
* boat approval/rejection;
* document status change.

---

# 66. PRODUCT ANALYTICS

Potential events:

* search_started
* search_completed
* boat_viewed
* favorite_added
* checkout_started
* payment_started
* booking_confirmed
* manual_booking_created
* operator_onboarding_started
* listing_published

Analytics must not receive unnecessary sensitive personal/financial/legal data.

---

# 67. RESPONSIVE STRATEGY

Customer marketplace:

mobile-first.

Operator dashboard:

responsive, desktop-optimized for complex workflows.

Admin:

desktop-optimized but responsive.

MVP does not require separate native apps.

---

# 68. SEO

Public marketplace supports:

* destination pages;
* category pages;
* boat pages;
* operator profiles;
* metadata;
* canonical URLs;
* structured data where appropriate;
* sitemap generation.

Do not create large amounts of empty low-quality SEO pages.

---

# 69. MVP FUNCTIONAL SCOPE

MVP includes:

* responsive public marketplace;
* authentication;
* customer account;
* geographic search;
* list/map results;
* boat pages;
* favorites;
* availability;
* pricing;
* booking holds;
* checkout;
* Stripe marketplace payments;
* cancellations/refunds;
* customer contracts;
* operator onboarding;
* legal/tax profile;
* multi-location;
* fleet;
* fleet calendar;
* manual bookings;
* CRM;
* staff;
* skippers;
* documents;
* compliance;
* operator payments;
* operator plan;
* analytics;
* admin;
* reviews;
* content reporting;
* notifications;
* legal acceptance;
* privacy/security foundation;
* monitoring/testing.

---

# 70. NOT MVP

Excluded initially:

* native iOS;
* native Android;
* AI concierge;
* AI dynamic pricing;
* AI demand forecasting;
* advanced weather automation;
* WhatsApp automation;
* loyalty;
* referral;
* public API;
* full channel manager;
* P2P private owners;
* insurance brokerage;
* custom Boatly wallet;
* custom escrow;
* advanced enterprise integrations;
* data warehouse;
* microservices infrastructure.

---

# 71. PILOT

Suggested commercial validation:

* 3–5 professional operators;
* meaningful real inventory;
* real availability updates;
* manual bookings entered;
* marketplace test bookings;
* payment/refund testing;
* repeated dashboard use;
* structured operator interviews.

---

# 72. PRODUCTION LEGAL BLOCKERS

Real paid marketplace launch requires professional resolution of:

* mediatore del diporto classification;
* locazione/noleggio contractual structure;
* locazione with commander rules;
* nautical compliance requirements;
* payment/PSD2 model;
* Stripe Connect setup;
* tax/invoicing;
* DAC7;
* customer terms;
* operator terms;
* consumer cancellation/withdrawal treatment;
* privacy/cookie obligations.

---

# 73. TECHNICAL STACK

* Next.js
* React
* TypeScript
* Tailwind CSS
* shadcn/ui
* Supabase
* PostgreSQL
* Supabase Auth
* Supabase Storage
* PostGIS
* Mapbox
* Stripe / Stripe Connect
* Resend
* Vercel
* GitHub
* PostHog
* Sentry
* Vitest
* Playwright

---

# 74. SOURCE-OF-TRUTH SPECIFICATIONS

Product:

* BOATLY_PRD.md
* USER_STORIES.md
* SITEMAP.md
* USER_FLOWS.md

Technical:

* DATABASE_SCHEMA.md
* ERD.md
* ROLES_PERMISSIONS.md
* ARCHITECTURE.md

Business/legal:

* BUSINESS_MODEL.md
* LEGAL_REQUIREMENTS.md

Future implementation must remain consistent with these files.

---

# 75. PHASE A FINAL RULE

Boatly must remain:

simple in infrastructure

but

strict in:

* booking integrity;
* permissions;
* payments;
* historical snapshots;
* tenant isolation;
* compliance;
* contractual evidence;
* auditability.
