import Link from "next/link";

import BoatCard from "@/components/marketplace/boat-card";
import MarketplaceHeader from "@/components/marketplace/marketplace-header";
import SearchBar from "@/components/marketplace/search-bar";
import { searchMarketplaceBoats } from "@/lib/marketplace/data";
import type { MarketplaceBoat } from "@/lib/marketplace/types";

const DESTINATIONS = [
  ["Napoli", "Parti dal cuore del Golfo"],
  ["Capri", "Grotte, baie e Faraglioni"],
  ["Ischia", "Coste verdi e terme sul mare"],
  ["Procida", "Colori, borghi e acque tranquille"],
  ["Sorrento", "La porta della Costiera"],
  ["Amalfi", "Naviga la costa più iconica"],
] as const;

export default async function Home() {
  let featured: MarketplaceBoat[] = [];

  try {
    featured = (await searchMarketplaceBoats({})).slice(0, 6);
  } catch {
    // During first deploy the UI can come online before the C9-C13 migration.
    // The final gate will require the RPC to exist.
  }

  return (
    <main className="min-h-screen bg-[#FCFBF8] text-[#0B1F33]">
      <MarketplaceHeader />

      <section className="relative overflow-hidden bg-[#0B1F33] px-4 py-14 text-white sm:px-6 sm:py-20 lg:px-8 lg:py-28">
        <div className="absolute inset-0 opacity-30 [background:radial-gradient(circle_at_80%_20%,#14B8A6,transparent_35%),radial-gradient(circle_at_20%_80%,#2DD4BF,transparent_30%)]" />

        <div className="relative mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#5EEAD4]">
              Freedom, made simple.
            </p>
            <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
              Il mare è più vicino di quanto pensi.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/75 sm:text-xl">
              Trova la barca giusta, confronta disponibilità e prezzi e prenota
              in modo semplice. Boatly mette il noleggio nautico in un unico
              posto.
            </p>
            <div className="mt-8 grid gap-3 sm:flex sm:flex-wrap">
              <Link
                href="/demo-gestionale"
                className="rounded-xl bg-[#14B8A6] px-6 py-3 text-center text-sm font-semibold text-white"
              >
                Area noleggiatore
              </Link>
              <Link
                href="/come-funziona"
                className="rounded-xl border border-white/20 bg-white/5 px-6 py-3 text-center text-sm font-semibold text-white"
              >
                Scopri la piattaforma
              </Link>
            </div>
          </div>

          <div className="mt-10 max-w-5xl text-[#0B1F33]">
            <SearchBar />
          </div>

          <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3 text-sm text-white/70">
            <span>✓ Disponibilità reale</span>
            <span>✓ Operatori verificati</span>
            <span>✓ Pagamenti protetti</span>
          </div>
        </div>
      </section>

      <section className="border-b border-[#DEE5E8] bg-[#EAF8F5]">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8 lg:py-20">
          <div>
            <p className="text-sm font-semibold text-[#0F766E]">Per i noleggiatori</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Non solo un nuovo canale di vendita. Il centro operativo della tua flotta.
            </h2>
            <p className="mt-5 text-base leading-7 text-[#475569]">
              Boatly unisce le prenotazioni del marketplace con quelle ricevute
              direttamente, mantenendo calendario, clienti, flotta e incassi nello
              stesso gestionale.
            </p>
            <Link
              href="/demo-gestionale"
              className="mt-7 inline-flex rounded-xl bg-[#0B1F33] px-6 py-3 text-sm font-semibold text-white"
            >
              Apri l’area noleggiatore
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ["01", "Booking unificato", "Marketplace e prenotazioni dirette nella stessa agenda."],
              ["02", "Flotta sotto controllo", "Disponibilità, stato delle barche e occupazione sempre visibili."],
              ["03", "CRM clienti", "Storico, valore e relazioni senza fogli o chat sparse."],
              ["04", "Finanza riconciliata", "Incassi, commissioni, rimborsi e payout leggibili in un unico posto."],
            ].map(([number, title, description]) => (
              <article key={number} className="rounded-3xl border border-[#BFE6DE] bg-white p-6 shadow-sm">
                <span className="text-xs font-semibold text-[#14B8A6]">{number}</span>
                <h3 className="mt-5 text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#64748B]">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-sm font-semibold text-[#14B8A6]">Destinazioni</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              Parti dalla Campania
            </h2>
            <p className="mt-3 max-w-2xl text-[#64748B]">
              Boatly parte da un cluster concentrato: più scelta utile nello
              stesso territorio, invece di inventario disperso.
            </p>
          </div>

          <Link href="/cerca" className="text-sm font-semibold text-[#0F766E]">
            Vedi tutte le barche →
          </Link>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DESTINATIONS.map(([name, description], index) => (
            <Link
              key={name}
              href={`/cerca?q=${encodeURIComponent(name)}`}
              className="group min-h-48 rounded-3xl border border-[#DEE5E8] bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex h-full flex-col justify-between">
                <span className="text-xs font-semibold text-[#14B8A6]">
                  0{index + 1}
                </span>
                <div>
                  <h3 className="text-2xl font-semibold">{name}</h3>
                  <p className="mt-2 text-sm text-[#64748B]">{description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-y border-[#DEE5E8] bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="text-sm font-semibold text-[#14B8A6]">
                Marketplace
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">
                Barche pronte a partire
              </h2>
            </div>
          </div>

          {featured.length > 0 ? (
            <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {featured.map((boat) => (
                <BoatCard key={boat.id} boat={boat} />
              ))}
            </div>
          ) : (
            <div className="mt-8 rounded-3xl border border-dashed border-[#CBD5D8] bg-[#FCFBF8] p-10 text-center">
              <p className="text-sm font-semibold text-[#14B8A6]">
                Supply in attivazione
              </p>
              <h3 className="mt-2 text-2xl font-semibold">
                Le prime barche verificate stanno arrivando.
              </h3>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#64748B]">
                Boatly mostra pubblicamente soltanto operatori e barche che hanno
                superato i gate di verifica e pubblicazione.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid gap-8 rounded-[2rem] bg-[#0B1F33] p-8 text-white lg:grid-cols-[1.3fr_0.7fr] lg:p-12">
          <div>
            <p className="text-sm font-semibold text-[#5EEAD4]">
              Per i professionisti del noleggio
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Tutta la tua flotta. Un solo posto.
            </h2>
            <p className="mt-4 max-w-2xl leading-7 text-white/70">
              Disponibilità, prenotazioni marketplace e manuali, clienti,
              pagamenti e operazioni quotidiane in un unico gestionale.
            </p>
          </div>

          <div className="flex items-end lg:justify-end">
            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Link
                href="/demo-gestionale"
                className="rounded-xl border border-white/20 px-6 py-3 text-sm font-semibold text-white"
              >
                Area noleggiatore
              </Link>
              <Link
                href="/operator/onboarding"
                className="rounded-xl bg-[#14B8A6] px-6 py-3 text-sm font-semibold text-white"
              >
                Porta la tua flotta su Boatly
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#DEE5E8] bg-white px-4 py-8 text-sm text-[#64748B] sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-4 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
          <span>© 2026 Boatly</span>
          <div className="grid grid-cols-2 gap-x-5 gap-y-2 sm:flex">
            <Link href="/come-funziona">Come funziona</Link>
            <Link href="/operator/onboarding">Noleggiatori</Link>
            <Link href="/demo-gestionale">Area noleggiatore</Link>
            <Link href="/account">Account</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
