import AdminNav from "@/components/admin/admin-nav";
import { requirePlatformContext } from "@/lib/admin/context";

type PageProps = { searchParams: Promise<{ q?: string; status?: string }> };

export default async function AdminOperatorsPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const { supabase } = await requirePlatformContext(["SUPER_ADMIN", "ADMIN", "COMPLIANCE", "SUPPORT"]);

  let request = supabase.from("operators").select("id, name, slug, status, country_code, currency, timezone, created_at").order("created_at", { ascending: false }).limit(200);
  if (query.status) request = request.eq("status", query.status);
  if (query.q?.trim()) request = request.ilike("name", `%${query.q.trim()}%`);
  const { data: operators, error } = await request;
  if (error) throw new Error(`Unable to load operators: ${error.message}`);

  return <main className="min-h-screen bg-[#FCFBF8] text-[#0B1F33]"><AdminNav /><div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"><p className="text-sm font-semibold text-[#14B8A6]">Supply</p><h1 className="mt-2 text-4xl font-semibold tracking-tight">Operatori</h1><form className="mt-6 flex flex-wrap gap-2"><input name="q" defaultValue={query.q ?? ""} placeholder="Cerca operatore" className="rounded-xl border border-[#DEE5E8] bg-white px-4 py-3"/><select name="status" defaultValue={query.status ?? ""} className="rounded-xl border border-[#DEE5E8] bg-white px-4 py-3"><option value="">Tutti gli stati</option>{["DRAFT","PENDING_VERIFICATION","ACTIVE","SUSPENDED","REJECTED"].map((status)=><option key={status}>{status}</option>)}</select><button className="rounded-xl bg-[#0B1F33] px-5 py-3 text-sm font-semibold text-white">Filtra</button></form><section className="mt-6 overflow-hidden rounded-3xl border border-[#DEE5E8] bg-white shadow-sm"><div className="divide-y divide-[#DEE5E8]">{(operators ?? []).map((operator)=><article key={operator.id} className="grid gap-3 p-5 md:grid-cols-[1.3fr_1fr_1fr_auto] md:items-center"><div><p className="font-semibold">{operator.name}</p><p className="mt-1 text-xs text-[#64748B]">{operator.slug ?? operator.id}</p></div><p className="text-sm">{operator.country_code} · {operator.currency}</p><p className="text-sm text-[#64748B]">{operator.timezone}</p><span className="rounded-full bg-[#F1F5F4] px-3 py-2 text-xs font-semibold">{operator.status}</span></article>)}</div></section></div></main>;
}
