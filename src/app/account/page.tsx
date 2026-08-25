import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export default async function AccountPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();

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
            Sessione autenticata
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

          <div className="mt-8 rounded-xl bg-[#F1F5F4] p-4 text-sm text-[#64748B]">
            Questa è una pagina temporanea utilizzata per verificare
            correttamente Supabase Auth e la sessione SSR. La vera area
            cliente verrà costruita nei checkpoint successivi.
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