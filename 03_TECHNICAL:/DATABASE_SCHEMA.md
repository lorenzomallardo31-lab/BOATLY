# BOATLY — DATABASE SCHEMA

**Version:** 1.1
**Status:** Phase A — Final Approved Logical Schema
**Database target:** PostgreSQL / Supabase

---

# 1. PURPOSE

This document defines the logical database architecture of Boatly.

It is not yet the final SQL implementation.

The actual schema will later be created through version-controlled migrations.

The database must support:

* public marketplace;
* customer accounts;
* professional operators;
* multiple operator locations;
* operator members;
* fleet;
* boat specifications;
* legal nautical offerings;
* photos;
* amenities;
* pricing;
* extras;
* availability;
* calendar occupancy;
* marketplace bookings;
* manual bookings;
* CRM customers;
* Stripe Connect;
* payments;
* offline/manual payment records;
* refunds;
* payouts;
* commissions;
* subscriptions;
* skippers;
* documents;
* compliance;
* contracts;
* legal acceptances;
* reviews;
* favorites;
* notifications;
* moderation;
* support;
* privacy;
* DAC7;
* audit.

---

# 2. GENERAL DATABASE PRINCIPLES

Primary IDs:

UUID.

Naming:

snake_case.

Timestamps representing instants:

TIMESTAMPTZ.

Persist instants in UTC.

Operator locations store IANA timezone.

Money:

integer minor units such as cents.

Do not store financial amounts using float/double.

Core business/searchable information:

relational columns/tables.

Flexible snapshots/provider metadata:

JSONB where appropriate.

Important records:

archive/soft-deactivate rather than casually hard-delete.

---

# 3. HISTORICAL INTEGRITY

Current configuration answers:

"What is true now?"

Booking snapshots answer:

"What was agreed then?"

A confirmed booking must remain historically intelligible even if:

* boat renamed;
* operator changes policy;
* price changes;
* extra changes;
* commission changes;
* subscription plan changes;
* legal terms change;
* pickup details change.

---

# 4. AUTH.USERS

Supabase Auth is responsible for authentication.

Do not duplicate:

* password;
* password hash;
* Supabase authentication internals.

---

# 5. PROFILES

Table:

`profiles`

Fields:

* id UUID PK → auth.users.id
* first_name TEXT
* last_name TEXT
* phone TEXT nullable
* avatar_path TEXT nullable
* date_of_birth DATE nullable
* country_code TEXT nullable
* preferred_language TEXT default 'it'
* created_at TIMESTAMPTZ
* updated_at TIMESTAMPTZ

---

# 6. PLATFORM_USER_ROLES

Table:

`platform_user_roles`

Fields:

* id UUID PK
* user_id UUID FK → profiles.id
* role TEXT
* created_by UUID nullable FK → profiles.id
* created_at TIMESTAMPTZ

Roles:

* SUPER_ADMIN
* ADMIN
* SUPPORT
* FINANCE
* MODERATOR
* COMPLIANCE

Unique:

user_id + role.

---

# 7. OPERATORS

Table:

`operators`

Fields:

* id UUID PK
* slug TEXT UNIQUE
* public_name TEXT
* description TEXT nullable
* business_email TEXT nullable
* business_phone TEXT nullable
* logo_path TEXT nullable
* cover_image_path TEXT nullable
* status TEXT
* marketplace_eligible BOOLEAN default false
* approved_at TIMESTAMPTZ nullable
* suspended_at TIMESTAMPTZ nullable
* created_at TIMESTAMPTZ
* updated_at TIMESTAMPTZ

Statuses:

* REGISTERED
* ONBOARDING
* PENDING_VERIFICATION
* APPROVED
* SUSPENDED
* REJECTED
* DEACTIVATED

---

# 8. OPERATOR_LEGAL_PROFILES

Table:

`operator_legal_profiles`

Purpose:

Private legal/tax identity.

Fields:

* id UUID PK
* operator_id UUID UNIQUE FK → operators.id
* legal_name TEXT
* legal_form TEXT nullable
* registered_address_line_1 TEXT
* registered_address_line_2 TEXT nullable
* registered_city TEXT
* registered_region TEXT nullable
* registered_postal_code TEXT nullable
* registered_country_code TEXT
* tax_residence_country_code TEXT nullable
* vat_number TEXT nullable
* tax_id TEXT nullable
* company_registration_number TEXT nullable
* company_registry_name TEXT nullable
* verification_status TEXT
* created_at TIMESTAMPTZ
* updated_at TIMESTAMPTZ

This data is not automatically public.

---

# 9. OPERATOR_MEMBERS

Table:

`operator_members`

Fields:

* id UUID PK
* operator_id UUID FK → operators.id
* user_id UUID FK → profiles.id
* role TEXT
* status TEXT
* joined_at TIMESTAMPTZ nullable
* created_at TIMESTAMPTZ
* updated_at TIMESTAMPTZ

Roles:

* OWNER
* MANAGER
* EMPLOYEE
* SKIPPER

Statuses:

* INVITED
* ACTIVE
* SUSPENDED
* REMOVED

Unique:

operator_id + user_id.

Business rule:

operator cannot end with zero active OWNERs.

---

# 10. OPERATOR_INVITATIONS

Table:

`operator_invitations`

Fields:

* id UUID PK
* operator_id UUID FK
* invited_email TEXT
* invited_role TEXT
* token_hash TEXT
* invited_by UUID FK
* expires_at TIMESTAMPTZ
* accepted_at TIMESTAMPTZ nullable
* status TEXT
* created_at TIMESTAMPTZ

Invitation token must be securely generated and stored hashed where appropriate.

---

# 11. OPERATOR_LOCATIONS

Table:

`operator_locations`

Fields:

* id UUID PK
* operator_id UUID FK
* slug TEXT
* name TEXT
* address_line_1 TEXT nullable
* address_line_2 TEXT nullable
* city TEXT
* province_region TEXT nullable
* postal_code TEXT nullable
* country_code TEXT
* marina_port TEXT nullable
* phone TEXT nullable
* email TEXT nullable
* timezone TEXT
* geo_point GEOGRAPHY(POINT)
* status TEXT
* created_at TIMESTAMPTZ
* updated_at TIMESTAMPTZ

Statuses:

* ACTIVE
* INACTIVE
* ARCHIVED

Important:

GiST spatial index on geo_point.

---

# 12. LOCATION_OPENING_HOURS

Table:

`location_opening_hours`

Fields:

* id UUID PK
* location_id UUID FK
* day_of_week SMALLINT
* opens_at TIME nullable
* closes_at TIME nullable
* is_closed BOOLEAN
* created_at TIMESTAMPTZ
* updated_at TIMESTAMPTZ

---

# 13. DESTINATIONS

Table:

`destinations`

Fields:

* id UUID PK
* slug TEXT UNIQUE
* name TEXT
* region TEXT nullable
* country_code TEXT
* geo_point GEOGRAPHY(POINT)
* seo_title TEXT nullable
* seo_description TEXT nullable
* is_active BOOLEAN
* created_at TIMESTAMPTZ
* updated_at TIMESTAMPTZ

Used for curated/SEO marketplace destinations.

---

# 14. BOAT_TYPES

Table:

`boat_types`

Fields:

* id UUID PK
* code TEXT UNIQUE
* slug TEXT UNIQUE
* label TEXT
* is_active BOOLEAN
* sort_order INTEGER

Initial examples:

* RIB
* MOTOR_BOAT
* YACHT
* CATAMARAN
* SAILING_BOAT
* JET_SKI
* OTHER

---

# 15. BOATS

Table:

`boats`

Fields:

* id UUID PK
* operator_id UUID FK → operators.id
* location_id UUID FK → operator_locations.id
* boat_type_id UUID FK → boat_types.id
* slug TEXT UNIQUE
* name TEXT
* brand TEXT nullable
* model TEXT nullable
* manufacture_year INTEGER nullable
* description TEXT nullable
* length_m NUMERIC nullable
* width_m NUMERIC nullable
* max_passengers INTEGER
* minimum_driver_age INTEGER nullable
* engine_manufacturer TEXT nullable
* engine_model TEXT nullable
* engine_power_kw NUMERIC nullable
* horsepower INTEGER nullable
* engine_displacement_cc INTEGER nullable
* engine_cycle_type TEXT nullable
* engine_type TEXT nullable
* propulsion_type TEXT nullable
* fuel_type TEXT nullable
* fuel_capacity_l NUMERIC nullable
* navigation_limit_nm NUMERIC nullable
* skipper_mode TEXT
* security_deposit_cents BIGINT nullable
* fuel_policy TEXT nullable
* status TEXT
* published_at TIMESTAMPTZ nullable
* created_at TIMESTAMPTZ
* updated_at TIMESTAMPTZ
* archived_at TIMESTAMPTZ nullable

Skipper modes:

* NOT_AVAILABLE
* AVAILABLE
* INCLUDED
* REQUIRED

Statuses:

* DRAFT
* PENDING_REVIEW
* PUBLISHED
* PAUSED
* MAINTENANCE
* ARCHIVED

Important:

`license_required BOOLEAN` is not the complete legal model and should not be treated as source of truth.

---

# 16. BOAT_LEGAL_OFFERINGS

Table:

`boat_legal_offerings`

Purpose:

Defines contractual configurations that a specific boat/operator is allowed to offer.

Fields:

* id UUID PK
* boat_id UUID FK
* contract_type TEXT
* status TEXT
* requires_customer_driver BOOLEAN
* requires_commander BOOLEAN
* maximum_passengers_override INTEGER nullable
* notes TEXT nullable
* approved_at TIMESTAMPTZ nullable
* approved_by_user_id UUID nullable
* created_at TIMESTAMPTZ
* updated_at TIMESTAMPTZ

Potential contract types:

* LOCAZIONE
* LOCAZIONE_WITH_COMMANDER
* NOLEGGIO

Statuses:

* DRAFT
* PENDING_REVIEW
* APPROVED
* REJECTED
* SUSPENDED

Unique:

boat_id + contract_type.

---

# 17. BOAT_IMAGES

Table:

`boat_images`

Fields:

* id UUID PK
* boat_id UUID FK
* storage_path TEXT
* alt_text TEXT nullable
* sort_order INTEGER
* is_cover BOOLEAN
* created_at TIMESTAMPTZ

Actual binaries live in Supabase Storage.

---

# 18. AMENITIES

Table:

`amenities`

Fields:

* id UUID PK
* code TEXT UNIQUE
* label TEXT
* icon_key TEXT nullable
* is_filterable BOOLEAN
* is_active BOOLEAN
* sort_order INTEGER

Examples:

* BIMINI
* SHOWER
* FRIDGE
* ICE_BOX
* BLUETOOTH
* GPS
* FISH_FINDER
* SNORKELING
* LIFE_JACKETS
* SUN_CUSHIONS
* SWIM_LADDER
* USB_CHARGING
* ANCHOR

---

# 19. BOAT_AMENITIES

Table:

`boat_amenities`

Fields:

* boat_id UUID FK
* amenity_id UUID FK
* created_at TIMESTAMPTZ

Unique:

boat_id + amenity_id.

---

# 20. EXTRAS

Table:

`extras`

Fields:

* id UUID PK
* operator_id UUID FK
* name TEXT
* description TEXT nullable
* pricing_type TEXT
* amount_cents BIGINT
* currency TEXT
* is_mandatory BOOLEAN
* is_active BOOLEAN
* created_at TIMESTAMPTZ
* updated_at TIMESTAMPTZ
* archived_at TIMESTAMPTZ nullable

Pricing:

* FIXED
* PER_DAY
* PER_PERSON

---

# 21. BOAT_EXTRAS

Table:

`boat_extras`

Fields:

* boat_id UUID FK
* extra_id UUID FK
* is_active BOOLEAN
* created_at TIMESTAMPTZ

Unique:

boat_id + extra_id.

---

# 22. CANCELLATION_POLICIES

Table:

`cancellation_policies`

Fields:

* id UUID PK
* operator_id UUID nullable FK
* name TEXT
* policy_type TEXT
* is_default BOOLEAN
* is_active BOOLEAN
* created_at TIMESTAMPTZ
* updated_at TIMESTAMPTZ

Nullable operator allows global Boatly templates.

---

# 23. CANCELLATION_POLICY_RULES

Table:

`cancellation_policy_rules`

Fields:

* id UUID PK
* cancellation_policy_id UUID FK
* hours_before_start INTEGER
* refund_percentage NUMERIC
* sort_order INTEGER

Confirmed booking keeps snapshot regardless of later policy changes.

---

# 24. BOAT_RATE_PLANS

Table:

`boat_rate_plans`

Fields:

* id UUID PK
* boat_id UUID FK
* name TEXT
* billing_unit TEXT
* base_amount_cents BIGINT
* currency TEXT
* min_duration_minutes INTEGER nullable
* max_duration_minutes INTEGER nullable
* is_active BOOLEAN
* created_at TIMESTAMPTZ
* updated_at TIMESTAMPTZ

Billing examples:

* HOUR
* HALF_DAY
* FULL_DAY
* MULTI_DAY
* WEEK

---

# 25. BOAT_PRICING_RULES

Table:

`boat_pricing_rules`

Fields:

* id UUID PK
* rate_plan_id UUID FK
* rule_type TEXT
* valid_from DATE nullable
* valid_to DATE nullable
* weekdays SMALLINT[] nullable
* amount_override_cents BIGINT nullable
* adjustment_percentage NUMERIC nullable
* minimum_units INTEGER nullable
* maximum_units INTEGER nullable
* priority INTEGER
* is_active BOOLEAN
* created_at TIMESTAMPTZ
* updated_at TIMESTAMPTZ

Possible types:

* SEASONAL
* DATE_OVERRIDE
* WEEKEND
* DURATION
* PROMOTIONAL

Pricing precedence must be deterministic.

---

# 26. BOAT_AVAILABILITY_RULES

Table:

`boat_availability_rules`

Fields:

* id UUID PK
* boat_id UUID FK
* day_of_week SMALLINT
* start_time TIME
* end_time TIME
* valid_from DATE nullable
* valid_to DATE nullable
* is_active BOOLEAN
* created_at TIMESTAMPTZ
* updated_at TIMESTAMPTZ

---

# 27. OPERATOR_CUSTOMERS

Table:

`operator_customers`

Purpose:

Tenant-specific CRM.

Fields:

* id UUID PK
* operator_id UUID FK
* platform_user_id UUID nullable FK → profiles.id
* first_name TEXT
* last_name TEXT
* email TEXT nullable
* phone TEXT nullable
* notes TEXT nullable
* created_at TIMESTAMPTZ
* updated_at TIMESTAMPTZ

Marketplace customer:

platform_user_id may exist.

Direct/manual customer:

platform_user_id may be null.

---

# 28. BOOKINGS

Table:

`bookings`

Fields:

* id UUID PK
* booking_code TEXT UNIQUE
* source TEXT
* operator_id UUID FK
* boat_id UUID FK
* location_id UUID FK
* boat_legal_offering_id UUID nullable FK
* rental_contract_type TEXT
* customer_user_id UUID nullable FK
* operator_customer_id UUID nullable FK
* starts_at TIMESTAMPTZ
* ends_at TIMESTAMPTZ
* passenger_count INTEGER
* status TEXT
* currency TEXT
* base_amount_cents BIGINT
* extras_amount_cents BIGINT
* customer_fees_cents BIGINT
* tax_amount_cents BIGINT
* total_amount_cents BIGINT
* boatly_commission_cents BIGINT
* operator_net_amount_cents BIGINT
* cancellation_policy_id UUID nullable
* cancellation_policy_snapshot JSONB
* pricing_snapshot JSONB
* commission_snapshot JSONB
* commercial_plan_snapshot JSONB nullable
* customer_snapshot JSONB
* boat_snapshot JSONB
* legal_offering_snapshot JSONB
* pickup_location_snapshot JSONB
* driver_eligibility_snapshot JSONB nullable
* special_requests TEXT nullable
* created_by_user_id UUID nullable
* confirmed_at TIMESTAMPTZ nullable
* started_at TIMESTAMPTZ nullable
* completed_at TIMESTAMPTZ nullable
* cancelled_at TIMESTAMPTZ nullable
* created_at TIMESTAMPTZ
* updated_at TIMESTAMPTZ

Source:

* MARKETPLACE
* MANUAL

Status:

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

---

# 29. BOAT_OCCUPANCIES

Table:

`boat_occupancies`

Purpose:

Unified blocking model for boat calendar.

Fields:

* id UUID PK
* boat_id UUID FK
* booking_id UUID nullable FK
* event_type TEXT
* starts_at TIMESTAMPTZ
* ends_at TIMESTAMPTZ
* status TEXT
* blocks_availability BOOLEAN
* hold_expires_at TIMESTAMPTZ nullable
* note TEXT nullable
* created_by_user_id UUID nullable
* created_at TIMESTAMPTZ
* updated_at TIMESTAMPTZ

Event types:

* BOOKING
* MANUAL_BOOKING
* HOLD
* MAINTENANCE
* TRANSFER
* PRIVATE_USE
* OPERATOR_BLOCK
* OTHER

Statuses:

* ACTIVE
* CANCELLED
* EXPIRED

Critical database rule:

An ACTIVE occupancy where `blocks_availability = true` must not overlap another active blocking occupancy for the same boat.

Implementation target:

* `tstzrange`
* GiST
* exclusion constraint
* `btree_gist`

---

# 30. BOOKING_EXTRAS

Table:

`booking_extras`

Fields:

* id UUID PK
* booking_id UUID FK
* extra_id UUID nullable FK
* extra_name_snapshot TEXT
* pricing_type_snapshot TEXT
* quantity NUMERIC
* unit_amount_cents BIGINT
* total_amount_cents BIGINT
* created_at TIMESTAMPTZ

---

# 31. BOOKING_PRICE_ITEMS

Table:

`booking_price_items`

Fields:

* id UUID PK
* booking_id UUID FK
* item_type TEXT
* description TEXT
* quantity NUMERIC nullable
* unit_amount_cents BIGINT nullable
* amount_cents BIGINT
* sort_order INTEGER
* visible_to_customer BOOLEAN
* visible_to_operator BOOLEAN
* created_at TIMESTAMPTZ

Types:

* BASE
* EXTRA
* FEE
* TAX
* DISCOUNT
* COMMISSION

---

# 32. BOOKING_EVENTS

Table:

`booking_events`

Fields:

* id UUID PK
* booking_id UUID FK
* event_type TEXT
* from_status TEXT nullable
* to_status TEXT nullable
* actor_user_id UUID nullable
* metadata JSONB nullable
* created_at TIMESTAMPTZ

Purpose:

immutable operational booking timeline.

Examples:

* CREATED
* HOLD_CREATED
* PAYMENT_STARTED
* PAYMENT_CONFIRMED
* CONFIRMED
* SKIPPER_ASSIGNED
* STARTED
* COMPLETED
* CANCELLED
* REFUND_STARTED
* REFUNDED

---

# 33. LEGAL_DOCUMENT_VERSIONS

Table:

`legal_document_versions`

Fields:

* id UUID PK
* document_type TEXT
* version TEXT
* locale TEXT
* title TEXT
* storage_path TEXT nullable
* content_hash TEXT
* effective_from TIMESTAMPTZ
* effective_to TIMESTAMPTZ nullable
* status TEXT
* created_at TIMESTAMPTZ

Examples:

* CUSTOMER_TERMS
* OPERATOR_TERMS
* PRIVACY_NOTICE
* COOKIE_POLICY
* CANCELLATION_TERMS
* REVIEW_POLICY
* RENTAL_CONTRACT_TEMPLATE
* NOLEGGIO_CONTRACT_TEMPLATE

Unique concept:

document_type + version + locale.

---

# 34. LEGAL_ACCEPTANCES

Table:

`legal_acceptances`

Fields:

* id UUID PK
* user_id UUID FK
* operator_id UUID nullable FK
* booking_id UUID nullable FK
* legal_document_version_id UUID FK
* acceptance_context TEXT
* locale TEXT
* evidence_metadata JSONB nullable
* accepted_at TIMESTAMPTZ

Acceptance records are immutable.

---

# 35. BOOKING_CONTRACTS

Table:

`booking_contracts`

Fields:

* id UUID PK
* booking_id UUID FK
* contract_type TEXT
* legal_document_version_id UUID nullable FK
* contract_version TEXT
* legal_parties_snapshot JSONB
* contract_snapshot JSONB
* storage_path TEXT nullable
* file_hash TEXT
* generated_at TIMESTAMPTZ
* customer_accepted_at TIMESTAMPTZ nullable
* operator_accepted_at TIMESTAMPTZ nullable
* status TEXT
* created_at TIMESTAMPTZ

Historical contract must not be dynamically regenerated from current template.

---

# 36. SUBSCRIPTION_PLANS

Table:

`subscription_plans`

Fields:

* id UUID PK
* code TEXT UNIQUE
* name TEXT
* monthly_price_cents BIGINT
* currency TEXT
* marketplace_commission_basis_points INTEGER
* boat_limit INTEGER nullable
* location_limit INTEGER nullable
* staff_limit INTEGER nullable
* features JSONB nullable
* is_active BOOLEAN
* created_at TIMESTAMPTZ
* updated_at TIMESTAMPTZ

Initial business hypotheses:

* FOUNDING
* STARTER
* PRO
* BUSINESS
* ENTERPRISE

Commercial values remain configurable.

---

# 37. OPERATOR_SUBSCRIPTIONS

Table:

`operator_subscriptions`

Fields:

* id UUID PK
* operator_id UUID FK
* subscription_plan_id UUID FK
* provider_subscription_id TEXT nullable
* status TEXT
* started_at TIMESTAMPTZ
* current_period_start TIMESTAMPTZ nullable
* current_period_end TIMESTAMPTZ nullable
* ends_at TIMESTAMPTZ nullable
* created_at TIMESTAMPTZ
* updated_at TIMESTAMPTZ

Pilot may use admin-assigned subscription without automated billing.

---

# 38. COMMISSION_RULES

Table:

`commission_rules`

Fields:

* id UUID PK
* scope TEXT
* operator_id UUID nullable FK
* percentage_basis_points INTEGER
* fixed_amount_cents BIGINT nullable
* currency TEXT nullable
* valid_from TIMESTAMPTZ
* valid_to TIMESTAMPTZ nullable
* is_active BOOLEAN
* created_by_user_id UUID
* created_at TIMESTAMPTZ
* updated_at TIMESTAMPTZ

Scopes:

* GLOBAL
* OPERATOR

Use basis points:

15% = 1500.

---

# 39. STRIPE_CONNECTED_ACCOUNTS

Table:

`stripe_connected_accounts`

Fields:

* id UUID PK
* operator_id UUID UNIQUE FK
* stripe_account_id TEXT UNIQUE
* onboarding_status TEXT
* charges_enabled BOOLEAN
* payouts_enabled BOOLEAN
* details_submitted BOOLEAN
* requirements_due JSONB nullable
* last_synced_at TIMESTAMPTZ
* created_at TIMESTAMPTZ
* updated_at TIMESTAMPTZ

Do not store banking secrets.

---

# 40. PAYMENTS

Table:

`payments`

Purpose:

Provider-backed marketplace payment records.

Fields:

* id UUID PK
* booking_id UUID FK
* operator_id UUID FK
* provider TEXT
* provider_payment_intent_id TEXT nullable
* provider_checkout_session_id TEXT nullable
* provider_charge_id TEXT nullable
* stripe_connected_account_id TEXT nullable
* amount_cents BIGINT
* currency TEXT
* application_fee_cents BIGINT
* status TEXT
* paid_at TIMESTAMPTZ nullable
* failed_at TIMESTAMPTZ nullable
* created_at TIMESTAMPTZ
* updated_at TIMESTAMPTZ

Provider:

STRIPE.

Possible status:

* REQUIRES_PAYMENT
* PAYMENT_PROCESSING
* PAID
* PAYMENT_FAILED
* PARTIALLY_REFUNDED
* REFUNDED
* DISPUTED
* CANCELLED

---

# 41. MANUAL_PAYMENT_RECORDS

Table:

`manual_payment_records`

Purpose:

Operator-recorded non-Stripe/offline payment information.

Fields:

* id UUID PK
* booking_id UUID FK
* operator_id UUID FK
* payment_method TEXT
* amount_cents BIGINT
* currency TEXT
* status TEXT
* received_at TIMESTAMPTZ nullable
* note TEXT nullable
* recorded_by_user_id UUID
* created_at TIMESTAMPTZ
* updated_at TIMESTAMPTZ

Methods:

* CASH
* BANK_TRANSFER
* CARD_AT_LOCATION
* OTHER

Must never masquerade as provider-verified Stripe payment.

---

# 42. REFUNDS

Table:

`refunds`

Fields:

* id UUID PK
* payment_id UUID FK
* booking_id UUID FK
* provider_refund_id TEXT nullable UNIQUE
* amount_cents BIGINT
* currency TEXT
* reason TEXT nullable
* status TEXT
* initiated_by_user_id UUID nullable
* completed_at TIMESTAMPTZ nullable
* failed_at TIMESTAMPTZ nullable
* created_at TIMESTAMPTZ
* updated_at TIMESTAMPTZ

Statuses:

* PENDING
* PROCESSING
* SUCCEEDED
* FAILED
* CANCELLED

---

# 43. PAYOUTS

Table:

`payouts`

Fields:

* id UUID PK
* operator_id UUID FK
* provider_payout_id TEXT UNIQUE
* amount_cents BIGINT
* currency TEXT
* status TEXT
* expected_arrival_date DATE nullable
* paid_at TIMESTAMPTZ nullable
* created_at TIMESTAMPTZ
* updated_at TIMESTAMPTZ

Provider remains source of truth.

---

# 44. STRIPE_EVENTS

Table:

`stripe_events`

Fields:

* id UUID PK
* stripe_event_id TEXT UNIQUE
* event_type TEXT
* processing_status TEXT
* related_booking_id UUID nullable
* related_payment_id UUID nullable
* error_message TEXT nullable
* received_at TIMESTAMPTZ
* processed_at TIMESTAMPTZ nullable

Critical for idempotency/reconciliation.

---

# 45. SKIPPERS

Table:

`skippers`

Fields:

* id UUID PK
* operator_id UUID FK
* operator_member_id UUID nullable FK
* first_name TEXT
* last_name TEXT
* email TEXT nullable
* phone TEXT nullable
* qualification_type TEXT nullable
* qualification_number TEXT nullable
* issuing_authority TEXT nullable
* qualification_expires_on DATE nullable
* verification_status TEXT
* status TEXT
* notes TEXT nullable
* created_at TIMESTAMPTZ
* updated_at TIMESTAMPTZ

Operational skipper record is not automatically proof of legal commander eligibility.

---

# 46. SKIPPER_OCCUPANCIES

Table:

`skipper_occupancies`

Fields:

* id UUID PK
* skipper_id UUID FK
* booking_id UUID nullable FK
* event_type TEXT
* starts_at TIMESTAMPTZ
* ends_at TIMESTAMPTZ
* status TEXT
* blocks_availability BOOLEAN
* note TEXT nullable
* created_at TIMESTAMPTZ

Event types may include:

* BOOKING_ASSIGNMENT
* UNAVAILABLE
* LEAVE
* OTHER

Overlapping active blocking assignments should be prevented where relevant.

---

# 47. DOCUMENTS

Table:

`documents`

Fields:

* id UUID PK
* operator_id UUID FK
* scope TEXT
* boat_id UUID nullable FK
* skipper_id UUID nullable FK
* document_type TEXT
* storage_path TEXT
* original_filename TEXT nullable
* valid_from DATE nullable
* expires_on DATE nullable
* status TEXT
* rejection_reason TEXT nullable
* reviewed_by_user_id UUID nullable
* reviewed_at TIMESTAMPTZ nullable
* created_at TIMESTAMPTZ
* updated_at TIMESTAMPTZ

Scopes:

* OPERATOR
* BOAT
* SKIPPER

Statuses:

* PENDING
* UNDER_REVIEW
* APPROVED
* REJECTED
* EXPIRED

Private Supabase Storage.

---

# 48. COMPLIANCE_REQUIREMENTS

Table:

`compliance_requirements`

Purpose:

Configurable catalogue of legal/operational requirements.

Fields:

* id UUID PK
* code TEXT UNIQUE
* name TEXT
* jurisdiction_country_code TEXT nullable
* region_code TEXT nullable
* boat_type_id UUID nullable
* contract_type TEXT nullable
* scope TEXT
* required_document_type TEXT nullable
* blocking_level TEXT
* is_active BOOLEAN
* valid_from DATE nullable
* valid_to DATE nullable
* created_at TIMESTAMPTZ
* updated_at TIMESTAMPTZ

Allows future legal rules without embedding everything directly into UI code.

---

# 49. COMPLIANCE_CHECKS

Table:

`compliance_checks`

Fields:

* id UUID PK
* operator_id UUID FK
* boat_id UUID nullable
* skipper_id UUID nullable
* compliance_requirement_id UUID FK
* status TEXT
* related_document_id UUID nullable
* reviewed_by_user_id UUID nullable
* review_notes TEXT nullable
* valid_until DATE nullable
* created_at TIMESTAMPTZ
* updated_at TIMESTAMPTZ

Statuses:

* NOT_SUBMITTED
* PENDING
* APPROVED
* REJECTED
* EXPIRED
* REQUIRES_REVIEW

---

# 50. OPERATOR_VERIFICATIONS

Table:

`operator_verifications`

Fields:

* id UUID PK
* operator_id UUID FK
* status TEXT
* submitted_at TIMESTAMPTZ
* reviewed_at TIMESTAMPTZ nullable
* reviewed_by_user_id UUID nullable
* review_notes TEXT nullable
* created_at TIMESTAMPTZ

Preserves verification history.

---

# 51. BOAT_PUBLICATION_REVIEWS

Table:

`boat_publication_reviews`

Fields:

* id UUID PK
* boat_id UUID FK
* status TEXT
* submitted_at TIMESTAMPTZ
* reviewed_at TIMESTAMPTZ nullable
* reviewed_by_user_id UUID nullable
* reason TEXT nullable
* created_at TIMESTAMPTZ

Statuses:

* PENDING
* APPROVED
* CHANGES_REQUESTED
* REJECTED

---

# 52. REVIEWS

Table:

`reviews`

Fields:

* id UUID PK
* booking_id UUID UNIQUE FK
* customer_user_id UUID FK
* operator_id UUID FK
* boat_id UUID FK
* rating SMALLINT
* title TEXT nullable
* review_text TEXT
* moderation_status TEXT
* moderated_by_user_id UUID nullable
* moderation_reason TEXT nullable
* created_at TIMESTAMPTZ
* updated_at TIMESTAMPTZ

Constraint:

rating between 1 and 5.

Creation eligibility requires appropriate completed booking.

---

# 53. FAVORITES

Table:

`favorites`

Fields:

* user_id UUID FK
* boat_id UUID FK
* created_at TIMESTAMPTZ

Unique:

user_id + boat_id.

---

# 54. NOTIFICATIONS

Table:

`notifications`

Fields:

* id UUID PK
* recipient_user_id UUID FK
* notification_type TEXT
* title TEXT
* body TEXT
* related_booking_id UUID nullable
* related_boat_id UUID nullable
* related_operator_id UUID nullable
* metadata JSONB nullable
* read_at TIMESTAMPTZ nullable
* created_at TIMESTAMPTZ

---

# 55. NOTIFICATION_DELIVERIES

Table:

`notification_deliveries`

Fields:

* id UUID PK
* notification_id UUID FK
* channel TEXT
* destination TEXT nullable
* status TEXT
* provider_message_id TEXT nullable
* error_message TEXT nullable
* sent_at TIMESTAMPTZ nullable
* created_at TIMESTAMPTZ

Channels:

* EMAIL
* SMS
* WHATSAPP

MVP external channel:

EMAIL.

---

# 56. USER_NOTIFICATION_PREFERENCES

Table:

`user_notification_preferences`

Fields:

* user_id UUID PK
* marketing_email BOOLEAN
* booking_email BOOLEAN
* payment_email BOOLEAN
* reminder_email BOOLEAN
* in_app_notifications BOOLEAN
* updated_at TIMESTAMPTZ

Transactional legally/operationally necessary communications may not always be optional.

---

# 57. CONTENT_REPORTS

Table:

`content_reports`

Fields:

* id UUID PK
* reporter_user_id UUID nullable
* resource_type TEXT
* resource_id UUID nullable
* report_reason TEXT
* description TEXT nullable
* status TEXT
* assigned_admin_id UUID nullable
* created_at TIMESTAMPTZ
* resolved_at TIMESTAMPTZ nullable

Possible statuses:

* OPEN
* UNDER_REVIEW
* ACTION_TAKEN
* NO_VIOLATION
* CLOSED

---

# 58. MODERATION_DECISIONS

Table:

`moderation_decisions`

Fields:

* id UUID PK
* content_report_id UUID nullable FK
* resource_type TEXT
* resource_id UUID nullable
* action TEXT
* reason TEXT
* moderator_user_id UUID
* created_at TIMESTAMPTZ

---

# 59. PRIVACY_REQUESTS

Table:

`privacy_requests`

Fields:

* id UUID PK
* user_id UUID FK
* request_type TEXT
* status TEXT
* submitted_at TIMESTAMPTZ
* identity_verified_at TIMESTAMPTZ nullable
* assigned_admin_user_id UUID nullable
* resolution_notes TEXT nullable
* completed_at TIMESTAMPTZ nullable
* created_at TIMESTAMPTZ
* updated_at TIMESTAMPTZ

Types:

* ACCESS
* RECTIFICATION
* ERASURE
* PORTABILITY
* RESTRICTION
* OBJECTION

---

# 60. DAC7_SELLER_PROFILES

Table:

`dac7_seller_profiles`

Fields:

* id UUID PK
* operator_id UUID UNIQUE FK
* reporting_status TEXT
* tax_residence_country_code TEXT nullable
* tin TEXT nullable
* vat_number TEXT nullable
* legal_identity_snapshot JSONB nullable
* verified_at TIMESTAMPTZ nullable
* created_at TIMESTAMPTZ
* updated_at TIMESTAMPTZ

Exact final fields subject to tax professional validation.

---

# 61. DAC7_REPORTING_PERIODS

Table:

`dac7_reporting_periods`

Fields:

* id UUID PK
* calendar_year INTEGER UNIQUE
* status TEXT
* submission_reference TEXT nullable
* submitted_at TIMESTAMPTZ nullable
* created_at TIMESTAMPTZ
* updated_at TIMESTAMPTZ

---

# 62. DAC7_REPORTABLE_TRANSACTIONS

Table:

`dac7_reportable_transactions`

Fields:

* id UUID PK
* reporting_period_id UUID FK
* operator_id UUID FK
* booking_id UUID UNIQUE FK
* consideration_cents BIGINT
* currency TEXT
* boatly_fees_cents BIGINT
* taxes_cents BIGINT nullable
* transaction_quarter SMALLINT
* transaction_snapshot JSONB
* created_at TIMESTAMPTZ

---

# 63. DAC7_REPORTS

Table:

`dac7_reports`

Fields:

* id UUID PK
* reporting_period_id UUID FK
* status TEXT
* generated_at TIMESTAMPTZ nullable
* submitted_at TIMESTAMPTZ nullable
* storage_path TEXT nullable
* submission_reference TEXT nullable
* created_at TIMESTAMPTZ

---

# 64. OPERATOR_SETTINGS

Table:

`operator_settings`

Fields:

* operator_id UUID PK FK
* default_cancellation_policy_id UUID nullable
* booking_buffer_minutes INTEGER default 0
* default_currency TEXT default 'EUR'
* created_at TIMESTAMPTZ
* updated_at TIMESTAMPTZ

---

# 65. SUPPORT_TICKETS

Table:

`support_tickets`

Fields:

* id UUID PK
* created_by_user_id UUID FK
* operator_id UUID nullable
* booking_id UUID nullable
* payment_id UUID nullable
* category TEXT
* subject TEXT
* description TEXT
* status TEXT
* priority TEXT
* assigned_admin_user_id UUID nullable
* created_at TIMESTAMPTZ
* updated_at TIMESTAMPTZ
* closed_at TIMESTAMPTZ nullable

---

# 66. AUDIT_LOGS

Table:

`audit_logs`

Fields:

* id UUID PK
* actor_user_id UUID nullable
* actor_role TEXT nullable
* operator_id UUID nullable
* action TEXT
* resource_type TEXT
* resource_id UUID nullable
* before_data JSONB nullable
* after_data JSONB nullable
* metadata JSONB nullable
* created_at TIMESTAMPTZ

Immutable for ordinary users.

---

# 67. CORE RELATIONSHIPS

auth.users

1:1

profiles.

profiles

M:N operators through operator_members.

operators

1:1 operator_legal_profiles.

operators

1:N operator_locations.

operators

1:N boats.

locations

1:N boats.

boats

1:N boat_legal_offerings.

boats

M:N amenities.

operators

1:N extras.

boats

M:N extras.

boats

1:N rate plans.

rate plans

1:N pricing rules.

boats

1:N availability rules.

operators

1:N operator_customers.

boats/operators/customers/locations/legal offerings

→ bookings.

boats

1:N occupancies.

bookings

1:N booking extras.

bookings

1:N price items.

bookings

1:N booking events.

bookings

1:N legal acceptances.

bookings

1:N booking contracts.

operators

1:N subscriptions.

operators

1:N commission rules.

operators

1:1 Stripe connected account.

bookings

1:N payments/manual payment records.

payments

1:N refunds.

operators

1:N payouts.

operators

1:N skippers.

skippers

1:N skipper occupancies.

operators/boats/skippers

1:N documents/compliance checks.

bookings

0:1 review.

users

M:N boats through favorites.

operators

1:1 DAC7 seller profile.

---

# 68. DOUBLE-BOOKING DATABASE INVARIANT

The database must prevent overlapping active blocking occupancies for the same boat.

Example existing occupancy:

09:00–18:00.

Attempt:

12:00–15:00.

Expected:

database rejection.

Application checks are not sufficient because concurrent requests can arrive nearly simultaneously.

---

# 69. BOOKING HOLD INVARIANT

Active HOLD blocks other blocking occupancy.

Expired HOLD no longer blocks.

Hold expiration must not leave boat permanently unavailable.

---

# 70. SKIPPER NON-OVERLAP

Where skipper occupancy blocks availability, overlapping assignments must be rejected using similarly robust logic.

---

# 71. MONEY RULES

Store:

€249.50

as:

24950 cents.

Use currency code separately.

Percentage commissions:

basis points.

Do not use floating point for financial calculations.

---

# 72. FINANCIAL SEPARATION

Distinguish:

* customer booking total;
* commissionable amount;
* Boatly commission;
* provider fees;
* operator net;
* refund;
* payout;
* Marketplace GMV;
* Managed Booking Volume.

Provider processing cost is not Boatly revenue.

---

# 73. MARKETPLACE VS MANUAL

MARKETPLACE booking:

may have provider payment + commission.

MANUAL booking:

0% marketplace commission.

Manual payment record:

does not represent Stripe payment.

---

# 74. PUBLICATION INTEGRITY

Public boat must satisfy:

* operator marketplace eligible;
* boat PUBLISHED;
* active location;
* approved legal offering;
* compliance requirements valid.

Public queries must not expose private fields.

---

# 75. TENANT MODEL

Tenant:

operator.

Important private tables should either:

* contain operator_id directly;
* or have unambiguous secure relation to operator.

Where direct operator_id improves RLS/security/performance, it may be intentionally duplicated.

Consistency must be enforced.

---

# 76. CUSTOMER PRIVACY

Customer-visible rows require own-user relationship.

Examples:

bookings.customer_user_id = auth.uid()

favorites.user_id = auth.uid()

notifications.recipient_user_id = auth.uid().

---

# 77. RLS

Every exposed tenant-sensitive table requires appropriate RLS.

Rules:

* customer own data;
* active operator membership;
* role-specific writes;
* public approved content;
* platform roles.

Exact SQL policies are implemented later.

---

# 78. SERVICE ROLE

Supabase service role:

* server only;
* never client;
* never public env variable;
* never browser bundle.

Service-role use does not remove need for server-side business validation.

---

# 79. STORAGE

Initial buckets:

* boat-images;
* operator-public-media;
* private-documents;
* booking-contracts;
* avatars.

Private buckets require authorization/signed access.

---

# 80. GEOSPATIAL

Store location geography using PostGIS.

Support:

* radius;
* nearest;
* map bounds;
* distance sorting.

Use GiST spatial indexes.

---

# 81. TIMEZONE

Store instants as UTC timestamps.

Store operator-location IANA timezone.

Rental schedules are interpreted according to relevant location timezone.

Do not assume Italy forever.

---

# 82. INDEX STRATEGY

Likely indexes:

operators:

* slug;
* status.

locations:

* operator_id;
* status;
* geo_point GiST.

boats:

* operator_id;
* location_id;
* type;
* status;
* slug.

bookings:

* operator_id;
* boat_id;
* customer_user_id;
* operator_customer_id;
* starts_at;
* status;
* booking_code.

occupancies:

* boat_id;
* time range;
* GiST/exclusion support.

payments:

* booking;
* operator;
* provider IDs;
* status.

documents:

* operator;
* boat;
* status;
* expires_on.

compliance:

* entity/status/requirement.

reviews:

* boat;
* operator.

legal acceptances:

* user;
* booking;
* legal version.

DAC7:

* period;
* operator;
* booking.

Do not add indexes blindly.

---

# 83. DATABASE CREATION ORDER

Suggested migration order:

1. extensions;
2. reference data/types;
3. profiles;
4. platform roles;
5. operators;
6. legal profiles;
7. memberships/invitations;
8. locations;
9. destinations;
10. boat types;
11. boats;
12. legal offerings;
13. images;
14. amenities;
15. extras;
16. cancellation policies;
17. pricing;
18. availability;
19. CRM;
20. bookings;
21. occupancies;
22. booking details/events;
23. legal documents/acceptances/contracts;
24. subscription plans/subscriptions;
25. commission rules;
26. Stripe accounts/payments/manual payments;
27. refunds/payouts/provider events;
28. skippers;
29. documents;
30. compliance;
31. verification/review;
32. reviews/favorites;
33. notifications;
34. moderation;
35. privacy;
36. DAC7;
37. support;
38. audit;
39. indexes;
40. constraints;
41. RLS/grants;
42. functions;
43. seed;
44. tests.

---

# 84. MIGRATION PRINCIPLE

Do not manually create production tables one-by-one through Supabase UI as the source of truth.

Production must be reproducible from repository migrations.

---

# 85. FINAL DATABASE GUARANTEES

The database architecture must support:

* no double bookings;
* strict tenant isolation;
* customer isolation;
* marketplace/manual distinction;
* immutable financial history;
* immutable legal history;
* provider idempotency;
* configurable pricing/commission/subscriptions;
* compliant publication gates;
* private documents;
* geospatial search;
* DAC7-ready history;
* moderation/privacy workflows;
* auditability.
