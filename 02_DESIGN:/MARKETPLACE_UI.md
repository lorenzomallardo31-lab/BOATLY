# BOATLY — MARKETPLACE UI

**Version:** 1.0
**Status:** Phase B — High-Fidelity Marketplace UI Specification
**Product area:** Public Marketplace + Customer Booking Experience
**Primary market:** Italy
**Primary language:** Italian
**Design system:** DESIGN_SYSTEM.md
**Wireframe source:** WIREFRAMES.md

---

# 1. PURPOSE

This document defines the high-fidelity visual and interaction specification for the Boatly customer marketplace.

It covers:

* public navigation
* homepage
* search experience
* filters
* list/map results
* BoatCard
* map markers
* boat detail
* boat gallery
* pricing presentation
* licence/skipper presentation
* operator public profile
* destination pages
* category pages
* authentication
* checkout
* payment-processing state
* booking confirmation
* customer account
* customer bookings
* favorites
* reviews
* customer payments
* public trust patterns
* loading
* empty
* error states
* marketplace microcopy
* marketplace accessibility
* marketplace component inventory

This document does NOT replace:

* DESIGN_SYSTEM.md
* WIREFRAMES.md
* USER_FLOWS.md
* LEGAL_REQUIREMENTS.md

Where conflict exists:

legal/product integrity wins over visual convenience.

---

# 2. MARKETPLACE DESIGN OBJECTIVE

The marketplace should make the user feel:

> "Posso trovare la barca giusta senza dover capire come funziona il settore nautico."

The UI must make boat rental feel:

* understandable
* visual
* trustworthy
* premium
* simple
* fast

without pretending that every rental is identical.

---

# 3. MARKETPLACE VISUAL PERSONALITY

Customer marketplace is the most emotional part of Boatly.

It uses:

* warm background
* large authentic photography
* white elevated surfaces
* deep Navy typography
* restrained Aqua accents
* generous whitespace
* strong price hierarchy
* simple controls
* high-quality map interaction

The marketplace should feel closer to:

modern travel software

than:

traditional nautical portal.

---

# 4. MARKETPLACE BRAND SIGNATURE

The main visual signature should repeatedly combine:

```text
#FCFBF8 warm canvas

+

#0B1F33 Boatly Navy

+

#2DD4BF Aqua accent

+

large Mediterranean boat photography

+

rounded 16–20px imagery

+

Geist Sans

+

clean white search / booking surfaces
```

---

# 5. CUSTOMER UX PRIORITY

Primary customer journey:

```text
SEARCH
↓
RESULTS
↓
BOAT
↓
CHECKOUT
↓
PAYMENT
↓
CONFIRMATION
```

Every marketplace component should support this flow.

Avoid features that distract from it.

---

# 6. PUBLIC NAVBAR — DESKTOP

Height:

76px.

Background:

warm background or white depending scroll context.

Default homepage:

can initially overlay/float over hero only if contrast remains excellent.

Preferred safer MVP:

solid warm/white header.

Content width:

1280px.

Structure:

```text
Boatly

Destinazioni
Categorie
Come funziona

                Sei un noleggiatore?
                Preferiti
                Accedi / Account
```

---

# 7. NAVBAR LOGO

Position:

left.

Logo height target:

approximately 28–32px.

Clickable:

homepage.

Clear space:

minimum 20–24px around visual mark where possible.

---

# 8. NAVBAR PRIMARY LINKS

Text:

14px / 500.

Default:

Navy 700–900.

Hover:

Navy 900.

Hover treatment:

subtle underline or muted/Aqua background.

Do not use bright Aqua text for every navigation item.

---

# 9. NAVBAR OPERATOR CTA

`Sei un noleggiatore?`

Should be visible but not compete with customer search.

Preferred:

text/secondary button.

Example:

white background

Navy text

subtle border.

---

# 10. NAVBAR ACCOUNT

Unauthenticated:

`Accedi`

Authenticated:

avatar initials/photo + dropdown.

Account dropdown may include:

* Prenotazioni
* Preferiti
* Profilo
* Esci

---

# 11. NAVBAR SCROLL BEHAVIOR

Homepage:

header may become slightly more compact after scroll.

Search/detail pages:

header remains stable.

Avoid dramatic transforms.

Potential:

76px → 68px.

Do not shrink below comfortable click targets.

---

# 12. HOMEPAGE HERO — DESKTOP

Homepage hero is the highest visual-priority marketplace section.

Preferred structure:

```text
┌───────────────────────────────────────────────────────────────┐
│ NAV                                                           │
│                                                               │
│     Il mare, a portata di prenotazione.                       │
│                                                               │
│     Trova barche e gommoni vicino a te,                       │
│     confronta disponibilità e prezzi                          │
│     e prenota online.                                         │
│                                                               │
│     ┌─────────────────────────────────────────────────────┐   │
│     │ Dove | Quando | Durata | Persone | Cerca           │   │
│     └─────────────────────────────────────────────────────┘   │
│                                                               │
│                    LARGE BOAT / SEA IMAGE                     │
└───────────────────────────────────────────────────────────────┘
```

---

# 13. HOMEPAGE HERO HEIGHT

Desktop target:

approximately 680–760px total including navigation.

Do not force exactly `100vh`.

Goal:

headline + search + strong photography visible on first screen.

---

# 14. HERO HEADLINE

Preferred:

> **Il mare, a portata di prenotazione.**

Desktop:

56–64px.

Weight:

700.

Line-height:

tight but readable.

Max width:

approximately 700–760px.

Color:

Navy 900.

---

# 15. HERO SUPPORTING COPY

Preferred:

> Trova barche e gommoni vicino a te, confronta disponibilità e prezzi e prenota online.

18–20px.

Line-height:

28–30px.

Max width:

approximately 600px.

Color:

Slate 700.

---

# 16. HERO PHOTOGRAPHY

Preferred photography:

* Mediterranean water
* boat clearly visible
* natural daylight
* realistic atmosphere
* clean composition
* sufficient negative space

Avoid:

* huge luxury yacht as only visual
* tropical palm beaches unrelated to initial market
* exaggerated saturation
* AI-looking people

---

# 17. HERO IMAGE TREATMENT

Preferred options:

A.

Full-width photo under search/content.

or:

B.

Large editorial image occupying approximately right 45–50%.

Final B4 preference:

**wide editorial image below/behind the search zone while maintaining readable text.**

Avoid overly busy split-screen templates.

---

# 18. HERO IMAGE RADIUS

If contained image:

24px.

If full-width section background:

no artificial card border.

---

# 19. HERO SEARCH BAR

Signature marketplace component.

Desktop width:

approximately 980–1120px.

Height:

72px.

Background:

white.

Radius:

20px.

Shadow:

Boatly `Shadow Card`.

Border:

very subtle.

---

# 20. HERO SEARCH FIELD

Each field has:

small label

*

strong selected/current value.

Example:

```text
Dove
Napoli

Quando
28 agosto

Durata
Giornata intera

Persone
6 persone
```

---

# 21. HERO SEARCH LABEL

12–13px.

Weight:

600.

Color:

Slate 600.

---

# 22. HERO SEARCH VALUE

15–16px.

Weight:

500–600.

Navy 900.

Single line where possible.

---

# 23. HERO SEARCH DIVIDERS

Vertical subtle divider.

Color:

border token.

Height:

approximately 36–40px.

Do not visually box each field individually.

Search bar should read as one product object.

---

# 24. HERO SEARCH FIELD HOVER

Desktop:

field receives:

Aqua 50 / Navy 50 subtle background.

Radius:

14–16px.

No heavy borders.

---

# 25. HERO SEARCH FIELD ACTIVE

Active:

subtle Aqua 50

*

2px focus ring when keyboard interaction.

---

# 26. SEARCH BUTTON

Preferred homepage variant:

Aqua 400.

Foreground:

Navy 900.

Height:

52px.

Radius:

14px.

Horizontal padding:

22–26px.

Icon:

Search.

Text:

`Cerca`.

Could use Navy primary if image/background gives better balance.

One primary variant should be selected consistently during implementation.

---

# 27. LOCATION AUTOCOMPLETE

Click `Dove`.

Popover:

white.

Width:

320–420px.

Contains:

* search input
* recent location if available
* popular destinations
* matching Mapbox suggestions

Each result:

location icon

destination name

secondary region/country.

---

# 28. LOCATION AUTOCOMPLETE EMPTY

Before typing:

```text
Destinazioni popolari

Napoli
Ischia
Capri
Sorrento
Amalfi
```

These values must be configuration/data-driven later.

---

# 29. DATE PICKER — MARKETPLACE

Desktop:

popover calendar.

Potential:

2 months side by side where space allows.

Selected day:

Navy 900 background.

Range:

Aqua/Navy pale background.

Unavailable:

muted + disabled.

Today:

subtle outline.

---

# 30. DURATION PICKER

Use simple understandable options.

Potential examples:

* 1 ora
* 2 ore
* 4 ore / Mezza giornata
* 8 ore / Giornata intera
* Più giorni

Exact available duration may depend on inventory.

Avoid forcing user to understand pricing rate-plan internals.

---

# 31. PASSENGER PICKER

Popover.

Structure:

```text
Persone

Adulti / Passeggeri
[-] 6 [+]

Massimo dipende dalla barca scelta.
```

Search passenger count remains generic until boat selection.

---

# 32. HOMEPAGE TRUST STRIP

Position:

immediately after hero.

Background:

white or transparent.

Desktop:

3–4 items horizontally.

Potential:

```text
Disponibilità aggiornata
Prezzi chiari
Pagamento online
Recensioni da prenotazioni verificate
```

---

# 33. TRUST ITEM DESIGN

Icon:

20px Lucide.

Title:

14–15px / 600.

Supporting text optional:

13–14px.

No fake shields with `100% guaranteed`.

---

# 34. DESTINATIONS SECTION

Title:

> **Dove vuoi andare?**

Supporting:

short contextual sentence.

Desktop:

4 cards.

Potential horizontal scroll at intermediate viewport.

---

# 35. DESTINATION CARD

Ratio:

3:2.

Radius:

20px.

Photo dominates.

Dark subtle bottom gradient only for text readability if text overlays photo.

Text:

destination name

potential boat count.

---

# 36. DESTINATION CARD TITLE

20–24px.

Weight:

650–700.

White if overlay.

---

# 37. DESTINATION CARD HOVER

Image:

maximum approximately 1.02–1.03 scale.

Overlay slightly changes.

No dramatic zoom.

---

# 38. FEATURED BOATS SECTION

Title examples:

> **Barche da scoprire**

or:

> **Disponibili nelle destinazioni più amate**

Use reusable vertical BoatCards.

---

# 39. HOMEPAGE BOAT GRID

Desktop:

3 cards at typical 1280px width.

Potential 4 at large 1440px if cards remain wide enough.

Preferred:

3 for premium visual density.

Tablet:

2.

Mobile:

1 or horizontal discovery carousel depending final B7.

---

# 40. HOW IT WORKS SECTION

Title:

> **Prenotare è semplice**

Three steps:

1. Cerca
2. Scegli
3. Prenota

Visual:

minimal icon/number.

Avoid large cartoon illustrations.

---

# 41. HOW IT WORKS COPY

Example:

## Cerca

Inserisci destinazione, data e numero di persone.

## Scegli

Confronta barche, prezzi, requisiti e disponibilità.

## Prenota

Conferma online e ritrova tutto nella tua area personale.

---

# 42. CATEGORY DISCOVERY

Title:

> **Che giornata hai in mente?**

Potential visual categories:

* Gommoni
* Barche a motore
* Catamarani
* Yacht
* Barche a vela

Photos preferred over illustrations.

---

# 43. OPERATOR HOMEPAGE BLOCK

Different visual rhythm.

Potential background:

Navy 900.

Foreground:

white.

Accent:

Aqua.

Headline:

> **Tutta la tua flotta. Un solo posto.**

Supporting:

> Gestisci prenotazioni, calendario, clienti e disponibilità e ricevi nuovi clienti dal marketplace Boatly.

CTA:

Aqua.

---

# 44. HOMEPAGE FOOTER

Background:

Navy 950 or Navy 900.

Columns:

Boatly

Marketplace

Noleggiatori

Supporto

Legale

Potential language selector future.

---

# 45. FOOTER CONTENT

Brand:

logo + short description.

Marketplace:

* Destinazioni
* Categorie
* Come funziona

Operators:

* Diventa noleggiatore

Support:

* Assistenza
* Contatti
* Reclami
* Segnala

Legal:

* Privacy
* Cookie
* Termini
* Cancellazioni
* Accessibility

---

# 46. SEARCH RESULTS PAGE — HIGH-FIDELITY GOAL

The user should be able to:

* understand current search
* adjust filters quickly
* compare boats
* understand location
* understand price
* switch between list/map effortlessly

without page clutter.

---

# 47. SEARCH PAGE TOP

After navbar:

compact search control.

Desktop width:

100% container.

Search bar height:

60–64px.

Simpler than homepage version.

---

# 48. SEARCH SUMMARY BAR

Example:

```text
Napoli
28 agosto
Giornata intera
6 persone

[Modifica]
```

May reuse signature SearchBar with compressed height.

---

# 49. FILTER BAR

Sticky below search/header when useful.

Height:

approximately 60px.

Background:

warm/white.

Controls:

* Tipo
* Prezzo
* Patente
* Skipper
* Posti
* Servizi
* Altri filtri

Right side:

sort.

---

# 50. FILTER BUTTON

Height:

40px.

Radius:

full.

Default:

white

border.

Active:

Aqua 100 / Navy strong text

or Navy background for strong selection.

Include count where useful:

`Servizi · 3`

---

# 51. ACTIVE FILTER SUMMARY

If multiple filters:

show:

`Cancella filtri`

as subtle text/ghost action.

Do not create dozens of removable chips if it makes page noisy.

---

# 52. SEARCH RESULTS LAYOUT

Desktop:

left list:

55%.

right map:

45%.

Map starts under filter bar and remains sticky to viewport.

---

# 53. SEARCH RESULTS HEADER

Above results list:

```text
126 barche a Napoli

Disponibili per il 28 agosto
```

Right:

`Ordina: Consigliati`.

---

# 54. RESULT COUNT

22–24px / 650.

Do not make number huge.

---

# 55. SORT OPTIONS

Potential:

* Consigliati
* Prezzo più basso
* Prezzo più alto
* Valutazione
* Distanza

Ranking transparency must remain consistent with legal disclosures.

---

# 56. HORIZONTAL BOAT CARD

Desktop map/list version.

Dimensions target:

height approximately 210–230px.

Image:

approximately 38–42% width.

Content:

remaining.

Radius:

18px.

Surface:

white.

Border:

subtle.

---

# 57. HORIZONTAL BOAT CARD IMAGE

Full-height within card.

4:3-ish crop.

Left corners:

18px.

Right image corners:

0 if edge-to-edge internal layout.

---

# 58. BOAT CARD CONTENT

Top row:

category / optional badge

favorite.

Then:

boat name.

Then:

location.

Then:

key facts.

Then:

licence/skipper status.

Bottom:

rating left.

price right.

---

# 59. BOAT CARD BOAT NAME

18–20px / 650.

Navy 900.

Maximum 2 lines.

---

# 60. BOAT CARD LOCATION

14px.

Slate 600.

Location icon optional.

---

# 61. BOAT CARD KEY FACTS

Examples:

```text
8 persone
115 CV
6,2 m
```

16px icons.

14px text.

Separate with spacing or dots.

---

# 62. LICENCE BADGE

Potential examples:

`Senza patente`

`Patente richiesta`

Use restrained badge.

Never display `Senza patente` unless eligibility model supports claim.

---

# 63. SKIPPER BADGE

Potential:

`Skipper disponibile`

`Skipper incluso`

`Skipper richiesto`

Keep operationally understandable.

---

# 64. BOAT CARD RATING

Format:

`★ 4,9 (42)`

Star:

small.

Use rating only when review count exists.

If no reviews:

`Nuovo su Boatly`

only if product policy allows and wording is accurate.

---

# 65. BOAT CARD PRICE

Example:

```text
da €320
/ giorno
```

`€320`:

20px / 700.

`da` and `/ giorno`:

13–14px muted.

If calculated exact request price available:

prefer:

`€320 totale`

or appropriate transparent representation.

---

# 66. BOAT CARD FAVORITE

Top-right.

44px touch target.

White overlay on image or content.

Heart.

Selected state visible.

---

# 67. BOAT CARD HOVER

Desktop:

border becomes slightly stronger.

Shadow SM.

Image may scale 1.02.

No vertical card jump larger than 2px.

---

# 68. BOAT CARD SELECTED BY MAP

When map marker selected:

card border:

Aqua/Navy emphasis.

Potential:

2px Aqua 400 ring.

Scroll list card into view where appropriate.

---

# 69. MAP PANEL

Height:

viewport minus fixed header/filter area.

Background:

Mapbox light style.

Border-left:

subtle.

---

# 70. MAP PRICE MARKERS

Default:

white.

Text:

Navy.

Shadow XS/SM.

Radius:

full.

Padding:

8–10px horizontal.

Selected:

Navy background.

White text.

Aqua outer ring optional.

---

# 71. MAP MARKER PRICE

Text:

13–14px / 650.

Example:

`€320`

No long currency formatting.

---

# 72. MAP CLUSTER

Circle:

Navy.

Text:

white.

Aqua outer/accent ring.

Count only.

---

# 73. MAP SELECTED BOAT

Marker selected.

Corresponding list card selected.

Potential selected-card preview over map only for tablet/mobile, not necessary desktop split.

---

# 74. MAP CONTROLS

Keep minimal:

* zoom
* current location only when permission/requested
* optionally search this area

Do not overload map with custom toolbar.

---

# 75. SEARCH THIS AREA

When user moves map:

button appears:

`Cerca in questa zona`

Floating top-center.

White background.

Navy text.

Shadow.

---

# 76. FILTER MODAL / SHEET

Desktop width:

640–760px.

Scrollable body.

Sticky bottom action area.

---

# 77. FILTER PANEL HEADER

Title:

`Filtri`

Right:

X.

Optional current result count not in header.

---

# 78. FILTER PRICE

Show:

range slider

*

two numeric inputs if useful.

Avoid fake slider precision when prices broad.

---

# 79. FILTER BOAT TYPE

Use choice cards with:

small representative icon/thumbnail

*

label.

Could allow multi-select.

---

# 80. FILTER LICENCE

Options should be customer understandable.

Possible:

* Mostra tutte
* Senza patente
* Patente richiesta

Do not expose complex legal categories as default filters.

---

# 81. FILTER SKIPPER

Potential multi-select:

* Senza skipper
* Skipper disponibile
* Skipper incluso

Final semantics must align with listing eligibility.

---

# 82. FILTER AMENITIES

Checkbox grid.

Popular first.

Search/additional list if many.

---

# 83. FILTER FOOTER

Left:

`Cancella tutto`

Right:

`Mostra 42 risultati`

Primary Navy.

Sticky.

---

# 84. SEARCH LOADING

Keep map shell visible.

Results list skeleton cards.

Do not clear page entirely.

---

# 85. SEARCH ERROR

If search fails:

header/search preserved.

Results area:

```text
Non siamo riusciti a caricare le barche.

[Riprova]
```

Map can show safe fallback/empty if needed.

---

# 86. ZERO RESULTS

Large but not dramatic.

Icon:

SearchX / boat-style simple icon.

Title:

> Nessuna barca disponibile

Body:

> Prova a cambiare data, aumentare la distanza o rimuovere alcuni filtri.

Actions:

`Modifica ricerca`

`Cancella filtri`.

Nearby alternatives optional.

---

# 87. BOAT DETAIL — HIGH-FIDELITY OBJECTIVE

The user should answer quickly:

* Is this boat right for me?
* Can I use it legally?
* How many people?
* Where is it?
* Is skipper available?
* What will it cost?
* Can I book it?

---

# 88. BOAT DETAIL PAGE BACKGROUND

Warm canvas.

Gallery and sections on background.

Booking card:

white.

Avoid enclosing entire content inside one giant white card.

---

# 89. BOAT DETAIL TOP

Breadcrumb small.

Then:

title row.

Left:

boat name.

Below:

location + rating.

Right:

favorite/share.

---

# 90. BOAT DETAIL TITLE

32–38px desktop.

700.

Navy.

---

# 91. DETAIL META

Example:

`Pozzuoli, Napoli · ★ 4,9 (42 recensioni)`

14–15px.

Clickable review anchor.

---

# 92. DETAIL GALLERY

Desktop:

large left image approximately 60%.

Four smaller images to right in 2x2.

Overall gallery height:

430–520px depending viewport.

Gap:

8px.

Radius outer:

20px.

---

# 93. GALLERY IMAGE COUNT

If more photos:

last thumbnail overlay:

`+12 foto`.

Click any:

fullscreen gallery.

---

# 94. FULLSCREEN GALLERY

Dark/navy-black background.

Large photo.

Thumbnail strip optional desktop.

Controls:

close

previous

next.

Keyboard accessible.

---

# 95. BOAT DETAIL MAIN GRID

Desktop:

main:

approximately 2fr.

sidebar:

approximately 1fr.

Gap:

48–64px.

---

# 96. BOOKING SIDEBAR

Sticky top offset:

header + 24px.

Width:

approximately 360–400px.

White.

Radius:

20px.

Border.

Shadow SM/Card.

Padding:

24px.

---

# 97. BOOKING SIDEBAR PRICE

Before exact selection:

`da €320 / giorno`.

After dates selected:

calculated amount.

Total should eventually be explicit before checkout.

---

# 98. BOOKING SIDEBAR FIELDS

Use stacked compact controls:

* Data
* Ora
* Durata
* Persone

Potential combined date/time sections where efficient.

---

# 99. BOOKING SIDEBAR CTA

Initial:

`Verifica disponibilità`

After valid exact selection:

`Continua`

or:

`Prenota`

depending booking state.

Exact payment action appears later checkout.

---

# 100. BOOKING SIDEBAR TRUST COPY

Below CTA:

small text:

`Non verrà effettuato alcun addebito in questa fase.`

only if technically true.

Never use inaccurate reassurance.

---

# 101. BOAT KEY FACTS SECTION

Top of main content.

Use 3–6 tiles/inline items.

Examples:

```text
8 persone
6,2 m
115 CV
Gommone
Senza patente
Skipper disponibile
```

---

# 102. KEY FACT TILE

Icon.

Label/value.

No strong card border for each if unnecessary.

Prefer open grid separated by whitespace.

---

# 103. DESCRIPTION SECTION

Heading:

`La barca`

Body:

16px/26px.

Long descriptions can collapse after a sensible threshold:

`Mostra altro`.

---

# 104. LICENCE / CONDUCTION SECTION

High visual importance.

Heading:

`Patente e conduzione`

Use bordered/light Aqua information panel.

Example:

```text
✓ Questa configurazione può essere prenotata senza patente

Skipper
Disponibile su richiesta

[Come funzionano i requisiti]
```

Actual wording depends on validated legal result.

---

# 105. LICENCE PANEL WARNING

If licence required:

warning-neutral, not scary danger.

Example:

`Patente nautica richiesta`

with explanation.

Danger red is inappropriate for normal legal requirement.

---

# 106. SKIPPER PRICE

If skipper optional and separately priced:

show price clearly.

Example:

`Skipper disponibile da €120`.

If included:

`Incluso nel prezzo`.

---

# 107. AMENITIES SECTION

Heading:

`Cosa trovi a bordo`

Grid:

2–3 columns desktop.

Show first 8–12.

Then:

`Mostra tutti i servizi`.

---

# 108. AMENITY ITEM

16–18px icon.

Text 14–15px.

No badge background by default.

---

# 109. EXTRAS ON DETAIL

Heading:

`Extra disponibili`

Show preview only.

Example rows:

```text
Kit snorkeling           €20
Ghiacciaia                €15
Skipper                  da €120
```

Selection happens checkout unless direct detail selection improves flow later.

---

# 110. DEPOSIT / FUEL / CANCELLATION

Dedicated section:

`Da sapere prima di prenotare`

Rows:

* Deposito cauzionale
* Carburante
* Cancellazione
* Orari/ritardo where relevant

Use icon + concise summary.

Expandable details.

---

# 111. LOCATION SECTION

Heading:

`Dove si parte`

Map preview.

Address/marina.

Operator instructions summary.

Do not reveal sensitive personal/private pickup info publicly if not appropriate.

---

# 112. DETAIL MAP

Height:

300–360px.

Radius:

18px.

Map pin.

Below:

pickup area text.

---

# 113. OPERATOR SUMMARY CARD

Heading:

`Noleggiatore`

Contains:

logo/avatar.

Public name.

Rating.

Number of verified bookings/reviews only if meaningful/available.

Location/years on Boatly only if accurate.

CTA:

`Vedi profilo`.

---

# 114. OPERATOR TRUST

Only display verified status with precise scope.

Example:

`Identità aziendale verificata`

only if that is actually what Boatly verifies.

Avoid generic giant:

`VERIFICATO`.

---

# 115. REVIEWS SUMMARY

Heading:

`Recensioni`.

Overall rating:

large.

Review count.

Potential distribution future.

Initial:

simple.

---

# 116. REVIEW LIST

Desktop:

2 columns if content length supports.

Otherwise 1 column.

Each review:

rating

display name

date

verified booking indication

text.

---

# 117. REVIEW CTA

If many:

`Mostra tutte le recensioni`.

Opens modal/page section.

---

# 118. OPERATOR PUBLIC PROFILE — DESIGN

Top:

cover image.

Overlapping/adjacent operator logo.

Name.

Rating.

Location.

Trust status.

---

# 119. OPERATOR COVER

Height:

260–340px desktop.

Radius:

20px if contained.

Use actual operator imagery if available.

Fallback:

brand-safe neutral pattern.

---

# 120. OPERATOR PROFILE INFO

Public sections:

* Chi siamo
* Sedi
* Flotta
* Recensioni

Do not show legal/tax profile.

---

# 121. OPERATOR FLEET GRID

Same vertical BoatCard component as marketplace.

Consistency important.

---

# 122. DESTINATION PAGE HERO

Large destination photo.

Headline:

`Noleggio barche a Napoli`

Supporting copy.

Search bar.

Optional inventory context.

---

# 123. DESTINATION HERO COPY

Avoid generic SEO spam.

Example:

> Scopri gommoni, barche a motore e altre imbarcazioni disponibili a Napoli e dintorni.

---

# 124. DESTINATION INVENTORY

Searchable inventory appears high on page.

Do not force customer through 1,500 words before seeing boats.

---

# 125. DESTINATION CONTENT

Below inventory:

* popular areas
* useful destination guidance
* relevant categories
* nearby destinations
* FAQ

Content should genuinely help.

---

# 126. CATEGORY PAGE

Hero:

category title.

Short description.

Example:

`Noleggio gommoni`

Search/location selector.

Then inventory.

---

# 127. CATEGORY VISUAL

Use category-relevant photo.

Avoid same generic yacht photo for every category.

---

# 128. AUTH PAGE VISUAL DIRECTION

Authentication should remain highly polished but quiet.

Preferred desktop:

centered card on warm background

with optional subtle photo/brand panel on large screens.

Avoid heavy marketing carousel.

---

# 129. AUTH CARD

Width:

420–460px.

White.

Radius:

20px.

Padding:

32–40px.

Border/shadow subtle.

---

# 130. LOGIN TITLE

`Bentornato`

28–32px.

Supporting:

`Accedi al tuo account Boatly.`

---

# 131. AUTH BUTTONS

Primary:

Navy.

Future social login:

secondary outlined.

Do not add social login until actually implemented.

---

# 132. AUTH TERMS

Registration:

required terms checkbox.

Marketing:

separate optional checkbox.

Links underlined.

---

# 133. CHECKOUT — VISUAL OBJECTIVE

Checkout should feel:

* controlled
* quiet
* trustworthy
* explicit
* not salesy

No homepage navigation distractions.

---

# 134. CHECKOUT HEADER

Height:

64–72px.

Logo left.

Right:

`Checkout sicuro`

optional small lock icon.

No destination/category links.

---

# 135. CHECKOUT BACKGROUND

Warm canvas.

Main content:

white/light cards.

---

# 136. CHECKOUT DESKTOP GRID

Main:

approximately 65%.

Summary:

35%.

Max width:

1200–1280px.

Gap:

40px.

---

# 137. CHECKOUT STEP PROGRESS

Top of main content.

Preferred:

text + subtle progress bar.

Example:

```text
1 Requisiti
2 Extra
3 Dati
4 Riepilogo
5 Pagamento
```

Current:

Navy.

Completed:

Aqua/success.

Future:

Slate 400.

---

# 138. CHECKOUT STEP CARD

White.

Radius:

20px.

Padding:

28–32px.

Heading:

24–28px.

---

# 139. REQUIREMENTS STEP

Sections:

* selected date/time
* passengers
* licence
* skipper

If validated automatically:

clear positive status.

If action needed:

form/choice.

---

# 140. LICENCE REQUIREMENT SUCCESS

Example:

success-light or Aqua info panel:

`Puoi prenotare questa configurazione senza patente.`

Only if validated.

---

# 141. LICENCE REQUIREMENT INPUT

If licence required:

simple form.

Fields only necessary.

Explain:

`Ci serve per verificare che tu possa condurre questa barca.`

---

# 142. EXTRAS STEP

Cards/list.

Each item:

name

description

price

quantity/select action.

Selected:

Aqua/Navy highlighted border.

---

# 143. CUSTOMER DATA STEP

Logical sections.

Do not expose 20 inputs at once.

Potential:

`Contatto`

`Conducente`

`Richieste`

---

# 144. CHECKOUT SUMMARY SIDEBAR

Sticky.

Top:

boat thumbnail.

Boat name.

Location.

Date/time.

Passengers.

Then price breakdown.

---

# 145. CHECKOUT PRICE BREAKDOWN

```text
Noleggio                 €320
Kit snorkeling            €20
Skipper                   €120

────────────────────────────

Totale                    €460
```

Deposit:

separate.

Example:

`Deposito cauzionale: €500`

with collection explanation.

---

# 146. CHECKOUT TOTAL

22–26px / 700.

Navy.

Never visually hide mandatory fees.

---

# 147. CANCELLATION SUMMARY

Compact linkable block:

`Cancellazione flessibile`

`Scopri i dettagli`.

Actual policy snapshot applies.

---

# 148. FINAL REVIEW STEP

Display:

* boat
* operator
* legal booking information
* date
* passengers
* extras
* price
* deposit
* cancellation
* Terms

Required checkboxes immediately before CTA area where appropriate.

---

# 149. FINAL PAYMENT CTA

Explicit.

Preferred:

`Prenota e paga €460`

or legally reviewed equivalent.

This is stronger than generic `Continua`.

---

# 150. FINAL CTA WIDTH

Desktop:

full width within payment action area or substantial primary button.

Height:

52px.

---

# 151. PAYMENT PROCESSING PAGE

Centered within checkout shell.

Icon/spinner.

Title:

> Stiamo verificando il pagamento

Body:

> La prenotazione sarà confermata non appena riceveremo la conferma del pagamento.

Do not falsely guarantee timeframe.

---

# 152. PAYMENT PROCESSING SECONDARY COPY

Potential:

`Puoi ritrovare lo stato della prenotazione anche nella tua area personale.`

if technically available.

---

# 153. PAYMENT ERROR

Title:

`Il pagamento non è andato a buon fine`

Body:

clear safe explanation.

Actions:

`Riprova`

`Torna al riepilogo`.

Do not blame customer/card unnecessarily.

---

# 154. BOOKING CONFIRMATION PAGE

High-quality calm moment.

Background:

warm.

Centered/main card or open layout.

Success icon:

large but restrained.

---

# 155. CONFIRMATION TITLE

> **Prenotazione confermata**

32–40px.

---

# 156. BOOKING CODE

Show clearly:

`BT-2026-AB12CD`

Copy action.

Not visually larger than booking title.

---

# 157. CONFIRMATION TRIP CARD

Contains:

boat thumbnail

boat

operator

date/time

location

passengers.

---

# 158. CONFIRMATION ACTIONS

Primary:

`Vedi prenotazione`

Secondary:

`Scarica contratto`

if available.

Optional:

`Aggiungi al calendario`

future, if implemented.

---

# 159. WHAT HAPPENS NEXT

Simple 2–3 steps:

* riceverai conferma/email
* presentati al punto di partenza
* porta documenti/patente if required

Content generated from booking rules.

---

# 160. CUSTOMER ACCOUNT — VISUAL PRINCIPLE

Customer account remains simpler than operator dashboard.

Do not make customers use a corporate sidebar product.

Desktop sidebar acceptable but light.

---

# 161. CUSTOMER ACCOUNT HEADER

Marketplace navbar remains.

Account inner container.

Left nav:

approximately 220px.

Main:

remaining.

---

# 162. CUSTOMER ACCOUNT NAV

White/open background.

Items:

* Panoramica
* Prenotazioni
* Preferiti
* Recensioni
* Pagamenti
* Notifiche
* Profilo
* Sicurezza

Active:

Aqua 50 / Navy text.

---

# 163. CUSTOMER DASHBOARD

Hero card:

next booking.

If no booking:

discovery CTA.

Secondary cards:

favorites

reviews pending

notifications.

Avoid meaningless KPIs.

---

# 164. NEXT BOOKING CARD

Large horizontal.

Boat image.

Date/location.

Status.

CTA:

`Vedi prenotazione`.

---

# 165. CUSTOMER BOOKINGS PAGE

Tabs:

* Prossime
* Passate
* Annullate

Use booking cards, not dense table.

---

# 166. CUSTOMER BOOKING CARD

Image:

140–180px desktop.

Info:

boat

date

location

operator

status.

Right:

amount

CTA.

---

# 167. CUSTOMER BOOKING DETAIL

Header:

status + code.

Large boat summary.

Actions.

Sections:

* dettagli
* prezzo
* pagamento/rimborso
* contratto
* cancellazione
* operatore
* supporto.

---

# 168. CANCEL BOOKING CTA

Not primary Navy when normal booking is healthy.

Use secondary/destructive contextual link/button.

Confirmation modal before final cancellation.

---

# 169. FAVORITES PAGE

Title:

`Preferiti`

Grid of standard BoatCards.

No new separate card style.

---

# 170. FAVORITES EMPTY

Icon:

Heart.

Title:

`Non hai ancora salvato nessuna barca`

Body.

CTA:

`Scopri le barche`.

---

# 171. REVIEWS ACCOUNT PAGE

Section:

`Da recensire`

booking cards.

Section:

`Le tue recensioni`.

---

# 172. REVIEW FORM

Rating selector.

Textarea.

Optional title.

Submit Navy.

Provide moderation/review-policy note subtly.

---

# 173. CUSTOMER PAYMENTS

Simple chronological list/card.

Each:

booking code

boat

date

amount

status.

Refund shown under relevant payment.

---

# 174. CUSTOMER NOTIFICATIONS

Simple feed.

Unread:

slight Aqua 50 background.

Read:

white.

Group by date.

---

# 175. PUBLIC SUPPORT ENTRY POINTS

Support links should appear:

* footer
* booking detail
* account
* checkout error
* cancellation/refund state

Don't force user to hunt.

---

# 176. MARKETPLACE STATUS LANGUAGE

Avoid database enums.

Examples:

`CONFIRMED`

→ `Confermata`.

`PAYMENT_PROCESSING`

→ `Pagamento in verifica`.

`REFUNDED`

→ `Rimborsata`.

---

# 177. MARKETPLACE CTA LANGUAGE

Preferred:

* Cerca una barca
* Verifica disponibilità
* Prenota
* Prenota e paga
* Salva nei preferiti
* Vedi prenotazione
* Modifica ricerca
* Mostra risultati
* Vedi profilo
* Mostra tutte le recensioni

Avoid generic `Vai`.

---

# 178. TRUST LANGUAGE

Use precise claims.

Good:

`Recensione da prenotazione verificata`.

Bad:

`Barca 100% sicura`.

Good:

`Pagamento gestito tramite Stripe` only if product/legal copy approves mentioning provider.

Bad:

`Pagamento garantito al 100%`.

---

# 179. SCARCITY LANGUAGE

Do not create fake urgency.

If real availability supports it, future UI might say:

`Ultimo slot disponibile per questa giornata`.

Only if true.

No countdown timer by default.

---

# 180. MARKETPLACE ERROR MICROCOPY

Bad:

`Errore 500`.

Good:

`Non siamo riusciti a caricare questa pagina. Riprova tra qualche secondo.`

---

# 181. AVAILABILITY CONFLICT MICROCOPY

> Questa barca non è più disponibile nell'orario selezionato.

Then:

`Modifica orario`

`Torna ai risultati`.

---

# 182. LICENCE ERROR MICROCOPY

> Questa configurazione richiede una patente nautica compatibile.

Then:

`Modifica configurazione`

or:

`Torna alle barche senza patente`.

Only if relevant.

---

# 183. COMPLIANCE BLOCK CUSTOMER COPY

Never expose internal:

`COMPLIANCE_BLOCKED`.

Use:

> Questa barca non è momentaneamente prenotabile.

No private reason/details.

---

# 184. MAPBOX FAILURE

If map cannot load:

results list remains usable.

Show small:

`La mappa non è disponibile al momento.`

Never block entire search because map failed.

---

# 185. IMAGE FAILURE

Use neutral Boatly placeholder.

Do not use browser broken-image icon.

Placeholder:

warm/light with Boatly symbol future.

---

# 186. LAZY IMAGE LOADING

Boat cards below fold:

lazy.

Hero/critical first image:

prioritized appropriately.

Avoid causing layout shift.

---

# 187. IMAGE QUALITY

Use responsive sizes.

Do not send full 6000px operator upload directly to 350px card.

Image optimization is required during implementation.

---

# 188. SKELETON — BOAT CARD

Image rectangle skeleton.

Title line.

Meta line.

Price.

Preserve exact card dimensions.

---

# 189. SKELETON — BOAT DETAIL

Gallery skeleton.

Title/meta.

Main section blocks.

Booking sidebar.

---

# 190. SKELETON — CUSTOMER BOOKINGS

Booking-card placeholders.

Do not show spinner-only blank account.

---

# 191. FOCUS ORDER

Keyboard order follows visual order.

Search:

Dove

Quando

Durata

Persone

Cerca.

---

# 192. SCREEN READER SEARCH

Search field labels must remain programmatically explicit.

Icons are not labels.

---

# 193. SCREEN READER BOAT CARD

Card accessible name should provide meaningful title.

Favorite button separate from main card link.

Avoid nested interactive controls incorrectly.

---

# 194. MAP ACCESSIBILITY

Map is supplemental.

Equivalent results list remains fully usable.

---

# 195. MODAL ACCESSIBILITY

Filters/gallery/reviews dialogs:

correct focus management.

Escape support.

Accessible titles.

---

# 196. CUSTOMER MOBILE PRINCIPLE

B7 will finalize responsive layouts.

B4 establishes:

* no desktop squeeze
* sticky booking actions where useful
* full-screen map option
* stacked checkout
* cards optimized for touch
* mobile-safe typography

---

# 197. MOBILE HOMEPAGE HERO INTENT

Headline:

34–42px.

Search:

not four-column row.

Preferred:

single large search entry card opening dedicated search sheet.

Example collapsed:

```text
Dove vuoi andare?
Aggiungi data · Persone

[Cerca]
```

---

# 198. MOBILE BOAT CARD INTENT

Vertical.

Image 4:3.

Text below.

Price prominent.

Favorite overlay.

---

# 199. MOBILE DETAIL INTENT

Image carousel first.

No desktop sidebar.

Sticky bottom price + CTA.

---

# 200. MOBILE CHECKOUT INTENT

Single column.

Summary can be collapsible/sticky summary bar.

No tiny side-by-side form fields.

---

# 201. MOBILE ACCOUNT INTENT

No permanent left sidebar.

Account root can act as menu.

Nested pages use mobile header/back.

---

# 202. MARKETPLACE COMPONENT INVENTORY

Reusable components should include:

```text
MarketplaceNavbar
MarketplaceFooter

HeroSearchBar
CompactSearchBar
LocationAutocomplete
DatePicker
DurationPicker
PassengerPicker

FilterBar
FilterChip
FilterDialog

BoatCard
HorizontalBoatCard
BoatCardSkeleton
FavoriteButton

MapPanel
MapPriceMarker
MapCluster
SearchThisAreaButton

BoatGallery
BoatKeyFacts
LicenceInfoPanel
AmenitiesGrid
ExtrasPreview
RentalPolicySummary
LocationMap
OperatorSummary
ReviewsSummary
ReviewCard

BookingSidebar
PriceBreakdown

CheckoutHeader
CheckoutProgress
CheckoutStepCard
CheckoutSummary
LegalAcceptanceBlock

PaymentProcessingState
PaymentErrorState
BookingConfirmation

CustomerAccountNav
CustomerBookingCard
CustomerBookingDetail
CustomerReviewForm
CustomerPaymentItem

DestinationCard
CategoryCard

EmptyState
ErrorState
LoadingSkeleton
StatusBadge
```

---

# 203. COMPONENT REUSE RULE

Do not create:

`HomepageBoatCard`

`SearchBoatCard`

`FavoritesBoatCard`

as three unrelated implementations.

Prefer shared primitive/domain components with layout variants.

---

# 204. BOAT CARD VARIANTS

Allowed:

`vertical`

for discovery/favorites/destinations.

`horizontal`

for desktop map/list search.

Both share:

* data
* photo behavior
* typography
* price treatment
* rating
* favorite action
* badges.

---

# 205. PRICE COMPONENT

Create consistent reusable price display.

Handles:

* starting price
* exact total
* unit
* discount if future
* previous price if legitimate
* currency formatting.

Never manually format prices in every page.

---

# 206. STATUS COMPONENT

Shared marketplace StatusBadge maps internal state to:

* customer label
* semantic visual treatment.

---

# 207. BOOKING SUMMARY COMPONENT

Reusable in:

* boat detail sidebar
* checkout
* account booking detail

but density/layout may vary.

Data source consistent.

---

# 208. MARKETPLACE VISUAL CONSISTENCY CHECK

Every marketplace screen should consistently use:

* Warm canvas
* Navy headings
* white surface cards
* Aqua interaction accents
* Geist
* 16–20px major card radius
* restrained borders/shadows
* large authentic photos

---

# 209. MARKETPLACE QUALITY BAR

A screen fails design review if:

* it looks like generic template marketplace
* primary action is unclear
* price is hidden
* customer cannot understand licence/skipper state
* map overwhelms inventory
* filter controls feel enterprise-heavy
* too many badges compete
* images are too small
* mobile is a squeezed desktop
* copy uses technical database vocabulary

---

# 210. HOMEPAGE QUALITY CHECK

Homepage should answer in under a few seconds:

* What is Boatly?
* What can I search?
* Where can I go?
* Why should I trust it?
* How do I start?

---

# 211. SEARCH QUALITY CHECK

Search should answer:

* What did I search?
* How many results?
* What is available?
* Where is it?
* How much?
* Licence/skipper?
* How can I adjust?

---

# 212. BOAT DETAIL QUALITY CHECK

Boat detail should answer:

* suitable for my group?
* price?
* licence?
* skipper?
* location?
* cancellation/deposit?
* operator?
* booking CTA?

---

# 213. CHECKOUT QUALITY CHECK

Checkout should answer:

* what am I buying?
* from whom?
* when?
* how much?
* what requirements?
* cancellation?
* deposit?
* what happens when I pay?

---

# 214. CONFIRMATION QUALITY CHECK

Confirmation should answer:

* did it work?
* booking code?
* what did I book?
* where/when?
* what do I do next?
* where is my contract?

---

# 215. DESIGN REVIEW — NO VISUAL NOISE

Before accepting any marketplace section ask:

Can one item be removed without hurting usability?

If yes:

remove it.

Premium UI is often created through:

less noise

not more decoration.

---

# 216. B4 FINAL MARKETPLACE CHARACTER

The final Boatly marketplace should feel:

**Visual like travel.**

**Clear like modern fintech.**

**Trustworthy like professional booking software.**

**Warm like the Mediterranean.**

But:

**uniquely Boatly.**

---

# 217. B4 COMPLETION CRITERIA

B4 is complete when Boatly has high-fidelity specifications for:

* marketplace navbar
* homepage hero
* signature search
* autocomplete
* date/duration/passenger selectors
* trust signals
* destination cards
* category discovery
* operator CTA
* footer
* search page
* filters
* result count/sort
* vertical BoatCard
* horizontal BoatCard
* favorites
* map
* map price markers
* clusters
* search-this-area
* zero results
* search errors/loading
* boat detail
* gallery
* booking sidebar
* licence/skipper panel
* amenities
* extras
* rental/deposit/fuel policies
* location
* operator summary/profile
* reviews
* destination pages
* category pages
* auth
* checkout
* legal acceptance
* price breakdown
* payment processing
* payment failure
* booking confirmation
* customer account
* customer bookings
* customer booking detail
* favorites
* customer reviews
* customer payments
* marketplace accessibility
* marketplace loading/empty/error states
* responsive intent
* reusable marketplace component inventory
* visual quality gates

B5 will define the high-fidelity Operator Workspace.

B6 will define the high-fidelity Admin Workspace.

B7 will perform the final responsive/mobile reconciliation across the complete product.
