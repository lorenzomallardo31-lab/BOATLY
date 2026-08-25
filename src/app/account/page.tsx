import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export default async function AccountPage() {
  const supabase = await createClient();

  const { data, error } =
    await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/sign-in?next=/account");
  }

  const email =
    typeof data.claims.email === "string"
      ? data.claims.email
      : "Account Boatly";

  return (
    <main className="min-h-screen bg-[#FCFBF8] px-4 py-12 text-[#0B1F33]">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/"
          className="text-2xl font-bold tracking-tight"
        >
          Boatly
        </Link>

        <div className="mt-10 rounded-2xl border border-[#DEE5E8] bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-medium text-[#14B8A6]">
            Account Boatly
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Il tuo account
          </h1>

          <p className="mt-4 text-[#64748B]">
            Sei autenticato come:
          </p>

          <p className="mt-1 font-semibold">
            {email}
          </p>

          <div className="mt-8 rounded-2xl bg-[#F1F5F4] p-5">
            <p className="font-semibold">
              Gestisci una flotta?
            </p>

            <p className="mt-2 text-sm leading-6 text-[#64748B]">
              Crea il tuo workspace operatore e inizia
              l&apos;onboarding della tua attività di noleggio.
            </p>

            <Link
              href="/operator/onboarding"
              className="mt-5 inline-flex rounded-xl bg-[#14B8A6] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Diventa operatore
            </Link>
          </div>

          <div className="mt-8 rounded-xl border border-[#DEE5E8] p-4 text-sm text-[#64748B]">
            L&apos;area cliente completa verrà sviluppata nei
            checkpoint dedicati. In questa fase l&apos;account
            viene utilizzato anche come punto di ingresso per
            l&apos;onboarding operatore.
          </div>

          <form
            action="/auth/signout"
            method="post"
            className="mt-8"
          >
            <button
              type="submit"
              className="rounded-xl border border-[#DEE5E8] bg-white px-5 py-3 font-semibold transition hover:bg-[#F1F5F4]"
            >
              Esci
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}