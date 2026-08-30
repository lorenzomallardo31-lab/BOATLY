"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  createStaffAccount,
  type StaffAccountActionState,
} from "@/app/operator/team/actions";

const initialState: StaffAccountActionState = { status: "idle" };
const ERRORS: Record<string, string> = {
  "invalid-username": "Usa da 4 a 32 caratteri: lettere, numeri, punto, trattino o underscore.",
  "username-taken": "Questo username è già utilizzato. Scegline un altro.",
  "password-too-short": "La password deve contenere almeno 12 caratteri.",
  "password-mismatch": "Le due password non coincidono.",
  "not-allowed": "Solo il proprietario può creare operatori.",
  "operator-inactive": "Il gestionale deve essere attivo.",
  "save-failed": "Account non creato. Nessuna modifica è stata salvata.",
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="min-h-12 rounded-xl bg-[#6D5DFB] px-5 text-sm font-semibold text-white transition hover:bg-[#5848F2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6D5DFB] focus-visible:ring-offset-2 active:scale-[0.98] disabled:cursor-wait disabled:opacity-50">
      {pending ? "Creazione…" : "Crea operatore"}
    </button>
  );
}

export default function StaffAccountForm({ operatorId }: { operatorId: string }) {
  const [state, action] = useActionState(createStaffAccount, initialState);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="operator_id" value={operatorId} />
      {state.status === "error" ? <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{ERRORS[state.code ?? "save-failed"] ?? ERRORS["save-failed"]}</div> : null}
      {state.status === "success" ? <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">Operatore <strong>@{state.username}</strong> creato. Può accedere subito con la password scelta.</div> : null}
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
        <label className="grid gap-2 text-sm font-semibold">Username *<input name="username" required minLength={4} maxLength={32} autoComplete="off" placeholder="es. mario.rossi" pattern="[A-Za-z0-9][A-Za-z0-9._-]{2,30}[A-Za-z0-9]" className="min-h-12 rounded-xl border border-[#D8D5E5] px-3 text-base outline-none focus:border-[#6D5DFB] focus:ring-2 focus:ring-[#6D5DFB]/20 sm:text-sm" /></label>
        <label className="grid gap-2 text-sm font-semibold">Password *<input name="password" type="password" required minLength={12} autoComplete="new-password" className="min-h-12 rounded-xl border border-[#D8D5E5] px-3 text-base outline-none focus:border-[#6D5DFB] focus:ring-2 focus:ring-[#6D5DFB]/20 sm:text-sm" /></label>
        <label className="grid gap-2 text-sm font-semibold">Ripeti password *<input name="password_confirmation" type="password" required minLength={12} autoComplete="new-password" className="min-h-12 rounded-xl border border-[#D8D5E5] px-3 text-base outline-none focus:border-[#6D5DFB] focus:ring-2 focus:ring-[#6D5DFB]/20 sm:text-sm" /></label>
        <SubmitButton />
      </div>
      <p className="text-xs leading-5 text-[#676B80]">Nessuna email e nessun link: comunichi tu le credenziali all’operatore. Potrai sospenderlo, cambiare la password o eliminarlo in qualsiasi momento.</p>
    </form>
  );
}
