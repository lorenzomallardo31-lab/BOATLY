import Link from "next/link";

import type { MarketplaceBoat } from "@/lib/marketplace/types";

function money(cents: number | null) {
  if (cents === null) {
    return "Prezzo su richiesta";
  }

  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export default function BoatCard({ boat }: { boat: MarketplaceBoat }) {
  return (
    <article className="group overflow-hidden rounded-3xl border border-[#DEE5E8] bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <Link href={`/barche/${boat.slug}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-[#E8F3F1]">
          {boat.cover_url ? (
            // Signed URLs are short-lived and dynamic, therefore a standard img
            // avoids coupling the private Storage delivery path to Next Image.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={boat.cover_url}
              alt={boat.name}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-[linear-gradient(145deg,#D8F1EC,#EAF2F6)] p-6 text-center text-sm font-medium text-[#64748B]">
              Foto presto disponibile
            </div>
          )}

          {boat.license_required === false ? (
            <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-2 text-xs font-semibold shadow-sm">
              Senza patente
            </span>
          ) : null}
        </div>

        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#14B8A6]">
                {boat.boat_type_name ?? "Barca"}
              </p>
              <h2 className="mt-1 text-lg font-semibold text-[#0B1F33]">
                {boat.name}
              </h2>
            </div>

            {boat.rating ? (
              <span className="text-sm font-semibold">
                ★ {boat.rating}
                {boat.review_count ? (
                  <span className="font-normal text-[#64748B]">
                    {" "}({boat.review_count})
                  </span>
                ) : null}
              </span>
            ) : null}
          </div>

          <p className="mt-2 text-sm text-[#64748B]">
            {[boat.location_name, boat.city].filter(Boolean).join(" · ") ||
              "Località"}
          </p>

          <p className="mt-2 text-sm text-[#64748B]">
            {[
              boat.manufacturer,
              boat.model,
              boat.manufacture_year,
              boat.passenger_limit ? `${boat.passenger_limit} persone` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>

          <div className="mt-5 flex items-end justify-between gap-4 border-t border-[#EEF2F3] pt-4">
            <p className="text-sm text-[#64748B]">A partire da</p>
            <p className="text-xl font-bold text-[#0B1F33]">
              {money(boat.from_price_cents)}
            </p>
          </div>
        </div>
      </Link>
    </article>
  );
}
