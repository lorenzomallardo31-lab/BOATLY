"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  setCalendarBookingSkipper,
  type CalendarActionState,
} from "@/app/operator/calendar/actions";
import { skipperWhatsAppHref } from "@/lib/operator/skipper-contact";

type SkipperOption = { id: string; name: string; phone: string | null };

type Props = {
  operatorId: string;
  bookingId: string;
  skippers: SkipperOption[];
  current: {
    state: string | null;
    skipperId: string | null;
    name: string | null;
    phone: string | null;
  };
  navigation: {
    licenseRequired: boolean;
    customerHasRequiredLicense: boolean | null;
  };
};

const initialState: CalendarActionState = { status: "idle" };
const fieldClass = "min-h-11 w-full rounded-xl border border-[#D8D5E5] bg-white px-3 text-base outline-none focus:border-[#6D5DFB] focus:ring-2 focus:ring-[#6D5DFB]/15 sm:text-sm";

const errors: Record<string, string> = {
  "skipper-overlap": "Questo skipper ha già un’altra uscita che si sovrappone, anche solo di un minuto.",
  "skipper-unavailable": "Lo skipper selezionato non è più disponibile. Scegline un altro.",
  "skipper-name": "Inserisci il nome dello skipper.",
  "skipper-phone": "Il telefono deve contenere da 8 a 15 cifre.",
  "booking-not-editable": "Questa prenotazione è già conclusa e l’assegnazione resta nello storico.",
  "license-answer-required": "Indica se il cliente possiede la patente nautica richiesta.",
  "skipper-required": "Il cliente non ha la patente: devi assegnare uno skipper.",
  "not-allowed": "Il tuo accesso non consente questa modifica.",
  "skipper-save-failed": "Assegnazione non salvata. La prenotazione è rimasta invariata.",
};

function initialChoice(current: Props["current"]) {
  if (current.state === "UNASSIGNED") return "UNASSIGNED";
  if (current.state === "ASSIGNED" && current.skipperId) {
    return `EXISTING:${current.skipperId}`;
  }
  return "NONE";
}

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="min-h-11 rounded-xl bg-[#6D5DFB] px-4 text-sm font-semibold text-white transition hover:bg-[#5948EF] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
    >
      {pending ? "Controllo impegni…" : "Salva skipper"}
    </button>
  );
}

export default function BookingSkipperForm({
  operatorId,
  bookingId,
  skippers,
  current,
  navigation,
}: Props) {
  const [state, action] = useActionState(setCalendarBookingSkipper, initialState);
  const [choice, setChoice] = useState(initialChoice(current));
  const [licenseAnswer, setLicenseAnswer] = useState<"" | "YES" | "NO">(
    navigation.customerHasRequiredLicense === true
      ? "YES"
      : navigation.customerHasRequiredLicense === false
        ? "NO"
        : "",
  );
  const skipperMandatory = navigation.licenseRequired && licenseAnswer === "NO";
  const navigationIncomplete = navigation.licenseRequired && !licenseAnswer;
  const skipperIncomplete = skipperMandatory
    && !choice.startsWith("EXISTING:")
    && choice !== "NEW";
  const currentIsOutsideList = current.skipperId
    && !skippers.some((skipper) => skipper.id === current.skipperId);
  const whatsappHref = skipperWhatsAppHref(current.phone);
  const error = state.code ? errors[state.code] ?? errors["skipper-save-failed"] : null;

  function changeLicenseAnswer(next: "YES" | "NO") {
    setLicenseAnswer(next);
    if (next === "NO" && (choice === "NONE" || choice === "UNASSIGNED")) {
      setChoice("");
    } else if (next === "YES" && !choice) {
      setChoice("NONE");
    }
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="operator_id" value={operatorId} />
      <input type="hidden" name="booking_id" value={bookingId} />
      <input type="hidden" name="customer_has_required_license" value={licenseAnswer} />

      {current.state === "ASSIGNED" && current.name ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">
          <span><strong>Assegnato:</strong> {current.name}{current.phone ? ` · ${current.phone}` : ""}</span>
          {whatsappHref ? (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg bg-[#1FA855] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#188A47] active:scale-[0.98]"
            >
              WhatsApp skipper
            </a>
          ) : null}
        </div>
      ) : current.state === "UNASSIGNED" ? (
        <div className="rounded-xl bg-amber-50 p-3 text-sm font-medium text-amber-900">
          Skipper ancora da assegnare.
        </div>
      ) : null}

      {state.status === "success" ? (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800">
          Skipper aggiornato. Calendario e cruscotto Oggi sono allineati.
        </div>
      ) : null}
      {error ? (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-medium leading-6 text-rose-800">
          {error}
        </div>
      ) : null}

      {navigation.licenseRequired ? (
        <fieldset className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <legend className="px-1 text-sm font-semibold">Il cliente ha la patente nautica? *</legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(["YES", "NO"] as const).map((value) => (
              <label
                key={value}
                className={`flex min-h-11 cursor-pointer items-center justify-center rounded-lg border px-2 text-sm font-semibold transition active:scale-[0.98] ${
                  licenseAnswer === value
                    ? "border-[#6D5DFB] bg-white text-[#4C3FC2] ring-2 ring-[#6D5DFB]/15"
                    : "border-amber-200 bg-white/70 text-[#4A4758] hover:border-[#AFA5FF]"
                }`}
              >
                <input type="radio" className="sr-only" checked={licenseAnswer === value} onChange={() => changeLicenseAnswer(value)} />
                {value === "YES" ? "Sì" : "No"}
              </label>
            ))}
          </div>
        </fieldset>
      ) : (
        <p className="rounded-xl bg-emerald-50 p-3 text-xs font-medium text-emerald-800">
          Patente nautica non richiesta per questa barca.
        </p>
      )}

      <label className="grid gap-2 text-sm font-semibold">
        Skipper della prenotazione {skipperMandatory ? <span className="font-normal text-rose-700">(obbligatorio)</span> : <span className="font-normal text-[#777285]">(facoltativo)</span>}
        <select
          name="skipper_choice"
          value={choice}
          onChange={(event) => setChoice(event.target.value)}
          required={skipperMandatory}
          className={fieldClass}
        >
          {skipperMandatory ? <option value="">Seleziona o aggiungi uno skipper</option> : null}
          {!skipperMandatory ? <option value="NONE">Nessuno · non serve</option> : null}
          {!skipperMandatory ? <option value="UNASSIGNED">Da assegnare</option> : null}
          {currentIsOutsideList ? (
            <option value={`EXISTING:${current.skipperId}`} disabled>
              {current.name ?? "Skipper attuale"} · non disponibile per nuove assegnazioni
            </option>
          ) : null}
          {skippers.map((skipper) => (
            <option key={skipper.id} value={`EXISTING:${skipper.id}`}>
              {skipper.name}{skipper.phone ? ` · ${skipper.phone}` : ""}
            </option>
          ))}
          <option value="NEW">+ Aggiungi uno skipper</option>
        </select>
      </label>

      {choice === "NEW" ? (
        <div className="grid gap-3 rounded-xl bg-[#F7F6FB] p-3 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold">
            Nome *
            <input name="new_skipper_name" required minLength={2} maxLength={160} className={fieldClass} />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Telefono <span className="font-normal text-[#777285]">(facoltativo)</span>
            <input name="new_skipper_phone" type="tel" className={fieldClass} />
          </label>
          <label className="grid gap-2 text-sm font-semibold sm:col-span-2">
            Nota <span className="font-normal text-[#777285]">(facoltativa)</span>
            <textarea name="new_skipper_notes" rows={2} maxLength={2000} className={`${fieldClass} py-3`} />
          </label>
        </div>
      ) : null}

      {skipperMandatory ? (
        <p className="rounded-xl bg-rose-50 p-3 text-xs font-medium leading-5 text-rose-800">
          Senza patente del cliente non è possibile lasciare lo skipper vuoto o “da assegnare”.
        </p>
      ) : null}

      <div className="flex justify-end"><SubmitButton disabled={navigationIncomplete || skipperIncomplete} /></div>
    </form>
  );
}
