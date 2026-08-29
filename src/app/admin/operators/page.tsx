import Link from "next/link";

import AdminNav from "@/components/admin/admin-nav";
import { requirePlatformContext } from "@/lib/admin/context";

type PageProps = {
  searchParams: Promise<{ q?: string; status?: string }>;
};

function statusClasses(status: string) {
  if (status === "ACTIVE") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (status === "PENDING_VERIFICATION") return "bg-amber-50 text-amber-800 ring-amber-200";
  if (status === "SUSPENDED" || status === "REJECTED") return "bg-rose-50 text-rose-700 ring-rose-200";
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

export default async function AdminOperatorsPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const { supabase } = await requirePlatformContext([
    "SUPER_ADMIN",
    "ADMIN",
    "COMPLIANCE",
    "SUPPORT",
  ]);

  let request = supabase
    .from("operators")
    .select("id, name, slug, status, country_code, currency, timezone, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (query.status) request = request.eq("status", query.status);
  if (query.q?.trim()) request = request.ilike("name", `%${query.q.trim()}%`);
  const { data: operators, error } = await request;
  if (error) throw new Error(`Unable to load operators: ${error.message}`);

  const pendingCount = (operators ?? []).filter((operator) =>
    ["DRAFT", "PENDING_VERIFICATION"].includes(operator.status),
  ).length;

  return (
    <main className="min-h-screen bg-[#F6F8F9] text-[#0B1F33]">
      <AdminNav />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#14B8A6]">Supply control</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight">Operatori</h1>
            <p className="mt-2 text-sm text-[#64748B]">
              {operators?.length ?? 0} risultati · {pendingCount} da completare o approvare
            </p>
          </div>
          <Link href="/admin/verifications" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#0B1F33] px-5 text-sm font-semibold text-white">
            Coda approvazioni
          </Link>
        </div>

        <form className="mt-6 flex flex-col gap-2 rounded-2xl border border-[#DEE5E8] bg-white p-3 shadow-sm sm:flex-row">
          <input
            name="q"
            defaultValue={query.q ?? ""}
            placeholder="Cerca operatore"
            className="min-h-12 flex-1 rounded-xl border border-[#DEE5E8] bg-white px-4 outline-none focus:border-[#14B8A6]"
          />
          <select name="status" defaultValue={query.status ?? ""} className="min-h-12 rounded-xl border border-[#DEE5E8] bg-white px-4">
            <option value="">Tutti gli stati</option>
            {["DRAFT", "PENDING_VERIFICATION", "ACTIVE", "SUSPENDED", "REJECTED"].map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
          <button className="min-h-12 rounded-xl bg-[#14B8A6] px-5 text-sm font-semibold text-white">Filtra</button>
        </form>

        <section className="mt-6 overflow-hidden rounded-3xl border border-[#DEE5E8] bg-white shadow-sm">
          <div className="divide-y divide-[#DEE5E8]">
            {(operators ?? []).map((operator) => (
              <Link
                key={operator.id}
                href={`/admin/operators/${operator.id}`}
                className="grid gap-3 p-5 transition hover:bg-[#F7FAFA] md:grid-cols-[1.4fr_0.8fr_0.8fr_auto] md:items-center"
              >
                <div>
                  <p className="font-semibold">{operator.name}</p>
                  <p className="mt-1 text-xs text-[#64748B]">{operator.slug ?? operator.id}</p>
                </div>
                <p className="text-sm">{operator.country_code} · {operator.currency}</p>
                <p className="text-sm text-[#64748B]">{operator.timezone}</p>
                <div className="flex items-center gap-3 md:justify-end">
                  <span className={`rounded-full px-3 py-2 text-xs font-semibold ring-1 ${statusClasses(operator.status)}`}>{operator.status}</span>
                  <span aria-hidden="true" className="text-lg text-[#64748B]">→</span>
                </div>
              </Link>
            ))}
            {(operators ?? []).length === 0 ? (
              <div className="p-10 text-center text-sm text-[#64748B]">Nessun operatore corrisponde ai filtri.</div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
