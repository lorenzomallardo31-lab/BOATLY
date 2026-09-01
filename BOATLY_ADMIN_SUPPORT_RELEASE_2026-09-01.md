# Boatly Ops — accesso assistito dell’amministratore

Release: 1 settembre 2026

Questa release consente al solo `SUPER_ADMIN` di entrare nel gestionale di un
noleggiatore senza conoscere, cambiare o condividere le sue credenziali.

## Esperienza amministratore

- nel controllo di ogni attività confermata compare `Entra nel gestionale`;
- il click apre direttamente il calendario del noleggio selezionato;
- una fascia ambra sempre visibile segnala `Modalità assistenza admin`;
- la fascia mostra il nome dell’attività e la scadenza della sessione;
- `Esci e torna all’admin` chiude l’accesso e riporta al profilo dell’attività;
- le attività sospese o non confermate devono essere prima sbloccate o
  confermate.

## Sicurezza e isolamento

- la sessione dura al massimo due ore;
- ogni accesso, cambio workspace, uscita e scadenza è registrato nell’audit;
- l’amministratore riceve temporaneamente i poteri operativi del proprietario;
- la sessione è limitata a un solo noleggio alla volta;
- aprendo un altro noleggio, il precedente accesso viene chiuso;
- alla chiusura o alla scadenza l’appartenenza temporanea viene eliminata;
- un processo database controlla le scadenze ogni minuto;
- i normali operatori non possono avviare una sessione amministrativa;
- le appartenenze temporanee non compaiono tra i collaboratori del noleggio;
- le normali regole RLS continuano a proteggere ogni workspace.

## Database

Le migrazioni sono già state applicate al progetto Supabase di produzione e
sono incluse nel repository per allineare la cronologia:

- `20260901103323_admin_operator_support_mode.sql`;
- `20260901104124_admin_support_fk_indexes.sql`.

Non eseguire manualmente il loro contenuto nel SQL Editor.

## Verifiche eseguite

- lint e controllo TypeScript completati;
- 29 test unitari superati;
- build Next.js 16 di produzione completata;
- test transazionale di apertura e chiusura senza lasciare dati di prova;
- test di passaggio tra due noleggi;
- test di conservazione dell’appartenenza amministratore preesistente;
- test negativo: utente non amministratore respinto;
- job di pulizia presente e una sola istanza configurata;
- zero sessioni o appartenenze temporanee residue dopo i test;
- advisor prestazioni: nessun indice mancante per le nuove relazioni.

L’advisor Supabase segnala genericamente le tre RPC pubbliche come funzioni
`SECURITY DEFINER` eseguibili da utenti autenticati. È intenzionale: ogni RPC
verifica internamente `auth.uid()` e il ruolo `SUPER_ADMIN`, usa un
`search_path` bloccato e respinge gli altri utenti.
