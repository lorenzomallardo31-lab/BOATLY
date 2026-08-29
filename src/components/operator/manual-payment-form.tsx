"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  recordManualPayment,
  type ManualPaymentActionState,
} from "@/app/operator/finance/actions";

const initialManualPaymentState: ManualPaymentActionState = { status: "idle" };

type ManualPaymentFormProps = {
  operatorId: string;
  bookingId: string;
  currency: string;
  defaultOccurredAt: string;
  outstandingCents: number;
  refundableCommercialCents: number;
  securityHeldCents: number;
};

const ERROR_MESSAGES: Record<string, string> = {
  "missing-fields": "Mancano i riferimenti della prenotazione.",
  classification: "Seleziona tipo, causale e metodo del movimento.",
  "invalid-amount": "Inserisci un importo positivo con al massimo due decimali.",
  "invalid-date": "Data o ora non valida: non può essere nel futuro.",
  "confirmation-required": "Conferma che il movimento è realmente avvenuto fuori da Boatly.",
  "reference-too-long": "Il riferimento supera 160 caratteri.",
  "note-too-long": "La nota supera 1.000 caratteri.",
  "not-allowed": "Il tuo ruolo non consente di registrare questo movimento.",
  "operator-inactive": "Il workspace deve essere attivo.",
  "booking-not-found": "La prenotazione non esiste più in questo workspace.",
  "manual-only": "I pagamenti marketplace vengono riconciliati da Stripe, non da questo modulo.",
  "booking-status": "Lo stato attuale della prenotazione non consente un nuovo incasso.",
  "exceeds-total": "L’incasso supererebbe il totale della prenotazione.",
  "exceeds-paid": "Il rimborso supera quanto incassato e non ancora restituito per questa categoria.",
  "save-failed": "Registrazione non riuscita. Nessun movimento è stato aggiunto.",
};

const fieldClass =
  "min-h-12 w-full rounded-xl border border-[#D8D5E5] bg-white px-3 text-base outline-none transition focus:border-[#6D5DFB] focus:ring-2 focus:ring-[#6D5DFB]/15 sm:text-sm";

function money(cents: number, currency: string) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency }).format(cents / 100);
}

function SubmitButton({ recordType }: { recordType: "PAYMENT" | "REFUND" }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#171A2B] px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending
        ? "Verifica e registrazione…"
        : recordType === "PAYMENT"
          ? "Registra incasso"
          : "Registra rimborso"}
    </button>
  );
}

export default function ManualPaymentForm({
  operatorId,
  bookingId,
  currency,
  defaultOccurredAt,
  outstandingCents,
  refundableCommercialCents,
  securityHeldCents,
}: ManualPaymentFormProps) {
  const [state, action] = useActionState(recordManualPayment, initialManualPaymentState);
  const [recordType, setRecordType] = useState<"PAYMENT" | "REFUND">("PAYMENT");
  const [purpose, setPurpose] = useState("DEPOSIT");
  const error = state.code ? ERROR_MESSAGES[state.code] ?? ERROR_MESSAGES["save-failed"] : null;

  function selectRecordType(next: "PAYMENT" | "REFUND") {
    setRecordType(next);
    setPurpose(next === "PAYMENT" ? "DEPOSIT" : "OTHER");
  }

  return (
    <form action={action} className="mt-5 space-y-5">
      <input type="hidden" name="operator_id" value={operatorId} />
      <input type="hidden" name="booking_id" value={bookingId} />
      <input type="hidden" name="record_type" value={recordType} />

      <div className="grid grid-cols-2 rounded-2xl bg-[#F4F2FA] p-1">
        <button
          type="button"
          onClick={() => selectRecordType("PAYMENT")}
          className={`min-h-11 rounded-xl px-3 text-sm font-semibold ${recordType === "PAYMENT" ? "bg-white text-emerald-700 shadow-sm" : "text-[#676B80]"}`}
        >
          Incasso
        </button>
        <button
          type="button"
          onClick={() => selectRecordType("REFUND")}
          className={`min-h-11 rounded-xl px-3 text-sm font-semibold ${recordType === "REFUND" ? "bg-white text-rose-700 shadow-sm" : "text-[#676B80]"}`}
        >
          Rimborso
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <span className="rounded-xl bg-white p-2 text-center"><strong className="block">{money(outstandingCents, currency)}</strong> da incassare</span>
        <span className="rounded-xl bg-white p-2 text-center"><strong className="block">{money(refundableCommercialCents, currency)}</strong> rimborsabile</span>
        <span className="rounded-xl bg-white p-2 text-center"><strong className="block">{money(securityHeldCents, currency)}</strong> cauzione</span>
      </div>

      {error ? <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-800">{error}</div> : null}
      {state.status === "success" ? <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800">Movimento registrato e saldi aggiornati.</div> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold">
          Importo ({currency}) *
          <input name="amount" inputMode="decimal" placeholder="0,00" required className={fieldClass} />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Causale *
          <select name="purpose" value={purpose} onChange={(event) => setPurpose(event.target.value)} className={fieldClass}>
            <option value="DEPOSIT">Acconto</option>
            <option value="BALANCE">Saldo</option>
            <option value="FULL_PAYMENT">Pagamento completo</option>
            <option value="SECURITY_DEPOSIT">Cauzione</option>
            <option value="OTHER">Altro</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Metodo *
          <select name="payment_method" defaultValue="CASH" className={fieldClass}>
            <option value="CASH">Contanti</option>
            <option value="CARD_EXTERNAL">POS esterno</option>
            <option value="BANK_TRANSFER">Bonifico</option>
            <option value="OTHER">Altro</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Data e ora *
          <input name="occurred_at_local" type="datetime-local" required defaultValue={defaultOccurredAt} className={fieldClass} />
        </label>
        <label className="grid gap-2 text-sm font-semibold sm:col-span-2">
          Riferimento esterno
          <input name="external_reference" maxLength={160} className={fieldClass} placeholder="Es. CRO bonifico o ricevuta POS" />
        </label>
        <label className="grid gap-2 text-sm font-semibold sm:col-span-2">
          Nota
          <textarea name="note" rows={3} maxLength={1000} className={`${fieldClass} py-3`} placeholder="Informazione operativa facoltativa" />
        </label>
      </div>

      <label className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-950">
        <input name="confirmed" value="yes" type="checkbox" required className="mt-1 h-4 w-4" />
        Confermo che questo movimento è realmente avvenuto fuori da Boatly. Un errore non si cancella: viene stornato e resta nello storico.
      </label>

      <div className="flex justify-end">
        <SubmitButton recordType={recordType} />
      </div>
    </form>
  );
}
