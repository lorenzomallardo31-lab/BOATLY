import Link from "next/link";

import { signUp } from "./actions";

type SignUpPageProps = {
  searchParams: Promise<{
    error?: string;
    checkEmail?: string;
  }>;
};

function getErrorMessage(error?: string) {
  switch (error) {
    case "invalid-email":
      return "Inserisci un indirizzo email valido.";

    case "password-too-short":
      return "La password deve contenere almeno 8 caratteri.";

    case "invalid-form":
      return "Controlla i dati inseriti e riprova.";

    case "signup-failed":
      return "Non è stato possibile completare la registrazione. Riprova.";

    default:
      return null;
  }
}

export default async function SignUpPage({
  searchParams,
}: SignUpPageProps) {
  const params = await searchParams;

  const errorMessage = getErrorMessage(params.error);
  const checkEmail = params.checkEmail === "1";

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
            Trova. Prenota. Naviga.
          </p>

          <h1 className="text-3xl font-semibold tracking-tight">
            Crea il tuo account
          </h1>

          <p className="mt-2 text-sm leading-6 text-[#64748B]">
            Registrati per iniziare a utilizzare Boatly.
          </p>

          {checkEmail ? (
            <div className="mt-6 rounded-xl border border-[#14B8A6]/30 bg-[#14B8A6]/10 p-4 text-sm leading-6">
              <strong>Controlla la tua email.</strong>
              <br />
              Ti abbiamo inviato un link per confermare il tuo indirizzo
              email e completare la registrazione.
            </div>
          ) : null}

          {errorMessage ? (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              {errorMessage}
            </div>
          ) : null}

          {!checkEmail ? (
            <form action={signUp} className="mt-8 space-y-5">
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium"
                >
                  Email
                </label>

                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="nome@email.it"
                  className="w-full rounded-xl border border-[#DEE5E8] bg-white px-4 py-3 outline-none transition focus:border-[#14B8A6] focus:ring-2 focus:ring-[#14B8A6]/20"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-medium"
                >
                  Password
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

                <p className="mt-2 text-xs text-[#64748B]">
                  Usa almeno 8 caratteri.
                </p>
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-[#14B8A6] px-4 py-3 font-semibold text-white transition hover:opacity-90"
              >
                Crea account
              </button>
            </form>
          ) : null}

          <div className="mt-8 border-t border-[#DEE5E8] pt-6 text-center text-sm text-[#64748B]">
            Hai già un account?{" "}
            <Link
              href="/sign-in"
              className="font-semibold text-[#0B1F33] underline underline-offset-4"
            >
              Accedi
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}