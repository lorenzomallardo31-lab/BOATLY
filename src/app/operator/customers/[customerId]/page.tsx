import Link from "next/link";
import { redirect } from "next/navigation";

import CustomerForm from "@/components/operator/customer-form";
import OperatorNav from "@/components/operator/operator-nav";
import { requireOperatorWorkspaceContext } from "@/lib/operator/workspace-context";

type PageProps = {
  params: Promise<{ customerId: string }>;
  searchParams: Promise<{ operator?: string; saved?: string }>;
};

function money(cents: number, currency: string) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency }).format(cents / 100);
}

function when(value: string, timezone: string) {
  return new Intl.DateTimeFormat("it-IT", { dateStyle: "medium", timeStyle: "short", timeZone: timezone }).format(new Date(value));
}

export default async function CustomerDetailPage({ params, searchParams }: PageProps) {
  const { customerId } = await params;
  const query = await searchParams;
  const { supabase, operator } = await requireOperatorWorkspaceContext(query.operator);

  const [{ data: customer, error }, { data: bookings, error: bookingsError }] = await Promise.all([
    supabase
      .from("operator_customers")
      .select("id, display_name, email, phone, country_code, date_of_birth, notes, created_at, updated_at")
      .eq("operator_id", operator.id)
      .eq("id", customerId)
      .maybeSingle(),
    supabase
      .from("bookings")
      .select("id, reference, status, starts_at, ends_at, operator_amount_cents_snapshot, boat_snapshot")
      .eq("operator_id", operator.id)
      .eq("operator_customer_id", customerId)
      .order("starts_at", { ascending: false })
      .limit(200),
  ]);

  if (error || !customer) redirect(`/operator/customers?operator=${operator.id}`);
  if (bookingsError) throw new Error("Unable to load customer bookings.");

  const totalValue = (bookings ?? []).reduce((sum, booking) => sum + (booking.operator_amount_cents_snapshot ?? 0), 0);

  return (
    <main className="min-h-screen bg-[#F7F6FB] pb-28 text-[#171A2B] lg:pb-12">
      <OperatorNav operatorId={operator.id} operatorName={operator.name} />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <Link href={`/operator/customers?operator=${operator.id}`} className="text-sm font-semibold text-[#676B80]">← Clienti</Link>

        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#6D5DFB]">Scheda cliente</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">{customer.display_name}</h1>
          </div>
          <Link href={`/operator/bookings/new?operator=${operator.id}&customer=${customer.id}`} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#171A2B] px-5 text-sm font-semibold text-white">+ Nuova prenotazione</Link>
        </div>

        {query.saved === "1" ? <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">Cliente verificato e salvato.</div> : null}

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.15fr]">
          <section className="rounded-3xl border border-[#E2DFEB] bg-white p-5 shadow-sm sm:p-7">
            <h2 className="text-xl font-semibold">Dati CRM</h2>
            <p className="mt-1 text-sm text-[#676B80]">Ogni modifica viene validata e registrata nell’audit.</p>
            <div className="mt-6">
              <CustomerForm
                operatorId={operator.id}
                customer={{
                  id: customer.id,
                  displayName: customer.display_name,
                  email: customer.email,
                  phone: customer.phone,
                  countryCode: customer.country_code,
                  dateOfBirth: customer.date_of_birth,
                  notes: customer.notes,
                }}
              />
            </div>
          </section>

          <div className="space-y-6">
            <section className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-[#E2DFEB] bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase text-[#676B80]">Prenotazioni</p><p className="mt-2 text-2xl font-semibold">{(bookings ?? []).length}</p></div>
              <div className="rounded-2xl border border-[#E2DFEB] bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase text-[#676B80]">Valore storico</p><p className="mt-2 text-2xl font-semibold">{money(totalValue, operator.currency)}</p></div>
            </section>

            <section className="rounded-3xl border border-[#E2DFEB] bg-white p-5 shadow-sm sm:p-7">
              <h2 className="text-xl font-semibold">Storico prenotazioni</h2>
              {(bookings ?? []).length ? (
                <div className="mt-5 divide-y divide-[#E2DFEB]">
                  {(bookings ?? []).map((booking) => {
                    const boat = (booking.boat_snapshot ?? {}) as { name?: string };
                    return (
                      <Link key={booking.id} href={`/operator/bookings/${booking.id}?operator=${operator.id}`} className="flex min-h-20 items-center justify-between gap-4 py-4 transition hover:text-[#4C3FC2]">
                        <div><p className="text-sm font-semibold">{boat.name ?? "Barca"} · {booking.reference ?? "Booking"}</p><p className="mt-1 text-xs text-[#676B80]">{when(booking.starts_at, operator.timezone)}</p></div>
                        <div className="text-right"><p className="text-sm font-semibold">{money(booking.operator_amount_cents_snapshot ?? 0, operator.currency)}</p><p className="mt-1 text-[10px] font-bold text-[#676B80]">{booking.status}</p></div>
                      </Link>
                    );
                  })}
                </div>
              ) : <p className="mt-5 text-sm text-[#676B80]">Nessuna prenotazione registrata.</p>}
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
