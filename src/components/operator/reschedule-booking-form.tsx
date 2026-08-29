"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  rescheduleManualBooking,
  type RescheduleActionState,
} from "@/app/operator/bookings/[bookingId]/actions";

const initialRescheduleState: RescheduleActionState = { status: "idle" };

type BoatOption = { id: string; name: string; passengerLimit: number | null };
type OfferingOption = { id: string; boatId: string; label: string };
type LocationOption = { id: string; label: string };

type Props = {
  operatorId: string;
  bookingId: string;
  calendarMode?: boolean;
  boats: BoatOption[];
  offerings: OfferingOption[];
  locations: LocationOption[];
  initial: {
    boatId: string;
    offeringId: string;
    locationId: string;
    startsAtLocal: string;
    endsAtLocal: string;
    passengerCount: number;
    total: string;
    operatorNote: string;
  };
};

const ERRORS: Record<string, string> = {
  "missing-fields": "Compila tutti i campi obbligatori.",
  "reason-required": "Indica il motivo della riprogrammazione.",
  "not-found": "La prenotazione non esiste più.",
  "not-reschedulable": "Puoi riprogrammare solo prenotazioni manuali confermate.",
  "already-started": "Una prenotazione già iniziata non può essere riprogrammata.",
  "paid-booking": "Questa prenotazione ha movimenti finanziari: usa il flusso amministrativo dedicato.",
  "invalid-window": "Controlla date e orari: il nuovo intervallo deve essere futuro e valido.",
  "invalid-passengers": "Il numero di passeggeri non è valido.",
  "invalid-total": "Il totale concordato non è valido.",
  "boat-inactive": "La barca selezionata non è attiva.",
  passengers: "Il numero di passeggeri supera la capienza operativa.",
  offering: "La formula non appartiene alla barca o non è attiva.",
  location: "La sede non è disponibile.",
  "customer-overlap": "Il cliente ha già un’altra prenotazione che si sovrappone.",
  "boat-overlap": "La barca è già occupata anche solo per una parte dell’intervallo.",
  "not-allowed": "Il tuo ruolo non consente questa operazione.",
  "operator-inactive": "Il workspace deve essere attivo.",
  "save-failed": "Riprogrammazione non riuscita. La prenotazione originale è rimasta invariata.",
};

const inputClass = "min-h-11 w-full rounded-xl border border-[#D8D5E5] bg-white px-3 text-base outline-none focus:border-[#6D5DFB] focus:ring-2 focus:ring-[#6D5DFB]/15 sm:text-sm";

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className="min-h-12 rounded-xl bg-[#6D5DFB] px-5 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Verifica e riprogramma…" : "Conferma riprogrammazione"}</button>;
}

export default function RescheduleBookingForm({ operatorId, bookingId, boats, offerings, locations, initial, calendarMode = false }: Props) {
  const [state, action] = useActionState(rescheduleManualBooking, initialRescheduleState);
  const [boatId, setBoatId] = useState(initial.boatId);
  const [offeringId, setOfferingId] = useState(initial.offeringId);
  const boatOfferings = useMemo(() => offerings.filter((item) => item.boatId === boatId), [boatId, offerings]);
  const selectedBoat = boats.find((boat) => boat.id === boatId);
  const error = state.code ? ERRORS[state.code] ?? ERRORS["save-failed"] : null;

  function changeBoat(nextId: string) {
    setBoatId(nextId);
    setOfferingId(offerings.find((item) => item.boatId === nextId)?.id ?? "");
  }

  return (
    <form action={action} className="mt-5 space-y-5">
      <input type="hidden" name="operator_id" value={operatorId} />
      <input type="hidden" name="booking_id" value={bookingId} />
      {calendarMode ? <input type="hidden" name="calendar_mode" value="1" /> : null}
      {state.status === "success" ? <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800">Prenotazione riprogrammata e calendario aggiornato.</div> : null}
      {error ? <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-medium leading-6 text-rose-800">{error}</div> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold">Barca *<select name="boat_id" required value={boatId} onChange={(event) => changeBoat(event.target.value)} className={inputClass}>{boats.map((boat) => <option key={boat.id} value={boat.id}>{boat.name}</option>)}</select></label>
        <label className="grid gap-2 text-sm font-semibold">Formula *<select name="legal_offering_id" required value={offeringId} onChange={(event) => setOfferingId(event.target.value)} className={inputClass}>{boatOfferings.map((offering) => <option key={offering.id} value={offering.id}>{offering.label}</option>)}</select></label>
        <label className="grid gap-2 text-sm font-semibold">Sede *<select name="pickup_location_id" required defaultValue={initial.locationId} className={inputClass}>{locations.map((location) => <option key={location.id} value={location.id}>{location.label}</option>)}</select></label>
        <label className="grid gap-2 text-sm font-semibold">Passeggeri *<input name="passenger_count" type="number" min={1} max={selectedBoat?.passengerLimit ?? undefined} required defaultValue={initial.passengerCount} className={inputClass} /></label>
        <label className="grid gap-2 text-sm font-semibold">Nuovo inizio *<input name="starts_at_local" type="datetime-local" required defaultValue={initial.startsAtLocal} className={inputClass} /></label>
        <label className="grid gap-2 text-sm font-semibold">Nuova fine *<input name="ends_at_local" type="datetime-local" required defaultValue={initial.endsAtLocal} className={inputClass} /></label>
        {calendarMode ? <input type="hidden" name="total" value={initial.total} /> : <label className="grid gap-2 text-sm font-semibold">Totale concordato (€) *<input name="total" inputMode="decimal" required defaultValue={initial.total} className={inputClass} /></label>}
        <label className="grid gap-2 text-sm font-semibold">Nota operativa<textarea name="operator_note" rows={3} defaultValue={initial.operatorNote} className={`${inputClass} py-3`} /></label>
        <label className="grid gap-2 text-sm font-semibold sm:col-span-2">Motivo della modifica *<textarea name="reason" rows={3} required maxLength={1000} className={`${inputClass} py-3`} placeholder="Es. richiesta del cliente, meteo, cambio imbarcazione…" /></label>
      </div>
      <div className="rounded-xl bg-[#FFF8EA] p-3 text-xs leading-5 text-[#7C5A20]">La prenotazione originale rimane nello storico come annullata. La sostitutiva viene creata solo se tutti i controlli passano.</div>
      <div className="flex justify-end"><SubmitButton /></div>
    </form>
  );
}
