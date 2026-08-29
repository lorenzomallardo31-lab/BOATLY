"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  createSimpleCalendarBooking,
  type ManualBookingActionState,
} from "@/app/operator/bookings/new/actions";

type Props = {
  operatorId: string;
  boatId: string;
  dayKey: string;
  passengerLimit: number | null;
  offerings: Array<{ id: string; label: string }>;
};

const initialState: ManualBookingActionState = { status: "idle" };

const errors: Record<string, string> = {
  "missing-fields": "Mancano alcune informazioni obbligatorie.",
  "invalid-values": "Controlla passeggeri e dati inseriti.",
  "invalid-window": "L’orario di fine deve essere successivo all’inizio.",
  "past-window": "La prenotazione deve iniziare nel futuro.",
  "operator-inactive": "Il gestionale è temporaneamente bloccato.",
  "boat-inactive": "Questa barca non è disponibile.",
  passengers: "Il numero di passeggeri supera il limite della barca.",
  offering: "La formula operativa della barca non è disponibile.",
  location: "La sede operativa non è disponibile.",
  "customer-name": "Inserisci il nome del cliente.",
  "customer-email": "L’indirizzo email non è valido.",
  "customer-phone": "Il telefono deve contenere da 8 a 15 cifre.",
  "customer-conflict": "Email e telefono appartengono a due persone diverse. Correggi uno dei contatti.",
  "customer-overlap": "Questo cliente ha già una prenotazione che si sovrappone, anche solo in parte.",
  "boat-overlap": "La barca è già occupata in questo intervallo, anche solo per una parte dell’orario.",
  "save-failed": "Prenotazione non salvata. Nessun dato parziale è stato creato.",
};

const fieldClass = "min-h-11 w-full rounded-xl border border-[#D8D5E5] bg-white px-3 text-base outline-none focus:border-[#6D5DFB] focus:ring-2 focus:ring-[#6D5DFB]/15 sm:text-sm";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="min-h-12 rounded-xl bg-[#6D5DFB] px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45">
      {pending ? "Controllo disponibilità…" : "Crea prenotazione"}
    </button>
  );
}

export default function CalendarBookingForm({
  operatorId,
  boatId,
  dayKey,
  passengerLimit,
  offerings,
}: Props) {
  const [state, action] = useActionState(createSimpleCalendarBooking, initialState);
  const error = state.code ? errors[state.code] ?? errors["save-failed"] : null;

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="operator_id" value={operatorId} />
      <input type="hidden" name="boat_id" value={boatId} />
      <input type="hidden" name="date" value={dayKey} />

      {state.status === "success" ? (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800">
          Prenotazione creata. Il calendario e il cruscotto Oggi sono aggiornati insieme.
        </div>
      ) : null}
      {error ? <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-medium leading-6 text-rose-800">{error}</div> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold">
          Partenza *
          <input name="start_time" type="time" required defaultValue="09:00" className={fieldClass} />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Rientro *
          <input name="end_time" type="time" required defaultValue="17:00" className={fieldClass} />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Passeggeri *
          <input name="passenger_count" type="number" min={1} max={passengerLimit ?? undefined} defaultValue={1} required className={fieldClass} />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Formula <span className="font-normal text-[#777285]">(facoltativa)</span>
          <select name="legal_offering_id" defaultValue="" className={fieldClass}>
            <option value="">Usa la formula operativa predefinita</option>
            {offerings.map((offering) => <option key={offering.id} value={offering.id}>{offering.label}</option>)}
          </select>
        </label>
      </div>

      <div className="rounded-2xl border border-[#E2DFEB] bg-[#F9F8FC] p-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="grid gap-2 text-sm font-semibold">Nome cliente *<input name="customer_name" required minLength={2} maxLength={160} autoComplete="name" className={fieldClass} /></label>
          <label className="grid gap-2 text-sm font-semibold">Telefono <span className="font-normal text-[#777285]">(facoltativo)</span><input name="customer_phone" type="tel" autoComplete="tel" className={fieldClass} /></label>
          <label className="grid gap-2 text-sm font-semibold">Email <span className="font-normal text-[#777285]">(facoltativa)</span><input name="customer_email" type="email" maxLength={320} autoComplete="email" className={fieldClass} /></label>
        </div>
        <p className="mt-3 text-xs leading-5 text-[#676B80]">
          Scrivi sempre il nome. Se aggiungi un contatto già noto, Boatly riconosce automaticamente la persona senza mostrarti lunghi elenchi.
        </p>
      </div>

      <label className="grid gap-2 text-sm font-semibold">
        Nota opzionale
        <textarea name="operator_note" rows={3} maxLength={5000} className={`${fieldClass} py-3`} placeholder="Itinerario, richieste, promemoria…" />
      </label>

      <div className="flex justify-end"><SubmitButton /></div>
    </form>
  );
}
