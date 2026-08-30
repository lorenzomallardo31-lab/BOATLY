import Link from "next/link";

import DuplicateBoatForm from "@/components/operator/duplicate-boat-form";
import { requireOperatorBoatContext } from "@/lib/operator/context";

import { saveBoatEssentials } from "./actions";

type BoatPageProps = {
  params: Promise<{ boatId: string }>;
  searchParams: Promise<{ operator?: string; saved?: string; duplicated?: string; error?: string }>;
};

function errorMessage(error?: string) {
  const messages: Record<string, string> = {
    "invalid-name": "Inserisci un nome valido.",
    "invalid-internal-code": "Il codice interno è troppo lungo.",
    "invalid-engine-power": "Inserisci una potenza in cavalli valida e maggiore di zero.",
    "invalid-boolean-value": "Indica se è richiesta la patente nautica.",
    "invalid-boat-type": "Il tipo di barca selezionato non è valido.",
    "invalid-location": "La sede selezionata non è valida.",
    "duplicate-value": "Il codice interno è già usato da un’altra barca.",
    "not-allowed": "Non hai i permessi necessari per modificare questa barca.",
    "save-failed": "Non è stato possibile salvare le modifiche.",
    "duplicate-failed": "Non è stato possibile duplicare la barca. Riprova senza modificare l’originale.",
  };
  return error ? messages[error] ?? "Operazione non completata." : null;
}

export default async function BoatPage({ params, searchParams }: BoatPageProps) {
  const [{ boatId }, query] = await Promise.all([params, searchParams]);
  const { supabase, boat, operator, canManage } = await requireOperatorBoatContext(boatId, query.operator);

  const [{ data: fullBoat, error: boatError }, { data: boatTypes, error: typeError }, { data: locations, error: locationError }] = await Promise.all([
    supabase.from("boats").select("internal_code, boat_type_id, primary_location_id, engine_power_hp, license_required").eq("id", boat.id).single(),
    supabase.from("boat_types").select("id, name").eq("is_active", true).order("sort_order"),
    supabase.from("operator_locations").select("id, name, city, is_primary").eq("operator_id", operator.id).eq("is_active", true).order("is_primary", { ascending: false }).order("name"),
  ]);
  if (boatError || typeError || locationError || !fullBoat) throw new Error("Unable to load boat essentials.");

  const error = errorMessage(query.error);
  const inputClass = "min-h-12 w-full rounded-xl border border-[#D8D5E5] bg-white px-4 outline-none transition focus:border-[#6D5DFB] focus:ring-2 focus:ring-[#6D5DFB]/20 disabled:bg-[#F1F0F6]";

  return (
    <main className="min-h-screen bg-[#F7F6FB] px-4 pb-28 pt-7 text-[#171A2B] sm:px-6 lg:pb-12">
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#6D5DFB]">Flotta</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{boat.name}</h1>
            <p className="mt-2 text-sm text-[#676B80]">Inserisci solo ciò che serve per riconoscerla e usarla nel calendario.</p>
          </div>
          <span className={`rounded-full px-4 py-2 text-sm font-bold ${boat.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-700"}`}>
            {boat.status === "ACTIVE" ? "Disponibile" : "Non disponibile"}
          </span>
        </div>

        {query.saved === "1" ? <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">Modifiche salvate.</div> : null}
        {query.duplicated === "1" ? <div className="mt-5 rounded-2xl border border-teal-200 bg-teal-50 p-4 text-sm font-medium text-teal-900">Imbarcazione duplicata. Questa è la nuova unità: rinominala o modifica il codice interno se necessario.</div> : null}
        {error ? <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div> : null}

        <form action={saveBoatEssentials} className="mt-7 space-y-5">
          <input type="hidden" name="operator_id" value={operator.id} />
          <input type="hidden" name="boat_id" value={boat.id} />

          <section className="rounded-3xl border border-[#D8D5E5] bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-xl font-semibold">Dati necessari</h2>
            <p className="mt-2 text-sm text-[#676B80]">Questi tre campi rendono la barca operativa nel gestionale.</p>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <label className="sm:col-span-2"><span className="mb-2 block text-sm font-semibold">Nome della barca *</span><input name="name" required maxLength={160} defaultValue={boat.name} disabled={!canManage} className={inputClass} /></label>
              <label><span className="mb-2 block text-sm font-semibold">Potenza motore (CV) *</span><input name="engine_power_hp" type="number" min="0.1" max="100000" step="0.1" required defaultValue={fullBoat.engine_power_hp ?? ""} disabled={!canManage} className={inputClass} /></label>
              <label><span className="mb-2 block text-sm font-semibold">Patente nautica richiesta? *</span><select name="license_required" required defaultValue={fullBoat.license_required === true ? "true" : "false"} disabled={!canManage} className={inputClass}><option value="false">No</option><option value="true">Sì</option></select></label>
            </div>
          </section>

          <details className="group rounded-3xl border border-[#D8D5E5] bg-white shadow-sm">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-6 sm:p-8">
              <div><h2 className="text-xl font-semibold">Altri dati facoltativi</h2><p className="mt-2 text-sm text-[#676B80]">Apri solo se ti sono utili per distinguere meglio la barca.</p></div>
              <span className="text-sm font-semibold text-[#4C3FC2] group-open:hidden">Apri</span><span className="hidden text-sm font-semibold text-[#4C3FC2] group-open:inline">Chiudi</span>
            </summary>
            <div className="grid gap-5 border-t border-[#E8E5EF] p-6 sm:grid-cols-2 sm:p-8">
              <label><span className="mb-2 block text-sm font-semibold">Codice interno</span><input name="internal_code" maxLength={80} defaultValue={fullBoat.internal_code ?? ""} disabled={!canManage} className={inputClass} placeholder="Es. GOM-01" /></label>
              <label><span className="mb-2 block text-sm font-semibold">Tipo di barca</span><select name="boat_type_id" defaultValue={fullBoat.boat_type_id ?? ""} disabled={!canManage} className={inputClass}><option value="">Non specificato</option>{(boatTypes ?? []).map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</select></label>
              <label className="sm:col-span-2"><span className="mb-2 block text-sm font-semibold">Sede abituale</span><select name="primary_location_id" defaultValue={fullBoat.primary_location_id ?? ""} disabled={!canManage} className={inputClass}><option value="">Non specificata</option>{(locations ?? []).map((location) => <option key={location.id} value={location.id}>{location.name}{location.city ? ` · ${location.city}` : ""}</option>)}</select></label>
            </div>
          </details>

          {canManage ? <button className="min-h-12 rounded-xl bg-[#6D5DFB] px-6 text-sm font-semibold text-white">Salva dati barca</button> : null}
        </form>

        <section className="mt-7 grid gap-4 sm:grid-cols-2">
          <Link href={`/operator/fleet/${boat.id}/services?operator=${operator.id}`} className="rounded-2xl border border-[#D8D5E5] bg-white p-5 font-semibold shadow-sm">Gestisci servizi e optional →</Link>
          <Link href={`/operator/fleet/${boat.id}/status?operator=${operator.id}`} className="rounded-2xl border border-[#D8D5E5] bg-white p-5 font-semibold shadow-sm">Disponibilità ed eliminazione →</Link>
        </section>

        {canManage ? (
          <section className="mt-7 rounded-3xl border border-[#C8C0FF] bg-[#F5F2FF] p-6 sm:flex sm:items-center sm:justify-between sm:gap-6">
            <div>
              <h2 className="text-lg font-semibold">Hai un’altra barca uguale?</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-[#676B80]">Duplica dati, servizi, modalità di noleggio, prezzi e disponibilità settimanale. Prenotazioni, blocchi, foto, documenti e storico non vengono copiati.</p>
            </div>
            <DuplicateBoatForm operatorId={operator.id} boatId={boat.id} boatName={boat.name} />
          </section>
        ) : null}
      </div>
    </main>
  );
}
