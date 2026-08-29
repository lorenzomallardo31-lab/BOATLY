import Link from "next/link";
import { notFound } from "next/navigation";

import AdminNav from "@/components/admin/admin-nav";
import { requirePlatformContext } from "@/lib/admin/context";

import {
  deleteOperatorAccount,
  setOperatorMemberStatus,
  setOperatorStatus,
  updateOperatorLegalProfile,
  updateOperatorLocation,
  updateOperatorMemberProfile,
  updateOperatorWorkspace,
} from "./actions";

type PageProps = {
  params: Promise<{ operatorId: string }>;
  searchParams: Promise<{
    saved?: string;
    error?: string;
    scope?: string;
  }>;
};

type LegalProfile = Record<string, string | null>;

type LocationRow = {
  id: string;
  name: string;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  administrative_area: string | null;
  postal_code: string | null;
  country_code: string;
  timezone: string;
  phone: string | null;
  email: string | null;
  pickup_instructions: string | null;
  is_primary: boolean;
  is_public: boolean;
  is_active: boolean;
};

type MemberRow = {
  user_id: string;
  role: string;
  status: string;
  joined_at: string;
};

type ProfileRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
};

const inputClass =
  "w-full rounded-xl border border-[#D7E0E5] bg-white px-3.5 py-3 text-sm outline-none transition focus:border-[#14B8A6] focus:ring-2 focus:ring-[#14B8A6]/20";
const labelClass = "mb-1.5 block text-xs font-semibold text-[#4F6474]";

function value(input: unknown) {
  return typeof input === "string" ? input : "";
}

function dateTime(valueToFormat: string) {
  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Rome",
  }).format(new Date(valueToFormat));
}

function statusClasses(status: string) {
  if (status === "ACTIVE") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (status === "SUSPENDED" || status === "REJECTED") return "bg-rose-50 text-rose-700 ring-rose-200";
  if (status === "PENDING_VERIFICATION") return "bg-amber-50 text-amber-800 ring-amber-200";
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function statusLabel(status: string) {
  if (status === "ACTIVE") return "Confermato";
  if (status === "REJECTED") return "Rifiutato";
  return "Da verificare";
}

function message(error?: string, scope?: string) {
  if (!error) return null;
  const labels: Record<string, string> = {
    "reason-required": "Inserisci il motivo amministrativo: è obbligatorio per l’audit.",
    "last-owner": "Non puoi sospendere o rimuovere l’ultimo proprietario attivo del workspace.",
    duplicate: "Esiste già una sede con questo nome nel workspace.",
    "save-failed": "Operazione non completata. Controlla i dati e riprova.",
    "confirmation-required": "Per eliminare l’account devi scrivere esattamente il nome dell’attività.",
  };
  return `${labels[error] ?? labels["save-failed"]}${scope ? ` Sezione: ${scope}.` : ""}`;
}

export default async function AdminOperatorDetailPage({ params, searchParams }: PageProps) {
  const [{ operatorId }, query] = await Promise.all([params, searchParams]);
  const { supabase, userId } = await requirePlatformContext(["SUPER_ADMIN"]);
  const canControl = true;

  const [
    operatorResult,
    legalResult,
    locationsResult,
    membersResult,
    verificationsResult,
    auditsResult,
    boatsResult,
    bookingsResult,
    documentsResult,
  ] = await Promise.all([
    supabase
      .from("operators")
      .select("id, name, slug, status, country_code, currency, timezone, created_by, created_at, updated_at")
      .eq("id", operatorId)
      .is("deleted_at", null)
      .maybeSingle(),
    supabase
      .from("operator_legal_profiles")
      .select("legal_name, legal_form, vat_number, tax_code, business_register_number, rea_number, pec_email, sdi_code, registered_address_line_1, registered_address_line_2, registered_city, registered_administrative_area, registered_postal_code, registered_country_code, legal_representative_first_name, legal_representative_last_name")
      .eq("operator_id", operatorId)
      .maybeSingle(),
    supabase
      .from("operator_locations")
      .select("id, name, address_line_1, address_line_2, city, administrative_area, postal_code, country_code, timezone, phone, email, pickup_instructions, is_primary, is_public, is_active")
      .eq("operator_id", operatorId)
      .order("is_primary", { ascending: false })
      .order("name"),
    supabase
      .from("operator_members")
      .select("user_id, role, status, joined_at")
      .eq("operator_id", operatorId)
      .order("role"),
    supabase
      .from("operator_verifications")
      .select("id, status, submitted_at, reviewed_at, decision_note")
      .eq("operator_id", operatorId)
      .order("submitted_at", { ascending: false })
      .limit(8),
    supabase
      .from("audit_logs")
      .select("id, action, entity_type, entity_id, reason, metadata, occurred_at")
      .eq("operator_id", operatorId)
      .order("occurred_at", { ascending: false })
      .limit(30),
    supabase.from("boats").select("id", { count: "exact", head: true }).eq("operator_id", operatorId),
    supabase.from("bookings").select("id", { count: "exact", head: true }).eq("operator_id", operatorId),
    supabase.from("operator_documents").select("id", { count: "exact", head: true }).eq("operator_id", operatorId),
  ]);

  const results = [operatorResult, legalResult, locationsResult, membersResult, verificationsResult, auditsResult, boatsResult, bookingsResult, documentsResult];
  const firstError = results.find((result) => result.error)?.error;
  if (firstError) throw new Error(`Unable to load operator control center: ${firstError.message}`);
  if (!operatorResult.data) notFound();

  const operator = operatorResult.data;
  const legal = (legalResult.data ?? {}) as LegalProfile;
  const locations = (locationsResult.data ?? []) as LocationRow[];
  const members = (membersResult.data ?? []) as MemberRow[];
  const canOpenOperatorWorkspace = members.some(
    (member) => member.user_id === userId && member.status === "ACTIVE",
  );
  const userIds = members.map((member) => member.user_id);
  const { data: profileData, error: profilesError } = userIds.length
    ? await supabase
        .from("profiles")
        .select("id, first_name, last_name, phone")
        .in("id", userIds)
    : { data: [], error: null };
  if (profilesError) throw new Error(`Unable to load operator members: ${profilesError.message}`);
  const profileById = new Map(((profileData ?? []) as ProfileRow[]).map((profile) => [profile.id, profile]));
  const verifications = verificationsResult.data ?? [];
  const openVerification = verifications.find((review) =>
    ["PENDING", "IN_REVIEW", "NEEDS_CHANGES"].includes(review.status),
  );
  const errorMessage = message(query.error, query.scope);

  return (
    <main className="min-h-screen bg-[#F6F8F9] text-[#0B1F33]">
      <AdminNav />
      <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-9 lg:px-8">
        <Link href="/admin/operators" className="text-sm font-semibold text-[#587083] hover:text-[#0B1F33]">
          ← Tutti gli operatori
        </Link>

        <header className="mt-5 flex flex-col gap-5 rounded-3xl bg-[#0B1F33] p-6 text-white shadow-sm lg:flex-row lg:items-end lg:justify-between lg:p-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#5EEAD4]">Controllo operatore</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{operator.name}</h1>
            <p className="mt-2 break-all text-xs text-white/60">{operator.slug ?? operator.id}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className={`rounded-full px-3 py-2 text-xs font-bold ring-1 ${statusClasses(operator.status)}`}>
              {statusLabel(operator.status)}
            </span>
            {canOpenOperatorWorkspace ? (
              <Link
                href={`/operator/calendar?operator=${operator.id}`}
                className="inline-flex min-h-11 items-center rounded-xl bg-white px-4 text-sm font-semibold text-[#0B1F33]"
              >
                Apri gestionale
              </Link>
            ) : (
              <Link
                href={`/admin/bookings?operator=${operator.id}`}
                className="inline-flex min-h-11 items-center rounded-xl bg-white px-4 text-sm font-semibold text-[#0B1F33]"
              >
                Vedi attività
              </Link>
            )}
          </div>
        </header>

        {query.saved ? (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            Operazione completata e registrata nell’audit amministrativo.
          </div>
        ) : null}
        {errorMessage ? (
          <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            {errorMessage}
          </div>
        ) : null}

        <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ["Flotta", boatsResult.count ?? 0],
            ["Prenotazioni", bookingsResult.count ?? 0],
            ["Membri", members.length],
            ["Documenti", documentsResult.count ?? 0],
            ["Verifiche", verifications.length],
          ].map(([label, count]) => (
            <div key={label} className="rounded-2xl border border-[#DDE5E9] bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#6D8190]">{label}</p>
              <p className="mt-1 text-2xl font-semibold">{count}</p>
            </div>
          ))}
        </section>

        {openVerification ? (
          <section className="mt-6 flex flex-col gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-amber-900">Verifica operatore: {openVerification.status}</p>
              <p className="mt-1 text-sm text-amber-800">Usa la coda compliance per approvare o richiedere modifiche sul fascicolo.</p>
            </div>
            <Link href="/admin/verifications" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-amber-900 px-4 text-sm font-semibold text-white">
              Apri coda verifiche
            </Link>
          </section>
        ) : null}

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.75fr)]">
          <div className="space-y-6">
            {canControl ? (
              <section className="rounded-3xl border border-[#DDE5E9] bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#14B8A6]">Lifecycle</p>
                    <h2 className="mt-1 text-xl font-semibold">Decisione sull’iscrizione</h2>
                  </div>
                  <span className="text-xs text-[#6D8190]">Motivo sempre obbligatorio</span>
                </div>
                <form action={setOperatorStatus} className="mt-5 grid gap-3 sm:grid-cols-[220px_1fr_auto]">
                  <input type="hidden" name="operator_id" value={operator.id} />
                  <select name="status" required defaultValue={operator.status === "ACTIVE" ? "ACTIVE" : operator.status === "REJECTED" ? "REJECTED" : "PENDING_VERIFICATION"} className={inputClass}>
                    <option value="PENDING_VERIFICATION" disabled>Da verificare</option>
                    <option value="ACTIVE">Confermato</option>
                    <option value="REJECTED">Rifiutato</option>
                  </select>
                  <input name="reason" required maxLength={1000} placeholder="Motivo amministrativo della modifica" className={inputClass} />
                  <button className="min-h-12 rounded-xl bg-[#0B1F33] px-5 text-sm font-semibold text-white">Salva decisione</button>
                </form>
                <p className="mt-3 text-xs leading-5 text-[#6D8190]">
                  Un account rifiutato resta visibile per due minuti, poi scompare definitivamente. Puoi confermare nuovamente durante questa breve finestra.
                </p>
              </section>
            ) : null}

            <section className="rounded-3xl border border-[#DDE5E9] bg-white p-5 shadow-sm sm:p-6">
              <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#14B8A6]">Workspace</p>
              <h2 className="mt-1 text-xl font-semibold">Identità del gestionale</h2>
              {canControl ? (
                <form action={updateOperatorWorkspace} className="mt-5 grid gap-4 sm:grid-cols-2">
                  <input type="hidden" name="operator_id" value={operator.id} />
                  <label className="sm:col-span-2"><span className={labelClass}>Nome attività *</span><input name="name" required maxLength={160} defaultValue={operator.name} className={inputClass} /></label>
                  <label><span className={labelClass}>Paese *</span><input name="country_code" required maxLength={2} defaultValue={operator.country_code} className={inputClass} /></label>
                  <label><span className={labelClass}>Valuta *</span><input name="currency" required maxLength={3} defaultValue={operator.currency} className={inputClass} /></label>
                  <label className="sm:col-span-2"><span className={labelClass}>Timezone IANA *</span><input name="timezone" required defaultValue={operator.timezone} className={inputClass} /></label>
                  <label className="sm:col-span-2"><span className={labelClass}>Motivo correzione *</span><input name="reason" required maxLength={1000} placeholder="Perché stai correggendo questi dati?" className={inputClass} /></label>
                  <button className="min-h-12 rounded-xl bg-[#14B8A6] px-5 text-sm font-semibold text-white sm:col-span-2">Salva correzioni workspace</button>
                </form>
              ) : (
                <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
                  <div><dt className="text-[#6D8190]">Nome</dt><dd className="font-semibold">{operator.name}</dd></div>
                  <div><dt className="text-[#6D8190]">Paese / valuta</dt><dd className="font-semibold">{operator.country_code} · {operator.currency}</dd></div>
                  <div><dt className="text-[#6D8190]">Timezone</dt><dd className="font-semibold">{operator.timezone}</dd></div>
                  <div><dt className="text-[#6D8190]">Creato</dt><dd className="font-semibold">{dateTime(operator.created_at)}</dd></div>
                </dl>
              )}
            </section>

            <details className="group rounded-3xl border border-[#DDE5E9] bg-white shadow-sm" open={!legal.legal_name}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 sm:p-6">
                <div><p className="text-xs font-bold uppercase tracking-[0.1em] text-[#14B8A6]">Compliance</p><h2 className="mt-1 text-xl font-semibold">Profilo legale</h2></div>
                <span className="text-sm font-semibold text-[#587083] group-open:hidden">Apri</span><span className="hidden text-sm font-semibold text-[#587083] group-open:inline">Chiudi</span>
              </summary>
              <div className="border-t border-[#E4EAED] p-5 sm:p-6">
                {canControl ? (
                  <form action={updateOperatorLegalProfile} className="grid gap-4 sm:grid-cols-2">
                    <input type="hidden" name="operator_id" value={operator.id} />
                    {[
                      ["legal_name", "Ragione sociale"], ["legal_form", "Forma giuridica"],
                      ["vat_number", "Partita IVA"], ["tax_code", "Codice fiscale"],
                      ["business_register_number", "Registro imprese"], ["rea_number", "Numero REA"],
                      ["pec_email", "PEC"], ["sdi_code", "Codice SDI"],
                      ["registered_address_line_1", "Indirizzo sede legale"], ["registered_address_line_2", "Dettaglio indirizzo"],
                      ["registered_city", "Città"], ["registered_administrative_area", "Provincia / area"],
                      ["registered_postal_code", "CAP"], ["registered_country_code", "Paese"],
                      ["legal_representative_first_name", "Nome rappresentante"], ["legal_representative_last_name", "Cognome rappresentante"],
                    ].map(([name, label]) => (
                      <label key={name}><span className={labelClass}>{label}</span><input name={name} defaultValue={value(legal[name]) || (name === "registered_country_code" ? "IT" : "")} className={inputClass} /></label>
                    ))}
                    <label className="sm:col-span-2"><span className={labelClass}>Motivo correzione *</span><input name="reason" required maxLength={1000} className={inputClass} placeholder="Motivo amministrativo" /></label>
                    <button className="min-h-12 rounded-xl bg-[#0B1F33] px-5 text-sm font-semibold text-white sm:col-span-2">Salva profilo legale</button>
                  </form>
                ) : <p className="text-sm text-[#587083]">Accesso in sola lettura. Solo ADMIN e SUPER_ADMIN possono correggere questi dati.</p>}
              </div>
            </details>

            <section className="rounded-3xl border border-[#DDE5E9] bg-white p-5 shadow-sm sm:p-6">
              <div><p className="text-xs font-bold uppercase tracking-[0.1em] text-[#14B8A6]">Sedi</p><h2 className="mt-1 text-xl font-semibold">Punti operativi ({locations.length})</h2></div>
              <div className="mt-5 space-y-4">
                {locations.length === 0 ? <p className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">Nessuna sede registrata. Il noleggiatore deve completare l’onboarding.</p> : null}
                {locations.map((location) => (
                  <details key={location.id} className="rounded-2xl border border-[#E0E7EA]" open={location.is_primary}>
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4">
                      <div><p className="font-semibold">{location.name}</p><p className="mt-1 text-xs text-[#6D8190]">{[location.city, location.administrative_area].filter(Boolean).join(" · ") || "Località da completare"}</p></div>
                      <div className="flex gap-2">{location.is_primary ? <span className="rounded-full bg-[#E7FAF6] px-2 py-1 text-[10px] font-bold text-[#087A69]">PRINCIPALE</span> : null}<span className={`rounded-full px-2 py-1 text-[10px] font-bold ${location.is_active ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{location.is_active ? "ATTIVA" : "DISATTIVA"}</span></div>
                    </summary>
                    {canControl ? (
                      <form action={updateOperatorLocation} className="grid gap-4 border-t border-[#E0E7EA] p-4 sm:grid-cols-2">
                        <input type="hidden" name="operator_id" value={operator.id} /><input type="hidden" name="location_id" value={location.id} />
                        {[
                          ["name", "Nome sede", location.name], ["address_line_1", "Indirizzo", location.address_line_1],
                          ["address_line_2", "Dettaglio indirizzo", location.address_line_2], ["city", "Città", location.city],
                          ["administrative_area", "Provincia / area", location.administrative_area], ["postal_code", "CAP", location.postal_code],
                          ["country_code", "Paese", location.country_code], ["timezone", "Timezone", location.timezone],
                          ["phone", "Telefono", location.phone], ["email", "Email", location.email],
                        ].map(([name, label, current]) => {
                          const fieldName = String(name);
                          return <label key={fieldName}><span className={labelClass}>{String(label)}</span><input name={fieldName} required={fieldName === "name" || fieldName === "country_code" || fieldName === "timezone"} defaultValue={value(current)} className={inputClass} /></label>;
                        })}
                        <label className="sm:col-span-2"><span className={labelClass}>Istruzioni ritiro</span><textarea name="pickup_instructions" rows={3} defaultValue={value(location.pickup_instructions)} className={inputClass} /></label>
                        <div className="flex flex-wrap gap-4 text-sm sm:col-span-2">
                          <label className="flex items-center gap-2"><input type="checkbox" name="is_primary" defaultChecked={location.is_primary} /> Sede principale</label>
                          <label className="flex items-center gap-2"><input type="checkbox" name="is_public" defaultChecked={location.is_public} /> Visibile</label>
                          <label className="flex items-center gap-2"><input type="checkbox" name="is_active" defaultChecked={location.is_active} /> Attiva</label>
                        </div>
                        <label className="sm:col-span-2"><span className={labelClass}>Motivo correzione *</span><input name="reason" required maxLength={1000} className={inputClass} /></label>
                        <button className="min-h-12 rounded-xl bg-[#0B1F33] px-5 text-sm font-semibold text-white sm:col-span-2">Salva sede</button>
                      </form>
                    ) : null}
                  </details>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-[#DDE5E9] bg-white p-5 shadow-sm sm:p-6">
              <div><p className="text-xs font-bold uppercase tracking-[0.1em] text-[#14B8A6]">Accessi</p><h2 className="mt-1 text-xl font-semibold">Membri del workspace</h2></div>
              <div className="mt-5 space-y-4">
                {members.map((member) => {
                  const profile = profileById.get(member.user_id);
                  const displayName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "Profilo senza nome";
                  return (
                    <article key={member.user_id} className="rounded-2xl border border-[#E0E7EA] p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold">{displayName}</p><p className="mt-1 break-all text-xs text-[#6D8190]">{member.user_id}</p></div><div className="flex gap-2"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold">{member.role}</span><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ring-1 ${statusClasses(member.status)}`}>{member.status}</span></div></div>
                      {canControl ? (
                        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_320px]">
                          <form action={updateOperatorMemberProfile} className="grid gap-3 sm:grid-cols-3">
                            <input type="hidden" name="operator_id" value={operator.id} /><input type="hidden" name="user_id" value={member.user_id} />
                            <label><span className={labelClass}>Nome</span><input name="first_name" defaultValue={value(profile?.first_name)} className={inputClass} /></label>
                            <label><span className={labelClass}>Cognome</span><input name="last_name" defaultValue={value(profile?.last_name)} className={inputClass} /></label>
                            <label><span className={labelClass}>Telefono</span><input name="phone" defaultValue={value(profile?.phone)} className={inputClass} /></label>
                            <label className="sm:col-span-2"><span className={labelClass}>Motivo correzione *</span><input name="reason" required maxLength={1000} className={inputClass} /></label>
                            <button className="min-h-12 rounded-xl border border-[#0B1F33] px-4 text-sm font-semibold">Salva profilo</button>
                          </form>
                          <form action={setOperatorMemberStatus} className="grid gap-3">
                            <input type="hidden" name="operator_id" value={operator.id} /><input type="hidden" name="user_id" value={member.user_id} />
                            <select name="status" defaultValue={member.status} className={inputClass}>{["ACTIVE", "SUSPENDED", "REMOVED"].map((status) => <option key={status}>{status}</option>)}</select>
                            <input name="reason" required maxLength={1000} placeholder="Motivo blocco/sblocco" className={inputClass} />
                            <button className="min-h-12 rounded-xl bg-[#0B1F33] px-4 text-sm font-semibold text-white">Applica accesso</button>
                          </form>
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            </section>
          </div>

          <aside className="space-y-6">
            <section className="rounded-3xl border border-[#DDE5E9] bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#14B8A6]">Verifiche</p>
              <h2 className="mt-1 text-lg font-semibold">Storico decisioni</h2>
              <div className="mt-4 space-y-3">
                {verifications.length === 0 ? <p className="text-sm text-[#6D8190]">Nessuna verifica inviata.</p> : verifications.map((review) => (
                  <div key={review.id} className="rounded-xl bg-[#F6F8F9] p-3 text-sm"><div className="flex justify-between gap-3"><strong>{review.status}</strong><span className="text-xs text-[#6D8190]">{dateTime(review.submitted_at)}</span></div>{review.decision_note ? <p className="mt-2 text-xs leading-5 text-[#587083]">{review.decision_note}</p> : null}</div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-[#DDE5E9] bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#14B8A6]">Audit</p>
              <h2 className="mt-1 text-lg font-semibold">Ultime azioni</h2>
              <div className="mt-4 space-y-3">
                {(auditsResult.data ?? []).length === 0 ? <p className="text-sm text-[#6D8190]">Nessuna azione registrata.</p> : (auditsResult.data ?? []).map((audit) => (
                  <div key={audit.id} className="border-l-2 border-[#14B8A6] pl-3"><p className="break-words text-xs font-bold">{audit.action}</p><p className="mt-1 text-[11px] text-[#6D8190]">{dateTime(audit.occurred_at)} · {audit.entity_type}</p>{audit.reason ? <p className="mt-1 text-xs leading-5 text-[#40596B]">{audit.reason}</p> : null}</div>
                ))}
              </div>
            </section>
          </aside>
        </div>

        {canControl ? (
          <section className="mt-6 rounded-3xl border border-rose-200 bg-white p-5 shadow-sm sm:p-6">
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-rose-700">Eliminazione account</p>
            <h2 className="mt-1 text-xl font-semibold">Elimina questo noleggiatore</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#6D8190]">L’accesso viene revocato e l’account scompare definitivamente dopo due minuti. Le informazioni tecniche indispensabili a eventuali documenti contabili già prodotti restano conservate senza essere più utilizzabili.</p>
            <form action={deleteOperatorAccount} className="mt-5 grid gap-3 sm:grid-cols-[minmax(220px,0.8fr)_minmax(260px,1.4fr)_auto]">
              <input type="hidden" name="operator_id" value={operator.id} />
              <input type="hidden" name="operator_name" value={operator.name} />
              <input name="confirmation" required autoComplete="off" placeholder={`Scrivi: ${operator.name}`} className={inputClass} />
              <input name="reason" required maxLength={1000} placeholder="Motivo eliminazione" className={inputClass} />
              <button className="min-h-12 rounded-xl bg-rose-700 px-5 text-sm font-semibold text-white">Elimina account</button>
            </form>
          </section>
        ) : null}
      </div>
    </main>
  );
}
