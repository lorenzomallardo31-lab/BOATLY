import Link from "next/link";

import { requireOperatorBoatContext } from "@/lib/operator/context";

import { changeBoatStatus, deleteBoat } from "./actions";

type StatusPageProps = {
  params: Promise<{ boatId: string }>;
  searchParams: Promise<{ operator?: string; changed?: string; error?: string }>;
};

function errorMessage(error?: string) {
  const messages: Record<string, string> = {
    "invalid-status": "Lo stato richiesto non è valido.",
    "status-change-failed": "Non è stato possibile aggiornare la disponibilità.",
    "delete-confirmation": "Scrivi esattamente il nome della barca per confermare.",
    "delete-failed": "Non è stato possibile avviare l’eliminazione.",
  };
  return error ? messages[error] ?? "Operazione non completata." : null;
}

export default async function StatusPage({ params, searchParams }: StatusPageProps) {
  const [{ boatId }, query] = await Promise.all([params, searchParams]);
  const { boat, operator, canManage } = await requireOperatorBoatContext(
    boatId,
    query.operator,
  );
  const available = boat.status === "ACTIVE";
  const error = errorMessage(query.error);

  return (
    <main className="min-h-screen bg-[#F7F6FB] px-4 pb-28 pt-7 text-[#171A2B] sm:px-6 lg:pb-12">
      <div className="mx-auto max-w-4xl">
        <Link href={`/operator/fleet?operator=${operator.id}`} className="text-sm font-semibold text-[#676B80]">
          ← Torna alla flotta
        </Link>

        <header className="mt-5 rounded-3xl border border-[#D8D5E5] bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#6D5DFB]">Disponibilità operativa</p>
          <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">{boat.name}</h1>
              <p className="mt-2 text-sm leading-6 text-[#676B80]">
                Questo stato indica soltanto se la barca può essere usata nel calendario e nelle prenotazioni.
              </p>
            </div>
            <span className={`inline-flex w-fit rounded-full px-4 py-2 text-sm font-bold ${available ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-slate-100 text-slate-700 ring-1 ring-slate-200"}`}>
              {available ? "Disponibile" : "Non disponibile"}
            </span>
          </div>
        </header>

        {query.changed ? (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            Disponibilità aggiornata correttamente.
          </div>
        ) : null}
        {error ? (
          <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div>
        ) : null}

        <section className="mt-6 rounded-3xl border border-[#D8D5E5] bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Cambia disponibilità</h2>
          <p className="mt-2 text-sm leading-6 text-[#676B80]">
            Una barca non disponibile resta nell’anagrafica e conserva lo storico, ma non può ricevere nuove prenotazioni.
          </p>
          {canManage ? (
            <form action={changeBoatStatus} className="mt-5">
              <input type="hidden" name="operator_id" value={operator.id} />
              <input type="hidden" name="boat_id" value={boat.id} />
              <input type="hidden" name="target_status" value={available ? "INACTIVE" : "ACTIVE"} />
              <button className={`min-h-12 rounded-xl px-5 text-sm font-semibold text-white ${available ? "bg-[#171A2B]" : "bg-[#6D5DFB]"}`}>
                {available ? "Segna come non disponibile" : "Rendi disponibile"}
              </button>
            </form>
          ) : null}
        </section>

        <section className="mt-6 rounded-3xl border border-rose-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-rose-700">Eliminazione</p>
          <h2 className="mt-2 text-xl font-semibold">Elimina la barca</h2>
          <p className="mt-2 text-sm leading-6 text-[#676B80]">
            Dopo la conferma la barca diventa non disponibile. Trascorsi due minuti viene rimossa definitivamente dal gestionale. Lo storico contabile già prodotto resta integro.
          </p>
          {canManage ? (
            <form action={deleteBoat} className="mt-5 max-w-xl space-y-3">
              <input type="hidden" name="operator_id" value={operator.id} />
              <input type="hidden" name="boat_id" value={boat.id} />
              <label className="block text-sm font-semibold" htmlFor="confirmation">
                Per confermare scrivi: <span className="text-rose-700">{boat.name}</span>
              </label>
              <input id="confirmation" name="confirmation" required autoComplete="off" className="min-h-12 w-full rounded-xl border border-rose-200 px-4 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100" />
              <button className="min-h-12 rounded-xl bg-rose-700 px-5 text-sm font-semibold text-white">Elimina barca</button>
            </form>
          ) : null}
        </section>
      </div>
    </main>
  );
}
