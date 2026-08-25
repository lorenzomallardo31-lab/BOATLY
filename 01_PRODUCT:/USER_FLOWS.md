# BOATLY — USER FLOWS

**Version:** 1.1
**Status:** Phase A — Final Approved Specification

---

# 1. PURPOSE

This document defines the principal happy paths, operational paths, security paths and edge cases of Boatly.

---

# 2. FLOW GROUPS

Flows cover:

* customer marketplace;
* customer account;
* checkout;
* payment;
* cancellation/refund;
* operator onboarding;
* fleet;
* availability;
* manual bookings;
* rental operations;
* staff/skippers;
* payments;
* admin;
* compliance;
* legal contracts;
* privacy;
* tax reporting;
* system/security edge cases.

---

# 3. CUSTOMER SEARCH

Homepage

↓

Enter location

↓

Select date

↓

Select start time

↓

Select duration

↓

Passenger count

↓

Search

↓

Server evaluates:

* geographic match;
* approved operator;
* published boat;
* active location;
* relevant legal offering;
* passenger capacity;
* compliance;
* requested availability.

↓

Results list + map.

---

# 4. CUSTOMER FILTER

Search results

↓

Open filters

↓

Select one or more:

* type;
* price;
* distance;
* capacity;
* horsepower;
* licence eligibility;
* skipper;
* amenities;
* rating;
* other supported filters

↓

Server/query updates

↓

List + map update consistently.

---

# 5. CUSTOMER MAP

Customer moves map

↓

Map viewport changes

↓

User requests/searches area where applicable

↓

Server performs spatial query

↓

Results update

↓

Map markers + list stay synchronized.

---

# 6. CUSTOMER BOAT DETAIL

Search result

↓

Boat page

↓

View:

* gallery;
* specifications;
* operator;
* location;
* availability;
* price;
* amenities;
* extras;
* licence information;
* skipper/legal offering;
* deposit;
* fuel policy;
* cancellation;
* reviews.

↓

Choose suitable configuration

↓

Checkout.

---

# 7. CUSTOMER FAVORITE

Authenticated:

Boat

↓

Add favorite

↓

favorite created.

Unauthenticated:

Add favorite

↓

login/register

↓

return to intended boat/action.

---

# 8. CHECKOUT INITIALIZATION

Boat selected

↓

Create or load booking draft

↓

Store intended selection without treating draft as confirmed reservation.

---

# 9. CHECKOUT LEGAL / COMPLIANCE GATE

Server checks:

* operator eligibility;
* boat status;
* legal offering;
* compliance;
* insurance where applicable;
* passenger limit;
* driver eligibility;
* licence requirements;
* required legal document versions;
* allowed dates.

Failure:

STOP checkout

↓

specific safe error.

Success:

continue.

---

# 10. CHECKOUT PRICE

Server retrieves:

* rate plan;
* pricing rules;
* date;
* duration;
* extras;
* mandatory charges;
* applicable commission/commercial plan;
* tax/fee configuration.

↓

Trusted price calculation.

Frontend does not supply authoritative total.

---

# 11. CHECKOUT CUSTOMER DATA

Collect:

* customer details;
* passenger count;
* required driver information;
* special requests;
* other strictly required booking information.

---

# 12. CHECKOUT CONTRACTUAL SUMMARY

Before payment display:

* professional operator;
* boat;
* contract type where appropriate;
* location;
* start/end;
* passengers;
* extras;
* full price;
* deposit;
* fuel policy;
* cancellation terms;
* withdrawal information where applicable;
* required Terms;
* payment obligation.

User can correct information before final action.

---

# 13. LEGAL ACCEPTANCE

User selects required acceptance

↓

Server links acceptance to exact legal document version

↓

Acceptance evidence stored immutably.

Marketing consent is separate.

---

# 14. CREATE BOOKING HOLD

Server requests atomic hold

↓

Database checks overlap

↓

If free:

create HOLD occupancy with expiry.

If occupied:

reject.

---

# 15. CREATE PAYMENT

Valid active hold

↓

Server creates Stripe payment/checkout object

↓

Expected amount/currency/booking metadata linked securely.

---

# 16. CUSTOMER PAYMENT

Customer completes provider flow.

---

# 17. PAYMENT SUCCESS REDIRECT

Provider redirects browser to Boatly

↓

UI shows:

processing / verifying.

Redirect does NOT confirm booking.

---

# 18. PAYMENT WEBHOOK VERIFICATION

Stripe sends event

↓

Route Handler receives raw request

↓

Verify signature

↓

Check supported event

↓

Check unique Stripe event ID

↓

Validate internal references

↓

Process.

---

# 19. PAYMENT SUCCESS

Verified provider payment

↓

Transaction/workflow:

* payment → PAID;
* booking → CONFIRMED;
* hold → confirmed booking occupancy;
* financial snapshots finalized;
* booking event stored;
* contract generation triggered;
* notifications created.

---

# 20. CONTRACT GENERATION

Confirmed booking

↓

Load immutable booking/legal snapshots

↓

Select correct template version

↓

Generate contractual record

↓

Store protected file/reference/hash

↓

Customer/operator authorized access

↓

durable confirmation.

---

# 21. PAYMENT FAILURE

Payment fails

↓

Booking not confirmed

↓

Payment failure recorded

↓

Hold expires/releases

↓

Customer may retry while eligibility remains.

---

# 22. CUSTOMER CLOSES BROWSER AFTER PAYMENT

Customer successfully pays

↓

closes tab before returning

↓

Stripe webhook still arrives

↓

server confirms booking

↓

contract created

↓

notifications sent

↓

booking visible later in account.

---

# 23. PAYMENT CREATION FAILURE AFTER HOLD

Hold created

↓

Stripe creation fails

↓

Do NOT confirm booking

↓

Log failure

↓

hold retains only temporary expiry

↓

eventually releases.

---

# 24. DUPLICATE WEBHOOK

Same Stripe event arrives again

↓

unique event ID detected

↓

return successful acknowledgment where appropriate

↓

no duplicate business side effects.

---

# 25. CUSTOMER BOOKINGS

Login

↓

`/account/prenotazioni`

↓

List own bookings only

↓

select booking

↓

detail.

---

# 26. CUSTOMER BOOKING DETAIL

Display:

* state;
* boat;
* operator;
* location;
* date/time;
* passengers;
* extras;
* price;
* payment/refund;
* cancellation;
* contract;
* support.

---

# 27. CUSTOMER CANCELLATION

Customer requests cancellation

↓

Server evaluates:

* booking state;
* statutory rights;
* cancellation snapshot;
* timing;
* applicable exceptions.

↓

Show expected refund/outcome

↓

Customer confirms

↓

controlled transition.

---

# 28. CANCELLATION COMPLETION

Booking cancelled

↓

occupancy released where applicable

↓

refund workflow when applicable

↓

booking event

↓

notifications.

---

# 29. REFUND

Authorized workflow

↓

create internal refund

↓

call Stripe/provider

↓

provider processing

↓

provider result/webhook

↓

internal state update

↓

booking/payment reconciliation

↓

notifications.

---

# 30. WEATHER CANCELLATION

Operator/customer raises weather/safety issue

↓

record dedicated reason

↓

apply legally/commercially approved weather workflow

↓

refund/reschedule according to policy

↓

events/audit where required.

---

# 31. REVIEW

COMPLETED eligible booking

↓

customer submits review

↓

booking ownership checked

↓

one-review rule checked

↓

review created with moderation state

↓

public when allowed.

---

# 32. CONTENT REPORT

User selects report

↓

choose reason

↓

optional details

↓

content report created

↓

moderator/admin review.

---

# 33. CONTENT REPORT DECISION

Moderator investigates

↓

decision:

* no violation;
* hide/restrict content;
* request correction;
* other permitted action

↓

reason saved

↓

affected party notified where appropriate

↓

audit where sensitive.

---

# 34. OPERATOR REGISTRATION

`Diventa noleggiatore`

↓

register account

↓

verify email

↓

create operator workspace

↓

status ONBOARDING.

---

# 35. OPERATOR ONBOARDING — BUSINESS

Enter:

* public/business information;
* contact;
* basic organization data.

↓

save.

---

# 36. OPERATOR ONBOARDING — LEGAL/TAX

OWNER enters required legal/tax information.

↓

validate required fields.

↓

save private profile.

---

# 37. OPERATOR ONBOARDING — LOCATIONS

Create first location

↓

address/port

↓

timezone

↓

geocoding/coordinates

↓

save.

Multiple locations may follow.

---

# 38. OPERATOR ONBOARDING — DOCUMENTS

Upload required operator compliance evidence

↓

private storage

↓

document records

↓

pending review.

---

# 39. STRIPE CONNECT ONBOARDING

OWNER starts Stripe Connect flow

↓

provider-hosted onboarding

↓

return

↓

Boatly synchronizes:

* account ID;
* details submitted;
* charges enabled;
* payouts enabled;
* requirements due.

---

# 40. OPERATOR ONBOARDING SUBMIT

Required onboarding sections complete

↓

submit for platform review

↓

PENDING_VERIFICATION.

---

# 41. ADMIN OPERATOR VERIFICATION

ADMIN/COMPLIANCE opens operator

↓

reviews:

* business;
* legal/tax;
* compliance;
* payment readiness.

↓

APPROVE

or:

REJECT / REQUEST CORRECTION.

↓

reason/history stored

↓

operator notified.

---

# 42. CREATE BOAT DRAFT

Authorized operator

↓

new boat

↓

status DRAFT.

---

# 43. BOAT INFORMATION

Fill:

* category;
* name;
* description;
* specs;
* passenger capacity.

---

# 44. BOAT ENGINE / LICENCE DATA

Fill required engine/legal eligibility inputs:

* power;
* horsepower;
* displacement;
* engine type/configuration;
* applicable navigation information.

Do not reduce to boolean licence flag.

---

# 45. BOAT LEGAL OFFERING

Choose proposed contract/offering type

↓

system validates configuration requirements

↓

may require compliance review.

---

# 46. BOAT LOCATION

Assign operator location.

---

# 47. BOAT PHOTOS

Upload

↓

order

↓

choose cover.

---

# 48. BOAT AMENITIES

Choose standardized amenities.

---

# 49. BOAT PRICING

Configure:

* rate plan;
* seasonal/date rules;
* duration;
* other supported pricing.

---

# 50. BOAT EXTRAS

Assign operator extras.

---

# 51. BOAT AVAILABILITY

Configure recurring schedule/date validity.

---

# 52. BOAT DOCUMENTS

Upload required vessel/commercial/insurance evidence.

---

# 53. BOAT SUBMIT FOR REVIEW

System checks completeness

↓

if incomplete:

show missing requirements.

If complete:

PENDING_REVIEW.

---

# 54. ADMIN BOAT REVIEW

ADMIN/COMPLIANCE/MODERATOR according to scope reviews:

* public content;
* technical data;
* legal offering;
* compliance;
* insurance;
* operator eligibility.

↓

APPROVE / CHANGES_REQUESTED / REJECT.

---

# 55. BOAT PUBLISHED

All gates pass

↓

status PUBLISHED

↓

eligible for marketplace search.

---

# 56. EDIT BOAT

Authorized operator edits allowed current configuration.

↓

If sensitive changes require new compliance/publication review:

appropriate review gate triggered.

Existing confirmed booking snapshots unchanged.

---

# 57. CHANGE PRICE

Future pricing updated

↓

new searches/bookings use new rule

↓

old confirmed bookings unchanged.

---

# 58. CREATE AVAILABILITY BLOCK

Operator selects:

* boat;
* interval;
* reason.

↓

availability check

↓

blocking occupancy created.

---

# 59. MAINTENANCE OVER CONFIRMED BOOKING

Operator attempts conflicting maintenance

↓

system detects existing booking

↓

action blocked/warning with explicit resolution process.

Never silently invalidate booking.

---

# 60. MANUAL BOOKING

Operator selects new manual booking

↓

existing CRM customer

or:

create customer

↓

boat

↓

date/time

↓

passengers

↓

extras/notes

↓

server availability check

↓

create MANUAL booking + occupancy atomically.

---

# 61. MANUAL PAYMENT

Optional:

record:

* payment method;
* amount;
* status;
* received date.

Record is explicitly offline/manual.

No Stripe verification claimed.

---

# 62. MARKETPLACE BOOKING RECEIVED

Verified marketplace booking

↓

operator notification

↓

appears in:

* bookings;
* calendar;
* CRM;
* analytics.

---

# 63. ASSIGN SKIPPER

Authorized operator

↓

select skipper

↓

verify qualification/compliance where required

↓

check skipper schedule

↓

assign or reject conflict.

---

# 64. START RENTAL

Booking CONFIRMED

↓

authorized actor

↓

state validation

↓

IN_PROGRESS

↓

booking event.

---

# 65. COMPLETE RENTAL

IN_PROGRESS

↓

authorized actor

↓

COMPLETED

↓

event

↓

review eligibility

↓

payout eligibility according to policy.

---

# 66. OPERATOR CANCEL BOOKING

Authorized operator

↓

select reason

↓

server evaluates customer/refund effects

↓

confirmation

↓

cancel

↓

release occupancy

↓

refund workflow

↓

operator reliability metrics

↓

audit where required.

---

# 67. ARCHIVE BOAT

Operator requests archive

↓

system checks future bookings

↓

if future obligations:

resolution required.

↓

archive future marketplace listing

↓

retain all history.

---

# 68. CRM CUSTOMER FROM MARKETPLACE

Marketplace booking confirmed

↓

create/link operator customer record where appropriate

↓

operator-specific relationship established.

---

# 69. DIRECT CRM CUSTOMER

Operator creates direct customer

↓

no Boatly account required.

---

# 70. STAFF INVITATION

OWNER/permitted MANAGER

↓

email + permitted role

↓

create secure expiring invitation

↓

recipient accepts

↓

membership ACTIVE.

---

# 71. INVALID STAFF PRIVILEGE ESCALATION

MANAGER/EMPLOYEE attempts unauthorized OWNER assignment

↓

server/RLS rejects.

---

# 72. REMOVE LAST OWNER

Attempt would produce zero active OWNERs

↓

reject.

---

# 73. DOCUMENT UPLOAD

Authorized operator

↓

scope/type

↓

validate file/type/size

↓

private storage

↓

metadata

↓

status PENDING.

---

# 74. DOCUMENT REVIEW

COMPLIANCE/admin

↓

inspect

↓

APPROVED / REJECTED

↓

reason if rejected

↓

notifications/history.

---

# 75. DOCUMENT EXPIRATION WARNING

Scheduled job detects approaching expiration

↓

notify operator.

---

# 76. DOCUMENT EXPIRES

status EXPIRED

↓

compliance requirement re-evaluated

↓

marketplace eligibility affected where required

↓

operator/admin notified.

---

# 77. EXPIRED DOCUMENT WITH FUTURE BOOKING

Compliance expires but future booking exists

↓

do not delete booking

↓

create resolution workflow

↓

platform/operator determines valid corrective action.

---

# 78. OPERATOR PAYMENT VIEW

Authorized role

↓

see permitted:

* booking;
* amount;
* commission;
* operator net;
* refund;
* payout.

---

# 79. ANALYTICS

Authorized operator

↓

date/location filters

↓

server-scoped tenant query

↓

metrics.

---

# 80. ADMIN DASHBOARD

Authorized platform user

↓

see role-appropriate platform metrics/work queues.

---

# 81. ADMIN USER SUSPENSION

Authorized admin

↓

inspect user/impact

↓

confirm

↓

suspend

↓

audit.

---

# 82. ADMIN OPERATOR SUSPENSION

Authorized admin

↓

inspect:

* future bookings;
* active rentals;
* payments;
* payouts;
* compliance;
* reason.

↓

confirm

↓

operator SUSPENDED

↓

no new marketplace bookings

↓

limited resolution access where policy allows

↓

audit/notification.

---

# 83. ADMIN PAYMENT INVESTIGATION

FINANCE/admin

↓

booking/payment lookup

↓

compare:

* internal booking;
* internal payment;
* Stripe intent/charge;
* Stripe events;
* refunds.

↓

resolve/flag.

---

# 84. ADMIN EXCEPTIONAL REFUND

Authorized actor

↓

reason required

↓

permission check

↓

server refund workflow

↓

audit.

---

# 85. COMMISSION CHANGE

Authorized FINANCE/SUPER_ADMIN

↓

create new rule

↓

future effective date

↓

audit

↓

future eligible bookings use new rule

↓

existing booking snapshots unchanged.

---

# 86. OPERATOR PLAN ASSIGNMENT — PILOT

Authorized admin

↓

assign FOUNDING/other plan

↓

effective dates

↓

operator sees plan

↓

future commission determination uses applicable configuration.

---

# 87. SUBSCRIPTION UPGRADE — FUTURE BILLING

OWNER requests plan change

↓

server validates billing

↓

Stripe Billing when enabled

↓

future plan state updated

↓

historical booking economics unchanged.

---

# 88. LEGAL DOCUMENT VERSION RELEASE

Authorized platform role

↓

create new legal version

↓

review/approve

↓

set effective date

↓

old versions remain stored

↓

affected users notified/acceptance requested according to approved legal process.

---

# 89. CUSTOMER TERMS ACCEPTANCE

Checkout presents correct active version

↓

customer accepts

↓

immutable acceptance record linked to booking context.

---

# 90. OPERATOR TERMS ACCEPTANCE

Operator onboarding/updated terms

↓

required approved acceptance workflow

↓

record version/time/context.

---

# 91. PRIVACY REQUEST

User submits request

↓

create request

↓

identity verification where required

↓

assess retention/legal grounds

↓

perform permitted action

↓

record outcome

↓

notify user.

---

# 92. DAC7 SELLER READINESS

Operator legal/tax profile

↓

evaluate required reporting data

↓

missing information flagged

↓

seller reporting readiness updated.

---

# 93. DAC7 REPORTABLE BOOKING

Reportable marketplace transaction completes/qualifies

↓

historical reportable transaction snapshot stored

↓

assigned to reporting year/quarter.

---

# 94. DAC7 REPORTING PERIOD

Authorized finance/compliance

↓

review sellers/transactions

↓

generate report dataset

↓

professional validation/submission process

↓

submission reference/history stored.

---

# 95. PUBLICATION INCOMPLETE

Operator attempts submission/publication with missing mandatory field/compliance

↓

system blocks

↓

shows exact missing requirements.

---

# 96. BOAT BECOMES UNAVAILABLE DURING CHECKOUT

Customer viewed availability

↓

another valid hold/booking obtains slot

↓

customer attempts hold

↓

database rejects overlap

↓

no payment created

↓

show BOAT_UNAVAILABLE.

---

# 97. PAYMENT SUCCESS BUT INTERNAL CONFLICT

Payment provider reports success but unexpected internal booking conflict/error occurs

↓

never discard provider payment

↓

record reconciliation incident

↓

FINANCE/admin alert

↓

controlled resolution/refund if required.

Critical financial mismatch must not fail silently.

---

# 98. STRIPE WEBHOOK INVALID SIGNATURE

Reject request

↓

no financial/business state change.

---

# 99. UNSUPPORTED STRIPE EVENT

Record/ignore safely according to implementation

↓

no unsupported business side effect.

---

# 100. UNAUTHORIZED OPERATOR RESOURCE ACCESS

Operator A requests Operator B record

↓

authorization/RLS

↓

deny

↓

do not reveal sensitive ownership details.

---

# 101. CUSTOMER REQUESTS OTHER CUSTOMER BOOKING

deny.

---

# 102. SKIPPER REQUESTS PAYOUT

deny.

---

# 103. EMPLOYEE CHANGES PRICE WITHOUT PERMISSION

deny.

---

# 104. SUSPENDED STAFF REQUEST

membership not ACTIVE

↓

deny operator workspace access.

---

# 105. DIRECT URL TO PRIVATE DOCUMENT

authorization required

↓

if unauthorized:

no signed/private download.

---

# 106. CUSTOMER MOBILE HAPPY PATH

Homepage

→ Search

→ Results

→ Boat

→ Checkout

→ Payment

→ Processing

→ Confirmation

→ Booking account.

---

# 107. OPERATOR MOBILE DAILY FLOW

Login

→ Today/calendar

→ Booking detail

→ customer/boat information

→ start rental

→ complete rental

or:

create quick manual booking/block.

---

# 108. OPERATOR DESKTOP FLOW

Dashboard

→ Calendar

→ Bookings

→ Fleet

→ CRM

→ Staff

→ Compliance

→ Payments

→ Analytics.

---

# 109. CUSTOMER COMPLETE HAPPY PATH

Search

→ suitable boat

→ legal/availability gate passes

→ trusted price

→ Terms acceptance

→ hold

→ successful Stripe payment

→ verified webhook

→ confirmed booking

→ contract

→ rental

→ completion

→ verified review.

---

# 110. OPERATOR COMPLETE HAPPY PATH

Register

→ onboarding

→ verification

→ create location

→ add boat

→ compliance

→ publication

→ pricing/availability

→ booking received

→ rental

→ completion

→ payout/reporting.

---

# 111. MANUAL BOOKING HAPPY PATH

Direct lead

→ CRM customer

→ manual booking

→ occupancy

→ offline payment record

→ rental

→ completion

→ analytics

→ 0% marketplace commission.

---

# 112. ADMIN COMPLETE FLOW

Operator pending

→ verify

→ boat pending

→ verify

→ marketplace activity

→ monitor bookings/payments/compliance/reports

→ intervene only where needed.

---

# 113. FLOW DESIGN PRINCIPLES

Critical flows must:

* validate server-side;
* use explicit domain transitions;
* preserve immutable history;
* protect tenant boundaries;
* protect financial truth;
* handle retries/idempotency;
* handle concurrency;
* produce understandable user errors;
* preserve auditability;
* avoid silent data loss.

---

# 114. FINAL RULE

No implementation may simplify a critical flow by removing a protection defined in this document without an explicit architecture/specification change.
