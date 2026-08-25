import Link from "next/link";

import { requestPasswordReset } from "./actions";

type ForgotPasswordPageProps = {
  searchParams: Promise<{
    sent?: string;
    error?: string;
  }>;
};

export default async function ForgotPasswordPage({
  searchParams,
}: ForgotPasswordPageProps) {
  const params = await searchParams;

  const sent = params.sent === "1";

  const invalidEmail =
    params.error === "invalid-email";

  const requestFailed =
    params.error === "request-failed";

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
            Recupero account
          </p>

          <h1 className="text-3xl font-semibold tracking-tight">
            Password dimenticata?
          </h1>

          <p className="mt-2 text-sm leading-6 text-[#64748B]">
            Inserisci il tuo indirizzo email. Se è associato a
            un account Boatly, riceverai le istruzioni per
            impostare una nuova password.
          </p>

          {sent ? (
            <div className="mt-6 rounded-xl border border-[#14B8A6]/30 bg-[#14B8A6]/10 p-4 text-sm leading-6">
              <strong>Controlla la tua email.</strong>
              <br />
              Se esiste un account associato a questo
              indirizzo, riceverai un link per reimpostare la
              password.
            </div>
          ) : null}

          {invalidEmail ? (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              Inserisci un indirizzo email valido.
            </div>
          ) : null}

          {requestFailed ? (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              Non è stato possibile inviare la richiesta.
              Riprova tra qualche momento.
            </div>
          ) : null}

          {!sent ? (
            <form
              action={requestPasswordReset}
              className="mt-8 space-y-5"
            >
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

              <button
                type="submit"
                className="w-full rounded-xl bg-[#14B8A6] px-4 py-3 font-semibold text-white transition hover:opacity-90"
              >
                Invia link di recupero
              </button>
            </form>
          ) : null}

          <div className="mt-8 border-t border-[#DEE5E8] pt-6 text-center text-sm text-[#64748B]">
            <Link
              href="/sign-in"
              className="font-semibold text-[#0B1F33] underline underline-offset-4"
            >
              Torna al login
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}