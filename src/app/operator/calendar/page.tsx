import Link from "next/link";

import OperatorNav from "@/components/operator/operator-nav";
import OperatorSchedule, {
  type ScheduleBoat,
  type ScheduleDay,
  type ScheduleItem,
} from "@/components/operator/operator-schedule";
import {
  addDays,
  isDateKey,
  todayInTimeZone,
  zonedDayBounds,
} from "@/lib/operator/date-time";
import { summarizeManualFinance, type ManualPaymentRecordLike } from "@/lib/operator/finance";
import { requireOperatorWorkspaceContext } from "@/lib/operator/workspace-context";

type CalendarPageProps = {
  searchParams: Promise<{
    operator?: string;
    start?: string;
  }>;
};

type BookingRow = {
  id: string;
  boat_id: string;
  source: string;
  reference: string | null;
  status: string;
  starts_at: string;
  ends_at: string;
  passenger_count: number;
  customer_snapshot: unknown;
  operator_note: string | null;
  customer_total_cents_snapshot: number | null;
  currency_snapshot: string | null;
};

type OccupancyRow = {
  id: string;
  boat_id: string;
  booking_id: string | null;
  occupancy_type: string;
  starts_at: string;
  ends_at: string;
  title: string | null;
  notes: string | null;
};

const HORIZON_DAYS = 45;
const NAVIGATION_STEP_DAYS = 20;
const ACTIVE_BOOKING_STATUSES = [
  "DRAFT",
  "PENDING_PAYMENT",
  "PAYMENT_PROCESSING",
  "CONFIRMED",
  "IN_PROGRESS",
];

function dateFromKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function rangeLabel(start: string, end: string) {
  const formatter = new Intl.DateTimeFormat("it-IT", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  return `${formatter.format(dateFromKey(start))} – ${formatter.format(dateFromKey(end))}`;
}

function customerName(snapshot: unknown) {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) return "Cliente";
  const record = snapshot as Record<string, unknown>;
  const displayName = record.display_name;
  if (typeof displayName === "string" && displayName.trim()) return displayName;
  const firstName = typeof record.first_name === "string" ? record.first_name.trim() : "";
  const lastName = typeof record.last_name === "string" ? record.last_name.trim() : "";
  return `${firstName} ${lastName}`.trim() || "Cliente";
}

function bookingStatusLabel(status: string) {
  const labels: Record<string, string> = {
    DRAFT: "Bozza",
    PENDING_PAYMENT: "In attesa",
    PAYMENT_PROCESSING: "Pagamento",
    CONFIRMED: "Confermata",
    IN_PROGRESS: "In corso",
  };
  return labels[status] ?? status;
}

function occupancyLabel(type: string) {
  const labels: Record<string, string> = {
    HOLD: "Blocco temporaneo",
    MAINTENANCE: "Manutenzione",
    TRANSFER: "Trasferimento",
    PRIVATE_USE: "Uso privato",
    OPERATOR_BLOCK: "Blocco operatore",
    OTHER: "Non disponibile",
  };
  return labels[type] ?? type;
}

function scheduleHref(operatorId: string, start: string) {
  const params = new URLSearchParams({ operator: operatorId, start });
  return `/operator/calendar?${params.toString()}`;
}

function chunks<T>(values: T[], size: number) {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
}

export default async function OperatorCalendarPage({ searchParams }: CalendarPageProps) {
  const query = await searchParams;
  const { supabase, operator, membership } =
    await requireOperatorWorkspaceContext(query.operator);
  const today = todayInTimeZone(operator.timezone);
  const startDate = isDateKey(query.start) ? query.start : today;
  const dateKeys = Array.from({ length: HORIZON_DAYS }, (_, index) =>
    addDays(startDate, index),
  );
  const endDate = dateKeys.at(-1)!;
  const firstBounds = zonedDayBounds(startDate, operator.timezone);
  const lastBounds = zonedDayBounds(endDate, operator.timezone);

  if (!firstBounds || !lastBounds) {
    throw new Error("Unable to resolve planning boundaries.");
  }

  const [
    { data: boatData, error: boatsError },
    { data: bookingData, error: bookingsError },
    { data: occupancyData, error: occupanciesError },
  ] = await Promise.all([
    supabase
      .from("boats")
      .select("id, name, status, manufacturer, model, internal_code")
      .eq("operator_id", operator.id)
      .is("deleted_at", null)
      .order("name"),
    supabase
      .from("bookings")
      .select("id, boat_id, source, reference, status, starts_at, ends_at, passenger_count, customer_snapshot, operator_note, customer_total_cents_snapshot, currency_snapshot")
      .eq("operator_id", operator.id)
      .in("status", ACTIVE_BOOKING_STATUSES)
      .lt("starts_at", lastBounds.end)
      .gt("ends_at", firstBounds.start)
      .order("starts_at"),
    supabase
      .from("boat_occupancies")
      .select("id, boat_id, booking_id, occupancy_type, starts_at, ends_at, title, notes")
      .eq("operator_id", operator.id)
      .eq("is_active", true)
      .lt("starts_at", lastBounds.end)
      .gt("ends_at", firstBounds.start)
      .order("starts_at"),
  ]);

  if (boatsError || bookingsError || occupanciesError) {
    throw new Error("Unable to load operator planning.");
  }

  const bookings = (bookingData ?? []) as BookingRow[];
  const occupancies = (occupancyData ?? []) as OccupancyRow[];
  const manualBookingIds = bookings.filter((booking) => booking.source === "MANUAL").map((booking) => booking.id);
  const manualPaymentResults = await Promise.all(
    chunks(manualBookingIds, 100).map((ids) =>
      supabase
        .from("manual_payment_records")
        .select("booking_id, record_type, purpose, amount_cents, status")
        .eq("operator_id", operator.id)
        .in("booking_id", ids),
    ),
  );
  const manualPaymentsByBooking = new Map<string, ManualPaymentRecordLike[]>();
  for (const result of manualPaymentResults) {
    if (result.error) throw new Error("Unable to load calendar finance status.");
    for (const record of result.data ?? []) {
      const current = manualPaymentsByBooking.get(record.booking_id);
      if (current) current.push(record);
      else manualPaymentsByBooking.set(record.booking_id, [record]);
    }
  }
  const bookingById = new Map(bookings.map((booking) => [booking.id, booking]));
  const occupancyBookingIds = new Set(
    occupancies.flatMap((occupancy) => occupancy.booking_id ? [occupancy.booking_id] : []),
  );

  const days: ScheduleDay[] = dateKeys.map((key) => {
    const bounds = zonedDayBounds(key, operator.timezone);
    if (!bounds) throw new Error("Unable to resolve a planning day.");
    const date = dateFromKey(key);
    const weekdayIndex = date.getUTCDay();
    return {
      key,
      start: bounds.start,
      end: bounds.end,
      dayNumber: String(date.getUTCDate()),
      weekday: new Intl.DateTimeFormat("it-IT", {
        weekday: "short",
        timeZone: "UTC",
      }).format(date).replace(".", ""),
      month: new Intl.DateTimeFormat("it-IT", {
        month: "short",
        timeZone: "UTC",
      }).format(date).replace(".", ""),
      weekend: weekdayIndex === 0 || weekdayIndex === 6,
      today: key === today,
    };
  });

  const boats: ScheduleBoat[] = (boatData ?? []).map((boat) => ({
    id: boat.id,
    name: boat.name,
    status: boat.status,
    detail:
      [boat.manufacturer, boat.model].filter(Boolean).join(" · ") ||
      boat.internal_code ||
      "Scheda tecnica da completare",
  }));

  const items: ScheduleItem[] = occupancies.map((occupancy) => {
    const booking = occupancy.booking_id
      ? bookingById.get(occupancy.booking_id) ?? null
      : null;
    const isBooking = Boolean(booking);
    const finance = booking?.source === "MANUAL"
      ? summarizeManualFinance(
          manualPaymentsByBooking.get(booking.id) ?? [],
          booking.customer_total_cents_snapshot ?? 0,
        )
      : null;
    return {
      id: occupancy.id,
      boatId: occupancy.boat_id,
      kind: isBooking ? "BOOKING" : "BLOCK",
      bookingId: booking?.id ?? null,
      occupancyId: occupancy.id,
      startsAt: occupancy.starts_at,
      endsAt: occupancy.ends_at,
      status: booking ? bookingStatusLabel(booking.status) : occupancyLabel(occupancy.occupancy_type),
      title: booking ? customerName(booking.customer_snapshot) : occupancy.title ?? occupancyLabel(occupancy.occupancy_type),
      subtitle: booking?.reference ?? null,
      reference: booking?.reference ?? null,
      customer: booking ? customerName(booking.customer_snapshot) : null,
      passengers: booking?.passenger_count ?? null,
      notes: booking?.operator_note ?? occupancy.notes,
      currency: finance ? booking?.currency_snapshot ?? operator.currency : null,
      totalCents: finance ? booking?.customer_total_cents_snapshot ?? 0 : null,
      collectedCents: finance?.commercialNetCents ?? null,
      outstandingCents: finance?.outstandingCents ?? null,
      securityHeldCents: finance?.securityHeldCents ?? null,
    };
  });

  for (const booking of bookings) {
    if (occupancyBookingIds.has(booking.id)) continue;
    const finance = booking.source === "MANUAL"
      ? summarizeManualFinance(
          manualPaymentsByBooking.get(booking.id) ?? [],
          booking.customer_total_cents_snapshot ?? 0,
        )
      : null;
    items.push({
      id: `booking-${booking.id}`,
      boatId: booking.boat_id,
      kind: "BOOKING",
      bookingId: booking.id,
      occupancyId: null,
      startsAt: booking.starts_at,
      endsAt: booking.ends_at,
      status: bookingStatusLabel(booking.status),
      title: customerName(booking.customer_snapshot),
      subtitle: booking.reference,
      reference: booking.reference,
      customer: customerName(booking.customer_snapshot),
      passengers: booking.passenger_count,
      notes: booking.operator_note,
      currency: finance ? booking.currency_snapshot ?? operator.currency : null,
      totalCents: finance ? booking.customer_total_cents_snapshot ?? 0 : null,
      collectedCents: finance?.commercialNetCents ?? null,
      outstandingCents: finance?.outstandingCents ?? null,
      securityHeldCents: finance?.securityHeldCents ?? null,
    });
  }

  const canManageFleet = membership.role === "OWNER" || membership.role === "MANAGER";

  return (
    <main className="min-h-screen bg-[#F7F6FB] pb-28 text-[#171A2B] lg:pb-12">
      <OperatorNav operatorId={operator.id} operatorName={operator.name} />

      <div className="mx-auto max-w-[1800px] px-3 py-6 sm:px-6 sm:py-9 lg:px-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#6D5DFB]">
              Planning operativo
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              Calendario flotta
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#676B80]">
              Barche in verticale, 45 giorni in orizzontale. Apri ogni casella per vedere
              prenotazioni, indisponibilità e azioni disponibili.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={scheduleHref(operator.id, addDays(startDate, -NAVIGATION_STEP_DAYS))}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#D8D5E5] bg-white px-4 text-sm font-semibold hover:bg-[#F1F0F6]"
            >
              ← 20 giorni
            </Link>
            <Link
              href={scheduleHref(operator.id, today)}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#EDE9FE] px-4 text-sm font-semibold text-[#4C3FC2]"
            >
              Oggi
            </Link>
            <Link
              href={scheduleHref(operator.id, addDays(startDate, NAVIGATION_STEP_DAYS))}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#D8D5E5] bg-white px-4 text-sm font-semibold hover:bg-[#F1F0F6]"
            >
              + 20 giorni →
            </Link>
            <Link
              href={`/operator/bookings/new?operator=${operator.id}&date=${startDate}`}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#171A2B] px-5 text-sm font-semibold text-white"
            >
              + Prenotazione
            </Link>
          </div>
        </div>

        <section className="mt-7 overflow-hidden rounded-3xl border border-[#D8D5E5] bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-[#E2DFEB] bg-[#F0EEFF] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <p className="font-semibold capitalize">{rangeLabel(startDate, endDate)}</p>
              <p className="mt-1 text-xs text-[#676B80]">
                {boats.length} imbarcazioni · scorri orizzontalmente per esplorare tutti i giorni
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-[11px] font-semibold">
              <span className="inline-flex items-center gap-1.5"><i className="h-3 w-3 rounded bg-[#FFF0D6] ring-1 ring-[#F6C76D]" /> Prenotata</span>
              <span className="inline-flex items-center gap-1.5"><i className="h-3 w-3 rounded bg-[#EDE9FE] ring-1 ring-[#C8C0FF]" /> Blocco</span>
              <span className="inline-flex items-center gap-1.5"><i className="h-3 w-3 rounded border border-[#D8D5E5] bg-white" /> Libera</span>
            </div>
          </div>

          {boats.length === 0 ? (
            <div className="p-10 text-center">
              <h2 className="text-xl font-semibold">La flotta è vuota</h2>
              <p className="mt-2 text-sm text-[#676B80]">Aggiungi una barca per attivare il planning.</p>
              <Link
                href={`/operator/fleet/new?operator=${operator.id}`}
                className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-[#6D5DFB] px-5 text-sm font-semibold text-white"
              >
                Aggiungi una barca
              </Link>
            </div>
          ) : (
            <OperatorSchedule
              operatorId={operator.id}
              timezone={operator.timezone}
              days={days}
              boats={boats}
              items={items}
              canManageFleet={canManageFleet}
            />
          )}
        </section>
      </div>
    </main>
  );
}
