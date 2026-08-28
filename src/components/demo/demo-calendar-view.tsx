"use client";

import { useState } from "react";

import type { DemoState } from "@/lib/demo/types";

const START_DATE = "2026-08-28T12:00:00";

function calendarDates() {
  return Array.from({ length: 14 }, (_, index) => {
    const date = new Date(START_DATE);
    date.setDate(date.getDate() + index);
    return date;
  });
}

const CALENDAR_DATES = calendarDates();

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function dayLabel(date: Date) {
  return new Intl.DateTimeFormat("it-IT", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(date);
}

function fullDayLabel(value: string) {
  return new Intl.DateTimeFormat("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

function time(value: string) {
  return new Intl.DateTimeFormat("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

type DemoCalendarViewProps = {
  state: DemoState;
  onOpenBooking: (id: string) => void;
  onOpenBoat: (id: string) => void;
  onNewBooking: (date: string, boatId?: string) => void;
  onAddBoat: () => void;
};

export function DemoCalendarView({ state, onOpenBooking, onOpenBoat, onNewBooking, onAddBoat }: DemoCalendarViewProps) {
  const dates = CALENDAR_DATES;
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const selectedBookings = selectedDate
    ? state.bookings.filter((booking) => booking.startAt.startsWith(selectedDate) && booking.status !== "CANCELLED")
    : [];

  return (
    <div className="space-y-5">
      <section className="rounded-3xl bg-[#171A2B] p-5 text-white shadow-sm sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#FDBA74]">Control room</p>
            <h2 className="mt-2 text-2xl font-semibold">Calendario operativo</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/65">Apri un giorno per gestire prenotazioni, disponibilità e schede delle imbarcazioni senza cambiare sezione.</p>
          </div>
          <button onClick={() => onNewBooking(isoDate(dates[0]))} disabled={state.boats.length === 0} className="min-h-11 rounded-xl bg-[#6D5DFB] px-5 text-sm font-semibold text-white disabled:opacity-40">+ Nuova prenotazione</button>
        </div>
      </section>

      {state.boats.length === 0 ? (
        <section className="rounded-3xl border border-dashed border-[#B8B2D7] bg-white p-10 text-center">
          <p className="text-xl font-semibold">Aggiungi una barca per attivare il calendario</p>
          <p className="mt-2 text-sm text-[#676B80]">Il calendario si popolerà automaticamente con disponibilità e prenotazioni.</p>
          <button className="mt-5 min-h-11 rounded-xl bg-[#171A2B] px-5 text-sm font-semibold text-white" onClick={onAddBoat}>Aggiungi la prima barca</button>
        </section>
      ) : (
        <section className="rounded-3xl border border-[#E2DFEB] bg-white p-4 shadow-sm sm:p-6">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {dates.map((date) => {
              const value = isoDate(date);
              const bookings = state.bookings.filter((booking) => booking.startAt.startsWith(value) && booking.status !== "CANCELLED");
              const bookedBoats = new Set(bookings.map((booking) => booking.boatId)).size;
              const selected = selectedDate === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSelectedDate(selected ? null : value)}
                  aria-pressed={selected}
                  className={`min-h-28 rounded-2xl border p-3 text-left transition ${selected ? "border-[#6D5DFB] bg-[#EDE9FE] ring-2 ring-[#6D5DFB]/15" : "border-[#E2DFEB] hover:border-[#8B7CF6] hover:bg-[#F8F7FC]"}`}
                >
                  <span className="block text-xs font-bold uppercase tracking-wide text-[#676B80]">{dayLabel(date)}</span>
                  <span className="mt-4 block text-2xl font-semibold">{bookedBoats}</span>
                  <span className="mt-1 block text-xs text-[#676B80]">{bookedBoats === 1 ? "barca prenotata" : "barche prenotate"}</span>
                  <span className="mt-2 block text-[11px] font-semibold text-[#5B4FD6]">Apri giornata →</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {selectedDate ? (
        <section className="rounded-3xl border border-[#B8B2D7] bg-[#F8F7FC] p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.09em] text-[#6D5DFB]">Giornata selezionata</p>
              <h3 className="mt-1 text-2xl font-semibold capitalize">{fullDayLabel(selectedDate)}</h3>
              <p className="mt-2 text-sm text-[#676B80]">{selectedBookings.length} prenotazioni · {Math.max(0, state.boats.length - new Set(selectedBookings.map((item) => item.boatId)).size)} barche libere</p>
            </div>
            <button className="min-h-11 rounded-xl bg-[#171A2B] px-5 text-sm font-semibold text-white" onClick={() => onNewBooking(selectedDate)}>+ Prenotazione per questo giorno</button>
          </div>

          <div className="mt-5 grid gap-3">
            {state.boats.map((boat) => {
              const booking = selectedBookings.find((item) => item.boatId === boat.id);
              return (
                <article key={boat.id} className="grid gap-4 rounded-2xl border border-[#E2DFEB] bg-white p-4 lg:grid-cols-[1.1fr_1fr_auto] lg:items-center">
                  <div>
                    <p className="font-semibold">{boat.name}</p>
                    <p className="mt-1 text-xs text-[#676B80]">{boat.type || "Tipologia da definire"} · {boat.base || "Base da definire"}</p>
                  </div>
                  {booking ? <div><span className="inline-flex rounded-full bg-[#FFF0D6] px-2.5 py-1 text-xs font-bold text-[#A14B08]">PRENOTATA</span><p className="mt-2 text-sm font-semibold">{time(booking.startAt)}–{time(booking.endAt)} · {booking.reference}</p></div> : <div><span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">DISPONIBILE</span><p className="mt-2 text-xs text-[#676B80]">Nessuna prenotazione attiva</p></div>}
                  <div className="grid grid-cols-2 gap-2 lg:min-w-[310px]">
                    <button className="min-h-11 rounded-xl border border-[#D8D5E5] px-3 text-xs font-semibold hover:bg-[#F4F2FA]" onClick={() => onOpenBoat(boat.id)}>Gestisci barca</button>
                    {booking ? <button className="min-h-11 rounded-xl bg-[#6D5DFB] px-3 text-xs font-semibold text-white" onClick={() => onOpenBooking(booking.id)}>Gestisci booking</button> : <button className="min-h-11 rounded-xl bg-[#171A2B] px-3 text-xs font-semibold text-white" onClick={() => onNewBooking(selectedDate, boat.id)}>+ Prenota</button>}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}
