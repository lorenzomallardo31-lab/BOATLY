"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  blockCalendarDay,
  cancelCalendarBooking,
  markCalendarBookingDeparted,
  releaseCalendarDay,
  type CalendarActionState,
} from "@/app/operator/calendar/actions";

const initialState: CalendarActionState = { status: "idle" };
const fieldClass = "min-h-11 w-full rounded-xl border border-[#D8D5E5] bg-white px-3 text-sm outline-none focus:border-[#6D5DFB] focus:ring-2 focus:ring-[#6D5DFB]/15";

function PendingButton({ children, className, pendingLabel = "Salvataggio…" }: { children: React.ReactNode; className: string; pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className={`${className} cursor-pointer transition duration-150 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B7CFF] active:translate-y-0 active:scale-[0.98] disabled:cursor-wait disabled:opacity-50`}>{pending ? pendingLabel : children}</button>;
}

function Feedback({ state }: { state: CalendarActionState }) {
  if (state.status === "success") return <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm font-medium text-emerald-800">Calendario aggiornato.</p>;
  if (state.status !== "error") return null;
  const labels: Record<string, string> = {
    conflict: "La barca è già occupata in questa giornata: prima gestisci la prenotazione o il blocco esistente.",
    "not-allowed": "Non hai i permessi per modificare questa barca.",
    "release-failed": "Non è stato possibile rendere nuovamente libera la barca.",
    "cancel-failed": "Non è stato possibile eliminare la prenotazione e liberare la barca.",
    "not-cancellable": "Questa prenotazione non può più essere eliminata dal calendario.",
    "financial-cancellation-required": "Questa prenotazione ha un flusso marketplace e richiede la gestione del pagamento.",
    "already-updated": "La partenza risulta già registrata. Aggiorna la pagina se l’impegno è ancora visibile.",
    "outside-today": "Puoi registrare la partenza soltanto nel giorno previsto e quando la prenotazione è confermata.",
    "departure-failed": "Non è stato possibile registrare la partenza.",
  };
  return <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm font-medium text-rose-800">{labels[state.code ?? ""] ?? "Operazione non riuscita."}</p>;
}

export function CalendarMarkDepartedForm({ operatorId, bookingId }: { operatorId: string; bookingId: string }) {
  const [state, action] = useActionState(markCalendarBookingDeparted, initialState);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="operator_id" value={operatorId} />
      <input type="hidden" name="booking_id" value={bookingId} />
      {state.status === "success" ? (
        <p role="status" aria-live="polite" className="rounded-xl bg-emerald-100 p-3 text-sm font-semibold text-emerald-900">
          Partenza registrata: l’impegno è completato.
        </p>
      ) : <Feedback state={state} />}
      <PendingButton
        pendingLabel="Registrazione…"
        className="min-h-11 w-full rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700"
      >
        ✓ Segna come partita
      </PendingButton>
    </form>
  );
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

export function CalendarCancelBookingForm({ operatorId, bookingId }: { operatorId: string; bookingId: string }) {
  const [state, action] = useActionState(cancelCalendarBooking, initialState);
  return (
    <form
      action={action}
      className="space-y-3"
      onSubmit={(event) => {
        if (!window.confirm("Eliminare questa prenotazione e rendere nuovamente libera la barca?")) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="operator_id" value={operatorId} />
      <input type="hidden" name="booking_id" value={bookingId} />
      <Feedback state={state} />
      <PendingButton className="min-h-11 rounded-xl border border-rose-300 bg-rose-50 px-4 text-sm font-semibold text-rose-800 hover:bg-rose-100">Elimina prenotazione</PendingButton>
    </form>
  );
}
