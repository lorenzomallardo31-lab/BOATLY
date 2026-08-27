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
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-4 sm:px-6 lg:px-8">
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

        <div className="flex items-center gap-2">
          {signedIn ? (
            <>
              <Link
                href="/prenotazioni"
                className="rounded-xl px-4 py-2 text-sm font-semibold text-[#0B1F33] hover:bg-[#F1F5F4] md:hidden"
              >
                Prenotazioni
              </Link>
              <Link
                href="/account"
                className="rounded-xl bg-[#0B1F33] px-4 py-2 text-sm font-semibold text-white"
              >
                Account
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/sign-in"
                className="rounded-xl px-4 py-2 text-sm font-semibold text-[#0B1F33] hover:bg-[#F1F5F4]"
              >
                Accedi
              </Link>
              <Link
                href="/sign-up"
                className="rounded-xl bg-[#0B1F33] px-4 py-2 text-sm font-semibold text-white"
              >
                Registrati
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
