import Link from "next/link";

import OperatorNav from "@/components/operator/operator-nav";
import { skipperWhatsAppHref } from "@/lib/operator/skipper-contact";
import { requireOperatorWorkspaceContext } from "@/lib/operator/workspace-context";

import { changeInternalSkipperStatus, saveInternalSkipper } from "./actions";

type PageProps = {
  searchParams: Promise<{ operator?: string; saved?: string; error?: string }>;
};

type SkipperRow = {
  id: string;
  display_name: string;
  phone: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
};

const savedMessages: Record<string, string> = {
  create: "Skipper aggiunto e disponibile nelle prenotazioni.",
  update: "Dati dello skipper aggiornati.",
  activate: "Skipper nuovamente disponibile per le assegnazioni.",
  deactivate: "Skipper messo in pausa. Le prenotazioni già assegnate restano visibili.",
  remove: "Skipper rimosso dalle scelte future. Lo storico delle prenotazioni è conservato.",
};

const errorMessages: Record<string, string> = {
  name: "Inserisci un nome di almeno 2 caratteri.",
  phone: "Il telefono deve contenere da 8 a 15 cifre.",
  notes: "La nota è troppo lunga.",
  "not-found": "Lo skipper non esiste più.",
  removed: "Questo skipper è già stato rimosso.",
  "not-allowed": "Il tuo accesso non consente questa operazione.",
  save: "Modifica non salvata. Riprova.",
};

const fieldClass = "min-h-11 w-full rounded-xl border border-[#D8D5E5] bg-white px-3 text-base outline-none focus:border-[#6D5DFB] focus:ring-2 focus:ring-[#6D5DFB]/15 sm:text-sm";

export default async function OperatorSkippersPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const { supabase, operator } = await requireOperatorWorkspaceContext(query.operator);
  const { data, error } = await supabase
    .from("operator_internal_skippers")
    .select("id, display_name, phone, notes, is_active, created_at")
    .eq("operator_id", operator.id)
    .is("removed_at", null)
    .order("is_active", { ascending: false })
    .order("display_name");

  if (error) throw new Error("Unable to load internal skippers.");
  const skippers = (data ?? []) as SkipperRow[];
  const activeCount = skippers.filter((skipper) => skipper.is_active).length;

  return (
    <main className="min-h-screen bg-[#F7F6FB] pb-28 text-[#171A2B] lg:pb-12">
      <OperatorNav operatorId={operator.id} operatorName={operator.name} />
      <div className="mx-auto max-w-5xl px-4 py-7 sm:px-6 sm:py-10">
        <Link href={`/operator/more?operator=${operator.id}`} className="inline-flex min-h-11 items-center text-sm font-semibold text-[#676B80] hover:text-[#4C3FC2]">
          ← Torna ad Altro
        </Link>
        <p className="mt-3 text-xs font-bold uppercase tracking-[0.1em] text-[#6D5DFB]">Squadra operativa</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Skipper</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#676B80]">
          Sono semplici nominativi interni: non ricevono un account e non devono accedere a Boatly. Li assegni alle uscite direttamente dal calendario.
        </p>

        {query.saved ? <div role="status" className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">{savedMessages[query.saved] ?? "Modifica salvata."}</div> : null}
        {query.error ? <div role="alert" className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-800">{errorMessages[query.error] ?? errorMessages.save}</div> : null}

        <section className="mt-6 rounded-3xl border border-[#E2DFEB] bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div><h2 className="text-xl font-semibold">Aggiungi uno skipper</h2><p className="mt-1 text-sm text-[#676B80]">Solo il nome è obbligatorio.</p></div>
            <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">{activeCount} disponibili</span>
          </div>
          <form action={saveInternalSkipper} className="mt-5 grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="operator_id" value={operator.id} />
            <label className="grid gap-2 text-sm font-semibold">Nome *<input name="display_name" required minLength={2} maxLength={160} className={fieldClass} /></label>
            <label className="grid gap-2 text-sm font-semibold">Telefono <span className="font-normal text-[#777285]">(facoltativo)</span><input name="phone" type="tel" className={fieldClass} /></label>
            <label className="grid gap-2 text-sm font-semibold sm:col-span-2">Nota <span className="font-normal text-[#777285]">(facoltativa)</span><textarea name="notes" rows={2} maxLength={2000} className={`${fieldClass} py-3`} placeholder="Es. patente, lingue, disponibilità abituale…" /></label>
            <div className="sm:col-span-2 sm:text-right"><button className="min-h-11 rounded-xl bg-[#6D5DFB] px-5 text-sm font-semibold text-white transition hover:bg-[#5948EF] active:scale-[0.98]">Aggiungi skipper</button></div>
          </form>
        </section>

        <section className="mt-6 rounded-3xl border border-[#E2DFEB] bg-white p-5 shadow-sm sm:p-7">
          <div><h2 className="text-xl font-semibold">Elenco skipper</h2><p className="mt-1 text-sm text-[#676B80]">Metti in pausa chi non è disponibile; rimuovi solo chi non vuoi più proporre nelle prenotazioni future.</p></div>
          {skippers.length ? (
            <div className="mt-5 space-y-3">
              {skippers.map((skipper) => {
                const whatsappHref = skipperWhatsAppHref(skipper.phone);
                return (
                  <article key={skipper.id} className="rounded-2xl border border-[#E2DFEB] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold">{skipper.display_name}</h3>
                        <p className="mt-1 text-sm text-[#676B80]">{skipper.phone || "Telefono non inserito"}</p>
                        {skipper.notes ? <p className="mt-2 text-sm text-[#4A4758]">{skipper.notes}</p> : null}
                      </div>
                      <span className={`rounded-full px-3 py-1 text-[10px] font-bold ${skipper.is_active ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>
                        {skipper.is_active ? "DISPONIBILE" : "IN PAUSA"}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {whatsappHref ? <a href={whatsappHref} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center rounded-xl bg-[#1FA855] px-4 text-sm font-semibold text-white hover:bg-[#188A47]">WhatsApp</a> : null}
                      <form action={changeInternalSkipperStatus}>
                        <input type="hidden" name="operator_id" value={operator.id} />
                        <input type="hidden" name="skipper_id" value={skipper.id} />
                        <button name="skipper_action" value={skipper.is_active ? "DEACTIVATE" : "ACTIVATE"} className="min-h-11 rounded-xl border border-[#D8D5E5] bg-white px-4 text-sm font-semibold hover:bg-[#F7F6FB]">
                          {skipper.is_active ? "Metti in pausa" : "Rendi disponibile"}
                        </button>
                      </form>
                      <details className="rounded-xl border border-[#D8D5E5] bg-white">
                        <summary className="flex min-h-11 cursor-pointer list-none items-center px-4 text-sm font-semibold hover:bg-[#F7F6FB]">Modifica</summary>
                        <form action={saveInternalSkipper} className="grid gap-3 border-t border-[#E2DFEB] p-4 sm:min-w-[420px]">
                          <input type="hidden" name="operator_id" value={operator.id} />
                          <input type="hidden" name="skipper_id" value={skipper.id} />
                          <label className="grid gap-1 text-xs font-semibold">Nome<input name="display_name" required minLength={2} maxLength={160} defaultValue={skipper.display_name} className={fieldClass} /></label>
                          <label className="grid gap-1 text-xs font-semibold">Telefono<input name="phone" type="tel" defaultValue={skipper.phone ?? ""} className={fieldClass} /></label>
                          <label className="grid gap-1 text-xs font-semibold">Nota<textarea name="notes" rows={2} maxLength={2000} defaultValue={skipper.notes ?? ""} className={`${fieldClass} py-3`} /></label>
                          <button className="min-h-11 rounded-xl bg-[#171A2B] px-4 text-sm font-semibold text-white">Salva modifiche</button>
                        </form>
                      </details>
                      <details className="rounded-xl border border-rose-200 bg-white">
                        <summary className="flex min-h-11 cursor-pointer list-none items-center px-4 text-sm font-semibold text-rose-700 hover:bg-rose-50">Rimuovi</summary>
                        <form action={changeInternalSkipperStatus} className="border-t border-rose-100 p-4 sm:max-w-sm">
                          <input type="hidden" name="operator_id" value={operator.id} />
                          <input type="hidden" name="skipper_id" value={skipper.id} />
                          <p className="text-sm leading-5 text-[#676B80]">Scomparirà dalle nuove scelte; le prenotazioni già assegnate conserveranno il suo nome.</p>
                          <button name="skipper_action" value="REMOVE" className="mt-3 min-h-11 rounded-xl bg-rose-600 px-4 text-sm font-semibold text-white hover:bg-rose-700">Conferma rimozione</button>
                        </form>
                      </details>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-[#D8D5E5] bg-[#FAF9FC] p-6 text-center"><p className="font-semibold">Nessuno skipper registrato</p><p className="mt-1 text-sm text-[#676B80]">Puoi anche aggiungerne uno mentre crei la prima prenotazione.</p></div>
          )}
        </section>
      </div>
    </main>
  );
}
