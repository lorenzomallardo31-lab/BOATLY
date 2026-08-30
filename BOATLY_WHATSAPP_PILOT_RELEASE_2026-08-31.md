# Boatly Ops — WhatsApp per il test pilota

## Funzione introdotta

- Ogni prenotazione con un numero di telefono valido mostra `Invia riepilogo WhatsApp` nel calendario.
- Gli impegni di oggi mostrano il comando contestuale:
  - `Promemoria WhatsApp` prima della partenza;
  - `Ricorda il rientro` prima del rientro;
  - `Contatta su WhatsApp` negli altri stati operativi.
- Da telefono viene aperta l'app WhatsApp; da computer viene aperto WhatsApp Web.
- Il gestore vede e può modificare il messaggio prima di inviarlo.

## Contenuto automatico

Il testo comprende nome cliente, attività, imbarcazione, data, orario e numero di passeggeri. Gli orari rispettano il fuso del noleggio.

## Numeri telefonici

- `+39` e `0039` vengono riconosciuti.
- Un numero italiano privo di prefisso riceve automaticamente `39`.
- I prefissi internazionali espliciti vengono conservati.
- Un numero assente o non valido non produce un pulsante inutilizzabile: il gestore può correggerlo dalla prenotazione.

## Confini del pilot

Questa release non invia messaggi automaticamente e non usa la WhatsApp Business Platform. Non richiede token Meta, numero Business verificato, template approvati o costi per conversazione. È la soluzione più adatta al primo test reale perché mantiene il controllo umano ed evita problemi di consenso e configurazione.

## Verifiche

- TypeScript: superato
- ESLint: superato
- 23 test unitari: superati
- build Next.js di produzione: superata
