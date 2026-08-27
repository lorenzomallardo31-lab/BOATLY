import Link from "next/link";

export default function BetaBanner() {
  return (
    <div className="border-b border-[#99F6E4] bg-[#CCFBF1] px-4 py-2 text-[#134E4A] sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center text-xs sm:text-sm">
        <strong>Anteprima privata Boatly</strong>
        <span className="text-[#0F766E]">Ambiente dimostrativo · pagamenti TEST · nessun servizio reale</span>
        <Link href="/demo-gestionale" className="font-semibold underline underline-offset-4">
          Apri il gestionale demo
        </Link>
      </div>
    </div>
  );
}
