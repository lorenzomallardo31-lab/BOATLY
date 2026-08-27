# Boatly — beta privata condivisibile

## Obiettivo

La beta è una superficie dimostrativa, non un servizio commerciale. Solo chi
riceve il link di invito può aprire le pagine anonime, registrarsi e provare i
flussi. Gli account già registrati possono continuare ad accedere dal login.

Il gestionale commerciale è disponibile in sola lettura su
`/demo-gestionale` con dati interamente sintetici. Non interroga né modifica
dati di operatori, clienti, pagamenti o prenotazioni reali.

## Configurazione Vercel

Variabili server-only richieste in Production:

```text
BETA_PRIVATE_MODE=true
BETA_ACCESS_TOKEN=<segreto casuale di almeno 24 caratteri>
```

`BETA_ACCESS_TOKEN` non deve mai essere prefissata con `NEXT_PUBLIC_`, inserita
nel codice, salvata in Git o comunicata separatamente dal link di invito.

In produzione la modalità privata è fail-closed: se il token manca o è troppo
corto, i visitatori anonimi non possono entrare.

## Link da condividere

```text
https://boatly-test-operator.vercel.app/accesso-beta#token=<BETA_ACCESS_TOKEN>
```

Il token resta nel fragment `#` e non viene inviato nella prima richiesta HTTP,
nei referrer o nei normali log del server. La pagina lo scambia via HTTPS con un
cookie `HttpOnly`, `Secure`, `SameSite=Lax`, valido 30 giorni, poi rimuove il
fragment dalla cronologia del browser.

Il link è un segreto condiviso: chi lo riceve può inoltrarlo. Per revocarlo,
ruotare `BETA_ACCESS_TOKEN` su Vercel e creare un nuovo deployment. Tutti i
cookie di invito precedenti diventano automaticamente non validi.

Gli utenti che hanno già creato e confermato un account continuano ad accedere
tramite login. Per revocare anche un singolo account occorre disabilitarlo o
eliminarlo in Supabase Auth dopo avere valutato i dati associati.

## Percorsi volutamente raggiungibili senza invito

- `/accesso-beta` e `/api/beta-access`: attivazione dell'invito;
- `/sign-in`, `/forgot-password`, `/update-password`: accesso e recupero degli
  account già esistenti;
- `/auth/confirm`: conferma email e recovery Supabase;
- `/api/stripe/webhook`: webhook pubblico con firma Stripe obbligatoria;
- `/api/health/supabase`: health check senza dati sensibili;
- `/robots.txt`: blocco crawler.

Tutte le autorizzazioni sensibili restano verificate nelle pagine, nelle Server
Actions e nelle funzioni database. Il cookie beta non assegna ruoli, non concede
accesso ad aree cliente/operator/admin e non sostituisce Supabase Auth.

## Account amministratore

Gli amministratori non si registrano da una pagina pubblica. Il ruolo viene
assegnato esclusivamente lato database. L'account del fondatore deve accedere
da `/sign-in`; la card `Boatly Admin` appare in `/account` solo quando esiste un
ruolo valido in `platform_user_roles`.

## Protezioni della beta

- `robots.txt` blocca ogni crawler;
- metadata e header `X-Robots-Tag` impostano `noindex`, `nofollow`, `noarchive`;
- un banner persistente segnala ambiente dimostrativo e pagamenti TEST;
- con la modalità beta privata attiva, il backend rifiuta qualsiasi chiave
  Stripe LIVE anche se configurata per errore;
- webhook e privilegi admin mantengono le verifiche server-side indipendenti
  dal cancello di invito.

## Checklist dopo ogni rilascio

1. URL normale in finestra anonima → reindirizzamento ad `accesso-beta`.
2. Link completo → apertura homepage e rimozione del token dall'indirizzo.
3. `/demo-gestionale` → navigazione read-only tra tutte le viste.
4. Registrazione → email di conferma → login.
5. Account fondatore → card Admin → accesso `/admin` e `/operator`.
6. `robots.txt` → `Disallow: /`.
7. Header globale → `X-Robots-Tag: noindex, nofollow, noarchive`.
8. Stripe → chiavi e pagamenti esclusivamente TEST.
