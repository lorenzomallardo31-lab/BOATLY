# Boatly Ops — patente, skipper obbligatorio e calendario mobile

Release: 31 agosto 2026

Questa release collega in modo atomico la patente richiesta dalla barca, la
risposta del cliente e l'eventuale assegnazione dello skipper. Introduce inoltre
una vista mobile del calendario progettata per capire la giornata senza dover
scorrere una matrice larga.

## Regole della prenotazione

- Boatly legge sempre dal database se la barca richiede la patente nautica;
- se la patente non è richiesta, lo skipper resta facoltativo;
- se la patente è richiesta, viene chiesto se il cliente la possiede;
- con risposta `Sì`, lo skipper resta facoltativo;
- con risposta `No`, si deve scegliere uno skipper disponibile oppure crearne
  uno sul momento;
- `Nessuno` e `Da assegnare` non sono accettati quando il cliente non possiede
  la patente richiesta;
- le stesse regole valgono creando, modificando o spostando una prenotazione;
- la validazione finale avviene nel database e non può essere aggirata
  modificando il form nel browser;
- prenotazione, risposta sulla patente e skipper vengono salvati nella stessa
  transazione: in caso di errore non restano dati parziali.

## Protezioni del database

- nuova tabella `booking_navigation_requirements`, isolata per workspace con
  Row Level Security;
- snapshot del requisito patente della barca e della risposta del cliente;
- blocco automatico della rimozione dello skipper quando la prenotazione attiva
  lo richiede;
- nuove procedure atomiche per creazione, modifica e spostamento;
- accesso anonimo revocato; le procedure verificano autenticazione e ruolo
  operativo prima di modificare i dati;
- audit delle modifiche sensibili mantenuto.

## Calendario da telefono

- il calendario desktop resta invariato;
- selettore orizzontale compatto dei 45 giorni visibili;
- riepilogo immediato di barche prenotate, bloccate e libere nel giorno scelto;
- una scheda verticale per ogni barca, con colori e informazioni operative;
- cliente, orari, note, motivo del blocco e skipper sono leggibili senza
  spostarsi lateralmente nella griglia;
- ogni scheda apre lo stesso dettaglio completo già usato dal calendario
  desktop, quindi tutte le azioni restano disponibili.

## Migrazione database

La migrazione è già stata applicata al progetto Supabase collegato ed è inclusa
nel repository con lo stesso identificativo registrato in produzione:

- `20260831190611_booking_license_skipper_guard.sql`.

Non rieseguire manualmente il contenuto nel SQL Editor.

## Verifiche eseguite

- lint completato;
- controllo TypeScript completato;
- 29 test unitari superati;
- build di produzione Next.js completata;
- audit dipendenze: 0 vulnerabilità;
- test transazionali sul database per tutti i rami patente/skipper, senza dati
  di prova persistenti;
- tentativo di rimozione non valida dello skipper correttamente respinto;
- RLS, trigger e quattro nuove procedure verificati in produzione;
- advisor Supabase: nessun nuovo errore; gli avvisi sulle procedure
  `SECURITY DEFINER` sono intenzionali perché costituiscono l'API autenticata e
  contengono i controlli di ruolo. L'indice nuovo segnalato come non usato è
  normale subito dopo la creazione.

## Compatibilità

Questa release richiede che sia già presente:

- `BOATLY_INTERNAL_SKIPPERS_RELEASE_2026-08-31.md`.

Il pacchetto di installazione verifica il prerequisito prima di modificare il
progetto.
