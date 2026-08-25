# BOATLY — SITEMAP

**Version:** 1.1
**Status:** Phase A — Final Approved Specification

---

# 1. PUBLIC MARKETPLACE

## Homepage

`/`

## Search

`/cerca`

List + synchronized map.

## Boat Detail

`/barche/[boatSlug]`

## Operator Public Profile

`/noleggiatori/[operatorSlug]`

---

# 2. DESTINATIONS

`/destinazioni`

`/destinazioni/[locationSlug]`

Potential SEO rental landing pages:

`/noleggio-barche/[locationSlug]`

`/noleggio-gommoni/[locationSlug]`

`/noleggio-barche-senza-patente/[locationSlug]`

Additional pages only where Boatly has real inventory and useful content.

---

# 3. CATEGORIES

`/categorie`

`/categorie/[categorySlug]`

---

# 4. PUBLIC INFORMATION

`/come-funziona`

`/diventa-noleggiatore`

`/assistenza`

`/contatti`

---

# 5. MARKETPLACE TRANSPARENCY

`/trasparenza-ranking`

`/recensioni-e-verifica`

`/segnala`

`/reclami`

`/accessibilita`

---

# 6. PUBLIC LEGAL

Provisional route structure:

`/legal/termini-clienti`

`/legal/privacy`

`/legal/cookie`

`/legal/cancellazioni`

`/legal/recensioni`

`/legal/operatori`

`/legal/pagamenti`

Exact final legal pages and naming require professional review before production.

---

# 7. AUTHENTICATION

`/accedi`

`/registrati`

`/registrati/cliente`

`/registrati/noleggiatore`

`/password-dimenticata`

`/reimposta-password`

`/verifica-email`

---

# 8. CHECKOUT

Primary route:

`/checkout/[bookingDraftId]`

Conceptual stages:

`/checkout/[bookingDraftId]/requisiti`

`/checkout/[bookingDraftId]/extra`

`/checkout/[bookingDraftId]/dati`

`/checkout/[bookingDraftId]/riepilogo`

`/checkout/[bookingDraftId]/pagamento`

`/checkout/[bookingDraftId]/elaborazione`

`/checkout/[bookingDraftId]/confermato`

`/checkout/[bookingDraftId]/errore`

Implementation may use one route with internal steps.

---

# 9. CUSTOMER ACCOUNT

Root:

`/account`

## Bookings

`/account/prenotazioni`

`/account/prenotazioni/[bookingId]`

`/account/prenotazioni/[bookingId]/contratto`

## Favorites

`/account/preferiti`

## Reviews

`/account/recensioni`

## Payments

`/account/pagamenti`

## Notifications

`/account/notifiche`

## Profile

`/account/profilo`

## Security

`/account/sicurezza`

## Privacy

`/account/privacy`

---

# 10. OPERATOR ONBOARDING

`/operator/onboarding`

`/operator/onboarding/azienda`

`/operator/onboarding/dati-legali`

`/operator/onboarding/sedi`

`/operator/onboarding/documenti`

`/operator/onboarding/pagamenti`

`/operator/onboarding/verifica`

`/operator/onboarding/completato`

---

# 11. OPERATOR DASHBOARD

Root:

`/operator`

---

# 12. OPERATOR CALENDAR

`/operator/calendario`

Central fleet calendar.

---

# 13. OPERATOR BOOKINGS

`/operator/prenotazioni`

`/operator/prenotazioni/nuova`

`/operator/prenotazioni/[bookingId]`

`/operator/prenotazioni/[bookingId]/contratto`

---

# 14. OPERATOR FLEET

`/operator/flotta`

`/operator/flotta/nuova`

`/operator/flotta/[boatId]`

Boat management sections:

`/operator/flotta/[boatId]/informazioni`

`/operator/flotta/[boatId]/specifiche`

`/operator/flotta/[boatId]/motore`

`/operator/flotta/[boatId]/offerta-legale`

`/operator/flotta/[boatId]/foto`

`/operator/flotta/[boatId]/servizi`

`/operator/flotta/[boatId]/prezzi`

`/operator/flotta/[boatId]/extra`

`/operator/flotta/[boatId]/disponibilita`

`/operator/flotta/[boatId]/calendario`

`/operator/flotta/[boatId]/documenti`

`/operator/flotta/[boatId]/compliance`

`/operator/flotta/[boatId]/pubblicazione`

---

# 15. OPERATOR LOCATIONS

`/operator/sedi`

`/operator/sedi/nuova`

`/operator/sedi/[locationId]`

---

# 16. OPERATOR CUSTOMERS / CRM

`/operator/clienti`

`/operator/clienti/nuovo`

`/operator/clienti/[customerId]`

---

# 17. OPERATOR STAFF

`/operator/staff`

`/operator/staff/invita`

`/operator/staff/[memberId]`

---

# 18. OPERATOR SKIPPERS

`/operator/skipper`

`/operator/skipper/nuovo`

`/operator/skipper/[skipperId]`

`/operator/skipper/[skipperId]/documenti`

`/operator/skipper/[skipperId]/calendario`

---

# 19. OPERATOR EXTRAS

`/operator/extra`

`/operator/extra/nuovo`

`/operator/extra/[extraId]`

---

# 20. OPERATOR PAYMENTS

`/operator/pagamenti`

`/operator/pagamenti/[paymentId]`

---

# 21. OPERATOR PAYOUTS

`/operator/payout`

---

# 22. OPERATOR PLAN / SUBSCRIPTION

`/operator/piano`

---

# 23. OPERATOR ANALYTICS

`/operator/analytics`

---

# 24. OPERATOR REVIEWS

`/operator/recensioni`

---

# 25. OPERATOR DOCUMENTS

`/operator/documenti`

---

# 26. OPERATOR COMPLIANCE

`/operator/compliance`

---

# 27. OPERATOR CONTRACTS

`/operator/contratti`

`/operator/contratti/[bookingId]`

---

# 28. OPERATOR BUSINESS

`/operator/azienda`

`/operator/azienda/profilo-pubblico`

`/operator/azienda/dati-legali`

---

# 29. OPERATOR SETTINGS

`/operator/impostazioni`

`/operator/impostazioni/cancellazioni`

`/operator/impostazioni/notifiche`

`/operator/impostazioni/sicurezza`

---

# 30. ADMIN DASHBOARD

`/admin`

---

# 31. ADMIN USERS

`/admin/utenti`

`/admin/utenti/[userId]`

---

# 32. ADMIN OPERATORS

`/admin/noleggiatori`

`/admin/noleggiatori/[operatorId]`

`/admin/noleggiatori/[operatorId]/verifica`

`/admin/noleggiatori/[operatorId]/compliance`

---

# 33. ADMIN BOATS

`/admin/barche`

`/admin/barche/[boatId]`

`/admin/barche/[boatId]/verifica`

`/admin/barche/[boatId]/compliance`

---

# 34. ADMIN BOOKINGS

`/admin/prenotazioni`

`/admin/prenotazioni/[bookingId]`

---

# 35. ADMIN PAYMENTS

`/admin/pagamenti`

`/admin/pagamenti/[paymentId]`

---

# 36. ADMIN REFUNDS

`/admin/rimborsi`

`/admin/rimborsi/[refundId]`

---

# 37. ADMIN PAYOUTS

`/admin/payout`

`/admin/payout/[payoutId]`

---

# 38. ADMIN COMMISSIONS

`/admin/commissioni`

---

# 39. ADMIN SUBSCRIPTIONS / PLANS

`/admin/piani`

`/admin/abbonamenti`

---

# 40. ADMIN REVIEWS

`/admin/recensioni`

`/admin/recensioni/[reviewId]`

---

# 41. ADMIN CONTENT REPORTS

`/admin/segnalazioni`

`/admin/segnalazioni/[reportId]`

---

# 42. ADMIN DOCUMENTS

`/admin/documenti`

`/admin/documenti/[documentId]`

---

# 43. ADMIN COMPLIANCE

`/admin/compliance`

---

# 44. ADMIN DAC7

`/admin/dac7`

`/admin/dac7/operatori`

`/admin/dac7/periodi`

`/admin/dac7/report`

---

# 45. ADMIN PRIVACY

`/admin/privacy`

`/admin/privacy/[requestId]`

---

# 46. ADMIN SUPPORT

`/admin/support`

`/admin/support/[ticketId]`

---

# 47. ADMIN AUDIT

`/admin/audit-log`

---

# 48. ADMIN SETTINGS

`/admin/impostazioni`

Potential settings areas:

* marketplace;
* commissions;
* reference data;
* legal document versions;
* compliance requirements;
* notifications.

---

# 49. ERROR / APPLICATION STATES

Next.js-managed states include:

* 403 / forbidden;
* 404 / not found;
* 500 / application failure;
* maintenance/outage states.

Literal static routes are not necessarily required for all states.

---

# 50. NAVIGATION PRINCIPLES

Public navigation:

simple and customer-focused.

Operator navigation:

workspace and operations focused.

Admin navigation:

platform-data and workflow focused.

Private resources never appear in public navigation.
