# Boatly Ops — Runbook del pilot assistito

## Perimetro

Questo runbook riguarda il gestionale multi-tenant reale. Il marketplace resta
spento (`MARKETPLACE_ENABLED=false`) e Stripe resta in TEST. Il pilot è adatto
a 3–5 Founding Partner seguiti direttamente, non ancora a vendita self-service.

## Accessi e ruoli

- `SUPER_ADMIN` / `ADMIN`: ruoli piattaforma assegnati solo internamente in
  `platform_user_roles`; non esiste registrazione admin pubblica.
- `OWNER`: proprietario del workspace operatore.
- `MANAGER`: gestione operativa, team e storni finanziari.
- `EMPLOYEE`: prenotazioni, CRM e registrazione incassi; non può stornare.
- `SKIPPER`: accesso limitato; non vede o modifica il registro finanziario.

Non usare account condivisi. Ogni persona deve avere il proprio utente e deve
essere invitata dalla pagina Team. Il token di invito è mostrato una sola volta,
scade e nel database viene conservato solo il suo hash.

## Onboarding e approvazione di un noleggiatore

1. Inviare il link beta riservato al noleggiatore.
2. Il noleggiatore apre `/sign-up`, conferma l’email e completa attività, sede,
   profilo legale e documenti.
3. La creazione produce un operatore `DRAFT`; l’invio porta a
   `PENDING_VERIFICATION`. Non può diventare operativo automaticamente.
4. L’amministratore apre `/admin/verifications`, controlla il fascicolo e
   approva, rifiuta o richiede modifiche.
5. L’approvazione ordinaria porta l’operatore ad `ACTIVE`.
6. Per un caso eccezionale, `/admin/operators/[id]` consente a
   `SUPER_ADMIN`/`ADMIN` di sospendere, riattivare, correggere workspace,
   profilo legale, sedi e membri. Il motivo è obbligatorio e finisce nell’audit.

Un amministratore non deve impersonare silenziosamente il cliente. L’accesso
assistito al workspace è consentito solo se l’account admin è anche membro
esplicito di quel workspace; altrimenti si interviene dal control center.

## Operatività quotidiana

1. Dashboard: controllare agenda, barche disponibili e richieste pendenti.
2. Calendario: 45 giorni orizzontali, barche in verticale. Ogni cella apre
   prenotazione, blocco, saldo e collegamenti operativi.
3. Prenotazioni: creare un cliente nuovo nella stessa transazione oppure
   scegliere il CRM. Sovrapposizioni di barca e cliente sono bloccate dal DB.
4. CRM: correggere contatti e note; email e telefono sono univoci per tenant.
5. Flotta: gestire stato, disponibilità, formule legali, prezzi, extra e foto.
6. Finanza: registrare incassi/rimborsi esterni; non usarla per movimenti Stripe.
7. Team: invitare collaboratori con il ruolo minimo necessario.

## Registro finanziario manuale

- Il registro è solo per prenotazioni `MANUAL` e non muove denaro.
- Acconto, saldo, pagamento completo, cauzione e altro sono classificati.
- La cauzione è separata dal ricavo commerciale.
- Non è possibile incassare oltre il totale della prenotazione.
- Non è possibile rimborsare più di quanto risulta incassato nella categoria.
- Gli invii concorrenti sono serializzati tramite lock sulla prenotazione.
- Un movimento non si modifica né si elimina. Owner/Manager possono stornarlo
  con una motivazione; movimento e storno restano nell’audit.
- Una prenotazione con movimenti attivi non può essere riprogrammata con
  sostituzione immutabile. Prima occorre definire/stornare correttamente il
  relativo flusso finanziario.
- Il CSV mensile è disponibile da `/operator/finance`.

## Sospensione e incidente account

1. Aprire `/admin/operators/[id]`.
2. Impostare `SUSPENDED` con motivo preciso e non contenente dati sensibili.
3. Se sospetto furto account: revocare le sessioni da Supabase Auth, reimpostare
   la password e verificare i log prima della riattivazione.
4. Controllare gli ultimi `audit_logs` del tenant e le operazioni finanziarie.
5. Correggere dati solo con i comandi tracciati; non fare update SQL manuali.
6. Riattivare con un nuovo motivo amministrativo dopo la verifica.

## Monitoraggio minimo giornaliero

- Vercel: errori 5xx, latenza e build/deploy falliti.
- Supabase: database health, Auth error/rate limit e advisor.
- Stripe TEST: webhook falliti e mismatch di riconciliazione.
- Health check: `/api/health/supabase` deve rispondere senza dati sensibili.
- Audit: verificare eventi admin, storni, inviti e import anomali.

I log applicativi sono JSON strutturati. Non aggiungere email, telefoni, token,
documenti o dati cliente ai log. Prima del primo abbonamento standard collegare
un servizio centralizzato con alert (per esempio Sentry o un Vercel Log Drain).

## Backup e ripristino

Prima di usare dati di un cliente reale:

1. Scegliere un piano Supabase con retention adeguata e, se necessario, PITR.
2. Documentare RPO/RTO concordati (obiettivo iniziale suggerito: RPO 24h,
   RTO 8h per pilot assistito).
3. Pianificare export cifrato del database e inventario Storage.
4. Eseguire un ripristino su un progetto Supabase isolato, mai sopra produzione.
5. Verificare conteggi, RLS, Auth mapping e apertura allegati.
6. Registrare data, esito e responsabile del restore drill.

Un backup non è considerato verificato finché non viene ripristinato e testato.

## Rilascio

Ogni rilascio deve superare:

```text
npm run lint
npm run typecheck
npm run test:unit
npm run build
npm audit --audit-level=high
```

Applicare le migrazioni Supabase prima del deploy applicativo compatibile.
Verificare poi il percorso completo indicato in `06_TESTING:/PILOT_ACCEPTANCE.md`.
Non abilitare `MARKETPLACE_ENABLED`, Stripe LIVE o cancellazioni dati durante il
pilot senza un rilascio e una procedura dedicati.

## Attività esterne obbligatorie prima di clienti paganti non assistiti

- MFA per account admin/finanza.
- Password minima remota di almeno 12 caratteri e password compromesse bloccate.
- CAPTCHA e rate limit Auth.
- Monitoraggio centralizzato e alert reperibili.
- Backup/PITR e restore drill completato.
- Termini SaaS, Privacy, DPA, sub-responsabili e procedura data breach.
- Canale di assistenza, tempi di risposta e procedura incidenti.
- Stripe Billing, fatturazione e gestione del mancato pagamento.

