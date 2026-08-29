"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import CalendarBookingForm from "@/components/operator/calendar-booking-form";
import {
  CalendarCancelBookingForm,
  CalendarDayBlockForm,
  CalendarReleaseBlockForm,
} from "@/components/operator/calendar-cell-actions";
import CustomerForm from "@/components/operator/customer-form";
import RescheduleBookingForm from "@/components/operator/reschedule-booking-form";

export type ScheduleDay = {
  key: string;
  start: string;
  end: string;
  dayNumber: string;
  weekday: string;
  month: string;
  weekend: boolean;
  today: boolean;
};

export type ScheduleBoat = {
  id: string;
  name: string;
  status: string;
  detail: string;
  passengerLimit: number | null;
};

export type ScheduleItem = {
  id: string;
  boatId: string;
  kind: "BOOKING" | "BLOCK";
  bookingId: string | null;
  source: string | null;
  occupancyId: string | null;
  startsAt: string;
  endsAt: string;
  status: string;
  rawStatus: string;
  title: string;
  subtitle: string | null;
  reference: string | null;
  customer: string | null;
  passengers: number | null;
  notes: string | null;
  operatorCustomerId: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  customerCountryCode: string | null;
  customerDateOfBirth: string | null;
  customerNotes: string | null;
  legalOfferingId: string | null;
  pickupLocationId: string | null;
  startsAtLocal: string | null;
  endsAtLocal: string | null;
  total: string | null;
};

type OperatorScheduleProps = {
  operatorId: string;
  timezone: string;
  days: ScheduleDay[];
  boats: ScheduleBoat[];
  items: ScheduleItem[];
  offerings: Array<{ id: string; boatId: string; label: string }>;
  customers: Array<{ id: string; name: string; email: string | null; phone: string | null }>;
  locations: Array<{ id: string; label: string }>;
  canManageFleet: boolean;
};

type SelectedCell = {
  boatId: string;
  dayKey: string;
};

function timeLabel(value: string, timezone: string) {
  return new Intl.DateTimeFormat("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  }).format(new Date(value));
}

function longDateLabel(dayKey: string) {
  const [year, month, day] = dayKey.split("-").map(Number);
  return new Intl.DateTimeFormat("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function overlapsDay(item: ScheduleItem, day: ScheduleDay) {
  const itemStart = new Date(item.startsAt).getTime();
  const itemEnd = new Date(item.endsAt).getTime();
  const dayStart = new Date(day.start).getTime();
  const dayEnd = new Date(day.end).getTime();

  return Number.isFinite(itemStart)
    && Number.isFinite(itemEnd)
    && itemStart < dayEnd
    && itemEnd > dayStart;
}

function cellKey(boatId: string, dayKey: string) {
  return `${boatId}:${dayKey}`;
}

function cellAppearance(items: ScheduleItem[], active: boolean) {
  if (!active && items.length === 0) {
    return {
      label: "Non attiva",
      className: "bg-[#F1F0F6] text-[#8B8798]",
    };
  }

  const bookings = items.filter((item) => item.kind === "BOOKING");
  if (bookings.length > 0) {
    return {
      label: bookings.length === 1 ? "Prenotata" : `${bookings.length} prenotazioni`,
      className: "bg-emerald-100 text-emerald-900 ring-1 ring-inset ring-emerald-300",
    };
  }

  if (items.length > 0) {
    return {
      label: items.length === 1 ? "Blocco" : `${items.length} blocchi`,
      className: "bg-rose-100 text-rose-900 ring-1 ring-inset ring-rose-300",
    };
  }

  return {
    label: "Libera",
    className: "bg-white text-[#A19CAB] hover:bg-[#F7F6FB] hover:text-[#4C3FC2]",
  };
}

export default function OperatorSchedule({
  operatorId,
  timezone,
  days,
  boats,
  items,
  offerings,
  customers,
  locations,
  canManageFleet,
}: OperatorScheduleProps) {
  const [selected, setSelected] = useState<SelectedCell | null>(null);

  const itemsByCell = useMemo(() => {
    const result = new Map<string, ScheduleItem[]>();
    const daysByOverlap = new Map<string, ScheduleDay[]>();

    for (const item of items) {
      let overlappingDays = daysByOverlap.get(item.id);
      if (!overlappingDays) {
        overlappingDays = days.filter((day) => overlapsDay(item, day));
        daysByOverlap.set(item.id, overlappingDays);
      }

      for (const day of overlappingDays) {
        const key = cellKey(item.boatId, day.key);
        const current = result.get(key);
        if (current) current.push(item);
        else result.set(key, [item]);
      }
    }

    return result;
  }, [days, items]);

  const selectedBoat = selected
    ? boats.find((boat) => boat.id === selected.boatId) ?? null
    : null;
  const selectedDay = selected
    ? days.find((day) => day.key === selected.dayKey) ?? null
    : null;
  const selectedItems = selected
    ? itemsByCell.get(cellKey(selected.boatId, selected.dayKey)) ?? []
    : [];
  const selectedBoatIsActive = selectedBoat?.status === "ACTIVE";

  return (
    <>
      <div className="max-h-[70vh] overflow-auto overscroll-contain">
        <table className="min-w-max border-separate border-spacing-0 text-left">
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-40 w-44 min-w-44 border-b border-r border-[#D8D5E5] bg-[#211D3A] px-4 py-3 text-xs font-bold uppercase tracking-[0.08em] text-white sm:w-56 sm:min-w-56">
                Imbarcazione
              </th>
              {days.map((day) => (
                <th
                  key={day.key}
                  scope="col"
                  className={`sticky top-0 z-30 w-[86px] min-w-[86px] border-b border-r border-[#D8D5E5] px-2 py-2 text-center ${
                    day.today
                      ? "bg-[#6D5DFB] text-white"
                      : day.weekend
                        ? "bg-[#F0EEFF] text-[#4C3FC2]"
                        : "bg-white text-[#4A4758]"
                  }`}
                >
                  <span className="block text-[10px] font-bold uppercase tracking-wide">
                    {day.weekday}
                  </span>
                  <span className="mt-0.5 block text-lg font-semibold leading-none">
                    {day.dayNumber}
                  </span>
                  <span className="mt-1 block text-[9px] font-semibold uppercase">
                    {day.month}
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {boats.map((boat) => {
              const active = boat.status === "ACTIVE";
              return (
                <tr key={boat.id}>
                  <th
                    scope="row"
                    className="sticky left-0 z-20 w-44 min-w-44 border-b border-r border-[#D8D5E5] bg-white px-4 py-3 align-middle shadow-[5px_0_10px_-10px_rgba(23,26,43,0.65)] sm:w-56 sm:min-w-56"
                  >
                    <Link
                      href={`/operator/fleet/${boat.id}?operator=${operatorId}`}
                      className="block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[#6D5DFB]"
                    >
                      <span className="block truncate text-sm font-semibold text-[#171A2B]">
                        {boat.name}
                      </span>
                      <span className="mt-1 block truncate text-[10px] text-[#777285]">
                        {boat.detail}
                      </span>
                      <span
                        className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold ${
                          active
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-[#F1F0F6] text-[#777285]"
                        }`}
                      >
                        {active ? "DISPONIBILE" : "NON DISPONIBILE"}
                      </span>
                    </Link>
                  </th>

                  {days.map((day) => {
                    const cellItems = itemsByCell.get(cellKey(boat.id, day.key)) ?? [];
                    const appearance = cellAppearance(cellItems, active);
                    const firstItem = cellItems[0];

                    return (
                      <td
                        key={day.key}
                        className={`h-[82px] w-[86px] min-w-[86px] border-b border-r border-[#E8E5EF] p-1 align-middle ${
                          day.weekend ? "bg-[#FAF9FF]" : "bg-white"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setSelected({ boatId: boat.id, dayKey: day.key })}
                          aria-label={`${boat.name}, ${longDateLabel(day.key)}: ${appearance.label}`}
                          className={`flex h-full min-h-[70px] w-full flex-col items-center justify-center rounded-xl px-1.5 py-2 text-center text-[10px] font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6D5DFB] ${appearance.className}`}
                        >
                          <span>{appearance.label}</span>
                          {firstItem ? (
                            <>
                              {firstItem.kind === "BOOKING" ? (
                                <span className="mt-1 max-w-full truncate text-[9px] font-semibold leading-3 opacity-90">
                                  {firstItem.title}
                                </span>
                              ) : null}
                              {firstItem.notes ? (
                                <span className="mt-1 max-w-full truncate text-[9px] font-medium leading-3 opacity-80">
                                  {firstItem.notes}
                                </span>
                              ) : firstItem.kind === "BOOKING" ? (
                                <span className="mt-1 max-w-full truncate text-[9px] font-medium opacity-80">
                                  {timeLabel(firstItem.startsAt, timezone)}
                                </span>
                              ) : null}
                            </>
                          ) : null}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selected && selectedBoat && selectedDay ? (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-[#111225]/55 p-0 backdrop-blur-[2px] sm:items-center sm:p-5"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setSelected(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="schedule-cell-title"
            className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-2xl sm:rounded-3xl sm:p-7"
          >
            <div className="flex items-start justify-between gap-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#6D5DFB]">
                  Planning flotta
                </p>
                <h2 id="schedule-cell-title" className="mt-2 text-2xl font-semibold text-[#171A2B]">
                  {selectedBoat.name}
                </h2>
                <p className="mt-1 capitalize text-sm text-[#676B80]">
                  {longDateLabel(selectedDay.key)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="Chiudi dettaglio"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#F1F0F6] text-xl text-[#4A4758] hover:bg-[#E7E4EF]"
              >
                ×
              </button>
            </div>

            <div className="mt-6 space-y-4">
              {selectedItems.length === 0 ? (
                <>
                  <div className={`rounded-2xl border p-5 ${selectedBoatIsActive ? "border-emerald-200 bg-emerald-50" : "border-[#D8D5E5] bg-[#F7F6FB]"}`}>
                    <p className={`font-semibold ${selectedBoatIsActive ? "text-emerald-800" : "text-[#4A4758]"}`}>
                      {selectedBoatIsActive ? "Barca libera per l’intera giornata" : "Barca non disponibile"}
                    </p>
                    <p className="mt-1 text-sm text-[#676B80]">
                      {selectedBoatIsActive
                        ? "Crea qui la prenotazione oppure rendi la barca non disponibile per questa giornata."
                        : "Rendi disponibile la barca dalla Flotta prima di prenotarla."}
                    </p>
                  </div>

                  {selectedBoatIsActive ? (
                    <details open className="rounded-2xl border border-[#C8C0FF] bg-white p-4">
                      <summary className="cursor-pointer text-base font-semibold text-[#4C3FC2]">+ Crea prenotazione</summary>
                      <div className="mt-4 border-t border-[#ECEAF1] pt-4">
                        <CalendarBookingForm
                          operatorId={operatorId}
                          boatId={selectedBoat.id}
                          dayKey={selectedDay.key}
                          passengerLimit={selectedBoat.passengerLimit}
                          offerings={offerings.filter((offering) => offering.boatId === selectedBoat.id)}
                          customers={customers}
                        />
                      </div>
                    </details>
                  ) : null}

                  {selectedBoatIsActive && canManageFleet ? (
                    <details className="rounded-2xl border border-[#D8D5E5] bg-white p-4">
                      <summary className="cursor-pointer text-base font-semibold text-[#4A4758]">Rendi non disponibile</summary>
                      <div className="mt-4 border-t border-[#ECEAF1] pt-4">
                        <CalendarDayBlockForm operatorId={operatorId} boatId={selectedBoat.id} dayKey={selectedDay.key} />
                      </div>
                    </details>
                  ) : null}
                </>
              ) : (
                selectedItems.map((item) => (
                  <article
                    key={item.id}
                    className={`rounded-2xl border p-4 ${
                      item.kind === "BOOKING"
                        ? "border-emerald-300 bg-emerald-50"
                        : "border-rose-300 bg-rose-50"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-[#676B80]">
                          {item.kind === "BOOKING" ? "Prenotazione" : "Indisponibilità"}
                        </p>
                        <h3 className="mt-1 font-semibold text-[#171A2B]">{item.title}</h3>
                        {item.subtitle ? <p className="mt-1 text-sm text-[#676B80]">{item.subtitle}</p> : null}
                      </div>
                      <span className="rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-bold text-[#4A4758]">
                        {item.status}
                      </span>
                    </div>

                    <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                      <div>
                        <dt className="text-xs text-[#777285]">Inizio</dt>
                        <dd className="mt-0.5 font-semibold">{timeLabel(item.startsAt, timezone)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-[#777285]">Fine</dt>
                        <dd className="mt-0.5 font-semibold">{timeLabel(item.endsAt, timezone)}</dd>
                      </div>
                      {item.reference ? (
                        <div>
                          <dt className="text-xs text-[#777285]">Riferimento</dt>
                          <dd className="mt-0.5 truncate font-semibold">{item.reference}</dd>
                        </div>
                      ) : null}
                      {item.passengers !== null ? (
                        <div>
                          <dt className="text-xs text-[#777285]">Passeggeri</dt>
                          <dd className="mt-0.5 font-semibold">{item.passengers}</dd>
                        </div>
                      ) : null}
                    </dl>

                    {item.notes ? <p className="mt-3 rounded-xl bg-white/70 p-3 text-sm text-[#4A4758]">{item.notes}</p> : null}

                    {item.kind === "BLOCK" && item.occupancyId && canManageFleet ? (
                      <CalendarReleaseBlockForm operatorId={operatorId} boatId={selectedBoat.id} occupancyId={item.occupancyId} />
                    ) : null}

                    {item.bookingId ? (
                      <div className="mt-4 space-y-3 border-t border-black/10 pt-4">
                        {item.operatorCustomerId ? (
                          <details className="rounded-xl bg-white/80 p-3">
                            <summary className="cursor-pointer text-sm font-semibold text-[#4C3FC2]">Modifica cliente</summary>
                            <div className="mt-4 border-t border-[#ECEAF1] pt-4">
                              <CustomerForm
                                operatorId={operatorId}
                                calendarMode
                                customer={{
                                  id: item.operatorCustomerId,
                                  displayName: item.customer ?? "Cliente",
                                  email: item.customerEmail,
                                  phone: item.customerPhone,
                                  countryCode: item.customerCountryCode,
                                  dateOfBirth: item.customerDateOfBirth,
                                  notes: item.customerNotes,
                                }}
                              />
                            </div>
                          </details>
                        ) : null}

                        {item.source === "MANUAL" && item.rawStatus === "CONFIRMED" && item.legalOfferingId && item.pickupLocationId && item.startsAtLocal && item.endsAtLocal && item.total !== null ? (
                          <details className="rounded-xl bg-white/80 p-3">
                            <summary className="cursor-pointer text-sm font-semibold text-[#4C3FC2]">Cambia barca, giorno o orario</summary>
                            <RescheduleBookingForm
                              operatorId={operatorId}
                              bookingId={item.bookingId}
                              calendarMode
                              boats={boats.filter((boat) => boat.status === "ACTIVE").map((boat) => ({ id: boat.id, name: boat.name, passengerLimit: boat.passengerLimit }))}
                              offerings={offerings}
                              locations={locations}
                              initial={{
                                boatId: item.boatId,
                                offeringId: item.legalOfferingId,
                                locationId: item.pickupLocationId,
                                startsAtLocal: item.startsAtLocal,
                                endsAtLocal: item.endsAtLocal,
                                passengerCount: item.passengers ?? 1,
                                total: item.total,
                                operatorNote: item.notes ?? "",
                              }}
                            />
                          </details>
                        ) : null}

                        {item.source === "MANUAL" ? (
                          <div className="rounded-xl bg-white/80 p-3">
                            <CalendarCancelBookingForm operatorId={operatorId} bookingId={item.bookingId} />
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </article>
                ))
              )}
            </div>

            <div className="mt-6 grid gap-3 border-t border-[#ECEAF1] pt-5 sm:grid-cols-2">
              <Link
                href={`/operator/fleet/${selectedBoat.id}?operator=${operatorId}`}
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[#D8D5E5] px-4 text-center text-sm font-semibold text-[#171A2B] hover:bg-[#F7F6FB]"
              >
                {canManageFleet ? "Gestisci barca" : "Vedi barca"}
              </Link>
              <button type="button" onClick={() => setSelected(null)} className="min-h-12 rounded-xl bg-[#171A2B] px-4 text-sm font-semibold text-white">Chiudi</button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
