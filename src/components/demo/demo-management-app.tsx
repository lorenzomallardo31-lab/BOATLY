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

import { DEMO_STORAGE_KEY, freshDemoState } from "@/lib/demo/seed";
import type {
  DemoActivity,
  DemoBoat,
  DemoBoatStatus,
  DemoBooking,
  DemoBookingStatus,
  DemoCustomer,
  DemoState,
  DemoView,
} from "@/lib/demo/types";

const VIEWS: Array<{ id: DemoView; label: string; short: string; note: string }> = [
  { id: "dashboard", label: "Dashboard", short: "Home", note: "Controllo giornaliero" },
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

function compactDate(value: Date) {
  return new Intl.DateTimeFormat("it-IT", {
    weekday: "short",
    day: "numeric",
  }).format(value);
}

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function MetricCard({ label, value, note, tone = "teal" }: { label: string; value: string; note: string; tone?: "teal" | "amber" | "slate" }) {
  const noteColor = tone === "amber" ? "text-amber-700" : tone === "slate" ? "text-[#64748B]" : "text-[#0F766E]";
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
      positive && "bg-[#CCFBF1] text-[#0F766E]",
      negative && "bg-rose-50 text-rose-700",
      !positive && !negative && "bg-amber-50 text-amber-800",
    )}>
      {children}
    </span>
  );
}

function Modal({ title, eyebrow, onClose, children, wide = false }: { title: string; eyebrow: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#071525]/55 p-0 backdrop-blur-[2px] sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <button className="absolute inset-0 cursor-default" onClick={onClose} aria-label="Chiudi finestra" />
      <section className={classNames(
        "relative z-10 max-h-[92dvh] w-full overflow-y-auto rounded-t-[1.75rem] bg-white p-5 shadow-2xl sm:rounded-[1.75rem] sm:p-7",
        wide ? "sm:max-w-3xl" : "sm:max-w-xl",
      )}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#14B8A6]">{eyebrow}</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">{title}</h2>
          </div>
          <button onClick={onClose} className="grid min-h-11 min-w-11 place-items-center rounded-full bg-[#F1F5F4] text-xl" aria-label="Chiudi">×</button>
        </div>
        <div className="mt-6">{children}</div>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="grid gap-1.5 text-sm font-semibold text-[#334155]">{label}{children}</label>;
}

const inputClass = "min-h-11 w-full rounded-xl border border-[#CBD5D8] bg-white px-3 text-base text-[#0B1F33] outline-none transition focus:border-[#14B8A6] focus:ring-2 focus:ring-[#14B8A6]/15 sm:text-sm";
const buttonPrimary = "inline-flex min-h-11 items-center justify-center rounded-xl bg-[#0B1F33] px-4 text-sm font-semibold text-white transition hover:bg-[#12314d] disabled:cursor-not-allowed disabled:opacity-45";
const buttonSecondary = "inline-flex min-h-11 items-center justify-center rounded-xl border border-[#CBD5D8] bg-white px-4 text-sm font-semibold text-[#0B1F33] transition hover:bg-[#F1F5F4]";

const subscribeToBrowser = () => () => undefined;

function initialBrowserState() {
  if (typeof window === "undefined") return freshDemoState();
  try {
    const saved = window.localStorage.getItem(DEMO_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as DemoState;
      if (parsed.version === 2) return parsed;
    }
  } catch {
    window.localStorage.removeItem(DEMO_STORAGE_KEY);
  }
  return freshDemoState();
}

function BookingForm({ state, onSave, onClose }: { state: DemoState; onSave: (booking: DemoBooking) => void; onClose: () => void }) {
  const activeBoats = state.boats.filter((boat) => boat.status === "ACTIVE");
  const [boatId, setBoatId] = useState(activeBoats[0]?.id ?? state.boats[0]?.id ?? "");
  const [customerId, setCustomerId] = useState(state.customers[0]?.id ?? "");
  const [date, setDate] = useState("2026-09-02");
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
      {selectedBoat && selectedBoat.status !== "ACTIVE" ? <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">La barca selezionata risulta {BOAT_LABELS[selectedBoat.status].toLowerCase()}. La demo permette comunque di salvare per mostrare il controllo operativo.</p> : null}
      <div className="grid gap-2 pt-2 sm:grid-cols-2"><button type="button" onClick={onClose} className={buttonSecondary}>Annulla</button><button className={buttonPrimary}>Salva prenotazione</button></div>
    </form>
  );
}

function BookingDetail({ booking, boat, customer, onUpdate, onClose }: { booking: DemoBooking; boat?: DemoBoat; customer?: DemoCustomer; onUpdate: (status: DemoBookingStatus, notes: string) => void; onClose: () => void }) {
  const [status, setStatus] = useState(booking.status);
  const [notes, setNotes] = useState(booking.notes);
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 rounded-2xl bg-[#F4F7F6] p-4 text-sm">
        <div><p className="text-xs text-[#64748B]">Imbarcazione</p><p className="mt-1 font-semibold">{boat?.name}</p></div>
        <div><p className="text-xs text-[#64748B]">Cliente</p><p className="mt-1 font-semibold">{customer?.name}</p></div>
        <div><p className="text-xs text-[#64748B]">Partenza</p><p className="mt-1 font-semibold">{dateTime(booking.startAt)}</p></div>
        <div><p className="text-xs text-[#64748B]">Valore</p><p className="mt-1 font-semibold">{money(booking.amountCents)}</p></div>
      </div>
      <Field label="Stato operativo"><select className={inputClass} value={status} onChange={(event) => setStatus(event.target.value as DemoBookingStatus)}>{Object.entries(BOOKING_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
      <Field label="Note interne"><textarea className={`${inputClass} min-h-28 py-3`} value={notes} onChange={(event) => setNotes(event.target.value)} /></Field>
      <p className="text-xs leading-5 text-[#64748B]">In questa demo il cambio di stato aggiorna subito dashboard, disponibilità della flotta e riepilogo finanziario, senza inviare email o movimenti reali.</p>
      <div className="grid gap-2 sm:grid-cols-2"><button type="button" onClick={onClose} className={buttonSecondary}>Chiudi</button><button type="button" onClick={() => onUpdate(status, notes)} className={buttonPrimary}>Salva modifiche</button></div>
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
        <MetricCard label="Valore gestito" value={money(confirmedValue)} note="scenario demo" />
        <MetricCard label="Booking attivi" value={String(active.length)} note={`${state.bookings.filter((b) => b.status === "CONFIRMED").length} confermati`} />
        <MetricCard label="Flotta operativa" value={`${state.boats.filter((b) => b.status === "ACTIVE").length}/${state.boats.length}`} note="barche disponibili" />
        <MetricCard label="Da gestire" value={String(attention.length)} note="richieste e preparazione" tone={attention.length ? "amber" : "teal"} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.5fr_0.75fr]">
        <article className="rounded-3xl border border-[#DEE5E8] bg-white p-4 shadow-sm sm:p-6">
          <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.08em] text-[#14B8A6]">Agenda operativa</p><h2 className="mt-1 text-xl font-semibold">Prossime partenze</h2></div><button className={buttonPrimary} onClick={onNewBooking}>+ <span className="hidden sm:inline">Nuova prenotazione</span><span className="sm:hidden">Nuova</span></button></div>
          <div className="mt-5 space-y-3">
            {sorted.slice(0, 4).map((booking) => {
              const boat = state.boats.find((item) => item.id === booking.boatId);
              const customer = state.customers.find((item) => item.id === booking.customerId);
              return <button key={booking.id} onClick={() => onOpenBooking(booking.id)} className="grid w-full gap-3 rounded-2xl border border-[#DEE5E8] p-4 text-left transition hover:border-[#14B8A6] sm:grid-cols-[1.25fr_0.8fr_auto] sm:items-center"><div><p className="font-semibold">{boat?.name}</p><p className="mt-1 text-xs text-[#64748B]">{booking.reference} · {customer?.name}</p></div><div><p className="text-sm font-medium">{dateTime(booking.startAt)}</p><p className="mt-1 text-xs text-[#64748B]">{booking.source === "DIRECT" ? "Diretta" : "Marketplace"}</p></div><StatusBadge kind={booking.status}>{BOOKING_LABELS[booking.status]}</StatusBadge></button>;
            })}
          </div>
          <button className="mt-4 min-h-11 text-sm font-semibold text-[#0F766E]" onClick={() => onNavigate("prenotazioni")}>Apri tutte le prenotazioni →</button>
        </article>

        <div className="space-y-5">
          <article className="rounded-3xl bg-[#0B1F33] p-5 text-white sm:p-6"><p className="text-xs font-bold uppercase tracking-[0.08em] text-[#5EEAD4]">Azioni rapide</p><h2 className="mt-2 text-xl font-semibold">Gestisci la giornata</h2><div className="mt-5 grid gap-2"><button onClick={onNewBooking} className="min-h-11 rounded-xl bg-[#14B8A6] px-4 text-left text-sm font-semibold">Aggiungi prenotazione</button><button onClick={() => onNavigate("flotta")} className="min-h-11 rounded-xl border border-white/15 px-4 text-left text-sm font-semibold">Controlla disponibilità</button><button onClick={() => onNavigate("finanza")} className="min-h-11 rounded-xl border border-white/15 px-4 text-left text-sm font-semibold">Apri riepilogo ricavi</button></div></article>
          <article className="rounded-3xl border border-[#DEE5E8] bg-white p-5 sm:p-6"><p className="text-xs font-bold uppercase tracking-[0.08em] text-[#64748B]">Attività recente</p><div className="mt-4 space-y-4">{state.activity.slice(0, 3).map((item) => <div key={item.id} className="border-l-2 border-[#5EEAD4] pl-3"><p className="text-sm font-semibold">{item.label}</p><p className="mt-1 text-xs leading-5 text-[#64748B]">{item.detail}</p></div>)}</div></article>
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
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.08em] text-[#14B8A6]">Booking control</p><h2 className="mt-1 text-xl font-semibold">Prenotazioni marketplace e dirette</h2></div><button className={buttonPrimary} onClick={onNewBooking}>+ Nuova prenotazione</button></div>
      <div className="mt-5 grid gap-3 md:grid-cols-[1fr_220px]"><input className={inputClass} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cerca cliente, barca o codice…" aria-label="Cerca prenotazione" /><select className={inputClass} value={filter} onChange={(event) => setFilter(event.target.value as "ALL" | DemoBookingStatus)} aria-label="Filtra stato"><option value="ALL">Tutti gli stati</option>{Object.entries(BOOKING_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>

      <div className="mt-5 hidden overflow-x-auto md:block"><table className="w-full min-w-[760px] text-left text-sm"><thead><tr className="border-b border-[#DEE5E8] text-xs uppercase tracking-wide text-[#64748B]"><th className="pb-3 font-semibold">Prenotazione</th><th className="pb-3 font-semibold">Cliente</th><th className="pb-3 font-semibold">Partenza</th><th className="pb-3 font-semibold">Valore</th><th className="pb-3 font-semibold">Stato</th><th className="pb-3"><span className="sr-only">Apri</span></th></tr></thead><tbody>{bookings.map((booking) => { const boat = state.boats.find((item) => item.id === booking.boatId); const customer = state.customers.find((item) => item.id === booking.customerId); return <tr key={booking.id} className="border-b border-[#EEF2F3] last:border-0"><td className="py-4"><p className="font-semibold">{boat?.name}</p><p className="mt-1 text-xs text-[#64748B]">{booking.reference} · {booking.source === "DIRECT" ? "Diretta" : "Marketplace"}</p></td><td className="py-4">{customer?.name}</td><td className="py-4">{dateTime(booking.startAt)}</td><td className="py-4 font-semibold">{money(booking.amountCents)}</td><td className="py-4"><StatusBadge kind={booking.status}>{BOOKING_LABELS[booking.status]}</StatusBadge></td><td className="py-4 text-right"><button onClick={() => onOpenBooking(booking.id)} className="min-h-11 rounded-xl px-3 font-semibold text-[#0F766E] hover:bg-[#F1F5F4]">Gestisci</button></td></tr>; })}</tbody></table></div>

      <div className="mt-5 space-y-3 md:hidden">{bookings.map((booking) => { const boat = state.boats.find((item) => item.id === booking.boatId); const customer = state.customers.find((item) => item.id === booking.customerId); return <button key={booking.id} onClick={() => onOpenBooking(booking.id)} className="w-full rounded-2xl border border-[#DEE5E8] p-4 text-left"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{boat?.name}</p><p className="mt-1 text-xs text-[#64748B]">{booking.reference}</p></div><StatusBadge kind={booking.status}>{BOOKING_LABELS[booking.status]}</StatusBadge></div><div className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><p className="text-xs text-[#64748B]">Cliente</p><p className="mt-1 font-medium">{customer?.name}</p></div><div><p className="text-xs text-[#64748B]">Valore</p><p className="mt-1 font-semibold">{money(booking.amountCents)}</p></div><div className="col-span-2"><p className="text-xs text-[#64748B]">Partenza</p><p className="mt-1 font-medium">{dateTime(booking.startAt)}</p></div></div></button>; })}</div>
      {bookings.length === 0 ? <p className="mt-8 rounded-2xl bg-[#F4F7F6] p-8 text-center text-sm text-[#64748B]">Nessuna prenotazione corrisponde ai filtri.</p> : null}
    </section>
  );
}

function FleetView({ state, onEditBoat }: { state: DemoState; onEditBoat: (id: string) => void }) {
  const days = Array.from({ length: 7 }, (_, index) => { const date = new Date("2026-08-28T12:00:00"); date.setDate(date.getDate() + index); return date; });
  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-[#DEE5E8] bg-white p-4 shadow-sm sm:p-6"><div><p className="text-xs font-bold uppercase tracking-[0.08em] text-[#14B8A6]">Planning settimanale</p><h2 className="mt-1 text-xl font-semibold">Disponibilità flotta</h2></div><div className="mt-5 overflow-x-auto"><div className="min-w-[720px]"><div className="grid grid-cols-[180px_repeat(7,1fr)] gap-1 text-center text-xs text-[#64748B]"><span />{days.map((day) => <span key={day.toISOString()} className="py-2 capitalize">{compactDate(day)}</span>)}</div>{state.boats.map((boat) => <div key={boat.id} className="mt-1 grid grid-cols-[180px_repeat(7,1fr)] gap-1"><button onClick={() => onEditBoat(boat.id)} className="truncate rounded-lg px-2 py-3 text-left text-sm font-semibold hover:bg-[#F1F5F4]">{boat.name}</button>{days.map((day) => { const iso = day.toISOString().slice(0, 10); const booking = state.bookings.find((item) => item.boatId === boat.id && item.startAt.startsWith(iso) && item.status !== "CANCELLED"); const blocked = boat.status !== "ACTIVE"; return <div key={iso} title={booking?.reference ?? (blocked ? BOAT_LABELS[boat.status] : "Disponibile")} className={classNames("grid min-h-11 place-items-center rounded-lg text-[10px] font-bold", booking ? "bg-[#0B1F33] text-white" : blocked ? "bg-amber-100 text-amber-800" : "bg-[#E6F8F4] text-[#0F766E]")}>{booking ? "BOOKED" : blocked ? "BLOCCO" : "LIBERA"}</div>; })}</div>)}</div></div><div className="mt-4 flex flex-wrap gap-4 text-xs text-[#64748B]"><span>● <b className="text-[#0B1F33]">Prenotata</b></span><span>● <b className="text-[#0F766E]">Disponibile</b></span><span>● <b className="text-amber-700">Bloccata</b></span></div></section>
      <section className="grid gap-4 md:grid-cols-2">{state.boats.map((boat) => { const bookings = state.bookings.filter((item) => item.boatId === boat.id && item.status !== "CANCELLED"); const occupied = Math.min(95, 38 + bookings.length * 9); return <article key={boat.id} className="rounded-3xl border border-[#DEE5E8] bg-white p-5 shadow-sm sm:p-6"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.08em] text-[#14B8A6]">{boat.type} · {boat.base}</p><h3 className="mt-2 text-xl font-semibold">{boat.name}</h3></div><StatusBadge kind={boat.status}>{BOAT_LABELS[boat.status]}</StatusBadge></div><div className="mt-6 grid grid-cols-3 gap-3 border-t border-[#DEE5E8] pt-5 text-sm"><div><p className="text-xs text-[#64748B]">Capienza</p><p className="mt-1 font-semibold">{boat.capacity} pax</p></div><div><p className="text-xs text-[#64748B]">Tariffa</p><p className="mt-1 font-semibold">{money(boat.dailyPriceCents)}</p></div><div><p className="text-xs text-[#64748B]">Booking</p><p className="mt-1 font-semibold">{bookings.length}</p></div></div><div className="mt-5 h-2 overflow-hidden rounded-full bg-[#E8EFEE]"><div className="h-full rounded-full bg-[#14B8A6]" style={{ width: `${occupied}%` }} /></div><button onClick={() => onEditBoat(boat.id)} className={`${buttonSecondary} mt-5 w-full`}>Gestisci disponibilità</button></article>; })}</section>
    </div>
  );
}

function BoatEditor({ boat, onSave, onClose }: { boat: DemoBoat; onSave: (boat: DemoBoat) => void; onClose: () => void }) {
  const [status, setStatus] = useState(boat.status);
  const [price, setPrice] = useState(String(boat.dailyPriceCents / 100));
  const [note, setNote] = useState(boat.maintenanceNote);
  return <div className="space-y-4"><div className="rounded-2xl bg-[#F4F7F6] p-4 text-sm"><p className="text-xs text-[#64748B]">Imbarcazione</p><p className="mt-1 font-semibold">{boat.name} · {boat.base}</p></div><Field label="Stato disponibilità"><select className={inputClass} value={status} onChange={(event) => setStatus(event.target.value as DemoBoatStatus)}>{Object.entries(BOAT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field><Field label="Tariffa giornaliera (€)"><input className={inputClass} type="number" min="0" step="10" value={price} onChange={(event) => setPrice(event.target.value)} /></Field><Field label="Nota operativa"><textarea className={`${inputClass} min-h-24 py-3`} placeholder="Motivo del blocco o attività di manutenzione…" value={note} onChange={(event) => setNote(event.target.value)} /></Field><div className="grid gap-2 pt-2 sm:grid-cols-2"><button className={buttonSecondary} onClick={onClose}>Chiudi</button><button className={buttonPrimary} onClick={() => onSave({ ...boat, status, dailyPriceCents: Math.max(0, Math.round(Number(price) * 100)), maintenanceNote: note })}>Aggiorna flotta</button></div></div>;
}

function CustomersView({ state, onOpenCustomer }: { state: DemoState; onOpenCustomer: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const customers = state.customers.filter((customer) => `${customer.name} ${customer.email} ${customer.phone}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]"><section className="rounded-3xl border border-[#DEE5E8] bg-white p-4 shadow-sm sm:p-6"><p className="text-xs font-bold uppercase tracking-[0.08em] text-[#14B8A6]">CRM clienti</p><h2 className="mt-1 text-xl font-semibold">Relazioni e storico centralizzati</h2><input className={`${inputClass} mt-5`} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cerca nome, email o telefono…" aria-label="Cerca cliente" /><div className="mt-4 space-y-3">{customers.map((customer) => { const bookings = state.bookings.filter((item) => item.customerId === customer.id && item.status !== "CANCELLED"); const spent = bookings.filter((item) => ["COMPLETED", "CONFIRMED", "PREPARING"].includes(item.status)).reduce((sum, item) => sum + item.amountCents, 0); return <button key={customer.id} onClick={() => onOpenCustomer(customer.id)} className="grid w-full gap-3 rounded-2xl border border-[#DEE5E8] p-4 text-left transition hover:border-[#14B8A6] sm:grid-cols-[1.2fr_0.6fr_0.7fr_auto] sm:items-center"><div><p className="font-semibold">{customer.name}</p><p className="mt-1 truncate text-xs text-[#64748B]">{customer.email}</p></div><p className="text-sm"><b>{bookings.length}</b> booking</p><p className="text-sm font-semibold">{money(spent)}</p><span className="w-fit rounded-full bg-[#F1F5F4] px-3 py-1 text-xs font-semibold text-[#475569]">{SEGMENT_LABELS[customer.segment]}</span></button>; })}</div></section><aside className="space-y-4"><MetricCard label="Clienti demo" value={String(state.customers.length)} note="profili centralizzati" /><MetricCard label="Clienti ricorrenti" value={String(state.customers.filter((item) => ["RICORRENTE", "ALTO_VALORE"].includes(item.segment)).length)} note="priorità commerciale" /><article className="rounded-3xl bg-[#0B1F33] p-6 text-white"><p className="text-xs font-bold uppercase tracking-[0.08em] text-[#5EEAD4]">Suggerimento</p><p className="mt-3 font-semibold">Apri un cliente</p><p className="mt-2 text-sm leading-6 text-white/65">Consulta storico, valore e prenotazioni, poi aggiorna le note interne come in un vero CRM.</p></article></aside></div>;
}

function CustomerDetail({ customer, state, onSave, onOpenBooking, onClose }: { customer: DemoCustomer; state: DemoState; onSave: (notes: string) => void; onOpenBooking: (id: string) => void; onClose: () => void }) {
  const [notes, setNotes] = useState(customer.notes);
  const bookings = state.bookings.filter((item) => item.customerId === customer.id).sort((a, b) => b.startAt.localeCompare(a.startAt));
  return <div className="space-y-5"><div className="grid gap-3 rounded-2xl bg-[#F4F7F6] p-4 text-sm sm:grid-cols-2"><div><p className="text-xs text-[#64748B]">Email</p><p className="mt-1 break-all font-semibold">{customer.email}</p></div><div><p className="text-xs text-[#64748B]">Telefono</p><p className="mt-1 font-semibold">{customer.phone}</p></div></div><div><p className="text-sm font-semibold">Storico prenotazioni</p><div className="mt-3 space-y-2">{bookings.map((booking) => <button key={booking.id} onClick={() => onOpenBooking(booking.id)} className="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border border-[#DEE5E8] px-3 text-left text-sm"><span><b>{booking.reference}</b><span className="ml-2 text-[#64748B]">{dateTime(booking.startAt)}</span></span><span className="font-semibold">{money(booking.amountCents)}</span></button>)}</div></div><Field label="Note CRM"><textarea className={`${inputClass} min-h-28 py-3`} value={notes} onChange={(event) => setNotes(event.target.value)} /></Field><div className="grid gap-2 sm:grid-cols-2"><button className={buttonSecondary} onClick={onClose}>Chiudi</button><button className={buttonPrimary} onClick={() => onSave(notes)}>Salva note</button></div></div>;
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
  return <div className="space-y-5"><section className="grid grid-cols-2 gap-3 xl:grid-cols-4"><MetricCard label="Valore lordo" value={money(gross)} note="booking attivi e completati" /><MetricCard label="Quota operatore" value={money(operatorNet)} note="netto stimato" /><MetricCard label="Commissioni" value={money(fees)} note="8% solo marketplace" /><MetricCard label="Da riconciliare" value={money(0)} note="tutto allineato" /></section><section className="rounded-3xl border border-[#DEE5E8] bg-white p-4 shadow-sm sm:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.08em] text-[#14B8A6]">Controllo finanziario</p><h2 className="mt-1 text-xl font-semibold">Dettaglio guadagni e commissioni</h2></div><button className={buttonSecondary} onClick={exportCsv}>Esporta CSV</button></div><div className="mt-5 space-y-3">{paid.sort((a, b) => b.startAt.localeCompare(a.startAt)).map((booking) => { const fee = booking.source === "MARKETPLACE" ? Math.round(booking.amountCents * 0.08) : 0; const boat = state.boats.find((item) => item.id === booking.boatId); return <button key={booking.id} onClick={() => onOpenBooking(booking.id)} className="grid w-full gap-3 rounded-2xl border border-[#DEE5E8] p-4 text-left transition hover:border-[#14B8A6] sm:grid-cols-[1.1fr_0.8fr_0.7fr_auto] sm:items-center"><div><p className="font-semibold">{booking.reference}</p><p className="mt-1 text-xs text-[#64748B]">{boat?.name} · {booking.source === "MARKETPLACE" ? "Marketplace" : "Diretta"}</p></div><div><p className="text-xs text-[#64748B]">Lordo</p><p className="mt-1 font-semibold">{money(booking.amountCents)}</p></div><div><p className="text-xs text-[#64748B]">Commissione</p><p className="mt-1 font-semibold">{money(fee)}</p></div><StatusBadge kind="MATCHED">MATCHED</StatusBadge></button>; })}</div></section><section className="grid gap-4 md:grid-cols-2"><article className="rounded-3xl bg-[#0B1F33] p-6 text-white"><p className="text-xs font-bold uppercase tracking-[0.08em] text-[#5EEAD4]">Composizione</p><div className="mt-5 flex items-end justify-between"><p className="text-3xl font-semibold">{gross ? Math.round((operatorNet / gross) * 100) : 0}%</p><p className="text-sm text-white/60">all&apos;operatore</p></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-[#2DD4BF]" style={{ width: `${gross ? (operatorNet / gross) * 100 : 0}%` }} /></div></article><article className="rounded-3xl border border-[#DEE5E8] bg-white p-6"><p className="text-xs font-bold uppercase tracking-[0.08em] text-[#64748B]">Circuito demo</p><p className="mt-3 font-semibold">Nessun movimento bancario</p><p className="mt-2 text-sm leading-6 text-[#64748B]">I valori reagiscono agli stati delle prenotazioni, ma non chiamano Stripe e non generano payout reali.</p></article></section></div>;
}

function Toast({ message }: { message: string }) {
  return <div className="fixed bottom-24 left-1/2 z-[60] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl bg-[#0B1F33] px-4 py-3 text-center text-sm font-semibold text-white shadow-xl sm:bottom-6">{message}</div>;
}

export default function DemoManagementApp() {
  const mounted = useSyncExternalStore(subscribeToBrowser, () => true, () => false);
  const [state, setState] = useState<DemoState>(initialBrowserState);
  const [view, setView] = useState<DemoView>("dashboard");
  const [newBookingOpen, setNewBookingOpen] = useState(false);
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
    setNewBookingOpen(false); setToast("Prenotazione aggiunta al workspace demo"); setView("prenotazioni");
  }

  function updateBooking(status: DemoBookingStatus, notes: string) {
    if (!selectedBooking) return;
    setState((current) => ({ ...current, bookings: current.bookings.map((item) => item.id === selectedBooking.id ? { ...item, status, notes } : item), activity: withActivity(current, "Prenotazione aggiornata", `${selectedBooking.reference} · ${BOOKING_LABELS[status]}`) }));
    setSelectedBookingId(null); setToast("Stato, agenda e finanza aggiornati");
  }

  function updateBoat(boat: DemoBoat) {
    setState((current) => ({ ...current, boats: current.boats.map((item) => item.id === boat.id ? boat : item), activity: withActivity(current, "Flotta aggiornata", `${boat.name} · ${BOAT_LABELS[boat.status]}`) }));
    setSelectedBoatId(null); setToast("Disponibilità della flotta aggiornata");
  }

  function updateCustomer(notes: string) {
    if (!selectedCustomer) return;
    setState((current) => ({ ...current, customers: current.customers.map((item) => item.id === selectedCustomer.id ? { ...item, notes } : item), activity: withActivity(current, "CRM aggiornato", selectedCustomer.name) }));
    setSelectedCustomerId(null); setToast("Note cliente salvate");
  }

  function resetDemo() {
    if (!window.confirm("Ripristinare tutti i dati iniziali della demo? Le modifiche fatte su questo dispositivo verranno eliminate.")) return;
    setState(freshDemoState()); setView("dashboard"); setToast("Workspace demo ripristinato");
  }

  if (!mounted) {
    return <main className="grid min-h-screen place-items-center bg-[#EEF3F2] px-6 text-center text-[#0B1F33]"><div><p className="text-sm font-semibold text-[#14B8A6]">Boatly gestionale</p><h1 className="mt-2 text-2xl font-semibold">Preparazione workspace demo…</h1></div></main>;
  }

  return (
    <main className="min-h-screen bg-[#EEF3F2] pb-24 text-[#0B1F33] lg:pb-0">
      <header className="sticky top-0 z-30 border-b border-[#DEE5E8] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="min-w-0"><Link href="/" className="text-xl font-bold tracking-tight">Boatly</Link><p className="truncate text-[11px] text-[#64748B]">Gestionale interattivo · MareVivo Charter</p></div>
          <div className="flex items-center gap-2"><span className="hidden rounded-full bg-[#CCFBF1] px-3 py-1.5 text-xs font-semibold text-[#0F766E] sm:inline-flex">Demo isolata · modifiche locali</span><button className="min-h-11 rounded-xl px-3 text-xs font-semibold text-[#64748B] hover:bg-[#F1F5F4]" onClick={resetDemo}>Ripristina</button><Link href="/" className="grid min-h-11 place-items-center rounded-xl bg-[#0B1F33] px-3 text-xs font-semibold text-white sm:px-4 sm:text-sm">Esci</Link></div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] lg:grid-cols-[248px_1fr]">
        <aside className="hidden min-h-[calc(100vh-69px)] border-r border-[#DEE5E8] bg-white p-5 lg:block"><div className="rounded-2xl bg-[#0B1F33] p-4 text-white"><p className="text-xs font-bold uppercase tracking-[0.08em] text-[#5EEAD4]">Workspace demo</p><p className="mt-2 font-semibold">MareVivo Charter</p><p className="mt-1 text-xs text-white/60">Napoli · {state.boats.length} imbarcazioni</p></div><nav className="mt-5 space-y-1" aria-label="Sezioni gestionale">{VIEWS.map((item) => <button key={item.id} onClick={() => setView(item.id)} aria-current={view === item.id ? "page" : undefined} className={classNames("w-full rounded-xl px-4 py-3 text-left transition", view === item.id ? "bg-[#CCFBF1] text-[#0F766E]" : "text-[#475569] hover:bg-[#F1F5F4]")}><span className="block text-sm font-semibold">{item.label}</span><span className="mt-0.5 block text-xs opacity-70">{item.note}</span></button>)}</nav><div className="mt-6 rounded-2xl border border-[#DEE5E8] p-4 text-xs leading-5 text-[#64748B]"><strong className="text-[#0B1F33]">Circuito chiuso.</strong><br />Le modifiche restano solo su questo browser e non raggiungono dati, clienti o pagamenti reali.</div></aside>

        <div className="min-w-0 p-4 sm:p-6 lg:p-8">
          <section className="mb-5 flex flex-col gap-4 sm:mb-6 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold text-[#14B8A6]">{selectedView.note}</p><h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">{selectedView.label}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[#64748B]">Prova le operazioni quotidiane: ogni modifica aggiorna tutte le sezioni del gestionale.</p></div><div className="rounded-2xl border border-[#DEE5E8] bg-white px-4 py-3 text-xs text-[#64748B] sm:text-sm"><span className="inline-block h-2 w-2 rounded-full bg-[#14B8A6]" /> <strong className="ml-1 text-[#0B1F33]">Dati salvati sul dispositivo</strong></div></section>

          {view === "dashboard" ? <DashboardView state={state} onNavigate={setView} onNewBooking={() => setNewBookingOpen(true)} onOpenBooking={setSelectedBookingId} /> : null}
          {view === "prenotazioni" ? <BookingsView state={state} onNewBooking={() => setNewBookingOpen(true)} onOpenBooking={setSelectedBookingId} /> : null}
          {view === "flotta" ? <FleetView state={state} onEditBoat={setSelectedBoatId} /> : null}
          {view === "clienti" ? <CustomersView state={state} onOpenCustomer={setSelectedCustomerId} /> : null}
          {view === "finanza" ? <FinanceView state={state} onOpenBooking={setSelectedBookingId} /> : null}
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-[#D7E0E2] bg-white/95 px-1 pb-[max(0.4rem,env(safe-area-inset-bottom))] pt-1 backdrop-blur lg:hidden" aria-label="Navigazione mobile gestionale">{VIEWS.map((item) => <button key={item.id} onClick={() => setView(item.id)} className={classNames("min-h-14 rounded-xl px-1 text-[10px] font-semibold", view === item.id ? "bg-[#CCFBF1] text-[#0F766E]" : "text-[#64748B]")}><span className="mx-auto mb-1 block h-1.5 w-1.5 rounded-full bg-current" />{item.short}</button>)}</nav>

      {newBookingOpen ? <Modal title="Nuova prenotazione" eyebrow="Agenda operativa" onClose={() => setNewBookingOpen(false)} wide><BookingForm state={state} onSave={addBooking} onClose={() => setNewBookingOpen(false)} /></Modal> : null}
      {selectedBooking ? <Modal title={selectedBooking.reference} eyebrow="Dettaglio prenotazione" onClose={() => setSelectedBookingId(null)}><BookingDetail booking={selectedBooking} boat={state.boats.find((item) => item.id === selectedBooking.boatId)} customer={state.customers.find((item) => item.id === selectedBooking.customerId)} onUpdate={updateBooking} onClose={() => setSelectedBookingId(null)} /></Modal> : null}
      {selectedBoat ? <Modal title={selectedBoat.name} eyebrow="Gestione flotta" onClose={() => setSelectedBoatId(null)}><BoatEditor boat={selectedBoat} onSave={updateBoat} onClose={() => setSelectedBoatId(null)} /></Modal> : null}
      {selectedCustomer ? <Modal title={selectedCustomer.name} eyebrow="Scheda cliente" onClose={() => setSelectedCustomerId(null)} wide><CustomerDetail customer={selectedCustomer} state={state} onSave={updateCustomer} onOpenBooking={(id) => { setSelectedCustomerId(null); setSelectedBookingId(id); }} onClose={() => setSelectedCustomerId(null)} /></Modal> : null}
      {toast ? <Toast message={toast} /> : null}
    </main>
  );
}
