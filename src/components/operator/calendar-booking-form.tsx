"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  createManualBooking,
  type ManualBookingActionState,
} from "@/app/operator/bookings/new/actions";

type Props = {
  operatorId: string;
  boatId: string;
  dayKey: string;
  passengerLimit: number | null;
  offerings: Array<{ id: string; label: string }>;
  customers: Array<{ id: string; name: string; email: string | null; phone: string | null }>;
  locations: Array<{ id: string; label: string }>;
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
  "customer-contact": "Inserisci almeno email o telefono.",
  "customer-email": "L’indirizzo email non è valido.",
  "customer-phone": "Il telefono deve contenere da 8 a 15 cifre.",
  "customer-not-found": "Il cliente selezionato non esiste più.",
  "customer-exists": "Email o telefono appartengono a un cliente già presente: selezionalo dall’elenco.",
  "customer-conflict": "Email e telefono appartengono a clienti diversi.",
  "customer-overlap": "Questo cliente ha già una prenotazione che si sovrappone, anche solo in parte.",
  "boat-overlap": "La barca è già occupata in questo intervallo, anche solo per una parte dell’orario.",
  "save-failed": "Prenotazione non salvata. Nessun dato parziale è stato creato.",
};

const fieldClass = "min-h-11 w-full rounded-xl border border-[#D8D5E5] bg-white px-3 text-base outline-none focus:border-[#6D5DFB] focus:ring-2 focus:ring-[#6D5DFB]/15 sm:text-sm";

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={disabled || pending} className="min-h-12 rounded-xl bg-[#6D5DFB] px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45">
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
  customers,
  locations,
}: Props) {
  const [state, action] = useActionState(createManualBooking, initialState);
  const [mode, setMode] = useState<"EXISTING" | "NEW">(customers.length ? "EXISTING" : "NEW");
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? "");
  const error = state.code ? errors[state.code] ?? errors["save-failed"] : null;
  const disabled = !offerings.length || !locations.length || (mode === "EXISTING" && !customerId);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="calendar_mode" value="1" />
      <input type="hidden" name="operator_id" value={operatorId} />
      <input type="hidden" name="boat_id" value={boatId} />
      <input type="hidden" name="date" value={dayKey} />
      <input type="hidden" name="customer_mode" value={mode} />
      <input type="hidden" name="total" value="0" />

      {state.status === "success" ? (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800">
          Prenotazione creata. Barca, cliente e calendario sono aggiornati insieme.
        </div>
      ) : null}
      {error ? <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-medium leading-6 text-rose-800">{error}</div> : null}

      {!offerings.length || !locations.length ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Completa almeno una formula della barca e una sede operativa prima di prenotare.
        </div>
      ) : null}

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
          Formula *
          <select name="legal_offering_id" required defaultValue={offerings[0]?.id ?? ""} className={fieldClass}>
            {offerings.map((offering) => <option key={offering.id} value={offering.id}>{offering.label}</option>)}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold sm:col-span-2">
          Sede *
          <select name="pickup_location_id" required defaultValue={locations[0]?.id ?? ""} className={fieldClass}>
            {locations.map((location) => <option key={location.id} value={location.id}>{location.label}</option>)}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 rounded-xl bg-[#F1F0F6] p-1">
        <button type="button" disabled={!customers.length} onClick={() => setMode("EXISTING")} className={`min-h-11 rounded-lg text-sm font-semibold ${mode === "EXISTING" ? "bg-white text-[#4C3FC2] shadow-sm" : "text-[#676B80]"} disabled:opacity-40`}>Cliente presente</button>
        <button type="button" onClick={() => setMode("NEW")} className={`min-h-11 rounded-lg text-sm font-semibold ${mode === "NEW" ? "bg-white text-[#4C3FC2] shadow-sm" : "text-[#676B80]"}`}>Nuovo cliente</button>
      </div>

      {mode === "EXISTING" ? (
        <label className="grid gap-2 text-sm font-semibold">
          Cliente *
          <select name="operator_customer_id" required value={customerId} onChange={(event) => setCustomerId(event.target.value)} className={fieldClass}>
            <option value="">Seleziona</option>
            {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}{customer.email ? ` · ${customer.email}` : customer.phone ? ` · ${customer.phone}` : ""}</option>)}
          </select>
        </label>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="grid gap-2 text-sm font-semibold">Nome *<input name="customer_name" required minLength={2} maxLength={160} className={fieldClass} /></label>
          <label className="grid gap-2 text-sm font-semibold">Email<input name="customer_email" type="email" maxLength={320} className={fieldClass} /></label>
          <label className="grid gap-2 text-sm font-semibold">Telefono<input name="customer_phone" type="tel" className={fieldClass} /></label>
          <p className="rounded-xl bg-[#EDE9FE] p-3 text-xs leading-5 text-[#4C3FC2] sm:col-span-3">Inserisci almeno email o telefono. Se appartiene già a un cliente, il salvataggio viene bloccato per evitare doppioni.</p>
        </div>
      )}

      <label className="grid gap-2 text-sm font-semibold">
        Nota opzionale
        <textarea name="operator_note" rows={3} maxLength={5000} className={`${fieldClass} py-3`} placeholder="Itinerario, richieste, promemoria…" />
      </label>

      <div className="flex justify-end"><SubmitButton disabled={disabled} /></div>
    </form>
  );
}
