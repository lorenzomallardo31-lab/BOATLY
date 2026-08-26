import AdminNav from "@/components/admin/admin-nav";
import { requirePlatformContext } from "@/lib/admin/context";

type PageProps = { searchParams: Promise<{ status?: string; source?: string }> };

function money(cents: number | null, currency = "EUR") {
  if (cents === null) return "—";
  return new Intl.NumberFormat("it-IT", { style: "currency", currency }).format(cents / 100);
}

export default async function AdminBookingsPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const { supabase } = await requirePlatformContext(["SUPER_ADMIN", "ADMIN", "SUPPORT", "FINANCE", "COMPLIANCE"]);

  let request = supabase.from("bookings").select("id, operator_id, reference, source, status, starts_at, passenger_count, currency_snapshot, customer_total_cents_snapshot, commission_amount_cents_snapshot, operator_amount_cents_snapshot, boat_snapshot, customer_snapshot, created_at").order("created_at", { ascending: false }).limit(200);
  if (query.status) request = request.eq("status", query.status);
  if (query.source) request = request.eq("source", query.source);
  const { data: bookings, error } = await request;
  if (error) throw new Error(`Unable to load admin bookings: ${error.message}`);

  const operatorIds = Array.from(new Set((bookings ?? []).map((booking)=>booking.operator_id)));
  const operatorResult = operatorIds.length ? await supabase.from("operators").select("id, name").in("id", operatorIds) : { data: [], error: null };
  if (operatorResult.error) throw new Error(`Unable to load booking operators: ${operatorResult.error.message}`);
  const operatorMap = new Map((operatorResult.data ?? []).map((operator)=>[operator.id,operator.name]));

  return <main className="min-h-screen bg-[#FCFBF8] text-[#0B1F33]"><AdminNav/><div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"><p className="text-sm font-semibold text-[#14B8A6]">Marketplace operations</p><h1 className="mt-2 text-4xl font-semibold tracking-tight">Booking</h1><form className="mt-6 flex flex-wrap gap-2"><select name="status" defaultValue={query.status??""} className="rounded-xl border border-[#DEE5E8] bg-white px-4 py-3"><option value="">Tutti gli stati</option>{["PENDING_PAYMENT","PAYMENT_PROCESSING","CONFIRMED","IN_PROGRESS","COMPLETED","PAYMENT_FAILED","REFUND_PENDING","REFUNDED","PARTIALLY_REFUNDED","NO_SHOW"].map((s)=><option key={s}>{s}</option>)}</select><select name="source" defaultValue={query.source??""} className="rounded-xl border border-[#DEE5E8] bg-white px-4 py-3"><option value="">Tutte le fonti</option><option>MARKETPLACE</option><option>MANUAL</option></select><button className="rounded-xl bg-[#0B1F33] px-5 py-3 text-sm font-semibold text-white">Filtra</button></form><section className="mt-6 overflow-hidden rounded-3xl border border-[#DEE5E8] bg-white shadow-sm"><div className="divide-y divide-[#DEE5E8]">{(bookings??[]).map((booking)=>{const boat=(booking.boat_snapshot??{}) as {name?:string};const customer=(booking.customer_snapshot??{}) as {display_name?:string;email?:string};return <article key={booking.id} className="grid gap-4 p-5 lg:grid-cols-[1.2fr_1fr_1fr_1fr_auto] lg:items-center"><div><p className="font-semibold">{booking.reference??"—"}</p><p className="mt-1 text-xs text-[#64748B]">{operatorMap.get(booking.operator_id)??booking.operator_id} · {booking.source}</p></div><div><p className="text-sm font-medium">{boat.name??"Barca"}</p><p className="mt-1 text-xs text-[#64748B]">{customer.display_name??customer.email??"Cliente"}</p></div><p className="text-sm">{new Date(booking.starts_at).toLocaleString("it-IT")}</p><div className="text-sm"><p>Cliente: <strong>{money(booking.customer_total_cents_snapshot,booking.currency_snapshot??"EUR")}</strong></p><p className="mt-1 text-xs text-[#64748B]">Fee: {money(booking.commission_amount_cents_snapshot,booking.currency_snapshot??"EUR")}</p></div><span className="rounded-full bg-[#F1F5F4] px-3 py-2 text-xs font-semibold">{booking.status}</span></article>})}{(bookings??[]).length===0?<div className="p-10 text-center text-sm text-[#64748B]">Nessun booking.</div>:null}</div></section></div></main>;
}
