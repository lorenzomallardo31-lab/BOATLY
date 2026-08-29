import Link from "next/link";

import OperatorNav from "@/components/operator/operator-nav";
import { todayInTimeZone } from "@/lib/operator/date-time";
import { requireOperatorWorkspaceContext } from "@/lib/operator/workspace-context";

type PageProps = {
  searchParams: Promise<{ operator?: string; q?: string }>;
};

function money(cents: number, currency: string) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function shortDate(value: string, timezone: string) {
  return new Intl.DateTimeFormat("it-IT", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: timezone,
  }).format(new Date(value));
}

export default async function OperatorCustomersPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const { supabase, operator } = await requireOperatorWorkspaceContext(query.operator);
  const rawSearch = query.q?.trim() ?? "";
  const safeSearch = rawSearch.replace(/[,()%_*]/g, " ").replace(/\s+/g, " ").trim();

  let request = supabase
    .from("operator_customers")
    .select("id, display_name, email, phone, country_code, notes, created_at, updated_at")
    .eq("operator_id", operator.id)
    .order("updated_at", { ascending: false })
    .limit(200);

  if (safeSearch) {
    request = request.or(
      `display_name.ilike.%${safeSearch}%,email.ilike.%${safeSearch}%,phone.ilike.%${safeSearch}%`,
    );
  }

  const { data: customers, error } = await request;
  if (error) throw new Error(`Unable to load customers: ${error.message}`);

  const customerIds = (customers ?? []).map((customer) => customer.id);
  const { data: bookingData, error: bookingsError } = customerIds.length
    ? await supabase
        .from("bookings")
        .select("id, operator_customer_id, status, starts_at, operator_amount_cents_snapshot")
        .eq("operator_id", operator.id)
        .in("operator_customer_id", customerIds)
        .order("starts_at", { ascending: false })
        .limit(5000)
    : { data: [], error: null };

  if (bookingsError) throw new Error(`Unable to load customer activity: ${bookingsError.message}`);

  const bookingsByCustomer = new Map<string, typeof bookingData>();
  for (const booking of bookingData ?? []) {
    if (!booking.operator_customer_id) continue;
    const list = bookingsByCustomer.get(booking.operator_customer_id) ?? [];
    list.push(booking);
    bookingsByCustomer.set(booking.operator_customer_id, list);
  }
  const today = todayInTimeZone(operator.timezone);

  return (
    <main className="min-h-screen bg-[#F7F6FB] pb-28 text-[#171A2B] lg:pb-12">
      <OperatorNav operatorId={operator.id} operatorName={operator.name} />

      <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-9 lg:px-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#6D5DFB]">CRM operativo</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Clienti</h1>
            <p className="mt-2 text-sm text-[#676B80]">Contatti, storico e nuove prenotazioni nello stesso workspace.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/operator/customers/import?operator=${operator.id}`} className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[#D8D5E5] bg-white px-5 text-sm font-semibold text-[#4C3FC2]">
              Importa CSV
            </Link>
            <Link href={`/operator/customers/new?operator=${operator.id}`} className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[#D8D5E5] bg-white px-5 text-sm font-semibold text-[#4C3FC2]">
              + Cliente
            </Link>
            <Link href={`/operator/bookings/new?operator=${operator.id}&date=${today}`} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#171A2B] px-5 text-sm font-semibold text-white">
              + Prenotazione
            </Link>
          </div>
        </div>

        <form className="mt-6 flex max-w-2xl gap-2 rounded-2xl border border-[#E2DFEB] bg-white p-2 shadow-sm">
          <input type="hidden" name="operator" value={operator.id} />
          <input
            name="q"
            defaultValue={rawSearch}
            placeholder="Cerca nome, email o telefono"
            className="min-h-11 min-w-0 flex-1 rounded-xl border-0 bg-transparent px-3 text-base outline-none sm:text-sm"
          />
          <button className="min-h-11 rounded-xl bg-[#6D5DFB] px-5 text-sm font-semibold text-white">Cerca</button>
        </form>

        <div className="mt-5 flex items-center justify-between gap-4">
          <p className="text-sm font-semibold">{(customers ?? []).length} contatti mostrati</p>
          {rawSearch ? <Link href={`/operator/customers?operator=${operator.id}`} className="text-sm font-semibold text-[#4C3FC2]">Azzera ricerca</Link> : null}
        </div>

        {(customers ?? []).length === 0 ? (
          <section className="mt-5 rounded-3xl border border-dashed border-[#B8B2D7] bg-white p-10 text-center">
            <h2 className="text-xl font-semibold">{rawSearch ? "Nessun cliente corrisponde" : "Il CRM è ancora vuoto"}</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#676B80]">
              {rawSearch ? "Prova con un dato diverso." : "Il primo cliente verrà creato automaticamente quando registri una prenotazione diretta."}
            </p>
          </section>
        ) : (
          <section className="mt-5 grid gap-4 lg:grid-cols-2">
            {(customers ?? []).map((customer) => {
              const customerBookings = bookingsByCustomer.get(customer.id) ?? [];
              const activeBookings = customerBookings.filter((booking) =>
                ["DRAFT", "PENDING_PAYMENT", "PAYMENT_PROCESSING", "CONFIRMED", "IN_PROGRESS"].includes(booking.status),
              );
              const value = customerBookings.reduce(
                (sum, booking) => sum + (booking.operator_amount_cents_snapshot ?? 0),
                0,
              );
              const latest = customerBookings[0];

              return (
                <article key={customer.id} className="rounded-3xl border border-[#E2DFEB] bg-white p-5 shadow-sm sm:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#EDE9FE] text-sm font-bold text-[#4C3FC2]">
                        {customer.display_name.slice(0, 2).toUpperCase()}
                      </div>
                      <h2 className="mt-3 truncate text-xl font-semibold">{customer.display_name}</h2>
                      <p className="mt-1 text-xs text-[#676B80]">Cliente dal {shortDate(customer.created_at, operator.timezone)}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-[10px] font-bold ${activeBookings.length ? "bg-[#FFF0D6] text-[#A14B08]" : "bg-emerald-50 text-emerald-700"}`}>
                      {activeBookings.length ? `${activeBookings.length} ATTIVE` : "NESSUNA ATTIVA"}
                    </span>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3 rounded-2xl bg-[#F8F7FC] p-4 text-sm">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-[#676B80]">Prenotazioni</p>
                      <p className="mt-1 text-lg font-semibold">{customerBookings.length}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-[#676B80]">Valore storico</p>
                      <p className="mt-1 text-lg font-semibold">{money(value, operator.currency)}</p>
                    </div>
                  </div>

                  <dl className="mt-5 grid gap-2 text-sm">
                    <div className="flex items-start justify-between gap-4"><dt className="text-[#676B80]">Email</dt><dd className="break-all text-right font-medium">{customer.email ?? "—"}</dd></div>
                    <div className="flex items-start justify-between gap-4"><dt className="text-[#676B80]">Telefono</dt><dd className="text-right font-medium">{customer.phone ?? "—"}</dd></div>
                    <div className="flex items-start justify-between gap-4"><dt className="text-[#676B80]">Ultima attività</dt><dd className="text-right font-medium">{latest ? shortDate(latest.starts_at, operator.timezone) : "—"}</dd></div>
                  </dl>

                  {customer.notes ? <p className="mt-4 rounded-xl bg-[#FFF8EA] p-3 text-xs leading-5 text-[#7C5A20]">{customer.notes}</p> : null}

                  <div className="mt-5 grid gap-2 sm:grid-cols-2">
                    <Link href={`/operator/customers/${customer.id}?operator=${operator.id}`} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#D8D5E5] px-4 text-sm font-semibold text-[#4C3FC2]">
                      Apri scheda
                    </Link>
                    <Link href={`/operator/bookings/new?operator=${operator.id}&date=${today}&customer=${customer.id}`} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#171A2B] px-4 text-sm font-semibold text-white">
                      + Prenotazione
                    </Link>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}
