import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { updatePassword } from "./actions";

type UpdatePasswordPageProps = {
  searchParams: Promise<{
    recovery?: string;
    error?: string;
  }>;
};

function getErrorMessage(error?: string) {
  switch (error) {
    case "password-too-short":
      return "La nuova password deve contenere almeno 8 caratteri.";

    case "password-mismatch":
      return "Le due password non coincidono.";

    case "invalid-form":
      return "Controlla i dati inseriti.";

    case "update-failed":
      return "Non è stato possibile aggiornare la password. Richiedi un nuovo link e riprova.";

    default:
      return null;
  }
}

export default async function UpdatePasswordPage({
  searchParams,
}: UpdatePasswordPageProps) {
  const params = await searchParams;

  const supabase = await createClient();

  const { data, error } =
    await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/forgot-password");
  }

  const errorMessage =
    getErrorMessage(params.error);

  return (
    <main className="min-h-screen bg-[#FCFBF8] px-4 py-12 text-[#0B1F33]">
      <div className="mx-auto w-full max-w-md">
        <Link
          href="/"
          className="mb-10 inline-block text-2xl font-bold tracking-tight"
        >
          Boatly
        </Link>

        <div className="rounded-2xl border border-[#DEE5E8] bg-white p-6 shadow-sm sm:p-8">
          <p className="mb-2 text-sm font-medium text-[#14B8A6]">
            Sicurezza account
          </p>

          <h1 className="text-3xl font-semibold tracking-tight">
            Scegli una nuova password
          </h1>

          <p className="mt-2 text-sm leading-6 text-[#64748B]">
            Inserisci la nuova password che vuoi utilizzare per
            accedere a Boatly.
          </p>

          {errorMessage ? (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              {errorMessage}
            </div>
          ) : null}

          <form
            action={updatePassword}
            className="mt-8 space-y-5"
          >
            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium"
              >
                Nuova password
              </label>

              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                placeholder="Almeno 8 caratteri"
                className="w-full rounded-xl border border-[#DEE5E8] bg-white px-4 py-3 outline-none transition focus:border-[#14B8A6] focus:ring-2 focus:ring-[#14B8A6]/20"
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-2 block text-sm font-medium"
              >
                Conferma nuova password
              </label>

              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                className="w-full rounded-xl border border-[#DEE5E8] bg-white px-4 py-3 outline-none transition focus:border-[#14B8A6] focus:ring-2 focus:ring-[#14B8A6]/20"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-[#14B8A6] px-4 py-3 font-semibold text-white transition hover:opacity-90"
            >
              Salva nuova password
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}