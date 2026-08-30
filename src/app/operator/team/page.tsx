import { redirect } from "next/navigation";

import OperatorNav from "@/components/operator/operator-nav";
import StaffAccountForm from "@/components/operator/staff-account-form";
import StaffMemberControls from "@/components/operator/staff-member-controls";
import { requireOperatorWorkspaceContext } from "@/lib/operator/workspace-context";

type PageProps = { searchParams: Promise<{ operator?: string; saved?: string; error?: string }> };

type StaffMember = {
  user_id: string;
  username: string;
  status: string;
  joined_at: string;
};

function when(value: string, timezone: string) {
  return new Intl.DateTimeFormat("it-IT", { dateStyle: "medium", timeStyle: "short", timeZone: timezone }).format(new Date(value));
}

const SAVED_MESSAGES: Record<string, string> = {
  password: "Nuova password salvata.",
  suspend: "Accesso sospeso immediatamente.",
  activate: "Accesso riattivato.",
  remove: "Operatore eliminato definitivamente.",
};

const ERROR_MESSAGES: Record<string, string> = {
  "staff-not-found": "L’operatore non appartiene più a questo gestionale.",
  "password-too-short": "La password deve contenere almeno 12 caratteri.",
  "password-mismatch": "Le due password non coincidono.",
  "password-reset-failed": "La password non è stata aggiornata.",
  "access-update-failed": "Non è stato possibile cambiare l’accesso. Lo stato precedente è stato mantenuto.",
  "remove-failed": "Eliminazione non completata. L’accesso è stato comunque disattivato per sicurezza.",
  "audit-failed": "Password modificata, ma la registrazione di sicurezza non è riuscita.",
};

export default async function OperatorTeamPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const { supabase, operator, membership } = await requireOperatorWorkspaceContext(query.operator);
  if (membership.role !== "OWNER") redirect(`/operator/calendar?operator=${operator.id}`);

  const { data: roster, error: rosterError } = await supabase.rpc("operator_staff_roster", {
    p_operator_id: operator.id,
  });
  if (rosterError) throw new Error("Unable to load operator staff accounts.");
  const members = (roster ?? []) as StaffMember[];
  const activeCount = members.filter((member) => member.status === "ACTIVE").length;

  return (
    <main className="min-h-screen bg-[#F7F6FB] pb-28 text-[#171A2B] lg:pb-12">
      <OperatorNav operatorId={operator.id} operatorName={operator.name} />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#6D5DFB]">Accessi al gestionale</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Operatori</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#676B80]">
          Tu resti il proprietario. Crea username e password per chi lavora con te: ogni modifica sarà salvata nello stesso calendario condiviso.
        </p>

        {query.saved ? <div role="status" className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{SAVED_MESSAGES[query.saved] ?? "Modifica salvata."}</div> : null}
        {query.error ? <div role="alert" className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{ERROR_MESSAGES[query.error] ?? "Operazione non riuscita. Riprova."}</div> : null}

        <section className="mt-6 rounded-3xl border border-[#E2DFEB] bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Crea un operatore</h2>
              <p className="mt-1 text-sm text-[#676B80]">Niente inviti via email: le credenziali funzionano subito.</p>
            </div>
            <span className="rounded-full bg-[#EDE9FE] px-3 py-1.5 text-xs font-bold text-[#4C3FC2]">Nessun limite impostato</span>
          </div>
          <div className="mt-5"><StaffAccountForm operatorId={operator.id} /></div>
        </section>

        <section className="mt-6 rounded-3xl border border-[#E2DFEB] bg-white p-5 shadow-sm sm:p-7">
          <div className="flex items-end justify-between gap-4">
            <div><h2 className="text-xl font-semibold">Accessi creati</h2><p className="mt-1 text-sm text-[#676B80]">{activeCount} attivi · {members.length} totali</p></div>
            <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">Tu · Proprietario</span>
          </div>
          {members.length ? (
            <div className="mt-5 space-y-3">
              {members.map((member) => (
                <article key={member.user_id} className="rounded-2xl border border-[#E2DFEB] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">@{member.username}</p>
                      <p className="mt-1 text-xs text-[#676B80]">Operatore · creato {when(member.joined_at, operator.timezone)}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-[10px] font-bold ${member.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : member.status === "SUSPENDED" ? "bg-amber-50 text-amber-800" : "bg-rose-50 text-rose-700"}`}>
                      {member.status === "ACTIVE" ? "ACCESSO ATTIVO" : member.status === "SUSPENDED" ? "SOSPESO" : "DA ELIMINARE"}
                    </span>
                  </div>
                  <StaffMemberControls operatorId={operator.id} userId={member.user_id} username={member.username} status={member.status} />
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-[#D8D5E5] bg-[#FAF9FC] p-6 text-center">
              <p className="font-semibold">Nessun operatore creato</p>
              <p className="mt-1 text-sm text-[#676B80]">Per ora solo tu puoi entrare nel gestionale.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
