import Link from "next/link";

import { signIn } from "./actions";

type SignInPageProps = {
  searchParams: Promise<{
    error?: string;
    next?: string;
    signedOut?: string;
  }>;
};

export default async function SignInPage({
  searchParams,
}: SignInPageProps) {
  const params = await searchParams;

  const hasError = params.error === "invalid-credentials";
  const invalidForm = params.error === "invalid-form";

  const next =
    params.next?.startsWith("/") && !params.next.startsWith("//")
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
            Inserisci email e password per accedere al tuo account.
          </p>

          {params.signedOut === "1" ? (
            <div className="mt-6 rounded-xl border border-[#14B8A6]/30 bg-[#14B8A6]/10 p-4 text-sm">
              Logout effettuato correttamente.
            </div>
          ) : null}

          {hasError ? (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              Email o password non corretti, oppure l&apos;account non è
              ancora disponibile per l&apos;accesso.
            </div>
          ) : null}

          {invalidForm ? (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              Inserisci email e password.
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
            Non hai ancora un account?{" "}
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