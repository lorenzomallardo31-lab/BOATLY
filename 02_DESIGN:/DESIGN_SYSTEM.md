# BOATLY — DESIGN SYSTEM

**Version:** 1.0
**Status:** Phase B — Approved Design System Specification
**Brand direction:** Modern Mediterranean Technology
**Primary product language:** Italian
**Primary mode:** Light
**Framework target:** Next.js + Tailwind CSS + shadcn/ui

---

# 1. PURPOSE

This document defines the visual and interaction system of Boatly.

It is the source of truth for:

* colors
* typography
* spacing
* grid
* radius
* shadows
* borders
* iconography
* motion
* buttons
* inputs
* selectors
* cards
* badges
* alerts
* tables
* dialogs
* navigation
* search
* map UI
* fleet calendar
* dashboard UI
* charts
* responsive behavior
* accessibility
* loading
* empty states
* interaction states

Design work and AI-generated UI must follow this system.

Do not invent new visual rules per page without deliberate design review.

---

# 2. DESIGN PRINCIPLE

Boatly should feel:

**Premium enough to trust.**

**Simple enough to understand immediately.**

**Modern enough to feel technological.**

**Warm enough to feel Mediterranean.**

The core visual formula is:

DEEP NAVY

*

AQUATIC TURQUOISE

*

WARM OFF-WHITE

*

GENERATIVE WHITE SPACE

*

LARGE AUTHENTIC PHOTOGRAPHY

*

CRISP TYPOGRAPHY

---

# 3. PRODUCT PERSONALITIES

The same design system supports three different interface personalities.

## Marketplace

More emotional.

More photography.

More whitespace.

Large search controls.

Strong destination/boat imagery.

## Operator Dashboard

More operational.

Higher information density.

Persistent navigation.

Tables/calendar.

Reduced decorative content.

## Admin

More restrained.

Workflow and state focused.

Highest information clarity.

Minimal lifestyle imagery.

All three must clearly belong to Boatly.

---

# 4. DESIGN NON-NEGOTIABLES

Boatly must NOT become:

* generic blue SaaS UI
* Airbnb clone
* overly rounded "bubble UI"
* luxury yacht broker design
* corporate grey enterprise software
* neon startup UI
* gradient-heavy fintech UI
* glassmorphism-heavy product
* visually noisy travel website

Use visual restraint.

Brand recognition should come from:

* palette
* typography
* imagery
* spacing
* component behavior
* map/search identity

not from decorative gimmicks.

---

# 5. COLOR SYSTEM

The color system is divided into:

1. Brand colors
2. Neutral colors
3. Semantic colors
4. Product-specific semantic tokens

Application code should consume semantic tokens rather than arbitrary raw values whenever possible.

---

# 6. PRIMARY NAVY

Core Boatly color:

## Boatly Navy 900

`#0B1F33`

Used for:

* primary brand color
* main text where appropriate
* primary buttons
* operator sidebar
* important headings
* selected dark navigation
* high-contrast UI

Navy communicates:

* trust
* depth
* sea
* professionalism
* stability

---

# 7. NAVY SCALE

```text
Navy 950   #061522
Navy 900   #0B1F33
Navy 800   #10334D
Navy 700   #16506D
Navy 600   #1E6887
Navy 500   #2A82A0
Navy 400   #5AA1B8
Navy 300   #8BC0D0
Navy 200   #B8DCE5
Navy 100   #DDEFF3
Navy 50    #F1F8FA
```

Do not use every shade simply because it exists.

Primary working shades:

* 900
* 800
* 700
* 200
* 100
* 50

---

# 8. AQUA BRAND ACCENT

Core accent:

## Boatly Aqua 500

`#14B8A6`

Secondary brighter accent:

## Boatly Aqua 400

`#2DD4BF`

Aqua communicates:

* water
* freshness
* movement
* booking interaction
* active states

Important:

white text should generally NOT be used on bright Aqua 400/500.

Preferred foreground:

Boatly Navy 900.

Example:

Aqua background:

`#2DD4BF`

Text:

`#0B1F33`

---

# 9. AQUA SCALE

```text
Aqua 950   #062F2D
Aqua 900   #0B514C
Aqua 800   #0E685F
Aqua 700   #0D8074
Aqua 600   #0F9F90
Aqua 500   #14B8A6
Aqua 400   #2DD4BF
Aqua 300   #5EE2D2
Aqua 200   #9BEDE2
Aqua 100   #CFF8F1
Aqua 50    #EEFCF9
```

---

# 10. WARM BACKGROUND

Primary application background:

`#FCFBF8`

This is intentionally slightly warmer than pure white.

Purpose:

* Mediterranean warmth
* softer large surfaces
* distinction from generic SaaS apps

Pure white remains important for elevated surfaces/cards.

---

# 11. SAND COLORS

```text
Sand 100   #F7F4EE
Sand 200   #EEE8DD
Sand 300   #DED4C5
```

Use sparingly.

Potential uses:

* editorial marketing sections
* destination sections
* subtle marketplace backgrounds
* empty states
* brand storytelling

Do not make operational dashboards beige.

---

# 12. NEUTRAL SYSTEM

Primary neutral text and interface scale:

```text
Slate 950  #0F172A
Slate 900  #1E293B
Slate 800  #334155
Slate 700  #475569
Slate 600  #64748B
Slate 500  #718096
Slate 400  #94A3B8
Slate 300  #CBD5E1
Slate 200  #E2E8F0
Slate 100  #F1F5F9
Slate 50   #F8FAFC
```

Primary brand text should generally lean toward Boatly Navy rather than generic Slate 950.

---

# 13. SEMANTIC SUCCESS

Primary success:

`#16805D`

Success light:

`#E9F7F1`

Success dark text:

`#0E5D43`

Used for:

* confirmed
* completed
* approved
* successful payment
* compliant
* active positive state

Never rely only on green color.

Include:

icon + text/state label.

---

# 14. SEMANTIC WARNING

Primary warning:

`#B45309`

Warning light:

`#FFF5E6`

Warning dark:

`#7C3A06`

Used for:

* document expiring
* review required
* incomplete onboarding
* action needed
* payout pending in relevant context

---

# 15. SEMANTIC DANGER

Primary danger:

`#B42318`

Danger light:

`#FFF0EE`

Danger dark:

`#7A1710`

Used for:

* destructive actions
* failed payment
* rejected compliance
* cancellation
* serious blocking error

Do not use danger red for ordinary informational states.

---

# 16. SEMANTIC INFO

Primary info:

`#1D4ED8`

Info light:

`#EFF6FF`

Info dark:

`#1E3A8A`

Used for:

* informational alerts
* system guidance
* neutral operational notices

---

# 17. SEMANTIC DESIGN TOKENS

Primary light-mode token mapping:

```text
background              #FCFBF8
foreground              #0B1F33

card                    #FFFFFF
card-foreground         #0B1F33

popover                 #FFFFFF
popover-foreground      #0B1F33

primary                 #0B1F33
primary-foreground      #FFFFFF

secondary               #EEFCF9
secondary-foreground    #0B1F33

accent                  #2DD4BF
accent-foreground       #0B1F33

muted                   #F1F5F4
muted-foreground        #64748B

border                  #DEE5E8
input                   #D6E0E4
ring                    #14B8A6

destructive             #B42318
destructive-foreground  #FFFFFF
```

---

# 18. IMPLEMENTATION COLOR RULE

Implementation should use semantic CSS variables.

Prefer:

`bg-primary`

over:

`bg-[#0B1F33]`

for reusable semantic components.

Raw palette values may be used for deliberate brand/editorial cases.

This enables global visual changes without rewriting components.

---

# 19. COLOR ACCESSIBILITY

Text/background combinations must target WCAG AA contrast.

Important approved combinations include:

Navy 900 on white.

White on Navy 900.

Navy 900 on Aqua 400/500.

Danger dark/light combinations.

Do not assume brand color automatically provides sufficient contrast.

---

# 20. DARK MODE

Dark mode is NOT part of the MVP design requirement.

Reason:

A poor/incomplete dark mode is worse than a polished light system.

Do not allow AI coding tools to automatically add:

* theme toggle
* dark theme
* dark map
* `.dark` variants everywhere

unless dark mode becomes an explicit later feature.

---

# 21. TYPOGRAPHY — PRIMARY FONT

Primary typeface:

**Geist Sans**

Use throughout:

* marketplace
* customer account
* operator dashboard
* admin
* forms
* tables
* prices
* marketing UI

Fallback:

```text
Geist Sans,
Inter,
ui-sans-serif,
system-ui,
-apple-system,
BlinkMacSystemFont,
"Segoe UI",
sans-serif
```

---

# 22. TYPOGRAPHY — MONOSPACE

Use Geist Mono only when a monospace style genuinely improves readability.

Potential cases:

* internal identifiers
* technical admin/debug views
* developer-facing data

Do not use mono for normal customer-facing booking codes merely to look technical.

---

# 23. FONT WEIGHTS

Primary weights:

400 — regular

500 — medium

600 — semibold

700 — bold

Avoid excessive use of 800/900 weight.

Most interface hierarchy should be achieved using:

* size
* spacing
* 500/600 weight

rather than making everything bold.

---

# 24. DISPLAY TYPOGRAPHY

## Display XL

Desktop:

64px / 68px

Weight:

700

Letter spacing:

-0.045em

Use:

homepage marketing hero only.

Mobile:

42px / 46px.

---

# 25. DISPLAY LARGE

Desktop:

56px / 62px

Weight:

700

Letter spacing:

-0.04em

Use:

major marketing pages.

Mobile:

38px / 43px.

---

# 26. H1

Desktop:

48px / 54px

Weight:

700

Letter spacing:

-0.035em

Mobile:

34px / 40px

Use:

marketplace page titles / strong marketing sections.

Operator/Admin H1 generally uses the dashboard scale instead.

---

# 27. H2

Desktop:

36px / 42px

Mobile:

30px / 36px

Weight:

650–700 equivalent.

Letter spacing:

-0.025em.

---

# 28. H3

28px / 34px.

Weight:

600.

Letter spacing:

-0.02em.

---

# 29. H4

22px / 28px.

Weight:

600.

---

# 30. DASHBOARD PAGE TITLE

28px / 34px.

Weight:

650–700.

Use:

operator/admin page titles.

Do not use 48px marketing H1 inside dense dashboards.

---

# 31. BODY LARGE

18px / 28px.

Weight:

400.

Use:

marketing supporting copy.

---

# 32. BODY DEFAULT

16px / 24px.

Weight:

400.

Primary UI/body text.

---

# 33. BODY SMALL

14px / 20px.

Weight:

400.

Use:

secondary table information, helper copy.

---

# 34. LABEL

14px / 20px.

Weight:

600.

Use:

form labels.

---

# 35. META / CAPTION

12px / 16px.

Weight:

500.

Use:

timestamps, supporting metadata, small status information.

Never use extremely tiny text under 12px for essential information.

---

# 36. PRICE TYPOGRAPHY

Boat search-card price:

18–20px

weight 700.

Boat-detail key price:

28–32px

weight 700.

Currency and unit text may be visually secondary.

Example:

`€320`

large

`/ giorno`

smaller muted.

---

# 37. NUMERIC ALIGNMENT

For tables and analytics, enable tabular number behavior where useful.

Examples:

* money
* counts
* dates
* percentages

Numbers should visually align in columns.

---

# 38. LINE LENGTH

Long informational content:

target approximately 60–75 characters per line.

Do not allow policy/support text to stretch across 1400px displays.

---

# 39. SPACING FOUNDATION

Base grid:

4px.

Core spacing scale:

```text
2px
4px
6px
8px
12px
16px
20px
24px
32px
40px
48px
64px
80px
96px
120px
```

Prefer scale values rather than arbitrary:

17px

23px

37px.

---

# 40. COMPONENT INTERNAL SPACING

Typical:

Small:

8–12px.

Standard:

12–16px.

Comfortable card:

20–24px.

Large marketplace content:

24–32px.

---

# 41. SECTION SPACING — MARKETPLACE

Desktop major section:

80–120px vertical.

Tablet:

64–80px.

Mobile:

48–64px.

Large homepage sections must have room to breathe.

---

# 42. SECTION SPACING — DASHBOARD

Between major dashboard sections:

24–32px.

Between form groups:

24px.

Between related controls:

8–16px.

Operational interfaces should be more compact than marketing pages.

---

# 43. PAGE CONTAINER

Marketplace desktop maximum width:

1440px.

Primary content inner width:

1280px.

Horizontal desktop padding:

32px.

Tablet:

24px.

Mobile:

16px.

Large marketing hero may intentionally extend wider.

---

# 44. GRID

Desktop:

12-column.

Tablet:

8-column.

Mobile:

4-column.

Use grid intentionally.

Do not position everything using random width percentages.

---

# 45. RESPONSIVE BREAKPOINTS

Target breakpoints:

```text
sm    640px
md    768px
lg    1024px
xl    1280px
2xl   1536px
```

Design mobile-first.

Breakpoints describe layout needs rather than device names.

---

# 46. BORDER RADIUS SYSTEM

Boatly uses moderately rounded shapes.

```text
radius-xs     6px
radius-sm     8px
radius-md     12px
radius-lg     16px
radius-xl     20px
radius-2xl    24px
radius-full   9999px
```

Primary standard:

12–16px.

Marketplace image/card:

16–20px.

Do NOT make every component a full pill.

---

# 47. BUTTON RADIUS

Standard:

12px.

Large marketplace CTA:

14px.

Small operational buttons:

10px.

Icon button:

10–12px.

Pill only for:

* filter chips
* selected categories
* compact status/category selectors

where the pill form has meaning.

---

# 48. SHADOW SYSTEM

Shadows remain subtle.

## Shadow XS

```text
0 1px 2px rgba(6, 21, 34, 0.05)
```

## Shadow SM

```text
0 2px 8px rgba(6, 21, 34, 0.07)
```

## Shadow Card

```text
0 8px 24px rgba(6, 21, 34, 0.08)
```

## Shadow Floating

```text
0 16px 40px rgba(6, 21, 34, 0.12)
```

Avoid huge opaque shadows.

---

# 49. BORDER SYSTEM

Default border:

1px `#DEE5E8`.

Strong border:

1px `#CAD5DA`.

Selected border:

1.5–2px Boatly Navy or Aqua depending component.

Destructive:

semantic danger.

Most cards should use either:

border

OR

shadow.

Not heavy versions of both simultaneously.

---

# 50. FOCUS RING

Keyboard focus must be obvious.

Preferred:

2px Aqua 500 ring

with

2px surface offset where possible.

Never remove `outline` without replacing it with an accessible equivalent.

---

# 51. ICON SYSTEM

Primary icon library:

**Lucide**

Style:

* outline
* consistent stroke
* minimal
* no filled-icon mixture by default

Default stroke:

2px.

Common sizes:

16px

18px

20px

24px.

---

# 52. ICON RULES

Do not use an icon where text alone is clearer.

Do not mix:

* Lucide
* Font Awesome
* Heroicons
* Material Icons

inside the same interface without exceptional reason.

Buttons with uncommon icons should still include accessible labels/tooltips.

---

# 53. ICON + TEXT SPACING

Icon before label:

8px standard.

Compact:

6px.

Navigation:

10–12px where appropriate.

---

# 54. BUTTON — PRIMARY

Background:

Navy 900.

Foreground:

White.

Hover:

Navy 800.

Active:

Navy 950.

Focus:

Aqua ring.

Use for:

primary action on most screens.

Examples:

* Cerca barche
* Continua al pagamento
* Salva modifiche
* Aggiungi barca

---

# 55. BUTTON — AQUA / BRAND ACCENT

Background:

Aqua 400.

Foreground:

Navy 900.

Hover:

Aqua 300/500 depending visual context.

Use selectively.

Examples:

* major marketing CTA
* selected branded action
* promotional conversion point

Do NOT use Aqua buttons everywhere.

Navy remains the primary UI action color.

---

# 56. BUTTON — SECONDARY

White/light background.

Navy text.

1px border.

Hover:

muted/Aqua 50.

Examples:

* Modifica
* Visualizza
* Annulla secondary action

---

# 57. BUTTON — GHOST

Transparent.

Foreground:

Navy/Slate.

Hover:

muted background.

Used in:

* toolbars
* navigation
* tables
* secondary controls

---

# 58. BUTTON — DESTRUCTIVE

Danger background.

White text.

Only for actual destructive actions.

Examples:

* Elimina where true deletion exists
* Conferma sospensione
* Annulla prenotazione in final confirmation context

Do not make ordinary "Indietro" red.

---

# 59. BUTTON SIZES

## Large

Height:

52px.

Padding horizontal:

22–24px.

Text:

16px / 600.

## Standard

Height:

44px.

Padding:

16–20px.

Text:

14–16px / 600.

## Small

Height:

36px.

Padding:

12–14px.

Text:

14px / 600.

Touch targets should generally remain at least 44px on mobile, even where visual button appears smaller.

---

# 60. BUTTON STATES

Each button requires:

* default
* hover
* active
* focus
* loading
* disabled

Loading:

preserve button width.

Do not change:

`Prenota`

into a much shorter spinner-only button causing layout shift.

---

# 61. FORM INPUT — MARKETPLACE

Marketplace prominent input height:

52–56px.

Radius:

12–14px.

Text:

16px.

Use for:

* location
* date
* passengers
* search

Avoid cramped travel-search forms.

---

# 62. FORM INPUT — DASHBOARD

Default operator/admin control height:

40–44px.

Complex data tables/forms can use 40px.

Mobile controls should preserve comfortable touch areas.

---

# 63. INPUT VISUAL STATES

Default:

white + neutral border.

Hover:

slightly stronger border.

Focus:

Aqua ring + stronger Navy/Aqua border.

Error:

danger border + message.

Disabled:

muted background + reduced contrast but still readable.

---

# 64. FORM LABEL

Always visible for operational forms.

Do not rely purely on placeholder.

Structure:

Label

Input

Helper/Error text.

---

# 65. PLACEHOLDER

Use for examples, not labels.

Example:

Label:

`Nome della barca`

Placeholder:

`Es. Blue Wave 21`

---

# 66. ERROR MESSAGE

Use:

danger icon where useful

*

specific text.

Example:

`Inserisci un numero di passeggeri tra 1 e 8.`

Not:

`Valore non valido.`

---

# 67. SELECT / COMBOBOX

Use searchable combobox where datasets are large.

Examples:

* location
* customer
* skipper
* boat

Do not force users to scroll through huge `<select>` lists.

---

# 68. CHECKBOX

Use for independent binary choices.

Label must be clickable.

Do not use checkbox for mutually exclusive options.

---

# 69. RADIO / CHOICE CARD

Use for exclusive meaningful options.

Example:

Skipper:

* incluso
* disponibile
* richiesto
* non disponibile

For visually important choices, use choice cards with:

icon

*

title

*

short description.

---

# 70. SWITCH

Use only for settings that take effect immediately and clearly.

Avoid switch for destructive/high-consequence states.

---

# 71. SEARCH BAR — SIGNATURE COMPONENT

Marketplace search is a key Boatly signature.

Desktop:

large white floating container.

Height:

approximately 72px.

Radius:

20px.

Subtle card shadow.

Fields:

* Dove
* Quando
* Durata
* Persone

Search action visually prominent.

Fields separated by subtle dividers.

---

# 72. SEARCH BAR — DESKTOP BEHAVIOR

Search bar should feel like one cohesive object rather than four unrelated inputs.

Interaction:

hover field

→ subtle tinted background.

Focus

→ clear active section.

Search button:

Navy or Aqua according to final hero context.

---

# 73. SEARCH BAR — MOBILE

Do not compress desktop search into one tiny horizontal row.

Mobile:

search opens/uses stacked fields or dedicated search sheet.

Primary summary component may show:

location + date

with:

`Modifica ricerca`.

Touch targets remain large.

---

# 74. FILTER CHIPS

Height:

36–40px.

Radius:

full/pill allowed.

Default:

white with border.

Selected:

Navy 900 background / white text

or Aqua 100 with strong Navy border depending filter type.

Do not use many unrelated chip colors.

---

# 75. BOAT CARD — MARKETPLACE

BoatCard is a core brand component.

Recommended structure:

Image

↓

favorite button overlay

↓

boat/category + title

↓

location/operator context

↓

key attributes

↓

rating

↓

price.

---

# 76. BOAT CARD — IMAGE

Recommended ratio:

4:3.

Radius:

16–20px.

Object fit:

cover.

Image must dominate card but not consume all information.

Avoid landscape ratios so wide that boat becomes tiny on mobile.

---

# 77. BOAT CARD — VISUAL STYLE

Preferred:

white or transparent-on-warm-background card.

Very subtle border/shadow.

Do not create heavy bordered rectangles around every listing.

Hover desktop:

* slight image scale, maximum subtle
* card elevation increase
* no exaggerated movement

---

# 78. BOAT CARD — INFORMATION HIERARCHY

Priority:

1. image
2. boat name
3. price
4. location
5. key characteristics
6. rating/operator context

Do not display 15 technical specifications in result card.

---

# 79. BOAT DETAIL GALLERY

Desktop:

large hero image + supporting image grid.

Mobile:

swipeable gallery.

Image corners:

16–20px.

Fullscreen gallery available.

---

# 80. BOAT DETAIL LAYOUT

Desktop:

main content approximately 65–70%

booking summary/sidebar approximately 30–35%.

Booking panel may be sticky where appropriate.

Mobile:

single column.

Booking CTA can become sticky bottom action.

---

# 81. BOOKING SUMMARY CARD

White surface.

Radius:

20px.

Border/subtle shadow.

Clear price.

Date/time.

Passengers.

Extras.

Total.

CTA.

Do not hide total below fold unnecessarily.

---

# 82. FAVORITE BUTTON

Image-overlay icon button.

Circular or rounded-square.

White translucent/solid surface.

Heart icon.

Selected:

brand/danger-compatible filled indication.

Must remain legible over varied photography.

---

# 83. LOCATION / ATTRIBUTE ICONS

Use small Lucide icons for:

* passengers
* power
* length
* skipper
* licence
* location

Use consistent 16–18px size.

Avoid decorative icons before every sentence.

---

# 84. BADGE SYSTEM

Badges are compact state indicators.

Height:

24–28px.

Radius:

full permitted.

Text:

12–13px / 600.

Use background + text + optional icon.

---

# 85. BOOKING STATUS COLORS

Conceptual:

DRAFT:

neutral.

PENDING_PAYMENT:

warning.

PAYMENT_PROCESSING:

info.

CONFIRMED:

success.

IN_PROGRESS:

Aqua / info.

COMPLETED:

neutral-success.

CANCELLED:

danger muted.

REFUND_PENDING:

warning.

REFUNDED:

neutral/info.

NO_SHOW:

danger/neutral strong.

Exact component label always accompanies color.

---

# 86. COMPLIANCE STATUS COLORS

APPROVED:

success.

PENDING:

warning/info.

UNDER_REVIEW:

info.

REJECTED:

danger.

EXPIRED:

danger.

REQUIRES_REVIEW:

warning.

---

# 87. PAYMENT STATUS COLORS

PAID:

success.

PROCESSING:

info.

FAILED:

danger.

REFUNDED:

neutral/info.

PARTIALLY_REFUNDED:

warning/info.

DISPUTED:

danger/warning.

---

# 88. ALERT / BANNER

Variants:

* info
* success
* warning
* error

Structure:

icon

title

description

optional action.

Do not create giant full-page red areas for minor errors.

---

# 89. TOAST

Use for lightweight temporary confirmation.

Examples:

* Barca salvata
* Modifiche salvate
* Copiato

Do NOT rely solely on toast for important financial/legal outcomes.

Important states remain visible on page.

---

# 90. MODAL / DIALOG

Use for focused confirmation/action.

Standard width:

480–560px.

Complex content:

up to 720px.

Dangerous action:

explicit consequence + CTA.

Avoid nesting modals.

---

# 91. DRAWER / SHEET

Preferred on mobile for:

* filters
* search options
* simple detail panels
* quick actions

Desktop side sheet useful for:

* booking quick detail
* calendar quick view

Do not use drawer for extremely complex full-page forms.

---

# 92. TABS

Use for clearly related views.

Examples boat admin:

* Informazioni
* Prezzi
* Disponibilità
* Documenti

Avoid 12 horizontal tabs that overflow.

Large management areas may use sub-navigation instead.

---

# 93. TABLES

Operator/admin tables should be clean and dense but readable.

Header:

12–13px / 600.

Body:

14px.

Row height:

52–56px standard.

Compact optional:

44–48px.

---

# 94. TABLE STYLE

Prefer:

white surface.

Subtle horizontal dividers.

No heavy full cell grid.

Header background:

very light neutral.

Hover:

subtle Aqua/Navy tint.

Selected row:

Aqua 50 or Navy 50.

---

# 95. TABLE NUMBERS

Money:

right aligned.

Counts:

right aligned where helpful.

Text:

left.

Status:

badge.

Actions:

right side.

---

# 96. TABLE MOBILE

Do not squeeze a 10-column desktop table onto 375px.

Mobile strategies:

* cards
* condensed rows
* horizontal scroll only where genuinely useful
* detail sheet

Choose per workflow.

---

# 97. PAGINATION

Use explicit pagination for large datasets.

Standard:

Previous

page controls

Next.

Also useful:

result count.

Operator/admin may support rows per page where appropriate.

---

# 98. OPERATOR SIDEBAR

Desktop operator workspace signature:

Deep Navy sidebar.

Recommended width:

256–272px.

Preferred:

264px.

Background:

Navy 900/950.

---

# 99. OPERATOR SIDEBAR ITEMS

Default:

white at reduced opacity.

Active:

white foreground

*

subtle Aqua/Navy lighter active background

*

optional Aqua accent indicator.

Icons:

20px.

Item height:

44px.

Radius:

10–12px.

---

# 100. OPERATOR SIDEBAR STRUCTURE

Top:

Boatly logo.

Then:

primary operation:

* Dashboard
* Calendario
* Prenotazioni
* Flotta
* Clienti

Secondary management:

* Staff
* Skipper
* Documenti
* Analytics
* Pagamenti

Bottom:

workspace/operator selector

settings

user account.

Final information architecture follows sitemap.

---

# 101. OPERATOR TOPBAR

Height:

64–72px.

Contains where needed:

* page context
* workspace selector
* search
* notifications
* account

Keep topbar visually lighter than sidebar.

---

# 102. OPERATOR MOBILE NAVIGATION

Do not shrink desktop sidebar.

Use mobile navigation appropriate to primary daily actions.

Possible bottom navigation:

* Home
* Calendario
* Prenotazioni
* Flotta
* Altro

Exact B7 validation later.

---

# 103. ADMIN NAVIGATION

Admin may use a similar structural layout but more restrained.

Nav can use:

Navy sidebar

or lighter high-information variation.

Primary requirement:

states/work queues remain clear.

Do not give Admin a visually unrelated design system.

---

# 104. DASHBOARD PAGE HEADER

Structure:

Breadcrumb where needed

Page title

Supporting text optional

Primary action right aligned.

Example:

`Prenotazioni`

`Gestisci prenotazioni marketplace e manuali.`

`+ Nuova prenotazione`

---

# 105. STAT CARD

Use for key metrics.

Structure:

label

value

trend/context

optional tiny icon.

Avoid putting decorative icons in giant colored circles everywhere.

---

# 106. STAT CARD VALUE

Large:

28–32px / 700.

Label:

13–14px / 500.

Supporting comparison:

12–13px.

---

# 107. CHART SYSTEM

Charts should be restrained.

Primary series:

Navy.

Secondary:

Aqua.

Additional series selected from accessible restrained palette.

Avoid rainbow dashboards.

---

# 108. CHART PALETTE

Suggested sequence:

```text
#0B1F33
#14B8A6
#2A82A0
#5EE2D2
#64748B
#1D4ED8
```

Semantic danger/warning only when data meaning actually represents danger/warning.

---

# 109. CHART DESIGN

Use:

light gridlines.

clear axis labels.

direct labels/tooltips.

No fake 3D charts.

No unnecessary gradients.

No pie chart with 14 slices.

---

# 110. FLEET CALENDAR — CORE DESIGN

Fleet calendar is a central B2B component.

It should clearly differentiate:

* marketplace booking
* manual booking
* maintenance
* transfer
* private use/block
* temporary hold where shown

without becoming rainbow-colored.

---

# 111. CALENDAR EVENT STYLE

Use restrained event backgrounds with:

* icon
* label
* booking/customer summary
* status indication

Color must not be the only differentiator.

Example:

Marketplace booking:

Navy/Aqua branded.

Manual booking:

neutral blue/teal distinction.

Maintenance:

warning.

Private block:

slate.

---

# 112. CALENDAR BOAT ROW

For fleet timeline layouts:

left sticky boat column.

Information:

boat name

location

optional status.

Rows should be easy to scan.

---

# 113. CALENDAR DENSITY

Desktop:

dense but not cramped.

Mobile:

do not attempt to display the entire multi-boat timeline at tiny scale.

Mobile focuses on:

* agenda
* day list
* selected boat/day
* key operational tasks.

---

# 114. MAP DESIGN

Map style should visually integrate with Boatly.

Preferred:

light, clean map.

Reduce visual clutter.

Important:

water remains clearly recognizable.

Road labels secondary.

POIs limited to useful context.

Exact Mapbox style created later.

---

# 115. MAP MARKER

Base marker:

Navy.

Selected marker:

Aqua with Navy foreground or Navy with Aqua ring.

Marker may show:

* simple pin
* price pill for search
* boat-specific symbol only if legible

---

# 116. MAP PRICE MARKER

Marketplace may use price markers:

`€280`

White/Navy surface.

Selected:

Navy or Aqua emphasized.

Radius:

full.

Shadow:

subtle.

Avoid oversized speech bubbles.

---

# 117. MAP CLUSTER

Cluster:

Navy/Aqua brand.

Displays count.

Do not use many color levels unnecessarily.

---

# 118. PHOTO RATIOS

Recommended:

Boat result card:

4:3.

Destination card:

3:2 or 16:10.

Operator logo:

1:1.

Operator cover:

approximately 3:1.

Hero image:

responsive, usually 16:9–wide editorial crop.

---

# 119. SKELETON LOADING

Use skeleton for:

* cards
* tables
* booking details
* dashboard metrics

Skeleton colors:

warm/light neutral.

Animation:

subtle pulse.

Avoid distracting shimmer everywhere.

---

# 120. SPINNER

Use for short focused actions.

For page-level loading prefer:

* skeleton
* progress context

instead of giant centered spinner on empty white screen.

---

# 121. BUTTON LOADING

Keep label context where possible:

`Salvataggio…`

`Prenotazione…`

or spinner + stable width.

---

# 122. EMPTY STATE

Structure:

small icon/illustration

clear title

one sentence

primary action.

Example:

`Nessuna prenotazione per oggi`

`Quando arriverà una prenotazione la vedrai qui.`

Avoid huge cartoon illustrations for every empty table.

---

# 123. ERROR STATE

Structure:

what happened

what user can do

retry/action.

Example:

`Non siamo riusciti a caricare le prenotazioni.`

`Riprova tra qualche secondo.`

`Riprova`

---

# 124. ZERO SEARCH RESULTS

Do not simply show:

`0 risultati`.

Show:

* no matching boats
* suggestion to adjust date/radius/filters
* reset filters
* potentially nearby alternatives

without fake availability.

---

# 125. CONFIRMATION PAGE

Booking confirmation should feel:

calm

premium

reassuring.

Use:

success icon/state.

Headline:

`Prenotazione confermata`

Booking code.

Key trip information.

Buttons:

`Vedi prenotazione`

`Scarica contratto` where available.

Do not overload with upsells immediately.

---

# 126. DESTRUCTIVE CONFIRMATION

Examples:

* cancel booking
* suspend operator
* archive boat
* refund
* remove staff

Dialog must state consequence explicitly.

CTA describes action.

Example:

`Annulla prenotazione`

not:

`Sì`.

---

# 127. DATA DENSITY RULE

Marketplace:

low/medium density.

Operator:

medium/high where useful.

Admin:

high but structured.

Never use same spacing blindly across all products.

---

# 128. WHITESPACE RULE

Whitespace is functional.

Use it to separate:

* decision groups
* booking steps
* dashboard sections

Do not fill empty space simply because it exists.

---

# 129. DIVIDER RULE

Prefer spacing over dividers.

Use divider only when it clarifies structural boundaries.

Too many dividers make interface feel like legacy enterprise software.

---

# 130. GRADIENT RULE

Gradients are NOT a core UI treatment.

Potential use:

very subtle hero/brand decorative background.

Never use gradients for:

* every button
* every card
* tables
* dashboard navigation.

---

# 131. GLASSMORPHISM RULE

Avoid as standard UI.

Small translucent overlays over photography/map may be acceptable if readability remains strong.

Core app surfaces should be solid and predictable.

---

# 132. MOTION TOKENS

Fast interaction:

120–160ms.

Standard:

180–220ms.

Drawer/modal:

220–280ms.

Large page transition:

avoid unnecessary animation.

Preferred easing:

smooth ease-out.

---

# 133. MOTION BEHAVIOR

Animate:

* opacity
* transform
* expansion where helpful

Avoid animating expensive layout unnecessarily.

Respect:

`prefers-reduced-motion`.

---

# 134. HOVER

Hover only enhances desktop interaction.

Critical information/action must not require hover.

Mobile has no hover assumption.

---

# 135. TOUCH TARGETS

Interactive targets:

minimum approximately 44×44px on touch interfaces where practical.

Especially:

* icon buttons
* navigation
* map controls
* favorite
* close buttons.

---

# 136. MOBILE SAFE AREAS

Sticky bottom controls must respect device safe areas.

Particularly:

* checkout CTA
* boat detail booking CTA
* operator bottom navigation.

---

# 137. STICKY CTA — BOAT MOBILE

On boat detail mobile:

bottom sticky booking bar may show:

price

*

`Verifica disponibilità` / `Prenota`.

Must not obscure content.

---

# 138. STICKY CTA — CHECKOUT

Use carefully.

Final payment action can remain visible when appropriate but must not bypass contractual summary/acceptance.

---

# 139. FORM LAYOUT — DESKTOP

Operational form maximum useful content width:

approximately 720–900px depending fields.

Do not stretch text inputs across 1400px simply because page is wide.

Use 2-column grids for logically paired fields.

---

# 140. FORM LAYOUT — MOBILE

Single column by default.

Do not place:

first name | last name

as tiny side-by-side fields on narrow devices if readability suffers.

---

# 141. STEP / WIZARD

Used for:

* operator onboarding
* boat creation
* checkout where appropriate

Desktop:

visible progress.

Mobile:

compact current step + progress.

Do not show 12 tiny numbered circles.

Group steps meaningfully.

---

# 142. ONBOARDING PROGRESS

Show:

what is completed

current step

what remains.

Allow save-and-return where product permits.

---

# 143. COMPLIANCE UI

Compliance should feel:

serious but understandable.

Present:

requirement

status

expiration

action.

Example:

`Assicurazione`

`Scade il 12 settembre`

`Carica rinnovo`

Not raw database states.

---

# 144. DOCUMENT CARD

Contains:

document type

status

filename/reference

expiration

review note where relevant

action.

Private documents should not resemble public image cards.

---

# 145. FILE UPLOAD

Drag-and-drop desktop + explicit select button.

Mobile:

file/photo chooser.

Show:

accepted type

max size

upload progress

success/failure.

Never show upload as complete until actual server/storage confirmation.

---

# 146. CUSTOMER IDENTITY / LICENCE FORMS

Visually distinguish:

required legal information

from:

optional profile information.

Explain why sensitive information is requested.

Do not create intimidating bureaucratic forms unless necessary.

---

# 147. PRICE BREAKDOWN

Use clear hierarchy:

Base rental

Extras

Fees/taxes where applicable

Discount

Divider

Total.

Deposit shown separately if not charged as rental price.

---

# 148. COMMISSION BREAKDOWN — OPERATOR

Operator financial UI clearly separates:

Customer paid

Boatly commission

Provider/other costs where shown

Refund impact

Operator amount

Payout.

No unexplained number.

---

# 149. RESPONSIVE SEARCH RESULTS

Desktop:

map + list side by side where screen allows.

Potential split:

approximately 55% list / 45% map

or context-driven.

Tablet:

switchable or adjusted split.

Mobile:

default list

*

persistent `Mappa` toggle/action.

Do not force tiny split screen on phone.

---

# 150. MOBILE MAP

Map can occupy full screen.

Floating controls:

back/list

filters

search area.

Selected boat preview:

bottom card.

---

# 151. NAVBAR — MARKETPLACE DESKTOP

Height:

72–80px.

Contains:

Boatly logo

primary links where needed

operator CTA

account.

Should feel light and spacious.

---

# 152. NAVBAR — MARKETPLACE MOBILE

Height:

60–64px.

Logo.

Minimal actions.

Avoid squeezing full desktop menu.

Use menu/account controls.

---

# 153. LOGO CLEAR SPACE

Until final logo asset exists:

reserve comfortable visual space around Boatly wordmark.

Do not place logo flush against container edges.

---

# 154. BRAND LOGO COLOR APPLICATION

Preferred:

Navy logo on light background.

White logo on Navy.

Aqua may appear in symbol/detail but should not make wordmark harder to read.

---

# 155. ACCESSIBILITY — COLOR

Color cannot be sole information carrier.

Examples:

Red badge must also say:

`Rifiutato`.

Green calendar event should include icon/label/context.

---

# 156. ACCESSIBILITY — FORMS

Every control needs:

* programmatic label
* error association
* focus indication
* understandable instructions

Placeholder is not enough.

---

# 157. ACCESSIBILITY — ICON BUTTONS

Icon-only controls require accessible name.

Example:

heart icon:

`Aggiungi ai preferiti`.

---

# 158. ACCESSIBILITY — MODALS

Modal must:

* trap focus appropriately
* provide title
* close safely
* return focus
* support Escape where appropriate.

---

# 159. ACCESSIBILITY — MAP

Map-based results must have equivalent list access.

Never make map the only way to choose boat.

---

# 160. ACCESSIBILITY — MOTION

Respect reduced-motion preference.

Essential information cannot depend on animation.

---

# 161. CONTENT WIDTH — DASHBOARD

Operator/admin main content maximum may be wide for tables/calendars.

Text/form subareas should still maintain sensible widths.

Wide page does not mean all elements stretch edge-to-edge.

---

# 162. DASHBOARD RESPONSIVE COLLAPSE

Desktop sidebar

↓

tablet collapsible sidebar

↓

mobile drawer/bottom navigation.

Main content adapts without horizontal page overflow.

---

# 163. MOBILE TABLE ACTIONS

Do not display five tiny icon actions.

Use:

primary action

*

overflow menu.

---

# 164. OVERFLOW MENU

Use for secondary row/item actions.

Example:

* Modifica
* Duplica
* Pausa
* Archivia

Destructive action separated visually.

---

# 165. TOOLTIP

Use for:

* unfamiliar icon
* truncated technical meaning
* extra explanation

Do not hide essential instructions inside tooltip.

---

# 166. BREADCRUMBS

Use in deep operator/admin hierarchy.

Example:

Flotta

/

Blue Wave 21

/

Prezzi.

Do not use breadcrumbs unnecessarily on simple customer pages.

---

# 167. PROGRESS INDICATOR

Use for:

* onboarding
* boat publication
* payment processing
* upload

Progress should reflect real state when possible.

Do not fake percentage progression for unknown processes.

---

# 168. RATING COMPONENT

Use:

star icon

numeric rating

review count.

Example:

`★ 4,8 (124)`

Do not display meaningless five empty decorative stars everywhere.

---

# 169. REVIEW CARD

Contains:

rating

customer display name where permitted

date

verified-booking indicator where appropriate

text.

Moderation must preserve trust.

---

# 170. VERIFIED LABEL

Only display:

`Prenotazione verificata`

if verification model actually supports it.

Visual:

small restrained badge.

Not giant trust seal.

---

# 171. AVAILABILITY UI

Available:

clear selectable state.

Unavailable:

disabled/visually muted.

Selected:

strong Navy/Aqua outline/background.

Never use only red vs green with no other cue.

---

# 172. DATE PICKER

Should clearly support:

* unavailable days
* selected start
* selected interval
* operator timezone implications where necessary.

Touch-friendly on mobile.

---

# 173. TIME SELECTOR

Time slots:

clear selectable controls.

Unavailable:

disabled.

Selected:

Navy background.

Do not require precise manual time typing where fixed slots are intended.

---

# 174. BOOKING SOURCE VISUAL

Operator dashboard should distinguish:

Marketplace

vs

Manual.

Use small label/icon.

Do not make manual bookings look secondary or less real operationally.

Both block calendar equally.

---

# 175. MARKETPLACE BOOKING LABEL

Example:

Boatly

with small Aqua/Navy badge.

Manual:

`Manuale`.

Keep distinction clear but subtle.

---

# 176. WORKSPACE SWITCHER

When operator belongs to multiple companies:

workspace switcher should show:

logo/avatar

operator name

current role where useful.

Changing workspace changes tenant context.

Must be obvious which company is currently active.

---

# 177. CUSTOMER SUPPORT UI

Support should feel:

human

clear

non-technical.

Provide booking context automatically where user launches support from booking.

---

# 178. ADMIN RISK UI

Admin surfaces serious states clearly.

Examples:

* disputed payment
* expired compliance
* suspicious listing
* payout problem

Use semantic banners/badges rather than decorative color explosions.

---

# 179. DESIGN TOKEN NAMING

Prefer semantic tokens:

```text
color-background
color-surface
color-primary
color-accent
color-border
color-muted
color-success
color-warning
color-danger
```

Rather than implementation components using raw names like:

`tealGreenButton`.

---

# 180. COMPONENT NAMING

Reusable UI component naming should reflect purpose.

Examples:

* Button
* Badge
* BoatCard
* SearchBar
* BookingSummary
* StatusBadge
* OperatorSidebar
* FleetCalendar
* PriceBreakdown

Do not create:

* BlueRoundedBox
* FancyCard2
* NewButtonFinal

---

# 181. CUSTOMER DESIGN QUALITY BAR

Marketplace pages should feel comparable in polish to leading modern travel/consumer products.

But Boatly must remain recognizably its own brand.

Prioritize:

* photography
* speed
* simple hierarchy
* pricing clarity
* strong search
* trustworthy checkout.

---

# 182. OPERATOR DESIGN QUALITY BAR

Operator product should feel like software a professional can use every morning.

Prioritize:

* calendar
* bookings
* fleet state
* clear actions
* shortcuts
* information density
* stable layout.

Do not sacrifice operational efficiency for visual spectacle.

---

# 183. ADMIN DESIGN QUALITY BAR

Admin is not a customer marketing experience.

Prioritize:

* investigation speed
* safe actions
* state visibility
* traceability
* review queues
* pagination/filtering.

---

# 184. AI-GENERATED DESIGN RULES

Any AI generating Boatly UI must:

1. use this design system;
2. never invent unrelated colors;
3. use Geist Sans;
4. use Lucide icons;
5. use semantic CSS variables;
6. preserve defined radius scale;
7. preserve spacing scale;
8. keep Navy as primary action;
9. use Aqua as accent rather than everywhere;
10. avoid gradients unless specifically requested;
11. avoid glassmorphism;
12. avoid excessive pill components;
13. maintain accessible focus states;
14. design mobile behavior intentionally;
15. avoid tiny desktop layouts squeezed onto mobile;
16. reuse existing components;
17. not create inconsistent page-specific design systems.

---

# 185. DESIGN REVIEW CHECKLIST

Before accepting a screen, ask:

Does it look like Boatly?

Is hierarchy immediately understandable?

Is primary action obvious?

Is price/state clear?

Is mobile considered?

Are touch targets comfortable?

Are colors semantic?

Is contrast sufficient?

Are components reused?

Is unnecessary decoration removed?

Does the screen feel premium without feeling elitist?

---

# 186. DESIGN SIGNATURE

The distinctive visual combination of Boatly should become:

Warm off-white canvas

*

Deep navy typography/navigation

*

Bright aquatic accent

*

large authentic boat photography

*

rounded but disciplined surfaces

*

clean Geist typography

*

highly polished search/map interaction.

---

# 187. B2 FINAL TOKENS — QUICK REFERENCE

## Primary

`#0B1F33`

## Accent

`#14B8A6`

## Bright Accent

`#2DD4BF`

## Background

`#FCFBF8`

## Card

`#FFFFFF`

## Border

`#DEE5E8`

## Muted

`#F1F5F4`

## Muted Text

`#64748B`

## Success

`#16805D`

## Warning

`#B45309`

## Danger

`#B42318`

## Info

`#1D4ED8`

## Font

Geist Sans

## Base body

16 / 24

## Standard button

44px height

## Marketplace large control

52–56px

## Standard radius

12–16px

## Boat card radius

16–20px

## Base spacing

4px

## Main content

1280px

## Outer max

1440px

## Operator sidebar

264px

---

# 188. B2 COMPLETION CRITERIA

B2 is complete when Boatly has fixed:

* exact color palette
* semantic color tokens
* font family
* font scale
* font weights
* spacing scale
* layout grid
* containers
* breakpoints
* radius
* shadows
* borders
* focus states
* icons
* buttons
* forms
* selectors
* search
* filters
* marketplace cards
* boat detail layout
* badges
* semantic states
* dialogs
* sheets
* tables
* navigation
* operator sidebar
* admin styling
* analytics/charts
* fleet calendar styling
* map styling
* loading states
* error states
* empty states
* responsive fundamentals
* accessibility
* motion
* AI design constraints

This document becomes the design-system source of truth for all future Boatly interfaces.
