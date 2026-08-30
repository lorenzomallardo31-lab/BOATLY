"use client";

import { useMemo, useState } from "react";

import {
  CalendarMarkDepartedForm,
  CalendarMarkReturnedForm,
} from "@/components/operator/calendar-cell-actions";
import type {
  ScheduleBoat,
  ScheduleDay,
  ScheduleItem,
} from "@/components/operator/operator-schedule";
import {
  buildTodayDashboard,
  type TodayDashboardEvent,
  type TodayDashboardEventGroup,
} from "@/lib/operator/today-dashboard";

type MetricKey = "BOOKINGS" | "BLOCKS" | "CUSTOMERS" | "MISSING_PHONE";
type DashboardPanel =
  | { kind: "GROUP"; groupId: string }
  | { kind: "METRIC"; metric: MetricKey };

type OperatorTodayDashboardProps = {
  operatorId: string;
  today: ScheduleDay;
  boats: ScheduleBoat[];
  items: ScheduleItem[];
  timezone: string;
  onOpenCell: (boatId: string) => void;
};

const interactiveClass = "cursor-pointer transition duration-150 hover:-translate-y-0.5 hover:ring-2 hover:ring-[#AFA5FF]/55 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8C0FF] active:translate-y-0 active:scale-[0.985]";

const eventLabels = {
  DEPARTURE: "Partenza da confermare",
  RETURN: "Rientro",
  RETURNED: "Rientrata",
  IN_USE: "In navigazione",
  BLOCK: "Non disponibile",
} as const;

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

function plural(count: number, singular: string, pluralLabel: string) {
  return `${count} ${count === 1 ? singular : pluralLabel}`;
}

function groupHeadline(group: TodayDashboardEventGroup) {
  const counts = group.events.reduce<Record<TodayDashboardEvent["kind"], number>>(
    (result, event) => {
      result[event.kind] += 1;
      return result;
    },
    { DEPARTURE: 0, RETURN: 0, RETURNED: 0, IN_USE: 0, BLOCK: 0 },
  );
  const parts = [
    counts.DEPARTURE ? plural(counts.DEPARTURE, "partenza", "partenze") : null,
    counts.RETURN ? plural(counts.RETURN, "rientro", "rientri") : null,
    counts.RETURNED ? plural(counts.RETURNED, "rientrata", "rientrate") : null,
    counts.IN_USE ? plural(counts.IN_USE, "barca in navigazione", "barche in navigazione") : null,
    counts.BLOCK ? plural(counts.BLOCK, "indisponibilità", "indisponibilità") : null,
  ].filter(Boolean);
  return parts.join(" · ");
}

function eventTone(group: TodayDashboardEventGroup) {
  const kinds = new Set(group.events.map((event) => event.kind));
  if (kinds.size === 1 && kinds.has("BLOCK")) {
    return "border-rose-300/25 bg-rose-300/10 hover:bg-rose-300/15";
  }
  if (kinds.size === 1 && kinds.has("IN_USE")) {
    return "border-sky-300/25 bg-sky-300/10 hover:bg-sky-300/15";
  }
  if (kinds.size === 1 && kinds.has("RETURNED")) {
    return "border-teal-300/25 bg-teal-300/10 hover:bg-teal-300/15";
  }
  return "border-emerald-300/20 bg-emerald-300/10 hover:bg-emerald-300/15";
}

function DashboardModal({
  panel,
  overview,
  itemById,
  boatById,
  operatorId,
  timezone,
  onClose,
  onOpenCell,
}: {
  panel: DashboardPanel;
  overview: ReturnType<typeof buildTodayDashboard>;
  itemById: Map<string, ScheduleItem>;
  boatById: Map<string, ScheduleBoat>;
  operatorId: string;
  timezone: string;
  onClose: () => void;
  onOpenCell: (boatId: string) => void;
}) {
  const selectedGroup = panel.kind === "GROUP"
    ? overview.eventGroups.find((group) => group.id === panel.groupId)
    : null;
  const metricItems = panel.kind === "METRIC"
    ? panel.metric === "BLOCKS"
      ? overview.blocks
      : panel.metric === "MISSING_PHONE"
        ? overview.bookings.filter((booking) => !booking.customerPhone)
        : overview.bookings
    : [];
  const metricTitles: Record<MetricKey, string> = {
    BOOKINGS: "Prenotazioni di oggi",
    BLOCKS: "Barche non disponibili",
    CUSTOMERS: "Clienti di oggi",
    MISSING_PHONE: "Contatti da completare",
  };
  const title = panel.kind === "GROUP"
    ? selectedGroup
      ? `Impegni delle ${timeLabel(selectedGroup.at, timezone)}`
      : "Impegno completato"
    : metricTitles[panel.metric];

  const openCell = (boatId: string) => {
    onClose();
    onOpenCell(boatId);
  };

  return (
    <div
      className="fixed inset-0 z-[95] flex items-end justify-center bg-[#0F1021]/65 p-0 backdrop-blur-[3px] sm:items-center sm:p-5"
      role="presentation"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="today-dashboard-panel-title"
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 text-[#171A2B] shadow-2xl sm:max-w-3xl sm:rounded-3xl sm:p-7"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#6D5DFB]">
              Cruscotto operativo · Oggi
            </p>
            <h2 id="today-dashboard-panel-title" className="mt-1 text-2xl font-semibold">
              {title}
            </h2>
            <p className="mt-1 text-sm text-[#676B80]">
              {panel.kind === "GROUP"
                ? "Tutto ciò che accade alla stessa ora è riunito qui."
                : "Seleziona una voce per aprirla direttamente nel calendario."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Chiudi pannello"
            className={`grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#F1F0F6] text-xl text-[#4A4758] hover:bg-[#E7E4EF] ${interactiveClass}`}
          >
            ×
          </button>
        </div>

        <div className="mt-6 space-y-3">
          {panel.kind === "GROUP" ? (
            selectedGroup && selectedGroup.events.length > 0 ? (
              selectedGroup.events.map((event) => {
                const item = itemById.get(event.itemId);
                const boat = boatById.get(event.boatId);
                if (!item) return null;
                const pendingDeparture = event.kind === "DEPARTURE"
                  && item.rawStatus === "CONFIRMED"
                  && Boolean(item.bookingId);
                const pendingReturn = event.kind === "RETURN"
                  && item.rawStatus === "IN_PROGRESS"
                  && Boolean(item.bookingId);
                return (
                  <article
                    key={event.id}
                    className={`rounded-2xl border p-4 ${
                      event.kind === "BLOCK"
                        ? "border-rose-200 bg-rose-50"
                        : event.kind === "IN_USE"
                          ? "border-sky-200 bg-sky-50"
                          : event.kind === "RETURNED"
                            ? "border-teal-300 bg-teal-50"
                          : "border-emerald-200 bg-emerald-50"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-[#676B80]">
                          {eventLabels[event.kind]}
                        </p>
                        <h3 className="mt-1 text-lg font-semibold">{boat?.name ?? "Imbarcazione"}</h3>
                        <p className="mt-1 text-sm text-[#4A4758]">
                          {item.kind === "BOOKING"
                            ? `${item.customer ?? "Cliente"} · ${item.passengers ?? 1} pax`
                            : item.notes || item.title || "Indisponibilità"}
                        </p>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold shadow-sm">
                        {timeLabel(event.at, timezone)}
                      </span>
                    </div>

                    {item.kind === "BOOKING" ? (
                      <dl className="mt-4 grid gap-2 rounded-xl bg-white/80 p-3 text-sm sm:grid-cols-2">
                        <div>
                          <dt className="text-xs text-[#777285]">Contatto</dt>
                          <dd className="mt-0.5 font-medium">{item.customerPhone || item.customerEmail || "Nessun contatto inserito"}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-[#777285]">Richieste e note</dt>
                          <dd className="mt-0.5 font-medium">{item.notes || "Nessuna richiesta annotata"}</dd>
                        </div>
                      </dl>
                    ) : null}

                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      {pendingDeparture && item.bookingId ? (
                        <CalendarMarkDepartedForm operatorId={operatorId} bookingId={item.bookingId} />
                      ) : pendingReturn && item.bookingId ? (
                        <CalendarMarkReturnedForm operatorId={operatorId} bookingId={item.bookingId} />
                      ) : event.kind === "IN_USE" ? (
                        <p role="status" className="flex min-h-11 items-center justify-center rounded-xl bg-sky-100 px-4 text-center text-sm font-semibold text-sky-900">
                          ✓ Partenza già registrata
                        </p>
                      ) : event.kind === "RETURNED" ? (
                        <p role="status" className="flex min-h-11 items-center justify-center rounded-xl bg-teal-100 px-4 text-center text-sm font-semibold text-teal-900">
                          ✓ Rientro già registrato
                        </p>
                      ) : <div />}
                      <button
                        type="button"
                        onClick={() => openCell(event.boatId)}
                        className={`min-h-11 rounded-xl border border-[#D8D5E5] bg-white px-4 text-sm font-semibold hover:bg-[#F7F6FB] ${interactiveClass}`}
                      >
                        Apri tutti i dettagli
                      </button>
                    </div>
                  </article>
                );
              })
            ) : (
              <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900">
                <p className="font-semibold">Impegno completato.</p>
                <p className="mt-1 text-sm">Non ci sono più operazioni da eseguire per questo orario.</p>
              </div>
            )
          ) : metricItems.length > 0 ? (
            metricItems.map((item) => {
              const boat = boatById.get(item.boatId);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openCell(item.boatId)}
                  className={`w-full rounded-2xl border border-[#E1DEEA] bg-[#FAF9FC] p-4 text-left hover:border-[#AFA5FF] hover:bg-[#F5F2FF] ${interactiveClass}`}
                >
                  <span className="flex flex-wrap items-start justify-between gap-3">
                    <span>
                      <span className="block text-base font-semibold">
                        {panel.metric === "BLOCKS" ? boat?.name ?? "Imbarcazione" : item.customer ?? "Cliente"}
                      </span>
                      <span className="mt-1 block text-sm text-[#676B80]">
                        {panel.metric === "BLOCKS"
                          ? item.notes || "Nessun motivo indicato"
                          : `${timeLabel(item.startsAt, timezone)} · ${boat?.name ?? "Imbarcazione"} · ${item.passengers ?? 1} pax`}
                      </span>
                    </span>
                    <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-[#4C3FC2] shadow-sm">
                      Apri →
                    </span>
                  </span>
                  {panel.metric !== "BLOCKS" ? (
                    <span className="mt-3 grid gap-1 rounded-xl bg-white p-3 text-xs text-[#4A4758] sm:grid-cols-2">
                      <span><strong>Contatto:</strong> {item.customerPhone || "non inserito"}</span>
                      <span><strong>Richieste:</strong> {item.notes || "nessuna nota"}</span>
                    </span>
                  ) : null}
                </button>
              );
            })
          ) : (
            <div className="rounded-2xl border border-dashed border-[#D8D5E5] p-5 text-sm text-[#676B80]">
              Nessuna voce da mostrare.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default function OperatorTodayDashboard({
  operatorId,
  today,
  boats,
  items,
  timezone,
  onOpenCell,
}: OperatorTodayDashboardProps) {
  const [panel, setPanel] = useState<DashboardPanel | null>(null);
  const overview = useMemo(
    () => buildTodayDashboard(items, boats, today),
    [boats, items, today],
  );
  const boatById = useMemo(() => new Map(boats.map((boat) => [boat.id, boat])), [boats]);
  const itemById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const firstDeparture = overview.events.find((event) => event.kind === "DEPARTURE");
  const lastReturn = overview.events.findLast((event) => event.kind === "RETURN" || event.kind === "RETURNED");
  const nextActionGroup = overview.eventGroups.find((group) =>
    group.events.some((event) => {
      const item = itemById.get(event.itemId);
      return (event.kind === "DEPARTURE" && item?.rawStatus === "CONFIRMED")
        || (event.kind === "RETURN" && item?.rawStatus === "IN_PROGRESS");
    }),
  );
  const pendingDepartures = nextActionGroup?.events.filter((event) => {
    const item = itemById.get(event.itemId);
    return event.kind === "DEPARTURE" && item?.rawStatus === "CONFIRMED";
  }).length ?? 0;
  const pendingReturns = nextActionGroup?.events.filter((event) => {
    const item = itemById.get(event.itemId);
    return event.kind === "RETURN" && item?.rawStatus === "IN_PROGRESS";
  }).length ?? 0;
  const pendingActionLabel = pendingDepartures && pendingReturns
    ? `${pendingDepartures + pendingReturns} operazioni`
    : pendingDepartures
      ? plural(pendingDepartures, "partenza", "partenze")
      : plural(pendingReturns, "rientro", "rientri");

  const metrics: Array<{ key: MetricKey; label: string; value: number }> = [
    { key: "BOOKINGS", label: "Prenotazioni", value: overview.bookings.length },
    { key: "BLOCKS", label: "Barche bloccate", value: overview.blockedBoatCount },
    { key: "CUSTOMERS", label: "Clienti", value: overview.customerCount },
    { key: "MISSING_PHONE", label: "Senza telefono", value: overview.missingPhoneCount },
  ];

  return (
    <>
      <section className="border-b border-[#E2DFEB] bg-gradient-to-br from-[#17142C] via-[#211D3A] to-[#31285B] px-4 py-5 text-white sm:px-6 sm:py-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#BDB5FF]">
              Cruscotto operativo · Oggi
            </p>
            <h2 className="mt-1 text-2xl font-semibold capitalize">{longDateLabel(today.key)}</h2>
            <p className="mt-2 text-sm text-[#D6D2E7]">
              {firstDeparture || lastReturn
                ? `${firstDeparture ? `Prima partenza da confermare ${timeLabel(firstDeparture.at, timezone)}` : "Tutte le partenze registrate"} · ${lastReturn ? `ultimo rientro ${timeLabel(lastReturn.at, timezone)}` : "nessun rientro"}`
                : "Nessun movimento programmato: la giornata è libera."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (nextActionGroup) setPanel({ kind: "GROUP", groupId: nextActionGroup.id });
            }}
            disabled={!nextActionGroup}
            aria-haspopup="dialog"
            className={`min-h-11 rounded-xl border border-white/20 bg-white/10 px-4 text-sm font-semibold hover:bg-white/20 disabled:cursor-default disabled:opacity-45 ${nextActionGroup ? interactiveClass : ""}`}
          >
            {nextActionGroup
              ? `Prossimo impegno: ${pendingActionLabel} · ${timeLabel(nextActionGroup.at, timezone)}`
              : "Nessuna operazione da confermare"}
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 lg:grid-cols-4">
          {metrics.map((metric) => (
            <button
              key={metric.key}
              type="button"
              onClick={() => setPanel({ kind: "METRIC", metric: metric.key })}
              aria-haspopup="dialog"
              className={`rounded-2xl border border-white/10 bg-white/[0.08] p-3 text-left hover:border-[#AFA5FF]/70 hover:bg-white/[0.14] sm:p-4 ${interactiveClass}`}
            >
              <span className="block text-[10px] font-bold uppercase tracking-wide text-[#BDB8CE]">{metric.label}</span>
              <span className="mt-1 block text-2xl font-semibold">{metric.value}</span>
              <span className="mt-2 block text-[10px] font-semibold text-[#C8C0FF]">Apri dettagli →</span>
            </button>
          ))}
        </div>

        <div className="mt-5 grid gap-3 xl:grid-cols-[1.4fr_0.8fr]">
          <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-3 sm:p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold">Agenda di oggi</h3>
              <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold text-[#D6D2E7]">
                {overview.events.length} movimenti · {overview.eventGroups.length} orari
              </span>
            </div>
            {overview.eventGroups.length === 0 ? (
              <p className="mt-4 rounded-xl border border-dashed border-white/20 p-4 text-sm text-[#D6D2E7]">
                Nessuna partenza, rientro o indisponibilità per oggi.
              </p>
            ) : (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {overview.eventGroups.map((group) => (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => setPanel({ kind: "GROUP", groupId: group.id })}
                    aria-haspopup="dialog"
                    className={`min-h-[104px] rounded-xl border p-3 text-left ${eventTone(group)} ${interactiveClass}`}
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-[#CFC9FF]">
                        {groupHeadline(group)}
                      </span>
                      <span className="text-sm font-semibold">{timeLabel(group.at, timezone)}</span>
                    </span>
                    <span className="mt-2 block space-y-1">
                      {group.events.slice(0, 3).map((event) => {
                        const item = itemById.get(event.itemId);
                        const boat = boatById.get(event.boatId);
                        return (
                          <span key={event.id} className="block truncate text-xs text-[#E3DFEE]">
                            <strong className="text-white">{boat?.name ?? "Imbarcazione"}</strong>
                            {item?.kind === "BOOKING" ? ` · ${item.customer ?? "Cliente"}` : ` · ${item?.notes || "Blocco"}`}
                          </span>
                        );
                      })}
                      {group.events.length > 3 ? <span className="block text-xs font-semibold text-[#C8C0FF]">+ altri {group.events.length - 3}</span> : null}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-3 sm:p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold">Da controllare</h3>
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${overview.alerts.length ? "bg-amber-300/15 text-amber-100" : "bg-emerald-300/15 text-emerald-100"}`}>
                {overview.alerts.length || "Tutto ok"}
              </span>
            </div>
            {overview.alerts.length === 0 ? (
              <div className="mt-3 rounded-xl border border-emerald-300/20 bg-emerald-300/10 p-4">
                <p className="text-sm font-semibold text-emerald-100">Nessuna criticità operativa</p>
                <p className="mt-1 text-xs leading-5 text-[#D6D2E7]">Orari, flotta e disponibilità risultano coerenti.</p>
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                {overview.alerts.slice(0, 6).map((alert) => (
                  <button
                    key={alert.id}
                    type="button"
                    onClick={() => onOpenCell(alert.boatId)}
                    className={`w-full rounded-xl border p-3 text-left ${alert.tone === "danger" ? "border-rose-300/25 bg-rose-300/10 hover:bg-rose-300/15" : "border-amber-300/20 bg-amber-300/10 hover:bg-amber-300/15"} ${interactiveClass}`}
                  >
                    <span className="block text-sm font-semibold">{alert.title}</span>
                    <span className="mt-1 block text-xs text-[#D6D2E7]">{alert.detail}</span>
                    <span className="mt-2 block text-[10px] font-semibold text-[#C8C0FF]">Apri e correggi →</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {panel ? (
        <DashboardModal
          panel={panel}
          overview={overview}
          itemById={itemById}
          boatById={boatById}
          operatorId={operatorId}
          timezone={timezone}
          onClose={() => setPanel(null)}
          onOpenCell={onOpenCell}
        />
      ) : null}
    </>
  );
}
