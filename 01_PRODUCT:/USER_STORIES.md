# BOATLY — USER STORIES

**Version:** 1.1
**Status:** Phase A — Final Approved Specification

---

# 1. USER ROLES

Boatly supports:

* Public Visitor
* Customer
* Operator OWNER
* Operator MANAGER
* Operator EMPLOYEE
* Operator SKIPPER
* Boatly SUPER_ADMIN
* Boatly ADMIN
* Boatly SUPPORT
* Boatly FINANCE
* Boatly MODERATOR
* Boatly COMPLIANCE

---

# 2. PUBLIC VISITOR — DISCOVERY

As a public visitor, I want to:

* visit the homepage;
* understand what Boatly does;
* search boats without first creating an account;
* view destinations;
* view boat categories;
* understand how Boatly works;
* understand how to become an operator;
* view public operator profiles;
* view published boats;
* access legal/privacy/support information.

---

# 3. PUBLIC VISITOR — SEARCH

As a public visitor, I want to search by:

* location;
* date;
* starting time;
* duration;
* passenger count.

I want Boatly to return only relevant marketplace inventory.

---

# 4. PUBLIC VISITOR — FILTERS

I want filters for:

* price;
* distance;
* boat type;
* capacity;
* engine/horsepower characteristics;
* licence eligibility;
* skipper available;
* skipper included;
* skipper required;
* amenities;
* rating;
* security deposit where useful;
* fuel policy where useful.

---

# 5. PUBLIC VISITOR — MAP

I want:

* results on a map;
* results in a list;
* synchronized selection;
* useful map markers;
* results corresponding to the selected geographic area.

---

# 6. PUBLIC VISITOR — BOAT DETAIL

I want to see:

* images;
* name;
* type;
* operator;
* pickup location;
* map;
* description;
* capacity;
* technical specifications;
* engine data;
* licence information;
* skipper/commander configuration;
* amenities;
* extras;
* prices;
* availability;
* security deposit;
* fuel policy;
* cancellation policy;
* verified reviews.

---

# 7. PUBLIC VISITOR — MARKETPLACE TRANSPARENCY

I want to understand:

* who actually supplies the rental;
* Boatly's role;
* whether the supplier is a professional operator;
* the main factors affecting result ranking;
* whether a result is sponsored;
* how reviews are verified.

---

# 8. PUBLIC VISITOR — REPORT CONTENT

I want to be able to report:

* suspicious operator;
* illegal listing;
* unsafe/misleading content;
* fake review;
* other serious marketplace issue.

---

# 9. CUSTOMER — REGISTRATION

As a customer, I want to:

* create an account;
* verify my email;
* sign in;
* sign out;
* recover/reset password.

---

# 10. CUSTOMER — PROFILE

I want to:

* view profile;
* update name/contact details;
* update profile information;
* manage avatar;
* manage notification preferences;
* manage security/account settings.

---

# 11. CUSTOMER — FAVORITES

I want to:

* save a boat;
* remove a saved boat;
* view my favorites.

No other customer can access my favorites.

---

# 12. CUSTOMER — SEARCH STATE

I want search parameters represented in the URL where appropriate so I can:

* share searches;
* refresh;
* navigate browser history.

Sensitive personal data must not be exposed in URLs.

---

# 13. CUSTOMER — LICENCE ELIGIBILITY

I want Boatly to tell me whether a boat can legally be rented/operated under my situation.

I do not want the result to be based only on a simplistic horsepower threshold.

---

# 14. CUSTOMER — CHECKOUT START

When I choose a boat, I want Boatly to:

* revalidate requested time;
* revalidate actual availability;
* revalidate passenger count;
* revalidate legal offering;
* revalidate operator/boat eligibility.

---

# 15. CUSTOMER — DRIVER ELIGIBILITY

Where I will drive the boat myself, I want to provide only information reasonably required to establish eligibility.

Possible data includes:

* age;
* licence possession;
* licence type;
* issuing country;
* validity.

---

# 16. CUSTOMER — EXTRAS

I want to:

* view available extras;
* know whether an extra is mandatory/optional;
* know how extra is priced;
* choose quantities where appropriate;
* see updated total.

---

# 17. CUSTOMER — CHECKOUT SUMMARY

Before paying, I want to see:

* operator;
* boat;
* legal rental configuration where relevant;
* location;
* date/time;
* duration;
* passengers;
* extras;
* base price;
* fees/taxes where applicable;
* deposit;
* fuel policy;
* cancellation terms;
* withdrawal information where applicable;
* total amount.

---

# 18. CUSTOMER — LEGAL TERMS

Before payment I want:

* required Terms clearly available;
* correct version presented;
* ability to read/download relevant terms;
* clear contractual supplier;
* clear payment obligation.

---

# 19. CUSTOMER — PAYMENT

I want to pay using a secure professional payment process.

My card data should not be unnecessarily handled by Boatly.

---

# 20. CUSTOMER — PAYMENT CONFIRMATION

I want my reservation confirmed only after the payment is genuinely verified.

A browser redirect alone must not create a fake confirmed booking.

---

# 21. CUSTOMER — PAYMENT FAILURE

If payment fails:

* I should receive an understandable error;
* my booking must not falsely appear confirmed;
* I should be able to retry when slot remains eligible.

---

# 22. CUSTOMER — BROWSER CLOSED

If my payment succeeds but I close the browser, I still expect:

* server-side booking confirmation;
* booking in my account;
* notification/email.

---

# 23. CUSTOMER — BOOKINGS

I want to view:

* upcoming bookings;
* past bookings;
* booking status;
* boat;
* operator;
* location;
* dates;
* passengers;
* price;
* extras;
* payment status;
* cancellation information.

---

# 24. CUSTOMER — BOOKING DETAIL

I want access to:

* booking history;
* contractual details;
* payment/refund status;
* support options;
* downloadable contractual record.

---

# 25. CUSTOMER — CANCELLATION

I want to:

* know whether I can cancel;
* understand expected refund;
* confirm cancellation;
* receive resulting status.

Mandatory consumer rights must not be removed by an operator-configured policy.

---

# 26. CUSTOMER — REFUND

If a refund applies, I want to:

* know amount;
* see processing state;
* receive confirmation when completed.

---

# 27. CUSTOMER — REVIEW

After an eligible completed booking I want to:

* rate 1–5;
* write title/text;
* submit one verified review.

I cannot review a boat I did not actually book.

---

# 28. CUSTOMER — NOTIFICATIONS

I want notifications about relevant events such as:

* booking confirmation;
* cancellation;
* refund;
* reminders;
* important booking changes.

---

# 29. CUSTOMER — PRIVACY

I want a process for rights such as:

* access;
* rectification;
* erasure where applicable;
* portability;
* restriction;
* objection.

---

# 30. OPERATOR — REGISTRATION

As a professional operator, I want to:

* register;
* verify email;
* create business workspace.

---

# 31. OPERATOR — ONBOARDING

I want onboarding covering:

* business details;
* public profile;
* legal/tax information;
* locations;
* compliance documents;
* payments;
* verification.

---

# 32. OPERATOR — LEGAL/TAX PROFILE

As an OWNER, I want to store/manage private business information including where applicable:

* legal name;
* legal form;
* registered address;
* VAT;
* tax ID;
* company registration;
* tax residence;
* required DAC7 information.

This data must not automatically be public.

---

# 33. OPERATOR — MULTIPLE LOCATIONS

I want to:

* create multiple rental bases;
* assign each boat to a location;
* store marina/port;
* store address;
* set geographic position;
* set timezone;
* activate/archive locations.

---

# 34. OPERATOR — FLEET

I want to:

* add many boats;
* edit boats;
* pause boats;
* archive boats;
* preserve historical data.

---

# 35. OPERATOR — BOAT INFORMATION

I want to configure:

* name;
* brand;
* model;
* year;
* category;
* description;
* dimensions;
* passengers;
* engine;
* horsepower;
* power kW;
* displacement;
* engine characteristics;
* fuel;
* security deposit;
* fuel policy.

---

# 36. OPERATOR — LEGAL OFFERING

I want to configure only legally eligible offerings.

Possible legal offerings include:

* LOCAZIONE
* LOCAZIONE_WITH_COMMANDER
* NOLEGGIO

My configuration may require Boatly compliance approval.

---

# 37. OPERATOR — SKIPPER CONFIGURATION

I want to specify operational skipper behavior:

* unavailable;
* available;
* included;
* required.

This configuration must remain separate from the legal contract classification.

---

# 38. OPERATOR — PHOTOS

I want to:

* upload photos;
* reorder;
* choose cover;
* delete/replace appropriate media;
* provide alt/accessible information where appropriate.

---

# 39. OPERATOR — AMENITIES

I want to choose standardized amenities for boats.

Examples:

* bimini;
* shower;
* fridge;
* Bluetooth;
* GPS;
* snorkeling equipment;
* ladder;
* USB;
* safety-related public equipment where appropriate.

---

# 40. OPERATOR — PRICING

I want to:

* create rate plans;
* set hourly/half-day/full-day/multi-day pricing;
* set seasonal rules;
* date overrides;
* weekend rules;
* duration rules;
* promotions.

---

# 41. OPERATOR — PRICING HISTORY

Changing current price must not alter existing confirmed bookings.

---

# 42. OPERATOR — EXTRAS

I want to:

* create reusable extras;
* set fixed/per-day/per-person pricing;
* mark mandatory/optional;
* assign extras to boats;
* archive extras.

---

# 43. OPERATOR — AVAILABILITY

I want to:

* configure recurring weekly availability;
* define valid date ranges;
* set operating hours;
* adjust future availability.

---

# 44. OPERATOR — BLOCK CALENDAR

I want to create:

* maintenance;
* transfer;
* private use;
* generic operator blocks.

Blocks must prevent marketplace availability where appropriate.

---

# 45. OPERATOR — MAINTENANCE CONFLICT

If I create maintenance overlapping a confirmed future booking, Boatly must:

* warn/block;
* never silently cancel or invalidate that booking.

---

# 46. OPERATOR — MANUAL BOOKING

I want to create bookings received from:

* telephone;
* WhatsApp;
* walk-in;
* direct site;
* returning customer.

---

# 47. OPERATOR — MANUAL CUSTOMER

For manual booking I want to:

* select existing customer;
* or create new CRM customer;
* allow customer without Boatly account.

---

# 48. OPERATOR — MANUAL AVAILABILITY

Before creating a manual booking Boatly must verify availability.

Manual booking must block the same calendar used by marketplace bookings.

---

# 49. OPERATOR — MANUAL PAYMENT

I want to record an offline payment such as:

* cash;
* bank transfer;
* card at location;
* other.

This must be visibly distinct from a verified Stripe payment.

---

# 50. OPERATOR — MARKETPLACE BOOKING

I want confirmed marketplace bookings automatically visible in:

* booking list;
* fleet calendar;
* CRM;
* analytics.

---

# 51. OPERATOR — BOOKING DETAIL

I want to view where permitted:

* customer;
* boat;
* date/time;
* passengers;
* extras;
* legal contract type;
* payment status;
* cancellation snapshot;
* price;
* commission;
* operator net amount;
* booking events;
* contract.

---

# 52. OPERATOR — BOOKING STATUS

Authorized users should be able to perform valid transitions such as:

* CONFIRMED → IN_PROGRESS;
* IN_PROGRESS → COMPLETED.

They should not be able to arbitrarily assign invalid states.

---

# 53. OPERATOR — CANCEL BOOKING

Authorized operator users can request cancellation under controlled rules.

The system should:

* require reason;
* calculate customer effects;
* release occupancy;
* trigger refund where required;
* record events.

---

# 54. OPERATOR — FLEET CALENDAR

I want one central calendar containing:

* marketplace bookings;
* manual bookings;
* maintenance;
* transfers;
* private use;
* blocks;
* operationally relevant holds.

---

# 55. OPERATOR — CRM

I want to:

* view operator-specific customers;
* see booking history;
* maintain notes;
* create direct customers.

Another operator must never access my CRM.

---

# 56. OPERATOR — STAFF

As OWNER I want to:

* invite;
* assign role;
* change permitted roles;
* suspend;
* remove.

---

# 57. OPERATOR — OWNER SAFETY

The system must prevent:

* zero active OWNERs;
* manager self-promotion;
* employee self-promotion;
* unauthorized ownership transfer.

---

# 58. OPERATOR — SKIPPERS

I want to:

* create skipper record;
* optionally link Boatly account;
* store contact;
* store qualification;
* store document metadata;
* assign to booking;
* track availability.

---

# 59. OPERATOR — SKIPPER CONFLICT

I cannot assign a skipper to overlapping incompatible assignments.

---

# 60. OPERATOR — DOCUMENTS

I want to:

* upload;
* see review state;
* see rejection reason;
* know expiration;
* replace expired documentation.

---

# 61. OPERATOR — COMPLIANCE

I want a dashboard showing:

* missing requirements;
* pending requirements;
* approved requirements;
* rejected requirements;
* expiring requirements;
* expired requirements;
* impact on marketplace eligibility.

---

# 62. OPERATOR — DOCUMENT EXPIRATION

I should receive warnings before important documents expire.

An expired mandatory requirement may restrict future marketplace activity.

Existing confirmed bookings must be handled explicitly rather than silently removed.

---

# 63. OPERATOR — PAYMENTS

Authorized roles want to view:

* customer paid amount;
* payment status;
* commission;
* operator net;
* refund effect.

---

# 64. OPERATOR — PAYOUTS

OWNER wants to view allowed payout information.

Stripe/provider remains authoritative for actual payout processing.

---

# 65. OPERATOR — COMMERCIAL PLAN

OWNER wants to understand:

* current plan;
* monthly price;
* marketplace commission;
* limits;
* enabled features;
* future renewal where billing exists.

---

# 66. OPERATOR — ANALYTICS

I want analytics for:

* bookings;
* marketplace vs manual;
* Marketplace GMV;
* Managed Booking Volume;
* occupancy;
* utilization;
* cancellations;
* popular boats;
* locations;
* revenue-related operator metrics.

---

# 67. OPERATOR — PUBLIC PROFILE

I want to manage public-safe:

* name;
* description;
* logo;
* cover;
* public locations;
* published fleet.

Private legal/tax data stays private.

---

# 68. OPERATOR — CANCELLATION POLICY

Authorized roles want to:

* select/manage cancellation policies;
* understand that confirmed bookings preserve policy snapshot.

---

# 69. OPERATOR — CONTRACTS

I want to access contractual records for my own bookings where authorized.

Historical contracts must not change with newer templates.

---

# 70. OPERATOR — MULTIPLE WORKSPACES

If I belong to multiple operators, I want to explicitly switch workspace.

Boatly must verify my membership for every protected action.

---

# 71. SKIPPER USER — ASSIGNMENTS

As an authenticated skipper I want to see only:

* bookings assigned to me;
* relevant boat;
* location;
* time;
* relevant customer/passenger information;
* relevant operational notes;
* my schedule.

---

# 72. SKIPPER USER — PRIVACY

I must not see:

* full operator CRM;
* unrelated customers;
* payouts;
* commissions;
* unrelated bookings;
* business settings.

---

# 73. ADMIN — DASHBOARD

Authorized Boatly staff want a platform overview of:

* users;
* operators;
* boats;
* bookings;
* payments;
* refunds;
* compliance;
* reports;
* operational issues.

---

# 74. ADMIN — USERS

Authorized roles want to:

* search users;
* inspect account state;
* suspend/reactivate where permitted;
* preserve history.

---

# 75. ADMIN — OPERATOR VERIFICATION

ADMIN/COMPLIANCE wants to:

* inspect onboarding;
* inspect legal/tax data where necessary;
* inspect documents;
* approve;
* reject/request correction;
* record reason.

---

# 76. ADMIN — BOAT REVIEW

ADMIN/COMPLIANCE/MODERATOR where appropriate wants to:

* inspect listing;
* inspect legal offering;
* inspect required documents;
* inspect public media/content;
* approve;
* request changes;
* reject;
* suspend.

---

# 77. ADMIN — BOOKINGS

Authorized staff wants to:

* search bookings;
* inspect history;
* investigate disputes/support issues;
* perform authorized exceptional actions.

---

# 78. ADMIN — PAYMENTS

FINANCE/authorized admin wants to:

* search payments;
* inspect provider IDs;
* inspect status;
* inspect events;
* reconcile discrepancies.

---

# 79. ADMIN — REFUNDS

Authorized finance/admin wants to:

* create permitted refund workflows;
* inspect refund provider result;
* preserve reason/audit.

---

# 80. ADMIN — PAYOUTS

FINANCE wants appropriate payout visibility and reconciliation.

---

# 81. ADMIN — COMMISSIONS

Authorized roles want to:

* view global rules;
* view operator-specific rules;
* create future-effective changes;
* preserve old booking snapshots;
* audit changes.

---

# 82. ADMIN — SUBSCRIPTIONS

Authorized staff wants to:

* assign pilot plans;
* inspect operator plan;
* support subscription issues;
* manage permitted commercial overrides.

---

# 83. ADMIN — DOCUMENTS

ADMIN/COMPLIANCE wants to:

* review documents;
* approve/reject;
* record reason;
* monitor expiration.

---

# 84. ADMIN — COMPLIANCE

COMPLIANCE wants to:

* evaluate operator;
* evaluate boat;
* evaluate skipper;
* evaluate legal offerings;
* record verification decision;
* manage exceptions only through audited workflows.

---

# 85. ADMIN — REVIEWS

MODERATOR/ADMIN wants to:

* inspect reported reviews;
* moderate under published policy;
* preserve reason.

---

# 86. ADMIN — CONTENT REPORTS

MODERATOR/ADMIN wants to:

* receive reports;
* classify;
* investigate;
* act;
* close;
* preserve decision history.

---

# 87. ADMIN — DAC7

Authorized FINANCE/COMPLIANCE wants to:

* inspect seller reporting readiness;
* identify missing seller information;
* aggregate reportable transactions;
* manage reporting periods;
* preserve submitted reports.

---

# 88. ADMIN — PRIVACY

Authorized staff wants to:

* receive privacy requests;
* verify identity where needed;
* assess statutory retention;
* record resolution.

---

# 89. ADMIN — AUDIT LOGS

Authorized staff wants to inspect immutable records of sensitive actions.

Ordinary platform users cannot edit audit logs.

---

# 90. SYSTEM — AUTHORIZATION

For every protected request the system must:

* authenticate;
* identify resource;
* identify tenant/context;
* verify membership/ownership;
* verify status;
* verify role;
* verify permission;
* verify business state;
* deny safely if any condition fails.

---

# 91. SYSTEM — TENANT ISOLATION

Operator A must never access:

* Operator B bookings;
* Operator B CRM;
* Operator B payments;
* Operator B documents;
* Operator B staff;
* Operator B analytics.

Knowing a UUID must not bypass authorization.

---

# 92. SYSTEM — CUSTOMER ISOLATION

Customer A cannot read/update:

* Customer B bookings;
* Customer B favorites;
* Customer B notifications;
* Customer B contracts;
* Customer B payment data.

---

# 93. SYSTEM — DOUBLE BOOKING

Two concurrent requests for same boat/overlapping time:

only one may successfully obtain blocking occupancy.

---

# 94. SYSTEM — BOOKING HOLD

Temporary holds:

* block availability;
* have expiry;
* cannot overlap;
* release after abandonment/failure;
* become confirmed occupancy after verified payment.

---

# 95. SYSTEM — PRICE CALCULATION

Final price must be calculated in trusted server logic.

Client-supplied totals are never authoritative.

---

# 96. SYSTEM — COMMISSION CALCULATION

Commission:

* configurable;
* server-side;
* based on booking source/plan/rules;
* 0% marketplace commission for manual booking;
* snapshotted.

---

# 97. SYSTEM — PAYMENT VERIFICATION

Provider payment confirmation requires:

* webhook signature validation;
* expected booking;
* amount;
* currency;
* idempotency;
* controlled state transition.

---

# 98. SYSTEM — DUPLICATE WEBHOOK

Repeated identical provider event:

no duplicate business effect.

---

# 99. SYSTEM — NOTIFICATIONS

Important domain events create:

* in-app notification;
* email where required.

Notification failure must not invalidate a successfully completed booking transaction.

---

# 100. SYSTEM — AUDIT

Sensitive actions create immutable audit records.

---

# 101. SYSTEM — LEGAL ACCEPTANCE

Exact legal document version accepted must be historically provable.

---

# 102. SYSTEM — CONTRACT GENERATION

Confirmed contractual records remain immutable.

---

# 103. SYSTEM — COMPLIANCE EXPIRATION

Scheduled compliance checking must identify expiry and restrict future activity where required.

---

# 104. SYSTEM — PUBLICATION INCOMPLETE

Boat cannot be published/bookable if mandatory information/compliance is incomplete.

---

# 105. SYSTEM — DOCUMENT REJECTED

Rejected document must:

* show reason to authorized operator;
* remain non-approved;
* prevent relevant compliance gate if mandatory.

---

# 106. SYSTEM — UNAUTHORIZED OPERATOR ACCESS

Request must return forbidden/unavailable without leaking competing operator data.

---

# 107. SYSTEM — SUSPENDED OPERATOR

Suspended operator:

* cannot receive new marketplace bookings;
* may retain limited access to resolve existing obligations/support;
* historical records remain.

---

# 108. NON-FUNCTIONAL — PERFORMANCE

Boatly should:

* paginate large lists;
* avoid N+1 queries;
* optimize images;
* use database indexes;
* limit calendar date ranges;
* cluster map markers;
* avoid unnecessary client JavaScript.

---

# 109. NON-FUNCTIONAL — RESPONSIVE

Marketplace:

mobile-first.

Operator/Admin:

responsive with desktop optimization.

---

# 110. NON-FUNCTIONAL — ACCESSIBILITY

Use:

* semantic HTML;
* labels;
* keyboard navigation;
* visible focus;
* sufficient contrast;
* accessible modal/dialog behavior;
* screen-reader feedback;
* map/list alternative.

---

# 111. NON-FUNCTIONAL — SEO

Public marketplace should support:

* metadata;
* canonical pages;
* destination/category pages;
* boat/operator pages;
* structured data where appropriate;
* sitemap.

---

# 112. NON-FUNCTIONAL — OBSERVABILITY

Critical workflows require:

* error monitoring;
* structured logs;
* payment-event history;
* booking history;
* audit history.

---

# 113. NON-FUNCTIONAL — TESTABILITY

Business logic should be organized so it can be tested independently.

Critical tests include:

* pricing;
* commission;
* cancellation;
* availability;
* RLS;
* double booking;
* payment webhooks;
* refunds;
* compliance gates.

---

# 114. MVP SCOPE

MVP includes the complete core marketplace/operator/admin workflow described above.

---

# 115. FUTURE FEATURES

Future opportunities:

* native apps;
* AI concierge;
* dynamic pricing;
* forecasting;
* advanced weather automation;
* WhatsApp integration;
* loyalty;
* referrals;
* direct operator booking widget;
* API;
* channel manager;
* enterprise integrations;
* insurance partnerships;
* private/P2P marketplace after separate legal analysis.
