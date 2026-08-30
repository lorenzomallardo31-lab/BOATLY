# Boatly Ops — accessi operatore e calendario compatto

## Risultato

- Il proprietario del noleggio continua a registrarsi e ad accedere con la propria email.
- Il proprietario crea direttamente gli operatori con `username` e password: nessun invito, link o conferma email.
- Ogni operatore viene collegato allo stesso workspace del noleggio e lavora sugli stessi dati persistenti di calendario.
- Il proprietario può cambiare la password, sospendere, riattivare o eliminare definitivamente ogni accesso operatore.
- I vecchi inviti email pendenti sono stati revocati e il relativo percorso porta alla nuova schermata di accesso.

## Sicurezza e dati

- Gli username sono unici sull'intera installazione, normalizzati in minuscolo e limitati a 4–32 caratteri sicuri.
- L'email tecnica usata da Supabase Auth è derivata tramite SHA-256 e non espone lo username.
- La chiave amministrativa Supabase resta esclusivamente sul server.
- La creazione e la gestione degli operatori richiedono una sessione attiva con ruolo `OWNER` nello stesso workspace.
- Gli operatori vengono salvati come membri `EMPLOYEE`; non possono aprire la schermata di gestione accessi.
- RLS impedisce lettura anonima e scrittura diretta sulla tabella delle identità operatore.
- Creazione, cambio password, sospensione e rimozione producono audit o aggiornamenti coerenti tra Auth e database.

## Interfaccia

### Computer

- Il cruscotto “Oggi” è una fascia operativa compatta sopra il calendario.
- Indicatori, prossimo impegno, agenda e controlli rimangono cliccabili senza occupare una schermata intera.
- Agenda e anomalie usano corsie orizzontali compatte.

### Telefono

- Il calendario appare molto prima, con intestazione e controlli ridotti.
- La colonna delle imbarcazioni è più stretta e mostra solo le informazioni essenziali.
- “Agenda e controlli” è richiudibile; tutte le informazioni restano disponibili quando serve.
- La griglia usa l'altezza disponibile dello schermo e mantiene lo scorrimento orizzontale.

## Verifiche completate

- TypeScript: superato
- ESLint: superato
- 19 test unitari: superati
- build Next.js di produzione: superata
- Supabase: migrazioni applicate, RLS attiva, nessuna lettura anonima o scrittura diretta autenticata
- advisor Supabase: chiavi esterne indicizzate; restano soltanto gli avvisi intenzionali sulle RPC protette e gli indici nuovi non ancora usati

## Uso dopo il deploy

1. Il proprietario entra con email e password.
2. Apre `Altro` → `Operatori`.
3. Crea username e password e li comunica personalmente al collaboratore.
4. Il collaboratore apre la normale pagina di accesso, inserisce username e password e viene portato direttamente al calendario del noleggio.
5. Per revocare l'accesso basta sospendere o eliminare l'operatore dalla stessa schermata.

Non usare più i vecchi link `/team/invite`: sono stati ritirati.
