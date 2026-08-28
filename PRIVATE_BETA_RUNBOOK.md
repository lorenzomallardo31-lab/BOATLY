# Boatly — beta privata condivisibile

## Obiettivo

La beta è una superficie dimostrativa, non un servizio commerciale. Solo chi
riceve il link di invito può aprire le pagine anonime, registrarsi e provare i
flussi. Gli account già registrati possono continuare ad accedere dal login.

Il gestionale commerciale interattivo è disponibile su `/demo-gestionale` con
dati interamente sintetici. Ogni visitatore riceve un workspace separato,
personalizzato al primo ingresso con nome e sede geografica reale della propria attività e
persistente soltanto nel `localStorage` del proprio browser. Può creare e
gestire prenotazioni, aggiungere, rinominare, modificare o rimuovere le barche
della flotta, aggiornare note CRM, analizzare ricavi e scaricare un CSV
dimostrativo. Nessuna azione interroga o modifica operatori, clienti, pagamenti
o prenotazioni reali.

La sede viene selezionata dai suggerimenti Mapbox limitati all'Italia e salvata
insieme a coordinate, comune e regione. Il gestionale richiede quindi anche la
variabile pubblica `NEXT_PUBLIC_MAPBOX_TOKEN`. Il visitatore non può confermare
una sede digitata liberamente: deve scegliere un risultato geografico reale.

L'area noleggiatore usa un'identità visiva separata dal marketplace e include
un calendario operativo autonomo. Aprendo una giornata si possono gestire la
prenotazione e la relativa barca oppure creare un booking già precompilato per
quel giorno. Prenotazioni, clienti e barche sono interamente modificabili e
rimuovibili; finanza e indicatori restano valori derivati per non creare
incoerenze manuali.

La flotta iniziale contiene una sola imbarcazione, anch'essa eliminabile. La
scheda di inserimento richiede soltanto nome, cavalli e obbligo patente; gli
altri dati tecnici e commerciali sono facoltativi. Gli optional includono SUP,
snorkeling, sci nautici, Seabob, skipper, ghiacciaia/bevande, transfer e un
extra personalizzato con prezzo.

Quando una barca viene rimossa, la demo chiede conferma e indica quante
prenotazioni sintetiche sono associate. Confermando, elimina dal solo workspace
locale sia la barca sia quelle prenotazioni, mantenendo coerenti agenda,
dashboard, CRM e finanza.

Il pulsante `Ripristina` elimina esclusivamente lo scenario demo del browser
corrente e ricarica i dati sintetici iniziali. Le modifiche non sono condivise
tra dispositivi, browser o invitati.

## Configurazione Vercel

Variabili server-only richieste in Production:

```text
BETA_PRIVATE_MODE=true
BETA_ACCESS_TOKEN=<segreto casuale di almeno 24 caratteri>
```

Variabile pubblica richiesta per la configurazione geografica:

```text
NEXT_PUBLIC_MAPBOX_TOKEN=<public token pk.*>
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
3. `/demo-gestionale` → inserimento nome attività e selezione della sede da un
   suggerimento Mapbox italiano; verificare intestazione, mappa e persistenza.
4. Calendario → aprire una giornata e gestire da lì barca, prenotazione e nuovo
   booking precompilato.
5. Flotta → verificare la singola barca iniziale, aggiungere una barca usando i
   tre soli campi obbligatori, associare optional, modificare e rimuovere.
6. Prenotazioni → modificare tutti i campi e lo stato; verificare che dashboard,
   flotta, cliente e finanza si aggiornino.
7. CRM → aggiungere, modificare e rimuovere un cliente, controllando le
   prenotazioni collegate.
8. Registrazione → email di conferma → login.
9. Account fondatore → card Admin → accesso `/admin` e `/operator`.
10. `robots.txt` → `Disallow: /`.
11. Header globale → `X-Robots-Tag: noindex, nofollow, noarchive`.
12. Stripe → chiavi e pagamenti esclusivamente TEST.
13. Telefono → configurazione iniziale, barra gestionale inferiore, schede
   booking e modali della flotta utilizzabili
   senza zoom o scorrimento orizzontale della pagina.
