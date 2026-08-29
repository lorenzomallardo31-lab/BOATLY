# Boatly Ops pilot release — 29 agosto 2026

Questo documento è il manifest tecnico del pacchetto cumulativo preparato per il
pilot assistito di Boatly Ops. Non contiene credenziali o valori di ambiente.

## Base e destinazione

- Repository di destinazione: `lorenzomallardo31-lab/BOATLY`, branch `main`.
- Ultimo commit pubblico osservato prima di questo pacchetto: `8491f8a`.
- Progetto Supabase: `vuvoraroyvzmiizzmddk`.
- Marketplace: disattivato (`MARKETPLACE_ENABLED=false`).
- Stripe: esclusivamente TEST; Stripe LIVE non è stato attivato.
- Il pacchetto è cumulativo perché la copia di lavoro usata per lo sviluppo non
  contiene la directory `.git`.

## Funzioni incluse

- Gestionale persistente e multi-tenant su Supabase.
- Onboarding del noleggiatore con stato iniziale da approvare.
- Control center amministrativo con approvazione, attivazione, sospensione,
  sblocco e correzione controllata degli operatori.
- Flotta reale con dati, stato, formule, listini, disponibilità, optional, foto e
  pubblicazione.
- Calendario operativo di 45 giorni: barche sulle righe, giorni sulle colonne,
  intestazioni bloccate, scorrimento orizzontale, dettaglio e azioni rapide.
- Prenotazioni manuali con controllo atomico di sovrapposizioni per barca e
  cliente, inclusi conflitti parziali e richieste concorrenti.
- Riprogrammazione immutabile con storico e blocco quando esistono movimenti
  finanziari attivi.
- CRM persistente con creazione, modifica, ricerca, deduplicazione rigorosa e
  importazione CSV fino a 500 righe.
- Team con inviti monouso, scadenza, ruoli e revoca.
- Registro finanziario manuale append-only per incassi, rimborsi e cauzioni,
  con saldi, report mensile ed export CSV.
- Stripe Connect TEST e rimborsi marketplace già esistenti, mantenuti separati
  dalla cassa manuale del gestionale.
- Audit delle operazioni sensibili e log strutturati senza dati personali.
- UI responsive, header di sicurezza, noindex e marketplace isolato.

## Protezioni dati e concorrenza

- RLS e controlli tenant restano l'autorità finale.
- Le scritture dirette sul registro finanziario sono revocate agli utenti
  autenticati: sono disponibili soltanto RPC controllate.
- Il totale commerciale non può essere sovraincassato.
- Un rimborso non può superare gli incassi non ancora restituiti della stessa
  categoria.
- Le cauzioni sono separate dai ricavi commerciali.
- I lock seguono l'ordine prenotazione -> movimento per evitare corse e deadlock.
- Le correzioni finanziarie avvengono tramite annullamento auditato; i fatti
  economici originari non vengono riscritti.

## Migrazioni nuove già applicate al progetto remoto

- `20260828130000_ops_calendar_crm_integrity.sql`
- `20260828131500_fix_manual_booking_snapshot_order.sql`
- `20260828140000_admin_operator_control_center.sql`
- `20260828143000_ops_customer_booking_mutations.sql`
- `20260828143500_fix_ops_customer_current_date.sql`
- `20260828150000_operator_team_management.sql`
- `20260828151000_operator_customer_csv_import.sql`
- `20260828152000_ops_hot_path_indexes.sql`
- `20260828153000_operator_manual_finance_ledger.sql`
- `20260828153500_block_financed_booking_reschedule.sql`
- `20260828154000_fix_manual_finance_lock_order.sql`

Le migrazioni finanziarie finali sono state verificate anche tramite l'elenco
migrazioni remoto. Non rieseguire manualmente SQL già applicato.

## Verifiche concluse

- `npm run lint`: superato.
- `npm run typecheck`: superato.
- test unitari: 10/10 superati.
- `next build`: superato, 48 route generate o validate.
- `npm audit --audit-level=high`: 0 vulnerabilità.
- regressione SQL transazionale: superata dopo l'ultima correzione dei lock.
- ACL registro finanziario: INSERT/UPDATE/DELETE diretti negati; RPC autorizzate
  disponibili.
- controllo route e header HTTP locale: superato con configurazione sintetica.
- scansione del pacchetto: nessun segreto incorporato; il token Mapbox è
  richiamato solo tramite variabile pubblica prevista.

La verifica visuale automatica non è stata possibile nell'ambiente di sviluppo
per indisponibilità del daemon browser. Va quindi completata la checklist
manuale su desktop e telefono dopo il deploy.

## Variabili necessarie in Vercel Production

Configurare i nomi seguenti senza inserire i valori in Git:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_MAPBOX_TOKEN`
- `SUPABASE_SECRET_KEY`
- `STRIPE_SECRET_KEY` con chiave TEST
- `STRIPE_WEBHOOK_SECRET` con secret TEST
- `STRIPE_LIVE_REFUNDS_ENABLED=false`
- `APP_URL`
- `BETA_PRIVATE_MODE=true`
- `BETA_ACCESS_TOKEN`
- `MARKETPLACE_ENABLED=false`

## Gate esterni prima del primo pilot reale

1. Eseguire `06_TESTING:/PILOT_ACCEPTANCE.md` su desktop e mobile con account
   admin, owner, manager ed employee.
2. Attivare in Supabase Auth password compromesse, password minima di almeno 12
   caratteri, CAPTCHA/rate limiting e protezioni sessione appropriate.
3. Rendere obbligatoria MFA almeno per amministratori e ruoli finanziari.
4. Scegliere un piano Supabase con backup adeguato e provare un ripristino su un
   progetto isolato.
5. Collegare monitoraggio centralizzato e alert per errori, latenza, database e
   webhook.
6. Completare contratto pilot, privacy, DPA, sub-responsabili, assistenza,
   procedura incidenti e data breach con professionisti competenti.
7. Non attivare Stripe LIVE o il marketplace senza un collaudo dedicato.

## Limiti intenzionali del pilot

- Il pilot è assistito, non un SaaS self-service definitivo.
- Stripe Billing, piani a pagamento e fatturazione SaaS non sono ancora
  implementati.
- Firma elettronica, manutenzione avanzata, WhatsApp e calendari esterni sono
  roadmap, non parte di questa release.
- Gli advisor Supabase segnalano ancora ottimizzazioni di policy/indici e la
  protezione password compromesse da abilitare; gli avvisi `SECURITY DEFINER`
  sono gestiti dal modello RPC autorizzato e vanno riesaminati periodicamente.

## Documenti operativi

- `03_TECHNICAL:/PILOT_OPERATIONS_RUNBOOK.md`
- `06_TESTING:/PILOT_ACCEPTANCE.md`
- `06_TESTING:/ops-database-regression.sql`
- `PRIVATE_BETA_RUNBOOK.md`

