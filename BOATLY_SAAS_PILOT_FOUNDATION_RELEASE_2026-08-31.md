# Boatly SaaS pilot foundation

Release: 31 agosto 2026

Questa release introduce le fondamenta per usare Boatly Ops con un primo
noleggiatore reale, mantenendo il marketplace disattivato.

## Incluso

- modalità `preview`, `pilot` e `production`;
- ingresso pilot su login/calendario e chiusura dei percorsi e dell'endpoint beta;
- banner dimostrativo nascosto in pilot e produzione;
- PWA installabile con icone Boatly e service worker network-only;
- nessuna cache offline di dati autenticati o dati cliente;
- health check pubblico `/api/health` con release e stato dipendenza;
- schermate di recupero per errore globale e pagina inesistente;
- piano completo di trasformazione e criteri di rilascio SaaS;
- test unitari della modalità prodotto.

## Configurazione

La produzione pilot richiede:

```text
BOATLY_APP_MODE=pilot
MARKETPLACE_ENABLED=false
```

`BETA_PRIVATE_MODE` può rimanere configurato per compatibilità: in modalità
pilot l'accesso è protetto dagli account individuali e dalle regole del
workspace, non dal vecchio link condiviso dell'anteprima.

## Verifica

- `npm run verify` deve terminare senza errori;
- una build esplicita con `BOATLY_APP_MODE=pilot` deve riuscire;
- `/` reindirizza a `/sign-in` senza sessione;
- `/demo-gestionale` e `/accesso-beta` non aprono la demo in modalità pilot;
- `/manifest.webmanifest` e `/sw.js` rispondono correttamente;
- `/api/health` risponde `200` quando Supabase Auth è disponibile.

## Limiti intenzionali

- non è stata introdotta una modalità offline operativa;
- non sono stati attivati pagamenti SaaS;
- non è stata riaperta la piattaforma marketplace;
- non sono state implementate prenotazioni automatiche da WhatsApp.
