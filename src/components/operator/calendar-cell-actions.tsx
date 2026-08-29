"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  blockCalendarDay,
  changeCalendarBookingStatus,
  releaseCalendarDay,
  type CalendarActionState,
} from "@/app/operator/calendar/actions";

const initialState: CalendarActionState = { status: "idle" };
const fieldClass = "min-h-11 w-full rounded-xl border border-[#D8D5E5] bg-white px-3 text-sm outline-none focus:border-[#6D5DFB] focus:ring-2 focus:ring-[#6D5DFB]/15";

function PendingButton({ children, className }: { children: React.ReactNode; className: string }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className={`${className} disabled:opacity-50`}>{pending ? "Salvataggio…" : children}</button>;
}

function Feedback({ state }: { state: CalendarActionState }) {
  if (state.status === "success") return <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm font-medium text-emerald-800">Calendario aggiornato.</p>;
  if (state.status !== "error") return null;
  const labels: Record<string, string> = {
    conflict: "La barca è già occupata in questa giornata: prima gestisci la prenotazione o il blocco esistente.",
    "not-allowed": "Non hai i permessi per modificare questa barca.",
    "release-failed": "Non è stato possibile rendere nuovamente libera la barca.",
    "status-failed": "Non è stato possibile aggiornare lo stato della prenotazione.",
    "invalid-status": "Lo stato richiesto non è valido.",
  };
  return <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm font-medium text-rose-800">{labels[state.code ?? ""] ?? "Operazione non riuscita."}</p>;
}

export function CalendarDayBlockForm({ operatorId, boatId, dayKey }: { operatorId: string; boatId: string; dayKey: string }) {
  const [state, action] = useActionState(blockCalendarDay, initialState);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="operator_id" value={operatorId} />
      <input type="hidden" name="boat_id" value={boatId} />
      <input type="hidden" name="day_key" value={dayKey} />
      <Feedback state={state} />
      <label className="grid gap-2 text-sm font-semibold">Motivo opzionale<textarea name="reason" rows={3} maxLength={1000} className={`${fieldClass} py-3`} placeholder="Es. manutenzione, uso privato…" /></label>
      <PendingButton className="min-h-12 w-full rounded-xl border border-[#C8C0FF] bg-[#F4F1FF] px-4 text-sm font-semibold text-[#4C3FC2]">Rendi non disponibile</PendingButton>
    </form>
  );
}

export function CalendarReleaseBlockForm({ operatorId, boatId, occupancyId }: { operatorId: string; boatId: string; occupancyId: string }) {
  const [state, action] = useActionState(releaseCalendarDay, initialState);
  return (
    <form action={action} className="mt-3 space-y-2">
      <input type="hidden" name="operator_id" value={operatorId} />
      <input type="hidden" name="boat_id" value={boatId} />
      <input type="hidden" name="occupancy_id" value={occupancyId} />
      <Feedback state={state} />
      <PendingButton className="min-h-11 rounded-xl border border-[#C8C0FF] bg-white px-4 text-sm font-semibold text-[#4C3FC2]">Rendi di nuovo libera</PendingButton>
    </form>
  );
}

export function CalendarBookingStatusForm({ operatorId, bookingId, status }: { operatorId: string; bookingId: string; status: string }) {
  const [state, action] = useActionState(changeCalendarBookingStatus, initialState);
  if (!["CONFIRMED", "IN_PROGRESS"].includes(status)) return null;
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="operator_id" value={operatorId} />
      <input type="hidden" name="booking_id" value={bookingId} />
      <Feedback state={state} />
      <textarea name="note" rows={2} maxLength={1000} className={`${fieldClass} py-3`} placeholder="Nota opzionale sul cambio di stato" />
      <div className="flex flex-wrap gap-2">
        {status === "CONFIRMED" ? <button name="target_status" value="IN_PROGRESS" className="min-h-11 rounded-xl bg-[#6D5DFB] px-4 text-sm font-semibold text-white">Avvia</button> : null}
        <button name="target_status" value="COMPLETED" className="min-h-11 rounded-xl border border-[#D8D5E5] bg-white px-4 text-sm font-semibold">Completa</button>
        <button name="target_status" value="NO_SHOW" className="min-h-11 rounded-xl border border-[#D8D5E5] bg-white px-4 text-sm font-semibold">No show</button>
        <button name="target_status" value="CANCELLED_BY_OPERATOR" className="min-h-11 rounded-xl border border-rose-200 bg-white px-4 text-sm font-semibold text-rose-700">Cancella</button>
      </div>
    </form>
  );
}
