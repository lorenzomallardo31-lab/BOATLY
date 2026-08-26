import Link from "next/link";

import OperatorNav from "@/components/operator/operator-nav";
import { requireOperatorWorkspaceContext } from "@/lib/operator/workspace-context";

import { createManualBooking } from "./actions";

type PageProps = { searchParams: Promise<{ operator?: string; error?: string }> };

function errorLabel(error?: string) {
  const labels: Record<string, string> = {
    "missing-fields": "Compila tutti i campi obbligatori.",
    "invalid-values": "Controlla passeggeri e importo.",
    "operator-inactive": "Le prenotazioni manuali reali richiedono un operatore ACTIVE.",
    "boat-inactive": "La barca deve essere ACTIVE.",
    overlap: "La barca è già occupata in questo intervallo.",
    passengers: "Il numero di passeggeri supera il limite della barca.",
    "save-failed": "Non è stato possibile creare la prenotazione.",
  };
  return error ? labels[error] ?? "Operazione non riuscita." : null;
}

export default async function NewManualBookingPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const { supabase, operator } = await requireOperatorWorkspaceContext(query.operator);

  const [{ data: boats, error: boatsError }, { data: locations, error: locationsError }] = await Promise.all([
    supabase.from("boats").select("id, name, status, operator_passenger_limit").eq("operator_id", operator.id).eq("status", "ACTIVE").order("name"),
    supabase.from("operator_locations").select("id, name, city").eq("operator_id", operator.id).eq("is_active", true).order("is_primary", { ascending: false }),
  ]);

  if (boatsError || locationsError) throw new Error("Unable to load manual booking options.");

  const boatIds = (boats ?? []).map((boat) => boat.id);
  const { data: offerings, error: offeringsError } = boatIds.length
    ? await supabase.from("boat_legal_offerings").select("id, boat_id, legal_type, skipper_mode").in("boat_id", boatIds).eq("is_active", true)
    : { data: [], error: null };

  if (offeringsError) throw new Error("Unable to load legal offerings.");
  const error = errorLabel(query.error);
  const input = "w-full rounded-xl border border-[#DEE5E8] bg-white px-4 py-3 outline-none focus:border-[#14B8A6] focus:ring-2 focus:ring-[#14B8A6]/20";

  return (
    <main className="min-h-screen bg-[#FCFBF8] text-[#0B1F33]">
      <OperatorNav operatorId={operator.id} operatorName={operator.name} />
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Link href={`/operator/bookings?operator=${operator.id}`} className="text-sm font-semibold text-[#64748B]">← Torna alle prenotazioni</Link>
        <div className="mt-5">
          <p className="text-sm font-semibold text-[#14B8A6]">Off-platform booking</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight">Nuova prenotazione manuale</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#64748B]">Registra una prenotazione ricevuta fuori dal marketplace. Commissione Boatly: 0%.</p>
        </div>

        {error ? <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div> : null}
        {operator.status !== "ACTIVE" ? <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Il workspace è {operator.status}. Il form è pronto ma il database impedirà booking reali finché l&apos;operatore non sarà ACTIVE.</div> : null}

        <form action={createManualBooking} className="mt-6 space-y-6 rounded-3xl border border-[#DEE5E8] bg-white p-6 shadow-sm sm:p-8">
          <input type="hidden" name="operator_id" value={operator.id} />

          <section>
            <h2 className="text-xl font-semibold">Prenotazione</h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <div><label className="mb-2 block text-sm font-medium">Barca *</label><select name="boat_id" required className={input}><option value="">Seleziona</option>{(boats ?? []).map((boat) => <option key={boat.id} value={boat.id}>{boat.name}{boat.operator_passenger_limit ? ` · max ${boat.operator_passenger_limit}` : ""}</option>)}</select></div>
              <div><label className="mb-2 block text-sm font-medium">Offerta legale *</label><select name="legal_offering_id" required className={input}><option value="">Seleziona</option>{(offerings ?? []).map((offering) => <option key={offering.id} value={offering.id}>{offering.legal_type} · {offering.skipper_mode}</option>)}</select><p className="mt-2 text-xs text-[#64748B]">L&apos;offerta deve appartenere alla barca selezionata; il DB verifica la coerenza.</p></div>
              <div><label className="mb-2 block text-sm font-medium">Sede di partenza *</label><select name="pickup_location_id" required className={input}><option value="">Seleziona</option>{(locations ?? []).map((location) => <option key={location.id} value={location.id}>{location.name}{location.city ? ` · ${location.city}` : ""}</option>)}</select></div>
              <div><label className="mb-2 block text-sm font-medium">Passeggeri *</label><input name="passenger_count" type="number" min={1} required className={input} /></div>
              <div><label className="mb-2 block text-sm font-medium">Inizio *</label><input name="starts_at" type="datetime-local" required className={input} /></div>
              <div><label className="mb-2 block text-sm font-medium">Fine *</label><input name="ends_at" type="datetime-local" required className={input} /></div>
              <div><label className="mb-2 block text-sm font-medium">Totale concordato (€) *</label><input name="total" inputMode="decimal" required placeholder="350,00" className={input} /></div>
            </div>
          </section>

          <section className="border-t border-[#DEE5E8] pt-6">
            <h2 className="text-xl font-semibold">Cliente</h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <div><label className="mb-2 block text-sm font-medium">Nome / denominazione *</label><input name="customer_name" required className={input} /></div>
              <div><label className="mb-2 block text-sm font-medium">Email</label><input name="customer_email" type="email" className={input} /></div>
              <div><label className="mb-2 block text-sm font-medium">Telefono</label><input name="customer_phone" className={input} /></div>
            </div>
            <div className="mt-5"><label className="mb-2 block text-sm font-medium">Nota operatore</label><textarea name="operator_note" rows={3} className={input} /></div>
          </section>

          <div className="rounded-2xl bg-[#F1F5F4] p-4 text-sm leading-6 text-[#475569]">La prenotazione viene registrata come <strong>MANUAL + CONFIRMED</strong>, crea immediatamente l&apos;occupancy e blocca sovrapposizioni. Il pagamento resta esterno a Boatly.</div>
          <button type="submit" className="rounded-xl bg-[#14B8A6] px-6 py-3 text-sm font-semibold text-white">Registra prenotazione</button>
        </form>
      </div>
    </main>
  );
}
