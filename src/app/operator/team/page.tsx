import { redirect } from "next/navigation";

import OperatorNav from "@/components/operator/operator-nav";
import TeamInvitationForm from "@/components/operator/team-invitation-form";
import { requireOperatorWorkspaceContext } from "@/lib/operator/workspace-context";

import { revokeTeamInvitation, updateTeamMember } from "./actions";

type PageProps = { searchParams: Promise<{ operator?: string; saved?: string; error?: string }> };

type RosterMember = {
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  status: string;
  joined_at: string;
};

function when(value: string, timezone: string) {
  return new Intl.DateTimeFormat("it-IT", { dateStyle: "medium", timeStyle: "short", timeZone: timezone }).format(new Date(value));
}

export default async function OperatorTeamPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const { supabase, operator, membership, userId } = await requireOperatorWorkspaceContext(query.operator);
  if (!new Set(["OWNER", "MANAGER"]).has(membership.role)) redirect(`/operator/dashboard?operator=${operator.id}`);

  const [{ data: roster, error: rosterError }, { data: invitations, error: inviteError }] = await Promise.all([
    supabase.rpc("operator_team_roster", { p_operator_id: operator.id }),
    supabase.from("operator_invitations").select("id, email, role, expires_at, created_at").eq("operator_id", operator.id).is("accepted_at", null).is("revoked_at", null).gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false }),
  ]);
  if (rosterError || inviteError) throw new Error("Unable to load operator team.");

  return (
    <main className="min-h-screen bg-[#F7F6FB] pb-28 text-[#171A2B] lg:pb-12">
      <OperatorNav operatorId={operator.id} operatorName={operator.name} />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#6D5DFB]">Accessi e responsabilità</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Team</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#676B80]">Invita collaboratori, assegna il minimo ruolo necessario e revoca subito gli accessi non più autorizzati.</p>

        {query.saved ? <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">Modifica salvata e registrata nell’audit.</div> : null}
        {query.error ? <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">Operazione non riuscita. Controlla ruolo, motivazione e stato del membro.</div> : null}

        <section className="mt-6 rounded-3xl border border-[#E2DFEB] bg-white p-5 shadow-sm sm:p-7">
          <h2 className="text-xl font-semibold">Invita un collaboratore</h2>
          <p className="mt-1 text-sm text-[#676B80]">Il link contiene il segreto solo nel frammento URL, non viene inviato ai log del server e vale esclusivamente per l’email indicata.</p>
          <div className="mt-5"><TeamInvitationForm operatorId={operator.id} canInviteManager={membership.role === "OWNER"} /></div>
        </section>

        {(invitations ?? []).length ? (
          <section className="mt-6 rounded-3xl border border-[#E2DFEB] bg-white p-5 shadow-sm sm:p-7">
            <h2 className="text-xl font-semibold">Inviti in attesa</h2>
            <div className="mt-4 divide-y divide-[#E2DFEB]">
              {(invitations ?? []).map((invite) => (
                <article key={invite.id} className="grid gap-3 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div><p className="text-sm font-semibold">{invite.email}</p><p className="mt-1 text-xs text-[#676B80]">{invite.role} · scade {when(invite.expires_at, operator.timezone)}</p></div>
                  <form action={revokeTeamInvitation} className="flex gap-2">
                    <input type="hidden" name="operator_id" value={operator.id} /><input type="hidden" name="invitation_id" value={invite.id} />
                    <input name="reason" required placeholder="Motivo revoca" className="min-h-10 min-w-0 rounded-xl border border-[#D8D5E5] px-3 text-sm" />
                    <button className="min-h-10 rounded-xl border border-rose-200 px-3 text-xs font-semibold text-rose-700">Revoca</button>
                  </form>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-6 rounded-3xl border border-[#E2DFEB] bg-white p-5 shadow-sm sm:p-7">
          <div className="flex items-end justify-between gap-4"><div><h2 className="text-xl font-semibold">Membri</h2><p className="mt-1 text-sm text-[#676B80]">{(roster ?? []).length} account collegati</p></div></div>
          <div className="mt-5 space-y-3">
            {((roster ?? []) as RosterMember[]).map((member) => {
              const isSelf = member.user_id === userId;
              const protectedMember = isSelf || member.role === "OWNER" || (membership.role === "MANAGER" && member.role === "MANAGER");
              const name = [member.first_name, member.last_name].filter(Boolean).join(" ");
              return (
                <article key={member.user_id} className="rounded-2xl border border-[#E2DFEB] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div><p className="font-semibold">{name || member.email}</p><p className="mt-1 text-xs text-[#676B80]">{member.email} · dal {when(member.joined_at, operator.timezone)}</p></div>
                    <span className={`rounded-full px-3 py-1 text-[10px] font-bold ${member.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{member.role} · {member.status}{isSelf ? " · TU" : ""}</span>
                  </div>
                  {!protectedMember ? (
                    <form action={updateTeamMember} className="mt-4 grid gap-2 rounded-xl bg-[#F8F7FC] p-3 sm:grid-cols-[0.65fr_1fr_auto] sm:items-end">
                      <input type="hidden" name="operator_id" value={operator.id} /><input type="hidden" name="user_id" value={member.user_id} />
                      <label className="grid gap-1 text-xs font-semibold">Nuovo ruolo<select name="role" defaultValue={member.role} className="min-h-10 rounded-lg border border-[#D8D5E5] bg-white px-2 text-sm"><option value="EMPLOYEE">Operatore</option><option value="SKIPPER">Skipper</option>{membership.role === "OWNER" ? <option value="MANAGER">Manager</option> : null}</select></label>
                      <label className="grid gap-1 text-xs font-semibold">Motivazione *<input name="reason" required className="min-h-10 rounded-lg border border-[#D8D5E5] bg-white px-2 text-sm" /></label>
                      <div className="flex flex-wrap gap-1"><button name="member_action" value="SET_ROLE" className="min-h-10 rounded-lg bg-[#6D5DFB] px-3 text-xs font-semibold text-white">Ruolo</button>{member.status === "ACTIVE" ? <><button name="member_action" value="SUSPEND" className="min-h-10 rounded-lg border border-amber-200 bg-white px-3 text-xs font-semibold text-amber-800">Sospendi</button><button name="member_action" value="REMOVE" className="min-h-10 rounded-lg border border-rose-200 bg-white px-3 text-xs font-semibold text-rose-700">Rimuovi</button></> : <button name="member_action" value="ACTIVATE" className="min-h-10 rounded-lg border border-emerald-200 bg-white px-3 text-xs font-semibold text-emerald-700">Riattiva</button>}</div>
                    </form>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
