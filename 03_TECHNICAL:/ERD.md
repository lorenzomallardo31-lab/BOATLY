# BOATLY — ENTITY RELATIONSHIP DIAGRAM

**Version:** 1.1
**Status:** Phase A — Final Approved Specification

Detailed fields live in:

`DATABASE_SCHEMA.md`

---

# 1. IDENTITY / OPERATORS

```mermaid
erDiagram

    PROFILES ||--o{ PLATFORM_USER_ROLES : has

    PROFILES ||--o{ OPERATOR_MEMBERS : belongs_to
    OPERATORS ||--o{ OPERATOR_MEMBERS : has

    OPERATORS ||--|| OPERATOR_LEGAL_PROFILES : has
    OPERATORS ||--o{ OPERATOR_INVITATIONS : creates

    OPERATORS ||--o{ OPERATOR_LOCATIONS : operates
    OPERATOR_LOCATIONS ||--o{ LOCATION_OPENING_HOURS : has
```

---

# 2. FLEET

```mermaid
erDiagram

    OPERATORS ||--o{ BOATS : owns
    OPERATOR_LOCATIONS ||--o{ BOATS : hosts
    BOAT_TYPES ||--o{ BOATS : categorizes

    BOATS ||--o{ BOAT_LEGAL_OFFERINGS : supports
    BOATS ||--o{ BOAT_IMAGES : has

    BOATS ||--o{ BOAT_AMENITIES : has
    AMENITIES ||--o{ BOAT_AMENITIES : assigned

    OPERATORS ||--o{ EXTRAS : owns
    BOATS ||--o{ BOAT_EXTRAS : supports
    EXTRAS ||--o{ BOAT_EXTRAS : assigned
```

---

# 3. PRICING / AVAILABILITY

```mermaid
erDiagram

    BOATS ||--o{ BOAT_RATE_PLANS : priced_by
    BOAT_RATE_PLANS ||--o{ BOAT_PRICING_RULES : modified_by

    BOATS ||--o{ BOAT_AVAILABILITY_RULES : scheduled_by
    BOATS ||--o{ BOAT_OCCUPANCIES : blocked_by
```

---

# 4. CUSTOMER / CRM / BOOKINGS

```mermaid
erDiagram

    OPERATORS ||--o{ OPERATOR_CUSTOMERS : manages
    PROFILES o|--o{ OPERATOR_CUSTOMERS : may_link

    OPERATORS ||--o{ BOOKINGS : receives
    BOATS ||--o{ BOOKINGS : reserved
    OPERATOR_LOCATIONS ||--o{ BOOKINGS : pickup
    BOAT_LEGAL_OFFERINGS o|--o{ BOOKINGS : contractual_offer
    PROFILES o|--o{ BOOKINGS : customer
    OPERATOR_CUSTOMERS o|--o{ BOOKINGS : crm_customer

    BOOKINGS o|--o{ BOAT_OCCUPANCIES : creates

    BOOKINGS ||--o{ BOOKING_EXTRAS : contains
    BOOKINGS ||--o{ BOOKING_PRICE_ITEMS : priced_with
    BOOKINGS ||--o{ BOOKING_EVENTS : history
```

---

# 5. LEGAL / CONTRACTS

```mermaid
erDiagram

    LEGAL_DOCUMENT_VERSIONS ||--o{ LEGAL_ACCEPTANCES : accepted_as
    PROFILES ||--o{ LEGAL_ACCEPTANCES : accepts
    OPERATORS o|--o{ LEGAL_ACCEPTANCES : operator_context
    BOOKINGS o|--o{ LEGAL_ACCEPTANCES : booking_context

    BOOKINGS ||--o{ BOOKING_CONTRACTS : generates
    LEGAL_DOCUMENT_VERSIONS o|--o{ BOOKING_CONTRACTS : template_version
```

---

# 6. BUSINESS MODEL

```mermaid
erDiagram

    SUBSCRIPTION_PLANS ||--o{ OPERATOR_SUBSCRIPTIONS : selected
    OPERATORS ||--o{ OPERATOR_SUBSCRIPTIONS : subscribes

    OPERATORS o|--o{ COMMISSION_RULES : commercial_rule
```

---

# 7. STRIPE / PAYMENTS

```mermaid
erDiagram

    OPERATORS ||--|| STRIPE_CONNECTED_ACCOUNTS : connects

    BOOKINGS ||--o{ PAYMENTS : provider_payment
    BOOKINGS ||--o{ MANUAL_PAYMENT_RECORDS : offline_payment

    PAYMENTS ||--o{ REFUNDS : refunded_by

    OPERATORS ||--o{ PAYOUTS : receives

    BOOKINGS o|--o{ STRIPE_EVENTS : relates
    PAYMENTS o|--o{ STRIPE_EVENTS : relates
```

---

# 8. SKIPPERS

```mermaid
erDiagram

    OPERATORS ||--o{ SKIPPERS : manages
    OPERATOR_MEMBERS o|--o| SKIPPERS : may_link

    SKIPPERS ||--o{ SKIPPER_OCCUPANCIES : scheduled
    BOOKINGS o|--o{ SKIPPER_OCCUPANCIES : assignment
```

---

# 9. DOCUMENTS / COMPLIANCE

```mermaid
erDiagram

    OPERATORS ||--o{ DOCUMENTS : owns
    BOATS o|--o{ DOCUMENTS : documented
    SKIPPERS o|--o{ DOCUMENTS : documented

    COMPLIANCE_REQUIREMENTS ||--o{ COMPLIANCE_CHECKS : defines
    OPERATORS ||--o{ COMPLIANCE_CHECKS : evaluated
    BOATS o|--o{ COMPLIANCE_CHECKS : evaluated
    SKIPPERS o|--o{ COMPLIANCE_CHECKS : evaluated
    DOCUMENTS o|--o{ COMPLIANCE_CHECKS : evidence

    OPERATORS ||--o{ OPERATOR_VERIFICATIONS : verification_history
    BOATS ||--o{ BOAT_PUBLICATION_REVIEWS : review_history
```

---

# 10. CUSTOMER FEATURES

```mermaid
erDiagram

    PROFILES ||--o{ FAVORITES : creates
    BOATS ||--o{ FAVORITES : saved

    BOOKINGS ||--o| REVIEWS : verifies
    PROFILES ||--o{ REVIEWS : writes
    BOATS ||--o{ REVIEWS : receives
    OPERATORS ||--o{ REVIEWS : receives

    PROFILES ||--o{ NOTIFICATIONS : receives
    NOTIFICATIONS ||--o{ NOTIFICATION_DELIVERIES : delivered
```

---

# 11. MODERATION / PRIVACY

```mermaid
erDiagram

    PROFILES o|--o{ CONTENT_REPORTS : reports
    CONTENT_REPORTS ||--o{ MODERATION_DECISIONS : resolved_by

    PROFILES ||--o{ PRIVACY_REQUESTS : submits
```

---

# 12. DAC7

```mermaid
erDiagram

    OPERATORS ||--|| DAC7_SELLER_PROFILES : tax_profile

    DAC7_REPORTING_PERIODS ||--o{ DAC7_REPORTABLE_TRANSACTIONS : contains
    OPERATORS ||--o{ DAC7_REPORTABLE_TRANSACTIONS : seller
    BOOKINGS ||--o| DAC7_REPORTABLE_TRANSACTIONS : source

    DAC7_REPORTING_PERIODS ||--o{ DAC7_REPORTS : generates
```

---

# 13. CENTRAL MARKETPLACE TRANSACTION

```text
CUSTOMER
   ↓
BOOKING
   ↓
BOAT
   ↓
LEGAL OFFERING
   ↓
OPERATOR
   ↓
PAYMENT
```

Simultaneously:

```text
BOOKING
   ↓
BOAT OCCUPANCY
   ↓
FLEET CALENDAR
```

and:

```text
BOOKING
   ↓
LEGAL ACCEPTANCE
   ↓
BOOKING CONTRACT
```

---

# 14. MARKETPLACE DISCOVERY

```text
DESTINATION / SEARCH INPUT
          ↓
OPERATOR LOCATION
          ↓
BOAT
          ↓
LEGAL / COMPLIANCE ELIGIBILITY
          ↓
AVAILABILITY
          ↓
PRICING
          ↓
SEARCH RESULT
```

---

# 15. MANUAL BOOKING

```text
OPERATOR
   ↓
OPERATOR CUSTOMER
   ↓
MANUAL BOOKING
   ↓
BOAT OCCUPANCY
   ↓
FLEET CALENDAR
```

Marketplace commission:

0%.

---

# 16. AVAILABILITY

```text
RECURRING AVAILABILITY
          -
ACTIVE BLOCKING OCCUPANCIES
          =
ACTUAL AVAILABLE SLOTS
```

Occupancy may be:

* booking;
* manual booking;
* hold;
* maintenance;
* transfer;
* private use;
* operator block.

---

# 17. OPERATOR MARKETPLACE ELIGIBILITY

```text
OPERATOR
   ↓
LEGAL/TAX PROFILE
   +
REQUIRED COMPLIANCE
   +
PAYMENT ONBOARDING
   +
PLATFORM APPROVAL
   ↓
MARKETPLACE ELIGIBLE
```

---

# 18. BOAT MARKETPLACE ELIGIBILITY

```text
ELIGIBLE OPERATOR
   +
COMPLETE BOAT
   +
APPROVED LEGAL OFFERING
   +
VALID COMPLIANCE
   +
PRICING
   +
AVAILABILITY
   +
PUBLICATION APPROVAL
   ↓
BOOKABLE BOAT
```

---

# 19. PAYMENT MODEL

```text
BOOKING
   ↓
PAYMENT
   ↓
STRIPE / CONNECT
   ↓
CUSTOMER AMOUNT
   ├── Boatly commission
   ├── Provider costs
   └── Operator economic amount
```

Potential later:

Refund

and:

Payout.

---

# 20. CONFIGURATION VS SNAPSHOT

Configuration:

current state.

Examples:

* price now;
* cancellation policy now;
* commission now;
* Terms now.

Booking history:

immutable state at transaction time.

This separation is mandatory.
