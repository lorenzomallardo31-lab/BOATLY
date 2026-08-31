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
  localDateTimeInTimeZone,
  todayInTimeZone,
  zonedDayBounds,
} from "@/lib/operator/date-time";
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
  operator_customer_id: string;
  legal_offering_id: string;
  pickup_location_id: string;
  source: string;
  reference: string | null;
  status: string;
  starts_at: string;
  ends_at: string;
  completed_at: string | null;
  passenger_count: number;
  customer_snapshot: unknown;
  operator_note: string | null;
  customer_total_cents_snapshot: number | null;
};

type CustomerRow = {
  id: string;
  display_name: string;
  email: string | null;
  phone: string | null;
  country_code: string | null;
  date_of_birth: string | null;
  notes: string | null;
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

type InternalSkipperRow = {
  id: string;
  display_name: string;
  phone: string | null;
};

type SkipperAssignmentRow = {
  booking_id: string;
  skipper_id: string | null;
  assignment_state: string;
  skipper_name_snapshot: string | null;
  skipper_phone_snapshot: string | null;
};

const HORIZON_DAYS = 45;
const NAVIGATION_STEP_DAYS = 20;
const ACTIVE_BOOKING_STATUSES = [
  "DRAFT",
  "PENDING_PAYMENT",
  "PAYMENT_PROCESSING",
  "CONFIRMED",
  "IN_PROGRESS",
  "COMPLETED",
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
    IN_PROGRESS: "In mare",
    COMPLETED: "Rientrata",
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

function toScheduleDay(key: string, timezone: string, today: string): ScheduleDay {
  const bounds = zonedDayBounds(key, timezone);
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
  const todayBounds = zonedDayBounds(today, operator.timezone);

  if (!firstBounds || !lastBounds || !todayBounds) {
    throw new Error("Unable to resolve planning boundaries.");
  }

  // The calendar can be browsed away from today, but the operational
  // dashboard must remain current without a second client-side request.
  const queryStartsAt = firstBounds.start < todayBounds.start
    ? firstBounds.start
    : todayBounds.start;
  const queryEndsAt = lastBounds.end > todayBounds.end
    ? lastBounds.end
    : todayBounds.end;

  const [
    { data: boatData, error: boatsError },
    { data: bookingData, error: bookingsError },
    { data: occupancyData, error: occupanciesError },
    { data: locationData, error: locationsError },
    { data: skipperData, error: skippersError },
  ] = await Promise.all([
    supabase
      .from("boats")
      .select("id, name, status, manufacturer, model, internal_code, operator_passenger_limit")
      .eq("operator_id", operator.id)
      .is("deleted_at", null)
      .order("name"),
    supabase
      .from("bookings")
      .select("id, boat_id, operator_customer_id, legal_offering_id, pickup_location_id, source, reference, status, starts_at, ends_at, completed_at, passenger_count, customer_snapshot, operator_note, customer_total_cents_snapshot")
      .eq("operator_id", operator.id)
      .in("status", ACTIVE_BOOKING_STATUSES)
      .lt("starts_at", queryEndsAt)
      .gt("ends_at", queryStartsAt)
      .order("starts_at"),
    supabase
      .from("boat_occupancies")
      .select("id, boat_id, booking_id, occupancy_type, starts_at, ends_at, title, notes")
      .eq("operator_id", operator.id)
      .eq("is_active", true)
      .lt("starts_at", queryEndsAt)
      .gt("ends_at", queryStartsAt)
      .order("starts_at"),
    supabase
      .from("operator_locations")
      .select("id, name, city")
      .eq("operator_id", operator.id)
      .eq("is_active", true)
      .order("is_primary", { ascending: false }),
    supabase
      .from("operator_internal_skippers")
      .select("id, display_name, phone")
      .eq("operator_id", operator.id)
      .eq("is_active", true)
      .is("removed_at", null)
      .order("display_name"),
  ]);

  if (boatsError || bookingsError || occupanciesError || locationsError || skippersError) {
    throw new Error("Unable to load operator planning.");
  }

  const bookings = (bookingData ?? []) as BookingRow[];
  const occupancies = (occupancyData ?? []) as OccupancyRow[];
  const boatIds = (boatData ?? []).map((boat) => boat.id);
  const customerIds = [...new Set(bookings.map((booking) => booking.operator_customer_id))];
  const bookingIds = bookings.map((booking) => booking.id);
  const [
    { data: customerData, error: customersError },
    { data: offeringData, error: offeringsError },
    { data: assignmentData, error: assignmentsError },
  ] = await Promise.all([
    customerIds.length
      ? supabase
          .from("operator_customers")
          .select("id, display_name, email, phone, country_code, date_of_birth, notes")
          .eq("operator_id", operator.id)
          .in("id", customerIds)
      : Promise.resolve({ data: [] as CustomerRow[], error: null }),
    boatIds.length
      ? supabase
          .from("boat_legal_offerings")
          .select("id, boat_id, legal_type, skipper_mode")
          .in("boat_id", boatIds)
          .eq("is_active", true)
      : Promise.resolve({ data: [], error: null }),
    bookingIds.length
      ? supabase
          .from("booking_internal_skipper_assignments")
          .select("booking_id, skipper_id, assignment_state, skipper_name_snapshot, skipper_phone_snapshot")
          .eq("operator_id", operator.id)
          .in("booking_id", bookingIds)
      : Promise.resolve({ data: [] as SkipperAssignmentRow[], error: null }),
  ]);
  if (customersError || offeringsError || assignmentsError) {
    throw new Error("Unable to load planning relations.");
  }
  const customers = (customerData ?? []) as CustomerRow[];
  const assignments = (assignmentData ?? []) as SkipperAssignmentRow[];
  const customerById = new Map(customers.map((customer) => [customer.id, customer]));
  const assignmentByBookingId = new Map(
    assignments.map((assignment) => [assignment.booking_id, assignment]),
  );
  const bookingById = new Map(bookings.map((booking) => [booking.id, booking]));
  const occupancyBookingIds = new Set(
    occupancies.flatMap((occupancy) => occupancy.booking_id ? [occupancy.booking_id] : []),
  );

  const days = dateKeys.map((key) => toScheduleDay(key, operator.timezone, today));
  const todayDay = days.find((day) => day.key === today)
    ?? toScheduleDay(today, operator.timezone, today);

  const boats: ScheduleBoat[] = (boatData ?? []).map((boat) => ({
    id: boat.id,
    name: boat.name,
    status: boat.status,
    detail:
      [boat.manufacturer, boat.model].filter(Boolean).join(" · ") ||
      boat.internal_code ||
      "Scheda tecnica da completare",
    passengerLimit: boat.operator_passenger_limit,
  }));

  const items: ScheduleItem[] = occupancies.flatMap((occupancy) => {
    const booking = occupancy.booking_id
      ? bookingById.get(occupancy.booking_id) ?? null
      : null;

    // A booking-linked occupancy must never be reinterpreted as an operator
    // block. The database trigger repairs terminal rows; this guard keeps the
    // UI truthful even during a delayed migration or an external write.
    if (occupancy.booking_id && !booking) return [];

    const isBooking = occupancy.booking_id !== null;
    const customer = booking ? customerById.get(booking.operator_customer_id) ?? null : null;
    const skipperAssignment = booking
      ? assignmentByBookingId.get(booking.id) ?? null
      : null;
    return [{
      id: occupancy.id,
      boatId: occupancy.boat_id,
      kind: isBooking ? "BOOKING" : "BLOCK",
      bookingId: booking?.id ?? null,
      source: booking?.source ?? null,
      occupancyId: occupancy.id,
      startsAt: occupancy.starts_at,
      endsAt: occupancy.ends_at,
      completedAt: booking?.completed_at ?? null,
      status: booking ? bookingStatusLabel(booking.status) : occupancyLabel(occupancy.occupancy_type),
      rawStatus: booking?.status ?? occupancy.occupancy_type,
      title: booking ? customer?.display_name ?? customerName(booking.customer_snapshot) : occupancy.title ?? occupancyLabel(occupancy.occupancy_type),
      subtitle: booking?.reference ?? null,
      reference: booking?.reference ?? null,
      customer: booking ? customer?.display_name ?? customerName(booking.customer_snapshot) : null,
      passengers: booking?.passenger_count ?? null,
      notes: booking?.operator_note ?? occupancy.notes,
      operatorCustomerId: booking?.operator_customer_id ?? null,
      customerEmail: customer?.email ?? null,
      customerPhone: customer?.phone ?? null,
      customerCountryCode: customer?.country_code ?? null,
      customerDateOfBirth: customer?.date_of_birth ?? null,
      customerNotes: customer?.notes ?? null,
      legalOfferingId: booking?.legal_offering_id ?? null,
      pickupLocationId: booking?.pickup_location_id ?? null,
      startsAtLocal: booking ? localDateTimeInTimeZone(booking.starts_at, operator.timezone) : null,
      endsAtLocal: booking ? localDateTimeInTimeZone(booking.ends_at, operator.timezone) : null,
      total: booking ? ((booking.customer_total_cents_snapshot ?? 0) / 100).toFixed(2).replace(".", ",") : null,
      skipperAssignmentState: skipperAssignment?.assignment_state ?? null,
      skipperId: skipperAssignment?.skipper_id ?? null,
      skipperName: skipperAssignment?.skipper_name_snapshot ?? null,
      skipperPhone: skipperAssignment?.skipper_phone_snapshot ?? null,
    }];
  });

  for (const booking of bookings) {
    if (occupancyBookingIds.has(booking.id)) continue;
    const customer = customerById.get(booking.operator_customer_id) ?? null;
    const skipperAssignment = assignmentByBookingId.get(booking.id) ?? null;
    items.push({
      id: `booking-${booking.id}`,
      boatId: booking.boat_id,
      kind: "BOOKING",
      bookingId: booking.id,
      source: booking.source,
      occupancyId: null,
      startsAt: booking.starts_at,
      endsAt: booking.ends_at,
      completedAt: booking.completed_at,
      status: bookingStatusLabel(booking.status),
      rawStatus: booking.status,
      title: customer?.display_name ?? customerName(booking.customer_snapshot),
      subtitle: booking.reference,
      reference: booking.reference,
      customer: customer?.display_name ?? customerName(booking.customer_snapshot),
      passengers: booking.passenger_count,
      notes: booking.operator_note,
      operatorCustomerId: booking.operator_customer_id,
      customerEmail: customer?.email ?? null,
      customerPhone: customer?.phone ?? null,
      customerCountryCode: customer?.country_code ?? null,
      customerDateOfBirth: customer?.date_of_birth ?? null,
      customerNotes: customer?.notes ?? null,
      legalOfferingId: booking.legal_offering_id,
      pickupLocationId: booking.pickup_location_id,
      startsAtLocal: localDateTimeInTimeZone(booking.starts_at, operator.timezone),
      endsAtLocal: localDateTimeInTimeZone(booking.ends_at, operator.timezone),
      total: ((booking.customer_total_cents_snapshot ?? 0) / 100).toFixed(2).replace(".", ","),
      skipperAssignmentState: skipperAssignment?.assignment_state ?? null,
      skipperId: skipperAssignment?.skipper_id ?? null,
      skipperName: skipperAssignment?.skipper_name_snapshot ?? null,
      skipperPhone: skipperAssignment?.skipper_phone_snapshot ?? null,
    });
  }

  const canManageFleet = membership.role === "OWNER" || membership.role === "MANAGER";

  return (
    <main className="min-h-screen bg-[#F7F6FB] pb-28 text-[#171A2B] lg:pb-12">
      <OperatorNav operatorId={operator.id} operatorName={operator.name} />

      <div className="mx-auto max-w-[1800px] px-2 py-3 sm:px-6 sm:py-9 lg:px-8">
        <div className="flex flex-col gap-3 sm:gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="hidden sm:block">
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

          <div className="flex items-center justify-between gap-2 sm:hidden">
            <div><p className="text-[10px] font-bold uppercase tracking-wide text-[#6D5DFB]">Planning</p><h1 className="text-lg font-semibold">Calendario flotta</h1></div>
            <div className="flex gap-1">
              <Link href={scheduleHref(operator.id, addDays(startDate, -NAVIGATION_STEP_DAYS))} aria-label="20 giorni indietro" className="grid h-9 w-9 place-items-center rounded-lg border border-[#D8D5E5] bg-white text-sm font-bold">←</Link>
              <Link href={scheduleHref(operator.id, today)} className="inline-flex h-9 items-center rounded-lg bg-[#EDE9FE] px-2.5 text-xs font-semibold text-[#4C3FC2]">Oggi</Link>
              <Link href={scheduleHref(operator.id, addDays(startDate, NAVIGATION_STEP_DAYS))} aria-label="20 giorni avanti" className="grid h-9 w-9 place-items-center rounded-lg border border-[#D8D5E5] bg-white text-sm font-bold">→</Link>
            </div>
          </div>

          <div className="hidden flex-wrap gap-2 sm:flex">
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
          </div>
        </div>

        <section className="mt-3 overflow-hidden rounded-2xl border border-[#D8D5E5] bg-white shadow-sm sm:mt-7 sm:rounded-3xl">
          <div className="flex flex-col gap-2 border-b border-[#E2DFEB] bg-[#F0EEFF] px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
            <div>
              <p className="font-semibold capitalize">{rangeLabel(startDate, endDate)}</p>
              <p className="mt-1 hidden text-xs text-[#676B80] sm:block">
                {boats.length} imbarcazioni · scorri orizzontalmente per esplorare tutti i giorni
              </p>
            </div>
            <div className="hidden flex-wrap gap-3 text-[11px] font-semibold sm:flex">
              <span className="inline-flex items-center gap-1.5"><i className="h-3 w-3 rounded bg-emerald-100 ring-1 ring-emerald-300" /> Prenotata</span>
              <span className="inline-flex items-center gap-1.5"><i className="h-3 w-3 rounded bg-emerald-600 ring-1 ring-emerald-800" /> In mare</span>
              <span className="inline-flex items-center gap-1.5"><i className="h-3 w-3 rounded bg-teal-100 ring-1 ring-teal-400" /> Rientrata</span>
              <span className="inline-flex items-center gap-1.5"><i className="h-3 w-3 rounded bg-rose-100 ring-1 ring-rose-300" /> Blocco</span>
              <span className="inline-flex items-center gap-1.5"><i className="h-3 w-3 rounded border border-[#D8D5E5] bg-white" /> Libera</span>
            </div>
            <details className="group sm:hidden">
              <summary className="cursor-pointer list-none text-[10px] font-semibold text-[#4C3FC2]">Legenda colori <span className="group-open:hidden">↓</span><span className="hidden group-open:inline">↑</span></summary>
              <div className="mt-2 flex flex-wrap gap-2 text-[9px] font-semibold">
                <span className="inline-flex items-center gap-1"><i className="h-2.5 w-2.5 rounded bg-emerald-100 ring-1 ring-emerald-300" /> Prenotata</span>
                <span className="inline-flex items-center gap-1"><i className="h-2.5 w-2.5 rounded bg-emerald-600" /> In mare</span>
                <span className="inline-flex items-center gap-1"><i className="h-2.5 w-2.5 rounded bg-teal-100 ring-1 ring-teal-400" /> Rientrata</span>
                <span className="inline-flex items-center gap-1"><i className="h-2.5 w-2.5 rounded bg-rose-100 ring-1 ring-rose-300" /> Blocco</span>
              </div>
            </details>
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
              operatorName={operator.name}
              timezone={operator.timezone}
              today={todayDay}
              days={days}
              boats={boats}
              items={items}
              offerings={(offeringData ?? []).map((offering) => ({
                id: offering.id,
                boatId: offering.boat_id,
                label: `${offering.legal_type} · ${offering.skipper_mode}`,
              }))}
              locations={(locationData ?? []).map((location) => ({
                id: location.id,
                label: `${location.name}${location.city ? ` · ${location.city}` : ""}`,
              }))}
              skippers={((skipperData ?? []) as InternalSkipperRow[]).map((skipper) => ({
                id: skipper.id,
                name: skipper.display_name,
                phone: skipper.phone,
              }))}
              canManageFleet={canManageFleet}
            />
          )}
        </section>
      </div>
    </main>
  );
}
