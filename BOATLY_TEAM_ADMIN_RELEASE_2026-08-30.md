# Boatly Ops — collaboratori e amministrazione essenziale

Data release: 30 agosto 2026

## Risultato

- I collaboratori invitabili sono soltanto:
  - `Operatore`: usa il calendario e gestisce l’operatività quotidiana;
  - `Manager`: usa il calendario e può gestire anche flotta e collaboratori.
- `Skipper` non è più selezionabile come ruolo del gestionale. Il valore tecnico resta nell’enum storico del database per non rompere le migrazioni precedenti.
- Le formule commerciali “con skipper” o “senza skipper” restano disponibili: descrivono il servizio offerto al cliente e non sono ruoli di accesso.
- Inviti, sospensioni, riattivazioni e rimozioni dei collaboratori non richiedono più una motivazione testuale.
- Le azioni continuano a essere registrate nell’audit con autore, data, stato precedente e stato successivo.
- Un operatore semplice non vede più il collegamento “Collaboratori”, perché non può gestire gli accessi.

## Area amministratore

- L’accesso applicativo è riservato esclusivamente al ruolo `SUPER_ADMIN`.
- La navigazione contiene soltanto `Noleggiatori` e `Account`.
- Le vecchie aree globali Prenotazioni, Finanza, Casi, Privacy e Verifiche reindirizzano in sicurezza alla gestione noleggiatori.
- Sono stati rimossi dalla scheda noleggiatore i contatori e i collegamenti del vecchio marketplace per documenti e compliance.
- Restano le funzioni necessarie: conferma/rifiuto, blocco temporaneo, eliminazione, correzione dati, controllo collaboratori e audit.
- Il blocco, lo sblocco o la revoca di un collaboratore dall’admin non richiedono una motivazione.
- Le correzioni manuali di dati sensibili e l’eliminazione definitiva mantengono conferme e motivazioni, perché sono operazioni diverse dalla semplice gestione dell’accesso.

## Integrità del database

- Le funzioni PostgreSQL accettano nuovi inviti e cambi ruolo soltanto per `MANAGER` ed `EMPLOYEE`.
- `SKIPPER` viene rifiutato anche se una vecchia interfaccia prova a inviarlo direttamente.
- Le funzioni di revoca accettano una motivazione opzionale e continuano ad applicare i controlli su autenticazione, tenant e ruolo.
- Le funzioni `SECURITY DEFINER` usano `search_path` vuoto, non sono eseguibili da `anon` e autorizzano il chiamante al loro interno.
- Nessun collaboratore o invito Skipper esisteva nei dati: non è stata necessaria alcuna conversione.

## Migrazione

- `20260830151340_simplify_team_roles_and_admin.sql`

La migrazione è già stata applicata al progetto Supabase collegato.

## Verifiche completate

- ESLint: superato
- TypeScript: superato
- test unitari: 16/16
- build Next.js di produzione: superata
- audit dipendenze: 0 vulnerabilità
- test transazionale invito Operatore + revoca senza motivo: superato con `ROLLBACK`
- test transazionale rifiuto del ruolo Skipper: superato con `ROLLBACK`

## Collaudo umano dopo il deploy

1. Accedere come proprietario e aprire `Altro → Collaboratori`.
2. Verificare che i ruoli disponibili siano soltanto Operatore e Manager.
3. Creare e revocare un invito senza inserire una motivazione.
4. Sospendere e riattivare un collaboratore senza inserire una motivazione.
5. Accedere come Operatore e verificare che `Altro` non mostri la gestione collaboratori.
6. Accedere come super-admin e verificare che la barra superiore mostri soltanto Noleggiatori e Account.
7. Aprire un vecchio URL amministrativo, per esempio `/admin/finance`, e verificare il reindirizzamento a `/admin/operators`.
