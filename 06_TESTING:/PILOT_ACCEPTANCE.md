# Boatly Ops — Collaudo di accettazione pilot

Eseguire in ambiente TEST con un’attività dedicata. Non usare dati personali o
pagamenti reali. Annotare data, revisione Git, tester ed esito di ogni sezione.

## 1. Cancello privato e autenticazione

- Finestra anonima, URL normale: accesso negato e rinvio a `/accesso-beta`.
- Link con token: cookie HttpOnly creato, fragment rimosso, demo accessibile.
- Registrazione Ops: password sotto 12 caratteri rifiutata; email confermata.
- Recupero password e nuovo login riusciti.
- `robots.txt` e `X-Robots-Tag`: nessuna indicizzazione.

## 2. Onboarding e amministrazione

- Nuovo operatore nasce `DRAFT`, poi `PENDING_VERIFICATION` dopo l’invio.
- Prima dell’approvazione non crea prenotazioni/incassi reali.
- Admin vede fascicolo e può richiedere modifiche, rifiutare o approvare.
- Approvazione porta ad `ACTIVE`.
- Admin sospende e riattiva con motivo; entrambe le azioni appaiono nell’audit.
- Admin corregge nome, sede e profilo membro senza accedere a dati di altro tenant.

## 3. Isolamento multi-tenant

- Owner A non vede barche, clienti, prenotazioni, membri o finanza di B.
- ID di B inviato manualmente a una Server Action/RPC di A viene rifiutato.
- Anonimo non legge tabelle operative e non esegue RPC sensibili.
- Authenticated non può scrivere direttamente CRM o registro finanziario.

## 4. Flotta

- Creazione barca valida con nome, cavalli e patente.
- Capienza, stato, sede, formula, prezzi, extra, foto e disponibilità modificabili.
- Barca inattiva non può entrare in una nuova prenotazione.
- Dati storici della prenotazione non cambiano modificando successivamente la barca.

## 5. CRM e import

- Creazione/modifica cliente con almeno email o telefono.
- Email duplicata, telefono duplicato e identità incrociata vengono bloccati.
- Import CSV: righe valide create, errori riportati per riga, limite 500 rispettato.
- Storico prenotazioni e valore nella scheda cliente coerenti.

## 6. Prenotazioni e concorrenza

- Creazione da pagina e da cella calendario con campi precompilati.
- Nuovo cliente creato atomicamente insieme alla prenotazione.
- Sovrapposizione anche parziale della stessa barca bloccata.
- Sovrapposizione anche parziale dello stesso cliente bloccata.
- Due prenotazioni adiacenti (fine uguale all’inizio successivo) consentite.
- Doppio invio simultaneo produce una sola prenotazione valida.
- Riprogrammazione conserva la vecchia prenotazione cancellata e crea la nuova.

## 7. Calendario richiesto

- Almeno 20 giorni visibili/scorribili orizzontalmente; orizzonte totale 45 giorni.
- Tutte le barche sono righe verticali; intestazioni e colonna barche restano sticky.
- Celle libera/prenotata/blocco/non attiva sono distinguibili.
- Click su prenotazione mostra cliente, orari, passeggeri, riferimento e saldo.
- Dal popup si aprono prenotazione, incassi, barca e disponibilità.
- Testare desktop, tablet e telefono senza zoom forzato della pagina.

## 8. Finanza manuale

- Acconto e saldo non superano il totale del booking.
- Tentativo di sovraincasso, anche concorrente, rifiutato.
- Rimborso superiore al netto incassato rifiutato.
- Cauzione separata da incasso e saldo commerciale.
- Employee registra; solo Owner/Manager storna.
- Storno richiede motivo, mantiene la riga `VOIDED` e ricalcola i saldi.
- Prenotazione con movimento attivo non è riprogrammabile.
- CSV del mese apre in Excel/Numbers e non interpreta celle come formule.

## 9. Team

- Token errato o email diversa non consente l’accettazione.
- Invito valido crea il membro col ruolo previsto.
- Manager non assegna ruoli superiori; ultimo Owner non viene disabilitato.
- Revoca, sospensione, riattivazione e rimozione sono auditate.

## 10. Gate tecnico

- `npm run verify` completato.
- Advisor Supabase rivisti e rischi residui documentati.
- Nessuna chiave, token o PII nei log/diff/ZIP.
- Migrazioni applicate nell’ordine corretto.
- Health check e pagine critiche rispondono dopo il deploy.

## Criterio di uscita

Il pilot può partire solo con tutte le sezioni tecniche superate e con backup,
contratto pilota, privacy/DPA, canale assistenza e responsabile incidenti definiti.

