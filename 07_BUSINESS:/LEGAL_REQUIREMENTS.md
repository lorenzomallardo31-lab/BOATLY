# BOATLY — LEGAL & OPERATIONAL REQUIREMENTS

**Version:** 1.0
**Status:** Compliance architecture — professional validation required before live launch
**Project:** Boatly
**Jurisdiction baseline:** Italy / European Union
**Legal planning date:** 25 August 2026

---

# 1. PURPOSE

This document defines the legal and operational compliance architecture that Boatly must support before operating as a real marketplace.

It is NOT:

* final legal advice
* final Terms & Conditions
* a substitute for a lawyer
* a substitute for an accountant/tax adviser
* a substitute for maritime authority guidance

The purpose is to ensure that the software architecture does not make legal compliance impossible later.

Before Boatly accepts real customer money or charges marketplace commissions, the final operating model must be validated by professionals qualified in:

* Italian nautical law
* marketplace/e-commerce law
* payment regulation
* privacy/GDPR
* tax/accounting
* DAC7

---

# 2. MVP LEGAL SCOPE

The initial Boatly marketplace is designed for:

PROFESSIONAL RENTAL OPERATORS

and NOT for:

private boat owners renting their boat occasionally.

This distinction is deliberate.

The Italian nautical framework contains separate rules for occasional rental and professional/commercial activity.

Allowing private individuals to list boats would therefore introduce:

* different legal regimes
* additional tax analysis
* different verification requirements
* additional consumer transparency
* additional insurance questions
* potential peer-to-peer marketplace risks

P2P/private listings are excluded from the MVP.

They may be considered only as a separate future legal workstream.

---

# 3. TARGET CONTRACTUAL MODEL

The provisional commercial model is:

Customer

↕

Professional Rental Operator

with

Boatly

acting as the marketplace/intermediation technology provider.

The rental operator is intended to remain the supplier of the nautical rental service.

However, this model is NOT considered legally final until Boatly's position under Italian nautical mediation rules and payment regulation has been reviewed.

Before production launch, legal counsel must identify precisely:

* who is the contractual supplier
* whether Boatly acts as intermediary
* whether Boatly acts as agent
* whether Boatly qualifies as mediatore del diporto
* whether Boatly can collect a commission under the proposed structure
* who receives the customer payment legally
* who invoices the customer
* who issues refunds
* who bears specific contractual liabilities

---

# 4. CRITICAL RED BLOCKER — MEDIATORE DEL DIPORTO

Italian nautical law contains a regulated professional activity called:

MEDIATORE DEL DIPORTO

The statutory definition covers a person/entity that brings two or more parties into contact, including through consultancy, for the conclusion of contracts involving:

* construction
* purchase/sale
* locazione
* noleggio
* mooring

of recreational craft.

The activity is subject to specific professional requirements and a SCIA/registration framework.

Because Boatly intends to:

* display professional rental operators
* connect customers and operators
* facilitate locazione/noleggio contracts
* receive a marketplace commission

there is a serious possibility that Boatly's marketplace model may fall within this regulated activity.

This must NOT be assumed either way.

## Mandatory pre-launch action

Before Boatly accepts real paid marketplace bookings:

a specialized Italian nautical-sector lawyer must determine whether:

* Boatly itself qualifies as mediatore del diporto;
* the company needs the relevant professional requirements;
* a qualified mediatore must be involved;
* SCIA is required;
* Registro Imprese / REA registration is required;
* Boatly's software-only role changes the analysis;
* acting as agent for the operator changes the analysis;
* the selected contractual/payment structure changes the analysis.

This is a PRODUCTION LAUNCH BLOCKER.

The paid marketplace cannot go live until this question is resolved.

---

# 5. NAUTICAL CONTRACT TYPES

The generic product term "boat rental" is not sufficient for the legal architecture.

Italian recreational boating law distinguishes different contractual structures.

Boatly must support a legal contract classification.

Initial conceptual types:

* LOCAZIONE
* LOCAZIONE_CON_PRESCRIZIONE_COMANDANTE
* NOLEGGIO
* other future legally validated types

The customer-facing marketing language may remain simple.

The legal booking record must remain precise.

---

# 6. LOCAZIONE

In Italian nautical law, locazione generally involves transferring use of the recreational craft for an agreed period.

The person renting the unit takes temporary possession/detention according to the applicable legal framework and assumes the risks deriving from their conduct.

This model is materially different from noleggio.

Boatly must therefore not treat:

"without skipper"

as the complete legal definition of locazione.

The legal contract type must be explicitly determined.

---

# 7. NOLEGGIO

In noleggio, the nautical operator makes the craft available for an agreed period or itinerary under the applicable legal regime.

The craft remains in the availability of the noleggiante and the crew remains under the noleggiante.

This differs materially from locazione.

Boatly therefore must not define legal contract type solely through:

skipper = true / false.

---

# 8. LOCAZIONE WITH PRESCRIBED COMMANDER

Italian law introduced in 2026 the specific concept:

LOCAZIONE CON PRESCRIZIONE DI COMANDANTE

This cannot be treated as ordinary "skipper available".

The relevant legal structure includes specific conditions.

The current framework provides, among other requirements, that:

* it concerns an imbarcazione da diporto;
* the commander must hold at least the applicable professional title;
* the commander is designated by the locatario;
* the locatario must be a single natural person;
* passenger limits apply according to the legal provision and vessel certification;
* the locazione contract and the relevant commander contract must be kept among the onboard documents for the duration of the locazione.

Exact implementation and contract mechanics must be approved by nautical legal counsel.

---

# 9. IMPORTANT CONSEQUENCE FOR BOATLY

The current database concept:

skipper_mode

is useful operationally but NOT sufficient legally.

We will later need to distinguish:

## Operational configuration

Examples:

* skipper unavailable
* skipper optional
* skipper included
* skipper required

from:

## Legal contract model

Examples:

* locazione
* locazione with prescribed commander
* noleggio

A booking must store the legal contract model used at booking time.

---

# 10. CONTRACT TYPE SNAPSHOT

Each confirmed booking must eventually preserve:

* legal contract type
* contractual operator identity
* contractual customer identity
* boat identity
* commander/skipper contractual role where applicable
* applicable Terms version
* cancellation conditions
* rental conditions
* relevant legal notices
* contract generation timestamp

Future changes cannot rewrite past contractual history.

---

# 11. WRITTEN CONTRACT REQUIREMENTS

Italian nautical law imposes written-form requirements for certain locazione/noleggio contracts involving imbarcazioni and navi da diporto.

Boatly should therefore adopt the safer operational principle:

EVERY booking generates a durable contractual record.

Even where a specific vessel category may not legally require the same formalities, Boatly should maintain documented booking evidence.

The product must eventually be capable of generating a downloadable contract/booking document.

---

# 12. ONBOARD CONTRACT DOCUMENTS

Certain nautical contracts must be kept onboard in the form required by applicable law.

Therefore Boatly must support:

* contract generation
* download
* operator access
* customer access
* document version
* immutable copy
* retrievability

Before launch, nautical legal counsel must determine:

* whether electronic copies satisfy each requirement;
* when original/certified copies are required;
* whether electronic signature is appropriate;
* what the operator must physically keep onboard.

Boatly must never claim that a digital PDF automatically satisfies every onboard-document requirement unless legally confirmed.

---

# 13. CONTRACT GENERATION

Future architecture should support:

booking

↓

contract data snapshot

↓

legal template version

↓

generated contract

↓

customer acceptance

↓

operator acceptance where required

↓

immutable stored version

A contract must not dynamically change because the template is later edited.

---

# 14. CONTRACT VERSIONING

Every legal document used in a transaction must have a version.

Examples:

CUSTOMER_TERMS v1.0

OPERATOR_TERMS v1.0

CANCELLATION_POLICY v2.1

RENTAL_CONTRACT_TEMPLATE v1.3

A booking must store which versions were accepted.

---

# 15. LEGAL ACCEPTANCE EVIDENCE

Boatly must record evidence that required terms were presented and accepted.

Future information should include:

* user ID
* operator ID where applicable
* legal document version
* booking ID where applicable
* acceptance timestamp
* acceptance context
* locale/language
* document hash or immutable reference

Additional evidence such as IP address/user agent should only be stored if legally justified and proportionate.

---

# 16. OPERATOR COMMERCIAL ELIGIBILITY

Before publication, the operator must provide sufficient information to demonstrate that they are eligible to offer the relevant nautical activity.

Possible information includes:

* legal business identity
* VAT/tax data
* business registration information
* relevant licenses/authorizations
* commercial-use status
* insurance
* required maritime documentation
* operator verification documents

Exact mandatory fields depend on:

* vessel type
* activity
* flag
* location
* contractual model
* national/local rules

Boatly must support configurable compliance requirements.

---

# 17. COMMERCIAL USE OF BOATS

A boat listed for professional rental must be legally eligible for the commercial use offered.

The operator must not be allowed to publish a boat merely by uploading photos.

Boatly must eventually verify or collect evidence concerning applicable commercial-use requirements.

Possible compliance states:

* NOT_SUBMITTED
* PENDING
* VERIFIED
* EXPIRED
* REJECTED
* REQUIRES_REVIEW

The exact documentary requirements must be validated with nautical counsel and relevant maritime authorities.

---

# 18. LOCAL MARITIME RULES

Italian nautical operations can also be affected by:

* Capitaneria di Porto requirements
* local maritime ordinances
* port/marina rules
* regional/local operating requirements
* navigation-area restrictions

Boatly cannot assume that one national checklist covers every operational location.

Architecture should allow future compliance rules by:

* country
* region
* port/location
* vessel type
* activity type

---

# 19. OPERATOR DECLARATIONS

Operators must contractually declare that information supplied to Boatly is accurate.

Examples:

* vessel technical data
* commercial eligibility
* insurance
* passenger capacity
* required documents
* skipper/commander eligibility
* safety compliance
* pricing
* availability

However:

an operator declaration does not automatically relieve Boatly of legal obligations that may independently apply to the platform.

---

# 20. INSURANCE

Insurance is a critical publication requirement.

Depending on the contractual model, applicable law imposes specific insurance obligations on the operator/vessel.

Boatly must therefore support:

* insurance document upload
* policy number
* insurer
* validity start date
* expiration date
* covered vessel
* verification status

The platform must detect expiration.

---

# 21. INSURANCE EXPIRATION

Possible future flow:

Insurance valid

↓

Boat PUBLISHED

↓

Policy approaching expiration

↓

Operator warning

↓

Policy expires

↓

Boat flagged

↓

New bookings may be restricted according to legal policy

Existing bookings:

must be reviewed rather than silently deleted.

The exact restriction logic must be validated before production.

---

# 22. SAFETY AND NAVIGABILITY

The rental operator remains responsible for obligations imposed on the operator by applicable nautical law concerning matters such as:

* vessel efficiency/navigation condition
* safety equipment
* required navigation documents
* insurance
* crew/equipment requirements where applicable

Boatly must not market itself as independently certifying seaworthiness unless it creates a real verification process capable of supporting such a claim.

Use language such as:

"documents verified by Boatly"

only where Boatly actually performs that defined verification.

Do not use:

"Boatly guarantees this boat is legally safe"

without a legally and operationally supportable process.

---

# 23. BOATING LICENSE — CRITICAL PRODUCT CHANGE

The existing product concept:

license_required = true/false

is too simplistic for the Italian market.

The requirement for a boating licence cannot be determined only from horsepower.

Eligibility may depend on factors including:

* engine power
* engine displacement
* engine technology/type
* navigation distance from the coast
* vessel category
* specific activity
* other legal conditions

Moto d'acqua, for example, have specific licensing requirements.

Therefore Boatly must not implement:

if horsepower <= 40:
no_license_required

This would be legally unsafe.

---

# 24. DRIVER ELIGIBILITY ENGINE

Future Boatly must use a more complete eligibility model.

Boat technical data should support additional fields necessary for eligibility calculation.

Potential examples:

* engine_power_kw
* horsepower
* engine_displacement_cc
* engine_cycle/type
* engine installation/type
* vessel category
* maximum permitted navigation area
* legal rental configuration

The search filter:

"Senza patente"

should ultimately be based on a validated eligibility rule.

It should not be based only on operator marketing text.

---

# 25. CUSTOMER DRIVER ELIGIBILITY

Where the customer will personally conduct the boat, checkout may need to verify/declaratively collect:

* age
* required licence possession
* licence category where relevant
* licence issuing country
* licence validity

Whether Boatly must collect an actual licence image/document should be decided later according to:

* legal necessity
* operator requirements
* privacy minimization

Do not collect identity/licence documents merely because it is technically easy.

---

# 26. FOREIGN BOATING LICENCES

Boatly may eventually serve foreign tourists.

Foreign boating licences and equivalent qualifications may be subject to recognition/conversion/specific Italian rules.

Therefore:

"Has boating licence: YES"

is not sufficient for international users.

For the Italian MVP:

the system must be architecturally capable of recording issuing country and licence type.

Exact recognition rules require nautical legal validation.

---

# 27. SKIPPER VS COMMANDER

Product terminology must distinguish:

SKIPPER

as a customer-facing/operational concept

from:

COMMANDER / COMANDANTE

where Italian law assigns a specific legal meaning or professional requirement.

A Boatly "skipper" record must not automatically be considered legally qualified as commander for every contractual model.

---

# 28. SKIPPER/COMMANDER VERIFICATION

Where professional qualifications are legally required, Boatly should support:

* identity
* professional qualification type
* document number
* issuing authority
* issue date
* expiration date where applicable
* verification status

The booking stores the relevant assignment snapshot.

---

# 29. PASSENGER CAPACITY

The customer cannot book more passengers than legally/technically permitted.

Capacity checks must use the strictest applicable limit.

Potential sources:

* homologation/certification
* vessel technical limit
* legal contract-type limit
* operator configuration

Checkout must reject passenger counts above the permitted value.

---

# 30. ADULT CONTRACTING USER

Recommended MVP rule:

The person entering into the marketplace rental contract must be at least 18 years old.

This reduces:

* minor-contract issues
* child-data processing
* payment issues

Passengers may include minors where legally permitted.

The age required to personally conduct a vessel remains a separate legal eligibility question.

Final age policy must be approved by legal counsel.

---

# 31. CONSUMER LAW

Marketplace bookings are online/distance transactions.

Boatly must support the applicable Italian/EU consumer information framework.

Before the order is finalized, the consumer must receive clear information including, as applicable:

* identity of the contractual professional
* service characteristics
* boat
* rental location
* date/time
* total price
* additional charges
* payment conditions
* cancellation rules
* deposit
* complaint/support information
* applicable withdrawal information
* contractual responsibilities

The actual legally required information will be mapped by counsel before launch.

---

# 32. MARKETPLACE TRANSPARENCY

Boatly is not a single-supplier e-commerce shop.

The customer must understand:

* that Boatly is a marketplace/intermediary where legally confirmed;
* who the rental operator is;
* whether the operator is a professional trader;
* who provides the nautical service;
* how responsibilities are allocated;
* what Boatly provides;
* what the operator provides.

This information must appear before the booking is finalized.

---

# 33. RANKING TRANSPARENCY

Online marketplaces must provide transparency concerning the main parameters that determine ranking.

Boatly therefore needs a ranking disclosure.

Example future factors:

* search relevance
* geographic distance
* actual availability
* price
* rating
* listing quality
* booking conversion
* cancellation reliability
* commercial/sponsored placement where applicable

The platform does NOT need to disclose source code or reveal a formula that enables manipulation.

It must provide an intelligible description of the main ranking parameters and their relative importance where legally required.

---

# 34. SPONSORED RESULTS

If Boatly later sells sponsored visibility:

Sponsored results must be clearly identified.

The customer must not be led to believe that paid placement is purely organic relevance.

The ranking disclosure must explain the effect of remuneration where legally required.

---

# 35. FINAL BOOKING BUTTON

The final order action must clearly communicate that clicking creates an obligation to pay.

Avoid ambiguous final CTA such as:

"Continue"

Recommended concept:

"Prenota e paga"

or another legally reviewed unambiguous label.

The exact wording will be finalized during checkout design.

---

# 36. PRE-CONTRACT CHECKOUT SCREEN

Immediately before payment, Boatly should display:

* rental operator
* boat
* contract type where appropriate
* date/time
* location
* passengers
* selected extras
* total
* deposit
* fuel policy
* cancellation policy
* withdrawal information
* required licence information
* terms links
* payment obligation

The customer must be able to correct errors before the order.

---

# 37. DURABLE CONTRACT CONFIRMATION

After an online booking, Boatly must provide a durable confirmation of the transaction/contractual information where required.

Recommended architecture:

Booking confirmed

↓

Generate immutable confirmation

↓

Store in customer account

↓

Send confirmation by email

↓

Make contractual document downloadable

Email alone must not be the only source of historical truth.

---

# 38. RIGHT OF WITHDRAWAL

General EU consumer law provides a withdrawal period for many online service contracts.

There are important exceptions for certain services tied to a specific date or period, including categories of leisure services.

A date-specific Boatly nautical rental may potentially fall within an exception, but Boatly must NOT assume that every locazione/noleggio booking automatically falls outside the right of withdrawal.

Before launch, consumer-law counsel must determine the correct treatment for:

* locazione
* locazione with commander
* noleggio
* different Boatly service structures
* intermediary role

The customer must receive the legally correct information before booking.

---

# 39. CANCELLATION POLICY VS STATUTORY RIGHTS

Boatly's contractual cancellation policy is NOT a replacement for mandatory consumer rights.

Example:

"Non-refundable"

cannot remove a statutory right if the law gives the consumer that right.

Therefore cancellation processing must evaluate:

1. mandatory legal rights
2. contractual cancellation policy
3. exceptional operator/platform rules

in the correct order.

---

# 40. WEATHER CANCELLATION

Nautical rentals may become impossible or unsafe due to weather/sea conditions.

The final operator/customer terms must define:

* who determines unsafe conditions
* evidence/source used
* rescheduling rights
* full/partial refund rules
* operator discretion
* force majeure interaction
* Boatly's role

This cannot be left undefined.

Weather cancellations should be a dedicated cancellation reason.

---

# 41. OPERATOR CANCELLATION

The operator terms must define:

* permitted reasons
* customer refund
* repeated cancellation consequences
* emergency/safety circumstances
* fraud/abuse rules
* ranking implications
* possible platform restriction

The customer must never lose money because an operator simply refuses to provide a confirmed rental unless a legally valid rule provides otherwise.

---

# 42. P2B — OPERATOR TERMS

Boatly provides online intermediation services to professional business users.

The EU Platform-to-Business framework must therefore be assessed and implemented where applicable.

Operator Terms should include matters such as:

* services supplied by Boatly
* commission
* subscription
* ranking
* access to data
* suspension/restriction grounds
* termination
* intellectual-property treatment
* complaint process
* effects of contractual changes

Terms must be clear and accessible to operators before registration.

---

# 43. CHANGES TO OPERATOR TERMS

The P2B framework generally requires advance notification of changes to platform terms, with specific rules/exceptions.

Boatly must therefore not silently replace:

OPERATOR_TERMS v1

with:

OPERATOR_TERMS v2

and instantly bind every operator without a controlled process.

Future system:

new version

↓

effective date

↓

operator notification

↓

required notice period

↓

acceptance/continued use according to legally approved model

↓

historical version remains stored

---

# 44. OPERATOR SUSPENSION

Suspending an operator must be a controlled process.

Store:

* reason
* actor
* date
* supporting information
* affected listings
* notification
* appeal/complaint status where applicable

Do not simply set:

status = SUSPENDED

without audit history.

---

# 45. OPERATOR TERMINATION

Where required by applicable P2B rules, termination/restriction decisions may require:

* predefined contractual grounds
* statement of reasons
* advance notice subject to legal exceptions
* durable communication
* complaint/redress route

The exact timing/exceptions must be implemented from the legally approved Operator Terms.

---

# 46. DIGITAL SERVICES ACT

Boatly must be assessed under the EU Digital Services Act.

Different obligations depend on:

* exact service classification
* company/platform size
* whether Boatly hosts operator content
* whether consumers conclude distance contracts
* future scale

The product must be designed so that DSA-related obligations can be implemented without architectural redesign.

---

# 47. TRADER TRACEABILITY

The DSA contains specific trader-traceability requirements for certain online marketplaces, with exemptions for qualifying micro/small platforms for the relevant section.

Even if Boatly initially qualifies for an exemption, the product should be future-ready.

Operator onboarding already needs much of this information for other reasons.

Potential information includes:

* legal name
* address
* phone
* email
* identity information
* trade register information
* registration number
* payment-account information where legally applicable
* compliance self-certification

Whether each field is mandatory at Boatly's actual launch depends on its legal status and size.

---

# 48. DSA SIZE STATUS

Boatly must determine before launch whether it qualifies as:

* microenterprise
* small enterprise
* other category

and periodically re-evaluate that status as the business grows.

An exemption available to Boatly at launch must not become a permanently hardcoded assumption.

---

# 49. ILLEGAL CONTENT / LISTING REPORTING

Boatly should have a mechanism to report:

* fraudulent operator
* illegal listing
* misleading listing
* unsafe content
* fake review
* prohibited image/content
* other legal violation

Possible customer-facing CTA:

"Segnala"

The report must generate an internal moderation record.

---

# 50. MODERATION DECISIONS

Moderation actions should preserve:

* report
* decision
* reason
* moderator
* timestamp
* affected content
* notification where applicable

Possible states:

* OPEN
* UNDER_REVIEW
* ACTION_TAKEN
* NO_VIOLATION
* CLOSED

---

# 51. REVIEWS

Boatly already follows a strong rule:

Only customers with an eligible completed booking can review.

This helps ensure review authenticity.

The platform must explain how reviews are collected/verified if it describes them as:

"verified reviews".

Operators cannot pay Boatly to secretly remove legitimate negative reviews.

Moderation must be based on published rules.

---

# 52. REVIEW POLICY

Create a dedicated policy defining prohibited content such as:

* threats
* unlawful content
* personal data
* spam
* fake reviews
* irrelevant content
* discriminatory abuse

A low rating alone is not a valid moderation reason.

---

# 53. GDPR — PRIVACY BY DESIGN

Boatly processes personal data including:

* customer identity
* contact information
* bookings
* location-related information
* operator identities
* staff
* skipper information
* financial references
* verification documents

GDPR compliance must therefore be designed into the product.

Not added after launch.

---

# 54. DATA CONTROLLER MAP

Before launch, privacy counsel must map the role of each party.

Potentially:

BOATLY

may act as independent controller for activities such as:

* account management
* marketplace operation
* fraud prevention
* platform support
* platform analytics
* legal compliance

OPERATOR

may act as independent controller for activities such as:

* providing rental
* customer operational management
* legally required rental documentation

Some processing could require another legal qualification depending on how purposes and means are determined.

Do not assume Boatly is merely a processor for every operator activity.

---

# 55. PRIVACY NOTICES

Boatly will need privacy information for relevant user groups.

At minimum evaluate:

* public visitors
* customers
* operators
* operator staff
* skippers
* support contacts
* marketing leads

A single incomprehensible privacy page should not be used to hide fundamentally different processing activities.

---

# 56. DATA PROCESSING RECORD

Before production, Boatly should maintain a GDPR processing inventory/record covering:

* purpose
* categories of people
* categories of data
* lawful basis
* recipients
* processors
* transfers
* retention
* security controls

This is an organizational compliance document, not a public page.

---

# 57. DATA MINIMIZATION

Collect only information required for a legitimate purpose.

Examples:

Do not collect a customer passport merely because Boatly has an upload component.

Do not collect a boating licence image if an operator declaration is legally sufficient.

Do not expose full customer details to a skipper when only name and contact information are required.

---

# 58. DATA RETENTION

Boatly needs a documented retention schedule.

Different information requires different retention periods.

Examples:

* account data
* booking records
* invoices
* payment references
* DAC7 data
* contracts
* support tickets
* operator documents
* expired verification documents
* security logs
* analytics

Do not implement:

account deleted

↓

DELETE everything

Financial/legal records may need to remain for statutory reasons.

Instead:

privacy deletion request

↓

determine legal retention

↓

delete/anonymize data that no longer needs to be retained

↓

retain only legally justified records.

---

# 59. DATA SUBJECT RIGHTS

The system/process must support GDPR rights where applicable, including:

* access
* rectification
* erasure
* restriction
* portability
* objection

A future admin/privacy workflow should track these requests.

Do not rely on manual email searches forever.

---

# 60. MARKETING VS TRANSACTIONAL EMAIL

Transactional communication:

* booking confirmation
* cancellation
* payment
* operational reminder

must be separated conceptually from:

marketing communication.

Marketing consent/preferences must not be bundled into mandatory booking acceptance where consent is the chosen legal basis.

"Accept Terms"

and:

"Receive marketing offers"

must not be the same mandatory checkbox.

---

# 61. COOKIE AND TRACKING CONSENT

Boatly plans to use analytics services such as PostHog.

Before activating non-essential tracking, the applicable cookie/ePrivacy/GDPR rules must be followed.

Initial safe architecture:

First visit

↓

technical/necessary storage only

↓

consent interface

↓

user chooses categories

↓

only permitted non-essential tracking starts

The exact classification of each tool must be reviewed based on the final configuration.

---

# 62. COOKIE BANNER

Where consent is required, the interface should support:

* accept
* reject/continue without non-essential tracking
* granular preferences
* policy link
* later modification/revocation

Closing the banner must not secretly equal consent to non-essential tracking.

Avoid:

* preselected marketing options
* dark patterns
* forced consent without legally valid reason

---

# 63. CONSENT RECORDS

Consent decisions must be demonstrable.

Store sufficient information to prove:

* consent choice
* timestamp
* policy/configuration version
* categories accepted

Do not store more personal information than necessary solely to prove consent.

---

# 64. THIRD-PARTY PRIVACY REVIEW

Before production, Boatly must review the privacy/data-processing role of each provider.

Planned providers include:

* Supabase
* Vercel
* Stripe
* Mapbox
* Resend
* Sentry
* PostHog

Review:

* data processing terms
* processing locations
* subprocessors
* international transfers
* retention
* security
* controller/processor role

Required contractual agreements must be executed before processing real user data where applicable.

---

# 65. DATA BREACH

Boatly needs a documented data-breach procedure.

Possible flow:

Security incident

↓

Contain

↓

Assess affected personal data

↓

Record incident

↓

Risk assessment

↓

Determine authority-notification requirement

↓

Where required, notify Garante without undue delay and where possible within the applicable 72-hour period

↓

Where high risk requires it, communicate with affected individuals

↓

Remediate

Every personal-data breach must be documented even where notification is not required.

---

# 66. DPIA

Before production, Boatly should perform a documented DPIA screening.

If processing is likely to present a high risk under GDPR criteria, a full Data Protection Impact Assessment must be completed before the relevant processing begins.

The decision:

"DPIA required / not required"

must be documented.

Do not assume it is automatically unnecessary because Boatly is a startup.

---

# 67. DPO

Boatly must determine whether appointment of a Data Protection Officer is legally required based on its actual processing.

Do not automatically appoint one in the product requirements.

Do not automatically assume one is unnecessary.

This depends on the GDPR criteria and actual scale/nature of processing.

---

# 68. SECURITY REQUIREMENTS

GDPR and general platform risk require appropriate technical and organizational security.

Architecture already includes:

* RLS
* role-based access
* tenant isolation
* private document storage
* audit logs
* server-side authorization
* secret management
* monitoring
* backups
* controlled financial operations

Before production also define:

* incident response
* access review
* credential rotation
* staff access policy
* backup recovery tests
* processor security review

---

# 69. PAYMENT REGULATION — RED BLOCKER

Boatly must avoid becoming an unlicensed payment service provider.

The platform must NOT build its own system where:

Customer money

↓

Boatly ordinary bank account

↓

Boatly later manually transfers money to operator.

The planned architecture instead uses:

Stripe Connect

as the regulated payment infrastructure.

However:

using Stripe does not by itself resolve every legal question about Boatly's contractual/payment role.

---

# 70. PSD2 / PAYMENT MODEL REVIEW

Before real payments launch, payment/legal counsel must validate:

* who legally receives payment
* whether Boatly acts on behalf of operator
* whether Boatly acts for both sides
* commercial-agent analysis
* Connect charge type
* payout timing
* refund authority
* disputes
* settlement
* platform liability

EU payment guidance makes clear that an e-commerce platform is not automatically outside payment regulation simply because a customer's payment to the platform settles the customer's debt to the seller.

The actual contractual model matters.

---

# 71. NO CUSTOM WALLET / ESCROW

MVP must NOT include:

* Boatly wallet
* customer stored cash balance
* operator stored-money wallet
* custom escrow account
* manual pooled funds account

unless separately designed and legally approved.

Use regulated payment-provider functionality instead.

---

# 72. STRIPE CONNECT LEGAL ALIGNMENT

The selected Stripe Connect configuration must match:

* Boatly legal role
* operator contract
* customer terms
* refunds
* commissions
* settlement
* invoicing

Technical convenience must not determine the legal structure.

The final Connect charge model is therefore still subject to A9 legal validation and the later payment phase.

---

# 73. PAYOUT TIMING

A8 proposed approximately:

24 hours after rental completion

as a commercial target.

This is NOT yet a legal/technical promise.

Before production the payout policy must consider:

* Stripe capabilities
* contractual entitlement to funds
* cancellation
* chargebacks
* disputes
* fraud
* operator insolvency
* consumer rights

Final policy must appear in Operator Terms.

---

# 74. DAC7 — IMPORTANT TAX PLATFORM REQUIREMENT

EU DAC7 reporting covers digital-platform activity including:

rental of any mode of transport.

Boatly's marketplace therefore has a strong likelihood of falling within DAC7 platform reporting rules.

A tax adviser must confirm Boatly's exact reporting status and Italian implementation requirements before real marketplace activity.

This is a major compliance requirement.

---

# 75. DAC7 SELLER DATA

Operator onboarding must be capable of collecting information required for tax reporting.

Exact fields must be mapped by an accountant/tax adviser.

Possible categories include:

* legal identity
* legal address
* country of residence
* TIN/tax identifier
* VAT number where applicable
* business registration information
* legal entity information
* seller verification information

Do not hardcode incomplete DAC7 requirements without professional review.

---

# 76. DAC7 TRANSACTION DATA

Boatly must be able to reconstruct/report marketplace activity per seller and reporting period.

Data may need to include categories such as:

* consideration paid/credited to operator
* transaction count
* fees charged by Boatly
* commissions
* taxes withheld/charged where applicable
* quarterly totals
* seller identity

Marketplace bookings must therefore remain historically traceable.

---

# 77. DAC7 DEADLINES

DAC7 uses annual platform reporting with information concerning the relevant reporting year.

EU rules provide for reporting by the end of January following the relevant calendar year.

Boatly cannot attempt to reconstruct this data after the fact from incomplete analytics.

The production database must be DAC7-ready from the first reportable marketplace transaction.

---

# 78. TAX / ACCOUNTING MODEL — RED BLOCKER

Before launch, an Italian accountant experienced in marketplaces/e-commerce must determine:

* who invoices the rental customer
* who issues the fiscal document
* whether operator invoices/receipts customer
* how Boatly invoices its commission
* VAT treatment of Boatly commission
* VAT treatment of SaaS subscriptions
* payment-processing cost treatment
* refunds
* deposit accounting
* cross-border customer implications
* foreign operator implications
* DAC7

Do not let Stripe receipts substitute for legally required fiscal documents.

---

# 79. TARGET INVOICING MODEL

The provisional model to validate is:

Rental Operator

↓

provides rental service

↓

customer fiscal document/invoice responsibility according to operator's tax regime

and:

Boatly

↓

provides marketplace/SaaS service to Operator

↓

Boatly invoices commission/subscription to Operator

This model must be confirmed after the nautical mediation/payment-role review.

If Boatly's contractual role changes, invoicing may also change.

---

# 80. ELECTRONIC INVOICING

Italian invoicing requirements, including the Sistema di Interscambio where applicable, must be respected.

Boatly should not initially build an entire tax-invoicing engine unless necessary.

Possible MVP:

* accounting integration/manual export
* invoice provider integration
* external certified invoicing solution

Decision after accountant review.

---

# 81. SECURITY DEPOSIT

The security deposit requires separate legal/payment design.

It must not be treated as ordinary rental revenue.

Future models may include:

* Stripe-supported authorization where suitable
* operator-managed deposit
* other approved mechanism

Checkout must clearly explain:

* amount
* collection method
* release conditions
* damage claims
* dispute process

Do not implement deposit logic before payment/legal review.

---

# 82. DAMAGE CLAIMS

A real rental operation may require damage handling.

Future workflow may need:

* pre-rental condition
* post-rental condition
* photos
* operator damage report
* customer notification
* deposit claim
* dispute
* evidence

This is not mandatory for the earliest marketplace MVP but must be considered before Boatly offers an integrated deposit/damage guarantee.

---

# 83. ACCESSIBILITY

Boatly is an e-commerce service.

The European Accessibility Act framework has applied to covered services since 28 June 2025.

Italian rules provide an exemption for microenterprises providing services where the statutory criteria are met.

Boatly's legal status must therefore be checked at launch and as the company grows.

Do not hardcode:

"Boatly is exempt forever."

---

# 84. ACCESSIBILITY PRODUCT PRINCIPLE

Regardless of whether a temporary microenterprise exemption applies, Boatly should be designed accessibly from the start.

Requirements include engineering toward:

* keyboard navigation
* semantic HTML
* accessible forms
* visible focus
* sufficient contrast
* screen-reader compatibility
* accessible errors
* readable checkout
* accessible authentication

The map must have a usable list-based alternative.

---

# 85. ACCESSIBILITY STATUS REVIEW

Before production:

1. identify Boatly company size/status;
2. determine whether legal exemption applies;
3. document assessment;
4. implement legally required accessibility information/processes;
5. re-evaluate if business size changes.

---

# 86. ADR — CONSUMER DISPUTES

Boatly must define a consumer complaint/dispute process.

The final Terms/Support pages should contain any mandatory ADR information applicable to Boatly and/or operators.

Legal counsel must determine the relevant entities/procedures based on the final contractual structure.

---

# 87. DO NOT ADD OLD EU ODR LINK

The former European Online Dispute Resolution platform was discontinued on 20 July 2025.

Boatly must therefore NOT copy outdated e-commerce Terms templates that still contain the old ODR-platform link.

Use only the dispute-resolution disclosures legally applicable at launch.

---

# 88. SUPPORT AND COMPLAINTS

Boatly must support distinct issue categories.

Examples:

* booking issue
* cancellation
* refund
* payment
* operator complaint
* safety issue
* illegal listing
* privacy request
* review complaint

Every serious complaint should have:

* reference
* status
* responsible team
* timestamps
* decision/history

---

# 89. LEGAL PAGES — REQUIRED ARCHITECTURE

Final public legal pages should include or evaluate:

* Terms & Conditions — Customers
* Privacy Policy
* Cookie Policy
* Cookie Preferences
* Cancellation Policy
* Review Policy
* Marketplace/Ranking Transparency
* Accessibility information where required
* Complaints/Dispute Resolution information

Operator-specific:

* Operator Terms
* Commission/Pricing Terms
* Payment/Payout Terms
* Operator Data/Privacy information
* Publication/Compliance Rules

Exact page structure will be approved legally.

---

# 90. ADDITIONAL ROUTES DISCOVERED DURING A9

Future sitemap reconciliation should evaluate routes such as:

/trasparenza-ranking

/segnala

/reclami

/accessibilita

/legal/operatori

The exact final URLs can change.

Do NOT modify SITEMAP.md yet.

These changes will be included in the Phase A reconciliation.

---

# 91. LEGAL DOCUMENT DATABASE — REQUIRED FUTURE ADDITION

A5 must later be extended with:

legal_document_versions

Potential fields:

* id
* document_type
* version
* locale
* effective_from
* effective_to
* storage_path/content_reference
* content_hash
* status
* created_at

Examples:

CUSTOMER_TERMS
OPERATOR_TERMS
PRIVACY_NOTICE
CANCELLATION_TERMS
REVIEW_POLICY

---

# 92. LEGAL ACCEPTANCES — REQUIRED FUTURE ADDITION

Future table:

legal_acceptances

Potential fields:

* id
* user_id
* operator_id nullable
* booking_id nullable
* legal_document_version_id
* accepted_at
* acceptance_context
* locale
* evidence_metadata

This allows Boatly to prove:

which terms

were accepted

by whom

and when.

---

# 93. BOOKING CONTRACTS — REQUIRED FUTURE ADDITION

Future table:

booking_contracts

Potential fields:

* id
* booking_id
* contract_type
* contract_version
* legal_parties_snapshot
* generated_at
* storage_path
* file_hash
* customer_accepted_at
* operator_accepted_at nullable
* status

A generated contract becomes historical evidence.

---

# 94. CONTRACT TYPE — REQUIRED DATABASE CHANGE

Current bookings must later receive a field/snapshot such as:

rental_contract_type

Potential values:

* LOCAZIONE
* LOCAZIONE_WITH_COMMANDER
* NOLEGGIO

Exact enum names will be chosen during reconciliation.

The legal type must not be inferred after the booking has happened.

---

# 95. BOAT LEGAL OFFERING — REQUIRED FUTURE CHANGE

A boat may not necessarily support every contractual model.

Future configuration should identify which legally validated offering types the operator is permitted to sell for that boat.

Example:

Boat A

✓ LOCAZIONE

✗ NOLEGGIO

or:

Boat B

✓ NOLEGGIO

✓ specific commander configuration

This must be driven by legal/operator compliance.

---

# 96. LICENCE DATA — REQUIRED DATABASE CHANGE

Replace the idea that:

license_required BOOLEAN

is the complete legal model.

The database will need enough technical/legal data to determine licence eligibility.

Likely additions include:

* engine_power_kw
* engine_displacement_cc
* engine configuration/type
* applicable navigation limits
* relevant legal classification

The exact schema change will be designed during Phase A reconciliation.

---

# 97. OPERATOR LEGAL/TAX PROFILE — REQUIRED ADDITION

Future operator data must distinguish:

PUBLIC PROFILE

from:

LEGAL/TAX PROFILE.

Potential future entity:

operator_legal_profiles

or equivalent normalized fields.

Information may include:

* registered legal name
* legal form
* registered address
* country
* VAT
* TIN
* company registration number
* registry
* tax residence
* DAC7 status
* verification status

Exact fields require tax/legal mapping.

---

# 98. DAC7 DATA MODEL — REQUIRED ADDITION

A dedicated tax-reporting model will likely be preferable to modifying ordinary operator records forever.

Possible entities:

dac7_seller_profiles

dac7_reporting_periods

dac7_reportable_transactions

dac7_reports

Exact design will be completed after accountant validation.

---

# 99. CONTENT REPORTS — REQUIRED ADDITION

Future table:

content_reports

Possible fields:

* id
* reporter_user_id nullable
* resource_type
* resource_id
* report_reason
* description
* status
* assigned_admin_id
* created_at
* resolved_at

---

# 100. MODERATION DECISIONS — REQUIRED ADDITION

Future table:

moderation_decisions

Possible fields:

* id
* report_id nullable
* resource_type
* resource_id
* action
* reason
* moderator_user_id
* created_at

This creates a transparent moderation history.

---

# 101. PRIVACY REQUESTS — FUTURE ADMIN ADDITION

Future table/workflow:

privacy_requests

Types:

* ACCESS
* RECTIFICATION
* ERASURE
* PORTABILITY
* RESTRICTION
* OBJECTION

States:

* RECEIVED
* VERIFYING_IDENTITY
* IN_PROGRESS
* COMPLETED
* REJECTED_WITH_REASON

Exact implementation can follow later.

---

# 102. DATA BREACH REGISTER — ORGANIZATIONAL/TECHNICAL ADDITION

Boatly must maintain a breach record.

This can initially be an internal controlled process rather than a customer-facing feature.

Possible information:

* incident date
* discovery date
* affected systems
* affected data
* affected individuals
* risk analysis
* authority notification
* user communication
* remediation
* closure

---

# 103. COMPLIANCE REQUIREMENTS ENGINE

Long-term, Boatly should avoid hardcoding every legal document requirement directly into boat forms.

Potential architecture:

compliance_requirement

configured by:

* jurisdiction
* location
* operator type
* boat type
* contractual offering

Example:

Italy
+
Professional operator
+
Noleggio
+
Specific boat class

↓

Required documents checklist

This does not need to be fully dynamic in MVP but the architecture should allow it.

---

# 104. OPERATOR PUBLICATION GATE

Before an operator can receive marketplace bookings:

OPERATOR APPROVED

AND

required legal/tax data complete

AND

payment onboarding complete where required

AND

relevant compliance documents valid

↓

operator eligible for marketplace.

---

# 105. BOAT PUBLICATION GATE

Before a boat is bookable:

OPERATOR eligible

AND

boat information complete

AND

legally valid offering type selected

AND

required documents valid

AND

insurance valid

AND

pricing configured

AND

availability configured

AND

Boatly moderation approved where required

↓

PUBLISHED / BOOKABLE.

---

# 106. BOOKING LEGAL GATE

Before payment:

Boat still legally eligible

AND

operator still eligible

AND

required documents valid

AND

contract type valid

AND

customer eligibility validated where needed

AND

pre-contract information shown

AND

terms version available

AND

cancellation/withdrawal treatment known

↓

payment may proceed.

---

# 107. COMPLIANCE EXPIRATION

A document expiring must not produce silent invalid inventory.

System:

scheduled compliance check

↓

document expiring

↓

warning

↓

document expired

↓

evaluate affected:

operator
boat
contract type

↓

restrict future bookings where necessary

↓

notify operator/admin

Existing confirmed bookings:

must enter a resolution workflow rather than disappear.

---

# 108. AUDIT REQUIREMENTS

In addition to existing audit requirements, record sensitive compliance actions such as:

* operator verification
* legal document approval
* insurance approval
* boat compliance approval
* licence/commander qualification verification
* account suspension
* marketplace delisting
* terms version changes
* exceptional refund
* compliance override

---

# 109. PROHIBITED PRODUCT CLAIMS

Do not automatically claim:

"All boats are legally certified by Boatly."

"Boatly guarantees every operator."

"Every boat is completely safe."

"Every skipper is certified."

unless the actual verification process supports those statements.

Prefer precise language.

Example:

"Identity verified"

only if identity verification was actually performed.

---

# 110. LEGAL TEXT GENERATION WITH AI

AI can assist in drafting internal versions of:

* Terms
* Privacy Policy
* operator agreement
* cancellation terms

BUT:

AI-generated legal texts must NOT be published as final production terms without professional review.

Legal documents must reflect:

* actual company identity
* actual payment model
* actual mediation role
* actual tax model
* actual service architecture

Generic templates are insufficient.

---

# 111. PROFESSIONAL REVIEW — NAUTICAL LAW

Before paid marketplace launch, consult a professional experienced in:

Italian recreational boating / maritime law.

Questions:

1. Does Boatly qualify as mediatore del diporto?
2. What SCIA/professional requirements apply?
3. Can Boatly's proposed commission structure be used?
4. Exact distinction between locazione/noleggio on Boatly.
5. Implementation of Article 42-bis.
6. Contract-form requirements.
7. Onboard-document requirements.
8. Operator commercial-use documentation.
9. Insurance requirements.
10. Commander/skipper qualification.
11. Foreign vessels/operators.
12. Foreign customer licences.
13. Local maritime compliance.

---

# 112. PROFESSIONAL REVIEW — MARKETPLACE/CONSUMER

Consult an e-commerce/platform lawyer regarding:

* Customer Terms
* Operator Terms
* Consumer Code
* withdrawal-right treatment
* marketplace information
* ranking disclosure
* P2B
* DSA
* reviews
* moderation
* ADR
* operator suspension
* limitation of liability
* unfair terms
* contractual responsibility split

---

# 113. PROFESSIONAL REVIEW — PAYMENTS

Consult payment/legal specialist and validate with Stripe:

* PSD2 model
* commercial-agent model
* Connect configuration
* recipient/payee structure
* merchant responsibilities
* refunds
* disputes
* payout timing
* deposit handling

No custom wallet/escrow before this review.

---

# 114. PROFESSIONAL REVIEW — TAX

Consult Italian accountant/tax adviser regarding:

* company tax setup
* invoices
* customer fiscal documents
* Boatly commission invoices
* SaaS invoices
* VAT
* Stripe accounting
* refunds
* deposits
* DAC7
* retention
* foreign expansion

---

# 115. PROFESSIONAL REVIEW — PRIVACY

Before production, complete:

* controller-role analysis
* privacy notices
* processor contracts
* cookie/tracker audit
* consent architecture
* retention
* rights procedure
* DPIA screening
* security/breach process
* international-transfer review

---

# 116. RED — PRODUCTION LAUNCH BLOCKERS

Boatly must NOT accept real paid marketplace bookings until these are resolved.

## RED 1

Mediatore del diporto classification and any required professional/SCIA/registration obligations.

## RED 2

Final legal contract model:

* locazione
* locazione with commander
* noleggio

and parties/responsibilities.

## RED 3

Payment/PSD2/Stripe Connect legal structure.

## RED 4

Tax/invoicing/DAC7 model.

## RED 5

Final professionally reviewed Customer Terms and Operator Terms.

## RED 6

Consumer withdrawal/cancellation legal treatment.

## RED 7

Required operator/boat/insurance/commercial-use compliance documentation.

## RED 8

Privacy notices, processor arrangements and required cookie consent implementation.

---

# 117. YELLOW — MUST BE COMPLETED BEFORE PUBLIC PRODUCTION

* GDPR processing inventory
* retention schedule
* DPIA assessment
* data-breach process
* DSA applicability assessment
* P2B implementation
* ranking transparency
* content reporting
* accessibility status assessment
* review policy
* complaint/ADR procedure
* compliance expiration process
* regulatory monitoring process

---

# 118. GREEN — CURRENT ARCHITECTURE IS ALREADY ALIGNED

Existing Boatly decisions that support compliance well:

* professional operators only
* operator verification
* boat moderation
* document storage
* document expiration
* immutable booking snapshots
* immutable price snapshots
* commission snapshots
* audit logs
* role separation
* RLS architecture
* private documents
* verified-booking reviews
* server-side pricing
* server-side availability
* Stripe webhook verification
* Stripe Connect instead of custom fund handling
* manual booking source separation
* customer/operator data isolation

These decisions should remain.

---

# 119. PHASE A RECONCILIATION REQUIRED

A9 has discovered legitimate changes to our earlier architecture.

Therefore:

DO NOT start visual design immediately after A9.

After A9 is closed, Boatly needs one controlled Phase A reconciliation pass.

We will update affected specifications so they all agree.

Expected updates include:

DATABASE_SCHEMA.md

because of:

* legal contracts
* licence eligibility
* operator tax/legal profile
* DAC7
* legal versions/acceptance
* content reports

SITEMAP.md

because of:

* ranking transparency
* reports
* accessibility
* complaints

USER_FLOWS.md

because of:

* legal booking gate
* contract generation
* compliance expiration
* reports

USER_STORIES.md

where necessary.

ARCHITECTURE.md

for contract storage/compliance flows if required.

No existing document should be manually patched before the reconciliation step.

---

# 120. LEGAL REGULATORY MONITORING

Boatly operates in areas where rules can change.

Monitor periodically:

* Italian recreational boating law
* MIT regulations
* Capitaneria/local rules
* consumer law
* DSA
* P2B
* GDPR/ePrivacy
* payment regulation
* Stripe requirements
* DAC7/tax
* accessibility

Store:

last compliance review date.

A platform cannot rely indefinitely on a legal analysis performed at launch.

---

# 121. INITIAL LEGAL REFERENCES

Primary legal frameworks to verify and maintain include:

ITALIAN NAUTICAL LAW

* Legislative Decree 18 July 2005 No. 171 — Codice della nautica da diporto
* Law 7 May 2026 No. 70
* relevant implementing regulations and maritime rules

CONSUMER / E-COMMERCE

* Legislative Decree 6 September 2005 No. 206 — Codice del Consumo
* Legislative Decree 70/2003 — electronic commerce framework where applicable
* EU consumer-rights legislation
* Regulation (EU) 2019/1150 — Platform-to-Business
* Regulation (EU) 2022/2065 — Digital Services Act

PRIVACY

* Regulation (EU) 2016/679 — GDPR
* Italian Privacy Code
* Italian Data Protection Authority guidance
* ePrivacy/cookie framework

PAYMENTS

* PSD2 / applicable Italian implementation
* Italian payment-services regulatory framework
* Stripe Connect contractual framework

TAX

* Directive (EU) 2021/514 — DAC7
* Italian DAC7 implementing rules
* Italian VAT/invoicing rules

ACCESSIBILITY

* Directive (EU) 2019/882
* Legislative Decree 82/2022
* AgID guidance

This list is a planning reference, not an exhaustive legal register.

---

# 122. A9 FINAL LEGAL PRODUCT PRINCIPLES

1. Boatly launches with professional operators only.

2. Generic "skipper/no skipper" is not the legal contract model.

3. Locazione, locazione with prescribed commander and noleggio must be distinguished.

4. Mediatore del diporto classification is a pre-launch blocker.

5. Boat publication requires real compliance evidence.

6. Licence eligibility cannot be calculated from horsepower alone.

7. Final customer terms must identify the actual contractual supplier.

8. Mandatory consumer rights override commercial cancellation policies.

9. Customer must know the final total and payment obligation before paying.

10. Booking contracts/terms must be versioned and historically preserved.

11. Operator Terms must support marketplace/P2B requirements.

12. Ranking must be transparent.

13. Reviews must be genuinely verifiable.

14. GDPR compliance is built into architecture.

15. Non-essential tracking is controlled by the applicable consent regime.

16. Boatly does not create an unlicensed custom payment/wallet system.

17. Stripe Connect payment architecture must match Boatly's legal role.

18. DAC7 readiness exists from the first reportable transaction.

19. Tax documents and Stripe payment receipts are treated separately.

20. Accessibility is designed from the beginning.

21. Old EU ODR links must not be used.

22. Sensitive compliance/admin actions are auditable.

23. Regulatory status must be periodically reviewed.

---

# 123. A9 COMPLETION CRITERIA

A9 is complete when Boatly has identified product requirements concerning:

* professional operator scope
* nautical mediation
* locazione
* noleggio
* locazione with commander
* written contracts
* contract versioning
* onboard documentation
* operator verification
* boat commercial eligibility
* insurance
* safety/documentation
* boating licence eligibility
* foreign licences
* skipper/commander qualifications
* passenger limits
* customer contracting age
* Consumer Code
* pre-contract information
* payment-obligation checkout
* right of withdrawal
* cancellations
* weather
* P2B
* ranking transparency
* operator suspension
* DSA
* trader traceability
* content reporting
* moderation
* reviews
* GDPR
* privacy notices
* retention
* user rights
* marketing consent
* cookie/tracking consent
* processors
* breaches
* DPIA
* DPO assessment
* payment regulation
* PSD2
* Stripe Connect
* DAC7
* taxation
* invoicing
* security deposits
* accessibility
* ADR
* support/complaints
* legal document versioning
* legal acceptance evidence
* compliance expiration
* legal launch blockers

Final legal documents and final marketplace launch authorization remain subject to professional validation.
