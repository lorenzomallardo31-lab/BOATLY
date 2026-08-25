# BOATLY — WIREFRAMES

**Version:** 1.0
**Status:** Phase B — Approved Structural Wireframe Specification
**Design fidelity:** Low / Mid fidelity structure
**Applies to:** Marketplace + Customer + Operator + Admin
**Primary language:** Italian

---

# 1. PURPOSE

This document defines the structural layout of Boatly screens before high-fidelity visual design.

It defines:

* page hierarchy
* navigation
* content order
* major components
* page sections
* sticky elements
* primary actions
* secondary actions
* empty/loading/error positions
* desktop structure
* mobile structural intent

It does NOT yet define:

* final photography
* final illustrations
* exact micro-animation
* final Mapbox style
* final icon placement for every field
* final production copy
* final component implementation

Those are refined during B4, B5, B6 and B7.

---

# 2. WIREFRAME PRINCIPLE

Each screen must answer immediately:

1. Where am I?
2. What information matters most?
3. What is the primary action?
4. What can I do next?
5. What happens if there is no data?
6. What happens on mobile?

---

# 3. PRODUCT SHELLS

Boatly has four principal interface shells:

1. Public Marketplace
2. Customer Account
3. Operator Workspace
4. Admin Workspace

They share the same brand but use different navigation structures.

---

# 4. PUBLIC MARKETPLACE SHELL

Desktop:

```text
┌─────────────────────────────────────────────────────────────┐
│ LOGO        Destinazioni   Come funziona      Noleggiatore │
│                                         Preferiti  Account │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                     PAGE CONTENT                            │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ Footer                                                      │
└─────────────────────────────────────────────────────────────┘
```

Navbar remains simple.

Primary customer focus:

search + discovery.

---

# 5. MARKETPLACE HEADER

Desktop header contains:

Left:

* Boatly logo

Center / optional navigation:

* Destinazioni
* Categorie
* Come funziona

Right:

* Preferiti when authenticated
* "Sei un noleggiatore?"
* Account / Accedi

Do not overload header with many links.

---

# 6. MARKETPLACE MOBILE HEADER

```text
┌──────────────────────────┐
│ Boatly             ☰ / ○ │
└──────────────────────────┘
```

Potential visible actions:

* logo
* account
* menu

Do not display the entire desktop navigation.

---

# 7. HOMEPAGE — OBJECTIVE

Homepage must achieve four things quickly:

1. explain Boatly
2. let user search immediately
3. create desire through destination/boat imagery
4. introduce trust

Operator acquisition remains secondary.

---

# 8. HOMEPAGE — DESKTOP WIREFRAME

```text
┌──────────────────────────────────────────────────────────────┐
│ NAVBAR                                                       │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ HERO                                                         │
│                                                              │
│ Il mare, a portata di prenotazione.                          │
│ Supporting copy                                              │
│                                                              │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ Dove │ Quando │ Durata │ Persone │      CERCA           │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                              │
│                           HERO PHOTO                         │
├──────────────────────────────────────────────────────────────┤
│ TRUST / VALUE STRIP                                          │
│ Disponibilità reale │ Prezzi chiari │ Prenotazione online   │
├──────────────────────────────────────────────────────────────┤
│ DESTINAZIONI POPOLARI                                        │
│ [Card] [Card] [Card] [Card]                                 │
├──────────────────────────────────────────────────────────────┤
│ BARCHE IN EVIDENZA / VICINO A DESTINAZIONE                  │
│ [Boat] [Boat] [Boat]                                        │
├──────────────────────────────────────────────────────────────┤
│ COME FUNZIONA                                                │
│ 1 Cerca  →  2 Scegli  →  3 Prenota                          │
├──────────────────────────────────────────────────────────────┤
│ CATEGORY DISCOVERY                                           │
│ Gommoni │ Barche │ Catamarani │ Yacht                       │
├──────────────────────────────────────────────────────────────┤
│ OPERATOR SECTION                                             │
│ "Tutta la tua flotta. Un solo posto."                        │
│ [Scopri Boatly per noleggiatori]                             │
├──────────────────────────────────────────────────────────────┤
│ FINAL CTA / DESTINATION DISCOVERY                            │
├──────────────────────────────────────────────────────────────┤
│ FOOTER                                                       │
└──────────────────────────────────────────────────────────────┘
```

---

# 9. HOMEPAGE HERO

Hierarchy:

1. H1
2. supporting description
3. search bar
4. visual image/environment

The search must be immediately usable without requiring scrolling on common desktop sizes.

---

# 10. HOMEPAGE TRUST STRIP

Keep concise.

Potential items:

* Disponibilità aggiornata
* Prezzi trasparenti
* Pagamento online
* Recensioni da prenotazioni verificate

Do not use fake "100% guaranteed" badges.

---

# 11. DESTINATION CARDS

Each destination card:

```text
┌──────────────────┐
│                  │
│      PHOTO       │
│                  │
│ Napoli           │
│ 48 barche        │
└──────────────────┘
```

Exact inventory count shown only if useful and accurate.

---

# 12. CATEGORY CARDS

Visual categories should make discovery simple.

Examples:

* Gommone
* Barca a motore
* Catamarano
* Yacht
* Barca a vela

Click:

category search/landing.

---

# 13. SEARCH RESULTS — DESKTOP

Primary desktop structure:

```text
┌─────────────────────────────────────────────────────────────────────┐
│ NAV                                                                │
├─────────────────────────────────────────────────────────────────────┤
│ Compact Search Bar                                                  │
├─────────────────────────────────────────────────────────────────────┤
│ Filters: Tipo  Prezzo  Patente  Skipper  Servizi  Altri filtri     │
├───────────────────────────────┬─────────────────────────────────────┤
│                               │                                     │
│  126 barche                   │                                     │
│  Sort                         │                                     │
│                               │              MAP                    │
│  ┌─────────────────────────┐  │                                     │
│  │ Boat Card               │  │                                     │
│  └─────────────────────────┘  │                                     │
│                               │                                     │
│  ┌─────────────────────────┐  │                                     │
│  │ Boat Card               │  │                                     │
│  └─────────────────────────┘  │                                     │
│                               │                                     │
│  ┌─────────────────────────┐  │                                     │
│  │ Boat Card               │  │                                     │
│  └─────────────────────────┘  │                                     │
│                               │                                     │
└───────────────────────────────┴─────────────────────────────────────┘
```

Recommended desktop split:

approximately 55% results / 45% map.

Map can remain sticky/full viewport below header.

---

# 14. SEARCH RESULTS HEADER

Contains:

* search summary
* result count
* sort selector
* filter bar

Search summary example:

`Napoli · 28 agosto · 10:00 · 8 ore · 6 persone`

CTA:

`Modifica ricerca`

---

# 15. SEARCH FILTER STRUCTURE

Quick visible filters:

* Tipo
* Prezzo
* Patente
* Skipper
* Posti
* Servizi

Additional:

`Altri filtri`

opens filter sheet/dialog.

---

# 16. SEARCH FILTER PANEL

Desktop modal/sheet:

```text
┌──────────────────────────────────────────┐
│ Filtri                              X   │
├──────────────────────────────────────────┤
│ Fascia di prezzo                        │
│ [ slider / fields ]                     │
│                                          │
│ Tipo di barca                           │
│ [ choice cards ]                        │
│                                          │
│ Patente                                 │
│ [ Senza patente / ... ]                 │
│                                          │
│ Skipper                                 │
│ [ options ]                             │
│                                          │
│ Posti                                   │
│                                          │
│ Servizi                                 │
│                                          │
├──────────────────────────────────────────┤
│ Cancella tutto       Mostra 42 risultati│
└──────────────────────────────────────────┘
```

---

# 17. SEARCH RESULT BOAT CARD — DESKTOP

Potential horizontal card:

```text
┌──────────────┬──────────────────────────────┐
│              │ Gommone                     │
│    IMAGE     │ Joker Boat Clubman 21   ♡   │
│              │ Pozzuoli                    │
│              │                              │
│              │ 8 persone · 115 CV           │
│              │ Skipper disponibile          │
│              │                              │
│              │ ★ 4,9 (42)          da €320 │
└──────────────┴──────────────────────────────┘
```

Desktop can use horizontal cards in map view.

Standalone category/landing grids may use vertical cards.

---

# 18. SEARCH RESULT — MOBILE

Mobile should NOT show simultaneous map/list split.

Default:

```text
┌──────────────────────────┐
│ ← Napoli                 │
│ 28 ago · 6 persone       │
├──────────────────────────┤
│ Filtri     Ordina        │
├──────────────────────────┤
│ [Boat Card]              │
│                          │
│ [Boat Card]              │
│                          │
│ [Boat Card]              │
│                          │
│        [ Mappa ]         │ ← floating
└──────────────────────────┘
```

Map becomes dedicated view.

---

# 19. MOBILE MAP VIEW

```text
┌──────────────────────────┐
│ ←        MAPPA      Filtri│
│                          │
│        PRICE PINS        │
│                          │
│                          │
│                          │
├──────────────────────────┤
│ Selected Boat Preview    │
│ photo / name / price     │
└──────────────────────────┘
```

Action:

`Lista`

returns to list.

---

# 20. ZERO SEARCH RESULTS

Structure:

```text
No boat illustration/icon

Nessuna barca disponibile

Prova a:
• cambiare data
• aumentare la distanza
• rimuovere alcuni filtri

[Modifica ricerca]
[Reset filtri]
```

Potential nearby suggestions below.

---

# 21. BOAT DETAIL — DESKTOP

```text
┌─────────────────────────────────────────────────────────────────┐
│ NAV                                                             │
├─────────────────────────────────────────────────────────────────┤
│ Breadcrumb                                                      │
│                                                                 │
│ Joker Boat Clubman 21                             ♡ Condividi   │
│ Pozzuoli · ★4,9 (42)                                           │
│                                                                 │
│ ┌──────────────────────────────┬──────────────┬───────────────┐ │
│ │                              │ image        │ image         │ │
│ │         MAIN IMAGE           ├──────────────┼───────────────┤ │
│ │                              │ image        │ image         │ │
│ └──────────────────────────────┴──────────────┴───────────────┘ │
├──────────────────────────────────────┬──────────────────────────┤
│ MAIN CONTENT                         │ BOOKING CARD             │
│                                      │ sticky                   │
│ Overview                             │                          │
│ Specs                                │ da €320                  │
│                                      │ Date                     │
│ Description                          │ Duration                 │
│                                      │ Passengers               │
│ Patente / Skipper                    │                          │
│                                      │ [Verifica disponibilità]│
│ Amenities                            │                          │
│                                      │ Deposit note             │
│ Extras                               │ Cancellation summary     │
│                                      │                          │
│ Location / map                       │                          │
│                                      │                          │
│ Operator                             │                          │
│                                      │                          │
│ Reviews                              │                          │
└──────────────────────────────────────┴──────────────────────────┘
```

---

# 22. BOAT DETAIL — INFORMATION ORDER

Recommended main content order:

1. key facts
2. description
3. licence / skipper / legal explanation
4. amenities
5. extras
6. cancellation/fuel/deposit
7. pickup location
8. operator
9. reviews

Reason:

customer should understand suitability before scrolling to secondary trust content.

---

# 23. BOAT KEY FACTS

Compact grid:

* passengers
* length
* horsepower
* boat type
* licence requirement
* skipper

Do not expose every database field.

---

# 24. LICENCE / SKIPPER PANEL

High-importance section.

Example structure:

```text
Patente e conduzione

✓ Senza patente nelle condizioni indicate
or
Patente nautica richiesta

Skipper
Disponibile su richiesta

[Come funzionano i requisiti]
```

Legal details available without overwhelming the customer.

---

# 25. BOOKING SIDEBAR

Sticky desktop card.

Contains:

* starting/calculated price
* date
* starting time
* duration
* passengers
* availability CTA
* cancellation summary
* deposit summary

Once dates are selected:

show updated price.

---

# 26. BOAT DETAIL MOBILE

Single column:

1. top bar
2. swipe gallery
3. title/rating/favorite
4. key attributes
5. description
6. licence/skipper
7. amenities
8. extras
9. location
10. operator
11. reviews

Persistent bottom CTA:

```text
€320 / giorno        [Verifica disponibilità]
```

---

# 27. OPERATOR PUBLIC PROFILE

```text
┌──────────────────────────────────────────────────────┐
│ Operator cover                                      │
├──────────────────────────────────────────────────────┤
│ Logo  Mario Boat Rental                             │
│ ★4,8 · Pozzuoli                                     │
│ [verified information where legitimate]             │
├──────────────────────────────────────────────────────┤
│ About operator                                      │
├──────────────────────────────────────────────────────┤
│ Locations                                           │
├──────────────────────────────────────────────────────┤
│ Fleet                                               │
│ [Boat][Boat][Boat]                                  │
├──────────────────────────────────────────────────────┤
│ Reviews                                             │
└──────────────────────────────────────────────────────┘
```

Do not expose private company information.

---

# 28. DESTINATION PAGE

```text
Hero destination image/title

Napoli
"Scopri le barche disponibili..."

Search bar

Popular categories

Available boats

Area/map overview

Useful destination content

Nearby destinations

SEO/supporting content
```

Marketplace utility always comes before long SEO text.

---

# 29. CATEGORY PAGE

Example:

`Gommoni`

Structure:

* title + short explanation
* search/location input
* relevant inventory
* popular destinations
* practical information
* FAQs where useful

---

# 30. INFORMATIONAL PAGE TEMPLATE

For:

* Come funziona
* marketplace transparency
* reviews policy
* accessibility
* support explanations

Structure:

```text
Page title
Short intro
Table of contents where long
Main readable column
Contextual CTA/support
```

Max text width controlled.

---

# 31. AUTH — LOGIN

Desktop centered card or split layout.

```text
┌──────────────────────────────────────────────┐
│ Boatly                                      │
│                                              │
│ Bentornato                                   │
│                                              │
│ Email                                       │
│ [____________________________]              │
│ Password                                    │
│ [____________________________]              │
│                                              │
│ [ Accedi ]                                  │
│                                              │
│ Password dimenticata                        │
│                                              │
│ Non hai un account? Registrati              │
└──────────────────────────────────────────────┘
```

Avoid excessive marketing around authentication.

---

# 32. CUSTOMER REGISTRATION

Fields only necessary initially.

Possible:

* first name
* last name
* email
* password

Required Terms acceptance separated from marketing.

---

# 33. OPERATOR REGISTRATION ENTRY

Separate intent.

Page explains:

`Crea il tuo account professionale`

and sends user into operator onboarding after auth.

---

# 34. CHECKOUT SHELL

Checkout removes unnecessary marketplace navigation distractions.

Desktop:

```text
┌───────────────────────────────────────────────┐
│ Boatly                     Checkout sicuro   │
├───────────────────────────────────────────────┤
│                                               │
│ STEP / CONTENT             BOOKING SUMMARY   │
│                                               │
│                                               │
└───────────────────────────────────────────────┘
```

---

# 35. CHECKOUT PROGRESS

Conceptual steps:

1. Requisiti
2. Extra
3. Dati
4. Riepilogo
5. Pagamento

Progress should be visible but not overly complex.

---

# 36. CHECKOUT — REQUIREMENTS

Show:

* date/time
* passengers
* licence requirement
* driver information if necessary
* skipper selection if applicable

If customer is not eligible:

stop with explanation before payment.

---

# 37. CHECKOUT — EXTRAS

List available extras.

Each item:

```text
[icon/photo optional]
Snorkeling
Descrizione
€20
[- 1 +]
```

Mandatory extras clearly marked.

---

# 38. CHECKOUT — CUSTOMER DATA

Form sections:

* booking contact
* driver information where required
* special requests

Avoid asking for unnecessary duplicate profile data.

---

# 39. CHECKOUT — SUMMARY

Main column:

* booking details
* operator
* boat
* passengers
* extras
* policies
* Terms

Side card:

price breakdown.

Final CTA:

explicit payment obligation.

---

# 40. CHECKOUT — PAYMENT PROCESSING

After provider return:

```text
[spinner/progress]

Stiamo verificando il pagamento

Non chiudere questa pagina se non necessario.

La prenotazione sarà confermata
quando riceveremo conferma del pagamento.
```

Do not show confirmed state prematurely.

---

# 41. CHECKOUT — CONFIRMATION

```text
✓ Prenotazione confermata

BT-2026-XXXXXX

Boat
Date
Location

[ Vedi prenotazione ]
[ Scarica contratto ]

What happens next
```

No aggressive cross-selling.

---

# 42. CUSTOMER ACCOUNT SHELL

Desktop:

```text
┌──────────────────────────────────────────────────────────┐
│ MARKETPLACE NAV                                          │
├───────────────┬──────────────────────────────────────────┤
│ Account Nav   │ CONTENT                                  │
│               │                                          │
│ Panoramica    │                                          │
│ Prenotazioni  │                                          │
│ Preferiti     │                                          │
│ Recensioni    │                                          │
│ Pagamenti     │                                          │
│ Notifiche     │                                          │
│ Profilo       │                                          │
│ Sicurezza     │                                          │
└───────────────┴──────────────────────────────────────────┘
```

On mobile:

account navigation becomes list/menu rather than permanent sidebar.

---

# 43. CUSTOMER ACCOUNT DASHBOARD

Sections:

* next booking
* recent bookings
* favorites preview
* notifications/action needed

Keep simple.

Customers are not professional dashboard users.

---

# 44. CUSTOMER BOOKINGS LIST

Tabs/filters:

* Prossime
* Passate
* Annullate

Booking card contains:

* boat image
* date
* location
* status
* operator
* amount
* CTA

---

# 45. CUSTOMER BOOKING DETAIL

Structure:

```text
Booking Header
Status + booking code

Boat / date / location

Actions:
[Contract]
[Cancellation if eligible]
[Support]

Trip details

Passenger / skipper info

Price breakdown

Payment / refund

Cancellation terms

Operator

Booking event/info where useful
```

Do not expose internal technical events.

---

# 46. CUSTOMER FAVORITES

Responsive grid of BoatCards.

Empty:

`Non hai ancora salvato nessuna barca.`

CTA:

`Scopri le barche`

---

# 47. CUSTOMER REVIEWS

Two sections:

* Da recensire
* Recensioni pubblicate

Eligible bookings should clearly prompt review.

---

# 48. CUSTOMER PAYMENTS

Simple financial history.

Not accounting software.

Each:

* booking
* date
* total
* payment status
* refund if relevant

---

# 49. OPERATOR WORKSPACE — DESKTOP SHELL

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
│ Workspace     │                                                │
│ Impostazioni  │                                                │
└───────────────┴────────────────────────────────────────────────┘
```

Sidebar approximately 264px.

---

# 50. OPERATOR TOPBAR

Contains where useful:

* workspace/operator
* location selector
* notifications
* account menu

Do not repeat full page navigation in topbar.

---

# 51. OPERATOR DASHBOARD

Objective:

show what matters today.

```text
Page title: Buongiorno, Mario

[ Oggi: 8 prenotazioni ]
[ Flotta occupata: 12/18 ]
[ Incassi periodo ]
[ Azioni richieste: 3 ]

┌──────────────────────────────┬──────────────────────────┐
│ Prenotazioni di oggi         │ Prossime attività       │
│                              │                          │
└──────────────────────────────┴──────────────────────────┘

┌──────────────────────────────┬──────────────────────────┐
│ Utilizzo flotta              │ Documenti da rinnovare  │
└──────────────────────────────┴──────────────────────────┘
```

Primary CTA:

`+ Nuova prenotazione`

because manual booking is central.

---

# 52. OPERATOR DASHBOARD ACTIONS

Quick actions:

* Nuova prenotazione
* Blocca calendario
* Aggiungi barca

Do not overload dashboard with 12 shortcuts.

---

# 53. FLEET CALENDAR — DESKTOP

One of Boatly's most important screens.

```text
┌────────────────────────────────────────────────────────────────┐
│ Calendario                 [Oggi] [<] 28 Ago [>]   [+ Booking] │
│ Sede: Tutte                  Giorno | Settimana                 │
├─────────────────┬──────────────────────────────────────────────┤
│ Barca           │ 08 09 10 11 12 13 14 15 16 17 18 19        │
├─────────────────┼──────────────────────────────────────────────┤
│ Blue Wave 21    │    [Booking────────────]                    │
│ Joker 24        │       [Manual────]     [Maintenance]        │
│ Gommone 07      │ [Booking────]                                 │
│ Catamaran 01    │                  [Transfer]                  │
└─────────────────┴──────────────────────────────────────────────┘
```

Left boat column sticky.

Time/date header sticky where useful.

---

# 54. CALENDAR FILTERS

Filters:

* location
* boat
* event type
* booking source
* status

Views:

* Day
* Week
* potentially Month/Agenda depending implementation

Do not force month grid if operationally weak.

---

# 55. CALENDAR EVENT CLICK

Click event:

open side sheet / quick detail.

Contains:

* booking source
* boat
* customer
* interval
* status
* payment
* skipper
* key actions
* `Apri prenotazione`

---

# 56. OPERATOR CALENDAR MOBILE

Not full timeline.

Default agenda:

```text
Oggi — 28 Agosto

Blue Wave 21
10:00 – 18:00
Mario Rossi
Confermata

Joker 24
11:00 – 14:00
Prenotazione manuale

[ + Prenotazione ]
```

Can filter by boat/day.

---

# 57. OPERATOR BOOKINGS LIST

Page header:

`Prenotazioni`

Primary CTA:

`+ Nuova prenotazione`

Controls:

* date range
* source
* status
* location
* boat
* search customer/code

Table:

```text
Codice
Cliente
Barca
Data
Fonte
Stato
Totale
Pagamento
Azioni
```

---

# 58. BOOKING LIST SOURCE

Use clear source badge:

`Boatly`

or:

`Manuale`

Both remain first-class operational bookings.

---

# 59. MANUAL BOOKING CREATION

Prefer dedicated form / wizard.

```text
Nuova prenotazione

1 Cliente
2 Barca e orario
3 Extra
4 Pagamento
5 Riepilogo
```

Could also be one intelligent page if implementation remains simple.

---

# 60. MANUAL BOOKING — CUSTOMER

Search existing CRM customer.

If not found:

`+ Nuovo cliente`

Quick customer form.

Do not force operator to first leave booking and create customer elsewhere.

---

# 61. MANUAL BOOKING — BOAT / TIME

Select:

* location
* boat
* date
* start
* duration/end
* passengers

Availability should be checked inline.

Conflict:

show exact conflict before save.

---

# 62. MANUAL BOOKING — PAYMENT

Choices:

* Da pagare
* Contanti
* Bonifico
* Carta in sede
* Altro

Clearly label:

`Pagamento registrato manualmente`

not Stripe-verified.

---

# 63. OPERATOR BOOKING DETAIL

Desktop:

```text
Header:
Booking code + status + source
Actions

Main column:
Customer
Boat
Trip
Passengers
Extras
Skipper
Notes
Contract

Right side:
Price
Payment
Commission
Operator amount
Cancellation
```

Timeline / event history near bottom.

---

# 64. BOOKING DETAIL ACTIONS

Depending state/role:

* Avvia noleggio
* Completa
* Assegna skipper
* Modifica operational details
* Annulla
* Rimborso/request where permitted
* Contact/support

Do not display impossible actions.

---

# 65. OPERATOR FLEET LIST

Header:

`Flotta`

CTA:

`+ Aggiungi barca`

Views:

cards or table toggle possible.

Recommended default desktop:

structured list/card hybrid.

Each boat:

* image
* name
* location
* capacity
* publication status
* compliance summary
* today's state
* next booking
* actions

---

# 66. FLEET STATUS FILTERS

* Tutte
* Pubblicate
* Bozze
* In revisione
* In pausa
* Compliance richiesta
* Archiviate

---

# 67. ADD BOAT WIZARD

Steps:

1. Informazioni
2. Specifiche
3. Motore
4. Offerta legale
5. Sede
6. Foto
7. Servizi
8. Prezzi
9. Extra
10. Disponibilità
11. Documenti
12. Revisione

UI may group these into fewer visible high-level phases.

Avoid showing 12 tiny steps simultaneously.

---

# 68. BOAT MANAGEMENT SHELL

Desktop:

```text
Blue Wave 21             Pubblicata
Pozzuoli                  [Anteprima]

[ Informazioni ]
[ Specifiche ]
[ Offerta legale ]
[ Foto ]
[ Servizi ]
[ Prezzi ]
[ Extra ]
[ Disponibilità ]
[ Calendario ]
[ Documenti ]
[ Compliance ]
[ Pubblicazione ]

-----------------------------------------
Current section content
```

If horizontal nav becomes too long:

use left secondary navigation.

---

# 69. BOAT INFORMATION FORM

Sections:

* public name
* description
* category
* model/brand/year
* location
* capacity
* deposit/fuel where appropriate

Save state visible.

---

# 70. BOAT ENGINE FORM

Fields grouped logically:

* manufacturer/model
* power kW
* horsepower
* displacement
* type/cycle
* fuel
* navigation restrictions

Explain fields that influence licence eligibility.

---

# 71. LEGAL OFFERING CONFIGURATION

This is not casual marketing UI.

Structure:

```text
Offerta legale

[ LOCAZIONE ]
Status: Approvata

[ LOCAZIONE CON COMANDANTE ]
Status: Non configurata

[ NOLEGGIO ]
Status: Richiede revisione
```

Each:

* explanation
* requirements
* state
* action

---

# 72. BOAT PHOTOS

Grid upload manager.

First image = cover.

Allow drag reorder.

Show photo-quality guidance.

---

# 73. BOAT AMENITIES

Searchable/checklist category groups.

Examples:

Comfort

Navigation

Entertainment

Water equipment

Safety-related public features

---

# 74. BOAT PRICING PAGE

Main structure:

```text
Rate plans
[ + Nuova tariffa ]

Full day          €320
Half day          €200

Pricing rules
Summer 01 Jun–31 Aug      +20%
Weekend                     +10%

Date overrides
15 Aug                    €450
```

Do not show raw formulas unless useful.

---

# 75. BOAT EXTRAS PAGE

Assigned extras.

CTA:

`Aggiungi extra`

Each:

* name
* pricing
* mandatory
* active
* edit/remove assignment

---

# 76. BOAT AVAILABILITY PAGE

Weekly recurring schedule.

```text
Lun  09:00 — 19:00
Mar  09:00 — 19:00
...
```

Date validity / seasonal differences where supported.

Calendar blocks handled in calendar, not duplicated confusingly.

---

# 77. BOAT DOCUMENTS

Document cards/table:

* type
* status
* expiry
* file
* review note
* action

CTA:

`Carica documento`

---

# 78. BOAT COMPLIANCE

Summary:

```text
Marketplace eligibility: BLOCCATA

3 requisiti completati
1 requisito mancante

✓ Assicurazione
✓ Documento commerciale
✓ ...
! Documento X mancante
```

Explain exactly what prevents publication.

---

# 79. BOAT PUBLICATION PAGE

Checklist.

```text
Informazioni        ✓
Foto                ✓
Prezzi              ✓
Disponibilità       ✓
Documenti           !
Compliance          !

[Invia per revisione] disabled
```

When complete:

CTA active.

---

# 80. OPERATOR LOCATIONS LIST

Cards or table:

* location name
* marina
* boats count
* status
* today's bookings
* actions

CTA:

`+ Nuova sede`

---

# 81. OPERATOR LOCATION DETAIL

Sections:

* basic information
* address/map
* contact
* operating hours
* assigned boats

---

# 82. CRM CUSTOMERS LIST

Header:

`Clienti`

CTA:

`+ Nuovo cliente`

Search.

Filters:

* recent
* marketplace/direct
* bookings count

Table:

* customer
* phone/email
* last booking
* bookings
* total managed value optional
* source relationship

---

# 83. CRM CUSTOMER DETAIL

Header:

customer name/contact.

Sections:

* upcoming booking
* booking history
* notes
* contact details
* associated Boatly profile where applicable

Do not create excessive CRM complexity in MVP.

---

# 84. STAFF LIST

Table/cards:

* person
* email
* role
* status
* last/active state where useful
* actions

CTA:

`Invita collaboratore`

---

# 85. STAFF INVITATION

Small focused dialog/page:

* email
* role
* permission explanation

If role = OWNER:

strong warning and additional protection.

---

# 86. SKIPPER LIST

Contains:

* name
* qualification status
* availability today
* next assignment
* document state

CTA:

`+ Aggiungi skipper`

---

# 87. SKIPPER DETAIL

Sections:

* contact
* qualifications
* documents
* schedule
* upcoming assignments
* notes

---

# 88. EXTRAS MANAGEMENT

Operator reusable extras library.

Table:

* name
* pricing type
* amount
* mandatory
* assigned boats
* status

---

# 89. OPERATOR PAYMENTS PAGE

KPI strip:

* paid this period
* refunds
* platform commission
* operator amount

Table:

* booking
* payment
* date
* customer amount
* Boatly commission
* refund
* operator amount
* status

---

# 90. OPERATOR PAYOUT PAGE

Show:

* connected Stripe state
* upcoming/last payout
* payout history
* processing states

No confusing wallet balance unless actually supported by provider model.

---

# 91. OPERATOR PLAN PAGE

Current plan card.

Example:

```text
PRO
€49 / mese
Commissione marketplace 10%

Included features
Fleet limits
Locations
Staff
...

[Gestisci piano]
```

Pilot Founding Operator clearly shows temporary/pilot status.

---

# 92. OPERATOR ANALYTICS

Header:

date range + location.

First row:

* bookings
* Marketplace GMV
* Managed Booking Volume
* occupancy

Second:

* trend chart
* marketplace/manual split

Below:

* top boats
* cancellations
* bookings by location

No rainbow chart dashboard.

---

# 93. OPERATOR REVIEWS

Summary:

rating average

count.

List reviews.

Filters.

Operators do not receive hidden "delete bad review" action.

---

# 94. OPERATOR DOCUMENTS GLOBAL PAGE

Aggregates compliance documents across:

* business
* boats
* skippers

Useful filters:

* expiring
* rejected
* under review
* type
* boat

---

# 95. OPERATOR COMPLIANCE DASHBOARD

Critical operator page.

```text
Compliance

[ Marketplace eligibility: ATTIVA ]

Action needed
2 documents expire soon

Operator
✓ complete

Boats
Blue Wave       ✓
Joker 24        ! expires
Catamaran       X missing document

Skippers
...
```

---

# 96. OPERATOR CONTRACTS LIST

Table:

* booking code
* customer
* boat
* date
* contract type
* generated status
* actions

---

# 97. OPERATOR BUSINESS PROFILE

Sections:

Public profile:

* name
* description
* media
* contact shown publicly

Legal data:

separate page.

Do not mix public marketing copy with tax profile form.

---

# 98. OPERATOR SETTINGS

Categories:

* General
* Cancellation policies
* Notifications
* Security
* Plan/billing link
* potentially users/roles link

---

# 99. ADMIN DESKTOP SHELL

Similar structural concept to Operator but more restrained.

```text
┌─────────────────┬──────────────────────────────────────────────┐
│ BOATLY ADMIN    │ TOPBAR                                       │
│                 ├──────────────────────────────────────────────┤
│ Dashboard       │                                              │
│ Utenti          │ PAGE                                         │
│ Noleggiatori    │                                              │
│ Barche          │                                              │
│ Prenotazioni    │                                              │
│ Pagamenti       │                                              │
│ Compliance      │                                              │
│ Segnalazioni    │                                              │
│ DAC7            │                                              │
│ Audit           │                                              │
└─────────────────┴──────────────────────────────────────────────┘
```

Admin is workflow-focused.

---

# 100. ADMIN DASHBOARD

Show action queues before vanity metrics.

Top:

* pending operators
* boats pending review
* compliance issues
* failed payment/reconciliation issues
* content reports

Secondary:

* bookings today
* GMV
* active operators
* active boats

---

# 101. ADMIN USERS LIST

Filters:

* account status
* platform role
* date

Columns:

* user
* email
* joined
* account state
* platform roles
* actions

---

# 102. ADMIN USER DETAIL

Sections:

* identity/profile
* account status
* operator memberships
* platform roles where permitted
* bookings summary
* support history
* audit-relevant actions

Sensitive data only for role-authorized admin.

---

# 103. ADMIN OPERATORS LIST

Tabs/filters:

* Pending
* Approved
* Suspended
* Rejected
* Compliance issues

Columns:

* operator
* legal name
* locations
* boats
* onboarding state
* compliance
* payment onboarding
* marketplace eligibility

---

# 104. ADMIN OPERATOR VERIFICATION

Recommended review layout:

```text
Header:
Operator + status

Left / Main:
Business
Legal/tax
Locations
Documents
Stripe readiness
Compliance

Right:
Review summary
Missing issues
Decision

[Request correction]
[Reject]
[Approve]
```

Require reason for rejection/correction.

---

# 105. ADMIN BOATS LIST

Filters:

* pending
* published
* paused
* compliance blocked
* rejected

Columns:

* boat
* operator
* location
* legal offering
* compliance
* status
* updated
* action

---

# 106. ADMIN BOAT VERIFICATION

Review:

* public listing preview
* specs
* engine data
* legal offering
* documents
* compliance
* operator eligibility

Decision panel:

* approve
* request changes
* reject

---

# 107. ADMIN BOOKINGS

Powerful search/filter.

Filters:

* code
* customer
* operator
* boat
* source
* status
* date
* payment status

Admin booking detail includes:

* booking
* payment
* refund
* occupancy
* legal contract
* booking events
* audit references where needed

---

# 108. ADMIN PAYMENTS

Finance-focused table.

Filters:

* status
* operator
* date
* amount
* booking
* Stripe ID/reference

Highlight:

reconciliation issues.

---

# 109. ADMIN PAYMENT DETAIL

Panels:

Internal booking

Internal payment

Stripe references

Refunds

Events

Commission

Operator economics

Reconciliation state

No ordinary admin field to manually set `PAID`.

---

# 110. ADMIN REFUNDS

List:

* refund
* booking
* customer
* operator
* amount
* reason
* provider state
* date

Detail includes audit actor and provider response.

---

# 111. ADMIN PAYOUTS

Finance list/detail.

Provider state remains visible.

---

# 112. ADMIN COMMISSIONS

Configuration table:

* scope
* operator
* rate
* fixed component
* effective date
* expiration
* status

CTA:

`Nuova regola`

Changes only future-effective.

---

# 113. ADMIN PLANS / SUBSCRIPTIONS

Plans page:

Founding

Starter

Pro

Business

Enterprise.

Subscription page:

* operator
* plan
* status
* provider subscription
* current period

Pilot manual assignment supported.

---

# 114. ADMIN REVIEWS

Filters:

* reported
* pending moderation
* published
* hidden

Review detail:

* booking proof
* content
* report
* moderation actions

---

# 115. ADMIN CONTENT REPORTS

Queue:

```text
OPEN 32
UNDER REVIEW 8
```

Table:

* reason
* resource
* reporter
* created
* priority
* assigned
* status

---

# 116. ADMIN CONTENT REPORT DETAIL

Panels:

* report
* reported content
* relevant user/operator
* prior reports/actions
* decision history

Decision panel:

* no violation
* hide/restrict
* other permitted action

Reason mandatory.

---

# 117. ADMIN DOCUMENTS

Central document review queue.

Filters:

* scope
* type
* operator
* boat
* skipper
* status
* expiry

Quick review should not require navigating many pages.

---

# 118. ADMIN COMPLIANCE

Work queues:

* operator requirements
* boat requirements
* skipper requirements
* expirations
* overrides requiring attention

Separate:

configuration of requirements

from:

individual compliance cases.

---

# 119. ADMIN DAC7

Primary dashboard:

* reporting year
* seller readiness
* missing data
* reportable sellers
* reportable transactions
* reporting status

No tax logic finalized without professional validation.

---

# 120. ADMIN PRIVACY REQUESTS

Queue:

* type
* user
* date
* deadline/status
* assigned person

Detail:

* request
* identity verification
* retention considerations
* actions
* outcome

---

# 121. ADMIN SUPPORT

Ticket queue.

Filters:

* category
* priority
* status
* booking/payment linked
* assigned

Ticket detail:

conversation/context + relevant linked entities.

---

# 122. ADMIN AUDIT LOG

High-density searchable table.

Filters:

* actor
* action
* resource
* operator
* date

Detail drawer can show:

* before
* after
* metadata

Read-only.

---

# 123. ADMIN SETTINGS

Potential sections:

* marketplace configuration
* reference data
* legal document versions
* compliance requirements
* notification templates/settings
* platform feature/configuration

Highly restricted permissions.

---

# 124. GLOBAL PAGE HEADER PATTERN

Dashboard pages should generally use:

```text
Breadcrumb optional

PAGE TITLE                      PRIMARY ACTION
Short description optional     Secondary actions
```

Do not invent different header patterns on every page.

---

# 125. GLOBAL DETAIL HEADER PATTERN

Entity details:

```text
← Back

Entity name                STATUS
Secondary identifier

Primary actions
```

Examples:

* booking
* boat
* operator
* skipper
* payment

---

# 126. GLOBAL LIST PAGE PATTERN

```text
Page Header + Primary CTA

Optional KPI/summary

Search + filters

Table/grid

Pagination
```

---

# 127. GLOBAL EMPTY STATE PATTERN

Centered within relevant content area.

Not full-screen unless entire application state is empty.

Contains:

* icon
* title
* short explanation
* one meaningful CTA

---

# 128. GLOBAL LOADING PATTERN

Preserve page skeleton.

Example:

Header appears.

Cards/table skeleton below.

Avoid replacing whole dashboard with one spinner.

---

# 129. GLOBAL ERROR PATTERN

Inline when local.

Page-level when page cannot operate.

Always provide:

* explanation
* retry/action where possible

---

# 130. GLOBAL MOBILE PAGE HEADER

Compact:

```text
←  Page title          action/menu
```

Avoid very tall page headings that consume phone viewport.

---

# 131. GLOBAL MOBILE PRIMARY ACTION

For operational screens where primary action is frequent:

consider floating/sticky accessible CTA.

Examples:

* Nuova prenotazione
* Cerca
* Prenota

Do not use floating action button indiscriminately.

---

# 132. GLOBAL SHEET USAGE

Use sheets for:

* mobile filters
* quick booking details
* quick calendar details
* secondary configuration

Full page for:

* complex creation
* complex verification
* long forms

---

# 133. GLOBAL MODAL USAGE

Use modal for:

* confirmation
* short invitation
* destructive action
* short focused edit

Avoid full onboarding inside modal.

---

# 134. BREADCRUMB RULE

Use in:

* operator boat subpages
* admin deep detail
* settings hierarchy

Avoid on:

* homepage
* simple account screen
* checkout mobile

---

# 135. DESKTOP PRIORITY

Desktop is especially important for:

* operator calendar
* fleet management
* admin tables
* financial/compliance review

---

# 136. MOBILE PRIORITY

Mobile is especially important for:

Customer:

* search
* boat detail
* checkout
* booking management

Operator:

* today/calendar
* booking detail
* start/complete rental
* manual booking
* quick block

---

# 137. DO NOT DESIGN MOBILE AS SHRUNK DESKTOP

Examples:

Desktop fleet calendar:

timeline.

Mobile:

agenda/day.

Desktop search:

list + map.

Mobile:

list OR map.

Desktop table:

multiple columns.

Mobile:

cards/condensed rows.

---

# 138. NAVIGATION HIERARCHY — CUSTOMER

Primary:

* Discover/Search
* Favorites
* Account

Customer account secondary:

* Bookings
* Reviews
* Payments
* Notifications
* Profile
* Security

---

# 139. NAVIGATION HIERARCHY — OPERATOR

Primary daily:

* Dashboard
* Calendar
* Bookings
* Fleet
* Customers

Secondary:

* Staff
* Skippers
* Extras
* Payments
* Analytics
* Documents/Compliance

System/business:

* Plan
* Business
* Settings

---

# 140. NAVIGATION HIERARCHY — ADMIN

Operational:

* Dashboard
* Users
* Operators
* Boats
* Bookings

Financial:

* Payments
* Refunds
* Payouts
* Commissions
* Plans

Trust/compliance:

* Documents
* Compliance
* Reviews
* Reports

Platform/legal:

* DAC7
* Privacy
* Support
* Audit
* Settings

---

# 141. HIGH-PRIORITY SCREENS FOR B4

Marketplace high-fidelity work should prioritize:

1. Homepage
2. Search results
3. Boat detail
4. Checkout
5. Booking confirmation
6. Customer bookings
7. Operator public profile
8. Destination page

---

# 142. HIGH-PRIORITY SCREENS FOR B5

Operator high-fidelity work should prioritize:

1. Operator Dashboard
2. Fleet Calendar
3. Booking list
4. Booking detail
5. Manual booking
6. Fleet list
7. Boat detail/management
8. Pricing
9. Compliance
10. Payments
11. Analytics

---

# 143. HIGH-PRIORITY SCREENS FOR B6

Admin high-fidelity work should prioritize:

1. Admin Dashboard
2. Operator verification
3. Boat verification
4. Booking detail
5. Payment/reconciliation detail
6. Compliance queue
7. Content reports
8. DAC7 dashboard
9. Audit log

---

# 144. WIREFRAME QUALITY RULE

A wireframe is successful if a designer or coding AI can understand:

* every major region
* primary action
* content order
* expected interaction
* responsive transformation

without needing to invent the page architecture.

---

# 145. B3 FINAL RESULT

The Boatly structural model is:

## Customer

SEARCH-FIRST

VISUAL

TRUST-DRIVEN

LOW FRICTION.

## Operator

CALENDAR-FIRST

OPERATION-FIRST

FAST

CENTRALIZED.

## Admin

QUEUE-FIRST

STATE-FIRST

AUDITABLE

SAFE.

---

# 146. B3 COMPLETION CRITERIA

B3 is complete when Boatly has structural wireframes for:

* homepage
* search
* filters
* map/list
* zero results
* boat detail
* operator profile
* destination/category
* auth
* checkout
* confirmation
* customer account
* customer bookings
* favorites
* reviews
* operator shell
* operator dashboard
* calendar
* bookings
* manual booking
* booking detail
* fleet
* boat configuration
* pricing
* availability
* documents
* compliance
* locations
* CRM
* staff
* skippers
* extras
* payments
* payouts
* plan
* analytics
* contracts
* settings
* admin shell
* users
* operators
* boats
* bookings
* payments
* refunds
* commissions
* moderation
* compliance
* DAC7
* privacy
* support
* audit
* global loading/error/empty patterns
* mobile structural transformations
* navigation hierarchy

These wireframes are the structural source of truth for B4, B5, B6 and B7.
