# Boatly Ops — cruscotto “Oggi” operativo

Data release: 30 agosto 2026

## Risultato

Il cruscotto del calendario non espone più contatori o impegni senza una conseguenza operativa:

- gli eventi alla stessa ora vengono raggruppati in un unico impegno;
- il pulsante principale apre la prossima ora con partenze ancora da confermare;
- ogni partenza può essere segnata come effettuata;
- una partenza registrata passa allo stato `IN_PROGRESS`, sparisce dalle attività pendenti e resta visibile come “In navigazione” fino al rientro;
- prenotazioni, barche bloccate, clienti e contatti mancanti aprono elenchi dettagliati;
- ogni riga permette di raggiungere la relativa cella del calendario;
- note, richieste, passeggeri, contatto, barca e orario sono visibili senza cambiare pagina;
- pulsanti, celle, link e sezioni espandibili hanno stati hover, focus e pressione riconoscibili;
- le azioni asincrone mostrano attesa, successo o errore in modo esplicito.

## Integrità e sicurezza

La partenza usa la funzione database esistente `operator_change_booking_status`:

- richiede una sessione autenticata;
- verifica che l’utente appartenga all’operatore con un ruolo autorizzato;
- accetta la transizione solo da `CONFIRMED` a `IN_PROGRESS`;
- conserva l’occupazione della barca e la prenotazione;
- non sovrascrive le note operative della prenotazione;
- registra l’evento nel relativo storico.

Non sono richieste migrazioni e non vengono modificati o cancellati dati durante l’installazione.

## Verifiche completate

- ESLint: superato
- TypeScript: superato
- test unitari: 15/15
- build Next.js di produzione: superata
- audit dipendenze: 0 vulnerabilità
- nuovi test: raggruppamento di eventi simultanei e rimozione della partenza dalle attività dopo la conferma

## Collaudo umano consigliato dopo il deploy

1. Aprire il calendario con almeno due partenze alla stessa ora.
2. Premere “Prossimo impegno”: devono apparire entrambe nello stesso pannello.
3. Segnare una barca come partita: deve diventare “In navigazione” e non risultare più da confermare.
4. Aprire “Clienti”: devono comparire nome, orario, barca, passeggeri, contatto e richieste.
5. Provare da desktop e telefono gli stati hover/focus/pressione e l’apertura delle celle.
