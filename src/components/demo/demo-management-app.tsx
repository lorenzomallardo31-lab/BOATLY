"use client";

import Link from "next/link";
import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";

import { DemoBoatForm } from "@/components/demo/demo-boat-form";
import { DemoCalendarView } from "@/components/demo/demo-calendar-view";
import { DemoCustomerForm } from "@/components/demo/demo-customer-form";
import { DemoWorkspaceSetup } from "@/components/demo/demo-workspace-setup";
import { DEMO_STORAGE_KEY, freshDemoState } from "@/lib/demo/seed";
import type {
  DemoActivity,
  DemoBoat,
  DemoBoatStatus,
  DemoBooking,
  DemoBookingStatus,
  DemoCustomer,
  DemoLocation,
  DemoState,
  DemoView,
} from "@/lib/demo/types";

const VIEWS: Array<{ id: DemoView; label: string; short: string; note: string }> = [
  { id: "dashboard", label: "Dashboard", short: "Home", note: "Controllo giornaliero" },
  { id: "calendario", label: "Calendario", short: "Agenda", note: "Disponibilità e operazioni" },
  { id: "prenotazioni", label: "Prenotazioni", short: "Booking", note: "Agenda e operazioni" },
  { id: "flotta", label: "Flotta", short: "Flotta", note: "Barche e disponibilità" },
  { id: "clienti", label: "Clienti", short: "Clienti", note: "CRM e storico" },
  { id: "finanza", label: "Finanza", short: "Finanza", note: "Ricavi e commissioni" },
];

const BOOKING_LABELS: Record<DemoBookingStatus, string> = {
  REQUESTED: "Richiesta",
  CONFIRMED: "Confermata",
  PREPARING: "Da preparare",
  COMPLETED: "Completata",
  CANCELLED: "Cancellata",
};

const BOAT_LABELS: Record<DemoBoatStatus, string> = {
  ACTIVE: "Attiva",
  MAINTENANCE: "Manutenzione",
  UNAVAILABLE: "Non disponibile",
};

const SEGMENT_LABELS: Record<DemoCustomer["segment"], string> = {
  NUOVO: "Nuovo",
  DIRETTO: "Diretto",
  RICORRENTE: "Ricorrente",
  ALTO_VALORE: "Alto valore",
};

function money(cents: number) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function dateTime(value: string) {
  return new Intl.DateTimeFormat("it-IT", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function MetricCard({ label, value, note, tone = "teal" }: { label: string; value: string; note: string; tone?: "teal" | "amber" | "slate" }) {
  const noteColor = tone === "amber" ? "text-amber-700" : tone === "slate" ? "text-[#676B80]" : "text-[#5B4FD6]";
  return (
    <article className="rounded-2xl border border-[#DEE5E8] bg-white p-4 shadow-sm sm:p-5">
      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#64748B]">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight sm:mt-3">{value}</p>
      <p className={classNames("mt-1 text-xs", noteColor)}>{note}</p>
    </article>
  );
}

function StatusBadge({ kind, children }: { kind: DemoBookingStatus | DemoBoatStatus | "MATCHED"; children: ReactNode }) {
  const positive = ["CONFIRMED", "COMPLETED", "ACTIVE", "MATCHED"].includes(kind);
  const negative = ["CANCELLED", "UNAVAILABLE"].includes(kind);
  return (
    <span className={classNames(
      "inline-flex w-fit rounded-full px-2.5 py-1 text-[11px] font-bold",
      positive && "bg-[#EDE9FE] text-[#4C3FC2]",
      negative && "bg-rose-50 text-rose-700",
      !positive && !negative && "bg-amber-50 text-amber-800",
    )}>
      {children}
    </span>
  );
}

function Modal({ title, eyebrow, onClose, children, wide = false }: { title: string; eyebrow: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#111322]/65 p-0 backdrop-blur-[2px] sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <button className="absolute inset-0 cursor-default" onClick={onClose} aria-label="Chiudi finestra" />
      <section className={classNames(
        "relative z-10 max-h-[92dvh] w-full overflow-y-auto rounded-t-[1.75rem] bg-white p-5 shadow-2xl sm:rounded-[1.75rem] sm:p-7",
        wide ? "sm:max-w-5xl" : "sm:max-w-xl",
      )}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#6D5DFB]">{eyebrow}</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">{title}</h2>
          </div>
          <button onClick={onClose} className="grid min-h-11 min-w-11 place-items-center rounded-full bg-[#F4F2FA] text-xl" aria-label="Chiudi">×</button>
        </div>
        <div className="mt-6">{children}</div>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="grid gap-1.5 text-sm font-semibold text-[#334155]">{label}{children}</label>;
}

const inputClass = "min-h-11 w-full rounded-xl border border-[#D8D5E5] bg-white px-3 text-base text-[#171A2B] outline-none transition focus:border-[#6D5DFB] focus:ring-2 focus:ring-[#6D5DFB]/15 sm:text-sm";
const buttonPrimary = "inline-flex min-h-11 items-center justify-center rounded-xl bg-[#171A2B] px-4 text-sm font-semibold text-white transition hover:bg-[#292D45] disabled:cursor-not-allowed disabled:opacity-45";
const buttonSecondary = "inline-flex min-h-11 items-center justify-center rounded-xl border border-[#D8D5E5] bg-white px-4 text-sm font-semibold text-[#171A2B] transition hover:bg-[#F4F2FA]";

const subscribeToBrowser = () => () => undefined;

function initialBrowserState() {
  if (typeof window === "undefined") return freshDemoState();
  try {
    const saved = window.localStorage.getItem(DEMO_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as DemoState;
      if (parsed.version === 4) return parsed;
    }
  } catch {
    window.localStorage.removeItem(DEMO_STORAGE_KEY);
  }
  return freshDemoState();
}

function BookingForm({ state, initialDate = "2026-09-02", initialBoatId, onSave, onClose }: { state: DemoState; initialDate?: string; initialBoatId?: string; onSave: (booking: DemoBooking) => void; onClose: () => void }) {
  const activeBoats = state.boats.filter((boat) => boat.status === "ACTIVE");
  const [boatId, setBoatId] = useState(initialBoatId && state.boats.some((boat) => boat.id === initialBoatId) ? initialBoatId : activeBoats[0]?.id ?? state.boats[0]?.id ?? "");
  const [customerId, setCustomerId] = useState(state.customers[0]?.id ?? "");
  const [date, setDate] = useState(initialDate);
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("17:00");
  const [source, setSource] = useState<DemoBooking["source"]>("DIRECT");
  const [passengers, setPassengers] = useState("4");
  const selectedBoat = state.boats.find((boat) => boat.id === boatId);
  const [amount, setAmount] = useState(String((selectedBoat?.dailyPriceCents ?? 50000) / 100));
  const [notes, setNotes] = useState("");

  function changeBoat(value: string) {
    setBoatId(value);
    const boat = state.boats.find((item) => item.id === value);
    if (boat) setAmount(String(boat.dailyPriceCents / 100));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const customer = state.customers.find((item) => item.id === customerId);
    const boat = state.boats.find((item) => item.id === boatId);
    if (!customer || !boat) return;
    const suffix = Math.random().toString(16).slice(2, 6).toUpperCase();
    onSave({
      id: `booking-${Date.now()}`,
      reference: `${source === "DIRECT" ? "MAN" : "BTY"}-${date.slice(5).replace("-", "")}-${suffix}`,
      boatId,
      customerId,
      startAt: `${date}T${start}`,
      endAt: `${date}T${end}`,
      source,
      status: source === "DIRECT" ? "CONFIRMED" : "REQUESTED",
      amountCents: Math.max(0, Math.round(Number(amount) * 100)),
      passengers: Math.max(1, Number(passengers)),
      notes,
      createdAt: new Date().toISOString(),
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Imbarcazione"><select required className={inputClass} value={boatId} onChange={(event) => changeBoat(event.target.value)}>{state.boats.map((boat) => <option key={boat.id} value={boat.id}>{boat.name}{boat.status !== "ACTIVE" ? ` · ${BOAT_LABELS[boat.status]}` : ""}</option>)}</select></Field>
        <Field label="Cliente"><select required className={inputClass} value={customerId} onChange={(event) => setCustomerId(event.target.value)}>{state.customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></Field>
        <Field label="Data"><input required type="date" className={inputClass} value={date} onChange={(event) => setDate(event.target.value)} /></Field>
        <Field label="Origine"><select className={inputClass} value={source} onChange={(event) => setSource(event.target.value as DemoBooking["source"])}><option value="DIRECT">Prenotazione diretta</option><option value="MARKETPLACE">Marketplace</option></select></Field>
        <Field label="Ora di partenza"><input required type="time" className={inputClass} value={start} onChange={(event) => setStart(event.target.value)} /></Field>
        <Field label="Ora di rientro"><input required type="time" className={inputClass} value={end} onChange={(event) => setEnd(event.target.value)} /></Field>
        <Field label="Passeggeri"><input required min="1" max={selectedBoat?.capacity ?? 20} type="number" className={inputClass} value={passengers} onChange={(event) => setPassengers(event.target.value)} /></Field>
        <Field label="Valore (€)"><input required min="0" step="10" type="number" className={inputClass} value={amount} onChange={(event) => setAmount(event.target.value)} /></Field>
      </div>
      <Field label="Note operative"><textarea className={`${inputClass} min-h-24 py-3`} placeholder="Itinerario, skipper, richieste del cliente…" value={notes} onChange={(event) => setNotes(event.target.value)} /></Field>
      {selectedBoat && selectedBoat.status !== "ACTIVE" ? <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">La barca selezionata risulta {BOAT_LABELS[selectedBoat.status].toLowerCase()}. Il workspace locale permette comunque di salvare per mostrare il controllo operativo.</p> : null}
      {state.boats.length === 0 ? <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Prima di creare una prenotazione devi aggiungere almeno una barca alla flotta.</p> : null}
      <div className="grid gap-2 pt-2 sm:grid-cols-2"><button type="button" onClick={onClose} className={buttonSecondary}>Annulla</button><button disabled={!boatId || !customerId} className={buttonPrimary}>Salva prenotazione</button></div>
    </form>
  );
}

function BookingDetail({ booking, state, onSave, onDelete, onClose }: { booking: DemoBooking; state: DemoState; onSave: (booking: DemoBooking) => void; onDelete: () => void; onClose: () => void }) {
  const [boatId, setBoatId] = useState(booking.boatId);
  const [customerId, setCustomerId] = useState(booking.customerId);
  const [date, setDate] = useState(booking.startAt.slice(0, 10));
  const [start, setStart] = useState(booking.startAt.slice(11, 16));
  const [end, setEnd] = useState(booking.endAt.slice(11, 16));
  const [source, setSource] = useState(booking.source);
  const [status, setStatus] = useState(booking.status);
  const [passengers, setPassengers] = useState(String(booking.passengers));
  const [amount, setAmount] = useState(String(booking.amountCents / 100));
  const [notes, setNotes] = useState(booking.notes);
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-[#F4F2FA] p-4 text-sm"><p className="text-xs text-[#676B80]">Riferimento</p><p className="mt-1 font-semibold">{booking.reference}</p></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Imbarcazione"><select className={inputClass} value={boatId} onChange={(event) => setBoatId(event.target.value)}>{state.boats.map((boat) => <option key={boat.id} value={boat.id}>{boat.name}</option>)}</select></Field>
        <Field label="Cliente"><select className={inputClass} value={customerId} onChange={(event) => setCustomerId(event.target.value)}>{state.customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></Field>
        <Field label="Data"><input type="date" className={inputClass} value={date} onChange={(event) => setDate(event.target.value)} /></Field>
        <Field label="Origine"><select className={inputClass} value={source} onChange={(event) => setSource(event.target.value as DemoBooking["source"])}><option value="DIRECT">Prenotazione diretta</option><option value="MARKETPLACE">Marketplace</option></select></Field>
        <Field label="Partenza"><input type="time" className={inputClass} value={start} onChange={(event) => setStart(event.target.value)} /></Field>
        <Field label="Rientro"><input type="time" className={inputClass} value={end} onChange={(event) => setEnd(event.target.value)} /></Field>
        <Field label="Passeggeri"><input type="number" min="1" className={inputClass} value={passengers} onChange={(event) => setPassengers(event.target.value)} /></Field>
        <Field label="Valore (€)"><input type="number" min="0" step="10" className={inputClass} value={amount} onChange={(event) => setAmount(event.target.value)} /></Field>
        <div className="sm:col-span-2"><Field label="Stato operativo"><select className={inputClass} value={status} onChange={(event) => setStatus(event.target.value as DemoBookingStatus)}>{Object.entries(BOOKING_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field></div>
      </div>
      <Field label="Note interne"><textarea className={`${inputClass} min-h-28 py-3`} value={notes} onChange={(event) => setNotes(event.target.value)} /></Field>
      <p className="text-xs leading-5 text-[#676B80]">Il cambio di stato aggiorna subito dashboard, calendario, disponibilità e riepilogo finanziario, senza inviare email o movimenti reali.</p>
      <div className="grid gap-2 sm:grid-cols-2"><button type="button" onClick={onClose} className={buttonSecondary}>Chiudi</button><button type="button" disabled={!boatId || !customerId || !date || !start || !end} onClick={() => onSave({ ...booking, boatId, customerId, startAt: `${date}T${start}`, endAt: `${date}T${end}`, source, status, passengers: Math.max(1, Number(passengers)), amountCents: Math.max(0, Math.round(Number(amount) * 100)), notes })} className={buttonPrimary}>Salva tutte le modifiche</button></div>
      <div className="border-t border-[#E2DFEB] pt-4"><button type="button" onClick={onDelete} className="min-h-11 rounded-xl px-3 text-sm font-semibold text-rose-700 hover:bg-rose-50">Rimuovi prenotazione</button></div>
    </div>
  );
}

function DashboardView({ state, onNavigate, onNewBooking, onOpenBooking }: { state: DemoState; onNavigate: (view: DemoView) => void; onNewBooking: () => void; onOpenBooking: (id: string) => void }) {
  const active = state.bookings.filter((booking) => !["CANCELLED", "COMPLETED"].includes(booking.status));
  const confirmedValue = state.bookings.filter((booking) => ["CONFIRMED", "PREPARING", "COMPLETED"].includes(booking.status)).reduce((sum, booking) => sum + booking.amountCents, 0);
  const attention = state.bookings.filter((booking) => ["REQUESTED", "PREPARING"].includes(booking.status));
  const sorted = [...active].sort((a, b) => a.startAt.localeCompare(b.startAt));
  return (
    <div className="space-y-5 sm:space-y-6">
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricCard label="Valore gestito" value={money(confirmedValue)} note="scenario locale" />
        <MetricCard label="Booking attivi" value={String(active.length)} note={`${state.bookings.filter((b) => b.status === "CONFIRMED").length} confermati`} />
        <MetricCard label="Flotta operativa" value={`${state.boats.filter((b) => b.status === "ACTIVE").length}/${state.boats.length}`} note="barche disponibili" />
        <MetricCard label="Da gestire" value={String(attention.length)} note="richieste e preparazione" tone={attention.length ? "amber" : "teal"} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.5fr_0.75fr]">
        <article className="rounded-3xl border border-[#DEE5E8] bg-white p-4 shadow-sm sm:p-6">
          <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.08em] text-[#6D5DFB]">Agenda operativa</p><h2 className="mt-1 text-xl font-semibold">Prossime partenze</h2></div><button className={buttonPrimary} onClick={onNewBooking}>+ <span className="hidden sm:inline">Nuova prenotazione</span><span className="sm:hidden">Nuova</span></button></div>
          <div className="mt-5 space-y-3">
            {sorted.slice(0, 4).map((booking) => {
              const boat = state.boats.find((item) => item.id === booking.boatId);
              const customer = state.customers.find((item) => item.id === booking.customerId);
              return <button key={booking.id} onClick={() => onOpenBooking(booking.id)} className="grid w-full gap-3 rounded-2xl border border-[#E2DFEB] p-4 text-left transition hover:border-[#6D5DFB] sm:grid-cols-[1.25fr_0.8fr_auto] sm:items-center"><div><p className="font-semibold">{boat?.name}</p><p className="mt-1 text-xs text-[#676B80]">{booking.reference} · {customer?.name}</p></div><div><p className="text-sm font-medium">{dateTime(booking.startAt)}</p><p className="mt-1 text-xs text-[#676B80]">{booking.source === "DIRECT" ? "Diretta" : "Marketplace"}</p></div><StatusBadge kind={booking.status}>{BOOKING_LABELS[booking.status]}</StatusBadge></button>;
            })}
          </div>
          <button className="mt-4 min-h-11 text-sm font-semibold text-[#5B4FD6]" onClick={() => onNavigate("prenotazioni")}>Apri tutte le prenotazioni →</button>
        </article>

        <div className="space-y-5">
          <article className="rounded-3xl bg-[#171A2B] p-5 text-white sm:p-6"><p className="text-xs font-bold uppercase tracking-[0.08em] text-[#FDBA74]">Azioni rapide</p><h2 className="mt-2 text-xl font-semibold">Gestisci la giornata</h2><div className="mt-5 grid gap-2"><button onClick={onNewBooking} className="min-h-11 rounded-xl bg-[#6D5DFB] px-4 text-left text-sm font-semibold">Aggiungi prenotazione</button><button onClick={() => onNavigate("calendario")} className="min-h-11 rounded-xl border border-white/15 px-4 text-left text-sm font-semibold">Apri calendario operativo</button><button onClick={() => onNavigate("flotta")} className="min-h-11 rounded-xl border border-white/15 px-4 text-left text-sm font-semibold">Gestisci flotta</button><button onClick={() => onNavigate("finanza")} className="min-h-11 rounded-xl border border-white/15 px-4 text-left text-sm font-semibold">Apri riepilogo ricavi</button></div></article>
          <article className="rounded-3xl border border-[#E2DFEB] bg-white p-5 sm:p-6"><p className="text-xs font-bold uppercase tracking-[0.08em] text-[#676B80]">Attività recente</p><div className="mt-4 space-y-4">{state.activity.slice(0, 3).map((item) => <div key={item.id} className="border-l-2 border-[#6D5DFB] pl-3"><p className="text-sm font-semibold">{item.label}</p><p className="mt-1 text-xs leading-5 text-[#676B80]">{item.detail}</p></div>)}</div></article>
        </div>
      </section>
    </div>
  );
}

function BookingsView({ state, onNewBooking, onOpenBooking }: { state: DemoState; onNewBooking: () => void; onOpenBooking: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"ALL" | DemoBookingStatus>("ALL");
  const bookings = useMemo(() => [...state.bookings].sort((a, b) => b.startAt.localeCompare(a.startAt)).filter((booking) => {
    const boat = state.boats.find((item) => item.id === booking.boatId);
    const customer = state.customers.find((item) => item.id === booking.customerId);
    const matchesFilter = filter === "ALL" || booking.status === filter;
    const haystack = `${booking.reference} ${boat?.name} ${customer?.name}`.toLowerCase();
    return matchesFilter && haystack.includes(query.toLowerCase());
  }), [filter, query, state]);
  return (
    <section className="rounded-3xl border border-[#DEE5E8] bg-white p-4 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.08em] text-[#6D5DFB]">Booking control</p><h2 className="mt-1 text-xl font-semibold">Prenotazioni marketplace e dirette</h2></div><button className={buttonPrimary} onClick={onNewBooking}>+ Nuova prenotazione</button></div>
      <div className="mt-5 grid gap-3 md:grid-cols-[1fr_220px]"><input className={inputClass} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cerca cliente, barca o codice…" aria-label="Cerca prenotazione" /><select className={inputClass} value={filter} onChange={(event) => setFilter(event.target.value as "ALL" | DemoBookingStatus)} aria-label="Filtra stato"><option value="ALL">Tutti gli stati</option>{Object.entries(BOOKING_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>

      <div className="mt-5 hidden overflow-x-auto md:block"><table className="w-full min-w-[760px] text-left text-sm"><thead><tr className="border-b border-[#DEE5E8] text-xs uppercase tracking-wide text-[#64748B]"><th className="pb-3 font-semibold">Prenotazione</th><th className="pb-3 font-semibold">Cliente</th><th className="pb-3 font-semibold">Partenza</th><th className="pb-3 font-semibold">Valore</th><th className="pb-3 font-semibold">Stato</th><th className="pb-3"><span className="sr-only">Apri</span></th></tr></thead><tbody>{bookings.map((booking) => { const boat = state.boats.find((item) => item.id === booking.boatId); const customer = state.customers.find((item) => item.id === booking.customerId); return <tr key={booking.id} className="border-b border-[#EEF2F3] last:border-0"><td className="py-4"><p className="font-semibold">{boat?.name}</p><p className="mt-1 text-xs text-[#64748B]">{booking.reference} · {booking.source === "DIRECT" ? "Diretta" : "Marketplace"}</p></td><td className="py-4">{customer?.name}</td><td className="py-4">{dateTime(booking.startAt)}</td><td className="py-4 font-semibold">{money(booking.amountCents)}</td><td className="py-4"><StatusBadge kind={booking.status}>{BOOKING_LABELS[booking.status]}</StatusBadge></td><td className="py-4 text-right"><button onClick={() => onOpenBooking(booking.id)} className="min-h-11 rounded-xl px-3 font-semibold text-[#0F766E] hover:bg-[#F1F5F4]">Gestisci</button></td></tr>; })}</tbody></table></div>

      <div className="mt-5 space-y-3 md:hidden">{bookings.map((booking) => { const boat = state.boats.find((item) => item.id === booking.boatId); const customer = state.customers.find((item) => item.id === booking.customerId); return <button key={booking.id} onClick={() => onOpenBooking(booking.id)} className="w-full rounded-2xl border border-[#DEE5E8] p-4 text-left"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{boat?.name}</p><p className="mt-1 text-xs text-[#64748B]">{booking.reference}</p></div><StatusBadge kind={booking.status}>{BOOKING_LABELS[booking.status]}</StatusBadge></div><div className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><p className="text-xs text-[#64748B]">Cliente</p><p className="mt-1 font-medium">{customer?.name}</p></div><div><p className="text-xs text-[#64748B]">Valore</p><p className="mt-1 font-semibold">{money(booking.amountCents)}</p></div><div className="col-span-2"><p className="text-xs text-[#64748B]">Partenza</p><p className="mt-1 font-medium">{dateTime(booking.startAt)}</p></div></div></button>; })}</div>
      {bookings.length === 0 ? <p className="mt-8 rounded-2xl bg-[#F4F7F6] p-8 text-center text-sm text-[#64748B]">Nessuna prenotazione corrisponde ai filtri.</p> : null}
    </section>
  );
}

function FleetView({ state, onEditBoat }: { state: DemoState; onEditBoat: (id: string) => void }) {
  return (
    <section className="grid gap-4 md:grid-cols-2">{state.boats.map((boat) => { const bookings = state.bookings.filter((item) => item.boatId === boat.id && item.status !== "CANCELLED"); return <article key={boat.id} className="rounded-3xl border border-[#E2DFEB] bg-white p-5 shadow-sm sm:p-6"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.08em] text-[#6D5DFB]">{boat.type || "Tipologia da definire"} · {boat.base || "Base da definire"}</p><h3 className="mt-2 text-xl font-semibold">{boat.name}</h3><p className="mt-2 line-clamp-2 text-sm leading-6 text-[#676B80]">{boat.shortDescription || "Completa la presentazione per preparare questa barca al marketplace."}</p></div><StatusBadge kind={boat.status}>{BOAT_LABELS[boat.status]}</StatusBadge></div><div className="mt-6 grid grid-cols-2 gap-3 border-t border-[#E2DFEB] pt-5 text-sm sm:grid-cols-4"><div><p className="text-xs text-[#676B80]">Potenza</p><p className="mt-1 font-semibold">{boat.horsepower} CV</p></div><div><p className="text-xs text-[#676B80]">Capienza</p><p className="mt-1 font-semibold">{boat.capacity ? `${boat.capacity} pax` : "—"}</p></div><div><p className="text-xs text-[#676B80]">Optional</p><p className="mt-1 font-semibold">{boat.extras.length}</p></div><div><p className="text-xs text-[#676B80]">Booking</p><p className="mt-1 font-semibold">{bookings.length}</p></div></div><button onClick={() => onEditBoat(boat.id)} className={`${buttonSecondary} mt-5 w-full`}>Apri scheda completa</button></article>; })}</section>
  );
}

function FleetWorkspace({ state, onEditBoat, onAddBoat }: { state: DemoState; onEditBoat: (id: string) => void; onAddBoat: () => void }) {
  return (
    <div className="space-y-4">
      <section className="flex flex-col gap-4 rounded-3xl bg-[#171A2B] p-5 text-white sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#FDBA74]">Gestione inventario</p>
          <h2 className="mt-1 text-xl font-semibold">{state.boats.length} {state.boats.length === 1 ? "imbarcazione" : "imbarcazioni"} nella flotta</h2>
          <p className="mt-2 text-sm text-white/65">Aggiungi, completa o rimuovi le barche del workspace locale.</p>
        </div>
        <button className="min-h-11 shrink-0 rounded-xl bg-[#6D5DFB] px-5 text-sm font-semibold text-white" onClick={onAddBoat}>+ Aggiungi barca</button>
      </section>
      {state.boats.length > 0 ? <FleetView state={state} onEditBoat={onEditBoat} /> : <section className="rounded-3xl border border-dashed border-[#CBD5D8] bg-white p-10 text-center"><p className="text-xl font-semibold">La flotta è vuota</p><p className="mt-2 text-sm text-[#64748B]">Aggiungi la prima imbarcazione per iniziare a gestire disponibilità e prenotazioni.</p><button className={`${buttonPrimary} mt-5`} onClick={onAddBoat}>Aggiungi la prima barca</button></section>}
    </div>
  );
}

function CustomersView({ state, onOpenCustomer, onNewCustomer }: { state: DemoState; onOpenCustomer: (id: string) => void; onNewCustomer: () => void }) {
  const [query, setQuery] = useState("");
  const customers = state.customers.filter((customer) => `${customer.name} ${customer.email} ${customer.phone}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]"><section className="rounded-3xl border border-[#E2DFEB] bg-white p-4 shadow-sm sm:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.08em] text-[#6D5DFB]">CRM clienti</p><h2 className="mt-1 text-xl font-semibold">Relazioni e storico centralizzati</h2></div><button className={buttonPrimary} onClick={onNewCustomer}>+ Nuovo cliente</button></div><input className={`${inputClass} mt-5`} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cerca nome, email o telefono…" aria-label="Cerca cliente" /><div className="mt-4 space-y-3">{customers.map((customer) => { const bookings = state.bookings.filter((item) => item.customerId === customer.id && item.status !== "CANCELLED"); const spent = bookings.filter((item) => ["COMPLETED", "CONFIRMED", "PREPARING"].includes(item.status)).reduce((sum, item) => sum + item.amountCents, 0); return <button key={customer.id} onClick={() => onOpenCustomer(customer.id)} className="grid w-full gap-3 rounded-2xl border border-[#E2DFEB] p-4 text-left transition hover:border-[#6D5DFB] sm:grid-cols-[1.2fr_0.6fr_0.7fr_auto] sm:items-center"><div><p className="font-semibold">{customer.name}</p><p className="mt-1 truncate text-xs text-[#676B80]">{customer.email || "Email da inserire"}</p></div><p className="text-sm"><b>{bookings.length}</b> booking</p><p className="text-sm font-semibold">{money(spent)}</p><span className="w-fit rounded-full bg-[#F4F2FA] px-3 py-1 text-xs font-semibold text-[#555A70]">{SEGMENT_LABELS[customer.segment]}</span></button>; })}</div></section><aside className="space-y-4"><MetricCard label="Clienti" value={String(state.customers.length)} note="profili centralizzati" /><MetricCard label="Clienti ricorrenti" value={String(state.customers.filter((item) => ["RICORRENTE", "ALTO_VALORE"].includes(item.segment)).length)} note="priorità commerciale" /><article className="rounded-3xl bg-[#171A2B] p-6 text-white"><p className="text-xs font-bold uppercase tracking-[0.08em] text-[#FDBA74]">CRM operativo</p><p className="mt-3 font-semibold">Ogni scheda è modificabile</p><p className="mt-2 text-sm leading-6 text-white/65">Aggiorna contatti, segmento e note; le prenotazioni collegate restano sempre raggiungibili.</p></article></aside></div>;
}

function FinanceView({ state, onOpenBooking }: { state: DemoState; onOpenBooking: (id: string) => void }) {
  const paid = state.bookings.filter((booking) => ["CONFIRMED", "PREPARING", "COMPLETED"].includes(booking.status));
  const gross = paid.reduce((sum, booking) => sum + booking.amountCents, 0);
  const marketplaceGross = paid.filter((booking) => booking.source === "MARKETPLACE").reduce((sum, booking) => sum + booking.amountCents, 0);
  const fees = Math.round(marketplaceGross * 0.08);
  const operatorNet = gross - fees;
  function exportCsv() {
    const rows = [["Riferimento", "Data", "Origine", "Stato", "Lordo EUR", "Commissione EUR", "Netto EUR"], ...paid.map((booking) => { const fee = booking.source === "MARKETPLACE" ? Math.round(booking.amountCents * 0.08) : 0; return [booking.reference, booking.startAt.slice(0, 10), booking.source, booking.status, (booking.amountCents / 100).toFixed(2), (fee / 100).toFixed(2), ((booking.amountCents - fee) / 100).toFixed(2)]; })];
    const blob = new Blob([rows.map((row) => row.join(";")).join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = "boatly-demo-finanza.csv"; anchor.click(); URL.revokeObjectURL(url);
  }
  return (
    <div className="space-y-5">
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricCard label="Valore lordo" value={money(gross)} note="booking attivi e completati" />
        <MetricCard label="Quota operatore" value={money(operatorNet)} note="netto stimato" />
        <MetricCard label="Commissioni" value={money(fees)} note="8% solo marketplace" />
        <MetricCard label="Da riconciliare" value={money(0)} note="tutto allineato" />
      </section>
      <section className="rounded-3xl border border-[#E2DFEB] bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.08em] text-[#6D5DFB]">Controllo finanziario</p><h2 className="mt-1 text-xl font-semibold">Dettaglio guadagni e commissioni</h2><p className="mt-2 text-sm text-[#676B80]">Apri una riga per modificare la prenotazione che genera il valore.</p></div><button className={buttonSecondary} onClick={exportCsv}>Esporta CSV</button></div>
        <div className="mt-5 space-y-3">{paid.sort((a, b) => b.startAt.localeCompare(a.startAt)).map((booking) => { const fee = booking.source === "MARKETPLACE" ? Math.round(booking.amountCents * 0.08) : 0; const boat = state.boats.find((item) => item.id === booking.boatId); return <button key={booking.id} onClick={() => onOpenBooking(booking.id)} className="grid w-full gap-3 rounded-2xl border border-[#E2DFEB] p-4 text-left transition hover:border-[#6D5DFB] sm:grid-cols-[1.1fr_0.8fr_0.7fr_auto] sm:items-center"><div><p className="font-semibold">{booking.reference}</p><p className="mt-1 text-xs text-[#676B80]">{boat?.name} · {booking.source === "MARKETPLACE" ? "Marketplace" : "Diretta"}</p></div><div><p className="text-xs text-[#676B80]">Lordo</p><p className="mt-1 font-semibold">{money(booking.amountCents)}</p></div><div><p className="text-xs text-[#676B80]">Commissione</p><p className="mt-1 font-semibold">{money(fee)}</p></div><StatusBadge kind="MATCHED">MATCHED</StatusBadge></button>; })}</div>
      </section>
      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-3xl bg-[#171A2B] p-6 text-white"><p className="text-xs font-bold uppercase tracking-[0.08em] text-[#FDBA74]">Composizione</p><div className="mt-5 flex items-end justify-between"><p className="text-3xl font-semibold">{gross ? Math.round((operatorNet / gross) * 100) : 0}%</p><p className="text-sm text-white/60">all&apos;operatore</p></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-[#6D5DFB]" style={{ width: `${gross ? (operatorNet / gross) * 100 : 0}%` }} /></div></article>
        <article className="rounded-3xl border border-[#E2DFEB] bg-white p-6"><p className="text-xs font-bold uppercase tracking-[0.08em] text-[#676B80]">Circuito locale</p><p className="mt-3 font-semibold">Nessun movimento bancario</p><p className="mt-2 text-sm leading-6 text-[#676B80]">I valori reagiscono agli stati delle prenotazioni, ma non chiamano Stripe e non generano payout reali.</p></article>
      </section>
    </div>
  );
}

function Toast({ message }: { message: string }) {
  return <div className="fixed bottom-24 left-1/2 z-[60] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl bg-[#171A2B] px-4 py-3 text-center text-sm font-semibold text-white shadow-xl sm:bottom-6">{message}</div>;
}

export default function DemoManagementApp() {
  const mounted = useSyncExternalStore(subscribeToBrowser, () => true, () => false);
  const [state, setState] = useState<DemoState>(initialBrowserState);
  const [view, setView] = useState<DemoView>("dashboard");
  const [newBookingOpen, setNewBookingOpen] = useState(false);
  const [bookingDefaults, setBookingDefaults] = useState<{ date: string; boatId?: string }>({ date: "2026-09-02" });
  const [newBoatOpen, setNewBoatOpen] = useState(false);
  const [newCustomerOpen, setNewCustomerOpen] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [selectedBoatId, setSelectedBoatId] = useState<string | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (mounted) window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(state));
  }, [mounted, state]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 2800);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const selectedBooking = state.bookings.find((item) => item.id === selectedBookingId);
  const selectedBoat = state.boats.find((item) => item.id === selectedBoatId);
  const selectedCustomer = state.customers.find((item) => item.id === selectedCustomerId);
  const selectedView = VIEWS.find((item) => item.id === view) ?? VIEWS[0];

  function withActivity(current: DemoState, label: string, detail: string): DemoActivity[] {
    return [{ id: `activity-${Date.now()}`, label, detail, occurredAt: new Date().toISOString() }, ...current.activity].slice(0, 12);
  }

  function addBooking(booking: DemoBooking) {
    setState((current) => ({ ...current, bookings: [booking, ...current.bookings], activity: withActivity(current, "Prenotazione creata", `${booking.reference} · ${money(booking.amountCents)}`) }));
    setNewBookingOpen(false); setToast("Prenotazione aggiunta al workspace locale"); setView("prenotazioni");
  }

  function openNewBooking(date = "2026-09-02", boatId?: string) {
    setBookingDefaults({ date, boatId });
    setNewBookingOpen(true);
  }

  function enterWorkspace(name: string, location: DemoLocation) {
    setState((current) => ({
      ...current,
      workspaceName: name,
      workspaceLocation: location,
      activity: withActivity(current, "Workspace configurato", `${name} · ${location.fullName}`),
    }));
  }

  function reconfigureWorkspace() {
    setState((current) => ({ ...current, workspaceName: "", workspaceLocation: null }));
  }

  function addBoat(boat: DemoBoat) {
    setState((current) => ({
      ...current,
      boats: [boat, ...current.boats],
      activity: withActivity(current, "Barca aggiunta", boat.base ? `${boat.name} · ${boat.base}` : boat.name),
    }));
    setNewBoatOpen(false);
    setToast("Imbarcazione aggiunta alla flotta");
    setView("flotta");
  }

  function updateBooking(booking: DemoBooking) {
    setState((current) => ({ ...current, bookings: current.bookings.map((item) => item.id === booking.id ? booking : item), activity: withActivity(current, "Prenotazione aggiornata", `${booking.reference} · ${BOOKING_LABELS[booking.status]}`) }));
    setSelectedBookingId(null); setToast("Stato, agenda e finanza aggiornati");
  }

  function deleteSelectedBooking() {
    if (!selectedBooking || !window.confirm(`Rimuovere ${selectedBooking.reference} dal workspace locale?`)) return;
    setState((current) => ({
      ...current,
      bookings: current.bookings.filter((item) => item.id !== selectedBooking.id),
      activity: withActivity(current, "Prenotazione rimossa", selectedBooking.reference),
    }));
    setSelectedBookingId(null);
    setToast("Prenotazione rimossa");
  }

  function updateBoat(boat: DemoBoat) {
    setState((current) => ({ ...current, boats: current.boats.map((item) => item.id === boat.id ? boat : item), activity: withActivity(current, "Flotta aggiornata", `${boat.name} · ${BOAT_LABELS[boat.status]}`) }));
    setSelectedBoatId(null); setToast("Disponibilità della flotta aggiornata");
  }

  function deleteSelectedBoat() {
    if (!selectedBoat) return;
    const bookingCount = state.bookings.filter((item) => item.boatId === selectedBoat.id).length;
    const message = bookingCount
      ? `Rimuovere ${selectedBoat.name}? Verranno eliminate anche ${bookingCount} prenotazioni sintetiche associate.`
      : `Rimuovere ${selectedBoat.name} dalla flotta locale?`;
    if (!window.confirm(message)) return;

    setState((current) => ({
      ...current,
      boats: current.boats.filter((item) => item.id !== selectedBoat.id),
      bookings: current.bookings.filter((item) => item.boatId !== selectedBoat.id),
      activity: withActivity(current, "Barca rimossa", selectedBoat.name),
    }));
    setSelectedBoatId(null);
    setToast("Imbarcazione rimossa dal workspace locale");
  }

  function addCustomer(customer: DemoCustomer) {
    setState((current) => ({ ...current, customers: [customer, ...current.customers], activity: withActivity(current, "Cliente aggiunto", customer.name) }));
    setNewCustomerOpen(false);
    setToast("Cliente aggiunto al CRM locale");
  }

  function updateCustomer(customer: DemoCustomer) {
    setState((current) => ({ ...current, customers: current.customers.map((item) => item.id === customer.id ? customer : item), activity: withActivity(current, "CRM aggiornato", customer.name) }));
    setSelectedCustomerId(null); setToast("Scheda cliente aggiornata");
  }

  function deleteSelectedCustomer() {
    if (!selectedCustomer) return;
    const bookingCount = state.bookings.filter((item) => item.customerId === selectedCustomer.id).length;
    if (!window.confirm(`Rimuovere ${selectedCustomer.name}? Verranno eliminate anche ${bookingCount} prenotazioni sintetiche associate.`)) return;
    setState((current) => ({
      ...current,
      customers: current.customers.filter((item) => item.id !== selectedCustomer.id),
      bookings: current.bookings.filter((item) => item.customerId !== selectedCustomer.id),
      activity: withActivity(current, "Cliente rimosso", selectedCustomer.name),
    }));
    setSelectedCustomerId(null);
    setToast("Cliente rimosso dal CRM locale");
  }

  function resetDemo() {
    if (!window.confirm("Ripristinare tutti i dati iniziali? Le modifiche fatte su questo dispositivo verranno eliminate.")) return;
    setState(freshDemoState()); setView("dashboard"); setToast("Workspace locale ripristinato");
  }

  if (!mounted) {
    return <main className="grid min-h-screen place-items-center bg-[#F4F3FA] px-6 text-center text-[#171A2B]"><div><p className="text-sm font-semibold text-[#6D5DFB]">Boatly Ops</p><h1 className="mt-2 text-2xl font-semibold">Preparazione area noleggiatore…</h1></div></main>;
  }

  if (!state.workspaceName || !state.workspaceLocation) {
    return <DemoWorkspaceSetup token={process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ""} onContinue={enterWorkspace} />;
  }

  return (
    <main className="min-h-screen bg-[#F4F3FA] pb-24 text-[#171A2B] lg:pb-0">
      <header className="sticky top-0 z-30 border-b border-[#D8D5E5] bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="min-w-0"><Link href="/" className="flex items-center gap-2 text-xl font-bold tracking-tight"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[#6D5DFB] text-sm text-white">B</span>Boatly Ops</Link><p className="truncate text-[11px] text-[#676B80]">{state.workspaceName} · {state.workspaceLocation.city}</p></div>
          <div className="flex items-center gap-1 sm:gap-2"><span className="hidden rounded-full bg-[#EDE9FE] px-3 py-1.5 text-xs font-semibold text-[#5B4FD6] md:inline-flex">Area noleggiatore · dati locali</span><button className="min-h-11 rounded-xl px-2 text-xs font-semibold text-[#676B80] hover:bg-[#F4F2FA] sm:px-3" onClick={reconfigureWorkspace}>Attività</button><button className="min-h-11 rounded-xl px-2 text-xs font-semibold text-[#676B80] hover:bg-[#F4F2FA] sm:px-3" onClick={resetDemo}>Ripristina</button><Link href="/" className="grid min-h-11 place-items-center rounded-xl bg-[#171A2B] px-3 text-xs font-semibold text-white sm:px-4 sm:text-sm">Marketplace</Link></div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] lg:grid-cols-[248px_1fr]">
        <aside className="hidden min-h-[calc(100vh-69px)] border-r border-[#E2DFEB] bg-[#FBFAFE] p-5 lg:block"><div className="rounded-2xl bg-[#171A2B] p-4 text-white"><p className="text-xs font-bold uppercase tracking-[0.08em] text-[#FDBA74]">Area noleggiatore</p><p className="mt-2 truncate font-semibold">{state.workspaceName}</p><p className="mt-1 text-xs text-white/60">{state.workspaceLocation.fullName}</p><p className="mt-3 text-xs text-white/60">{state.boats.length} {state.boats.length === 1 ? "imbarcazione" : "imbarcazioni"}</p></div><nav className="mt-5 space-y-1" aria-label="Sezioni gestionale">{VIEWS.map((item) => <button key={item.id} onClick={() => setView(item.id)} aria-current={view === item.id ? "page" : undefined} className={classNames("w-full rounded-xl border-l-4 px-4 py-3 text-left transition", view === item.id ? "border-[#6D5DFB] bg-[#EDE9FE] text-[#4C3FC2]" : "border-transparent text-[#555A70] hover:bg-[#F4F2FA]")}><span className="block text-sm font-semibold">{item.label}</span><span className="mt-0.5 block text-xs opacity-70">{item.note}</span></button>)}</nav><div className="mt-6 rounded-2xl border border-[#E2DFEB] bg-white p-4 text-xs leading-5 text-[#676B80]"><strong className="text-[#171A2B]">Circuito chiuso.</strong><br />Le modifiche restano su questo browser e non raggiungono dati, clienti o pagamenti reali.</div></aside>

        <div className="min-w-0 p-4 sm:p-6 lg:p-8">
          <section className="mb-5 flex flex-col gap-4 sm:mb-6 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold text-[#6D5DFB]">{selectedView.note}</p><h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">{selectedView.label}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[#676B80]">Azioni e dati della sezione sono collegati in tempo reale a tutto il workspace locale.</p></div><div className="rounded-2xl border border-[#E2DFEB] bg-white px-4 py-3 text-xs text-[#676B80] sm:text-sm"><span className="inline-block h-2 w-2 rounded-full bg-[#6D5DFB]" /> <strong className="ml-1 text-[#171A2B]">Modifiche salvate sul dispositivo</strong></div></section>

          {view === "dashboard" ? <DashboardView state={state} onNavigate={setView} onNewBooking={() => openNewBooking()} onOpenBooking={setSelectedBookingId} /> : null}
          {view === "calendario" ? <DemoCalendarView state={state} onOpenBooking={setSelectedBookingId} onOpenBoat={setSelectedBoatId} onNewBooking={openNewBooking} onAddBoat={() => setNewBoatOpen(true)} /> : null}
          {view === "prenotazioni" ? <BookingsView state={state} onNewBooking={() => openNewBooking()} onOpenBooking={setSelectedBookingId} /> : null}
          {view === "flotta" ? <FleetWorkspace state={state} onEditBoat={setSelectedBoatId} onAddBoat={() => setNewBoatOpen(true)} /> : null}
          {view === "clienti" ? <CustomersView state={state} onOpenCustomer={setSelectedCustomerId} onNewCustomer={() => setNewCustomerOpen(true)} /> : null}
          {view === "finanza" ? <FinanceView state={state} onOpenBooking={setSelectedBookingId} /> : null}
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-6 border-t border-[#D8D5E5] bg-white/95 px-1 pb-[max(0.4rem,env(safe-area-inset-bottom))] pt-1 backdrop-blur lg:hidden" aria-label="Navigazione mobile gestionale">{VIEWS.map((item) => <button key={item.id} onClick={() => setView(item.id)} className={classNames("min-h-14 rounded-xl px-0.5 text-[9px] font-semibold sm:text-[10px]", view === item.id ? "bg-[#EDE9FE] text-[#4C3FC2]" : "text-[#676B80]")}><span className="mx-auto mb-1 block h-1.5 w-1.5 rounded-full bg-current" />{item.short}</button>)}</nav>

      {newBookingOpen ? <Modal title="Nuova prenotazione" eyebrow="Agenda operativa" onClose={() => setNewBookingOpen(false)} wide><BookingForm key={`${bookingDefaults.date}-${bookingDefaults.boatId ?? "all"}`} state={state} initialDate={bookingDefaults.date} initialBoatId={bookingDefaults.boatId} onSave={addBooking} onClose={() => setNewBookingOpen(false)} /></Modal> : null}
      {newBoatOpen ? <Modal title="Aggiungi una barca" eyebrow="Scheda marketplace e flotta" onClose={() => setNewBoatOpen(false)} wide><DemoBoatForm defaultBase={state.workspaceLocation.city} onSave={addBoat} onClose={() => setNewBoatOpen(false)} /></Modal> : null}
      {newCustomerOpen ? <Modal title="Nuovo cliente" eyebrow="CRM operativo" onClose={() => setNewCustomerOpen(false)}><DemoCustomerForm onSave={addCustomer} onClose={() => setNewCustomerOpen(false)} /></Modal> : null}
      {selectedBooking ? <Modal title={selectedBooking.reference} eyebrow="Dettaglio prenotazione" onClose={() => setSelectedBookingId(null)} wide><BookingDetail booking={selectedBooking} state={state} onSave={updateBooking} onDelete={deleteSelectedBooking} onClose={() => setSelectedBookingId(null)} /></Modal> : null}
      {selectedBoat ? <Modal title={selectedBoat.name} eyebrow="Scheda marketplace e flotta" onClose={() => setSelectedBoatId(null)} wide><DemoBoatForm boat={selectedBoat} bookingCount={state.bookings.filter((item) => item.boatId === selectedBoat.id).length} onSave={updateBoat} onDelete={deleteSelectedBoat} onClose={() => setSelectedBoatId(null)} /></Modal> : null}
      {selectedCustomer ? <Modal title={selectedCustomer.name} eyebrow="Scheda cliente" onClose={() => setSelectedCustomerId(null)} wide><div className="grid gap-6 lg:grid-cols-[1fr_0.85fr]"><DemoCustomerForm customer={selectedCustomer} bookingCount={state.bookings.filter((item) => item.customerId === selectedCustomer.id).length} onSave={updateCustomer} onDelete={deleteSelectedCustomer} onClose={() => setSelectedCustomerId(null)} /><section className="rounded-2xl bg-[#F4F2FA] p-4"><p className="text-sm font-semibold">Prenotazioni collegate</p><div className="mt-3 space-y-2">{state.bookings.filter((item) => item.customerId === selectedCustomer.id).map((booking) => <button key={booking.id} onClick={() => { setSelectedCustomerId(null); setSelectedBookingId(booking.id); }} className="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl bg-white px-3 text-left text-sm"><span><b>{booking.reference}</b><span className="ml-2 text-[#676B80]">{dateTime(booking.startAt)}</span></span><span className="font-semibold">{money(booking.amountCents)}</span></button>)}{state.bookings.every((item) => item.customerId !== selectedCustomer.id) ? <p className="text-sm text-[#676B80]">Nessuna prenotazione collegata.</p> : null}</div></section></div></Modal> : null}
      {toast ? <Toast message={toast} /> : null}
    </main>
  );
}
