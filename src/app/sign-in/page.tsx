import Link from "next/link";

import { signIn } from "./actions";

type SignInPageProps = {
  searchParams: Promise<{
    error?: string;
    next?: string;
    signedOut?: string;
    passwordUpdated?: string;
  }>;
};

function getErrorMessage(error?: string) {
  switch (error) {
    case "invalid-credentials":
      return "Email/username o password non corretti, oppure l’accesso è stato sospeso.";

    case "invalid-form":
      return "Inserisci email o username e password.";

    case "staff-disabled":
      return "Questo accesso operatore è sospeso o è stato rimosso. Contatta il proprietario del noleggio.";

    case "team-invites-retired":
      return "I vecchi link di invito non sono più necessari. Il proprietario deve creare direttamente username e password dell’operatore.";

    case "confirmation-failed":
      return "Il link di autenticazione non è valido o è scaduto. Riprova.";

    default:
      return null;
  }
}

export default async function SignInPage({
  searchParams,
}: SignInPageProps) {
  const params = await searchParams;

  const errorMessage =
    getErrorMessage(params.error);

  const next =
    params.next?.startsWith("/") &&
    !params.next.startsWith("//")
      ? params.next
      : "/account";

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
            Bentornato
          </p>

          <h1 className="text-3xl font-semibold tracking-tight">
            Accedi a Boatly
          </h1>

          <p className="mt-2 text-sm leading-6 text-[#64748B]">
            Proprietario: usa la tua email. Operatore: usa lo username creato dal proprietario.
          </p>

          {params.signedOut === "1" ? (
            <div className="mt-6 rounded-xl border border-[#14B8A6]/30 bg-[#14B8A6]/10 p-4 text-sm">
              Logout effettuato correttamente.
            </div>
          ) : null}

          {params.passwordUpdated === "1" ? (
            <div className="mt-6 rounded-xl border border-[#14B8A6]/30 bg-[#14B8A6]/10 p-4 text-sm">
              Password aggiornata correttamente. Puoi effettuare
              nuovamente l&apos;accesso.
            </div>
          ) : null}

          {errorMessage ? (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              {errorMessage}
            </div>
          ) : null}

          <form action={signIn} className="mt-8 space-y-5">
            <input
              type="hidden"
              name="next"
              value={next}
            />

            <div>
              <label
                htmlFor="identifier"
                className="mb-2 block text-sm font-medium"
              >
                Email o username
              </label>

              <input
                id="identifier"
                name="identifier"
                type="text"
                autoComplete="username"
                required
                placeholder="nome@email.it oppure mario.rossi"
                className="w-full rounded-xl border border-[#DEE5E8] bg-white px-4 py-3 outline-none transition focus:border-[#14B8A6] focus:ring-2 focus:ring-[#14B8A6]/20"
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-4">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium"
                >
                  Password
                </label>

                <Link
                  href="/forgot-password"
                  className="text-sm font-medium text-[#14B8A6] hover:underline"
                >
                  Proprietario: password dimenticata?
                </Link>
              </div>

              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="w-full rounded-xl border border-[#DEE5E8] bg-white px-4 py-3 outline-none transition focus:border-[#14B8A6] focus:ring-2 focus:ring-[#14B8A6]/20"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-[#14B8A6] px-4 py-3 font-semibold text-white transition hover:opacity-90"
            >
              Accedi
            </button>
          </form>

          <div className="mt-8 border-t border-[#DEE5E8] pt-6 text-center text-sm text-[#64748B]">
            Sei il proprietario e non hai un account?{" "}
            <Link
              href="/sign-up"
              className="font-semibold text-[#0B1F33] underline underline-offset-4"
            >
              Registrati
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
