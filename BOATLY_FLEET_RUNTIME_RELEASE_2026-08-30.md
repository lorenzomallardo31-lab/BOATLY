# Boatly Ops — flotta e stati operativi

Data release: 30 agosto 2026

## Risultato

- La pagina “Periodi e blocchi” usa una sola intestazione e una sola navigazione.
- Il calendario distingue quattro condizioni operative:
  - `Prenotata`: prenotazione confermata, partenza non ancora registrata;
  - `IN MARE`: partenza registrata;
  - `RIENTRATA`: rientro registrato;
  - `Blocco`: barca non disponibile.
- Il rientro può essere registrato dal prossimo impegno del cruscotto “Oggi” e dalla cella odierna del calendario.
- Un blocco su più giorni può essere rimosso solo dal giorno selezionato oppure da tutto il periodo.
- Una barca può essere duplicata dalla sua scheda.

## Cosa viene duplicato

- dati tecnici e descrittivi;
- sede e configurazione operativa;
- servizi, optional e dotazioni;
- modalità di noleggio;
- formule, prezzi e regole di prezzo;
- disponibilità settimanale.

La copia nasce `ACTIVE`, con nome e codice interno univoci. Non vengono copiati:

- prenotazioni e blocchi;
- foto e documenti;
- recensioni e storico di pubblicazione;
- matricola, numero di registrazione e identificativo dello scafo.

## Integrità del database

- La liberazione di un solo giorno è atomica: il blocco originale viene rilasciato e le porzioni precedenti/successive vengono ricreate nella stessa transazione.
- L’esclusione PostgreSQL continua a impedire sovrapposizioni sulla stessa barca.
- Duplicazione e rilascio richiedono una sessione autenticata e il ruolo `OWNER` o `MANAGER` sullo stesso operatore.
- Le nuove funzioni non sono eseguibili da `anon` o `public`.
- Il collaudo database è stato eseguito in transazione con `ROLLBACK`: nessun record di prova è rimasto nei dati.

## Migrazioni

- `20260830101140_operator_fleet_runtime_controls.sql`
- `20260830101451_duplicate_boat_physical_identity_guard.sql`

Entrambe risultano applicate al progetto Supabase collegato e i numeri di versione locali sono allineati alla cronologia remota.

## Verifiche completate

- ESLint: superato
- TypeScript: superato
- test unitari: 16/16
- build Next.js di produzione: superata
- audit dipendenze: 0 vulnerabilità
- test transazionale duplicazione/configurazioni: superato
- test transazionale divisione blocco multi-giorno: superato

## Collaudo umano dopo il deploy

1. Aprire “Flotta” → una barca → “Periodi e blocchi” e verificare che l’intestazione compaia una sola volta.
2. Creare una prenotazione per oggi, registrare la partenza e verificare `IN MARE` nel calendario.
3. Registrare il rientro e verificare `RIENTRATA` con il secondo tono verde.
4. Creare un blocco di almeno tre giorni, aprire il giorno centrale e scegliere “Libera solo questo giorno”.
5. Verificare che i due giorni adiacenti siano ancora bloccati; poi rimuovere tutto il periodo residuo.
6. Duplicare una barca configurata e verificare dati, servizi e prezzi sulla nuova unità.
