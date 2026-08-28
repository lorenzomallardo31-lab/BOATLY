"use client";

import { type FormEvent, useRef, useState } from "react";

import { DemoValidationSummary } from "@/components/demo/demo-validation-summary";
import type {
  DemoBoat,
  DemoBoatExtra,
  DemoBoatStatus,
  DemoExtraPricingUnit,
} from "@/lib/demo/types";
import { normalizeIdentity, type DemoValidationIssue } from "@/lib/demo/validation";

const inputClass = "min-h-11 w-full rounded-xl border border-[#D8D5E5] bg-white px-3 text-base text-[#171A2B] outline-none transition focus:border-[#6D5DFB] focus:ring-2 focus:ring-[#6D5DFB]/15 sm:text-sm";
const primaryButton = "inline-flex min-h-11 items-center justify-center rounded-xl bg-[#171A2B] px-5 text-sm font-semibold text-white transition hover:bg-[#292D45] disabled:cursor-not-allowed disabled:opacity-40";
const secondaryButton = "inline-flex min-h-11 items-center justify-center rounded-xl border border-[#D8D5E5] bg-white px-5 text-sm font-semibold text-[#171A2B] transition hover:bg-[#F4F2FA]";
const MAX_MANUFACTURE_YEAR = new Date().getFullYear() + 1;

const STATUS_LABELS: Record<DemoBoatStatus, string> = {
  ACTIVE: "Attiva",
  MAINTENANCE: "Manutenzione",
  UNAVAILABLE: "Non disponibile",
};

const PRICING_LABELS: Record<DemoExtraPricingUnit, string> = {
  FIXED: "Prezzo fisso",
  PER_PERSON: "Per persona",
  PER_DAY: "Per giorno",
  PER_UNIT: "Per unità",
};

const EXTRA_CATALOG: DemoBoatExtra[] = [
  { id: "catalog-sup", name: "Stand Up Paddle", description: "SUP con pagaia e leash.", pricingUnit: "PER_UNIT", priceCents: 3500, maxQuantity: 2 },
  { id: "catalog-snorkel", name: "Kit snorkeling", description: "Maschera, boccaglio e pinne.", pricingUnit: "PER_PERSON", priceCents: 1500, maxQuantity: 12 },
  { id: "catalog-water-skis", name: "Sci nautici", description: "Attrezzatura per sci nautico.", pricingUnit: "FIXED", priceCents: 7000, maxQuantity: 1 },
  { id: "catalog-seabob", name: "Seabob", description: "Propulsore subacqueo ricreativo.", pricingUnit: "PER_UNIT", priceCents: 12000, maxQuantity: 2 },
  { id: "catalog-skipper", name: "Skipper", description: "Comandante professionista per l’uscita.", pricingUnit: "PER_DAY", priceCents: 18000, maxQuantity: 1 },
  { id: "catalog-ice-box", name: "Ghiacciaia e bevande", description: "Ghiacciaia preparata con acqua e soft drink.", pricingUnit: "FIXED", priceCents: 4000, maxQuantity: 1 },
  { id: "catalog-transfer", name: "Transfer al porto", description: "Trasferimento locale verso il punto d’imbarco.", pricingUnit: "PER_PERSON", priceCents: 2500, maxQuantity: 12 },
];

function emptyBoat(defaultBase: string): DemoBoat {
  return {
    id: `boat-${Date.now()}`,
    name: "",
    type: "",
    base: defaultBase,
    shortDescription: "",
    description: "",
    manufacturer: "",
    model: "",
    manufactureYear: null,
    lengthMeters: null,
    beamMeters: null,
    capacity: null,
    cabins: null,
    berths: null,
    bathrooms: null,
    engineCount: null,
    engineManufacturer: "",
    engineModel: "",
    fuelType: "",
    horsepower: 0,
    maxSpeedKnots: null,
    licenseRequired: false,
    dailyPriceCents: 0,
    status: "ACTIVE",
    maintenanceNote: "",
    extras: [],
  };
}

function optionalNumber(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5 text-sm font-semibold text-[#34384D]">
      <span>{label}{required ? <span className="ml-1 text-[#C2410C]">*</span> : null}</span>
      {children}
    </label>
  );
}

type DemoBoatFormProps = {
  boat?: DemoBoat;
  defaultBase?: string;
  bookingCount?: number;
  onSave: (boat: DemoBoat) => DemoValidationIssue[];
  onDelete?: () => void;
  onClose: () => void;
};

export function DemoBoatForm({ boat, defaultBase = "", bookingCount = 0, onSave, onDelete, onClose }: DemoBoatFormProps) {
  const [draft, setDraft] = useState<DemoBoat>(() => boat ? structuredClone(boat) : emptyBoat(defaultBase));
  const [licenseChoice, setLicenseChoice] = useState<"" | "true" | "false">(() => boat ? String(boat.licenseRequired) as "true" | "false" : "");
  const [customName, setCustomName] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [issues, setIssues] = useState<DemoValidationIssue[]>([]);
  const submittingRef = useRef(false);

  const valid = draft.name.trim().length >= 2 && draft.horsepower > 0 && licenseChoice !== "";

  function set<K extends keyof DemoBoat>(key: K, value: DemoBoat[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setIssues([]);
  }

  function toggleCatalogExtra(extra: DemoBoatExtra) {
    setDraft((current) => {
      const exists = current.extras.some((item) => item.name === extra.name);
      return {
        ...current,
        extras: exists
          ? current.extras.filter((item) => item.name !== extra.name)
          : [...current.extras, { ...extra, id: `${extra.id}-${Date.now()}` }],
      };
    });
  }

  function updateExtra(id: string, patch: Partial<DemoBoatExtra>) {
    setDraft((current) => ({
      ...current,
      extras: current.extras.map((item) => item.id === id ? { ...item, ...patch } : item),
    }));
  }

  function addCustomExtra() {
    const name = customName.trim();
    if (name.length < 2) return;
    if (draft.extras.some((extra) => normalizeIdentity(extra.name) === normalizeIdentity(name))) {
      setIssues([{ field: "extras", message: `L’optional “${name}” è già presente sulla barca.` }]);
      return;
    }
    const priceCents = Math.round(Number(customPrice || 0) * 100);
    if (!Number.isInteger(priceCents) || priceCents < 0) {
      setIssues([{ field: "extras", message: "Il prezzo dell’optional personalizzato non è valido." }]);
      return;
    }
    setDraft((current) => ({
      ...current,
      extras: [
        ...current.extras,
        {
          id: `extra-custom-${Date.now()}`,
          name,
          description: "Extra personalizzato dell’attività.",
          pricingUnit: "FIXED",
          priceCents,
          maxQuantity: 1,
        },
      ],
    }));
    setCustomName("");
    setCustomPrice("");
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;
    if (!valid) return;
    submittingRef.current = true;
    const validationIssues = onSave({
      ...draft,
      name: draft.name.trim(),
      type: draft.type.trim(),
      base: draft.base.trim(),
      manufacturer: draft.manufacturer.trim(),
      model: draft.model.trim(),
      engineManufacturer: draft.engineManufacturer.trim(),
      engineModel: draft.engineModel.trim(),
      fuelType: draft.fuelType.trim(),
      licenseRequired: licenseChoice === "true",
    });
    setIssues(validationIssues);
    if (validationIssues.length > 0) submittingRef.current = false;
  }

  return (
    <form onSubmit={submit} className="space-y-7">
      <section className="rounded-2xl border border-[#F59E0B]/35 bg-[#FFF7E8] p-4 sm:p-5">
        <p className="text-xs font-bold uppercase tracking-[0.09em] text-[#B45309]">Dati indispensabili</p>
        <p className="mt-1 text-sm text-[#72551E]">Solo questi tre campi sono necessari per aggiungere la barca alla demo.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Field label="Nome della barca" required><input autoFocus required minLength={2} maxLength={160} className={inputClass} value={draft.name} onChange={(event) => set("name", event.target.value)} placeholder="Es. Stella Marina" /></Field>
          <Field label="Potenza totale (CV)" required><input required type="number" min="1" step="1" className={inputClass} value={draft.horsepower || ""} onChange={(event) => set("horsepower", Math.max(0, Number(event.target.value)))} placeholder="Es. 300" /></Field>
          <Field label="Patente nautica" required><select required className={inputClass} value={licenseChoice} onChange={(event) => { setLicenseChoice(event.target.value as "" | "true" | "false"); setIssues([]); }}><option value="">Seleziona…</option><option value="true">Obbligatoria</option><option value="false">Non obbligatoria</option></select></Field>
        </div>
      </section>

      <section>
        <p className="text-xs font-bold uppercase tracking-[0.09em] text-[#6D5DFB]">Presentazione sul marketplace · facoltativa</p>
        <h3 className="mt-1 text-xl font-semibold">Identità e descrizione</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Tipologia"><select className={inputClass} value={draft.type} onChange={(event) => set("type", event.target.value)}><option value="">Da definire</option><option>Gozzo</option><option>Open</option><option>Motoscafo</option><option>Gommone</option><option>Barca a vela</option><option>Catamarano</option><option>Yacht</option></select></Field>
          <Field label="Base di partenza"><input className={inputClass} value={draft.base} onChange={(event) => set("base", event.target.value)} placeholder="Es. Napoli, Mergellina" /></Field>
          <Field label="Cantiere / produttore"><input className={inputClass} value={draft.manufacturer} onChange={(event) => set("manufacturer", event.target.value)} /></Field>
          <Field label="Modello"><input className={inputClass} value={draft.model} onChange={(event) => set("model", event.target.value)} /></Field>
          <Field label="Anno di costruzione"><input type="number" min="1900" max={MAX_MANUFACTURE_YEAR} className={inputClass} value={draft.manufactureYear ?? ""} onChange={(event) => set("manufactureYear", optionalNumber(event.target.value))} /></Field>
          <Field label="Tariffa giornaliera (€)"><input type="number" min="0" step="10" className={inputClass} value={draft.dailyPriceCents ? draft.dailyPriceCents / 100 : ""} onChange={(event) => set("dailyPriceCents", Math.round(Number(event.target.value) * 100))} /></Field>
        </div>
        <div className="mt-4 grid gap-4">
          <Field label="Descrizione breve"><input maxLength={280} className={inputClass} value={draft.shortDescription} onChange={(event) => set("shortDescription", event.target.value)} placeholder="La frase principale visibile nei risultati" /></Field>
          <Field label="Descrizione completa"><textarea rows={4} className={`${inputClass} py-3`} value={draft.description} onChange={(event) => set("description", event.target.value)} placeholder="Spazi, comfort, esperienza proposta e caratteristiche distintive…" /></Field>
        </div>
      </section>

      <section className="border-t border-[#E2DFEB] pt-6">
        <p className="text-xs font-bold uppercase tracking-[0.09em] text-[#6D5DFB]">Scheda tecnica · facoltativa</p>
        <h3 className="mt-1 text-xl font-semibold">Dimensioni, capacità e motore</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Lunghezza (m)"><input type="number" min="0" step="0.1" className={inputClass} value={draft.lengthMeters ?? ""} onChange={(event) => set("lengthMeters", optionalNumber(event.target.value))} /></Field>
          <Field label="Larghezza (m)"><input type="number" min="0" step="0.1" className={inputClass} value={draft.beamMeters ?? ""} onChange={(event) => set("beamMeters", optionalNumber(event.target.value))} /></Field>
          <Field label="Capienza passeggeri"><input type="number" min="1" max="100" className={inputClass} value={draft.capacity ?? ""} onChange={(event) => set("capacity", optionalNumber(event.target.value))} /></Field>
          <Field label="Cabine"><input type="number" min="0" className={inputClass} value={draft.cabins ?? ""} onChange={(event) => set("cabins", optionalNumber(event.target.value))} /></Field>
          <Field label="Posti letto"><input type="number" min="0" className={inputClass} value={draft.berths ?? ""} onChange={(event) => set("berths", optionalNumber(event.target.value))} /></Field>
          <Field label="Bagni"><input type="number" min="0" className={inputClass} value={draft.bathrooms ?? ""} onChange={(event) => set("bathrooms", optionalNumber(event.target.value))} /></Field>
          <Field label="Numero motori"><input type="number" min="0" className={inputClass} value={draft.engineCount ?? ""} onChange={(event) => set("engineCount", optionalNumber(event.target.value))} /></Field>
          <Field label="Produttore motore"><input className={inputClass} value={draft.engineManufacturer} onChange={(event) => set("engineManufacturer", event.target.value)} /></Field>
          <Field label="Modello motore"><input className={inputClass} value={draft.engineModel} onChange={(event) => set("engineModel", event.target.value)} /></Field>
          <Field label="Carburante"><select className={inputClass} value={draft.fuelType} onChange={(event) => set("fuelType", event.target.value)}><option value="">Da definire</option><option>Benzina</option><option>Diesel</option><option>Elettrico</option><option>Ibrido</option></select></Field>
          <Field label="Velocità massima (nodi)"><input type="number" min="0" step="0.1" className={inputClass} value={draft.maxSpeedKnots ?? ""} onChange={(event) => set("maxSpeedKnots", optionalNumber(event.target.value))} /></Field>
          <Field label="Stato operativo"><select className={inputClass} value={draft.status} onChange={(event) => set("status", event.target.value as DemoBoatStatus)}>{Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
        </div>
        <div className="mt-4"><Field label="Nota interna di flotta"><textarea rows={3} className={`${inputClass} py-3`} value={draft.maintenanceNote} onChange={(event) => set("maintenanceNote", event.target.value)} placeholder="Manutenzione, documenti o informazioni per il team…" /></Field></div>
      </section>

      <section className="border-t border-[#E2DFEB] pt-6">
        <p className="text-xs font-bold uppercase tracking-[0.09em] text-[#6D5DFB]">Optional commerciali · facoltativi</p>
        <h3 className="mt-1 text-xl font-semibold">Cosa può aggiungere il cliente?</h3>
        <p className="mt-2 text-sm text-[#676B80]">Seleziona gli extra disponibili per questa barca. Prezzo e modalità restano modificabili.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {EXTRA_CATALOG.map((extra) => {
            const selected = draft.extras.find((item) => item.name === extra.name);
            return (
              <div key={extra.id} className={`rounded-2xl border p-4 ${selected ? "border-[#6D5DFB] bg-[#F1EEFF]" : "border-[#E2DFEB] bg-white"}`}>
                <label className="flex min-h-11 cursor-pointer items-start gap-3">
                  <input type="checkbox" className="mt-1 h-5 w-5 accent-[#6D5DFB]" checked={Boolean(selected)} onChange={() => toggleCatalogExtra(extra)} />
                  <span><strong className="block text-sm">{extra.name}</strong><span className="mt-1 block text-xs leading-5 text-[#676B80]">{extra.description}</span></span>
                </label>
                {selected ? <div className="mt-3 grid gap-2 sm:grid-cols-2"><input aria-label={`Prezzo ${extra.name}`} type="number" min="0" step="1" className={inputClass} value={selected.priceCents / 100} onChange={(event) => updateExtra(selected.id, { priceCents: Math.round(Number(event.target.value) * 100) })} /><select aria-label={`Unità prezzo ${extra.name}`} className={inputClass} value={selected.pricingUnit} onChange={(event) => updateExtra(selected.id, { pricingUnit: event.target.value as DemoExtraPricingUnit })}>{Object.entries(PRICING_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div> : null}
              </div>
            );
          })}
        </div>

        <div className="mt-4 rounded-2xl border border-dashed border-[#B8B2D7] bg-[#F8F7FC] p-4">
          <p className="text-sm font-semibold">Aggiungi un extra personalizzato</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_160px_auto]">
            <input className={inputClass} value={customName} onChange={(event) => setCustomName(event.target.value)} placeholder="Es. Aperitivo a bordo" aria-label="Nome extra personalizzato" />
            <input type="number" min="0" className={inputClass} value={customPrice} onChange={(event) => setCustomPrice(event.target.value)} placeholder="Prezzo €" aria-label="Prezzo extra personalizzato" />
            <button type="button" onClick={addCustomExtra} disabled={customName.trim().length < 2} className={secondaryButton}>Aggiungi</button>
          </div>
          {draft.extras.filter((item) => item.id.startsWith("extra-custom-")).map((extra) => <div key={extra.id} className="mt-3 flex items-center justify-between rounded-xl bg-white px-3 py-2 text-sm"><span><b>{extra.name}</b> · € {(extra.priceCents / 100).toFixed(0)}</span><button type="button" onClick={() => setDraft((current) => ({ ...current, extras: current.extras.filter((item) => item.id !== extra.id) }))} className="min-h-11 px-3 font-semibold text-rose-700">Rimuovi</button></div>)}
        </div>
      </section>

      <DemoValidationSummary issues={issues} />

      <div className="grid gap-2 border-t border-[#E2DFEB] pt-6 sm:grid-cols-2">
        <button type="button" className={secondaryButton} onClick={onClose}>Annulla</button>
        <button className={primaryButton} disabled={!valid}>{boat ? "Salva tutte le modifiche" : "Aggiungi alla flotta"}</button>
      </div>

      {boat && onDelete ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4"><p className="text-sm font-semibold text-rose-900">Zona rimozione</p><p className="mt-1 text-xs leading-5 text-rose-700">La demo eliminerà questa barca e {bookingCount ? `${bookingCount} prenotazioni sintetiche collegate` : "nessuna prenotazione"} soltanto da questo dispositivo.</p><button type="button" className="mt-3 min-h-11 rounded-xl px-3 text-sm font-semibold text-rose-700 hover:bg-rose-100" onClick={onDelete}>Rimuovi definitivamente la barca</button></div> : null}
    </form>
  );
}
