import Link from "next/link";

import OperatorNav from "@/components/operator/operator-nav";
import {
  todayInTimeZone,
  zonedDayBounds,
  zonedMonthBounds,
} from "@/lib/operator/date-time";
import { requireOperatorWorkspaceContext } from "@/lib/operator/workspace-context";

type DashboardPageProps = {
  searchParams: Promise<{ operator?: string }>;
};

const ACTIVE_BOOKING_STATUSES = [
  "DRAFT",
  "PENDING_PAYMENT",
  "PAYMENT_PROCESSING",
  "CONFIRMED",
  "IN_PROGRESS",
];

function money(cents: number, currency: string) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function dateTime(value: string, timezone: string) {
  return new Intl.DateTimeFormat("it-IT", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  }).format(new Date(value));
}

function customerName(snapshot: unknown) {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) return "Cliente";
  const value = (snapshot as Record<string, unknown>).display_name;
  return typeof value === "string" && value.trim() ? value : "Cliente";
}

function boatName(snapshot: unknown) {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) return "Barca";
  const value = (snapshot as Record<string, unknown>).name;
  return typeof value === "string" && value.trim() ? value : "Barca";
}

export default async function OperatorDashboardPage({
  searchParams,
}: DashboardPageProps) {
  const query = await searchParams;
  const { supabase, operator, membership } =
    await requireOperatorWorkspaceContext(query.operator);
  const now = new Date();
  const nowIso = now.toISOString();
  const today = todayInTimeZone(operator.timezone);
  const todayBounds = zonedDayBounds(today, operator.timezone);
  const monthBounds = zonedMonthBounds(today.slice(0, 7), operator.timezone);

  if (!todayBounds || !monthBounds) {
    throw new Error("Unable to resolve operator dashboard dates.");
  }

  const [
    boatsResult,
    todayBookingsResult,
    todayOccupanciesResult,
    upcomingResult,
    upcomingCountResult,
    customersResult,
    cancellationResult,
    monthValueResult,
    stripeResult,
  ] = await Promise.all([
    supabase
      .from("boats")
      .select("id, name, status", { count: "exact" })
      .eq("operator_id", operator.id)
      .neq("status", "ARCHIVED"),
    supabase
      .from("bookings")
      .select("id, reference, status, starts_at, ends_at, boat_snapshot, customer_snapshot")
      .eq("operator_id", operator.id)
      .in("status", ACTIVE_BOOKING_STATUSES)
      .lt("starts_at", todayBounds.end)
      .gt("ends_at", todayBounds.start)
      .order("starts_at"),
    supabase
      .from("boat_occupancies")
      .select("boat_id")
      .eq("operator_id", operator.id)
      .eq("is_active", true)
      .lt("starts_at", todayBounds.end)
      .gt("ends_at", todayBounds.start),
    supabase
      .from("bookings")
      .select("id, reference, source, status, starts_at, boat_snapshot, customer_snapshot")
      .eq("operator_id", operator.id)
      .in("status", ACTIVE_BOOKING_STATUSES)
      .gte("ends_at", nowIso)
      .order("starts_at")
      .limit(6),
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("operator_id", operator.id)
      .in("status", ACTIVE_BOOKING_STATUSES)
      .gte("ends_at", nowIso),
    supabase
      .from("operator_customers")
      .select("id", { count: "exact", head: true })
      .eq("operator_id", operator.id),
    supabase
      .from("booking_cancellation_requests")
      .select("id", { count: "exact", head: true })
      .eq("operator_id", operator.id)
      .eq("status", "PENDING"),
    supabase
      .from("bookings")
      .select("operator_amount_cents_snapshot")
      .eq("operator_id", operator.id)
      .in("status", ["CONFIRMED", "IN_PROGRESS", "COMPLETED"])
      .gte("starts_at", monthBounds.start)
      .lt("starts_at", monthBounds.end)
      .limit(1000),
    supabase
      .from("stripe_connected_accounts")
      .select("status, charges_enabled, payouts_enabled")
      .eq("operator_id", operator.id)
      .maybeSingle(),
  ]);

  for (const result of [
    boatsResult,
    todayBookingsResult,
    todayOccupanciesResult,
    upcomingResult,
    upcomingCountResult,
    customersResult,
    cancellationResult,
    monthValueResult,
  ]) {
    if (result.error) {
      throw new Error(`Unable to load operator dashboard: ${result.error.message}`);
    }
  }

  const boats = boatsResult.data ?? [];
  const activeBoats = boats.filter((boat) => boat.status === "ACTIVE");
  const busyBoatsToday = new Set(
    (todayOccupanciesResult.data ?? []).map((occupancy) => occupancy.boat_id),
  ).size;
  const availableToday = Math.max(0, activeBoats.length - busyBoatsToday);
  const monthValue = (monthValueResult.data ?? []).reduce(
    (sum, booking) => sum + (booking.operator_amount_cents_snapshot ?? 0),
    0,
  );
  const pendingCancellations = cancellationResult.count ?? 0;

  const metrics = [
    {
      label: "Operazioni oggi",
      value: String((todayBookingsResult.data ?? []).length),
      note: today,
      tone: "violet",
    },
    {
      label: "Barche libere oggi",
      value: `${availableToday}/${activeBoats.length}`,
      note: `${busyBoatsToday} occupate o bloccate`,
      tone: "green",
    },
    {
      label: "Valore del mese",
      value: money(monthValue, operator.currency),
      note: "valore prenotazioni, non cassa",
      tone: "amber",
    },
    {
      label: "Clienti CRM",
      value: String(customersResult.count ?? 0),
      note: "contatti nel workspace",
      tone: "slate",
    },
  ];

  return (
    <main className="min-h-screen bg-[#F7F6FB] pb-28 text-[#171A2B] lg:pb-12">
      <OperatorNav operatorId={operator.id} operatorName={operator.name} />

      <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-9 lg:px-8">
        <section className="overflow-hidden rounded-3xl bg-[#171A2B] text-white shadow-[0_22px_50px_rgba(23,26,43,0.18)]">
          <div className="grid gap-7 p-6 sm:p-8 lg:grid-cols-[1.4fr_0.8fr] lg:items-end">
            <div>
              <span className="inline-flex rounded-full bg-[#6D5DFB] px-3 py-1 text-xs font-bold">WORKSPACE {operator.status}</span>
              <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-5xl">Buon lavoro.</h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-[#C9C5E8]">
                Hai tutto ciò che serve per governare la giornata di {operator.name}: agenda, clienti, flotta e operazioni.
              </p>
              <p className="mt-4 text-xs font-semibold text-[#8F89B8]">{membership.role} · {operator.timezone}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <Link href={`/operator/bookings/new?operator=${operator.id}&date=${today}`} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-white px-5 text-sm font-semibold text-[#3F34B5]">
                + Nuova prenotazione
              </Link>
              <Link href={`/operator/calendar?operator=${operator.id}&month=${today.slice(0, 7)}&day=${today}`} className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/15 px-5 text-sm font-semibold text-white hover:bg-white/10">
                Apri il calendario
              </Link>
            </div>
          </div>
        </section>

        {operator.status !== "ACTIVE" ? (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            Il workspace non è ancora ACTIVE. Puoi completare la configurazione, ma le nuove prenotazioni reali restano bloccate dal database.
          </div>
        ) : null}

        {pendingCancellations > 0 ? (
          <Link href={`/operator/bookings?operator=${operator.id}`} className="mt-5 flex items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-[#FFF8EA] p-4 text-sm text-[#7C5A20]">
            <span><strong>{pendingCancellations} richieste di cancellazione</strong><span className="ml-1">richiedono attenzione.</span></span>
            <span className="shrink-0 font-bold">Apri →</span>
          </Link>
        ) : null}

        <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {metrics.map((metric) => (
            <article key={metric.label} className="rounded-2xl border border-[#E2DFEB] bg-white p-4 shadow-sm sm:p-5">
              <div className={`h-1.5 w-10 rounded-full ${metric.tone === "violet" ? "bg-[#6D5DFB]" : metric.tone === "green" ? "bg-emerald-500" : metric.tone === "amber" ? "bg-amber-400" : "bg-slate-400"}`} />
              <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.08em] text-[#676B80] sm:text-xs">{metric.label}</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{metric.value}</p>
              <p className="mt-1 text-[11px] text-[#676B80] sm:text-xs">{metric.note}</p>
            </article>
          ))}
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_0.8fr]">
          <div className="rounded-3xl border border-[#E2DFEB] bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#6D5DFB]">Agenda</p>
                <h2 className="mt-1 text-xl font-semibold">Prossime operazioni</h2>
              </div>
              <Link href={`/operator/bookings?operator=${operator.id}`} className="min-h-11 rounded-xl bg-[#F4F2FA] px-4 py-3 text-sm font-semibold text-[#4C3FC2]">
                Tutte ({upcomingCountResult.count ?? 0})
              </Link>
            </div>

            <div className="mt-5 space-y-3">
              {(upcomingResult.data ?? []).length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#D8D5E5] p-7 text-center">
                  <p className="font-semibold">Agenda libera</p>
                  <p className="mt-1 text-sm text-[#676B80]">Non ci sono prenotazioni future attive.</p>
                </div>
              ) : (
                (upcomingResult.data ?? []).map((booking) => (
                  <Link key={booking.id} href={`/operator/bookings/${booking.id}?operator=${operator.id}`} className="grid gap-3 rounded-2xl border border-[#E2DFEB] p-4 transition hover:border-[#8B7CF6] hover:bg-[#F8F7FC] sm:grid-cols-[1fr_auto] sm:items-center">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{boatName(booking.boat_snapshot)}</p>
                        <span className="rounded-full bg-[#FFF0D6] px-2 py-1 text-[10px] font-bold text-[#A14B08]">{booking.status}</span>
                      </div>
                      <p className="mt-1 truncate text-xs text-[#676B80]">{customerName(booking.customer_snapshot)} · {booking.reference ?? "—"} · {booking.source}</p>
                    </div>
                    <p className="text-sm font-semibold">{dateTime(booking.starts_at, operator.timezone)}</p>
                  </Link>
                ))
              )}
            </div>
          </div>

          <div className="space-y-5">
            <section className="rounded-3xl border border-[#E2DFEB] bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#6D5DFB]">Azioni rapide</p>
              <div className="mt-4 grid gap-2">
                <Link href={`/operator/calendar?operator=${operator.id}`} className="min-h-11 rounded-xl bg-[#EDE9FE] px-4 py-3 text-sm font-semibold text-[#4C3FC2]">Controlla disponibilità</Link>
                <Link href={`/operator/finance?operator=${operator.id}`} className="min-h-11 rounded-xl border border-[#D8D5E5] px-4 py-3 text-sm font-semibold hover:bg-[#F4F2FA]">Apri incassi e saldi</Link>
                <Link href={`/operator/fleet?operator=${operator.id}`} className="min-h-11 rounded-xl border border-[#D8D5E5] px-4 py-3 text-sm font-semibold hover:bg-[#F4F2FA]">Gestisci flotta</Link>
                <Link href={`/operator/customers?operator=${operator.id}`} className="min-h-11 rounded-xl border border-[#D8D5E5] px-4 py-3 text-sm font-semibold hover:bg-[#F4F2FA]">Apri CRM clienti</Link>
              </div>
            </section>

            <section className="rounded-3xl border border-[#E2DFEB] bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#6D5DFB]">Incassi</p>
              <h2 className="mt-1 text-lg font-semibold">Stripe Connect</h2>
              {stripeResult.error || !stripeResult.data ? (
                <p className="mt-3 text-sm leading-6 text-[#676B80]">Account Connect non ancora collegato.</p>
              ) : (
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <span className={`rounded-xl p-3 font-semibold ${stripeResult.data.charges_enabled ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>Incassi {stripeResult.data.charges_enabled ? "attivi" : "non attivi"}</span>
                  <span className={`rounded-xl p-3 font-semibold ${stripeResult.data.payouts_enabled ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>Payout {stripeResult.data.payouts_enabled ? "attivi" : "non attivi"}</span>
                </div>
              )}
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
