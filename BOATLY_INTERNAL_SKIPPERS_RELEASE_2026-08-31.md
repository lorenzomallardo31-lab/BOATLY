# Boatly Ops — skipper interni nelle prenotazioni

Release: 31 agosto 2026

Questa release aggiunge gli skipper come risorse operative del noleggio, senza
creare account, email o password separati. Il proprietario e gli operatori li
gestiscono dal workspace e possono assegnarli direttamente alle prenotazioni.

## Esperienza operativa

- nuova rubrica `Altro → Skipper`;
- nome obbligatorio; telefono e nota facoltativi;
- disponibilità attivabile o sospendibile;
- rimozione dall'elenco futuro senza perdere lo storico delle prenotazioni;
- selezione in fase di prenotazione: nessuno, da assegnare, skipper esistente
  oppure nuovo skipper creato sul momento;
- assegnazione, sostituzione o rimozione dello skipper da una prenotazione già
  esistente, direttamente nel calendario;
- nome dello skipper visibile nella miniatura e nel dettaglio del calendario;
- cruscotto Oggi con skipper assegnato, promemoria `Skipper da assegnare`,
  telefono e collegamento WhatsApp quando disponibile;
- spostando una prenotazione viene verificata di nuovo la disponibilità dello
  skipper; eliminandola, il relativo impegno viene liberato.

## Regole di coerenza

- uno skipper non può essere assegnato a due prenotazioni sovrapposte;
- viene rifiutata anche una sovrapposizione di un solo minuto;
- due impegni consecutivi sono consentiti: se il primo termina alle 17:00, il
  successivo può iniziare alle 17:00;
- il controllo è atomico nel database e protegge anche da due salvataggi
  contemporanei;
- le tabelle sono isolate per workspace con Row Level Security;
- gli utenti autenticati hanno accesso diretto in sola lettura; ogni modifica
  passa da procedure autorizzate e viene registrata nell'audit log.

## Migrazioni database

Le migrazioni sono già state applicate al progetto Supabase collegato e sono
incluse nel repository per mantenere allineata la cronologia:

- `20260831104112_internal_skipper_scheduling.sql`;
- `20260831104732_internal_skipper_fk_indexes.sql`.

Non rieseguire manualmente il loro contenuto nel SQL Editor.

## Verifiche eseguite

- lint e controllo TypeScript;
- 29 test unitari superati;
- build di produzione Next.js completata;
- audit dipendenze: nessuna vulnerabilità;
- RLS attiva su entrambe le nuove tabelle;
- test transazionale sul database: overlap di un minuto respinto e orari
  consecutivi accettati, senza lasciare dati di prova;
- advisor sicurezza: nessuna segnalazione riferita alle nuove tabelle;
- advisor prestazioni: indici delle nuove chiavi esterne presenti. Le sole
  segnalazioni residue sono `unused index`, normali per tabelle appena create.

## Limiti intenzionali

- lo skipper non accede al gestionale;
- non vengono gestiti compensi, turni, documenti o patente dello skipper;
- non è collegato automaticamente a un account collaboratore;
- non vengono create prenotazioni da conversazioni WhatsApp.

