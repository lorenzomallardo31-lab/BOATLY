import Link from "next/link";

import AdminNav from "@/components/admin/admin-nav";
import { requirePlatformContext } from "@/lib/admin/context";

type PageProps = {
  searchParams: Promise<{ status?: string; source?: string; operator?: string }>;
};

function money(cents: number | null, currency = "EUR") {
  if (cents === null) return "—";
  return new Intl.NumberFormat("it-IT", { style: "currency", currency }).format(cents / 100);
}

export default async function AdminBookingsPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const { supabase } = await requirePlatformContext([
    "SUPER_ADMIN",
    "ADMIN",
    "SUPPORT",
    "FINANCE",
    "COMPLIANCE",
  ]);

  let request = supabase
    .from("bookings")
    .select("id, operator_id, reference, source, status, starts_at, passenger_count, currency_snapshot, customer_total_cents_snapshot, commission_amount_cents_snapshot, operator_amount_cents_snapshot, boat_snapshot, customer_snapshot, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (query.status) request = request.eq("status", query.status);
  if (query.source) request = request.eq("source", query.source);
  if (query.operator) request = request.eq("operator_id", query.operator);

  const [{ data: bookings, error }, operatorResult] = await Promise.all([
    request,
    supabase.from("operators").select("id, name").order("name").limit(500),
  ]);
  if (error) throw new Error(`Unable to load admin bookings: ${error.message}`);
  if (operatorResult.error) throw new Error(`Unable to load booking operators: ${operatorResult.error.message}`);
  const operatorMap = new Map((operatorResult.data ?? []).map((operator) => [operator.id, operator.name]));

  return (
    <main className="min-h-screen bg-[#F6F8F9] text-[#0B1F33]">
      <AdminNav />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <p className="text-sm font-semibold text-[#14B8A6]">Booking operations</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">Prenotazioni</h1>
        <p className="mt-2 text-sm text-[#64748B]">Vista globale delle attività manuali e marketplace.</p>

        <form className="mt-6 grid gap-2 rounded-2xl border border-[#DEE5E8] bg-white p-3 shadow-sm sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1.5fr_auto]">
          <select name="status" defaultValue={query.status ?? ""} className="min-h-12 rounded-xl border border-[#DEE5E8] bg-white px-4">
            <option value="">Tutti gli stati</option>
            {["DRAFT", "PENDING_PAYMENT", "PAYMENT_PROCESSING", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED_BY_CUSTOMER", "CANCELLED_BY_OPERATOR", "CANCELLED_BY_BOATLY", "PAYMENT_FAILED", "REFUND_PENDING", "REFUNDED", "PARTIALLY_REFUNDED", "NO_SHOW"].map((status) => <option key={status}>{status}</option>)}
          </select>
          <select name="source" defaultValue={query.source ?? ""} className="min-h-12 rounded-xl border border-[#DEE5E8] bg-white px-4">
            <option value="">Tutte le fonti</option><option>MARKETPLACE</option><option>MANUAL</option>
          </select>
          <select name="operator" defaultValue={query.operator ?? ""} className="min-h-12 min-w-0 rounded-xl border border-[#DEE5E8] bg-white px-4">
            <option value="">Tutti gli operatori</option>
            {(operatorResult.data ?? []).map((operator) => <option key={operator.id} value={operator.id}>{operator.name}</option>)}
          </select>
          <button className="min-h-12 rounded-xl bg-[#0B1F33] px-5 text-sm font-semibold text-white">Filtra</button>
        </form>

        <section className="mt-6 overflow-hidden rounded-3xl border border-[#DEE5E8] bg-white shadow-sm">
          <div className="divide-y divide-[#DEE5E8]">
            {(bookings ?? []).map((booking) => {
              const boat = (booking.boat_snapshot ?? {}) as { name?: string };
              const customer = (booking.customer_snapshot ?? {}) as { display_name?: string; email?: string };
              return (
                <article key={booking.id} className="grid gap-4 p-5 lg:grid-cols-[1.2fr_1fr_1fr_1fr_auto] lg:items-center">
                  <div>
                    <p className="font-semibold">{booking.reference ?? "—"}</p>
                    <Link href={`/admin/operators/${booking.operator_id}`} className="mt-1 inline-block text-xs text-[#64748B] hover:text-[#14B8A6]">
                      {operatorMap.get(booking.operator_id) ?? booking.operator_id} · {booking.source}
                    </Link>
                  </div>
                  <div><p className="text-sm font-medium">{boat.name ?? "Barca"}</p><p className="mt-1 text-xs text-[#64748B]">{customer.display_name ?? customer.email ?? "Cliente"}</p></div>
                  <p className="text-sm">{new Date(booking.starts_at).toLocaleString("it-IT")}</p>
                  <div className="text-sm"><p>Cliente: <strong>{money(booking.customer_total_cents_snapshot, booking.currency_snapshot ?? "EUR")}</strong></p><p className="mt-1 text-xs text-[#64748B]">Fee: {money(booking.commission_amount_cents_snapshot, booking.currency_snapshot ?? "EUR")}</p></div>
                  <span className="w-fit rounded-full bg-[#F1F5F4] px-3 py-2 text-xs font-semibold">{booking.status}</span>
                </article>
              );
            })}
            {(bookings ?? []).length === 0 ? <div className="p-10 text-center text-sm text-[#64748B]">Nessuna prenotazione.</div> : null}
          </div>
        </section>
      </div>
    </main>
  );
}
