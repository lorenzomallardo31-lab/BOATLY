"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  createTeamInvitation,
  type InvitationActionState,
} from "@/app/operator/team/actions";

const initialInvitationState: InvitationActionState = { status: "idle" };

const ERRORS: Record<string, string> = {
  "invalid-email": "Inserisci un indirizzo email valido.",
  "already-member": "Questo account è già un membro attivo del workspace.",
  "already-pending": "Esiste già un invito attivo per questa email.",
  "role-not-allowed": "Non puoi assegnare questo ruolo.",
  "not-allowed": "Il tuo ruolo non consente di invitare collaboratori.",
  "operator-inactive": "Il workspace deve essere attivo.",
  "create-failed": "Invito non creato. Nessun cambiamento è stato salvato.",
};

function Submit() {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className="min-h-12 rounded-xl bg-[#6D5DFB] px-5 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Creazione…" : "Crea link sicuro"}</button>;
}

export default function TeamInvitationForm({ operatorId, canInviteManager }: { operatorId: string; canInviteManager: boolean }) {
  const [state, action] = useActionState(createTeamInvitation, initialInvitationState);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="operator_id" value={operatorId} />
      {state.code ? <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{ERRORS[state.code] ?? ERRORS["create-failed"]}</div> : null}
      {state.status === "success" && state.invitationUrl ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-semibold text-emerald-900">Link creato. Copialo ora: non potrà essere recuperato in seguito.</p>
          <input readOnly value={state.invitationUrl} onFocus={(event) => event.currentTarget.select()} className="mt-3 min-h-12 w-full rounded-xl border border-emerald-200 bg-white px-3 text-xs" />
          <p className="mt-2 text-xs leading-5 text-emerald-800">Scade tra 7 giorni e funziona solo con l’email invitata.</p>
        </div>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-[1fr_0.6fr_auto] sm:items-end">
        <label className="grid gap-2 text-sm font-semibold">Email collaboratore *<input name="email" type="email" required className="min-h-12 rounded-xl border border-[#D8D5E5] px-3 text-base sm:text-sm" /></label>
        <label className="grid gap-2 text-sm font-semibold">Ruolo *<select name="role" className="min-h-12 rounded-xl border border-[#D8D5E5] bg-white px-3 text-sm"><option value="EMPLOYEE">Operatore</option><option value="SKIPPER">Skipper</option>{canInviteManager ? <option value="MANAGER">Manager</option> : null}</select></label>
        <Submit />
      </div>
    </form>
  );
}
