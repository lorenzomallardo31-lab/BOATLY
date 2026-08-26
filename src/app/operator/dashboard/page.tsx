import Link from "next/link";

import OperatorNav from "@/components/operator/operator-nav";
import { requireOperatorWorkspaceContext } from "@/lib/operator/workspace-context";

type DashboardPageProps = {
  searchParams: Promise<{ operator?: string }>;
};

function money(cents: number, currency: string) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

function dateTime(value: string, timezone: string) {
  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone,
  }).format(new Date(value));
}

export default async function OperatorDashboardPage({ searchParams }: DashboardPageProps) {
  const query = await searchParams;
  const { supabase, operator, membership } = await requireOperatorWorkspaceContext(query.operator);

  const nowIso = new Date().toISOString();

  const [boatsResult, bookingsResult, customersResult, cancellationResult, stripeResult] =
    await Promise.all([
      supabase
        .from("boats")
        .select("id, name, status", { count: "exact" })
        .eq("operator_id", operator.id),
      supabase
        .from("bookings")
        .select(
          "id, reference, source, status, starts_at, ends_at, customer_total_cents_snapshot, operator_amount_cents_snapshot, currency_snapshot, boat_snapshot, customer_snapshot",
        )
        .eq("operator_id", operator.id)
        .gte("ends_at", nowIso)
        .order("starts_at", { ascending: true })
        .limit(8),
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
        .from("stripe_connected_accounts")
        .select("status, charges_enabled, payouts_enabled")
        .eq("operator_id", operator.id)
        .maybeSingle(),
    ]);

  for (const result of [boatsResult, bookingsResult, customersResult, cancellationResult]) {
    if (result.error) {
      throw new Error(`Unable to load operator dashboard: ${result.error.message}`);
    }
  }

  const boats = boatsResult.data ?? [];
  const bookings = bookingsResult.data ?? [];
  const activeBoats = boats.filter((boat) => boat.status === "ACTIVE").length;
  const upcomingConfirmed = bookings.filter((booking) =>
    ["CONFIRMED", "IN_PROGRESS"].includes(booking.status),
  );
  const upcomingValue = upcomingConfirmed.reduce(
    (sum, booking) => sum + (booking.operator_amount_cents_snapshot ?? 0),
    0,
  );

  return (
    <main className="min-h-screen bg-[#FCFBF8] text-[#0B1F33]">
      <OperatorNav operatorId={operator.id} operatorName={operator.name} />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-sm font-semibold text-[#14B8A6]">Operator Dashboard</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight">Buon lavoro.</h1>
            <p className="mt-2 text-sm text-[#64748B]">
              {operator.name} · {membership.role} · {operator.status}
            </p>
          </div>

          <Link
            href={`/operator/bookings/new?operator=${operator.id}`}
            className="rounded-xl bg-[#14B8A6] px-5 py-3 text-sm font-semibold text-white"
          >
            Nuova prenotazione manuale
          </Link>
        </div>

        {operator.status !== "ACTIVE" ? (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
            Il workspace non è ancora ACTIVE. Puoi continuare a configurare Boatly, ma le operazioni reali di booking manuale richiedono l&apos;approvazione dell&apos;operatore.
          </div>
        ) : null}

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {[
            ["Barche", String(boats.length), `${activeBoats} attive`],
            ["Booking futuri", String(upcomingConfirmed.length), "confermati / in corso"],
            ["Clienti CRM", String(customersResult.count ?? 0), "nel workspace"],
            ["Cancellazioni", String(cancellationResult.count ?? 0), "da gestire"],
            ["Valore futuro", money(upcomingValue, operator.currency), "quota operatore"],
          ].map(([label, value, note]) => (
            <article key={label} className="rounded-2xl border border-[#DEE5E8] bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">{label}</p>
              <p className="mt-2 text-2xl font-semibold">{value}</p>
              <p className="mt-1 text-xs text-[#64748B]">{note}</p>
            </article>
          ))}
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div className="rounded-3xl border border-[#DEE5E8] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[#14B8A6]">Agenda</p>
                <h2 className="mt-1 text-xl font-semibold">Prossime prenotazioni</h2>
              </div>
              <Link href={`/operator/bookings?operator=${operator.id}`} className="text-sm font-semibold text-[#14B8A6]">
                Vedi tutte
              </Link>
            </div>

            <div className="mt-5 space-y-3">
              {bookings.length === 0 ? (
                <p className="rounded-2xl bg-[#F1F5F4] p-5 text-sm text-[#64748B]">Nessuna prenotazione futura.</p>
              ) : (
                bookings.map((booking) => {
                  const boat = (booking.boat_snapshot ?? {}) as { name?: string };
                  const customer = (booking.customer_snapshot ?? {}) as { display_name?: string };
                  return (
                    <Link
                      key={booking.id}
                      href={`/operator/bookings/${booking.id}?operator=${operator.id}`}
                      className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#DEE5E8] p-4 transition hover:border-[#14B8A6]/60"
                    >
                      <div>
                        <p className="font-semibold">{boat.name ?? "Barca"}</p>
                        <p className="mt-1 text-xs text-[#64748B]">
                          {booking.reference ?? "—"} · {customer.display_name ?? "Cliente"} · {booking.source}
                        </p>
                      </div>
                      <div className="text-right text-sm">
                        <p className="font-semibold">{dateTime(booking.starts_at, operator.timezone)}</p>
                        <p className="mt-1 text-xs text-[#64748B]">{booking.status}</p>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </div>

          <div className="space-y-6">
            <section className="rounded-3xl border border-[#DEE5E8] bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold text-[#14B8A6]">Pagamenti</p>
              <h2 className="mt-1 text-xl font-semibold">Stripe Connect</h2>
              {stripeResult.error || !stripeResult.data ? (
                <p className="mt-4 text-sm leading-6 text-[#64748B]">Account Connect non ancora collegato.</p>
              ) : (
                <div className="mt-4 space-y-2 text-sm">
                  <p>Stato: <strong>{stripeResult.data.status}</strong></p>
                  <p>Incassi: <strong>{stripeResult.data.charges_enabled ? "abilitati" : "non abilitati"}</strong></p>
                  <p>Payout: <strong>{stripeResult.data.payouts_enabled ? "abilitati" : "non abilitati"}</strong></p>
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-[#DEE5E8] bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold text-[#14B8A6]">Azioni rapide</p>
              <div className="mt-4 grid gap-3">
                <Link href={`/operator/fleet?operator=${operator.id}`} className="rounded-xl border border-[#DEE5E8] px-4 py-3 text-sm font-semibold hover:bg-[#F1F5F4]">Gestisci flotta</Link>
                <Link href={`/operator/customers?operator=${operator.id}`} className="rounded-xl border border-[#DEE5E8] px-4 py-3 text-sm font-semibold hover:bg-[#F1F5F4]">Apri CRM clienti</Link>
                <Link href={`/operator/bookings?operator=${operator.id}`} className="rounded-xl border border-[#DEE5E8] px-4 py-3 text-sm font-semibold hover:bg-[#F1F5F4]">Gestisci booking</Link>
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
