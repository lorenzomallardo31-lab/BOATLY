import { realOperatorModeEnabled } from "@/lib/product-mode";

export default function BetaBanner() {
  if (realOperatorModeEnabled()) {
    return null;
  }

  return (
    <div className="border-b border-[#99F6E4] bg-[#CCFBF1] px-3 py-2 text-[#134E4A] sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-center text-[11px] leading-4 sm:gap-x-3 sm:text-sm">
        <strong>Anteprima privata Boatly Ops</strong>
        <span className="text-[#0F766E]">Gestionale interattivo · dati locali · nessun servizio reale</span>
      </div>
    </div>
  );
}
