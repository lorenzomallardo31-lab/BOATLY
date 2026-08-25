# BOATLY — ADMIN UI

**Version:** 1.0
**Status:** Phase B — High-Fidelity Admin Workspace Specification
**Product area:** Boatly Internal Back Office
**Primary language:** Italian
**Design system:** DESIGN_SYSTEM.md
**Wireframe source:** WIREFRAMES.md
**Permissions source:** ROLES_PERMISSIONS.md

---

# 1. PURPOSE

This document defines the high-fidelity UI and interaction specification for the internal Boatly Admin workspace.

It covers:

* admin shell
* platform navigation
* role-aware UI
* admin dashboard
* users
* operators
* operator verification
* boats
* boat verification
* bookings
* payments
* refunds
* payouts
* commissions
* plans
* subscriptions
* documents
* compliance
* reviews
* content reports
* support
* privacy requests
* DAC7 workflows
* audit logs
* platform configuration
* legal document versioning
* safety confirmations
* investigation patterns
* admin-specific states
* accessibility
* responsive behavior
* reusable component inventory

The Admin product must optimize for:

**accuracy**

*

**traceability**

*

**speed of investigation**

*

**safe decisions**

*

**least privilege**.

---

# 2. ADMIN PRODUCT OBJECTIVE

An authorized Boatly team member should be able to answer quickly:

* What needs action now?
* Which operators are waiting for verification?
* Which boats are waiting for review?
* Which documents have expired?
* Which payments are inconsistent?
* Which refunds are pending?
* Which content reports are open?
* Which privacy requests are unresolved?
* Which DAC7 records are incomplete?
* Who changed a sensitive platform setting?

---

# 3. ADMIN EXPERIENCE PRINCIPLE

Operator workspace is:

operation-first.

Admin workspace is:

**queue-first**

*

**exception-first**

*

**state-first**.

The Admin dashboard should prioritize pending work and anomalies before vanity metrics.

---

# 4. ADMIN VISUAL PERSONALITY

Admin should feel:

* serious
* calm
* highly structured
* neutral
* professional
* trustworthy
* information-dense without becoming chaotic

Brand remains Boatly.

Use:

```text
Navy
+
White
+
Light neutral surfaces
+
Aqua for navigation/interaction
+
Semantic colors only for meaning
```

Lifestyle photography is almost absent.

---

# 5. ADMIN DESIGN NON-NEGOTIABLES

Do NOT create:

* giant colorful analytics dashboard
* gradients in every KPI
* playful illustrations for serious workflows
* giant cards instead of useful tables
* hidden action history
* direct editable payment states
* direct editable compliance approvals without workflow
* buttons that bypass confirmation
* unrestricted admin interface identical for all platform roles
* raw database interfaces exposed to staff
* dangerous actions hidden in icon-only menus without labels

---

# 6. ADMIN SHELL — DESKTOP

```text
┌──────────────────┬─────────────────────────────────────────────┐
│                  │ TOPBAR                                      │
│ BOATLY ADMIN     ├─────────────────────────────────────────────┤
│                  │                                             │
│ Dashboard        │ PAGE HEADER                                 │
│ Utenti           │                                             │
│ Noleggiatori     │ PAGE CONTENT                                │
│ Barche           │                                             │
│ Prenotazioni     │                                             │
│                  │                                             │
│ Pagamenti        │                                             │
│ Rimborsi         │                                             │
│ Payout           │                                             │
│ Commissioni      │                                             │
│                  │                                             │
│ Documenti        │                                             │
│ Compliance       │                                             │
│ Segnalazioni     │                                             │
│ Recensioni       │                                             │
│                  │                                             │
│ DAC7             │                                             │
│ Privacy          │                                             │
│ Supporto         │                                             │
│ Audit log        │                                             │
│                  │                                             │
│ Impostazioni     │                                             │
└──────────────────┴─────────────────────────────────────────────┘
```

---

# 7. ADMIN SIDEBAR WIDTH

Desktop:

approximately 264px.

Same structural family as operator sidebar.

Admin must still be immediately identifiable as internal workspace.

---

# 8. ADMIN SIDEBAR BACKGROUND

Preferred:

Navy 950.

Slightly deeper than operator workspace if useful.

Foreground:

white / white-muted.

---

# 9. ADMIN BRAND LABEL

Top:

Boatly logo.

Below or alongside:

`Admin`

Small restrained label.

Example:

```text
Boatly
ADMIN
```

Do not create a separate unrelated logo.

---

# 10. ADMIN NAVIGATION GROUPS

Group sidebar logically.

## Platform

* Dashboard
* Utenti
* Noleggiatori
* Barche
* Prenotazioni

## Finanza

* Pagamenti
* Rimborsi
* Payout
* Commissioni
* Piani

## Trust & Compliance

* Documenti
* Compliance
* Segnalazioni
* Recensioni

## Platform Operations

* DAC7
* Privacy
* Supporto
* Audit log
* Impostazioni

---

# 11. ROLE-AWARE NAVIGATION

Admin navigation is permission-aware.

Example:

MODERATOR should not see:

* payout
* commissions
* sensitive tax areas

FINANCE should not automatically see:

* content moderation tools
* unrelated private compliance evidence

COMPLIANCE should not automatically receive refund controls.

Hidden UI does not replace server authorization.

---

# 12. ADMIN TOPBAR

Height:

68px.

Contains:

left:

optional environment indicator.

Right:

* notifications
* help/internal documentation future
* admin account

---

# 13. ENVIRONMENT INDICATOR

Very useful outside production.

Example:

`DEVELOPMENT`

`PREVIEW`

No unnecessary production badge.

In non-production use clearly visible but restrained indicator.

Purpose:

reduce accidental test/production confusion.

---

# 14. ADMIN USER MENU

Shows:

name

platform roles.

Menu:

* Profilo
* Sicurezza
* Esci

Potential role display:

`FINANCE`

`COMPLIANCE`.

---

# 15. ADMIN PAGE CANVAS

Background:

very light cool/warm neutral.

Cards/tables:

white.

Admin can be slightly cooler visually than marketplace.

Avoid beige editorial surfaces.

---

# 16. ADMIN PAGE HEADER

Structure:

```text
Breadcrumb optional

PAGE TITLE                         PRIMARY ACTION
Supporting context                 Secondary controls
```

---

# 17. ADMIN PAGE TITLE

28–32px.

Weight:

650–700.

Navy.

---

# 18. ADMIN BREADCRUMBS

Use frequently for deep investigations.

Example:

```text
Noleggiatori
/
Mario Boat Rental
/
Verifica
```

---

# 19. ADMIN DASHBOARD OBJECTIVE

The Admin dashboard answers:

> What needs intervention today?

Not:

> How large does Boatly look?

---

# 20. ADMIN DASHBOARD TOP QUEUES

Primary cards:

* Noleggiatori da verificare
* Barche da verificare
* Problemi compliance
* Problemi pagamento

Potential fifth only if genuinely important:

* Segnalazioni aperte

---

# 21. QUEUE CARD

White.

Radius:

16px.

Border.

Contains:

label

count

oldest pending age where useful

CTA.

Example:

```text
Noleggiatori da verificare

12

3 da oltre 48h

[Vedi coda]
```

Do not promise service-level deadlines unless formally defined.

---

# 22. QUEUE PRIORITY

Cards may have small semantic top indicator.

Do not fill entire card red.

Example:

warning icon

`4 urgenti`.

---

# 23. DASHBOARD SECONDARY METRICS

Below queues:

* Prenotazioni oggi
* Marketplace GMV period
* Operator marketplace eligible
* Published boats

Useful but secondary.

---

# 24. ADMIN ACTION FEED

Potential section:

`Attività recente`.

Show important audited platform actions:

* operator approved
* operator suspended
* refund initiated
* boat rejected
* commission changed

Do not expose every insignificant internal update.

---

# 25. ADMIN ALERT PANEL

For platform-level operational incidents.

Examples:

* Stripe reconciliation anomalies
* failed scheduled compliance job
* high number of failed webhooks
* incomplete DAC7 seller data

Only show actionable incidents.

---

# 26. ADMIN EMPTY INITIAL STATE

In early pilot with no pending queues:

```text
Nessuna attività urgente

Le nuove verifiche, segnalazioni e anomalie appariranno qui.
```

Do not show fake operational activity.

---

# 27. USERS PAGE OBJECTIVE

Allow authorized staff to:

* find user
* understand account state
* understand operator memberships
* understand platform role if permitted
* investigate support/security issue

without exposing unnecessary personal data.

---

# 28. USERS PAGE HEADER

Title:

`Utenti`.

Search prominent.

Filters:

* account status
* platform role
* registration date

---

# 29. USER SEARCH

Search by:

* name
* email
* internal user ID where allowed

Placeholder:

`Cerca nome o email`.

---

# 30. USERS TABLE

Columns:

* Utente
* Email
* Data registrazione
* Stato
* Membership operator
* Ruolo piattaforma
* Azioni

Only show role columns to authorized staff.

---

# 31. USER STATUS

Customer-facing internal labels:

* Attivo
* Sospeso
* Da verificare if relevant
* Disattivato

Avoid raw auth provider terminology.

---

# 32. USER DETAIL HEADER

```text
← Utenti

Lorenzo Rossi

lorenzo@example.com

ATTIVO
```

Actions on right according to permissions.

---

# 33. USER DETAIL SECTIONS

* Profilo
* Stato account
* Membership operator
* Ruoli piattaforma
* Prenotazioni summary
* Supporto
* Audit relevant activity

Sensitive information shown only where role requires it.

---

# 34. PLATFORM ROLE MANAGEMENT

SUPER_ADMIN only by default.

UI should clearly distinguish:

operator role

from:

platform role.

Never show one combined role dropdown.

---

# 35. PLATFORM ROLE ASSIGNMENT

Requires:

* role selection
* explicit confirmation
* reason where policy requires
* audit

Example:

```text
Assegna ruolo FINANCE a Luca Bianchi?
```

Not:

`Save`.

---

# 36. USER SUSPENSION

Authorized admin only.

Before action show:

* user
* operator memberships
* upcoming bookings where relevant
* reason field
* impact summary

CTA:

`Sospendi utente`.

---

# 37. USER SUSPENSION WARNING

Avoid generic:

`Sei sicuro?`

Use:

> L'utente perderà l'accesso al proprio account. Le prenotazioni e lo storico resteranno memorizzati.

Exact impact based on implementation.

---

# 38. OPERATOR PAGE OBJECTIVE

Admin must quickly understand:

* onboarding status
* legal profile completeness
* compliance
* Stripe readiness
* fleet
* marketplace eligibility
* risk/action state

---

# 39. OPERATORS LIST

Tabs:

* Da verificare
* Approvati
* Azione richiesta
* Sospesi
* Rifiutati

---

# 40. OPERATOR FILTERS

* status
* marketplace eligibility
* compliance
* payment onboarding
* location
* registration date

Search:

name/legal name/VAT where authorized.

---

# 41. OPERATORS TABLE

Columns:

* Noleggiatore
* Ragione sociale
* Sedi
* Barche
* Verifica
* Compliance
* Pagamenti
* Marketplace
* Ultimo aggiornamento
* Azioni

---

# 42. OPERATOR MARKETPLACE STATUS

Distinct from operator account status.

Examples:

* Attivo
* Bloccato
* Non ancora attivo

Do not combine everything into one badge.

---

# 43. OPERATOR DETAIL HEADER

```text
Mario Boat Rental

APPROVATO
Marketplace: ATTIVO

Pozzuoli · 12 barche
```

Actions:

scope/role dependent.

---

# 44. OPERATOR DETAIL NAVIGATION

Sections:

* Panoramica
* Verifica
* Dati legali
* Sedi
* Flotta
* Documenti
* Compliance
* Pagamenti
* Piano
* Audit

Sensitive tabs permission-aware.

---

# 45. OPERATOR OVERVIEW

Summary cards:

* Marketplace
* Compliance
* Payment onboarding
* Fleet publication

Then:

* recent bookings
* recent admin actions
* current issues

---

# 46. OPERATOR VERIFICATION OBJECTIVE

Reviewer should not need to jump between many screens.

Preferred:

one review workspace with sections.

---

# 47. OPERATOR VERIFICATION LAYOUT

Desktop:

```text
┌──────────────────────────────────────┬──────────────────────┐
│                                      │ REVIEW PANEL         │
│ Business information                 │                      │
│ Legal/tax data                       │ Stato                │
│ Locations                            │ Issues               │
│ Documents                            │                      │
│ Stripe readiness                     │ Note interne         │
│ Compliance                           │                      │
│                                      │ [Richiedi correzione]│
│                                      │ [Rifiuta]            │
│                                      │ [Approva]            │
└──────────────────────────────────────┴──────────────────────┘
```

Main approximately 70%.

Decision panel approximately 30%.

---

# 48. VERIFICATION SECTION STATUS

Each review section:

* Completo
* Incompleto
* Richiede verifica
* Non applicabile where supported

---

# 49. VERIFICATION CHECKLIST

Example:

```text
✓ Dati aziendali
✓ Sede principale
! Documento assicurativo
✓ Pagamenti configurati
```

Checklist is reviewer aid.

Final eligibility still follows business logic.

---

# 50. INTERNAL REVIEW NOTES

Dedicated field.

Clearly:

`Note interne Boatly`.

Never customer/operator-visible accidentally.

---

# 51. REQUEST CORRECTION

Dialog:

* select affected requirements
* write clear operator-facing message
* optional internal note
* confirm

CTA:

`Invia richiesta di correzione`.

---

# 52. REJECT OPERATOR

Requires:

reason

impact explanation

confirmation.

Danger action.

---

# 53. APPROVE OPERATOR

Requires final review summary.

CTA:

`Approva noleggiatore`.

Success:

status updates.

Audit event.

Operator notification.

---

# 54. OPERATOR SUSPENSION

High-risk workflow.

Before suspension show:

* future confirmed bookings
* active rentals
* pending refunds
* payouts
* compliance issues

Requires:

reason

confirmation.

---

# 55. SUSPENSION IMPACT UI

Example:

```text
Impatto

Nuove prenotazioni marketplace
Verranno bloccate

Prenotazioni confermate
12 da gestire

Noleggi in corso
1
```

Exact behavior from product rules.

---

# 56. BOATS LIST OBJECTIVE

Admin needs to:

* review pending listings
* inspect published inventory
* find compliance issues
* investigate reports

---

# 57. BOATS LIST TABS

* Da verificare
* Pubblicate
* Azione richiesta
* In pausa
* Rifiutate
* Archiviate

---

# 58. BOAT FILTERS

* operator
* location
* boat type
* publication status
* legal offering
* compliance
* document status

---

# 59. BOATS TABLE

Columns:

* Barca
* Noleggiatore
* Sede
* Tipo
* Offerta legale
* Compliance
* Stato pubblicazione
* Aggiornamento
* Azione

---

# 60. BOAT THUMBNAIL

48–56px.

Useful for recognition.

Not visually dominant.

---

# 61. BOAT DETAIL HEADER

Boat name.

Operator.

Location.

Publication badge.

Compliance badge.

Potential public preview action.

---

# 62. BOAT ADMIN NAV

Sections:

* Anteprima
* Specifiche
* Motore
* Offerta legale
* Foto
* Prezzi summary
* Documenti
* Compliance
* Verifica
* Audit

---

# 63. BOAT VERIFICATION WORKSPACE

Same structural pattern as operator verification.

Main:

listing/data review.

Right:

decision panel.

---

# 64. BOAT LISTING PREVIEW

Reviewer should see customer-facing preview.

Display:

* gallery
* public description
* specs
* amenities
* location
* public policies

Avoid requiring reviewer to imagine final marketplace output from database fields.

---

# 65. BOAT TECHNICAL REVIEW

Structured groups:

* capacity
* dimensions
* engine
* navigation
* relevant legal configuration

Do not present raw JSON.

---

# 66. LEGAL OFFERING REVIEW

Each offering card:

contract type

operator configuration

required driver/commander

status

supporting requirements

review action.

---

# 67. LEGAL OFFERING DECISION

COMPLIANCE authorized.

Possible:

* Approva
* Richiedi modifica
* Rifiuta
* Sospendi

Reason required where negative.

---

# 68. BOAT PHOTO REVIEW

Grid.

Ability to inspect fullscreen.

Moderation action where applicable.

Do not allow compliance staff to accidentally edit listing photos unless role allows.

---

# 69. BOAT VERIFICATION DECISION PANEL

Displays:

* completeness
* compliance
* legal offering
* public content
* blocking issues

Buttons:

`Richiedi modifiche`

`Rifiuta`

`Approva`.

---

# 70. BOAT SUSPENSION

Existing bookings impact must be checked.

Use same high-risk workflow principles as operator suspension.

---

# 71. BOOKINGS ADMIN OBJECTIVE

Allow authorized staff to reconstruct the full booking story.

---

# 72. BOOKINGS ADMIN SEARCH

Search by:

* booking code
* customer
* operator
* boat
* payment provider reference if permitted

---

# 73. BOOKINGS FILTERS

* date
* source
* status
* operator
* boat
* location
* payment status
* cancellation state

---

# 74. ADMIN BOOKINGS TABLE

Columns:

* Codice
* Cliente
* Operatore
* Barca
* Data
* Fonte
* Stato
* Pagamento
* Totale
* Azione

---

# 75. BOOKING ADMIN DETAIL HEADER

```text
BT-2026-AB12CD

CONFERMATA
BOATLY

Mario Rossi
Mario Boat Rental
Blue Wave 21
```

---

# 76. BOOKING ADMIN DETAIL LAYOUT

Sections:

* Booking
* Customer
* Operator
* Boat
* Occupancy
* Payment
* Refund
* Commission
* Contract
* Booking events
* Admin audit activity

---

# 77. BOOKING INTERNAL DATA

Present structured data.

Not raw database dump.

Advanced technical IDs can live in collapsible:

`Dati tecnici`.

---

# 78. BOOKING OCCUPANCY PANEL

Show:

boat

start/end

occupancy type

status

hold history where relevant.

Useful for investigating overlap issues.

---

# 79. BOOKING EVENT TIMELINE

Show domain event history.

Example:

* booking draft created
* hold created
* payment started
* payment confirmed
* booking confirmed
* skipper assigned
* completed

---

# 80. BOOKING VS AUDIT HISTORY

Separate tabs/sections.

Booking events:

transaction lifecycle.

Audit:

staff administrative actions.

Never merge them visually.

---

# 81. ADMIN BOOKING INTERVENTION

Only allowed actions based on role/state.

Examples:

* exceptional cancellation
* support resolution
* permitted refund initiation

No generic:

`Edit booking`.

---

# 82. EXCEPTIONAL CANCELLATION

High-risk.

Requires:

* reason
* customer/operator impact
* refund effect
* occupancy effect
* explicit confirmation
* audit

CTA:

`Annulla prenotazione come Boatly`.

---

# 83. PAYMENTS ADMIN OBJECTIVE

Finance must be able to compare:

internal state

vs

provider state.

---

# 84. PAYMENTS PAGE HEADER

`Pagamenti`

Main metric cards:

* Pagati
* In elaborazione
* Falliti
* Da riconciliare

Period filter.

---

# 85. PAYMENT FILTERS

* provider state
* internal state
* reconciliation status
* operator
* date
* amount
* booking

---

# 86. PAYMENTS TABLE

Columns:

* Payment ID
* Booking
* Operator
* Customer amount
* Commission
* Internal status
* Provider status
* Reconciliation
* Date
* Action

---

# 87. RECONCILIATION STATUS

Examples:

* Allineato
* Da verificare
* Errore
* In elaborazione

Separate from payment status.

---

# 88. PAYMENT DETAIL LAYOUT

```text
Booking

Internal payment

Stripe / provider

Commission

Refunds

Events

Reconciliation
```

---

# 89. PROVIDER DATA PANEL

Structured fields:

* payment intent
* charge
* connected account
* amount
* currency
* provider status
* timestamps

Sensitive unnecessary data hidden.

---

# 90. RECONCILIATION COMPARISON

Highly useful visual:

```text
                 Boatly        Provider

Amount           €460          €460        ✓
Currency         EUR           EUR         ✓
Payment          PAID          succeeded   ✓
Refund           €0            €0          ✓
```

Mismatch:

warning row.

---

# 91. PAYMENT MISMATCH

Example:

```text
Stato non allineato

Boatly:
Pagamento in verifica

Stripe:
Pagamento riuscito
```

CTA according to authorized reconciliation workflow.

Never:

`Segna come pagato`.

---

# 92. INVALID PROVIDER REFERENCE

Show safe technical alert.

Allow investigation.

Do not fabricate relationship.

---

# 93. STRIPE EVENTS PANEL

Timeline/table:

event type

provider event ID

received

processing state

error.

---

# 94. REFUNDS PAGE OBJECTIVE

Finance should understand:

* why
* amount
* provider state
* actor
* booking impact

---

# 95. REFUNDS TABLE

Columns:

* Refund
* Booking
* Customer
* Operator
* Amount
* Reason
* Status
* Initiated by
* Date

---

# 96. REFUND DETAIL

Panels:

* booking
* payment
* requested amount
* refund reason
* provider reference
* status
* initiated actor
* audit

---

# 97. CREATE ADMIN REFUND

Only authorized.

Flow:

1. select permitted amount
2. reason
3. show customer/operator economic impact
4. show provider request
5. explicit confirmation

---

# 98. REFUND CONFIRMATION

Example:

```text
Conferma rimborso

Cliente:
€460

Importo da rimborsare:
€120

La prenotazione passerà a:
PARZIALMENTE RIMBORSATA

[Rimborsa €120]
```

Exact booking state according to domain logic.

---

# 99. REFUND SUCCESS

Do not immediately claim completed if provider is processing.

Use:

`Rimborso richiesto`

or:

`Rimborso completato`

according to actual state.

---

# 100. PAYOUTS ADMIN

Finance-focused.

Columns:

* payout
* operator
* amount
* status
* created
* expected arrival
* provider reference

---

# 101. PAYOUT DETAIL

Show:

operator

provider account

amount

status

related period/bookings where available

provider timestamps.

No manual Boatly-wallet metaphor.

---

# 102. COMMISSIONS PAGE OBJECTIVE

Allow controlled future commission configuration while protecting booking history.

---

# 103. COMMISSION RULES TABLE

Columns:

* Scope
* Operator
* Commission
* Fixed component
* Valid from
* Valid until
* Status
* Created by
* Action

---

# 104. COMMISSION CREATE

Fields:

* scope
* operator if specific
* percentage
* fixed amount optional
* currency
* effective date
* expiration optional

---

# 105. COMMISSION WARNING

Before create/change:

> La nuova regola verrà applicata solo alle prenotazioni future secondo le regole di efficacia. Le prenotazioni già confermate mantengono la propria commissione salvata.

---

# 106. COMMISSION BASIS POINT UI

Never ask staff to type:

`1500 basis points`.

UI asks:

`15%`.

Server converts.

---

# 107. COMMISSION CHANGE AUDIT

Every commission change:

actor

before

after

effective date

reason.

---

# 108. PLANS PAGE

Admin plan catalogue:

* Founding
* Starter
* Pro
* Business
* Enterprise

Show:

monthly fee

commission

limits

features

active/inactive.

---

# 109. PLAN EDITING

Highly restricted.

If plan definition changes:

show affected operators.

Avoid changing current booked economics retroactively.

---

# 110. OPERATOR SUBSCRIPTIONS PAGE

Columns:

* operator
* plan
* status
* start
* current period
* provider billing status
* pilot/manual assignment

---

# 111. PILOT PLAN ASSIGNMENT

Authorized admin can assign:

`Founding Operator`.

Dialog:

operator

plan

effective date

optional end.

Reason/notes.

---

# 112. DOCUMENTS ADMIN OBJECTIVE

Create efficient verification queue across:

* operator
* boat
* skipper

---

# 113. DOCUMENT QUEUE TABS

* Da verificare
* In revisione
* Approvati
* Rifiutati
* In scadenza
* Scaduti

---

# 114. DOCUMENT FILTERS

* scope
* operator
* boat
* skipper
* document type
* expiration
* reviewer

---

# 115. DOCUMENTS TABLE

Columns:

* Entity
* Scope
* Document
* Status
* Valid until
* Submitted
* Reviewer
* Action

---

# 116. DOCUMENT REVIEW WORKSPACE

Left:

document preview.

Right:

metadata + decision.

Desktop target:

approximately 65 / 35 split.

---

# 117. DOCUMENT PREVIEW

PDF/image preview where supported.

Controls:

zoom

download/open secured version according to permission.

Do not expose public direct file URLs.

---

# 118. DOCUMENT METADATA

* owner/entity
* document type
* submitted
* valid from
* expiration
* prior versions
* related compliance requirement

---

# 119. DOCUMENT REVIEW ACTIONS

* Approva
* Rifiuta
* Richiedi sostituzione where workflow supports

Negative action requires reason.

---

# 120. DOCUMENT APPROVAL

Confirmation can be lightweight but explicit.

If approval affects marketplace eligibility, show impact.

---

# 121. DOCUMENT REJECTION

Reason must be specific enough to help operator correct issue.

Example:

> La data di scadenza del documento non è leggibile.

Not:

> Documento errato.

---

# 122. DOCUMENT EXPIRY VIEW

Admin can filter next:

* 7 days
* 30 days
* 60 days

Useful for proactive compliance work.

---

# 123. COMPLIANCE ADMIN OBJECTIVE

Compliance is not only a document queue.

It answers:

* which requirement exists?
* for which entity?
* is it satisfied?
* what blocks marketplace?
* what expires next?

---

# 124. COMPLIANCE DASHBOARD

Top summary:

* Marketplace blocked operators
* Boats blocked
* Missing requirements
* Expiring requirements
* Items awaiting review

---

# 125. COMPLIANCE WORK QUEUES

Tabs:

* Operatori
* Barche
* Skipper
* Offerte legali
* Scadenze

---

# 126. COMPLIANCE ENTITY ROW

Example:

```text
Blue Wave 21
Mario Boat Rental

Marketplace:
BLOCCATA

Issues:
1

Next expiry:
12 Sep
```

---

# 127. COMPLIANCE ENTITY DETAIL

Sections:

* requirements
* documents
* reviews
* expiry
* overrides
* history

---

# 128. COMPLIANCE REQUIREMENT ROW

Columns:

* requirement
* status
* evidence
* valid until
* blocking impact
* reviewer
* action

---

# 129. BLOCKING IMPACT

Clear label:

* Informativo
* Richiede revisione
* Blocca pubblicazione
* Blocca nuove prenotazioni

Exact values follow business rules.

---

# 130. COMPLIANCE OVERRIDE

Exceptionally restricted.

If supported:

must require:

* authorized role
* reason
* start/end or validity
* impact
* audit

Danger/warning treatment.

---

# 131. COMPLIANCE OVERRIDE WARNING

> Un override modifica temporaneamente il normale risultato dei controlli di compliance.

Never one-click.

---

# 132. LEGAL OFFERING QUEUE

COMPLIANCE view for:

* Locazione
* Locazione con comandante
* Noleggio

Only internal labels/spec-approved values.

Reviewer sees:

boat

operator

configuration

evidence

status

decision.

---

# 133. REVIEWS ADMIN OBJECTIVE

Moderate content without undermining review trust.

---

# 134. REVIEWS ADMIN TABS

* Segnalate
* In revisione
* Pubblicate
* Limitate/Nascoste where applicable

---

# 135. REVIEWS TABLE

Columns:

* Rating
* Boat
* Operator
* Customer
* Booking proof
* Report count
* Status
* Date
* Action

---

# 136. REVIEW DETAIL

Show:

review content

booking relationship

report reason

prior moderation

decision panel.

---

# 137. REVIEW MODERATION ACTIONS

Possible:

* Nessuna violazione
* Nascondi/Rimuovi according to policy
* Other policy-driven action

Reason mandatory for moderation action.

---

# 138. REVIEW NEGATIVITY

UI must never suggest negative rating alone is reason for removal.

Do not provide:

`Remove because bad review`.

---

# 139. CONTENT REPORTS OBJECTIVE

Moderators need prioritized queue.

---

# 140. CONTENT REPORT DASHBOARD

Counts:

* Open
* Under review
* Action required
* Closed today/period secondary

---

# 141. REPORT FILTERS

* reason
* resource type
* operator
* assigned moderator
* status
* date

---

# 142. REPORTS TABLE

Columns:

* Reason
* Resource
* Reporter
* Created
* Priority
* Assigned
* Status
* Action

---

# 143. REPORT DETAIL

Layout:

left:

reported content/context.

middle/main:

report information.

right:

decision panel.

---

# 144. REPORT CONTENT PREVIEW

If listing:

listing preview.

If review:

review.

If operator:

public operator profile.

Never expose unrelated private information.

---

# 145. REPORT DECISION

Possible workflow:

* No violation
* Hide/restrict resource
* Request correction
* Escalate
* Other policy-approved action

Reason mandatory.

---

# 146. MODERATION HISTORY

Visible timeline of:

reports

actions

reinstatement where applicable.

---

# 147. DAC7 ADMIN OBJECTIVE

This UI supports tax-reporting readiness and workflow.

It must not pretend to replace professional tax/legal validation.

---

# 148. DAC7 DASHBOARD

Primary selector:

reporting year.

Summary:

* Sellers
* Ready
* Missing data
* Reportable transactions
* Report status

---

# 149. DAC7 SELLER READINESS

Table:

* Operator
* Legal identity
* Tax residence
* TIN
* VAT
* Transactions
* Consideration
* Readiness
* Action

Fields depend on final validated implementation.

---

# 150. DAC7 READINESS STATUS

* Completo
* Dati mancanti
* Da verificare
* Escluso/non reportable only when formally determined

Do not infer legal exclusion casually in UI.

---

# 151. DAC7 OPERATOR DETAIL

Sections:

* seller identity
* tax identifiers
* reporting history
* reportable transactions
* missing data
* validation notes

---

# 152. DAC7 TRANSACTIONS

Table:

* booking
* quarter
* consideration
* Boatly fees
* taxes if applicable
* transaction status

---

# 153. DAC7 REPORTING PERIOD

Workflow states might include:

* Preparazione
* Revisione
* Pronto
* Presentato
* Correzione richiesta

Final implementation based on validated process.

---

# 154. DAC7 REPORT GENERATION

Admin should not have one dangerous:

`Send to tax authority`

button unless actual secure submission integration exists and is professionally validated.

MVP can produce review/export workflow.

---

# 155. DAC7 HISTORY

Immutable records for generated/submitted reports.

Show:

date

actor

file/reference

status.

---

# 156. PRIVACY ADMIN OBJECTIVE

Support structured user-rights workflow without accidental deletion of legally retained data.

---

# 157. PRIVACY REQUEST QUEUE

Tabs:

* Open
* Identity verification
* In progress
* Completed
* Rejected/limited where legally justified

---

# 158. PRIVACY TABLE

Columns:

* User
* Request type
* Submitted
* Identity status
* Assigned
* Status
* Due context where formally tracked
* Action

---

# 159. PRIVACY REQUEST DETAIL

Sections:

* request
* user
* identity verification
* relevant datasets
* retention constraints
* actions
* notes
* resolution

---

# 160. PRIVACY REQUEST TYPES

UI labels:

* Accesso ai dati
* Rettifica
* Cancellazione
* Portabilità
* Limitazione
* Opposizione

---

# 161. PRIVACY DELETION WARNING

Never give staff generic button:

`Delete user and all data`.

The UI must make clear:

some records may need retention.

Use controlled privacy workflow.

---

# 162. PRIVACY ACTION LOG

Every meaningful action:

actor

time

decision

data area/action.

---

# 163. SUPPORT ADMIN OBJECTIVE

Give support context without unnecessary data access.

---

# 164. SUPPORT QUEUE

Filters:

* category
* priority
* status
* assigned
* booking/payment linked

---

# 165. SUPPORT TABLE

Columns:

* Ticket
* User/Operator
* Category
* Linked booking
* Priority
* Assigned
* Status
* Updated

---

# 166. SUPPORT DETAIL

Left/main:

conversation/ticket.

Right:

context panel:

user

operator

booking

payment

only where relevant.

---

# 167. SUPPORT QUICK LINKS

Contextual:

`Apri prenotazione`

`Apri pagamento`

`Apri noleggiatore`.

Avoid duplicating all information inside support ticket.

---

# 168. SUPPORT PERMISSIONS

Support sees minimum necessary.

Sensitive:

tax

payout bank data

private compliance

hidden unless role allows.

---

# 169. AUDIT LOG OBJECTIVE

Answer:

**Who did what, to what, when?**

---

# 170. AUDIT LOG TABLE

Columns:

* Timestamp
* Actor
* Role
* Action
* Resource
* Operator context
* Result/context
* Detail

---

# 171. AUDIT FILTERS

* actor
* action
* resource type
* operator
* date
* role

---

# 172. AUDIT SEARCH

Can search:

resource ID

booking code

operator

actor.

---

# 173. AUDIT DETAIL DRAWER

Shows:

* actor
* role
* action
* resource
* timestamp
* before
* after
* metadata

Structured JSON can be available in advanced section if truly needed.

---

# 174. AUDIT BEFORE / AFTER

Human-readable diff preferred.

Example:

```text
Commissione

Prima:
10%

Dopo:
8%
```

Not giant JSON blob by default.

---

# 175. AUDIT IMMUTABILITY UI

No edit/delete button.

No inline editing.

---

# 176. PLATFORM SETTINGS OBJECTIVE

Central configuration should be highly restricted and safe.

---

# 177. ADMIN SETTINGS SECTIONS

Potential:

* Marketplace
* Reference data
* Legal document versions
* Compliance requirements
* Notifications
* Feature/configuration
* Other future platform settings

---

# 178. MARKETPLACE SETTINGS

Potential configuration:

* enabled destinations
* reference categories
* search defaults
* feature flags when supported

Do not move core domain rules into arbitrary editable settings.

---

# 179. REFERENCE DATA

Examples:

* Boat types
* Amenities
* standardized extra categories future
* destination data

CRUD carefully.

Archive rather than hard delete where historical references exist.

---

# 180. LEGAL DOCUMENT VERSIONS

Restricted platform workflow.

List:

* document type
* locale
* version
* effective date
* status

---

# 181. LEGAL VERSION DETAIL

Show:

title

version

locale

file/content reference

hash

effective date

past acceptance count where useful.

---

# 182. CREATE LEGAL VERSION

Workflow:

1. upload/create draft
2. define type/version/locale
3. review
4. set effective date
5. activate according to approved legal process

Do not overwrite previous version.

---

# 183. LEGAL VERSION ACTIVATION

High-risk.

Confirmation:

> Attivare questa versione non modifica le accettazioni o i contratti storici.

Audit.

---

# 184. COMPLIANCE REQUIREMENTS CONFIGURATION

Restricted to appropriate platform roles.

Fields conceptually:

* requirement
* scope
* jurisdiction
* boat type
* contract type
* required document
* blocking level
* validity

---

# 185. COMPLIANCE CONFIG WARNING

Changing a requirement can affect marketplace eligibility.

Before activation show:

* potentially impacted operators
* boats
* skippers

if calculable.

---

# 186. PLATFORM NOTIFICATIONS SETTINGS

Manage templates/configuration where appropriate.

Do not provide raw email HTML textarea as default UX.

---

# 187. ADMIN NOTIFICATIONS

Internal notification center may include:

* verification queue
* payment anomaly
* compliance issue
* report assigned
* privacy request

---

# 188. ROLE-SPECIFIC DASHBOARD

Future refinement:

FINANCE dashboard emphasis:

payments/refunds/reconciliation.

COMPLIANCE:

verification/compliance.

MODERATOR:

reports/reviews.

But MVP can use one dashboard with role-aware modules.

---

# 189. SUPER_ADMIN SAFETY

SUPER_ADMIN actions must not feel routine.

Examples:

* platform role changes
* sensitive platform settings
* global commission rules

Require stronger confirmations/audit.

---

# 190. ADMIN SEARCH

Potential global search later.

Could search:

* booking
* operator
* user
* boat

Not necessary to build immediately.

---

# 191. ADMIN TABLE DESIGN

More data-dense than operator.

Default row height:

48–52px.

Header:

12–13px / 600.

Body:

13–14px.

---

# 192. TABLE COLUMN PRIORITY

Do not show 18 columns.

Choose main operational fields.

Additional information:

detail drawer/page.

---

# 193. TABLE STICKY HEADER

Useful for long review/finance queues.

---

# 194. TABLE COLUMN CUSTOMIZATION

Not MVP.

Do not build configurable enterprise grid prematurely.

---

# 195. TABLE SORTING

Only sortable columns where meaningful.

Show active sort clearly.

---

# 196. TABLE PAGINATION

Server-side.

Default target:

25 rows.

Potential:

25 / 50 / 100 for Admin if performance allows.

---

# 197. ADMIN FILTER BAR

Pattern:

```text
[Search................] [Status] [Type] [Date] [More filters]

                                               [Reset]
```

---

# 198. FILTER STATE

Active filter count visible.

URL query state where safe/useful.

No sensitive information in URLs.

---

# 199. SAVED ADMIN VIEWS

Future.

Not MVP.

---

# 200. SIDE DRAWERS

Admin uses drawers for:

* audit detail
* payment quick view
* report preview
* document metadata

Complex decisions remain full-page/workspace.

---

# 201. DIALOGS

Use for:

* confirmation
* short reason form
* role assignment
* refund confirmation
* suspension confirmation

---

# 202. MULTI-STEP HIGH-RISK ACTION

For highly consequential action:

1. initiate
2. show impact
3. reason
4. final confirmation

Examples:

* operator suspension
* exceptional refund
* platform role assignment

---

# 203. CONFIRMATION INPUT

For extremely dangerous actions, future pattern may require typed confirmation.

Example:

type operator name.

Do not overuse.

Potential for:

* destructive global configuration
* severe account actions

not everyday workflow.

---

# 204. ADMIN STATUS LANGUAGE

Never expose raw enum when a human label exists.

Examples:

`PENDING_VERIFICATION`

→ `Da verificare`

`REQUIRES_REVIEW`

→ `Richiede verifica`

`PAYMENT_FAILED`

→ `Pagamento fallito`.

---

# 205. TECHNICAL STATUS PANEL

For advanced investigation, raw provider/internal value may be shown underneath human label.

Example:

```text
Pagamento riuscito

Provider status:
succeeded
```

---

# 206. ADMIN ERROR COPY

Specific.

Example:

> Non siamo riusciti a caricare i dati del pagamento da Stripe.

CTA:

`Riprova`.

Not:

`Integration error`.

---

# 207. SAFE FAILURE

If provider unavailable:

do not let admin guess/update state.

Show:

`Verifica provider non disponibile`.

Preserve internal state.

---

# 208. PERMISSION DENIED

Admin role without access:

```text
Accesso non autorizzato

Il tuo ruolo non include questa sezione.
```

Do not display sensitive preview behind disabled overlay.

---

# 209. RESOURCE NOT FOUND

Use:

`Elemento non disponibile`

instead of leaking unnecessary data.

---

# 210. LOADING

Admin pages:

header first.

Then:

table/card skeleton.

Avoid blocking entire admin shell.

---

# 211. PAYMENT LOADING

Provider comparison panel can load independently.

Internal booking data remains usable.

---

# 212. EMPTY QUEUE

Example:

```text
Nessun noleggiatore da verificare

Le nuove richieste appariranno qui.
```

Positive but restrained.

---

# 213. EMPTY PAYMENT ANOMALIES

```text
Nessuna anomalia da riconciliare
```

Can use small success icon.

---

# 214. EMPTY CONTENT REPORTS

```text
Nessuna segnalazione aperta
```

---

# 215. ADMIN MOBILE PRINCIPLE

Admin is primarily desktop.

Mobile is secondary.

It must remain usable for:

* viewing urgent queue
* simple inspection
* low-risk decisions if allowed
* support lookup

Complex finance/compliance verification should prefer desktop.

---

# 216. ADMIN TABLE MOBILE

Do not squeeze.

Convert to:

cards / compact rows.

Important fields only.

---

# 217. ADMIN MOBILE NAV

Sidebar becomes drawer.

No bottom nav required by default because Admin has too many sections.

---

# 218. ADMIN MOBILE DASHBOARD

Show:

urgent queues

notifications

critical anomalies.

Hide complex secondary metrics first.

---

# 219. MOBILE HIGH-RISK ACTIONS

Can be disabled or require more deliberate interaction if screen context is insufficient.

Do not prioritize exceptional refunds from 375px UI.

---

# 220. ADMIN ACCESSIBILITY

Admin must meet same accessibility goals as rest of Boatly.

Especially important:

* tables
* forms
* status indicators
* dialogs
* document review
* keyboard use

---

# 221. TABLE ACCESSIBILITY

Use semantic table structure.

Sortable headers announce sort.

Row action menus keyboard accessible.

---

# 222. REVIEW WORKSPACE ACCESSIBILITY

Document/listing preview cannot be only visual source of information.

Important metadata available as text.

---

# 223. COLOR ACCESSIBILITY

Compliance/payment state uses:

color

*

badge text

*

icon where useful.

---

# 224. AUDIT DIFF ACCESSIBILITY

Changes described in text.

Not color-only red/green diff.

---

# 225. ADMIN MICROCOPY PRINCIPLE

Tone:

precise

neutral

unambiguous.

---

# 226. GOOD ADMIN COPY

Good:

`Noleggiatore approvato`

`Documento rifiutato`

`Pagamento da riconciliare`

`Rimborso in elaborazione`

`Marketplace bloccato`

---

# 227. BAD ADMIN COPY

Avoid:

`Oops!`

`Something went wrong!`

`Compliance fail`

`User banned`

when a more precise operational term exists.

---

# 228. ADMIN ACTION LABELS

Preferred:

* Approva noleggiatore
* Richiedi correzione
* Rifiuta documento
* Sospendi noleggiatore
* Avvia rimborso
* Approva barca
* Chiudi segnalazione
* Assegna ruolo
* Attiva versione
* Esporta report

Avoid:

`OK`

`Go`

`Process`.

---

# 229. INTERNAL NOTES

Every internal-note field clearly labeled:

`Nota interna Boatly`

and visually separated from customer/operator-facing communication.

---

# 230. EXTERNAL MESSAGE PREVIEW

When sending correction/rejection to operator:

show:

`Messaggio al noleggiatore`.

Never mix with internal note.

---

# 231. DECISION SUMMARY

Before final verification decision show concise summary:

```text
Decisione

Operatore:
Mario Boat Rental

Risultato:
Approva

Requisiti:
12/12 completati
```

---

# 232. ADMIN COMPONENT INVENTORY

Reusable components should include:

```text
AdminShell
AdminSidebar
AdminTopbar
AdminPageHeader
AdminBreadcrumbs

AdminQueueCard
AdminMetricCard
AdminAlertPanel
AdminActivityFeed

AdminFilterBar
AdminSearchInput
AdminTable
AdminPagination
AdminStatusBadge
AdminActionMenu

UserTable
UserDetail
PlatformRoleBadge
PlatformRoleDialog
UserSuspensionDialog

OperatorTable
OperatorOverview
OperatorVerificationWorkspace
VerificationChecklist
VerificationDecisionPanel
OperatorSuspensionDialog

BoatTable
BoatAdminDetail
BoatVerificationWorkspace
BoatListingPreview
LegalOfferingReviewCard

AdminBookingTable
AdminBookingDetail
OccupancyPanel
BookingEventTimeline
AdminBookingActionPanel

PaymentTable
PaymentDetail
ProviderStatePanel
ReconciliationComparison
StripeEventTable

RefundTable
RefundDetail
RefundDialog

PayoutTable
PayoutDetail

CommissionRuleTable
CommissionRuleForm
CommissionImpactWarning

PlanAdminCard
SubscriptionAdminTable
PilotPlanAssignmentDialog

DocumentQueue
DocumentPreview
DocumentMetadataPanel
DocumentDecisionPanel

ComplianceQueue
ComplianceEntitySummary
ComplianceRequirementTable
ComplianceOverrideDialog
LegalOfferingQueue

ReviewModerationQueue
ReviewModerationDetail

ContentReportQueue
ContentReportDetail
ModerationDecisionPanel

DAC7Dashboard
DAC7SellerTable
DAC7SellerDetail
DAC7TransactionTable
DAC7ReportingPeriodPanel

PrivacyRequestQueue
PrivacyRequestDetail
PrivacyActionLog

SupportQueue
SupportTicketDetail
SupportContextPanel

AuditTable
AuditDetailDrawer
AuditDiff

PlatformSettingsNav
ReferenceDataTable
LegalDocumentVersions
LegalDocumentVersionDetail
ComplianceRequirementEditor

AdminEmptyState
AdminErrorState
AdminLoadingSkeleton
PermissionDeniedState
HighRiskConfirmationDialog
InternalNoteField
ExternalMessageField
```

---

# 233. REUSE RULE

All Admin list pages should share:

* header pattern
* search
* filter system
* status components
* pagination
* row actions

Do not invent unrelated table systems for:

operators

boats

payments

documents.

---

# 234. DECISION WORKSPACE PATTERN

Verification/review screens should reuse:

```text
MAIN EVIDENCE
+
DECISION PANEL
```

Examples:

operator verification

boat verification

document review

content moderation.

---

# 235. INVESTIGATION PATTERN

Financial/support screens reuse:

```text
INTERNAL STATE
+
EXTERNAL/RELATED STATE
+
HISTORY
+
CONTROLLED ACTION
```

---

# 236. ADMIN QUALITY BAR

The Admin product should feel like a professional internal operations tool that prevents staff mistakes.

The interface should make unsafe actions harder than safe inspection.

---

# 237. DASHBOARD QUALITY CHECK

Dashboard should answer:

* what needs attention?
* how urgent?
* where do I go?

within seconds.

---

# 238. OPERATOR VERIFICATION QUALITY CHECK

Reviewer should answer:

* who is this business?
* what's missing?
* are payments ready?
* is compliance ready?
* can I approve?

without opening five unrelated pages.

---

# 239. BOAT VERIFICATION QUALITY CHECK

Reviewer should answer:

* what will customer see?
* technical data complete?
* offering approved?
* compliance complete?
* publication allowed?

---

# 240. PAYMENT QUALITY CHECK

Finance should answer:

* what does Boatly think?
* what does Stripe/provider think?
* do amounts match?
* refund?
* commission?
* is there an anomaly?

---

# 241. COMPLIANCE QUALITY CHECK

Reviewer should answer:

* requirement?
* evidence?
* state?
* expiry?
* marketplace impact?
* next action?

---

# 242. MODERATION QUALITY CHECK

Moderator should answer:

* what was reported?
* why?
* what content?
* prior history?
* what policy-based action can be taken?

---

# 243. AUDIT QUALITY CHECK

Investigator should answer:

* who?
* what?
* when?
* old value?
* new value?
* resource?

---

# 244. ADMIN UI ANTI-PATTERNS

Avoid:

* editing raw database rows
* editable payment status dropdown
* editable refund `SUCCEEDED`
* unlogged admin override
* giant all-powerful `Edit operator`
* role checks only in frontend
* raw JSON as main interface
* hidden decision reasons
* red everywhere
* approval via tiny icon with no confirmation
* mixing internal notes with customer communication
* deleting historical financial/legal records
* displaying all customer PII to every admin role
* mobile layouts that expose unsafe actions casually

---

# 245. CORE ADMIN OPERATIONS FLOW

Operator verification:

```text
PENDING OPERATOR
↓
REVIEW
↓
ISSUES
↓
CORRECTION
or
APPROVE
↓
AUDIT
```

Boat publication:

```text
PENDING BOAT
↓
CONTENT
↓
TECHNICAL
↓
LEGAL OFFERING
↓
COMPLIANCE
↓
APPROVE
↓
PUBLISH
```

Financial investigation:

```text
BOOKING
↓
INTERNAL PAYMENT
↓
PROVIDER PAYMENT
↓
REFUNDS
↓
RECONCILIATION
↓
RESOLUTION
```

Moderation:

```text
REPORT
↓
CONTENT
↓
CONTEXT
↓
DECISION
↓
REASON
↓
AUDIT
```

---

# 246. ADMIN SAFETY PRINCIPLE

The Admin interface must follow:

**READ EASILY**

but

**CHANGE DELIBERATELY**.

Viewing data should be fast.

Changing sensitive state should require:

* correct permission
* correct workflow
* context
* reason
* confirmation
* audit.

---

# 247. B6 FINAL CHARACTER

Boatly Admin should feel:

**Structured like professional operations software.**

**Safe like financial software.**

**Traceable like compliance software.**

**Clear like modern SaaS.**

Without becoming:

old enterprise software.

---

# 248. B6 COMPLETION CRITERIA

B6 is complete when Boatly has high-fidelity specifications for:

* admin shell
* sidebar
* role-aware navigation
* topbar
* admin dashboard
* operational queues
* users
* user detail
* user suspension
* platform roles
* operators
* operator detail
* operator verification
* correction request
* operator approval/rejection
* operator suspension
* boats
* boat verification
* listing preview
* legal offering review
* boat suspension
* bookings
* booking detail
* occupancy
* booking events
* admin cancellation
* payments
* provider comparison
* reconciliation
* Stripe events
* refunds
* refund creation
* payouts
* commissions
* commission changes
* plans
* subscriptions
* pilot assignment
* documents
* document review
* expiration management
* compliance
* compliance queues
* compliance requirement review
* overrides
* legal offering queue
* reviews
* moderation
* content reports
* moderation decisions
* DAC7 dashboard
* seller readiness
* transactions
* reporting periods
* privacy requests
* retention-aware workflows
* support
* audit logs
* settings
* legal document versions
* compliance configuration
* loading
* empty
* errors
* permission states
* high-risk confirmations
* accessibility
* responsive/admin mobile intent
* reusable Admin components
* quality and safety gates
