"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  saveCustomer,
  type CustomerActionState,
} from "@/app/operator/customers/actions";

const initialCustomerState: CustomerActionState = { status: "idle" };

type CustomerFormProps = {
  operatorId: string;
  customer?: {
    id: string;
    displayName: string;
    email: string | null;
    phone: string | null;
    countryCode: string | null;
    dateOfBirth: string | null;
    notes: string | null;
  };
};

const ERRORS: Record<string, string> = {
  "invalid-name": "Inserisci un nome di almeno 2 caratteri.",
  "contact-required": "Inserisci almeno un indirizzo email o un numero di telefono.",
  "invalid-email": "L’indirizzo email non è valido.",
  "invalid-phone": "Il telefono deve contenere da 8 a 15 cifre.",
  "invalid-country": "Usa un codice paese di due lettere, per esempio IT.",
  "invalid-birth-date": "La data di nascita non è valida.",
  "notes-too-long": "Le note superano il limite consentito.",
  "email-exists": "Questa email appartiene già a un altro cliente del tuo CRM.",
  "phone-exists": "Questo numero appartiene già a un altro cliente del tuo CRM.",
  "identity-conflict": "Email e telefono rimandano a clienti diversi. Correggi i dati prima di salvare.",
  "not-found": "Il cliente non esiste più o non appartiene a questo workspace.",
  "operator-inactive": "Il workspace deve essere attivo per modificare il CRM.",
  "not-allowed": "Il tuo ruolo non consente questa modifica.",
  "save-failed": "Salvataggio non riuscito. I dati non sono stati modificati.",
};

const fieldClass =
  "min-h-12 w-full rounded-xl border border-[#D8D5E5] bg-white px-3 text-base outline-none transition focus:border-[#6D5DFB] focus:ring-2 focus:ring-[#6D5DFB]/15 sm:text-sm";

function SubmitButton({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#171A2B] px-6 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Verifica e salvataggio…" : editing ? "Salva modifiche" : "Crea cliente"}
    </button>
  );
}

export default function CustomerForm({ operatorId, customer }: CustomerFormProps) {
  const [state, action] = useActionState(saveCustomer, initialCustomerState);
  const error = state.code ? ERRORS[state.code] ?? ERRORS["save-failed"] : null;

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="operator_id" value={operatorId} />
      <input type="hidden" name="customer_id" value={customer?.id ?? ""} />

      {error ? (
        <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium leading-6 text-rose-800">
          {error}
        </div>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold sm:col-span-2">
          Nome o denominazione *
          <input
            name="display_name"
            required
            minLength={2}
            maxLength={160}
            defaultValue={customer?.displayName ?? ""}
            autoComplete="name"
            className={fieldClass}
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Email
          <input name="email" type="email" maxLength={320} defaultValue={customer?.email ?? ""} autoComplete="email" className={fieldClass} />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Telefono
          <input name="phone" type="tel" defaultValue={customer?.phone ?? ""} autoComplete="tel" className={fieldClass} />
        </label>
        <p className="rounded-xl bg-[#EDE9FE] p-3 text-xs leading-5 text-[#4C3FC2] sm:col-span-2">
          È obbligatorio almeno un contatto. Email e telefono sono univoci nel workspace e vengono verificati anche in caso di salvataggi simultanei.
        </p>
        <label className="grid gap-2 text-sm font-semibold">
          Paese
          <input name="country_code" maxLength={2} defaultValue={customer?.countryCode ?? "IT"} className={`${fieldClass} uppercase`} />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Data di nascita
          <input name="date_of_birth" type="date" defaultValue={customer?.dateOfBirth ?? ""} className={fieldClass} />
        </label>
        <label className="grid gap-2 text-sm font-semibold sm:col-span-2">
          Note CRM
          <textarea name="notes" rows={5} maxLength={5000} defaultValue={customer?.notes ?? ""} className={`${fieldClass} py-3`} placeholder="Preferenze, richieste ricorrenti, informazioni operative…" />
        </label>
      </div>

      <div className="flex justify-end">
        <SubmitButton editing={Boolean(customer)} />
      </div>
    </form>
  );
}
