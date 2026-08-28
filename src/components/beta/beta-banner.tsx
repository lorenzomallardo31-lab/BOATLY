import Link from "next/link";

export default function BetaBanner() {
  return (
    <div className="border-b border-[#99F6E4] bg-[#CCFBF1] px-3 py-2 text-[#134E4A] sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-center text-[11px] leading-4 sm:gap-x-3 sm:text-sm">
        <strong>Anteprima privata Boatly</strong>
        <span className="text-[#0F766E]">Demo · pagamenti TEST · nessun servizio reale</span>
        <Link href="/demo-gestionale" className="font-semibold underline underline-offset-4">
          Area noleggiatore
        </Link>
      </div>
    </div>
  );
}
