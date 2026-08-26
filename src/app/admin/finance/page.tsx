import AdminNav from "@/components/admin/admin-nav";
import { requirePlatformContext } from "@/lib/admin/context";

function money(cents: number, currency: string) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency }).format(cents / 100);
}

export default async function AdminFinancePage() {
  const { supabase } = await requirePlatformContext(["SUPER_ADMIN", "ADMIN", "FINANCE"]);
  const [accounts, payments, refunds, payouts] = await Promise.all([
    supabase.from("stripe_connected_accounts").select("id, operator_id, stripe_account_id, status, charges_enabled, payouts_enabled, details_submitted, last_synced_at").order("updated_at", { ascending: false }).limit(100),
    supabase.from("payments").select("id, operator_id, booking_id, status, amount_cents, amount_received_cents, amount_refunded_cents, platform_fee_cents, currency, reconciliation_status, reconciliation_note, created_at").order("created_at", { ascending: false }).limit(100),
    supabase.from("refunds").select("id, operator_id, booking_id, amount_cents, currency, status, reconciliation_status, created_at").order("created_at", { ascending: false }).limit(50),
    supabase.from("payouts").select("id, operator_id, amount_cents, currency, status, reconciliation_status, arrival_date, created_at").order("created_at", { ascending: false }).limit(50),
  ]);
  const firstError = [accounts,payments,refunds,payouts].find((result)=>result.error)?.error;
  if (firstError) throw new Error(`Unable to load finance dashboard: ${firstError.message}`);

  const gross = (payments.data??[]).filter((p)=>p.status==="SUCCEEDED").reduce((sum,p)=>sum+p.amount_received_cents,0);
  const fees = (payments.data??[]).filter((p)=>p.status==="SUCCEEDED").reduce((sum,p)=>sum+p.platform_fee_cents,0);
  const mismatches = (payments.data??[]).filter((p)=>p.reconciliation_status==="MISMATCH").length;

  return <main className="min-h-screen bg-[#FCFBF8] text-[#0B1F33]"><AdminNav/><div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"><p className="text-sm font-semibold text-[#14B8A6]">Financial operations</p><h1 className="mt-2 text-4xl font-semibold tracking-tight">Finance</h1><section className="mt-8 grid gap-4 md:grid-cols-4">{[["GMV ricevuto",money(gross,"EUR")],["Fee Boatly",money(fees,"EUR")],["Mismatch",String(mismatches)],["Connect account",String((accounts.data??[]).length)]].map(([l,v])=><div key={l} className="rounded-3xl border border-[#DEE5E8] bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase text-[#64748B]">{l}</p><p className="mt-2 text-2xl font-semibold">{v}</p></div>)}</section><section className="mt-6 rounded-3xl border border-[#DEE5E8] bg-white p-6 shadow-sm"><h2 className="text-xl font-semibold">Pagamenti recenti</h2><div className="mt-4 divide-y divide-[#DEE5E8]">{(payments.data??[]).map((p)=><div key={p.id} className="grid gap-3 py-4 md:grid-cols-[1fr_1fr_1fr_auto]"><div><p className="text-sm font-semibold">{money(p.amount_cents,p.currency)}</p><p className="text-xs text-[#64748B]">Booking {p.booking_id}</p></div><p className="text-sm">{p.status}</p><p className="text-sm">Reconciliation: <strong>{p.reconciliation_status}</strong></p><p className="text-xs text-[#64748B]">Fee {money(p.platform_fee_cents,p.currency)}</p></div>)}</div></section><div className="mt-6 grid gap-6 lg:grid-cols-2"><section className="rounded-3xl border border-[#DEE5E8] bg-white p-6 shadow-sm"><h2 className="text-xl font-semibold">Rimborsi</h2><div className="mt-4 space-y-3">{(refunds.data??[]).map((r)=><div key={r.id} className="rounded-2xl bg-[#F1F5F4] p-4 text-sm"><strong>{money(r.amount_cents,r.currency)}</strong> · {r.status}<p className="mt-1 text-xs text-[#64748B]">{r.reconciliation_status}</p></div>)}{(refunds.data??[]).length===0?<p className="text-sm text-[#64748B]">Nessun rimborso.</p>:null}</div></section><section className="rounded-3xl border border-[#DEE5E8] bg-white p-6 shadow-sm"><h2 className="text-xl font-semibold">Payout</h2><div className="mt-4 space-y-3">{(payouts.data??[]).map((p)=><div key={p.id} className="rounded-2xl bg-[#F1F5F4] p-4 text-sm"><strong>{money(p.amount_cents,p.currency)}</strong> · {p.status}<p className="mt-1 text-xs text-[#64748B]">Arrivo {p.arrival_date??"—"} · {p.reconciliation_status}</p></div>)}{(payouts.data??[]).length===0?<p className="text-sm text-[#64748B]">Nessun payout.</p>:null}</div></section></div></div></main>;
}
