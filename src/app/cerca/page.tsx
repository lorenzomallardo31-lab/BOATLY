import Link from "next/link";

import BoatCard from "@/components/marketplace/boat-card";
import MarketplaceHeader from "@/components/marketplace/marketplace-header";
import SearchBar from "@/components/marketplace/search-bar";
import SearchMap from "@/components/marketplace/search-map";
import { searchMarketplaceBoats } from "@/lib/marketplace/data";
import { createClient } from "@/lib/supabase/server";

type SearchPageProps = {
  searchParams: Promise<{
    q?: string;
    date?: string;
    passengers?: string;
    type?: string;
    license?: string;
  }>;
};

type BoatType = {
  id: string;
  name: string;
};

function searchWindow(date?: string) {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { startsAt: null, endsAt: null };
  }

  return {
    startsAt: `${date} 09:00:00 Europe/Rome`,
    endsAt: `${date} 17:00:00 Europe/Rome`,
  };
}

export const metadata = {
  title: "Cerca barche",
  description: "Cerca barche disponibili su Boatly.",
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const passengers = Math.max(1, Number(params.passengers) || 2);
  const window = searchWindow(params.date);
  const licenseRequired =
    params.license === "no" ? false : params.license === "yes" ? true : null;

  const boats = await searchMarketplaceBoats({
    query: params.q ?? null,
    startsAt: window.startsAt,
    endsAt: window.endsAt,
    passengers,
    boatTypeId: params.type || null,
    licenseRequired,
  });

  const supabase = await createClient();
  const { data: typeRows } = await supabase
    .from("boat_types")
    .select("id, name")
    .eq("is_active", true)
    .order("sort_order");

  const boatTypes = (typeRows ?? []) as BoatType[];

  return (
    <main className="min-h-screen bg-[#FCFBF8] text-[#0B1F33]">
      <MarketplaceHeader />

      <div className="sticky top-0 z-20 border-b border-[#DEE5E8] bg-[#FCFBF8]/95 px-4 py-4 backdrop-blur sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SearchBar
            defaultQuery={params.q ?? ""}
            defaultDate={params.date ?? ""}
            defaultPassengers={passengers}
            compact
          />
        </div>
      </div>

      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-[#64748B]">
              {params.q ? `Risultati per “${params.q}”` : "Marketplace Boatly"}
            </p>
            <h1 className="mt-1 text-2xl font-semibold">
              {boats.length} {boats.length === 1 ? "barca" : "barche"}
              {params.date ? ` disponibili il ${params.date}` : ""}
            </h1>
          </div>

          <form className="flex flex-wrap gap-2" action="/cerca">
            <input type="hidden" name="q" value={params.q ?? ""} />
            <input type="hidden" name="date" value={params.date ?? ""} />
            <input type="hidden" name="passengers" value={passengers} />

            <select
              name="type"
              defaultValue={params.type ?? ""}
              className="rounded-xl border border-[#DEE5E8] bg-white px-4 py-2 text-sm font-medium"
            >
              <option value="">Tutti i tipi</option>
              {boatTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>

            <select
              name="license"
              defaultValue={params.license ?? ""}
              className="rounded-xl border border-[#DEE5E8] bg-white px-4 py-2 text-sm font-medium"
            >
              <option value="">Patente: qualsiasi</option>
              <option value="no">Senza patente</option>
              <option value="yes">Patente richiesta</option>
            </select>

            <button
              type="submit"
              className="rounded-xl bg-[#0B1F33] px-4 py-2 text-sm font-semibold text-white"
            >
              Applica filtri
            </button>
          </form>
        </div>

        {boats.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-dashed border-[#CBD5D8] bg-white p-10 text-center">
            <h2 className="text-2xl font-semibold">Nessuna barca trovata</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#64748B]">
              Prova a cambiare destinazione, data o numero di persone. Le barche
              non approvate non vengono mai mostrate nei risultati pubblici.
            </p>
            <Link
              href="/cerca"
              className="mt-6 inline-flex rounded-xl bg-[#14B8A6] px-5 py-3 text-sm font-semibold text-white"
            >
              Azzera ricerca
            </Link>
          </div>
        ) : (
          <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)]">
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {boats.map((boat) => (
                <BoatCard key={boat.id} boat={boat} />
              ))}
            </div>

            <div className="lg:sticky lg:top-40 lg:self-start">
              <SearchMap
                boats={boats}
                token={process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? null}
              />
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
