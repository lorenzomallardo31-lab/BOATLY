# BOATLY — RESPONSIVE & MOBILE

**Version:** 1.0
**Status:** Phase B — Final Responsive Specification
**Applies to:** Marketplace + Customer + Operator + Admin
**Primary language:** Italian
**Design system:** DESIGN_SYSTEM.md
**Wireframes:** WIREFRAMES.md
**Marketplace UI:** MARKETPLACE_UI.md
**Operator UI:** OPERATOR_UI.md
**Admin UI:** ADMIN_UI.md

---

# 1. PURPOSE

This document defines the responsive behavior of Boatly across:

* mobile
* large mobile
* tablet
* laptop
* desktop
* large desktop

It defines how:

* navigation changes
* layouts collapse
* grids adapt
* tables transform
* maps behave
* calendars change
* forms stack
* sticky actions work
* drawers/sheets replace desktop panels
* content priority changes
* touch interaction changes
* safe areas are handled
* accessibility is preserved

The goal is not to create a smaller desktop interface.

The goal is to create the best Boatly interface for each viewport.

---

# 2. RESPONSIVE PRINCIPLE

Boatly follows:

**SAME PRODUCT**

but

**DIFFERENT INTERACTION MODEL**

depending on available space.

Desktop may show:

list + map.

Mobile may show:

list OR map.

Desktop may show:

fleet timeline.

Mobile may show:

agenda.

Desktop may show:

financial comparison in columns.

Mobile may show:

stacked sections.

Responsive adaptation is structural, not merely cosmetic.

---

# 3. MOBILE-FIRST IMPLEMENTATION

CSS implementation should generally follow a mobile-first approach.

Start with the smallest practical layout.

Then progressively enhance at larger breakpoints.

Avoid writing the desktop page first and overriding hundreds of styles later.

---

# 4. CORE BREAKPOINTS

Primary Tailwind-style breakpoints:

```text
sm     640px
md     768px
lg     1024px
xl     1280px
2xl    1536px
```

These are implementation anchors.

Layouts should respond to actual content needs rather than treating every device inside a breakpoint as identical.

---

# 5. PRACTICAL VIEWPORT GROUPS

## Mobile

Below 640px.

Typical:

320–639px.

## Large Mobile / Small Tablet

640–767px.

## Tablet

768–1023px.

## Laptop / Small Desktop

1024–1279px.

## Desktop

1280–1535px.

## Large Desktop

1536px+.

---

# 6. MINIMUM SUPPORTED WIDTH

Target minimum practical viewport:

320px.

The interface must not require horizontal page scrolling at 320px except deliberate horizontal components such as controlled tables/timelines.

---

# 7. CONTAINER PADDING

## Mobile

16px.

## Small Tablet

20px.

## Tablet

24px.

## Desktop

32px.

Large full-width operational views may use 24px.

---

# 8. SAFE AREAS

Sticky mobile controls must respect:

* `env(safe-area-inset-top)`
* `env(safe-area-inset-bottom)`
* left/right safe areas where relevant

Especially:

* iPhone bottom CTA
* mobile bottom navigation
* full-screen map
* mobile sheets

---

# 9. TOUCH TARGETS

Primary touch target minimum:

approximately 44×44px.

Applies to:

* icon buttons
* close controls
* favorite
* map controls
* navigation
* calendar actions
* overflow menus

Visual icon may remain 18–20px inside larger touch target.

---

# 10. HOVER IS OPTIONAL

No critical action or information may depend exclusively on hover.

Desktop hover is enhancement only.

Mobile must expose equivalent action through:

* tap
* visible button
* menu
* accessible sheet

---

# 11. RESPONSIVE TYPOGRAPHY

Typography does not scale proportionally at every size.

Marketing headings reduce significantly.

Operational headings reduce modestly.

Body text remains generally 16px for mobile readability.

---

# 12. MOBILE DISPLAY XL

Desktop:

64px.

Mobile target:

40–42px.

Line height:

44–46px.

Do not use 64px hero typography on phone.

---

# 13. MOBILE H1

Target:

32–36px.

Operational page title:

24–28px.

---

# 14. MOBILE BODY

Default:

16px / 24px.

Do not reduce standard body to 13px to fit more content.

---

# 15. MOBILE META

Minimum essential metadata:

12–14px.

Never use tiny unreadable text to preserve desktop density.

---

# 16. GRID RESPONSIVENESS

Desktop:

12-column.

Tablet:

8-column.

Mobile:

4-column.

Not every screen must literally expose CSS grid columns.

This is a layout planning system.

---

# 17. RESPONSIVE SPACING

Mobile major section:

48–64px.

Desktop marketplace major section:

80–120px.

Mobile dashboard sections:

20–24px.

Desktop dashboard:

24–32px.

---

# 18. RESPONSIVE RADIUS

Major cards remain approximately:

16px mobile

16–20px desktop.

Do not reduce radius to zero merely because screen is smaller.

Full-screen sheets can naturally touch viewport edges.

---

# 19. RESPONSIVE SHADOW

Mobile:

use shadows more sparingly.

Edges and surface separation may rely more on:

* borders
* spacing
* background

because heavy shadows consume visual space.

---

# 20. GLOBAL MOBILE HEADER

Typical height:

60–64px.

Structure:

```text
← / Logo         Page title / context       Action
```

Keep visible actions limited.

---

# 21. MOBILE BACK NAVIGATION

Deep pages should provide clear back navigation.

Do not rely exclusively on browser gesture/back button.

---

# 22. MOBILE OVERFLOW MENU

When many actions exist:

show primary action

*

`⋯`

for secondary actions.

Avoid placing five tiny buttons in one row.

---

# 23. BOTTOM SHEET

Preferred mobile pattern for:

* filters
* sort
* quick search
* passenger selector
* booking quick detail
* short configuration

Sheets should:

* be dismissible
* have visible title
* support safe areas
* maintain focus correctly

---

# 24. FULL-SCREEN MOBILE FLOW

Use full-screen/mobile page rather than sheet for:

* checkout
* operator manual booking
* long forms
* document review
* complex verification

---

# 25. STICKY MOBILE CTA

Use when the action is central and frequent.

Examples:

* Cerca
* Verifica disponibilità
* Prenota
* Nuova prenotazione
* Avvia noleggio
* Completa noleggio

Do not create sticky CTA for every screen.

---

# 26. STICKY CTA SAFE AREA

Bottom padding:

control height

*

safe-area inset.

Content must include sufficient bottom padding so final fields are never hidden behind sticky bar.

---

# 27. KEYBOARD / MOBILE FORMS

When software keyboard opens:

* focused input remains visible
* sticky CTA must not cover it
* dialogs/sheets remain usable

Avoid fixed-height forms that break when keyboard appears.

---

# 28. FORM INPUT MOBILE

Minimum control height:

44–48px.

Marketplace major controls:

52–56px.

---

# 29. FORM FIELD STACKING

Mobile default:

one column.

Two-column fields only when both remain comfortably usable.

Example:

start time + duration may sometimes share row.

Name/surname should stack if narrow.

---

# 30. LONG LABELS

Allow wrapping.

Never truncate essential form labels just to preserve desktop alignment.

---

# 31. RESPONSIVE IMAGES

Use responsive `sizes`.

Avoid downloading desktop-resolution assets unnecessarily on mobile.

Maintain defined aspect ratio to avoid layout shift.

---

# 32. MARKETPLACE NAV — DESKTOP

At `lg/xl+`:

full navigation.

Contains:

* logo
* selected main links
* operator CTA
* account/favorites

---

# 33. MARKETPLACE NAV — TABLET

Reduce optional links.

Possible:

logo

Destinazioni

Come funziona

operator CTA

account/menu.

---

# 34. MARKETPLACE NAV — MOBILE

Only essential:

```text
Boatly                       Account/Menu
```

Optional dedicated favorite link can move inside menu/account.

---

# 35. MARKETPLACE MOBILE MENU

Sheet/drawer.

Contains:

* Destinazioni
* Categorie
* Come funziona
* Preferiti
* Prenotazioni/account
* Sei un noleggiatore?
* Supporto

---

# 36. HOMEPAGE HERO — DESKTOP

Large headline.

Large editorial image.

Full signature search bar.

---

# 37. HOMEPAGE HERO — TABLET

Headline reduced.

Search may become:

2×2 layout

or compact stacked object.

Photography remains prominent.

---

# 38. HOMEPAGE HERO — MOBILE

Preferred structure:

```text
Il mare,
a portata di prenotazione.

Supporting copy

┌────────────────────────┐
│ Dove vuoi andare?      │
│ Data · Persone         │
│                        │
│ [ Cerca una barca ]    │
└────────────────────────┘

Large photo
```

Do not show four tiny horizontal search fields.

---

# 39. MOBILE HERO SEARCH

Collapsed search card opens dedicated search experience.

Steps can be:

1. destination
2. date
3. duration
4. passengers

or one stacked sheet.

---

# 40. MOBILE SEARCH SHEET

Full-height or near-full-height.

Header:

`Cerca una barca`

Sections:

* Dove
* Quando
* Durata
* Persone

Sticky bottom:

`Mostra risultati`.

---

# 41. MOBILE LOCATION AUTOCOMPLETE

Full width.

Suggestions easier to tap.

Rows:

56–60px.

Popular destinations before text search if empty.

---

# 42. MOBILE DATE PICKER

Prefer one month visible vertically.

Allow scrolling/month navigation.

Touch targets large.

No two-month cramped calendar.

---

# 43. MOBILE DURATION PICKER

Vertical choice list/cards.

Selected state clear.

---

# 44. MOBILE PASSENGER PICKER

Large plus/minus controls.

Avoid tiny stepper.

---

# 45. HOMEPAGE DESTINATION GRID

Desktop:

4 columns.

Tablet:

2–3.

Mobile:

either:

1-column large cards

or:

horizontal scroll cards.

Preferred discovery behavior:

horizontal scroll with card width ~78–85vw for editorial destinations

if implementation remains accessible.

---

# 46. HOMEPAGE BOAT GRID

Desktop:

3.

Tablet:

2.

Mobile:

1 column.

Horizontal carousel may be used only for secondary homepage discovery sections.

Primary inventory pages remain vertical.

---

# 47. HOW IT WORKS MOBILE

Three steps stack vertically.

Do not compress three columns into tiny text.

---

# 48. OPERATOR CTA MOBILE — HOMEPAGE

Navy section.

Content stacks:

headline

copy

CTA

optional visual.

---

# 49. FOOTER MOBILE

Accordion or stacked sections.

Brand first.

Then:

Marketplace

Noleggiatori

Supporto

Legale.

No five narrow columns.

---

# 50. SEARCH RESULTS DESKTOP

List + map simultaneously.

---

# 51. SEARCH RESULTS TABLET

At approximately 768–1023:

default may remain list.

Map accessed via toggle if split becomes too narrow.

At larger tablet landscape, split can be enabled if usable.

---

# 52. SEARCH RESULTS MOBILE

Default:

list only.

Floating/sticky toggle:

`Mappa`.

---

# 53. MOBILE SEARCH SUMMARY

Top compact card/bar:

```text
Napoli
28 ago · 8 ore · 6 persone
[Modifica]
```

Avoid repeating full hero search.

---

# 54. MOBILE FILTER BAR

Sticky below search summary where useful.

Visible:

`Filtri`

`Ordina`

Potential one important filter.

All others inside sheet.

---

# 55. MOBILE ACTIVE FILTER COUNT

Example:

`Filtri (3)`.

---

# 56. MOBILE FILTER SHEET

Full-height/large bottom sheet.

Sections stack.

Sticky footer:

`Cancella`

`Mostra 42 risultati`.

---

# 57. MOBILE PRICE FILTER

Use inputs + slider with enough width.

Do not create tiny dual-thumb controls.

---

# 58. MOBILE BOAT TYPE FILTER

2-column choice cards if enough width.

At 320px:

1 column acceptable.

---

# 59. MOBILE SEARCH CARD

Vertical BoatCard.

Structure:

```text
[        IMAGE         ] ♡

Joker Boat Clubman 21
Pozzuoli

8 persone · 115 CV

Senza patente
Skipper disponibile

★ 4,9 (42)

da €320 / giorno
```

---

# 60. MOBILE BOAT CARD IMAGE

4:3.

Full card width.

Radius:

16–18px.

Favorite overlay.

---

# 61. MOBILE CARD INFO DENSITY

Show only:

* name
* location
* 2–3 facts
* important licence/skipper labels
* rating
* price

Do not show full specifications.

---

# 62. MOBILE MAP VIEW

Full-screen.

```text
← Lista            Filtri

[ MAP ]

€320    €280
       €350

[ Selected Boat Card ]
```

---

# 63. MOBILE MAP SELECTED CARD

Bottom floating card.

Height:

roughly 120–160px.

Contains:

thumbnail

name

price

rating.

Tap:

boat detail.

---

# 64. MAP SAFE CONTROLS

Top controls must respect safe area.

Bottom selected card must not overlap Mapbox attribution/legal controls.

---

# 65. BOAT DETAIL DESKTOP

Gallery + two-column content/sidebar.

---

# 66. BOAT DETAIL TABLET

Gallery remains.

Booking sidebar may reduce width.

At narrow tablet:

booking card moves below top key facts rather than staying tiny.

---

# 67. BOAT DETAIL MOBILE

Single column.

Order:

1. gallery
2. title
3. rating/location
4. key facts
5. licence/skipper
6. description
7. amenities
8. extras
9. policies
10. location
11. operator
12. reviews

---

# 68. MOBILE DETAIL TOPBAR

Transparent/white depending scroll.

Actions:

back

favorite

share.

Title may appear after scroll.

---

# 69. MOBILE DETAIL GALLERY

Swipeable horizontal carousel.

First image occupies width.

Indicator:

`1 / 18`.

Fullscreen viewer on tap.

---

# 70. MOBILE KEY FACTS

2×2 or horizontally scrollable facts only if accessible.

Preferred:

2-column grid.

---

# 71. MOBILE LICENCE PANEL

Full-width.

Do not bury below description.

Eligibility information remains high priority.

---

# 72. MOBILE AMENITIES

2-column.

`Mostra tutti`.

---

# 73. MOBILE DETAIL STICKY BAR

Bottom:

```text
da €320 / giorno      [Verifica disponibilità]
```

Height:

approximately 72–80px including safe area.

---

# 74. MOBILE STICKY PRICE

Do not show misleading starting price after exact quote exists.

When calculated:

show exact relevant amount.

---

# 75. MOBILE BOOKING SELECTOR

Tapping CTA may open:

full-screen/sheet selection flow for:

* date
* time
* duration
* passengers

Then:

continue checkout.

---

# 76. OPERATOR PUBLIC PROFILE MOBILE

Cover.

Logo/name.

Rating.

About.

Locations.

Fleet.

Reviews.

No desktop side columns.

---

# 77. DESTINATION PAGE MOBILE

Hero shorter.

Search prominent.

Inventory appears before long content.

SEO text stacked below marketplace content.

---

# 78. CATEGORY PAGE MOBILE

Same priority:

search

inventory

useful explanatory content.

---

# 79. AUTH DESKTOP

Centered/split.

---

# 80. AUTH MOBILE

Full-width page.

No floating narrow card necessary.

Use:

16–20px horizontal padding.

Brand/logo top.

Form below.

---

# 81. CHECKOUT DESKTOP

65/35 main + summary.

---

# 82. CHECKOUT TABLET

Main approximately 60%.

Summary 40%.

If too narrow:

summary moves below/above relevant step.

---

# 83. CHECKOUT MOBILE

Single column.

Top:

progress.

Main step.

Price summary collapsible or section before final CTA.

---

# 84. MOBILE CHECKOUT PROGRESS

Do not show five labels in tiny row.

Preferred:

```text
Passaggio 2 di 5
Extra

████████░░
```

Optional previous/next labels.

---

# 85. MOBILE CHECKOUT SUMMARY

Compact collapsible header:

```text
Totale €460        Vedi dettagli
```

Expanded:

price breakdown.

Final step shows full summary permanently.

---

# 86. MOBILE FINAL PAYMENT CTA

Sticky only after user has seen required terms/summary.

Example:

`Prenota e paga €460`.

Must respect safe area.

---

# 87. MOBILE PAYMENT PROCESSING

Centered.

Minimal.

No sticky navigation.

---

# 88. MOBILE CONFIRMATION

Single column.

Booking code.

Trip card.

Actions full-width.

What happens next.

---

# 89. CUSTOMER ACCOUNT DESKTOP

Light sidebar.

---

# 90. CUSTOMER ACCOUNT TABLET

Sidebar can remain compact or switch to top/tab menu.

---

# 91. CUSTOMER ACCOUNT MOBILE

No permanent sidebar.

Account root:

menu list.

Sub-pages:

top back header.

---

# 92. MOBILE CUSTOMER ACCOUNT HOME

Next booking first.

Then:

* Preferiti
* Recensioni
* Pagamenti
* Profilo

as simple list/cards.

---

# 93. MOBILE BOOKINGS LIST

Booking cards.

Do not use table.

---

# 94. MOBILE BOOKING CARD

Image optional/compact.

Information priority:

status

date

boat

location

amount

CTA.

---

# 95. MOBILE CUSTOMER BOOKING DETAIL

Single column.

Primary booking state immediately visible.

Actions:

full-width or sticky when appropriate.

---

# 96. OPERATOR DESKTOP SHELL

264px sidebar + topbar + workspace.

---

# 97. OPERATOR TABLET SHELL

At `<lg`:

sidebar collapses to drawer or icon rail if genuinely useful.

Preferred:

drawer with topbar hamburger.

Main content full width.

---

# 98. OPERATOR MOBILE SHELL

Primary daily navigation should not use desktop drawer for every action.

Preferred mobile bottom navigation:

* Home
* Calendario
* Prenotazioni
* Flotta
* Altro

---

# 99. OPERATOR MOBILE BOTTOM NAV HEIGHT

Approximately:

60–68px

plus safe-area bottom.

---

# 100. MOBILE BOTTOM NAV ITEM

Icon:

20–22px.

Label:

11–12px.

Selected:

Navy/Aqua.

Maximum:

5 items.

---

# 101. OPERATOR MOBILE "ALTRO"

Opens sheet/page containing:

* Clienti
* Staff
* Skipper
* Documenti
* Compliance
* Pagamenti
* Analytics
* Azienda
* Impostazioni

---

# 102. OPERATOR MOBILE TOPBAR

Contains:

workspace/location context.

Notifications/account.

Avoid duplicating bottom nav.

---

# 103. OPERATOR DASHBOARD DESKTOP

4 KPIs + today bookings + action panels.

---

# 104. OPERATOR DASHBOARD TABLET

2×2 KPIs.

Bookings full width.

Secondary panels stacked/2-column based width.

---

# 105. OPERATOR DASHBOARD MOBILE

Priority:

1. action required
2. next booking
3. today's bookings
4. quick actions

KPIs simplified.

---

# 106. MOBILE OPERATOR HOME

Example:

```text
Buongiorno, Mario

[ + Nuova prenotazione ]

Oggi
8 prenotazioni

Prossima
10:00 Blue Wave 21
Mario Rossi

Azioni richieste
2 documenti

Prenotazioni di oggi
...
```

---

# 107. MOBILE QUICK ACTIONS

Primary:

`Nuova prenotazione`.

Secondary:

`Blocca calendario`.

`Aggiungi barca` can move under Flotta.

---

# 108. FLEET CALENDAR DESKTOP

Full multi-boat timeline.

---

# 109. FLEET CALENDAR TABLET

Landscape tablet may show condensed timeline.

Portrait:

agenda/day view preferred.

---

# 110. FLEET CALENDAR MOBILE

Default:

Agenda.

Not scaled timeline.

---

# 111. MOBILE CALENDAR HEADER

```text
<   28 agosto   >

Oggi

[Tutte le barche ▼]
```

---

# 112. MOBILE CALENDAR AGENDA

Group by time.

Example:

```text
10:00

Blue Wave 21
Mario Rossi
10:00–18:00
Boatly · Confermata

11:00

Joker 24
Manuale
11:00–14:00
```

---

# 113. MOBILE CALENDAR EVENT

Tap:

bottom sheet.

Contains:

main details

primary state action

`Apri prenotazione`.

---

# 114. MOBILE CALENDAR FILTERS

Sheet:

* boat
* location
* source
* event type

---

# 115. MOBILE NEW BLOCK

Short full-screen/sheet form.

Boat.

Start/end.

Reason.

Save.

---

# 116. BOOKING LIST DESKTOP

Table.

---

# 117. BOOKING LIST TABLET

Table with reduced columns.

Hide less important:

* total
* some secondary status

Use row detail.

---

# 118. BOOKING LIST MOBILE

Cards.

No horizontal 9-column table.

---

# 119. MOBILE OPERATOR BOOKING CARD

```text
10:00–18:00

Mario Rossi
Blue Wave 21

Boatly
Confermata · Pagata

€460

[Apri]
```

---

# 120. MOBILE BOOKING FILTERS

Search field.

Filter button.

Date quick selector.

Additional filter sheet.

---

# 121. MANUAL BOOKING DESKTOP

Single page 65/35 summary.

---

# 122. MANUAL BOOKING TABLET

Stack form + summary or 60/40 depending orientation.

---

# 123. MANUAL BOOKING MOBILE

Step-based preferred.

Example:

1. Cliente
2. Barca e orario
3. Extra
4. Pagamento
5. Riepilogo

---

# 124. MOBILE MANUAL BOOKING PROGRESS

`2 di 5 — Barca e orario`.

Do not use long tiny step circles.

---

# 125. MOBILE CUSTOMER SELECTOR

Full-screen searchable list.

`+ Nuovo cliente` visible.

---

# 126. MOBILE BOAT SELECTOR

Cards/rows:

boat

location

availability/status.

---

# 127. MOBILE AVAILABILITY ERROR

Full-width inline panel.

Show exact conflict.

Do not hide error in toast only.

---

# 128. MOBILE MANUAL BOOKING FINAL

Full summary.

CTA:

`Crea prenotazione`.

No sticky CTA before validation complete.

---

# 129. OPERATOR BOOKING DETAIL DESKTOP

Main + financial sidebar.

---

# 130. OPERATOR BOOKING DETAIL MOBILE

Single column.

Priority:

1. status
2. time/boat
3. customer
4. primary action
5. skipper
6. payment
7. extras
8. contract
9. timeline

---

# 131. MOBILE BOOKING PRIMARY ACTION

Sticky bottom if state-driven:

`Avvia noleggio`

or:

`Completa noleggio`.

Secondary:

overflow.

---

# 132. MOBILE CUSTOMER CONTACT

Provide:

Call

Email/copy

only when appropriate.

Large buttons.

---

# 133. FLEET DESKTOP

Table/list hybrid.

---

# 134. FLEET TABLET

Condensed table/list.

---

# 135. FLEET MOBILE

Cards/rows.

Each:

thumbnail

boat name

today state

publication

compliance

next booking.

---

# 136. MOBILE FLEET CARD

Example:

```text
[img] Blue Wave 21
      Pozzuoli

In noleggio fino alle 18:00

Pubblicata
Compliance ✓

Prossima: domani 10:00

[Apri]
```

---

# 137. BOAT MANAGEMENT DESKTOP

Left secondary navigation.

---

# 138. BOAT MANAGEMENT TABLET

Left subnav may collapse to horizontal dropdown/tabs where limited.

Preferred:

selectable section menu.

---

# 139. BOAT MANAGEMENT MOBILE

No permanent boat sub-sidebar.

Top:

boat name/status.

Section selector:

`Panoramica ▼`.

Opens sheet/list of sections.

---

# 140. MOBILE BOAT FORMS

Single column.

Sticky save bar only when necessary.

Show unsaved state.

---

# 141. MOBILE PHOTO MANAGER

2-column image grid.

Tap image for actions.

Reordering may use explicit:

`Sposta`

or drag if mobile implementation is reliable.

---

# 142. MOBILE PRICING

Rate-plan cards.

Pricing rules as stacked cards.

No wide table.

---

# 143. MOBILE PRICE PREVIEW

Full-width card.

Date/duration controls stacked.

---

# 144. MOBILE AVAILABILITY EDITOR

Each weekday card/row.

Example:

```text
Lunedì        Attivo

09:00  → 19:00
```

---

# 145. CRM DESKTOP

Table.

---

# 146. CRM MOBILE

Search-first list.

Customer rows/cards.

No unnecessary columns.

---

# 147. MOBILE CUSTOMER DETAIL — OPERATOR

Contact actions high.

Next booking.

History.

Notes.

---

# 148. STAFF MOBILE

Card list.

Role/status.

Overflow actions.

Invitation full-screen/simple form.

---

# 149. SKIPPER MOBILE

Card list.

Availability + compliance both visible.

Tap detail.

---

# 150. DOCUMENTS DESKTOP

Table.

---

# 151. DOCUMENTS MOBILE

Cards grouped by urgency.

Priority:

* rejected
* expired
* expiring
* under review
* approved

---

# 152. MOBILE DOCUMENT CARD

Shows:

entity

document

status

expiry

action.

---

# 153. MOBILE DOCUMENT UPLOAD

Native file/photo selection.

Show progress.

Do not assume drag-and-drop.

---

# 154. COMPLIANCE DESKTOP

Dashboard/table.

---

# 155. COMPLIANCE MOBILE

Summary first:

`Marketplace attivo/bloccato`.

Then:

action-required items.

Other compliant entities collapse below.

---

# 156. MOBILE COMPLIANCE PRIORITY

Do not show 50 green approved rows before one expired document.

Action-needed items first.

---

# 157. PAYMENTS DESKTOP

Metrics + table.

---

# 158. PAYMENTS TABLET

Reduced columns.

---

# 159. PAYMENTS MOBILE

Financial cards/list.

Each:

booking

amount

commission

operator amount

status.

---

# 160. MOBILE PAYMENT DETAIL

Stack:

customer amount

commission

refund

operator amount

provider state.

---

# 161. PAYOUT MOBILE

Simple provider-status summary + history cards.

No complex banking dashboard.

---

# 162. ANALYTICS DESKTOP

KPI row + charts/tables.

---

# 163. ANALYTICS TABLET

2-column charts.

---

# 164. ANALYTICS MOBILE

One chart per row.

KPI cards 2-column where readable.

Tables become ranking cards.

---

# 165. MOBILE CHART HEIGHT

Approximately:

220–300px.

Ensure labels remain readable.

No tiny chart squeezing.

---

# 166. ADMIN DESKTOP

Primary target.

Full sidebar.

Tables.

Review workspaces.

---

# 167. ADMIN TABLET

Sidebar drawer.

Tables reduce columns.

Review panels may become stacked.

---

# 168. ADMIN MOBILE

Secondary-use experience.

Focus:

* queues
* lookup
* status
* low-risk actions

Not full desktop parity through compression.

---

# 169. ADMIN MOBILE NAV

Hamburger opens drawer.

Groups remain:

Platform

Finanza

Trust/Compliance

Operations.

---

# 170. ADMIN DASHBOARD MOBILE

Priority:

urgent queues.

Example:

```text
12 Noleggiatori da verificare
5 Barche da verificare
2 Pagamenti da riconciliare
7 Segnalazioni aperte
```

Secondary metrics below.

---

# 171. ADMIN TABLE MOBILE

Convert to cards.

Example operator card:

```text
Mario Boat Rental

Da verificare
Compliance: 1 problema
Stripe: pronto

12 barche · Pozzuoli

[Apri]
```

---

# 172. ADMIN VERIFICATION DESKTOP

Main evidence + sticky decision panel.

---

# 173. ADMIN VERIFICATION TABLET

Evidence full width.

Decision panel below or collapsible side drawer.

---

# 174. ADMIN VERIFICATION MOBILE

Single column.

Decision controls after evidence summary.

High-risk approval/rejection can require deliberate final confirmation.

---

# 175. MOBILE DOCUMENT REVIEW

Document preview full-width.

Metadata below.

Decision after evidence.

No tiny split-screen PDF.

---

# 176. MOBILE PAYMENT RECONCILIATION

Stack rows:

```text
Importo
Boatly €460
Stripe €460
✓

Stato
Boatly In verifica
Stripe succeeded
!
```

Do not force desktop comparison table.

---

# 177. MOBILE ADMIN HIGH-RISK ACTION

Refund/suspension/role assignment:

full-screen confirmation flow preferred.

Do not hide important impact inside tiny modal.

---

# 178. ADMIN AUDIT MOBILE

Cards/list.

Tap opens detail.

Before/after stacked.

---

# 179. ADMIN SETTINGS MOBILE

View allowed.

Complex global configuration may be desktop-preferred.

Mobile actions can be limited if safe UX cannot be guaranteed.

---

# 180. TABLE RESPONSIVE PRIORITY

When reducing columns:

retain:

* identity
* status
* primary operational datum
* action

Remove secondary metadata first.

---

# 181. DESKTOP TABLE → TABLET

Possible:

9 columns

→ 6 columns.

---

# 182. TABLET TABLE → MOBILE

6 columns

→ card/list.

Do not hide critical status.

---

# 183. RESPONSIVE DRAWER RULE

Drawer should never become permanent state for critical data.

Quick detail:

drawer.

Deep work:

page.

---

# 184. RESPONSIVE MODAL RULE

At mobile widths:

many desktop dialogs become bottom sheets/full-screen dialogs.

---

# 185. DIALOG MOBILE WIDTH

Nearly full width:

calc(100% - 24/32px)

unless full-screen.

---

# 186. MOBILE DIALOG BUTTONS

For destructive confirmations:

stack buttons if horizontal row becomes cramped.

Primary/destructive action last.

---

# 187. TOAST MOBILE

Position:

top or above bottom navigation/sticky CTA.

Must not hide primary controls.

---

# 188. NOTIFICATION POPOVER MOBILE

Desktop popover becomes:

full-screen/sheet notification center.

---

# 189. PAGINATION MOBILE

Prefer:

Previous / Next

plus page context.

Avoid 10 page-number buttons.

---

# 190. MOBILE SORTING

Sort opens sheet/select.

Do not show wide dropdown in narrow header.

---

# 191. BREADCRUMBS MOBILE

Usually replace with:

back button

*

page title.

Do not wrap 4-level breadcrumbs over several lines.

---

# 192. RESPONSIVE EMPTY STATES

Mobile:

smaller icon.

Reduced vertical whitespace.

Action full-width where appropriate.

---

# 193. RESPONSIVE ERROR STATES

Keep error near failed content.

Avoid full-screen takeover for local errors.

---

# 194. OFFLINE / CONNECTION ERRORS

If detected:

clear message.

Do not fake successful write.

Example:

`Connessione non disponibile. La prenotazione non è stata modificata.`

---

# 195. MOBILE PERFORMANCE PRIORITY

Avoid:

* huge client JS
* unnecessary animation
* loading large desktop images
* rendering off-screen map unnecessarily
* loading massive dashboard datasets

---

# 196. MAP MOBILE PERFORMANCE

Do not mount map if user remains in list view unless architecture benefits justify it.

Potential lazy map initialization.

---

# 197. CALENDAR MOBILE PERFORMANCE

Load only necessary date range.

Do not fetch entire fleet annual calendar.

---

# 198. MOBILE DATA USAGE

Optimize operator mobile workflows because operators may work at marinas with unstable connectivity.

Prioritize:

* compact payloads
* resilient loading states
* clear retry
* no fake optimistic success for critical writes

---

# 199. RESPONSIVE ACCESSIBILITY

Responsive changes must preserve:

* keyboard order
* labels
* screen-reader structure
* focus
* status meaning

DOM order should generally match visual reading order.

---

# 200. MOBILE FOCUS MANAGEMENT

Opening sheet:

focus moves inside.

Closing:

returns to triggering control.

---

# 201. MOBILE SCREEN READER NAV

Bottom nav items have explicit names.

Active destination announced where possible.

---

# 202. ORIENTATION

Do not require landscape orientation.

Tablet landscape can enhance:

* calendar
* map/list
* admin tables

but portrait remains usable.

---

# 203. MOBILE ROTATION

Layouts should reflow cleanly if user rotates device.

Do not lock orientation.

---

# 204. ZOOM

Do not disable browser pinch zoom.

Viewport configuration must permit accessibility zoom.

---

# 205. MOBILE INPUT FONT SIZE

Inputs should generally use 16px text to prevent problematic browser auto-zoom behavior and maintain readability.

---

# 206. STICKY STACKING CONTEXT

Coordinate:

navbar

filter bar

sticky CTA

bottom nav

sheets.

Avoid overlapping z-index chaos.

---

# 207. RESPONSIVE Z-INDEX LAYERS

Conceptual order:

```text
base content
sticky headers
dropdowns
floating controls
drawers/sheets
dialogs
toasts
critical overlays
```

Actual tokens defined during implementation.

---

# 208. FULL-SCREEN MAP Z-INDEX

Must not appear above open filter sheet/dialog.

---

# 209. RESPONSIVE CONTENT PRIORITY — MARKETPLACE

Mobile priority:

1. search
2. image
3. price
4. suitability
5. CTA
6. trust
7. secondary details

---

# 210. RESPONSIVE CONTENT PRIORITY — OPERATOR

Mobile priority:

1. today
2. next booking
3. primary action
4. conflicts
5. customer/boat
6. payment
7. secondary management

---

# 211. RESPONSIVE CONTENT PRIORITY — ADMIN

Mobile priority:

1. urgent queue
2. status
3. issue
4. evidence summary
5. safe action
6. history

---

# 212. RESPONSIVE CONTENT THAT MAY BE DEFERRED

On smaller screens secondary information can move to:

* accordion
* detail page
* overflow
* sheet

But must never disappear if operationally necessary.

---

# 213. NO MOBILE FEATURE LOSS FOR CRITICAL TASKS

Critical customer tasks must remain possible on mobile:

* search
* booking
* payment
* cancellation
* booking access

Critical operator mobile tasks:

* view booking
* manual booking
* calendar
* rental state
* contact
* blocks

Admin complex desktop workflows can be secondary but must remain safe if exposed.

---

# 214. RESPONSIVE SEO

Mobile and desktop render semantically equivalent primary content.

Do not hide important SEO/customer content only because viewport is small.

---

# 215. RESPONSIVE TEST MATRIX

At minimum manually/test automatically at:

```text
320 × 568
375 × 667
390 × 844
430 × 932
768 × 1024
820 × 1180
1024 × 768
1280 × 800
1440 × 900
1536 × 960
1920 × 1080
```

These are representative test sizes, not exclusive supported devices.

---

# 216. MOBILE CUSTOMER TEST FLOWS

Test fully at ~375–390px:

1. homepage search
2. filter search
3. map switch
4. boat detail
5. availability
6. checkout
7. payment-processing state
8. confirmation
9. booking account
10. cancellation

---

# 217. MOBILE OPERATOR TEST FLOWS

Test:

1. dashboard
2. agenda
3. booking detail
4. start rental
5. complete rental
6. manual booking
7. customer contact
8. block calendar
9. fleet card
10. compliance warning

---

# 218. TABLET OPERATOR TEST FLOWS

Test portrait and landscape:

* fleet calendar
* booking table
* boat management
* pricing
* CRM
* documents

---

# 219. ADMIN TEST FLOWS

Desktop primary:

* operator verification
* boat verification
* payment reconciliation
* refund
* document review
* compliance
* audit

Mobile:

* urgent queue
* lookup
* evidence inspection
* low-risk action.

---

# 220. OVERFLOW TEST

At every target viewport verify:

* no accidental horizontal page scroll
* no clipped text
* no off-screen CTA
* no inaccessible dropdown
* no hidden modal button
* no sticky overlap

---

# 221. LONG CONTENT TEST

Test:

* long boat name
* long operator name
* long customer name
* long Italian/German/English translation future
* large price
* large booking count

Layouts must not depend on short placeholder strings.

---

# 222. EMPTY CONTENT TEST

Test no:

* boats
* bookings
* reviews
* payments
* documents
* notifications

Layout should remain intentional.

---

# 223. ERROR CONTENT TEST

Test:

* API error
* map failure
* image failure
* payment mismatch
* booking conflict
* permission denied

---

# 224. LOADING TEST

Test slow connections.

Skeletons must preserve structure.

No large cumulative layout shift.

---

# 225. LARGE TEXT ACCESSIBILITY TEST

Test browser/system larger text where practical.

Primary action and content should remain usable.

---

# 226. KEYBOARD TEST

Desktop/tablet:

all primary flows keyboard accessible.

---

# 227. REDUCED MOTION TEST

With reduced motion:

no critical workflow becomes confusing.

---

# 228. MOBILE SAFE AREA TEST

Test modern iPhone-style safe areas.

Verify:

* bottom nav
* sticky CTA
* full-screen sheet
* map controls

---

# 229. RESPONSIVE DESIGN REVIEW — MARKETPLACE

Before accepting:

Can a customer book comfortably with one hand?

Is price always understandable?

Does map remain optional?

Are images large enough?

Is search still the primary action?

---

# 230. RESPONSIVE DESIGN REVIEW — OPERATOR

Before accepting:

Can an operator use it at the marina?

Can they see the next rental immediately?

Can they create manual booking quickly?

Can they contact customer without navigating through many screens?

---

# 231. RESPONSIVE DESIGN REVIEW — ADMIN

Before accepting:

Is important context preserved?

Are dangerous actions deliberate?

Is evidence readable?

Would desktop be recommended when complexity requires it?

---

# 232. AI RESPONSIVE RULES

Any AI generating Boatly UI must:

1. start mobile-first;
2. follow defined breakpoints;
3. not simply shrink desktop;
4. transform tables to cards where defined;
5. transform list/map to list-or-map on mobile;
6. transform fleet timeline to agenda on mobile;
7. transform sidebars to mobile navigation/drawers;
8. preserve sticky CTA safe areas;
9. use 44px+ touch targets;
10. preserve 16px primary body/input readability;
11. avoid horizontal overflow;
12. test 320px width;
13. preserve accessibility;
14. not hide critical functionality;
15. respect content priority defined here.

---

# 233. RESPONSIVE COMPONENT INVENTORY

Components requiring explicit responsive variants:

```text
MarketplaceNavbar
MarketplaceMobileMenu

HeroSearchBar
MobileSearchLauncher
MobileSearchSheet

FilterBar
MobileFilterToolbar
FilterSheet

BoatCard
HorizontalBoatCard

MapPanel
MobileMapView
MobileBoatPreview

BoatGallery
MobileBoatGallery
BookingSidebar
MobileBookingBar

CheckoutProgress
MobileCheckoutProgress
CheckoutSummary
MobileCheckoutSummary

CustomerAccountNav
CustomerMobileAccountMenu

OperatorSidebar
OperatorMobileNav
OperatorTopbar

OperatorStatCard
TodayBookingList

FleetCalendar
FleetAgenda
CalendarEventSheet

BookingTable
OperatorBookingCard

ManualBookingForm
MobileManualBookingSteps

FleetTable
MobileFleetCard

BoatManagementNav
MobileBoatSectionSelector

CustomerTable
MobileCustomerRow

DocumentTable
MobileDocumentCard

ComplianceDashboard
MobileComplianceSummary

PaymentTable
MobilePaymentCard

AnalyticsChart

AdminSidebar
AdminMobileDrawer

AdminTable
AdminMobileCard

VerificationWorkspace
MobileVerificationFlow

PaymentReconciliationComparison
MobileReconciliationStack

HighRiskConfirmationDialog
MobileHighRiskConfirmation
```

---

# 234. RESPONSIVE SOURCE OF TRUTH

When a responsive implementation question occurs, consult:

1. RESPONSIVE_MOBILE.md
2. specific high-fidelity UI file
3. DESIGN_SYSTEM.md
4. WIREFRAMES.md
5. USER_FLOWS.md

Do not invent layout behavior without checking these files.

---

# 235. B7 FINAL PRODUCT MODEL

Boatly responsive behavior is:

## Marketplace

Desktop:

**Discover with space.**

Mobile:

**Book with focus.**

## Operator

Desktop:

**Manage the whole operation.**

Mobile:

**Run today's operation.**

## Admin

Desktop:

**Investigate and control.**

Mobile:

**Inspect and respond safely.**

---

# 236. B7 COMPLETION CRITERIA

B7 is complete when Boatly has defined:

* breakpoint strategy
* minimum viewport
* responsive containers
* mobile typography
* touch targets
* safe areas
* responsive forms
* responsive navbar
* homepage mobile behavior
* search mobile behavior
* filters mobile behavior
* map/list transformation
* mobile BoatCards
* mobile boat detail
* sticky booking CTA
* destination/category responsiveness
* mobile authentication
* mobile checkout
* mobile confirmation
* customer account responsiveness
* operator sidebar transformation
* operator bottom navigation
* operator mobile dashboard
* fleet calendar → mobile agenda
* operator booking cards
* manual booking mobile flow
* operator booking detail mobile
* fleet mobile
* boat-management mobile
* CRM mobile
* staff/skipper mobile
* documents/compliance mobile
* payments/payout mobile
* analytics mobile
* admin drawer
* admin mobile queues
* admin table → card transformation
* verification responsiveness
* document review responsiveness
* payment reconciliation responsiveness
* high-risk mobile behavior
* loading/error/empty responsiveness
* responsive accessibility
* performance considerations
* safe-area handling
* responsive test matrix
* customer mobile test flows
* operator mobile test flows
* admin responsive test flows
* AI responsive-generation rules
* cross-device quality gates

This document completes the responsive design foundation for Boatly.
