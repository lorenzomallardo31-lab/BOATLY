import Link from "next/link";

import MarketplaceHeader from "@/components/marketplace/marketplace-header";

const STEPS = [
  ["01", "Trova", "Scegli destinazione, data e numero di persone."],
  ["02", "Confronta", "Valuta barca, dotazioni, condizioni e prezzo."],
  ["03", "Prenota", "Boatly ricontrolla disponibilità e requisiti prima del pagamento."],
  ["04", "Naviga", "Trovi tutti i dettagli della prenotazione nel tuo account."],
] as const;

export default function HowItWorksPage() {
  return (
    <main className="min-h-screen bg-[#FCFBF8] text-[#0B1F33]">
      <MarketplaceHeader />
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
        <p className="text-sm font-semibold text-[#14B8A6]">Come funziona</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
          Trova. Prenota. Naviga.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-[#64748B]">
          Boatly mette insieme inventario verificato, disponibilità operativa e
          booking in un flusso unico.
        </p>

        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {STEPS.map(([number, title, description]) => (
            <article
              key={number}
              className="rounded-3xl border border-[#DEE5E8] bg-white p-7 shadow-sm"
            >
              <span className="text-sm font-semibold text-[#14B8A6]">
                {number}
              </span>
              <h2 className="mt-8 text-2xl font-semibold">{title}</h2>
              <p className="mt-3 leading-7 text-[#64748B]">{description}</p>
            </article>
          ))}
        </div>

        <section className="mt-16 overflow-hidden rounded-[2rem] bg-[#0B1F33] text-white">
          <div className="grid gap-8 p-8 lg:grid-cols-[0.9fr_1.1fr] lg:p-12">
            <div>
              <p className="text-sm font-semibold text-[#5EEAD4]">Per chi noleggia</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight">
                Il marketplace acquisisce clienti. Il gestionale governa il lavoro.
              </h2>
              <p className="mt-4 leading-7 text-white/70">
                Le prenotazioni Boatly e quelle dirette confluiscono in un solo
                workspace insieme a disponibilità, flotta, CRM e movimenti economici.
              </p>
              <Link href="/demo-gestionale" className="mt-7 inline-flex rounded-xl bg-[#14B8A6] px-6 py-3 text-sm font-semibold text-white">
                Area noleggiatore
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["Dashboard", "Priorità, partenze e indicatori del giorno."],
                ["Booking", "Marketplace e vendite dirette insieme."],
                ["Flotta e CRM", "Disponibilità, clienti e storico."],
                ["Finanza", "Pagamenti e rimborsi riconciliati."],
              ].map(([title, description]) => (
                <article key={title} className="rounded-2xl border border-white/15 bg-white/5 p-5">
                  <h3 className="font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-white/60">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
