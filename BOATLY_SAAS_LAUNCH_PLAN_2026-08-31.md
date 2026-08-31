# Boatly Ops — piano di trasformazione in SaaS

Data checkpoint: 31 agosto 2026

## Obiettivo

Portare Boatly Ops da anteprima privata a gestionale SaaS utilizzabile e
vendibile a un primo noleggiatore reale, mantenendo il marketplace spento e
separato. Il prodotto iniziale è una web app responsive installabile su telefono
e computer; le app native vengono valutate solo dopo il pilot.

## Confini della prima versione vendibile

Incluso:

- proprietario registrato tramite email e password;
- approvazione, rifiuto, sospensione e cancellazione da parte dell'admin Boatly;
- operatori creati dal proprietario con username e password;
- workspace isolato per ogni attività;
- calendario come centro operativo;
- flotta, prenotazioni, blocchi, partenza, rientro e messaggi WhatsApp avviati
  manualmente dal gestionale;
- utilizzo responsive e installazione come web app;
- monitoraggio, backup, supporto e procedura di rilascio controllata.

Escluso dalla prima versione:

- marketplace pubblico;
- pagamenti e incassi del marketplace;
- creazione automatica di prenotazioni leggendo conversazioni WhatsApp;
- applicazioni native iOS e Android;
- modalità offline con modifica dei dati.

## Stato tecnico verificato

| Area | Stato | Nota |
| --- | --- | --- |
| Build Next.js | Superata | Lint, typecheck, 23 test unitari e build verdi prima di questa fase |
| Database | Attivo | Supabase in regione Europa, stato healthy |
| Persistenza | Presente | I dati operativi reali sono su Supabase, non nel browser |
| Multi-tenant | Presente | Workspace e membership sono filtrati per operatore con RLS e controlli server |
| Admin | Presente | Approvazione, blocco e cancellazione degli account operatori |
| Staff | Presente | Account username/password gestiti dal proprietario |
| Marketplace | Spento | Chiusura fail-closed tramite configurazione |
| Calendario | Operativo | Prenotazioni, blocchi, partenza, rientro e flotta |
| Piano Supabase | Da aggiornare | Attualmente Free: non adatto a un cliente pagante per garanzie e backup |
| Piano Vercel | Da aggiornare | Attualmente Hobby: da portare a un piano commerciale prima della vendita |
| Monitoraggio esterno | Mancante | Health endpoint presente; manca ancora un allarme automatico |
| Dominio e email | Mancanti | Servono dominio applicativo e SMTP personalizzato |
| Legale e privacy | Mancanti | Servono contratti e informative approvati da un professionista |

L'audit Supabase non rileva errori critici, ma segnala funzioni
`SECURITY DEFINER` eseguibili da utenti autenticati. Le funzioni ispezionate
hanno `search_path` bloccato e controllano `auth.uid()`; restano da classificare
e testare con identità appartenenti a workspace diversi prima del pilot.

## Piano operativo

### Fase 1 — modalità pilot reale e installabilità

Stato: in corso.

- introdurre modalità applicativa `preview`, `pilot`, `production`;
- in modalità pilot rimuovere banner e percorsi della demo;
- portare la home dell'app ad accesso/calendario, senza riaprire il marketplace;
- aggiungere manifest, icone, installazione PWA e service worker network-only;
- non memorizzare dati sensibili offline;
- aggiungere health check completo e schermate di recupero dagli errori;
- mantenere noindex sull'app gestionale.

Definizione di completamento:

- da URL principale un utente non autenticato vede il login;
- un utente autenticato entra nel calendario;
- demo e invito beta non appaiono nel prodotto pilot;
- il gestionale è installabile su telefono e computer;
- `/api/health` restituisce esito, release e stato della dipendenza senza segreti;
- verifica automatica completa verde in modalità preview e pilot.

### Fase 2 — sicurezza e isolamento end-to-end

Stato: pianificata, priorità massima.

- test automatici con due proprietari e due workspace distinti;
- tentativi di lettura, scrittura e RPC incrociati che devono fallire;
- test di sospensione proprietario e operatore con sessione già aperta;
- revisione di ogni funzione privilegiata e revoca delle funzioni non usate;
- protezione signup/login/reset con CAPTCHA e limiti;
- attivazione protezione password compromesse;
- durata sessione e procedure di revoca definite;
- controllo dei bucket Storage e dei documenti privati.

Definizione di completamento:

- nessun account vede o modifica dati di un altro noleggiatore;
- gli accessi sospesi perdono realmente operatività;
- gli avvisi di sicurezza restanti sono documentati e intenzionali;
- esiste un report ripetibile di sicurezza pre-rilascio.

### Fase 3 — affidabilità operativa

Stato: pianificata.

- Supabase Pro con backup e politica di ripristino;
- Vercel Pro per uso commerciale;
- ambiente staging separato dalla produzione;
- deploy tramite Git con preview, test, promozione e rollback;
- monitoraggio uptime su `/api/health`;
- error tracking con Sentry o equivalente;
- Web Analytics e Speed Insights limitati alle metriche necessarie;
- registro delle operazioni critiche e procedura incidenti;
- esportazione periodica dei dati del cliente.

Definizione di completamento:

- un errore applicativo genera un avviso;
- un deploy difettoso può essere annullato rapidamente;
- un backup può essere ripristinato in una prova documentata;
- staging e produzione non condividono dati reali.

### Fase 4 — onboarding e assistenza del primo cliente

Stato: pianificata.

- dominio `app.<dominio>` e mittente email verificato;
- flusso richiesta account, conferma email, approvazione admin e prima configurazione;
- guida iniziale molto breve dentro il calendario;
- importazione o inserimento assistito della flotta;
- canale supporto e tempi di risposta dichiarati;
- raccolta feedback e registro dei bug del pilot;
- accordo pilot con perimetro, durata e trattamento dati.

Definizione di completamento:

- il cliente entra senza assistenza tecnica nel terminale;
- sa creare barca, prenotazione, blocco, operatore e gestire la giornata;
- sa come chiedere supporto ed esportare i propri dati;
- Boatly sa disattivare l'account senza perdere tracciabilità.

### Fase 5 — abbonamenti e ciclo SaaS

Stato: dopo la validazione del pilot.

- definire un piano iniziale semplice e relativi limiti;
- Stripe Billing per prova, abbonamento, rinnovo, insoluto e cancellazione;
- webhook idempotenti e audit delle variazioni di piano;
- periodo di tolleranza prima del blocco per mancato pagamento;
- fatturazione e gestione fiscale definite con commercialista;
- pannello admin con stato commerciale separato dallo stato di verifica.

Definizione di completamento:

- ogni account ha uno stato contrattuale certo;
- nessun evento Stripe duplicato duplica effetti;
- cancellazione ed esportazione dati seguono regole comunicate.

### Fase 6 — sito commerciale e lancio

Stato: dopo il pilot.

- sito pubblico separato dall'app;
- proposta di valore, funzioni, prezzo, FAQ e richiesta demo;
- privacy policy, cookie policy, termini, DPA e informazioni societarie;
- demo guidata con dati sintetici separata dalla produzione;
- misurazione di richiesta demo, attivazione e uso del calendario;
- riapertura futura del marketplace solo tramite progetto e gate distinti.

## Sequenza consigliata

1. Chiudere Fase 1.
2. Eseguire Fase 2 prima di caricare dati reali di un cliente.
3. Attivare piani commerciali, staging, backup e monitoraggio della Fase 3.
4. Inserire un solo cliente pilot con assistenza ravvicinata.
5. Osservare almeno due settimane di operatività reale.
6. Correggere i problemi emersi.
7. Integrare abbonamenti e sito commerciale.
8. Vendere a un secondo gruppo ristretto prima di una promozione ampia.

## Attività che richiedono il titolare Boatly

- acquistare o scegliere il dominio;
- passare Supabase e Vercel a piani consentiti per uso commerciale;
- scegliere il fornitore SMTP e verificare il dominio email;
- abilitare MFA sugli account infrastrutturali;
- far revisionare documenti legali, privacy e contratto pilot;
- definire prezzo, durata del pilot e assistenza promessa;
- indicare il primo noleggiatore e autorizzare l'uso dei suoi dati;
- effettuare i passaggi di pagamento o conferma richiesti dai fornitori.

## Regole di rilascio

- nessuna modifica diretta in produzione senza test automatici;
- migrazioni database prima su staging;
- preview verificata prima della promozione;
- un solo pacchetto cumulativo per ogni rilascio manuale;
- nessun segreto in Git, ZIP, schermate o documenti;
- rollback documentato per codice e database;
- marketplace sempre spento finché non viene approvata una fase dedicata.
