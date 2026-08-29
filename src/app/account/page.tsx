import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export default async function AccountPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims || typeof data.claims.sub !== "string") {
    redirect("/sign-in?next=/account");
  }

  const userId = data.claims.sub;
  const email = typeof data.claims.email === "string" ? data.claims.email : "Account Boatly";

  const [{ data: memberships }, { data: platformRoles }] = await Promise.all([
    supabase.from("operator_members").select("operator_id, role, status").eq("user_id", userId).eq("status", "ACTIVE"),
    supabase.from("platform_user_roles").select("role").eq("user_id", userId),
  ]);

  const operatorMembership = memberships?.[0];
  const isPlatformUser = Boolean(platformRoles?.length);

  return (
    <main className="min-h-screen bg-[#F7F6FB] px-4 py-12 text-[#171A2B]">
      <div className="mx-auto max-w-4xl">
        <Link href="/account" className="text-2xl font-bold tracking-tight">Boatly Ops</Link>

        <section className="mt-10 rounded-3xl border border-[#DEE5E8] bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-medium text-[#6D5DFB]">Account gestionale</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Il tuo account</h1>
          <p className="mt-4 text-[#64748B]">Sei autenticato come:</p>
          <p className="mt-1 font-semibold">{email}</p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-[#D8D5E5] bg-[#F4F2FA] p-5">
              <p className="font-semibold">Area operatore</p>
              <p className="mt-2 text-sm leading-6 text-[#64748B]">Dashboard, booking, CRM, calendario e flotta.</p>
              <Link href={operatorMembership ? `/operator/dashboard?operator=${operatorMembership.operator_id}` : "/operator/onboarding"} className="mt-5 inline-flex rounded-xl bg-[#6D5DFB] px-5 py-3 text-sm font-semibold text-white">{operatorMembership ? "Apri dashboard" : "Configura attività"}</Link>
            </div>

            {isPlatformUser ? (
              <div className="rounded-2xl border border-[#0B1F33] bg-[#0B1F33] p-5 text-white md:col-span-2">
                <p className="font-semibold">Boatly Admin</p>
                <p className="mt-2 text-sm leading-6 text-white/70">Accesso interno per verification, booking operations, finance, compliance e privacy.</p>
                <Link href="/admin" className="mt-5 inline-flex rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[#0B1F33]">Apri Admin</Link>
              </div>
            ) : null}
          </div>

          <form action="/auth/signout" method="post" className="mt-8">
            <button type="submit" className="rounded-xl border border-[#DEE5E8] bg-white px-5 py-3 font-semibold transition hover:bg-[#F1F5F4]">Esci</button>
          </form>
        </section>
      </div>
    </main>
  );
}
