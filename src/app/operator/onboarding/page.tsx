import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { createOperatorWorkspace } from "./actions";

type PageProps = {
  searchParams: Promise<{ created?: string; error?: string }>;
};

function errorMessage(error?: string) {
  if (error === "invalid-name") return "Inserisci un nome valido per la tua attività.";
  if (error === "account-closed") return "Questo account è stato rifiutato o eliminato e non può presentare una nuova richiesta.";
  if (error === "workspace-exists") return "Questo account possiede già un’attività.";
  if (error === "bootstrap-failed") return "Non è stato possibile inviare la richiesta. Riprova.";
  return null;
}

export default async function OperatorOnboardingPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims || typeof claimsData.claims.sub !== "string") {
    redirect("/sign-in?next=/operator/onboarding");
  }

  const userId = claimsData.claims.sub;
  const { data: memberships, error: membershipError } = await supabase
    .from("operator_members")
    .select("operator_id, role, status")
    .eq("user_id", userId)
    .eq("role", "OWNER");

  if (membershipError) throw new Error("Unable to load the operator request.");

  const operatorIds = Array.from(new Set((memberships ?? []).map((item) => item.operator_id)));
  const { data: operators, error: operatorError } = operatorIds.length
    ? await supabase
        .from("operators")
        .select("id, name, status, deleted_at, purge_after")
        .in("id", operatorIds)
    : { data: [], error: null };

  if (operatorError) throw new Error("Unable to load the operator workspace.");

  const active = (operators ?? []).find((operator) => operator.status === "ACTIVE" && !operator.deleted_at);
  if (active) redirect(`/operator/calendar?operator=${encodeURIComponent(active.id)}`);

  const rejected = (operators ?? []).find((operator) => operator.status === "REJECTED" || operator.deleted_at);
  const suspended = (operators ?? []).find((operator) => operator.status === "SUSPENDED" && !operator.deleted_at);
  const pending = (operators ?? []).find((operator) => ["DRAFT", "PENDING_VERIFICATION"].includes(operator.status));
  const removedMembership = (memberships ?? []).some((membership) => membership.status === "REMOVED");
  const error = errorMessage(query.error);

  return (
    <main className="min-h-screen bg-[#F7F6FB] px-4 py-8 text-[#171A2B] sm:px-6 sm:py-12">
      <div className="mx-auto max-w-2xl">
        <header className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xl font-bold tracking-tight">Boatly Ops</p>
            <p className="text-xs font-medium text-[#6D5DFB]">Gestionale noleggiatori</p>
          </div>
          <Link href="/account" className="rounded-xl border border-[#D8D5E5] bg-white px-4 py-2 text-sm font-semibold">
            Account
          </Link>
        </header>

        {suspended ? (
          <section className="mt-12 rounded-3xl border border-violet-200 bg-white p-7 shadow-sm sm:p-10">
            <span className="inline-flex rounded-full bg-violet-50 px-3 py-2 text-xs font-bold uppercase tracking-wide text-violet-700">Temporaneamente bloccato</span>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight">Accesso sospeso</h1>
            <p className="mt-3 text-sm leading-6 text-[#676B80]">L’amministratore ha sospeso temporaneamente il gestionale di <strong>{suspended.name}</strong>. I dati restano al sicuro e l’accesso tornerà disponibile quando verrà riattivato.</p>
          </section>
        ) : rejected || removedMembership ? (
          <section className="mt-12 rounded-3xl border border-rose-200 bg-white p-7 shadow-sm sm:p-10">
            <span className="inline-flex rounded-full bg-rose-50 px-3 py-2 text-xs font-bold uppercase tracking-wide text-rose-700">
              Rifiutato
            </span>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight">Richiesta non approvata</h1>
            <p className="mt-3 text-sm leading-6 text-[#676B80]">
              L’accesso al gestionale non è attivo. L’account operativo viene rimosso automaticamente dal sistema.
            </p>
          </section>
        ) : pending ? (
          <section className="mt-12 rounded-3xl border border-amber-200 bg-white p-7 shadow-sm sm:p-10">
            <span className="inline-flex rounded-full bg-amber-50 px-3 py-2 text-xs font-bold uppercase tracking-wide text-amber-800">
              Da verificare
            </span>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight">Richiesta ricevuta</h1>
            <p className="mt-3 text-sm leading-6 text-[#676B80]">
              <strong>{pending.name}</strong> sarà abilitata dall’amministratore. Dopo la conferma, entrando qui si aprirà direttamente il calendario.
            </p>
            {query.created === "1" ? (
              <div className="mt-6 rounded-2xl bg-[#EDE9FE] p-4 text-sm font-medium text-[#4C3FC2]">
                Non devi compilare altro in questa fase.
              </div>
            ) : null}
          </section>
        ) : (
          <section className="mt-12 rounded-3xl border border-[#D8D5E5] bg-white p-7 shadow-sm sm:p-10">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#6D5DFB]">Nuova attività</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">Come si chiama la tua attività?</h1>
            <p className="mt-3 text-sm leading-6 text-[#676B80]">
              È l’unica informazione necessaria per inviare la richiesta. Dopo la conferma potrai aprire il calendario e aggiungere le barche.
            </p>

            {error ? <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div> : null}

            <form action={createOperatorWorkspace} className="mt-7 space-y-4">
              <label htmlFor="name" className="block text-sm font-semibold">Nome attività</label>
              <input
                id="name"
                name="name"
                required
                minLength={1}
                maxLength={120}
                autoComplete="organization"
                placeholder="Es. Noleggio Mare Blu"
                className="min-h-14 w-full rounded-2xl border border-[#D8D5E5] px-4 text-base outline-none focus:border-[#6D5DFB] focus:ring-2 focus:ring-[#6D5DFB]/20"
              />
              <button className="min-h-14 w-full rounded-2xl bg-[#6D5DFB] px-5 text-base font-bold text-white transition hover:bg-[#5849DE]">
                Invia richiesta
              </button>
            </form>
          </section>
        )}
      </div>
    </main>
  );
}
