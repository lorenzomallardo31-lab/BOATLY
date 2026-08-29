# Boatly Ops — gestionale privato condivisibile

## Obiettivo

La beta pubblica del marketplace è sospesa. Il codice resta nel progetto per
una futura riattivazione, ma home, ricerca, schede barca, checkout,
registrazione cliente e prenotazioni cliente non sono raggiungibili. Solo chi
riceve il link di invito può aprire Boatly Ops; gli account amministrativi già
registrati possono continuare ad accedere dal login.

Il gestionale commerciale interattivo è disponibile su `/demo-gestionale` con
dati interamente sintetici. Ogni visitatore riceve un workspace separato,
personalizzato al primo ingresso con nome e sede geografica reale della propria attività e
persistente soltanto nel `localStorage` del proprio browser. Può creare e
gestire prenotazioni, aggiungere, rinominare, modificare o rimuovere le barche
della flotta, aggiornare note CRM, analizzare ricavi e scaricare un CSV
dimostrativo. Nessuna azione interroga o modifica operatori, clienti, pagamenti
o prenotazioni reali.

Il gestionale persistente è disponibile su `/operator`. Un noleggiatore che ha
ricevuto l’accesso beta può creare il proprio account da `/sign-up` e indicare
soltanto il nome dell’attività. La richiesta appare subito come `Da verificare`
nel pannello del fondatore. Solo la conferma del `SUPER_ADMIN` abilita il
workspace e apre direttamente il calendario. I dati reali sono multi-tenant su
Supabase e sincronizzati tra dispositivi.

Il modulo di nuova prenotazione accetta sia clienti già presenti sia un nuovo
nominativo inserito manualmente. In quest'ultimo caso nome, email e telefono
vengono trasformati automaticamente in una nuova scheda CRM collegata al
booking; il nome è obbligatorio, mentre i contatti restano facoltativi.

Ogni salvataggio passa dallo stesso controllo di integrità, anche quando parte
dal calendario o dalla modifica di un record esistente. La demo impedisce
clienti duplicati per nome normalizzato, email o telefono; email e numeri non
validi; prenotazioni sovrapposte per la stessa barca o lo stesso cliente;
orari invertiti, capienza superata, importi non validi e uso di barche non
attive. Due uscite consecutive sono ammesse soltanto quando la prima termina
esattamente prima dell'inizio della seconda. Nomi barca e optional devono
inoltre essere univoci. Un controllo globale segnala eventuali incoerenze già
presenti nel workspace prima dell'aggiornamento.

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
MARKETPLACE_ENABLED=false
```

`MARKETPLACE_ENABLED` è fail-closed: se manca o contiene un valore diverso da
`true`, le rotte cliente restano offline e vengono reindirizzate al gestionale.
Per la futura apertura della piattaforma sarà necessario impostarla
esplicitamente a `true` e creare un nuovo deployment.

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

Il link apre direttamente `/demo-gestionale`. È un segreto condiviso: chi lo
riceve può inoltrarlo. Per revocarlo,
ruotare `BETA_ACCESS_TOKEN` su Vercel e creare un nuovo deployment. Tutti i
cookie di invito precedenti diventano automaticamente non validi.

Gli utenti che hanno già creato e confermato un account continuano ad accedere
tramite login. Rifiuto ed eliminazione revocano l’accesso operativo, disattivano
immediatamente la flotta e fanno sparire account e barche entro due minuti. I
record indispensabili a prenotazioni, contabilità e audit sono conservati come
tombstone invisibili e non possono essere riattivati dal noleggiatore.

## Percorsi tecnici volutamente raggiungibili senza invito

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

La coda `/admin/operators` mostra soltanto `Da verificare`, `Confermato` e
`Rifiutato`. Il control center `/admin/operators/[id]` consente esclusivamente
al `SUPER_ADMIN` fondatore di confermare, rifiutare, eliminare o correggere un
workspace. Ogni comando richiede una motivazione ed è registrato in
`audit_logs`. Un indice univoco impedisce la creazione di un secondo
`SUPER_ADMIN`.

## Gestionale reale

- calendario a matrice con 45 giorni e imbarcazioni in verticale;
- prenotazioni manuali atomiche e protezione DB contro sovrapposizioni;
- CRM modificabile, identità univoche e import CSV fino a 500 righe;
- flotta con soli stati Disponibile/Non disponibile, servizi, dotazioni,
  periodi, blocchi e prezzi;
- riprogrammazione immutabile delle prenotazioni prive di movimenti attivi;
- team con inviti email-bound, ruoli e lifecycle;
- registro off-platform per acconti, saldi, cauzioni e rimborsi;
- storni append-only, saldi in calendario e CSV mensile per il commercialista.

Il registro manuale non muove denaro e non sostituisce Stripe. Le cauzioni sono
separate dai ricavi; sovraincassi e rimborsi eccessivi sono bloccati dal DB.

## Protezioni della beta

- `robots.txt` blocca ogni crawler;
- metadata e header `X-Robots-Tag` impostano `noindex`, `nofollow`, `noarchive`;
- un banner persistente segnala ambiente dimostrativo e pagamenti TEST;
- con la modalità beta privata attiva, il backend rifiuta qualsiasi chiave
  Stripe LIVE anche se configurata per errore;
- webhook e privilegi admin mantengono le verifiche server-side indipendenti
  dal cancello di invito.

## Rotte marketplace sospese

Con `MARKETPLACE_ENABLED=false`, `/`, `/cerca`, `/search`, `/barche`,
`/come-funziona`, `/checkout` e `/prenotazioni` non rendono più il marketplace.
Le visite GET vengono portate a `/demo-gestionale`; eventuali POST ricevono
`404 marketplace-offline`. `/sign-up` è invece la registrazione Boatly Ops e
resta raggiungibile solo da chi ha già superato il cancello beta.
`/admin`, `/operator`, `/account` e il login richiedono i rispettivi account e
ruoli.

## Checklist dopo ogni rilascio

1. URL normale in finestra anonima → reindirizzamento ad `accesso-beta`.
2. Link completo → apertura diretta del gestionale e rimozione del token
   dall'indirizzo.
3. `/demo-gestionale` → inserimento nome attività e selezione della sede da un
   suggerimento Mapbox italiano; verificare intestazione, mappa e persistenza.
4. Calendario → aprire una giornata e gestire da lì barca, prenotazione e nuovo
   booking precompilato.
5. Flotta → verificare la singola barca iniziale, aggiungere una barca usando i
   tre soli campi obbligatori, associare optional, modificare e rimuovere.
6. Prenotazioni → modificare tutti i campi e lo stato; verificare che dashboard,
   flotta, cliente e finanza si aggiornino.
7. Integrità → provare una sovrapposizione anche parziale: il salvataggio deve
   essere bloccato indicando prenotazione e intervallo in conflitto. Verificare
   anche un nuovo cliente con nome, email o telefono già presenti.
8. CRM → aggiungere, modificare e rimuovere un cliente, controllando le
   prenotazioni collegate.
9. Marketplace → `/`, ricerca, schede barca, checkout, prenotazioni cliente e
   registrazione devono riportare al gestionale senza mostrare contenuti.
10. Registrazione Ops → nome attività → `Da verificare` → conferma del solo
    fondatore → apertura diretta del calendario.
11. Calendario reale → matrice 45 giorni, popup booking e saldo, creazione dalla
    cella, conflitto parziale bloccato.
12. Finanza reale → acconto/saldo/cauzione, sovraincasso bloccato, storno
    Owner/Manager e CSV mensile.
13. Login fondatore → `/admin/operators`; confermare, rifiutare ed eliminare un
    account di prova verificando la scomparsa entro due minuti.
14. `robots.txt` → `Disallow: /`.
15. Header globale → `X-Robots-Tag: noindex, nofollow, noarchive`.
16. Stripe → chiavi e pagamenti esclusivamente TEST.
17. Telefono → configurazione iniziale, barra gestionale inferiore, schede
   booking e modali della flotta utilizzabili
   senza zoom o scorrimento orizzontale della pagina.
