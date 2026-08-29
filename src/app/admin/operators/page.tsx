import Link from "next/link";

import AdminNav from "@/components/admin/admin-nav";
import { requirePlatformContext } from "@/lib/admin/context";

import { cleanupPilotStorage } from "./actions";

type PageProps = {
  searchParams: Promise<{ q?: string; status?: string; deleted?: string; storageCleared?: string }>;
};

function visibleStatus(status: string) {
  if (status === "ACTIVE") return "Confermato";
  if (status === "SUSPENDED") return "Bloccato";
  if (status === "REJECTED") return "Rifiutato";
  return "Da verificare";
}

function statusClasses(status: string) {
  if (status === "ACTIVE") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (status === "SUSPENDED") return "bg-violet-50 text-violet-700 ring-violet-200";
  if (status === "REJECTED") return "bg-rose-50 text-rose-700 ring-rose-200";
  return "bg-amber-50 text-amber-800 ring-amber-200";
}

export default async function AdminOperatorsPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const { supabase } = await requirePlatformContext(["SUPER_ADMIN"]);

  let request = supabase
    .from("operators")
    .select("id, name, slug, status, country_code, currency, timezone, created_at, purge_after")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(200);

  if (query.status === "pending") request = request.in("status", ["DRAFT", "PENDING_VERIFICATION"]);
  if (query.status === "confirmed") request = request.eq("status", "ACTIVE");
  if (query.status === "rejected") request = request.eq("status", "REJECTED");
  if (query.status === "suspended") request = request.eq("status", "SUSPENDED");
  if (query.q?.trim()) request = request.ilike("name", `%${query.q.trim()}%`);

  const [listResult, pendingResult, confirmedResult, suspendedResult, rejectedResult] = await Promise.all([
    request,
    supabase.from("operators").select("id", { count: "exact", head: true }).is("deleted_at", null).in("status", ["DRAFT", "PENDING_VERIFICATION"]),
    supabase.from("operators").select("id", { count: "exact", head: true }).is("deleted_at", null).eq("status", "ACTIVE"),
    supabase.from("operators").select("id", { count: "exact", head: true }).is("deleted_at", null).eq("status", "SUSPENDED"),
    supabase.from("operators").select("id", { count: "exact", head: true }).is("deleted_at", null).eq("status", "REJECTED"),
  ]);
  const firstError = [listResult, pendingResult, confirmedResult, suspendedResult, rejectedResult].find((result) => result.error)?.error;
  if (firstError) throw new Error(`Unable to load operators: ${firstError.message}`);
  const operators = listResult.data ?? [];
  const counts = {
    pending: pendingResult.count ?? 0,
    confirmed: confirmedResult.count ?? 0,
    suspended: suspendedResult.count ?? 0,
    rejected: rejectedResult.count ?? 0,
  };

  return (
    <main className="min-h-screen bg-[#F6F8F9] text-[#0B1F33]">
      <AdminNav />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#14B8A6]">Accessi al gestionale</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">Iscrizioni noleggiatori</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#64748B]">
          Ogni nuovo account resta in attesa finché non lo confermi. I rifiutati spariscono automaticamente dopo due minuti.
        </p>

        {query.deleted === "1" ? (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Eliminazione programmata. L’account sparirà definitivamente entro due minuti.
          </div>
        ) : null}

        {query.storageCleared !== undefined ? (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            Pulizia completata: {query.storageCleared} file TEST rimossi in modo sicuro.
          </div>
        ) : null}

        <section className="mt-7 grid gap-3 sm:grid-cols-4">
          {[
            ["Da verificare", counts.pending, "pending", "bg-amber-50 text-amber-900"],
            ["Confermati", counts.confirmed, "confirmed", "bg-emerald-50 text-emerald-900"],
            ["Bloccati", counts.suspended, "suspended", "bg-violet-50 text-violet-900"],
            ["Rifiutati", counts.rejected, "rejected", "bg-rose-50 text-rose-900"],
          ].map(([label, count, status, classes]) => (
            <Link key={String(status)} href={`/admin/operators?status=${status}`} className={`rounded-2xl p-5 ${classes}`}>
              <p className="text-sm font-semibold">{label}</p>
              <p className="mt-1 text-3xl font-semibold">{count}</p>
            </Link>
          ))}
        </section>

        <form className="mt-6 flex flex-col gap-2 rounded-2xl border border-[#DEE5E8] bg-white p-3 shadow-sm sm:flex-row">
          <input name="q" defaultValue={query.q ?? ""} placeholder="Cerca per nome attività" className="min-h-12 flex-1 rounded-xl border border-[#DEE5E8] px-4 outline-none focus:border-[#14B8A6]" />
          <select name="status" defaultValue={query.status ?? ""} className="min-h-12 rounded-xl border border-[#DEE5E8] bg-white px-4">
            <option value="">Tutti</option>
            <option value="pending">Da verificare</option>
            <option value="confirmed">Confermato</option>
            <option value="suspended">Bloccato</option>
            <option value="rejected">Rifiutato</option>
          </select>
          <button className="min-h-12 rounded-xl bg-[#0B1F33] px-5 text-sm font-semibold text-white">Cerca</button>
        </form>

        <section className="mt-6 overflow-hidden rounded-3xl border border-[#DEE5E8] bg-white shadow-sm">
          <div className="divide-y divide-[#DEE5E8]">
            {operators.map((operator) => (
              <Link key={operator.id} href={`/admin/operators/${operator.id}`} className="grid gap-3 p-5 transition hover:bg-[#F7FAFA] md:grid-cols-[1.5fr_0.8fr_auto] md:items-center">
                <div>
                  <p className="text-lg font-semibold">{operator.name}</p>
                  <p className="mt-1 text-xs text-[#64748B]">Iscritto il {new Intl.DateTimeFormat("it-IT", { dateStyle: "medium", timeZone: "Europe/Rome" }).format(new Date(operator.created_at))}</p>
                </div>
                <p className="text-sm text-[#64748B]">{operator.country_code} · {operator.timezone}</p>
                <div className="flex items-center gap-3 md:justify-end">
                  <span className={`rounded-full px-3 py-2 text-xs font-semibold ring-1 ${statusClasses(operator.status)}`}>{visibleStatus(operator.status)}</span>
                  <span aria-hidden="true" className="text-lg text-[#64748B]">→</span>
                </div>
              </Link>
            ))}
            {operators.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-sm text-[#64748B]">Nessuna iscrizione in questa sezione.</p>
                {!query.status && !query.q ? (
                  <form action={cleanupPilotStorage} className="mt-5">
                    <button className="min-h-11 rounded-xl border border-[#D7E0E5] bg-white px-4 text-sm font-semibold text-[#40596B] hover:bg-[#F6F8F9]">
                      Completa pulizia file TEST
                    </button>
                  </form>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
