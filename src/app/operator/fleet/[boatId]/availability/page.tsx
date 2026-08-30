import Link from "next/link";

import { requireOperatorBoatContext } from "@/lib/operator/context";

import { createCalendarBlock, releaseCalendarBlock } from "./actions";

type PageProps = {
  params: Promise<{ boatId: string }>;
  searchParams: Promise<{ operator?: string; saved?: string; error?: string }>;
};

type Occupancy = {
  id: string;
  occupancy_type: string;
  starts_at: string;
  ends_at: string;
  notes: string | null;
  is_active: boolean;
};

function formatDateTime(value: string, timezone: string) {
  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone,
  }).format(new Date(value));
}

function errorMessage(error?: string) {
  if (error === "conflict") return "Il periodo si sovrappone a una prenotazione o a un altro blocco.";
  if (error === "not-allowed") return "Non hai i permessi necessari.";
  if (error === "release-failed") return "Non è stato possibile rimuovere il blocco.";
  if (error === "invalid-block") return "Controlla inizio e fine del periodo.";
  if (error === "block-failed") return "Non è stato possibile creare il blocco.";
  return null;
}

export default async function AvailabilityPage({ params, searchParams }: PageProps) {
  const { boatId } = await params;
  const query = await searchParams;
  const { supabase, boat, operator, canManage } = await requireOperatorBoatContext(boatId, query.operator);
  const timezone = operator.timezone;

  const from = new Date();
  from.setDate(from.getDate() - 1);
  const to = new Date();
  to.setFullYear(to.getFullYear() + 1);
  const { data, error: occupancyError } = await supabase.rpc("get_boat_calendar_occupancies", {
    p_operator_id: operator.id,
    p_boat_id: boat.id,
    p_from: from.toISOString(),
    p_to: to.toISOString(),
  });
  if (occupancyError) throw new Error(`Unable to load calendar blocks: ${occupancyError.message}`);

  const occupancies = ((Array.isArray(data) ? data : []) as Occupancy[]).filter(
    (item) => item.is_active && item.occupancy_type === "OPERATOR_BLOCK",
  );
  const error = errorMessage(query.error);

  return (
    <main className="min-h-screen bg-[#F7F6FB] pb-28 text-[#171A2B] lg:pb-12">
      <div className="mx-auto max-w-4xl px-4 py-7 sm:px-6 sm:py-10">
        <Link href={`/operator/fleet/${boat.id}?operator=${operator.id}`} className="text-sm font-semibold text-[#676B80]">← Torna a {boat.name}</Link>
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.1em] text-[#6D5DFB]">Periodi e blocchi</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Quando {boat.name} non è disponibile</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#676B80]">Inserisci solo le eccezioni. Ogni blocco compare subito nel calendario e impedisce prenotazioni sovrapposte.</p>

        {query.saved ? <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">Calendario aggiornato.</div> : null}
        {error ? <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-800">{error}</div> : null}

        {canManage ? (
          <form action={createCalendarBlock} className="mt-7 rounded-3xl border border-[#D8D5E5] bg-white p-5 shadow-sm sm:p-7">
            <input type="hidden" name="operator_id" value={operator.id} />
            <input type="hidden" name="boat_id" value={boat.id} />
            <input type="hidden" name="timezone" value={timezone} />
            <h2 className="text-xl font-semibold">Blocca un periodo</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold">Inizio *<input name="starts_at" type="datetime-local" required className="min-h-12 rounded-xl border border-[#D8D5E5] px-3" /></label>
              <label className="grid gap-2 text-sm font-semibold">Fine *<input name="ends_at" type="datetime-local" required className="min-h-12 rounded-xl border border-[#D8D5E5] px-3" /></label>
              <label className="grid gap-2 text-sm font-semibold sm:col-span-2">Motivo opzionale<textarea name="notes" rows={3} maxLength={1000} className="rounded-xl border border-[#D8D5E5] px-3 py-3" placeholder="Es. manutenzione, uso privato…" /></label>
            </div>
            <button className="mt-5 min-h-12 rounded-xl bg-[#6D5DFB] px-5 text-sm font-semibold text-white">Blocca il periodo</button>
          </form>
        ) : null}

        <section className="mt-6 rounded-3xl border border-[#D8D5E5] bg-white p-5 shadow-sm sm:p-7">
          <div className="flex items-center justify-between gap-4"><h2 className="text-xl font-semibold">Blocchi attivi</h2><span className="rounded-full bg-[#EDE9FE] px-3 py-1 text-xs font-bold text-[#4C3FC2]">{occupancies.length}</span></div>
          {occupancies.length ? (
            <div className="mt-5 space-y-3">
              {occupancies.map((occupancy) => (
                <article key={occupancy.id} className="flex flex-col gap-4 rounded-2xl border border-[#D8D5E5] p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div><p className="font-semibold">Non disponibile</p><p className="mt-1 text-sm text-[#676B80]">{formatDateTime(occupancy.starts_at, timezone)} → {formatDateTime(occupancy.ends_at, timezone)}</p>{occupancy.notes ? <p className="mt-2 text-sm">{occupancy.notes}</p> : null}</div>
                  {canManage ? (
                    <form action={releaseCalendarBlock}>
                      <input type="hidden" name="operator_id" value={operator.id} />
                      <input type="hidden" name="boat_id" value={boat.id} />
                      <input type="hidden" name="occupancy_id" value={occupancy.id} />
                      <button className="min-h-11 rounded-xl border border-[#C8C0FF] px-4 text-sm font-semibold text-[#4C3FC2]">Rimuovi blocco</button>
                    </form>
                  ) : null}
                </article>
              ))}
            </div>
          ) : <p className="mt-5 rounded-xl bg-[#F1F0F6] p-4 text-sm text-[#676B80]">Nessun periodo bloccato.</p>}
        </section>
      </div>
    </main>
  );
}
