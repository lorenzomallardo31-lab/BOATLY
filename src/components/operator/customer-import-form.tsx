"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  importCustomers,
  type CustomerImportState,
} from "@/app/operator/customers/import/actions";

const initialCustomerImportState: CustomerImportState = { status: "idle" };

const FILE_ERRORS: Record<string, string> = {
  "missing-file": "Seleziona un file CSV.",
  "file-too-large": "Il file supera 1 MB.",
  "empty-file": "Il CSV non contiene righe da importare.",
  "unclosed-quote": "Il CSV contiene una virgoletta non chiusa.",
  "missing-name-column": "Manca la colonna nome.",
  "missing-contact-column": "Serve almeno una colonna email o telefono.",
  "too-many-rows": "Puoi importare al massimo 500 clienti per file.",
  "invalid-file": "Il file non è un CSV valido.",
  "import-failed": "Importazione non riuscita. Riprova con il modello fornito.",
};

const ROW_ERRORS: Record<string, string> = {
  invalid_customer_name: "nome non valido",
  customer_contact_required: "manca email o telefono",
  invalid_customer_email: "email non valida",
  invalid_customer_phone: "telefono non valido",
  invalid_customer_country: "paese non valido",
  invalid_customer_birth_date: "data di nascita non valida",
  customer_notes_too_long: "note troppo lunghe",
  customer_email_already_exists: "email già presente",
  customer_phone_already_exists: "telefono già presente",
  customer_identity_conflict: "email e telefono appartengono a clienti diversi",
  import_row_failed: "riga non importabile",
};

function Submit() {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className="min-h-12 rounded-xl bg-[#171A2B] px-5 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Verifica e importa…" : "Importa clienti"}</button>;
}

export default function CustomerImportForm({ operatorId }: { operatorId: string }) {
  const [state, action] = useActionState(importCustomers, initialCustomerImportState);
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="operator_id" value={operatorId} />
      {state.status === "error" ? <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{FILE_ERRORS[state.code ?? ""] ?? FILE_ERRORS["invalid-file"]}</div> : null}
      {state.status === "complete" ? (
        <div className={`rounded-2xl border p-4 ${state.issues?.length ? "border-amber-200 bg-amber-50 text-amber-900" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`}>
          <p className="text-sm font-semibold">{state.created ?? 0} clienti importati · {state.issues?.length ?? 0} righe da correggere</p>
          {state.issues?.length ? <ul className="mt-3 max-h-56 space-y-1 overflow-auto text-xs">{state.issues.map((issue) => <li key={`${issue.row}-${issue.code}`}>Riga {issue.row}: {ROW_ERRORS[issue.code] ?? "errore di validazione"}</li>)}</ul> : null}
        </div>
      ) : null}
      <label className="grid gap-2 text-sm font-semibold">File CSV *<input name="csv_file" type="file" accept=".csv,text/csv" required className="min-h-14 rounded-xl border border-dashed border-[#B8B2D7] bg-[#F8F7FC] p-3 text-sm" /></label>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs leading-5 text-[#676B80]">Massimo 500 righe e 1 MB. I duplicati non vengono sovrascritti.</p><Submit /></div>
    </form>
  );
}
