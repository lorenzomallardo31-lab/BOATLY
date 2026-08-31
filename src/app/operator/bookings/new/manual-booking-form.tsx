"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  createManualBooking,
  type ManualBookingActionState,
} from "./actions";

const initialManualBookingState: ManualBookingActionState = { status: "idle" };

type OfferingOption = {
  id: string;
  boatId: string;
  label: string;
};

type BoatOption = {
  id: string;
  name: string;
  passengerLimit: number | null;
  licenseRequired: boolean;
};

type CustomerOption = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
};

type LocationOption = {
  id: string;
  label: string;
};

type SkipperOption = {
  id: string;
  name: string;
  phone: string | null;
};

type ManualBookingFormProps = {
  operatorId: string;
  operatorActive: boolean;
  boats: BoatOption[];
  offerings: OfferingOption[];
  customers: CustomerOption[];
  locations: LocationOption[];
  skippers: SkipperOption[];
  initialDate: string;
  initialBoatId?: string;
  initialCustomerId?: string;
};

const ERROR_LABELS: Record<string, string> = {
  "missing-fields": "Compila tutti i campi obbligatori.",
  "invalid-values": "Controlla il numero di passeggeri e il valore concordato.",
  "invalid-window": "L’orario di rientro deve essere successivo alla partenza.",
  "past-window": "La prenotazione deve iniziare nel futuro.",
  "operator-inactive": "Il workspace deve essere ACTIVE per registrare prenotazioni reali.",
  "boat-inactive": "La barca selezionata non è attiva.",
  passengers: "Il numero di passeggeri supera il limite della barca.",
  offering: "L’offerta selezionata non appartiene alla barca o non è più attiva.",
  location: "La sede di partenza non è più disponibile.",
  "customer-name": "Inserisci il nome del nuovo cliente.",
  "customer-contact": "Per un nuovo cliente serve almeno email o telefono.",
  "customer-email": "L’indirizzo email non è valido.",
  "customer-phone": "Il numero deve contenere da 8 a 15 cifre.",
  "customer-not-found": "Il cliente selezionato non esiste più.",
  "customer-exists": "Email o telefono appartengono a un cliente già presente. Selezionalo come cliente esistente.",
  "customer-conflict": "Email e telefono rimandano a due clienti diversi. Correggi i dati prima di continuare.",
  "customer-overlap": "Questo cliente ha già una prenotazione che si sovrappone, anche solo in parte.",
  "boat-overlap": "La barca è già occupata in questo intervallo, anche solo per una parte dell’orario.",
  "skipper-overlap": "Lo skipper è già impegnato anche solo per una parte dell’orario.",
  "skipper-unavailable": "Lo skipper selezionato non è più disponibile.",
  "skipper-name": "Inserisci il nome dello skipper.",
  "skipper-phone": "Il telefono dello skipper deve contenere da 8 a 15 cifre.",
  "license-answer-required": "Indica se il cliente possiede la patente nautica richiesta.",
  "skipper-required": "Il cliente non ha la patente richiesta: assegna uno skipper.",
  "save-failed": "Non è stato possibile salvare la prenotazione. Riprova senza duplicare l’invio.",
};

const inputClass =
  "min-h-11 w-full rounded-xl border border-[#D8D5E5] bg-white px-3 text-base text-[#171A2B] outline-none transition focus:border-[#6D5DFB] focus:ring-2 focus:ring-[#6D5DFB]/15 sm:text-sm";

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#171A2B] px-6 text-sm font-semibold text-white transition hover:bg-[#292D45] disabled:cursor-not-allowed disabled:opacity-45"
    >
      {pending ? "Verifica e salvataggio…" : "Verifica e registra"}
    </button>
  );
}

export function ManualBookingForm({
  operatorId,
  operatorActive,
  boats,
  offerings,
  customers,
  locations,
  skippers,
  initialDate,
  initialBoatId,
  initialCustomerId,
}: ManualBookingFormProps) {
  const firstBoatId =
    initialBoatId && boats.some((boat) => boat.id === initialBoatId)
      ? initialBoatId
      : boats[0]?.id ?? "";
  const firstCustomerId =
    initialCustomerId && customers.some((customer) => customer.id === initialCustomerId)
      ? initialCustomerId
      : customers[0]?.id ?? "";
  const [state, formAction] = useActionState(
    createManualBooking,
    initialManualBookingState,
  );
  const [boatId, setBoatId] = useState(firstBoatId);
  const [offeringId, setOfferingId] = useState(
    offerings.find((offering) => offering.boatId === firstBoatId)?.id ?? "",
  );
  const [customerMode, setCustomerMode] = useState<"EXISTING" | "NEW">(
    customers.length > 0 ? "EXISTING" : "NEW",
  );
  const [customerId, setCustomerId] = useState(firstCustomerId);
  const [skipperChoice, setSkipperChoice] = useState("NONE");
  const [licenseAnswer, setLicenseAnswer] = useState<"" | "YES" | "NO">("");

  const selectedBoat = boats.find((boat) => boat.id === boatId);
  const boatOfferings = useMemo(
    () => offerings.filter((offering) => offering.boatId === boatId),
    [boatId, offerings],
  );

  function changeBoat(nextBoatId: string) {
    setBoatId(nextBoatId);
    setOfferingId(
      offerings.find((offering) => offering.boatId === nextBoatId)?.id ?? "",
    );
    setLicenseAnswer("");
    setSkipperChoice("NONE");
  }

  const skipperMandatory = selectedBoat?.licenseRequired === true && licenseAnswer === "NO";
  const navigationIncomplete = selectedBoat?.licenseRequired === true && !licenseAnswer;
  const skipperIncomplete = skipperMandatory
    && !skipperChoice.startsWith("EXISTING:")
    && skipperChoice !== "NEW";

  function changeLicenseAnswer(next: "YES" | "NO") {
    setLicenseAnswer(next);
    if (next === "NO" && (skipperChoice === "NONE" || skipperChoice === "UNASSIGNED")) {
      setSkipperChoice("");
    } else if (next === "YES" && !skipperChoice) {
      setSkipperChoice("NONE");
    }
  }

  const error = state.code ? ERROR_LABELS[state.code] ?? ERROR_LABELS["save-failed"] : null;
  const formDisabled =
    !operatorActive ||
    !boatId ||
    !offeringId ||
    locations.length === 0 ||
    (customerMode === "EXISTING" && !customerId) ||
    navigationIncomplete ||
    skipperIncomplete;

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="operator_id" value={operatorId} />
      <input type="hidden" name="customer_mode" value={customerMode} />
      <input type="hidden" name="customer_has_required_license" value={licenseAnswer} />

      {error ? (
        <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium leading-6 text-rose-800">
          {error}
        </div>
      ) : null}

      <section className="rounded-3xl border border-[#E2DFEB] bg-white p-5 shadow-sm sm:p-7">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#EDE9FE] text-sm font-bold text-[#4C3FC2]">1</span>
          <div>
            <h2 className="text-xl font-semibold">Imbarcazione e orari</h2>
            <p className="mt-1 text-sm text-[#676B80]">Il database controlla disponibilità, capienza e sovrapposizioni al salvataggio.</p>
          </div>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold">
            Barca *
            <select name="boat_id" required className={inputClass} value={boatId} onChange={(event) => changeBoat(event.target.value)}>
              <option value="">Seleziona</option>
              {boats.map((boat) => (
                <option key={boat.id} value={boat.id}>
                  {boat.name}{boat.passengerLimit ? ` · max ${boat.passengerLimit}` : ""}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm font-semibold">
            Formula di noleggio *
            <select name="legal_offering_id" required className={inputClass} value={offeringId} onChange={(event) => setOfferingId(event.target.value)}>
              <option value="">Seleziona</option>
              {boatOfferings.map((offering) => (
                <option key={offering.id} value={offering.id}>{offering.label}</option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm font-semibold">
            Sede di partenza *
            <select name="pickup_location_id" required className={inputClass} defaultValue={locations[0]?.id ?? ""}>
              <option value="">Seleziona</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>{location.label}</option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm font-semibold">
            Passeggeri *
            <input
              name="passenger_count"
              type="number"
              min={1}
              max={selectedBoat?.passengerLimit ?? undefined}
              defaultValue={1}
              required
              className={inputClass}
            />
          </label>

          <label className="grid gap-2 text-sm font-semibold">
            Data *
            <input name="date" type="date" required defaultValue={initialDate} className={inputClass} />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-2 text-sm font-semibold">
              Partenza *
              <input name="start_time" type="time" required defaultValue="09:00" className={inputClass} />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              Rientro *
              <input name="end_time" type="time" required defaultValue="17:00" className={inputClass} />
            </label>
          </div>
        </div>

        {selectedBoat?.licenseRequired ? (
          <fieldset className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <legend className="px-1 text-sm font-semibold">Il cliente ha la patente nautica? *</legend>
            <p className="mt-1 text-xs leading-5 text-amber-900">Questa barca richiede la patente. Se il cliente non la possiede, dovrai assegnare uno skipper.</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {(["YES", "NO"] as const).map((value) => (
                <label key={value} className={`flex min-h-12 cursor-pointer items-center justify-center rounded-xl border px-3 text-sm font-semibold transition active:scale-[0.98] ${licenseAnswer === value ? "border-[#6D5DFB] bg-white text-[#4C3FC2] ring-2 ring-[#6D5DFB]/15" : "border-amber-200 bg-white/70 text-[#4A4758] hover:border-[#AFA5FF]"}`}>
                  <input type="radio" className="sr-only" checked={licenseAnswer === value} onChange={() => changeLicenseAnswer(value)} />
                  {value === "YES" ? "Sì, ce l’ha" : "No, non ce l’ha"}
                </label>
              ))}
            </div>
          </fieldset>
        ) : (
          <p className="mt-5 rounded-xl bg-emerald-50 p-3 text-xs font-medium text-emerald-800">Per questa barca la patente nautica non è richiesta.</p>
        )}

        <div className="mt-5 rounded-2xl border border-[#E2DFEB] bg-[#FAF9FC] p-4">
          <label className="grid gap-2 text-sm font-semibold">
            Skipper <span className={`font-normal ${skipperMandatory ? "text-rose-700" : "text-[#777285]"}`}>{skipperMandatory ? "(obbligatorio)" : "(facoltativo)"}</span>
            <select name="skipper_choice" value={skipperChoice} onChange={(event) => setSkipperChoice(event.target.value)} required={skipperMandatory} className={inputClass}>
              {skipperMandatory ? <option value="">Seleziona o aggiungi uno skipper</option> : null}
              {!skipperMandatory ? <option value="NONE">Nessuno · non serve</option> : null}
              {!skipperMandatory ? <option value="UNASSIGNED">Da assegnare</option> : null}
              {skippers.map((skipper) => <option key={skipper.id} value={`EXISTING:${skipper.id}`}>{skipper.name}{skipper.phone ? ` · ${skipper.phone}` : ""}</option>)}
              <option value="NEW">+ Aggiungi uno skipper</option>
            </select>
          </label>
          {skipperMandatory ? <p className="mt-3 rounded-xl bg-rose-50 p-3 text-xs font-medium leading-5 text-rose-800">Lo skipper deve essere assegnato subito: “da assegnare” non è sufficiente.</p> : null}
          {skipperChoice === "NEW" ? (
            <div className="mt-4 grid gap-4 border-t border-[#E2DFEB] pt-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold">Nome skipper *<input name="new_skipper_name" required minLength={2} maxLength={160} className={inputClass} /></label>
              <label className="grid gap-2 text-sm font-semibold">Telefono <span className="font-normal text-[#777285]">(facoltativo)</span><input name="new_skipper_phone" type="tel" className={inputClass} /></label>
              <label className="grid gap-2 text-sm font-semibold sm:col-span-2">Nota <span className="font-normal text-[#777285]">(facoltativa)</span><textarea name="new_skipper_notes" rows={2} maxLength={2000} className={`${inputClass} py-3`} /></label>
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-3xl border border-[#E2DFEB] bg-white p-5 shadow-sm sm:p-7">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#EDE9FE] text-sm font-bold text-[#4C3FC2]">2</span>
          <div>
            <h2 className="text-xl font-semibold">Cliente</h2>
            <p className="mt-1 text-sm text-[#676B80]">Se è nuovo, la scheda CRM viene creata nella stessa transazione della prenotazione.</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 rounded-2xl bg-[#F4F2FA] p-1">
          <button
            type="button"
            disabled={customers.length === 0}
            onClick={() => setCustomerMode("EXISTING")}
            className={`min-h-11 rounded-xl px-3 text-sm font-semibold transition ${customerMode === "EXISTING" ? "bg-white text-[#4C3FC2] shadow-sm" : "text-[#676B80]"} disabled:cursor-not-allowed disabled:opacity-40`}
          >
            Già presente
          </button>
          <button
            type="button"
            onClick={() => setCustomerMode("NEW")}
            className={`min-h-11 rounded-xl px-3 text-sm font-semibold transition ${customerMode === "NEW" ? "bg-white text-[#4C3FC2] shadow-sm" : "text-[#676B80]"}`}
          >
            Nuovo cliente
          </button>
        </div>

        {customerMode === "EXISTING" ? (
          <label className="mt-5 grid gap-2 text-sm font-semibold">
            Cliente *
            <select name="operator_customer_id" required className={inputClass} value={customerId} onChange={(event) => setCustomerId(event.target.value)}>
              <option value="">Seleziona</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}{customer.email ? ` · ${customer.email}` : customer.phone ? ` · ${customer.phone}` : ""}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <div className="mt-5 grid gap-5 sm:grid-cols-3">
            <label className="grid gap-2 text-sm font-semibold">
              Nome / denominazione *
              <input name="customer_name" required minLength={2} className={inputClass} />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              Email
              <input name="customer_email" type="email" className={inputClass} />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              Telefono
              <input name="customer_phone" type="tel" className={inputClass} />
            </label>
            <p className="rounded-xl bg-[#EDE9FE] p-3 text-xs leading-5 text-[#4C3FC2] sm:col-span-3">
              Inserisci almeno email o telefono. Se uno dei due appartiene già a un contatto, Boatly Ops blocca il salvataggio e ti chiede di selezionare quel cliente.
            </p>
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-[#E2DFEB] bg-white p-5 shadow-sm sm:p-7">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#FFF0D6] text-sm font-bold text-[#A14B08]">3</span>
          <div>
            <h2 className="text-xl font-semibold">Valore e note</h2>
            <p className="mt-1 text-sm text-[#676B80]">Questa prenotazione diretta non genera commissioni marketplace.</p>
          </div>
        </div>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold">
            Totale concordato (€) *
            <input name="total" inputMode="decimal" required defaultValue="0,00" className={inputClass} />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Nota operativa
            <textarea name="operator_note" rows={3} className={`${inputClass} py-3`} placeholder="Itinerario, skipper, richieste…" />
          </label>
        </div>
      </section>

      <div className="sticky bottom-20 z-20 flex flex-col gap-3 rounded-2xl border border-[#D8D5E5] bg-white/95 p-3 shadow-xl backdrop-blur sm:static sm:flex-row sm:items-center sm:justify-between sm:bg-transparent sm:p-0 sm:shadow-none">
        <p className="text-xs leading-5 text-[#676B80]">
          Salvataggio atomico: cliente, prenotazione, prezzo e occupazione vengono creati insieme oppure non viene salvato nulla.
        </p>
        <SubmitButton disabled={formDisabled} />
      </div>
    </form>
  );
}
