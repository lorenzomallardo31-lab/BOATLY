import Link from "next/link";

import AdminNav from "@/components/admin/admin-nav";
import { requirePlatformContext } from "@/lib/admin/context";

export default async function AdminOverviewPage() {
  const { supabase, roles, email } = await requirePlatformContext(["SUPER_ADMIN", "ADMIN"]);

  const [operators, verifications, publications, bookings, cases, privacy, payments] = await Promise.all([
    supabase.from("operators").select("id", { count: "exact", head: true }),
    supabase.from("operator_verifications").select("id", { count: "exact", head: true }).in("status", ["PENDING", "IN_REVIEW", "NEEDS_CHANGES"]),
    supabase.from("boat_publication_reviews").select("id", { count: "exact", head: true }).in("status", ["PENDING", "IN_REVIEW", "NEEDS_CHANGES"]),
    supabase.from("bookings").select("id", { count: "exact", head: true }),
    supabase.from("platform_cases").select("id", { count: "exact", head: true }).in("status", ["OPEN", "IN_PROGRESS", "WAITING"]),
    supabase.from("privacy_requests").select("id", { count: "exact", head: true }).not("status", "in", "(COMPLETED,REJECTED,WITHDRAWN)"),
    supabase.from("payments").select("id", { count: "exact", head: true }).eq("reconciliation_status", "MISMATCH"),
  ]);

  const results = [operators, verifications, publications, bookings, cases, privacy, payments];
  const firstError = results.find((result) => result.error)?.error;
  if (firstError) throw new Error(`Unable to load admin dashboard: ${firstError.message}`);

  const cards = [
    ["Operatori", operators.count ?? 0, "/admin/operators", "Workspace registrati"],
    ["Verifiche operatori", verifications.count ?? 0, "/admin/verifications", "Review aperte"],
    ["Pubblicazioni", publications.count ?? 0, "/admin/verifications", "Barche da revisionare"],
    ["Booking", bookings.count ?? 0, "/admin/bookings", "Prenotazioni totali"],
    ["Casi", cases.count ?? 0, "/admin/cases", "Operativi aperti"],
    ["Privacy", privacy.count ?? 0, "/admin/privacy", "Richieste aperte"],
    ["Reconciliation", payments.count ?? 0, "/admin/finance", "Mismatch pagamenti"],
  ] as const;

  return (
    <main className="min-h-screen bg-[#FCFBF8] text-[#0B1F33]">
      <AdminNav />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <p className="text-sm font-semibold text-[#14B8A6]">Control Center</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">Boatly Admin</h1>
        <p className="mt-2 text-sm text-[#64748B]">{email} · {roles.join(" · ")}</p>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map(([label, value, href, note]) => (
            <Link key={label} href={href} className="rounded-3xl border border-[#DEE5E8] bg-white p-5 shadow-sm transition hover:border-[#14B8A6]/60">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">{label}</p>
              <p className="mt-2 text-3xl font-semibold">{value}</p>
              <p className="mt-1 text-xs text-[#64748B]">{note}</p>
            </Link>
          ))}
        </section>

        <section className="mt-8 rounded-3xl border border-[#DEE5E8] bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Principio operativo</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#64748B]">Fleet ACTIVE e marketplace APPROVED restano due stati distinti. I pagamenti sono confermati solo da webhook Stripe verificati. Le decisioni compliance e i cambi di stato sensibili passano dalle RPC trusted e vengono registrati nell&apos;audit log.</p>
        </section>
      </div>
    </main>
  );
}
