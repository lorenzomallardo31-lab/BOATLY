# BOATLY — ROLES & PERMISSIONS

**Version:** 1.1
**Status:** Phase A — Final Approved Specification

---

# 1. PURPOSE

This document defines:

* roles;
* scopes;
* permissions;
* resource ownership;
* tenant isolation;
* platform administration;
* financial access;
* compliance access;
* future RLS requirements.

Authorization must never rely only on frontend visibility.

---

# 2. AUTHORIZATION LAYERS

Frontend:

controls UX visibility.

Server:

validates action/business permissions.

Supabase RLS:

protects database rows.

Database constraints:

protect integrity.

Storage policies:

protect files.

Audit logs:

record sensitive decisions.

No single layer replaces the others.

---

# 3. DEFAULT DENY

When permission is not explicitly granted:

DENY.

Future tables/resources must not accidentally become accessible because no policy exists.

---

# 4. ROLE SYSTEMS

Boatly has separate role systems.

## Operator Roles

* OWNER
* MANAGER
* EMPLOYEE
* SKIPPER

## Platform Roles

* SUPER_ADMIN
* ADMIN
* SUPPORT
* FINANCE
* MODERATOR
* COMPLIANCE

A user may possess both an operator membership and a platform role.

They remain independent.

---

# 5. PUBLIC USER

Can:

* browse public marketplace;
* search;
* use filters/map;
* view published boats;
* view public operator profiles;
* view approved reviews;
* read public information/legal pages;
* report content;
* register/login.

Cannot:

* book as authenticated customer until required authentication;
* access private account;
* operator dashboard;
* admin;
* CRM;
* private documents;
* payments;
* internal financial data.

---

# 6. CUSTOMER

Can:

* manage own profile;
* manage own favorites;
* perform own marketplace booking;
* view own bookings;
* view own contracts;
* view permitted payment/refund status;
* request eligible cancellation;
* submit own eligible review;
* view own notifications;
* submit support/privacy requests.

Cannot:

* view another customer's private data;
* access operator CRM;
* modify pricing snapshots;
* modify commission;
* mark provider payment paid;
* create fake refund;
* approve compliance;
* access admin.

---

# 7. OWNER

OWNER is the highest operator role.

Can:

* access operator dashboard;
* manage public/business profile;
* manage legal/tax profile;
* manage locations;
* manage fleet;
* create boats;
* edit boats;
* configure legal offerings;
* manage media;
* amenities;
* pricing;
* availability;
* blocks;
* extras;
* bookings;
* manual bookings;
* cancellations under rules;
* CRM;
* staff;
* roles;
* skippers;
* documents;
* compliance;
* cancellation policies;
* Stripe Connect onboarding;
* payments;
* commission visibility;
* payouts;
* subscription/plan;
* analytics;
* operator settings.

Cannot:

* access another operator;
* approve own platform verification;
* approve own boat as Boatly reviewer;
* change provider truth;
* edit historical booking snapshots;
* assign themselves platform admin.

---

# 8. MANAGER

Can:

* dashboard;
* calendar;
* booking management;
* manual bookings;
* fleet;
* boat information;
* photos;
* amenities;
* pricing by default;
* availability;
* blocks;
* CRM;
* extras;
* skippers;
* skipper assignments;
* operational documents;
* operational compliance;
* analytics;
* reviews;
* location operations.

Limited/no default permission:

* assign OWNER;
* remove last OWNER;
* Stripe ownership/onboarding;
* payout destination;
* critical legal/tax business identity;
* Boatly commission agreement;
* platform roles;
* provider payment truth.

---

# 9. EMPLOYEE

Primarily operational.

Can by default:

* operational dashboard;
* calendar;
* today's bookings;
* permitted booking details;
* customer data needed for rental;
* start rental;
* complete rental;
* view fleet;
* create manual booking where enabled;
* create basic block where enabled.

Cannot by default:

* edit pricing;
* configure legal offering;
* edit legal/tax profile;
* manage OWNER;
* manage Stripe;
* payouts;
* commissions;
* full financial analytics;
* platform administration.

---

# 10. SKIPPER

Can:

* login where linked to Boatly user;
* view assigned bookings;
* view assigned boat;
* pickup/time;
* passenger/customer information strictly needed;
* relevant notes;
* own schedule;
* permitted operational status actions.

Cannot:

* full CRM;
* unrelated bookings;
* pricing management;
* commissions;
* payout;
* staff management;
* business settings;
* platform administration.

A skipper can exist without login.

---

# 11. SUPER_ADMIN

Highest platform role.

Can:

* all platform administrative resources;
* platform roles;
* operators;
* boats;
* bookings;
* payments;
* refunds;
* payouts;
* commissions;
* plans;
* compliance;
* legal configuration;
* moderation;
* privacy;
* tax reporting;
* audit;
* platform settings.

Role must be extremely limited and never automatically assigned.

Sensitive actions audited.

---

# 12. ADMIN

General Boatly operations.

Can:

* view users/operators;
* approve/reject operators where assigned;
* suspend operators/users where allowed;
* review boats;
* inspect bookings;
* documents;
* operational platform resources;
* perform authorized interventions.

Cannot automatically:

* assign SUPER_ADMIN;
* fabricate Stripe state;
* expose secrets;
* bypass audit requirements;
* perform unrestricted financial operations.

---

# 13. SUPPORT

Can:

* search users/operators/bookings;
* view booking context needed to help;
* view support tickets;
* view simplified payment/refund status;
* help investigate cancellations/issues.

Cannot:

* unrestricted payout/bank information;
* change commissions;
* manage platform roles;
* manipulate provider payments;
* approve sensitive compliance by default.

---

# 14. FINANCE

Can:

* payments;
* refunds;
* payouts;
* commissions;
* payment reconciliation;
* revenue/GMV financial reporting;
* permitted refund operations;
* operator settlement information;
* Stripe references;
* DAC7 financial reporting workflow where assigned.

Cannot by default:

* edit public listings;
* manage operator staff;
* moderate reviews;
* modify customer identity;
* assign admins.

---

# 15. MODERATOR

Can:

* review public listings/content;
* review public media;
* moderate reviews;
* inspect marketplace reports;
* hide/restrict inappropriate public content where policy allows.

Cannot:

* payouts;
* private financial information;
* refunds;
* commission;
* Stripe configuration;
* platform roles;
* unnecessary legal documents.

---

# 16. COMPLIANCE

Can:

* review operator eligibility;
* review boat compliance;
* review skipper/commander qualifications;
* review legal offering;
* inspect required legal/tax information;
* approve/reject documents/compliance;
* manage compliance checks;
* monitor expiration;
* participate in DAC7 seller-readiness where specifically authorized.

Cannot by default:

* refund;
* payout;
* commission changes;
* unrelated customer financial data;
* platform-role assignment;
* Stripe provider truth.

---

# 17. RESOURCE OWNERSHIP

Private operator resource access requires evaluation of:

1. authenticated user;
2. target operator;
3. active membership;
4. role;
5. required permission;
6. resource state.

Any failure:

DENY.

---

# 18. TENANT ISOLATION

Operator A must never access Operator B:

* boats;
* bookings;
* customers;
* private documents;
* staff;
* payments;
* analytics;
* internal notes.

This remains true even if resource UUID is known.

---

# 19. CUSTOMER OWNERSHIP

Customers may access only own account resources.

Examples:

* profile;
* booking;
* favorite;
* notification;
* legal acceptance;
* booking contract.

---

# 20. PUBLIC BOAT ACCESS

Public read only if required publication conditions pass.

Public query must return only public-safe fields.

Never expose:

* private documents;
* tax data;
* staff;
* payout;
* internal compliance notes;
* provider identifiers not intended publicly.

---

# 21. PUBLIC OPERATOR ACCESS

Public may see:

* public name;
* description;
* logo;
* cover;
* public locations;
* published fleet;
* rating/reviews.

Not public:

* tax profile;
* staff;
* private email where not intended;
* documents;
* payments;
* payouts;
* analytics.

---

# 22. BOOKING PERMISSIONS — CUSTOMER

Can:

* create own marketplace booking workflow;
* read own booking;
* request cancellation;
* access own contract.

Cannot:

* edit price;
* edit commission;
* change owner/operator;
* directly mark confirmed/paid;
* alter historical snapshots.

---

# 23. BOOKING PERMISSIONS — OPERATOR

OWNER:

full authorized operational management for own tenant.

MANAGER:

full standard operational management.

EMPLOYEE:

limited operational management.

SKIPPER:

assigned bookings only.

---

# 24. BOOKING STATUS CONTROL

Sensitive states originate from controlled workflows.

Payment webhook:

PENDING_PAYMENT → CONFIRMED.

Operator:

CONFIRMED → IN_PROGRESS.

Operator:

IN_PROGRESS → COMPLETED.

Customer cancellation:

→ CANCELLED_BY_CUSTOMER.

Operator cancellation:

→ CANCELLED_BY_OPERATOR.

Authorized admin:

→ CANCELLED_BY_BOATLY.

Arbitrary frontend status updates forbidden.

---

# 25. BOAT PERMISSIONS

OWNER:

create/read/update/pause/archive/submit.

MANAGER:

create/read/update/operational management.

EMPLOYEE:

primarily read; limited updates if enabled.

SKIPPER:

assigned/required boat information only.

Public/customer:

published public read only.

Admin/Moderator/Compliance:

scope-specific review.

---

# 26. LEGAL OFFERING PERMISSIONS

OWNER:

can propose/configure.

MANAGER:

limited according to permissions.

EMPLOYEE/SKIPPER:

cannot configure.

COMPLIANCE:

can approve/reject where required.

Operator cannot self-approve platform compliance.

---

# 27. PRICING PERMISSIONS

OWNER:

full.

MANAGER:

full by default MVP.

EMPLOYEE:

no edit by default.

SKIPPER:

no edit.

Customer:

read public/final calculated amount only.

Historical booking pricing:

never editable through ordinary configuration.

---

# 28. AVAILABILITY PERMISSIONS

OWNER:

full.

MANAGER:

full.

EMPLOYEE:

view + limited blocking/manual actions where enabled.

SKIPPER:

own assignments/schedule.

Customer:

query only.

System:

creates holds/booking occupancy.

---

# 29. CRM PERMISSIONS

OWNER:

full operator CRM.

MANAGER:

full operational CRM.

EMPLOYEE:

limited rental-needed CRM.

SKIPPER:

only required details for assignments.

Customer:

no operator CRM access.

Platform:

only role-justified access.

---

# 30. STAFF PERMISSIONS

OWNER:

invite/change/suspend/remove permitted memberships.

MANAGER:

may manage EMPLOYEE/SKIPPER if configured.

Cannot assign OWNER by default.

EMPLOYEE/SKIPPER:

no staff management.

---

# 31. LAST OWNER PROTECTION

Reject action that would result in:

zero active OWNER memberships.

---

# 32. ROLE ESCALATION PROTECTION

Forbidden examples:

* employee self → owner;
* manager self → owner;
* customer → admin;
* operator owner → platform admin.

---

# 33. STRIPE CONNECT PERMISSIONS

OWNER:

initiate/continue onboarding.

MANAGER:

no critical account ownership/payout setup by default.

EMPLOYEE/SKIPPER/Customer:

none.

FINANCE/Admin:

permitted provider-state visibility.

Secrets:

server only.

---

# 34. PAYMENT PERMISSIONS — CUSTOMER

Can:

* initiate own payment;
* see permitted own status/refund.

Cannot:

* set PAID;
* edit amount;
* create fake refund.

---

# 35. PAYMENT PERMISSIONS — OPERATOR

OWNER:

see own operator payment information.

MANAGER:

limited operational payment view.

EMPLOYEE:

simplified status where needed.

SKIPPER:

none.

Provider truth cannot be overwritten.

---

# 36. MANUAL PAYMENT PERMISSIONS

Authorized operator roles may record legitimate offline payment status.

They cannot create a fake Stripe/provider payment.

UI must make distinction explicit.

---

# 37. REFUND PERMISSIONS

Customer:

initiates eligible cancellation workflow.

Operator:

initiates permitted cancellation workflow.

FINANCE/authorized admin:

exceptional permitted refunds.

Provider success state:

only trusted provider/server logic.

---

# 38. PAYOUT PERMISSIONS

OWNER:

own operator payout view.

MANAGER:

limited/no default.

EMPLOYEE/SKIPPER/customer:

none.

FINANCE/SUPER_ADMIN:

platform-level.

---

# 39. SUBSCRIPTION PERMISSIONS

OWNER:

view/manage subscription when billing enabled.

MANAGER:

limited view.

EMPLOYEE/SKIPPER:

none.

Authorized admin:

assign pilot plan/support subscription.

---

# 40. DOCUMENT PERMISSIONS

OWNER:

own operator/boat/skipper documentation.

MANAGER:

operational documents.

EMPLOYEE:

limited.

SKIPPER:

own relevant documentation.

COMPLIANCE:

review.

Public/customer:

private docs denied.

---

# 41. COMPLIANCE PERMISSIONS

Operator:

submit evidence/view own status.

Platform compliance roles:

approve/reject.

Operators cannot self-approve.

Compliance overrides:

highly restricted + audited.

---

# 42. CONTRACT ACCESS

Customer:

own booking contracts.

Operator:

own operator booking contracts according to role.

Skipper:

minimum necessary contract/operational detail.

Platform:

legitimate authorized review.

Public:

none.

---

# 43. LEGAL DOCUMENT VERSION MANAGEMENT

Create/activate legal versions:

restricted platform permission.

Ordinary users:

cannot edit.

Historical accepted version:

immutable.

---

# 44. REVIEW PERMISSIONS

Customer:

eligible booking only.

Operator:

read own received reviews.

Cannot delete review because rating is negative.

Moderator/Admin:

policy-based moderation.

Public:

approved reviews.

---

# 45. FAVORITES

User:

own only.

---

# 46. NOTIFICATIONS

User:

read/mark own notifications.

Cannot read others.

Transactional notifications:

created by trusted system logic.

---

# 47. ANALYTICS

OWNER:

full own operator.

MANAGER:

operational.

EMPLOYEE:

limited.

SKIPPER:

none.

Platform roles:

according to scope.

All queries tenant-scoped.

---

# 48. COMMISSION

Operator:

view applicable own booking/commercial terms.

Cannot change Boatly commission.

FINANCE/SUPER_ADMIN:

authorized commission management.

Every change audited.

---

# 49. DAC7

Seller tax data/reporting:

restricted.

Typical access:

* SUPER_ADMIN;
* FINANCE;
* specifically authorized COMPLIANCE.

Operator can manage required own seller data.

Operator cannot modify submitted historical reports.

---

# 50. PRIVACY REQUESTS

User:

submit own.

Authorized platform staff:

process.

Operator employees:

no global privacy-request access.

Deletion must respect retention requirements.

---

# 51. CONTENT REPORTS

Public/authenticated users:

submit.

Moderator/Admin:

investigate/decide.

Affected parties cannot alter moderator decision.

---

# 52. AUDITED ACTIONS

At minimum:

* operator approval/rejection/suspension;
* user suspension;
* boat approval/rejection;
* legal offering approval;
* document/compliance decisions;
* exceptional refund;
* commission changes;
* platform role changes;
* admin booking cancellation;
* review moderation;
* content moderation;
* legal version activation;
* exceptional compliance override.

---

# 53. SENSITIVE UI CONFIRMATION

Require explicit confirmation for actions such as:

* archive boat;
* cancel booking;
* suspend operator;
* remove staff;
* change critical role;
* refund;
* commission change;
* disconnect/change payment setup.

UI confirmation is not backend authorization.

---

# 54. HARD DELETE

Hard deletion is rare.

Boats:

archive.

Operators:

deactivate.

Bookings:

retain.

Payments/refunds/audit/contracts:

retain.

Favorites:

normal delete permitted.

Reviews:

moderate/hide where appropriate.

---

# 55. MULTIPLE OPERATOR MEMBERSHIPS

A user can be:

OWNER at Operator A

and:

MANAGER at Operator B.

Every operator request must explicitly resolve active workspace and revalidate membership.

---

# 56. PLATFORM ROLE + OPERATOR ROLE

Example:

user is operator OWNER + Boatly SUPPORT.

Being OWNER does not expand SUPPORT platform permissions.

Being SUPPORT does not grant operator membership.

Contexts remain separate.

---

# 57. OPERATOR PERMISSION MATRIX

Legend:

Y = allowed by default
L = limited/contextual/configurable
N = denied by default

| Resource / Action      | OWNER | MANAGER | EMPLOYEE | SKIPPER |
| ---------------------- | ----: | ------: | -------: | ------: |
| Dashboard              |     Y |       Y |        Y |       L |
| Fleet view             |     Y |       Y |        Y |       L |
| Create boat            |     Y |       Y |        N |       N |
| Edit boat              |     Y |       Y |        L |       N |
| Archive boat           |     Y |       L |        N |       N |
| Photos                 |     Y |       Y |        L |       N |
| Legal offering         |     Y |       L |        N |       N |
| Pricing view           |     Y |       Y |        L |       N |
| Pricing edit           |     Y |       Y |        N |       N |
| Availability view      |     Y |       Y |        Y |       L |
| Availability edit      |     Y |       Y |        L |       N |
| Booking view           |     Y |       Y |        Y |       L |
| Manual booking         |     Y |       Y |        L |       N |
| Booking cancellation   |     Y |       Y |        L |       N |
| CRM                    |     Y |       Y |        L |       N |
| Assigned customer info |     Y |       Y |        Y |       Y |
| Extras                 |     Y |       Y |        L |       N |
| Skippers               |     Y |       Y |        L |       N |
| Staff                  |     Y |       L |        N |       N |
| Assign OWNER           |     Y |       N |        N |       N |
| Locations              |     Y |       Y |        L |       N |
| Documents              |     Y |       Y |        L |       L |
| Compliance             |     Y |       Y |        L |       L |
| Legal/tax profile      |     Y |       L |        N |       N |
| Stripe onboarding      |     Y |       N |        N |       N |
| Payment overview       |     Y |       L |        L |       N |
| Payout                 |     Y |       N |        N |       N |
| Subscription           |     Y |       L |        N |       N |
| Analytics              |     Y |       Y |        L |       N |
| Business settings      |     Y |       L |        N |       N |
| Cancellation policy    |     Y |       L |        N |       N |

---

# 58. PLATFORM PERMISSION MATRIX

Legend:

Y = allowed
L = limited/contextual
N = denied

| Resource / Action      | SUPER_ADMIN | ADMIN | SUPPORT | FINANCE | MODERATOR | COMPLIANCE |
| ---------------------- | ----------: | ----: | ------: | ------: | --------: | ---------: |
| Users view             |           Y |     Y |       Y |       L |         L |          L |
| User suspend           |           Y |     Y |       N |       N |         N |          N |
| Operators view         |           Y |     Y |       Y |       L |         Y |          Y |
| Operator approve       |           Y |     Y |       N |       N |         N |          Y |
| Operator suspend       |           Y |     Y |       N |       N |         N |          L |
| Boats view             |           Y |     Y |       Y |       L |         Y |          Y |
| Boat approve           |           Y |     Y |       N |       N |         Y |          Y |
| Legal offering approve |           Y |     L |       N |       N |         N |          Y |
| Booking view           |           Y |     Y |       Y |       L |         L |          L |
| Booking intervention   |           Y |     Y |       L |       N |         N |          N |
| Payments view          |           Y |     L |       L |       Y |         N |          N |
| Refund initiate        |           Y |     L |       N |       Y |         N |          N |
| Payout view            |           Y |     L |       N |       Y |         N |          N |
| Commission view        |           Y |     L |       N |       Y |         N |          N |
| Commission edit        |           Y |     L |       N |       Y |         N |          N |
| Documents view         |           Y |     Y |       L |       L |         L |          Y |
| Compliance approve     |           Y |     L |       N |       N |         N |          Y |
| Reviews moderate       |           Y |     Y |       L |       N |         Y |          N |
| Content reports        |           Y |     Y |       L |       N |         Y |          L |
| DAC7 workflow          |           Y |     L |       N |       Y |         N |          L |
| Privacy requests       |           Y |     Y |       L |       N |         N |          N |
| Audit logs             |           Y |     Y |       L |       L |         L |          L |
| Platform settings      |           Y |     L |       N |       N |         N |          N |
| Admin role management  |           Y |     N |       N |       N |         N |          N |

---

# 59. RLS TARGET MODEL

Examples:

profiles:

user own profile.

operator resources:

active operator membership + role rules.

customer bookings:

customer_user_id = auth.uid().

operator bookings:

membership for booking.operator_id.

favorites:

user_id = auth.uid().

notifications:

recipient_user_id = auth.uid().

public boats:

published + approved/eligible operator.

Exact SQL comes later.

---

# 60. SERVICE ROLE

Service role bypasses RLS.

Therefore:

* server only;
* tightly controlled;
* business rules still validated;
* never browser exposed.

---

# 61. STORAGE SECURITY

Public boat images:

public read where intended.

Private documents:

authorization before access.

Contracts:

authorization before access.

Avatars:

owner-controlled.

---

# 62. INFORMATION LEAKAGE

Denied access must not reveal unnecessary facts.

Avoid:

"Booking exists but belongs to competitor."

Return safe forbidden/unavailable response.

Also protect:

* search;
* count;
* storage URLs;
* error messages.

---

# 63. SUSPENDED OPERATOR

New marketplace bookings:

disabled.

Existing obligations:

remain visible according to restricted policy.

Support/resolution access:

may remain.

History:

preserved.

---

# 64. REMOVED STAFF

Membership REMOVED:

immediate loss of tenant access.

Past actions remain historically referenced.

---

# 65. INVITED STAFF

INVITED status:

not full workspace access.

Invitation must be:

* secure;
* non-guessable;
* expiring.

---

# 66. ADMIN IMPERSONATION

Not MVP.

If introduced later:

* restricted role;
* explicit reason;
* visual indicator;
* audit;
* timeout;
* restrictions on sensitive actions.

---

# 67. PRIVACY PRINCIPLE

Technical availability of data does not justify access.

Expose only information role needs.

Especially minimize customer PII in:

* skipper views;
* moderator views;
* analytics;
* logs.

---

# 68. SECURITY TEST CASES

Must test:

* Customer A → Customer B booking;
* Operator A → Operator B booking;
* employee changes pricing;
* skipper accesses payout;
* manager grants self OWNER;
* browser changes commission;
* customer changes payment amount;
* suspended member reads dashboard;
* moderator accesses payout;
* support changes commission;
* anonymous private document access;
* manipulated operator_id;
* manipulated role field.

Expected:

denied unless specifically authorized.
