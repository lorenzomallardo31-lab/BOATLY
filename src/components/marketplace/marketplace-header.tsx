import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

export default async function MarketplaceHeader() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const signedIn =
    Boolean(claimsData?.claims) &&
    typeof claimsData?.claims?.sub === "string";

  return (
    <header className="border-b border-[#DEE5E8] bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:gap-6 sm:px-6 sm:py-4 lg:px-8">
        <Link href="/" className="text-2xl font-bold tracking-tight text-[#0B1F33]">
          Boatly
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-[#64748B] md:flex">
          <Link href="/cerca" className="hover:text-[#0B1F33]">
            Cerca barche
          </Link>
          <Link href="/come-funziona" className="hover:text-[#0B1F33]">
            Come funziona
          </Link>
          <Link href="/demo-gestionale" className="font-semibold text-[#0F766E] hover:text-[#0B1F33]">
            Gestionale demo
          </Link>
          {signedIn ? (
            <Link href="/prenotazioni" className="hover:text-[#0B1F33]">
              Le mie prenotazioni
            </Link>
          ) : null}
          <Link href="/operator/onboarding" className="hidden hover:text-[#0B1F33] lg:inline">
            Diventa noleggiatore
          </Link>
        </nav>

        <div className="flex items-center gap-1 sm:gap-2">
          {signedIn ? (
            <>
              <Link
                href="/prenotazioni"
                className="hidden rounded-xl px-4 py-2 text-sm font-semibold text-[#0B1F33] hover:bg-[#F1F5F4] sm:inline-flex md:hidden"
              >
                Prenotazioni
              </Link>
              <Link
                href="/account"
                className="rounded-xl bg-[#0B1F33] px-3 py-2 text-sm font-semibold text-white sm:px-4"
              >
                Account
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/sign-in"
                className="rounded-xl px-2 py-2 text-sm font-semibold text-[#0B1F33] hover:bg-[#F1F5F4] sm:px-4"
              >
                Accedi
              </Link>
              <Link
                href="/sign-up"
                className="rounded-xl bg-[#0B1F33] px-3 py-2 text-sm font-semibold text-white sm:px-4"
              >
                Registrati
              </Link>
            </>
          )}
        </div>
      </div>
      <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-3 pb-2 text-xs font-semibold text-[#64748B] md:hidden" aria-label="Navigazione mobile marketplace">
        <Link href="/cerca" className="shrink-0 rounded-xl px-3 py-2 hover:bg-[#F1F5F4]">Cerca barche</Link>
        <Link href="/demo-gestionale" className="shrink-0 rounded-xl bg-[#CCFBF1] px-3 py-2 text-[#0F766E]">Gestionale demo</Link>
        <Link href="/come-funziona" className="shrink-0 rounded-xl px-3 py-2 hover:bg-[#F1F5F4]">Come funziona</Link>
      </nav>
    </header>
  );
}
