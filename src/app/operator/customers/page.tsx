import OperatorNav from "@/components/operator/operator-nav";
import { requireOperatorWorkspaceContext } from "@/lib/operator/workspace-context";

type PageProps = { searchParams: Promise<{ operator?: string; q?: string }> };

export default async function OperatorCustomersPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const { supabase, operator } = await requireOperatorWorkspaceContext(query.operator);

  let request = supabase
    .from("operator_customers")
    .select("id, display_name, email, phone, country_code, notes, created_at, updated_at")
    .eq("operator_id", operator.id)
    .order("updated_at", { ascending: false })
    .limit(200);

  if (query.q?.trim()) request = request.ilike("display_name", `%${query.q.trim()}%`);

  const { data: customers, error } = await request;
  if (error) throw new Error(`Unable to load customers: ${error.message}`);

  return (
    <main className="min-h-screen bg-[#FCFBF8] text-[#0B1F33]">
      <OperatorNav operatorId={operator.id} operatorName={operator.name} />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div>
          <p className="text-sm font-semibold text-[#14B8A6]">CRM</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight">Clienti</h1>
          <p className="mt-2 text-sm text-[#64748B]">Clienti marketplace e contatti creati dalle prenotazioni manuali.</p>
        </div>

        <form className="mt-6 flex max-w-xl gap-2">
          <input type="hidden" name="operator" value={operator.id} />
          <input name="q" defaultValue={query.q ?? ""} placeholder="Cerca per nome" className="min-w-0 flex-1 rounded-xl border border-[#DEE5E8] bg-white px-4 py-3 outline-none focus:border-[#14B8A6]" />
          <button className="rounded-xl bg-[#0B1F33] px-5 py-3 text-sm font-semibold text-white">Cerca</button>
        </form>

        <section className="mt-6 overflow-hidden rounded-3xl border border-[#DEE5E8] bg-white shadow-sm">
          {(customers ?? []).length === 0 ? <div className="p-10 text-center text-sm text-[#64748B]">Nessun cliente trovato.</div> : <div className="divide-y divide-[#DEE5E8]">{(customers ?? []).map((customer) => <article key={customer.id} className="grid gap-3 p-5 md:grid-cols-[1.2fr_1fr_1fr] md:items-center"><div><p className="font-semibold">{customer.display_name}</p><p className="mt-1 text-xs text-[#64748B]">{customer.country_code ?? "—"}</p></div><div className="text-sm"><p>{customer.email ?? "—"}</p><p className="mt-1 text-xs text-[#64748B]">{customer.phone ?? ""}</p></div><div className="text-sm text-[#64748B]">{customer.notes ?? "Nessuna nota"}</div></article>)}</div>}
        </section>
      </div>
    </main>
  );
}
