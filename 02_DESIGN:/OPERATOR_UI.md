# BOATLY — OPERATOR UI

**Version:** 1.0
**Status:** Phase B — High-Fidelity Operator Workspace Specification
**Product area:** B2B Operator SaaS
**Primary language:** Italian
**Design system:** DESIGN_SYSTEM.md
**Wireframe source:** WIREFRAMES.md

---

# 1. PURPOSE

This document defines the high-fidelity UI and interaction specification for the Boatly professional operator workspace.

It covers:

* operator navigation
* workspace switcher
* dashboard
* fleet calendar
* booking list
* manual booking creation
* booking detail
* rental operations
* fleet list
* boat management
* pricing
* extras
* availability
* locations
* CRM
* staff
* skippers
* documents
* compliance
* payments
* payouts
* commercial plan
* analytics
* reviews
* contracts
* notifications
* business profile
* settings
* empty/loading/error states
* operator-specific microcopy
* operational mobile intent
* reusable component inventory

The operator UI must prioritize:

speed

*

clarity

*

operational control.

---

# 2. OPERATOR PRODUCT OBJECTIVE

The operator should be able to answer immediately:

* What is happening today?
* Which boats are busy?
* What is available?
* What bookings are arriving?
* Is there a conflict?
* Which customer is coming?
* Who is the skipper?
* Has the customer paid?
* What documents need attention?
* What must I do next?

---

# 3. OPERATOR EXPERIENCE PRINCIPLE

The marketplace is:

discovery-first.

The operator product is:

**operation-first.**

The operator should not need to navigate through decorative dashboards before reaching:

* calendar
* bookings
* fleet
* customers.

---

# 4. OPERATOR VISUAL PERSONALITY

Use Boatly brand consistently while increasing information density.

Core visual combination:

```text
Deep Navy sidebar
+
Warm/light main canvas
+
White operational surfaces
+
Aqua interaction accents
+
Semantic status colors
+
Geist Sans
```

Photography is secondary.

Data and actions are primary.

---

# 5. OPERATOR DESIGN NON-NEGOTIABLES

The operator UI must NOT become:

* generic admin template
* dark enterprise dashboard
* giant KPI wall
* spreadsheet clone
* calendar full of random colors
* card for every single datum
* button-heavy control panel
* overly animated SaaS dashboard

---

# 6. PRIMARY OPERATOR SHELL

Desktop:

```text
┌───────────────┬────────────────────────────────────────────────┐
│               │ TOPBAR                                         │
│ BOATLY        ├────────────────────────────────────────────────┤
│               │                                                │
│ Dashboard     │ PAGE HEADER                                    │
│ Calendario    │                                                │
│ Prenotazioni  │ PAGE CONTENT                                   │
│ Flotta        │                                                │
│ Clienti       │                                                │
│               │                                                │
│ Staff         │                                                │
│ Skipper       │                                                │
│ Documenti     │                                                │
│ Pagamenti     │                                                │
│ Analytics     │                                                │
│               │                                                │
│ ───────────   │                                                │
│ Azienda       │                                                │
│ Impostazioni  │                                                │
└───────────────┴────────────────────────────────────────────────┘
```

---

# 7. SIDEBAR WIDTH

Desktop target:

264px.

Collapsed state may be introduced later around tablet widths.

Do not allow operators to resize sidebar manually in MVP.

---

# 8. SIDEBAR BACKGROUND

Primary:

Boatly Navy 900.

Potential lower footer:

Navy 950.

Text:

white / white-muted.

---

# 9. SIDEBAR LOGO

Top:

Boatly white/reversed logo.

Height:

approximately 28–30px.

Padding:

24px.

Clickable:

operator dashboard root.

---

# 10. SIDEBAR PRIMARY NAVIGATION

Primary daily actions:

* Dashboard
* Calendario
* Prenotazioni
* Flotta
* Clienti

These should be visually prioritized.

---

# 11. SIDEBAR SECONDARY NAVIGATION

Management:

* Staff
* Skipper
* Extra
* Documenti
* Compliance
* Pagamenti
* Analytics

Potentially `Extra` can live under Fleet later if navigation density becomes excessive.

---

# 12. SIDEBAR BUSINESS NAVIGATION

Lower section:

* Azienda
* Piano
* Impostazioni

---

# 13. NAV ITEM

Height:

44px.

Radius:

10–12px.

Padding:

12px.

Icon:

20px Lucide.

Gap:

10–12px.

---

# 14. NAV ITEM DEFAULT

Foreground:

white approximately 72–78% opacity.

Background:

transparent.

---

# 15. NAV ITEM HOVER

Background:

rgba white approximately 6–8%.

Foreground:

white.

---

# 16. NAV ITEM ACTIVE

Preferred:

slightly lighter Navy background

*

white text

*

small Aqua indicator.

Example:

3px Aqua vertical bar on left or subtle Aqua dot.

Do not use bright full Aqua sidebar rows.

---

# 17. NAV BADGES

Use only when action is needed.

Examples:

```text
Documenti      3
Compliance     1
```

Badge:

small warning/danger semantic.

Do not add notification counts to every menu item.

---

# 18. SIDEBAR BOTTOM AREA

Contains:

workspace selector

*

settings/account.

Workspace context must always be obvious.

---

# 19. WORKSPACE SWITCHER

Shows:

operator logo/avatar

operator name

role optionally.

Example:

```text
Mario Boat Rental
OWNER
⌄
```

---

# 20. WORKSPACE SWITCHER MENU

If user belongs to multiple operators:

list permitted workspaces.

Each:

logo

name

role.

Bottom:

possibly `Crea nuova attività` in future.

Switching changes active tenant context.

---

# 21. TOPBAR

Height:

68px.

Background:

white.

Border-bottom:

subtle.

Sticky where useful.

Contains:

left:

optional current location/workspace context.

Right:

* location selector
* notifications
* help
* user/account

---

# 22. LOCATION SELECTOR

For multi-location operators.

Example:

`Tutte le sedi`

or:

`Pozzuoli`.

Changing this should scope:

* dashboard
* calendar
* relevant bookings
* fleet where applicable

without silently altering global settings.

---

# 23. TOPBAR NOTIFICATIONS

Bell icon.

Unread count.

Click:

popover with recent operational notifications.

CTA:

`Vedi tutte`.

---

# 24. PAGE CANVAS

Background:

warm off-white or very light Slate.

Preferred:

`#F8FAF9` / design token derived.

Content:

white cards/surfaces.

Operator dashboard should not use marketplace's editorial Sand sections.

---

# 25. PAGE CONTENT WIDTH

Operational pages may use nearly full available width.

Horizontal padding:

Desktop 28–32px.

Wide calendar/table screens:

24px acceptable.

Forms/details:

inner max-width controlled.

---

# 26. PAGE HEADER

Default:

```text
Breadcrumb optional

TITLE                            PRIMARY CTA
Supporting description          Secondary controls
```

---

# 27. PAGE TITLE

28–32px.

Weight:

650–700.

Navy 900.

---

# 28. PAGE DESCRIPTION

14–16px.

Slate 600.

Use only when helpful.

Do not repeat obvious page names.

---

# 29. PRIMARY PAGE ACTION

Right side.

Examples:

`+ Nuova prenotazione`

`+ Aggiungi barca`

`+ Nuovo cliente`

Navy primary button.

---

# 30. DASHBOARD OBJECTIVE

The operator dashboard should answer:

> What requires attention today?

Not:

> How impressive are my analytics?

---

# 31. DASHBOARD TOP

Preferred greeting:

```text
Buongiorno, Mario

Ecco cosa succede oggi, 28 agosto.
```

Greeting can be omitted if it adds no value.

Primary CTA:

`+ Nuova prenotazione`.

---

# 32. DASHBOARD KPI ROW

Maximum 4 primary cards.

Suggested:

1. Prenotazioni oggi
2. Flotta occupata
3. Marketplace GMV / incasso relevant metric
4. Azioni richieste

---

# 33. KPI CARD DESIGN

White.

Border subtle.

Radius:

16px.

Padding:

20px.

No giant icon-circle decoration.

---

# 34. KPI CARD LABEL

13–14px / 500.

Slate 600.

---

# 35. KPI CARD VALUE

28–32px / 700.

Navy.

---

# 36. KPI SUPPORTING CONTEXT

12–13px.

Example:

`+3 rispetto a ieri`

or:

`12 su 18 barche`.

Avoid percentage trend when meaningless.

---

# 37. ACTION REQUIRED KPI

If no action:

success-neutral.

Example:

`Tutto in ordine`.

If issues:

warning.

Click:

scroll/navigate to action panel.

---

# 38. TODAY BOOKINGS PANEL

Large primary dashboard panel.

Heading:

`Prenotazioni di oggi`

Contains nearest/important bookings.

---

# 39. TODAY BOOKING ROW

Columns:

time

boat

customer

source

status

skipper

payment

quick action.

---

# 40. TODAY BOOKING ROW EXAMPLE

```text
10:00–18:00
Blue Wave 21

Mario Rossi
Boatly

Confermata

Skipper: Luca
Pagata

[Apri]
```

---

# 41. BOOKING ROW URGENCY

Upcoming within short timeframe:

subtle informational emphasis.

Late/start needed:

warning.

Do not use danger red merely because departure is soon.

---

# 42. DASHBOARD QUICK ACTIONS

Maximum 3–4.

Recommended:

* Nuova prenotazione
* Blocca calendario
* Aggiungi barca

Potential:

`Aggiungi cliente`.

Do not create 12 shortcut tiles.

---

# 43. NEXT ACTIVITIES PANEL

Could include:

* booking starting soon
* document expiring
* payment issue
* skipper conflict
* boat requiring review

Ordered by urgency.

---

# 44. COMPLIANCE DASHBOARD PREVIEW

Small panel:

`Documenti da rinnovare`

Rows:

entity

document

expiration.

CTA:

`Vedi compliance`.

---

# 45. FLEET UTILIZATION PREVIEW

Simple chart/bar.

No complex visualization.

Example:

`12 di 18 barche occupate oggi`.

Potential small timeline.

---

# 46. DASHBOARD EMPTY INITIAL STATE

New operator with no fleet:

```text
Benvenuto su Boatly

Per iniziare aggiungi la tua prima barca.

[Aggiungi la prima barca]
```

Secondary:

complete onboarding/compliance.

Do not show six empty KPI cards with zeros.

---

# 47. FLEET CALENDAR OBJECTIVE

The calendar is the central operational feature.

It must make visible:

* who is using which boat
* when
* booking source
* maintenance/blocks
* conflicts
* availability

at a glance.

---

# 48. CALENDAR DESKTOP HEADER

```text
Calendario

[Sede: Tutte] [Barche: Tutte] [Tipi evento]

[<] [Oggi] [>]   28 agosto 2026

Giorno | Settimana | Agenda

                        [+ Nuova prenotazione]
```

---

# 49. CALENDAR VIEW DEFAULT

Recommended desktop default:

**Day / multi-boat timeline**

for high-frequency fleet operations.

Week:

available.

Agenda:

secondary.

Month:

optional future, not required to be primary.

---

# 50. CALENDAR TIMELINE

Left:

sticky boat column.

Top:

sticky time header.

Main:

scrollable timeline.

---

# 51. BOAT COLUMN WIDTH

Approximately:

200–240px.

Contains:

boat name

location

status.

Optional:

small thumbnail.

---

# 52. TIME GRID

Hour increments.

Potential:

30-minute visual subdivisions.

Do not make grid visually heavy.

Use subtle lines.

---

# 53. CALENDAR EVENT TYPES

Core:

* Marketplace booking
* Manual booking
* Maintenance
* Transfer
* Private use
* Operator block
* Hold where appropriate

---

# 54. MARKETPLACE EVENT STYLE

Navy/Aqua branded.

Example:

light Aqua background

Navy border/text.

Include Boatly badge/icon.

---

# 55. MANUAL BOOKING EVENT STYLE

Distinct but equally prominent.

Example:

light blue/slate-teal background.

Label:

`Manuale`.

Manual bookings must never visually look unofficial.

---

# 56. MAINTENANCE EVENT STYLE

Warning light background.

Wrench icon.

Text:

`Manutenzione`.

---

# 57. TRANSFER EVENT STYLE

Info/slate background.

Arrow icon.

---

# 58. PRIVATE BLOCK STYLE

Slate 100.

Slate text.

Lock icon or block icon.

---

# 59. HOLD STYLE

If shown to operator:

striped/subtle info style.

Label:

`Hold pagamento`.

Avoid presenting as confirmed booking.

---

# 60. CALENDAR EVENT CONTENT

At normal width:

customer/event name

time

source/status.

If narrow:

short label + tooltip/details.

---

# 61. CALENDAR EVENT HOVER

Popover or subtle preview.

Must not require click for very basic information.

---

# 62. CALENDAR EVENT CLICK

Open right-side quick detail sheet.

Width:

420–480px.

---

# 63. CALENDAR QUICK DETAIL SHEET

Contains:

source

status

boat

customer

time

passengers

payment

skipper

notes summary

primary actions

CTA:

`Apri prenotazione`.

---

# 64. CALENDAR DRAG/DROP

Do NOT make drag/drop authoritative by default.

Moving booking by drag could have:

* customer
* payment
* legal
* availability

implications.

If implemented later:

must open confirmation/revalidation.

MVP can avoid drag booking rescheduling.

---

# 65. CALENDAR NEW BLOCK

Operator selects:

`Blocca calendario`.

Short sheet/dialog:

* boat
* date
* time
* block type
* note

Save only after conflict validation.

---

# 66. CALENDAR CONFLICT

If overlapping confirmed booking:

inline error/banner:

> Questo intervallo è già occupato da una prenotazione.

Show conflicting booking if user is authorized.

CTA:

`Apri prenotazione`.

---

# 67. CALENDAR NOW INDICATOR

Current time line:

subtle Aqua/red-neutral.

Avoid aggressive red.

---

# 68. BOOKING LIST OBJECTIVE

Fast search and operation.

Not decorative.

---

# 69. BOOKING LIST HEADER

Title:

`Prenotazioni`.

Description:

`Marketplace e prenotazioni manuali in un unico elenco.`

Primary:

`+ Nuova prenotazione`.

---

# 70. BOOKING FILTERS

Top row:

search

date range

location

boat

source

status

payment status.

Potential advanced filters hidden.

---

# 71. BOOKING SEARCH

Search by:

* booking code
* customer
* phone
* email
* boat

Placeholder:

`Cerca codice, cliente o barca`.

---

# 72. BOOKING TABLE COLUMNS

Recommended:

* Codice
* Cliente
* Barca
* Data / Ora
* Fonte
* Stato
* Pagamento
* Totale
* Azioni

---

# 73. BOOKING CODE

Medium emphasis.

Potential monospace only if it materially improves scanning.

Preferred normal Geist medium.

---

# 74. BOOKING SOURCE BADGE

Marketplace:

`Boatly`

Aqua/Navy.

Manual:

`Manuale`

neutral/info.

---

# 75. BOOKING STATUS

Use shared StatusBadge.

Customer/operational labels in Italian.

---

# 76. PAYMENT STATUS

Separate badge from booking status.

Do not merge:

booking confirmed

with:

payment status.

---

# 77. TABLE ROW CLICK

Entire non-interactive row may open booking detail.

Actions menu remains separate.

Must be keyboard accessible.

---

# 78. TABLE ROW ACTIONS

Overflow menu:

* Apri
* Modifica details where allowed
* Assegna skipper
* Annulla

Do not show four icons permanently.

---

# 79. BOOKINGS BULK ACTIONS

Not MVP unless strong need emerges.

Avoid bulk cancellation/edit due high operational risk.

---

# 80. BOOKINGS EMPTY STATE

No bookings yet:

```text
Nessuna prenotazione

Le prenotazioni marketplace e manuali appariranno qui.

[Nuova prenotazione]
```

---

# 81. MANUAL BOOKING OBJECTIVE

Creating a phone/WhatsApp booking should take **very little time**.

The UI must optimize speed while preserving availability integrity.

---

# 82. MANUAL BOOKING STRUCTURE

Preferred desktop:

single page with grouped sections

rather than unnecessarily long wizard.

Suggested:

```text
Nuova prenotazione

Cliente
Barca e orario
Passeggeri / Extra
Pagamento
Note

                      Riepilogo sticky
```

---

# 83. MANUAL BOOKING DESKTOP GRID

Main form:

65%.

Right summary:

35%.

Similar mental model to checkout but optimized for operator speed.

---

# 84. CUSTOMER SELECTOR

Top:

search existing customer.

Autocomplete results:

name

phone/email

last booking optional.

CTA:

`+ Nuovo cliente`.

---

# 85. QUICK CUSTOMER CREATE

Inline expandable form or dialog.

Fields:

* Nome
* Cognome
* Telefono
* Email optional

Avoid leaving booking flow.

---

# 86. BOAT SELECTOR

Filter by location.

Search/list available boats.

Each option:

name

location

capacity

status.

---

# 87. DATE / TIME

Select:

date

start time

duration/end time.

Availability check runs server-side.

---

# 88. AVAILABILITY STATUS

After time selection:

Success:

`Disponibile`.

Conflict:

`Non disponibile`.

Loading:

`Controllo disponibilità…`.

---

# 89. CONFLICT DETAIL

If conflict authorized:

show:

`Occupata dalle 10:00 alle 14:00 — Mario Rossi`

CTA:

`Apri prenotazione`.

---

# 90. PASSENGERS

Numeric control/input.

Validate against boat/legal capacity.

---

# 91. MANUAL EXTRAS

Compact list.

Can add extras quickly.

Avoid forcing operator through separate full extras screen.

---

# 92. MANUAL PAYMENT SECTION

Options:

* Da pagare
* Contanti
* Bonifico
* Carta in sede
* Altro

Amount.

Optional received date.

---

# 93. MANUAL PAYMENT NOTICE

Display clearly:

> Questo pagamento viene registrato manualmente e non è verificato tramite Stripe.

Small info panel.

---

# 94. MANUAL BOOKING SUMMARY

Sticky right card:

customer

boat

date/time

passengers

extras

amount

source:

Manuale.

CTA:

`Crea prenotazione`.

---

# 95. MANUAL BOOKING SUCCESS

Toast + redirect booking detail.

Toast:

`Prenotazione creata`.

Booking detail immediately visible.

---

# 96. BOOKING DETAIL OBJECTIVE

The operator booking detail is the operational control center for one rental.

---

# 97. BOOKING DETAIL HEADER

```text
← Prenotazioni

BT-2026-AB12CD       CONFERMATA    BOATLY

Mario Rossi · Blue Wave 21
28 agosto · 10:00–18:00

[Assegna skipper] [⋯]
```

---

# 98. BOOKING HEADER ACTIONS

Primary action depends on state.

CONFIRMED:

`Avvia noleggio`.

IN_PROGRESS:

`Completa noleggio`.

Other actions:

overflow menu.

---

# 99. BOOKING DETAIL MAIN GRID

Main:

approximately 65%.

Right financial/summary:

35%.

---

# 100. CUSTOMER CARD

Contains:

name

phone

email

customer type:

Boatly / Direct.

Quick contact actions:

copy phone/email.

Potential phone link on mobile.

---

# 101. BOAT / TRIP CARD

Boat thumbnail.

Boat name.

Location.

Start/end.

Passengers.

Legal offering.

Licence/driver relevant summary.

---

# 102. SKIPPER SECTION

Current:

assigned skipper

qualification status

contact

time.

If missing when required:

warning banner.

CTA:

`Assegna skipper`.

---

# 103. EXTRAS SECTION

Rows:

extra

quantity

price.

---

# 104. NOTES

Operator-visible notes.

Customer special request separately labeled.

Do not mix internal notes with customer-visible content.

---

# 105. CONTRACT SECTION

Show:

contract type

generation status

download/open action.

Do not expose raw template internals.

---

# 106. FINANCIAL SIDEBAR

Contains:

Customer total

Payment state

Boatly commission

Refund impact

Operator amount

Payout state where relevant.

Manual booking:

different simplified panel.

---

# 107. MARKETPLACE BOOKING FINANCIAL EXAMPLE

```text
Cliente ha pagato      €460

Commissione Boatly      -€46

────────────────────────────
Importo operatore       €414

Pagamento               Pagato
Payout                   In attesa
```

Only if numbers reflect actual accounting model.

---

# 108. MANUAL BOOKING FINANCIAL EXAMPLE

```text
Totale prenotazione     €320

Pagamento
Contanti                 €320

Commissione Boatly       €0
```

Label:

`Pagamento registrato manualmente`.

---

# 109. BOOKING TIMELINE

Near bottom.

Events:

* Prenotazione creata
* Pagamento confermato
* Skipper assegnato
* Noleggio avviato
* Noleggio completato
* Cancellazione/refund if relevant

Use human labels.

---

# 110. TIMELINE EVENT

Icon

title

actor/context

timestamp.

Do not show raw event JSON.

---

# 111. START RENTAL

CONFIRMED booking.

Click:

`Avvia noleggio`.

Confirmation dialog only if meaningful.

Potential prerequisite warnings:

* required skipper missing
* compliance issue
* wrong timing

Controlled transition.

---

# 112. COMPLETE RENTAL

IN_PROGRESS.

CTA:

`Completa noleggio`.

Optional confirmation:

`Confermi che il noleggio è terminato?`

---

# 113. OPERATOR CANCELLATION UI

Overflow:

`Annulla prenotazione`.

Opens destructive dialog/page.

Requires:

* reason
* consequence summary
* refund information
* confirmation.

---

# 114. FLEET LIST OBJECTIVE

Show:

* what boats exist
* current state
* publication state
* location
* compliance
* next operational event

---

# 115. FLEET HEADER

Title:

`Flotta`.

Primary:

`+ Aggiungi barca`.

Filters:

* location
* status
* type
* compliance

Search.

---

# 116. FLEET DEFAULT VIEW

Recommended:

table/list hybrid on desktop.

Why:

operators often manage 5–30 boats and need faster scanning than large marketplace-style cards.

---

# 117. FLEET ROW

Contains:

thumbnail

boat name

type

location

capacity

today state

publication status

compliance

next booking

actions.

---

# 118. FLEET THUMBNAIL

56–64px.

Rounded 10–12px.

Informational rather than dominant.

---

# 119. TODAY STATE

Examples:

* Disponibile
* In noleggio fino alle 18:00
* Prenotata dalle 15:00
* Manutenzione
* Bloccata

---

# 120. FLEET PUBLICATION STATUS

Examples:

* Pubblicata
* Bozza
* In revisione
* In pausa
* Archiviata

Separate from compliance.

---

# 121. FLEET COMPLIANCE STATUS

Examples:

* In regola
* Azione richiesta
* In revisione
* Bloccata

---

# 122. FLEET ROW CLICK

Open boat management overview.

---

# 123. BOAT MANAGEMENT SHELL

Header:

boat

location

publication badge

marketplace preview CTA.

Below:

secondary navigation.

---

# 124. BOAT SECONDARY NAVIGATION

Preferred desktop left-subnavigation if many sections.

Possible:

```text
Panoramica
Informazioni
Specifiche
Motore
Offerta legale
Foto
Servizi
Prezzi
Extra
Disponibilità
Calendario
Documenti
Compliance
Pubblicazione
```

Because horizontal 13-tab navigation is too crowded.

---

# 125. BOAT MANAGEMENT LAYOUT

```text
┌──────────────────────┬───────────────────────────────┐
│ Boat sub-navigation  │ Current configuration page    │
│                      │                               │
└──────────────────────┴───────────────────────────────┘
```

Subnav width:

220–240px.

---

# 126. BOAT OVERVIEW

Top status cards:

* Marketplace status
* Today availability
* Compliance
* Next booking

Below:

quick boat details.

Preview.

Recent activity.

---

# 127. BOAT INFORMATION PAGE

Form groups:

## Informazioni pubbliche

name

description

category.

## Informazioni generali

brand

model

year.

## Operatività

location

capacity.

---

# 128. FORM SAVE PATTERN

Complex forms:

sticky bottom action bar or page footer:

`Annulla`

`Salva modifiche`.

Show unsaved changes warning on navigation if applicable.

---

# 129. SAVE SUCCESS

Small toast:

`Modifiche salvate`.

Avoid redirect.

---

# 130. BOAT SPECIFICATIONS

Logical two-column form.

Fields grouped by:

dimensions

capacity

other technical characteristics.

Do not show huge raw database form.

---

# 131. BOAT ENGINE PAGE

Sections:

## Motore

manufacturer

model

power kW

horsepower

displacement.

## Configurazione

engine type

cycle

fuel

propulsion.

## Navigazione

relevant limits.

---

# 132. ENGINE LEGAL INFO

Info panel:

> Alcuni dati del motore possono influire sui requisiti di patente.

Link:

`Scopri perché`.

Do not make operator interpret law alone.

---

# 133. LEGAL OFFERING PAGE

High-trust, compliance-oriented.

Heading:

`Offerta legale`.

Supporting:

`Configura le modalità contrattuali che questa barca può offrire.`

---

# 134. LEGAL OFFERING CARDS

One per potential type.

Example:

```text
LOCAZIONE

Status: Approvata

Il cliente assume la conduzione
secondo la configurazione prevista.

[Gestisci]
```

---

# 135. LEGAL OFFERING STATES

* Non configurata
* Bozza
* In revisione
* Approvata
* Rifiutata
* Sospesa

Use semantic badges.

---

# 136. LEGAL OFFERING APPROVAL

Operator sees:

requirements

current evidence

platform review state.

Operator cannot approve own state.

---

# 137. PHOTOS PAGE

Upload area top.

Photo grid.

Cover label.

Drag reorder desktop.

Actions:

replace

delete

set cover.

---

# 138. PHOTO QUALITY GUIDE

Small side/help card:

Recommended:

* exterior
* seating
* console
* stern/bow
* engine
* onboard features

Avoid blocking operator with excessive requirements unless publication rules require them.

---

# 139. AMENITIES PAGE

Grouped checkbox cards.

Search.

Categories:

* Comfort
* Navigazione
* Intrattenimento
* Attrezzatura mare
* Altro

---

# 140. PRICING PAGE OBJECTIVE

Operator should understand pricing without needing spreadsheets.

---

# 141. PRICING PAGE TOP

Header:

`Prezzi`.

Primary:

`+ Nuova tariffa`.

Summary:

currency

active rate plans.

---

# 142. RATE PLAN CARD

Example:

```text
Giornata intera

€320

Durata
8 ore

Attiva

[Modifica]
```

---

# 143. PRICING RULES TABLE

Columns:

rule name/type

period

days

adjustment

priority

status

action.

---

# 144. PRICING RULE EDITOR

Prefer understandable language.

Example:

```text
Nome
Alta stagione

Dal
1 giugno

Al
31 agosto

Modifica prezzo
+20%
```

Not:

`adjustment_percentage = 0.20`.

---

# 145. DATE OVERRIDES

Calendar/list.

Example:

`15 agosto — €450`.

High priority rule.

---

# 146. PRICE PREVIEW

Highly useful.

Panel:

`Anteprima prezzo`

Choose example date/duration.

Show:

base

rules applied

result.

This helps operator trust pricing engine.

---

# 147. EXTRAS PAGE — BOAT

Shows assigned operator extras.

Add from reusable library.

Rows:

name

pricing model

price

mandatory

status.

---

# 148. GLOBAL EXTRAS LIBRARY

Operator `/extra`.

Reusable items.

CTA:

`+ Nuovo extra`.

---

# 149. EXTRA EDITOR

Fields:

name

description

pricing type

price

mandatory

active.

---

# 150. AVAILABILITY PAGE

Weekly schedule editor.

Rows:

Monday–Sunday.

Switch open/closed.

Time ranges.

---

# 151. AVAILABILITY COPY

Example:

`Definisci gli orari in cui la barca può essere prenotata.`

Calendar blocks handled separately.

---

# 152. AVAILABILITY SEASON

If seasonal:

date validity.

Potential:

`Valida dal 1 maggio al 30 settembre`.

---

# 153. AVAILABILITY PREVIEW

Small next 7 days/summary.

Avoid full duplicate fleet calendar.

---

# 154. BOAT CALENDAR PAGE

Filtered central calendar for one boat.

Reuse FleetCalendar component with one-boat context.

---

# 155. DOCUMENTS PAGE — BOAT

Table/card rows:

document

status

validity

expiration

review note

action.

---

# 156. DOCUMENT STATUS

Approved.

Under review.

Rejected.

Expired.

Pending.

---

# 157. DOCUMENT REJECTION UI

Danger-light card.

Example:

`Documento rifiutato`

Reason:

specific text from reviewer.

CTA:

`Carica nuovo documento`.

---

# 158. EXPIRING DOCUMENT UI

Warning panel:

`Scade tra 12 giorni`.

CTA:

`Carica rinnovo`.

---

# 159. COMPLIANCE PAGE — BOAT

Summary at top:

```text
Marketplace eligibility

BLOCCATA

1 requisito da completare
```

or:

`ATTIVA`.

---

# 160. COMPLIANCE REQUIREMENTS LIST

Rows:

requirement

scope

status

evidence

valid until

action.

---

# 161. COMPLIANCE ACTIONABILITY

Every blocking issue must explain:

* what is missing
* why it matters at a product level
* what operator can do

Do not show only:

`FAILED`.

---

# 162. PUBLICATION PAGE

Checklist.

Example:

```text
Informazioni                 ✓
Specifiche                   ✓
Offerta legale               ✓
Foto                         ✓
Prezzi                       ✓
Disponibilità                ✓
Documenti                    !
Compliance                   !

2 requisiti da completare
```

---

# 163. SUBMIT BUTTON

Disabled until mandatory requirements pass.

Tooltip/helper explains missing conditions.

When enabled:

`Invia per revisione`.

---

# 164. PUBLICATION REVIEW STATE

After submission:

`In revisione`.

Show:

submission date

expected next step without invented SLA.

If changes requested:

list them.

---

# 165. LOCATIONS LIST

Table/cards.

Columns:

name

marina/city

boats

today bookings

status

actions.

---

# 166. LOCATION CREATE

Form:

name

address

marina

timezone

contact.

Map/geocoding.

---

# 167. LOCATION DETAIL

Tabs/sections:

* Informazioni
* Orari
* Barche
* Calendario

---

# 168. CRM OBJECTIVE

MVP CRM should be useful without becoming Salesforce.

Focus:

* contact
* booking history
* notes
* future booking
* direct vs Boatly relationship

---

# 169. CRM LIST

Header:

`Clienti`.

Search.

Primary:

`+ Nuovo cliente`.

---

# 170. CRM TABLE

Columns:

Cliente

Contatti

Ultima prenotazione

Prossima prenotazione

N. prenotazioni

Origine

Azioni.

---

# 171. CRM ORIGIN

Possible labels:

* Boatly
* Diretto
* Entrambi

Depending relationship.

---

# 172. CUSTOMER DETAIL — OPERATOR

Header:

name

phone

email.

Quick actions.

Main sections:

* prossima prenotazione
* cronologia
* note
* dettagli.

---

# 173. CRM NOTES

Internal only.

Clearly label:

`Note interne`.

Do not imply customer can see them.

---

# 174. STAFF PAGE

List/table.

Columns:

person

role

status

email

last invitation/activity optionally

action.

---

# 175. STAFF PRIMARY CTA

`Invita collaboratore`.

---

# 176. INVITATION DIALOG

Fields:

email

role.

Role description below.

Example:

`MANAGER — può gestire flotta, prezzi e prenotazioni.`

---

# 177. OWNER ROLE WARNING

If owner assignment flow exists:

strong warning:

`Il ruolo OWNER concede accesso completo all'attività.`

May require separate ownership-transfer process later.

---

# 178. STAFF STATUS

* Invitato
* Attivo
* Sospeso
* Rimosso

---

# 179. SKIPPER PAGE OBJECTIVE

Provide operator with:

* qualification confidence
* assignment visibility
* schedule

---

# 180. SKIPPER LIST

Columns/cards:

name

qualification status

documents

today availability

next booking

actions.

---

# 181. SKIPPER STATUS

Operational:

* Disponibile
* Occupato
* Non disponibile

Compliance:

separate badge.

Do not combine both into one status.

---

# 182. SKIPPER DETAIL

Header:

name

qualification/compliance.

Sections:

* contatti
* qualifiche
* documenti
* calendario
* prenotazioni future
* note.

---

# 183. SKIPPER ASSIGNMENT UI

Booking detail.

Searchable selector.

Each result:

name

qualification status

availability.

Unavailable entries disabled/explained.

---

# 184. SKIPPER CONFLICT

Message:

> Luca Bianchi è già assegnato a un'altra prenotazione dalle 11:00 alle 15:00.

CTA:

`Scegli un altro skipper`.

---

# 185. GLOBAL DOCUMENTS PAGE

Purpose:

operator-wide compliance work queue.

---

# 186. DOCUMENTS HEADER

Title:

`Documenti`.

Summary:

* Scaduti
* In scadenza
* In revisione
* Rifiutati

---

# 187. DOCUMENT FILTERS

Scope:

* Azienda
* Barca
* Skipper

Status.

Expiry.

Search.

---

# 188. DOCUMENTS TABLE

Entity

Document

Status

Expiry

Reviewed

Action.

---

# 189. COMPLIANCE DASHBOARD OBJECTIVE

Operator should understand whether they can sell on Boatly.

---

# 190. COMPLIANCE TOP STATUS

Large but restrained banner.

Example success:

```text
Marketplace attivo

I requisiti obbligatori sono attualmente soddisfatti.
```

Warning:

```text
Azione richiesta

2 requisiti devono essere aggiornati.
```

Danger:

```text
Marketplace temporaneamente bloccato

Completa i requisiti indicati per ricevere nuove prenotazioni.
```

---

# 191. COMPLIANCE ENTITY SUMMARY

Sections:

## Azienda

## Barche

## Skipper

Each entity row:

status

issues

next expiration.

---

# 192. COMPLIANCE ISSUE CARD

Example:

```text
Blue Wave 21

Assicurazione in scadenza
12 settembre 2026

[Carica rinnovo]
```

---

# 193. PAYMENTS PAGE OBJECTIVE

Explain marketplace financial flows without turning UI into accounting software.

---

# 194. PAYMENTS TOP METRICS

Possible:

* Incassato clienti
* Commissioni Boatly
* Rimborsi
* Importo operatore

Date filter.

---

# 195. PAYMENTS TABLE

Columns:

Booking

Customer

Date

Customer amount

Commission

Refund

Operator amount

Payment status

Action.

---

# 196. PAYMENT DETAIL

Open drawer/page.

Contains:

booking

customer

Stripe/internal status

amount

commission

refunds

payout relation where available.

---

# 197. PAYMENT STATUS EXPLANATION

Tooltip/help.

Example:

`Pagato — il pagamento è stato confermato dal provider.`

---

# 198. PAYOUT PAGE

Top:

Stripe account status.

Example:

```text
Pagamenti configurati

Payout abilitati
```

or:

action required.

---

# 199. PAYOUT SUMMARY

Potential:

Last payout

Next estimated provider payout

Payouts enabled.

Do not present Boatly as custom wallet.

---

# 200. PAYOUT HISTORY

Date

provider reference

amount

status

expected arrival.

---

# 201. PLAN PAGE

Header:

`Il tuo piano`.

Current plan dominant card.

---

# 202. PLAN CARD

Example:

```text
PRO

€49 / mese

Commissione marketplace
10%

Fino a 25 barche

Multi-sede
CRM
Staff
Analytics
...
```

---

# 203. FOUNDING PLAN

Special pilot badge:

`Founding Operator`.

Clearly explain:

* temporary commercial terms
* current commission
* current period/end if defined

without implying lifetime benefits unless actually promised.

---

# 204. PLAN COMPARISON

Future when billing live.

Current plan highlighted.

Avoid aggressive pricing upsells within daily operations.

---

# 205. ANALYTICS OBJECTIVE

Support real operator decisions.

Not vanity dashboard.

---

# 206. ANALYTICS FILTERS

Date range.

Location.

Boat optional.

---

# 207. ANALYTICS TOP KPIS

Potential:

* Prenotazioni
* Marketplace GMV
* Managed Booking Volume
* Utilizzo flotta

---

# 208. MARKETPLACE / MANUAL SPLIT

Stacked bar/donut only if easy to read.

Preferred:

simple bar/percentage.

Example:

`Marketplace 38%`

`Manuale 62%`.

---

# 209. BOOKING TREND CHART

Time-series.

Navy line.

Marketplace/manual optional secondary series.

---

# 210. FLEET UTILIZATION CHART

Bar/table:

boat

booked hours/days

utilization.

Useful to identify underused boats.

---

# 211. TOP BOATS

Table:

boat

bookings

managed value

utilization

average booking value.

---

# 212. CANCELLATION ANALYTICS

Simple:

cancellation rate

operator/customer/platform split

if meaningful.

---

# 213. ANALYTICS NO DATA

Do not show broken chart.

Show:

`Non ci sono ancora dati sufficienti per questo periodo.`

---

# 214. REVIEWS PAGE

Top:

average rating.

Review count.

Potential distribution.

---

# 215. REVIEWS LIST

Filter:

boat

rating

date.

Each review:

rating

boat

customer display name

date

verified booking

text.

---

# 216. REVIEW RESPONSE

Not MVP unless explicitly added.

Do not invent operator public reply functionality yet.

---

# 217. CONTRACTS PAGE

List:

booking code

customer

boat

contract type

date

status

download.

---

# 218. CONTRACT STATUS

* Generato
* In preparazione
* Errore / richiede intervento
* Other legally approved state

Avoid implying legal signature if not implemented.

---

# 219. BUSINESS PROFILE

Separate:

Public profile

from:

Legal/tax data.

---

# 220. PUBLIC BUSINESS PROFILE

Fields:

public name

description

logo

cover

public contacts.

Preview:

`Anteprima profilo`.

---

# 221. LEGAL BUSINESS DATA

More serious form surface.

Sections:

* entity
* registered address
* VAT/tax
* registry
* tax residence

Data privacy notice/helper.

---

# 222. SETTINGS

Categories:

* Generali
* Cancellazioni
* Notifiche
* Sicurezza
* Commerciale/Piano where appropriate

---

# 223. CANCELLATION POLICY SETTINGS

List policies.

Current default.

Preview.

Edit future policy.

Notice:

existing confirmed bookings remain unchanged.

---

# 224. NOTIFICATION SETTINGS

Separate:

operational email

reminders

marketing if applicable.

Do not allow disabling legally/operationally mandatory communications if required.

---

# 225. SECURITY SETTINGS

Account-level:

password/security handled through auth.

Operator-level:

session/account links.

Potential future 2FA.

Do not invent unsupported security features visually.

---

# 226. OPERATOR NOTIFICATION CENTER

Popover:

latest events.

Full page:

filters/read status.

Examples:

* nuova prenotazione
* pagamento confermato
* documento in scadenza
* barca approvata
* refund completed

---

# 227. NOTIFICATION PRIORITY

Critical operational issues:

warning/danger icon.

Routine:

neutral.

No bright red badge for every notification.

---

# 228. GLOBAL SEARCH — OPERATOR

Not mandatory MVP.

If introduced:

search bookings/customers/boats.

Do not prematurely build global command palette unless useful.

---

# 229. OPERATOR TABLE DESIGN

White surface.

Header light neutral.

Row height:

52–56px.

Minimal separators.

Sticky header on long tables where useful.

---

# 230. TABLE FILTER TOOLBAR

Prefer one clean horizontal toolbar.

Left:

search.

Right:

filters.

On small width:

wrap gracefully.

---

# 231. SAVED FILTERS

Not MVP.

Do not overcomplicate.

---

# 232. TABLE PAGINATION

Bottom right/center.

Show count:

`1–25 di 148`.

---

# 233. OPERATOR DETAIL DRAWER

Useful for:

* calendar booking preview
* quick customer
* payment preview
* document preview

Not for complex editing.

---

# 234. OPERATOR DIALOGS

Use for:

* short create/invite
* confirmation
* destructive action

Not:

full boat setup.

---

# 235. DESTRUCTIVE ACTIONS

Examples:

* cancel booking
* archive boat
* remove staff
* suspend internal item where relevant

Require explicit confirmation.

Buttons name consequence.

---

# 236. ARCHIVE BOAT DIALOG

Example:

`Archivia Blue Wave 21?`

Explain:

* removed from future marketplace
* history preserved
* future bookings may require resolution

CTA:

`Archivia barca`.

---

# 237. ERROR STYLE

Operational errors:

concise and specific.

Good:

> La barca è già occupata dalle 10:00 alle 14:00.

Bad:

> Booking overlap violation.

---

# 238. PAYMENT ERROR STYLE

Good:

> Non siamo riusciti a sincronizzare lo stato del pagamento. La prenotazione non verrà modificata finché la verifica non sarà completata.

Do not invite operator to manually set provider state.

---

# 239. PERMISSION ERROR

Example:

> Non hai i permessi necessari per modificare i prezzi.

Optional:

`Contatta un OWNER della tua attività.`

Do not show inaccessible form in editable state.

---

# 240. LOADING PATTERN

Dashboard:

skeleton cards + table rows.

Calendar:

grid shell + event skeleton if useful.

Tables:

row skeleton.

Forms:

load existing values before editable presentation when necessary.

---

# 241. EMPTY FLEET

```text
La tua flotta è ancora vuota

Aggiungi la prima barca per configurare disponibilità, prezzi e marketplace.

[Aggiungi barca]
```

---

# 242. EMPTY CUSTOMERS

```text
Nessun cliente

I clienti compariranno qui dalle prenotazioni marketplace o manuali.

[Nuovo cliente]
```

---

# 243. EMPTY CALENDAR

Do not imply system failure.

`Nessuna attività in questo intervallo.`

Quick actions:

`Nuova prenotazione`

`Blocca calendario`.

---

# 244. EMPTY DOCUMENTS

If no requirement/doc configured:

contextual message.

Do not say:

`Tutto in regola`

unless compliance engine confirms it.

---

# 245. OPERATOR MOBILE PRIORITY

Mobile is not full parity through identical layouts.

Primary mobile tasks:

* today's operations
* booking detail
* start/complete rental
* customer contact
* create manual booking
* quick calendar block
* skipper assignment
* compliance alerts

---

# 246. OPERATOR MOBILE NAV

Potential bottom navigation:

* Home
* Calendario
* Prenotazioni
* Flotta
* Altro

Finalized in B7.

---

# 247. OPERATOR MOBILE HOME

Cards:

* today's next booking
* bookings today
* action required

Primary:

`+ Prenotazione`.

Avoid desktop KPI grid.

---

# 248. MOBILE CALENDAR

Default:

Agenda.

Date header.

Grouped events by boat/time.

Toggle:

`Giorno`.

No tiny full-fleet timeline.

---

# 249. MOBILE BOOKING DETAIL

Single column.

Sticky bottom primary state action:

`Avvia noleggio`

or:

`Completa`.

Secondary actions overflow.

---

# 250. MOBILE MANUAL BOOKING

Step-based or stacked compact form.

Large selectors.

Summary before final creation.

No desktop two-column grid.

---

# 251. MOBILE TABLES

Convert to:

cards

or:

condensed rows.

Example booking mobile card:

```text
10:00
Mario Rossi

Blue Wave 21

Boatly · Confermata
Pagata

€460

[Apri]
```

---

# 252. MOBILE FLEET

Cards/rows.

Thumbnail

boat

today status

next booking

compliance.

---

# 253. MOBILE CRM

Search-first list.

Tap customer for details.

Call button where appropriate.

---

# 254. OPERATOR ACCESSIBILITY

Keyboard support especially important for:

* booking list
* calendar
* forms
* dialogs
* tables

---

# 255. CALENDAR ACCESSIBILITY

Calendar events must have:

accessible labels.

Alternative agenda/list representation.

Do not rely solely on visual timeline.

---

# 256. TABLE ACCESSIBILITY

Proper headers.

Sortable column state announced.

Row actions accessible.

---

# 257. FORM ACCESSIBILITY

Visible labels.

Error association.

Fieldsets/group labels for grouped choices.

---

# 258. STATUS ACCESSIBILITY

Always:

text label

*

semantic visual.

Never color alone.

---

# 259. OPERATOR MICROCOPY PRINCIPLE

Operator copy should be:

short

operational

direct.

---

# 260. GOOD OPERATOR COPY

Good:

`Barca disponibile`

`Pagamento confermato`

`Documento in scadenza`

`Prenotazione manuale`

`Assegna skipper`

---

# 261. BAD OPERATOR COPY

Avoid:

`Risorsa disponibile`

`Transazione processata`

`Asset compliance failure`

`Occupancy entity conflict`

---

# 262. OPERATOR CTA LANGUAGE

Preferred:

* Nuova prenotazione
* Aggiungi barca
* Blocca calendario
* Assegna skipper
* Avvia noleggio
* Completa noleggio
* Carica documento
* Invia per revisione
* Salva modifiche
* Aggiungi extra
* Nuovo cliente
* Invita collaboratore

---

# 263. OPERATOR STATUS LANGUAGE

Translate internal states.

Examples:

`PENDING_REVIEW`

→ `In revisione`.

`EXPIRED`

→ `Scaduto`.

`PAYMENT_PROCESSING`

→ `Pagamento in verifica`.

---

# 264. SOURCE LANGUAGE

Marketplace booking:

`Boatly`.

Manual:

`Manuale`.

Do not expose:

`MARKETPLACE`

`MANUAL`

as raw enum.

---

# 265. COMPLIANCE LANGUAGE

Avoid pretending Boatly gives legal advice.

Use:

`Requisito Boatly`

`Documento richiesto`

`Verifica in corso`

where appropriate.

Do not claim:

`Legalmente certificato`

unless explicitly supported.

---

# 266. OPERATOR COMPONENT INVENTORY

Reusable operator components should include:

```text
OperatorShell
OperatorSidebar
OperatorTopbar
WorkspaceSwitcher
LocationSelector

OperatorPageHeader
OperatorStatCard
ActionRequiredCard
TodayBookingList
QuickActions

FleetCalendar
CalendarToolbar
CalendarBoatRow
CalendarEvent
CalendarEventSheet

BookingTable
BookingFilters
BookingSourceBadge
BookingStatusBadge
PaymentStatusBadge
BookingDetailHeader
BookingTimeline
BookingFinancialSummary

ManualBookingForm
CustomerCombobox
BoatCombobox
AvailabilityCheck
ManualPaymentForm
ManualBookingSummary

FleetTable
FleetRow
BoatStatusBadge
ComplianceStatusBadge

BoatManagementNav
BoatOverview
BoatFormSection
EngineForm
LegalOfferingCard
PhotoManager
AmenitiesSelector
RatePlanCard
PricingRuleTable
PricePreview
ExtrasAssignment
AvailabilityEditor
PublicationChecklist

LocationTable
LocationForm

CustomerTable
CustomerDetail
CustomerNotes

StaffTable
StaffInviteDialog
RoleBadge

SkipperTable
SkipperDetail
SkipperSelector
SkipperAvailabilityBadge

DocumentTable
DocumentCard
DocumentUploader
ComplianceDashboard
ComplianceRequirementRow

PaymentTable
PaymentDetail
FinancialBreakdown
PayoutTable

PlanCard
PlanComparison

AnalyticsFilters
AnalyticsStat
BookingTrendChart
FleetUtilizationTable
MarketplaceManualSplit

ReviewList
ContractTable
NotificationCenter

EmptyState
ErrorState
LoadingSkeleton
PermissionDeniedState
```

---

# 267. COMPONENT REUSE PRINCIPLE

A booking shown in:

* dashboard
* calendar
* list
* customer detail

should reuse the same status mapping and core booking data definitions.

Do not create unrelated state colors per page.

---

# 268. STATUS TOKEN CONSISTENCY

One state:

one semantic mapping.

Example:

Confirmed booking:

same status color/label in:

* booking list
* calendar sheet
* dashboard
* detail page.

---

# 269. FINANCIAL COMPONENT CONSISTENCY

Money formatting must be centralized.

Example:

€1,250.00 vs Italian locale formatting.

Use locale/currency utilities.

Do not manually write formatting in each component.

---

# 270. OPERATOR DESIGN QUALITY BAR

The product should feel credible to someone currently using:

* paper calendar
* WhatsApp
* Excel
* generic booking tools

while being dramatically easier to understand than complex enterprise fleet systems.

---

# 271. OPERATOR DASHBOARD QUALITY CHECK

Should answer:

* what happens today?
* what needs action?
* how do I create a booking?

within seconds.

---

# 272. CALENDAR QUALITY CHECK

Should answer:

* which boat?
* when?
* customer?
* event type?
* conflict?

without opening every event.

---

# 273. BOOKING DETAIL QUALITY CHECK

Should answer:

* who?
* what boat?
* when?
* paid?
* skipper?
* what action now?

immediately.

---

# 274. FLEET QUALITY CHECK

Should answer:

* which boats are available?
* which published?
* which have compliance problems?
* what's next?

---

# 275. COMPLIANCE QUALITY CHECK

Should answer:

* am I bookable?
* what is missing?
* which boat/person?
* what do I need to do?

No raw bureaucracy.

---

# 276. PAYMENTS QUALITY CHECK

Should answer:

* what did customer pay?
* what is Boatly commission?
* what is operator amount?
* refund?
* payout?

without pretending to be bank accounting.

---

# 277. ANALYTICS QUALITY CHECK

Every chart should answer a business question.

If chart exists only because dashboard looks empty:

remove it.

---

# 278. OPERATOR UI ANTI-PATTERNS

Avoid:

* giant dark main canvas
* gradients in KPI cards
* different color per event type without restraint
* ten widgets above the calendar
* tiny calendar rows
* hidden manual booking flow
* manual bookings treated as second-class
* financial fields editable without authority
* giant spreadsheet-like forms
* excessive nested tabs
* 15 modal layers
* raw enum names
* compliance pages full of legal jargon
* mobile timeline squeezed from desktop

---

# 279. CORE DAILY OPERATOR FLOW

Ideal:

```text
LOGIN
↓
TODAY
↓
CALENDAR
↓
BOOKING
↓
START
↓
COMPLETE
```

Direct lead:

```text
PHONE / WHATSAPP
↓
+ NUOVA PRENOTAZIONE
↓
CUSTOMER
↓
BOAT / TIME
↓
AVAILABILITY
↓
SAVE
↓
CALENDAR
```

---

# 280. OPERATOR UI FINAL CHARACTER

Boatly for operators should feel:

**Fast like operational software.**

**Clear like modern consumer software.**

**Structured like professional SaaS.**

**Warm enough to remain Boatly.**

Not:

cold enterprise software.

---

# 281. B5 COMPLETION CRITERIA

B5 is complete when Boatly has high-fidelity operator specifications for:

* desktop shell
* sidebar
* topbar
* workspace switcher
* location selector
* dashboard
* KPIs
* today's bookings
* action-required areas
* quick actions
* fleet calendar
* calendar filters/views
* calendar event types
* booking quick-detail sheet
* blocks/conflicts
* booking list
* booking filters
* manual booking
* quick customer creation
* availability check
* manual payment
* booking detail
* rental start/complete
* cancellation
* booking timeline
* marketplace/manual financial summaries
* fleet list
* boat overview
* boat information
* specifications
* engine information
* legal offerings
* photos
* amenities
* pricing
* price preview
* extras
* availability
* publication
* locations
* CRM
* staff
* skippers
* documents
* compliance
* payments
* payouts
* commercial plans
* analytics
* reviews
* contracts
* company profile
* settings
* notifications
* loading
* empty
* error
* permission states
* operational mobile intent
* accessibility
* operator component inventory
* operator quality gates

B6 defines the high-fidelity Boatly Admin workspace.

B7 performs the final responsive/mobile reconciliation across Marketplace, Operator and Admin.
