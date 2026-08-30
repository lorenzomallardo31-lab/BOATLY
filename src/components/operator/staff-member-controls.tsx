"use client";

import { useFormStatus } from "react-dom";

import { updateStaffAccount } from "@/app/operator/team/actions";

function ActionButton({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "warning" | "danger" | "success" }) {
  const { pending } = useFormStatus();
  const tones = {
    neutral: "border-[#D8D5E5] text-[#302B59] hover:bg-[#F5F2FF]",
    warning: "border-amber-200 text-amber-800 hover:bg-amber-50",
    danger: "border-rose-200 text-rose-700 hover:bg-rose-50",
    success: "border-emerald-200 text-emerald-700 hover:bg-emerald-50",
  };
  return <button disabled={pending} className={`min-h-10 rounded-lg border bg-white px-3 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6D5DFB] active:scale-[0.98] disabled:opacity-50 ${tones[tone]}`}>{pending ? "Attendi…" : children}</button>;
}

export default function StaffMemberControls({ operatorId, userId, username, status }: { operatorId: string; userId: string; username: string; status: string }) {
  return (
    <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
      <form action={updateStaffAccount} className="grid gap-2 rounded-xl bg-[#F8F7FC] p-3 sm:grid-cols-2 sm:items-end">
        <input type="hidden" name="operator_id" value={operatorId} /><input type="hidden" name="user_id" value={userId} /><input type="hidden" name="staff_action" value="RESET_PASSWORD" />
        <label className="grid gap-1 text-xs font-semibold">Nuova password<input name="password" type="password" required minLength={12} autoComplete="new-password" className="min-h-10 rounded-lg border border-[#D8D5E5] bg-white px-3 text-sm" /></label>
        <label className="grid gap-1 text-xs font-semibold">Ripeti password<input name="password_confirmation" type="password" required minLength={12} autoComplete="new-password" className="min-h-10 rounded-lg border border-[#D8D5E5] bg-white px-3 text-sm" /></label>
        <div className="sm:col-span-2"><ActionButton>Salva nuova password</ActionButton></div>
      </form>
      <div className="flex flex-wrap gap-2">
        {status === "ACTIVE" ? (
          <form action={updateStaffAccount}><input type="hidden" name="operator_id" value={operatorId} /><input type="hidden" name="user_id" value={userId} /><input type="hidden" name="staff_action" value="SUSPEND" /><ActionButton tone="warning">Sospendi accesso</ActionButton></form>
        ) : status === "SUSPENDED" ? (
          <form action={updateStaffAccount}><input type="hidden" name="operator_id" value={operatorId} /><input type="hidden" name="user_id" value={userId} /><input type="hidden" name="staff_action" value="ACTIVATE" /><ActionButton tone="success">Riattiva accesso</ActionButton></form>
        ) : null}
        <form action={updateStaffAccount} onSubmit={(event) => { if (!window.confirm(`Eliminare definitivamente @${username}? Non potrà più accedere.`)) event.preventDefault(); }}>
          <input type="hidden" name="operator_id" value={operatorId} /><input type="hidden" name="user_id" value={userId} /><input type="hidden" name="staff_action" value="REMOVE" /><ActionButton tone="danger">Elimina operatore</ActionButton>
        </form>
      </div>
    </div>
  );
}
