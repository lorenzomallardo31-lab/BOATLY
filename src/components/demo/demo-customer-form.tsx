"use client";

import { type FormEvent, useRef, useState } from "react";

import { DemoValidationSummary } from "@/components/demo/demo-validation-summary";
import type { DemoCustomer } from "@/lib/demo/types";
import type { DemoValidationIssue } from "@/lib/demo/validation";

const inputClass = "min-h-11 w-full rounded-xl border border-[#D8D5E5] bg-white px-3 text-base text-[#171A2B] outline-none transition focus:border-[#6D5DFB] focus:ring-2 focus:ring-[#6D5DFB]/15 sm:text-sm";

function emptyCustomer(): DemoCustomer {
  return {
    id: `customer-${Date.now()}`,
    name: "",
    email: "",
    phone: "",
    segment: "NUOVO",
    notes: "",
  };
}

type DemoCustomerFormProps = {
  customer?: DemoCustomer;
  bookingCount?: number;
  onSave: (customer: DemoCustomer) => DemoValidationIssue[];
  onDelete?: () => void;
  onClose: () => void;
};

export function DemoCustomerForm({ customer, bookingCount = 0, onSave, onDelete, onClose }: DemoCustomerFormProps) {
  const [draft, setDraft] = useState<DemoCustomer>(() => customer ? { ...customer } : emptyCustomer());
  const [issues, setIssues] = useState<DemoValidationIssue[]>([]);
  const submittingRef = useRef(false);

  function update<K extends keyof DemoCustomer>(key: K, value: DemoCustomer[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setIssues([]);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;
    if (draft.name.trim().length < 2) return;
    submittingRef.current = true;
    const validationIssues = onSave({ ...draft, name: draft.name.trim(), email: draft.email.trim(), phone: draft.phone.trim() });
    setIssues(validationIssues);
    if (validationIssues.length > 0) submittingRef.current = false;
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-semibold">Nome cliente *<input autoFocus required minLength={2} className={inputClass} value={draft.name} onChange={(event) => update("name", event.target.value)} /></label>
        <label className="grid gap-1.5 text-sm font-semibold">Segmento<select className={inputClass} value={draft.segment} onChange={(event) => update("segment", event.target.value as DemoCustomer["segment"])}><option value="NUOVO">Nuovo</option><option value="DIRETTO">Diretto</option><option value="RICORRENTE">Ricorrente</option><option value="ALTO_VALORE">Alto valore</option></select></label>
        <label className="grid gap-1.5 text-sm font-semibold">Email<input type="email" className={inputClass} value={draft.email} onChange={(event) => update("email", event.target.value)} /></label>
        <label className="grid gap-1.5 text-sm font-semibold">Telefono<input type="tel" className={inputClass} value={draft.phone} onChange={(event) => update("phone", event.target.value)} /></label>
      </div>
      <label className="grid gap-1.5 text-sm font-semibold">Note CRM<textarea rows={5} className={`${inputClass} py-3`} value={draft.notes} onChange={(event) => update("notes", event.target.value)} placeholder="Preferenze, provenienza e promemoria interni…" /></label>
      <DemoValidationSummary issues={issues} />
      <div className="grid gap-2 sm:grid-cols-2"><button type="button" onClick={onClose} className="min-h-11 rounded-xl border border-[#D8D5E5] px-4 text-sm font-semibold">Annulla</button><button className="min-h-11 rounded-xl bg-[#171A2B] px-4 text-sm font-semibold text-white disabled:opacity-40" disabled={draft.name.trim().length < 2}>{customer ? "Salva tutte le modifiche" : "Aggiungi cliente"}</button></div>
      {customer && onDelete ? <div className="border-t border-[#E2DFEB] pt-4"><p className="text-xs text-[#676B80]">La rimozione eliminerà anche {bookingCount} prenotazioni sintetiche associate.</p><button type="button" onClick={onDelete} className="mt-2 min-h-11 rounded-xl px-3 text-sm font-semibold text-rose-700 hover:bg-rose-50">Rimuovi cliente</button></div> : null}
    </form>
  );
}
