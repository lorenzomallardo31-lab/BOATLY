import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import MarketplaceHeader from "@/components/marketplace/marketplace-header";
import { getMarketplaceBoatBySlug, signBoatImage } from "@/lib/marketplace/data";
import type { PublicBoatDetail } from "@/lib/marketplace/types";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ boatSlug: string }>;
};

type PublicImage = {
  id: string;
  boat_id: string;
  storage_path: string;
  alt_text: string | null;
  sort_order: number;
  is_cover: boolean;
};

type PublicLegalOffering = {
  id: string;
  boat_id: string;
  legal_type: string;
  skipper_mode: string;
  self_drive_allowed: boolean;
  minimum_driver_age: number | null;
};

type PublicBoatAmenity = {
  boat_id: string;
  amenity_id: string;
};

type Amenity = {
  id: string;
  name: string;
  category: string | null;
};

type PublicExtra = {
  boat_id: string;
  extra_id: string;
  name: string;
  description: string | null;
  pricing_unit: string;
  price_cents: number;
  max_quantity: number | null;
};

type PublicRatePlan = {
  id: string;
  boat_id: string;
  legal_offering_id: string | null;
  name: string;
  duration_mode: string;
  base_duration_minutes: number;
  base_price_cents: number;
  duration_step_minutes: number | null;
  additional_step_price_cents: number | null;
  max_duration_minutes: number | null;
};

type PublicLocation = {
  id: string;
  operator_id: string;
  name: string;
  address_line_1: string | null;
  city: string | null;
  administrative_area: string | null;
  pickup_instructions: string | null;
  latitude: number | null;
  longitude: number | null;
};

type PublicOperator = {
  id: string;
  name: string | null;
  description: string | null;
};

type PublicReview = {
  id: string;
  boat_id: string;
  rating: number;
  title: string | null;
  body: string | null;
  operator_response: string | null;
  published_at: string | null;
};

function money(cents: number) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

function pricingUnitLabel(value: string) {
  const labels: Record<string, string> = {
    FIXED: "prezzo fisso",
    PER_PERSON: "per persona",
    PER_HOUR: "per ora",
    PER_DAY: "per giorno",
    PER_UNIT: "per unità",
  };

  return labels[value] ?? value;
}

function skipperLabel(value: string) {
  const labels: Record<string, string> = {
    NOT_AVAILABLE: "Skipper non disponibile",
    OPTIONAL: "Skipper opzionale",
    INCLUDED: "Skipper incluso",
    REQUIRED: "Skipper obbligatorio",
  };

  return labels[value] ?? value;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { boatSlug } = await params;
  const boat = await getMarketplaceBoatBySlug(boatSlug);

  if (!boat) {
    return { title: "Barca non disponibile" };
  }

  return {
    title: boat.name,
    description: boat.short_description ?? `Noleggia ${boat.name} su Boatly.`,
  };
}

export default async function BoatDetailPage({ params }: PageProps) {
  const { boatSlug } = await params;
  const maybeBoat = await getMarketplaceBoatBySlug(boatSlug);

  if (!maybeBoat) {
    notFound();
  }

  const boat = maybeBoat as PublicBoatDetail;
  const supabase = await createClient();

  const [
    imagesResult,
    legalResult,
    amenityLinksResult,
    extrasResult,
    ratesResult,
    locationsResult,
    operatorsResult,
    reviewsResult,
  ] = await Promise.all([
    supabase.rpc("marketplace_boat_images"),
    supabase.rpc("marketplace_boat_legal_offerings"),
    supabase.rpc("marketplace_boat_amenities"),
    supabase.rpc("marketplace_boat_extras"),
    supabase.rpc("marketplace_boat_rate_plans"),
    supabase.rpc("marketplace_operator_locations"),
    supabase.rpc("marketplace_operators"),
    supabase.rpc("marketplace_reviews"),
  ]);

  const rpcError = [
    imagesResult,
    legalResult,
    amenityLinksResult,
    extrasResult,
    ratesResult,
    locationsResult,
    operatorsResult,
    reviewsResult,
  ].find((result) => result.error)?.error;

  if (rpcError) {
    throw new Error(`Unable to load marketplace boat: ${rpcError.message}`);
  }

  const imageRows = (Array.isArray(imagesResult.data)
    ? imagesResult.data
    : []) as PublicImage[];
  const images = imageRows
    .filter((image) => image.boat_id === boat.id)
    .sort((a, b) => a.sort_order - b.sort_order);

  const signedImages = await Promise.all(
    images.map(async (image) => ({
      ...image,
      url: await signBoatImage(image.storage_path, 1800),
    })),
  );

  const legalOfferings = (Array.isArray(legalResult.data)
    ? legalResult.data
    : []) as PublicLegalOffering[];
  const boatLegalOfferings = legalOfferings.filter(
    (offering) => offering.boat_id === boat.id,
  );

  const amenityLinks = (Array.isArray(amenityLinksResult.data)
    ? amenityLinksResult.data
    : []) as PublicBoatAmenity[];
  const boatAmenityIds = new Set(
    amenityLinks
      .filter((link) => link.boat_id === boat.id)
      .map((link) => link.amenity_id),
  );

  const { data: amenityRows } = await supabase
    .from("amenities")
    .select("id, name, category")
    .eq("is_active", true)
    .order("sort_order");
  const amenities = ((amenityRows ?? []) as Amenity[]).filter((amenity) =>
    boatAmenityIds.has(amenity.id),
  );

  const extras = ((Array.isArray(extrasResult.data)
    ? extrasResult.data
    : []) as PublicExtra[]).filter((extra) => extra.boat_id === boat.id);

  const ratePlans = ((Array.isArray(ratesResult.data)
    ? ratesResult.data
    : []) as PublicRatePlan[]).filter((rate) => rate.boat_id === boat.id);
  const primaryRate = [...ratePlans].sort(
    (a, b) => a.base_price_cents - b.base_price_cents,
  )[0];

  const locations = (Array.isArray(locationsResult.data)
    ? locationsResult.data
    : []) as PublicLocation[];
  const location = locations.find((item) => item.id === boat.primary_location_id);

  const operators = (Array.isArray(operatorsResult.data)
    ? operatorsResult.data
    : []) as PublicOperator[];
  const operator = operators.find((item) => item.id === boat.operator_id);

  const reviews = ((Array.isArray(reviewsResult.data)
    ? reviewsResult.data
    : []) as PublicReview[]).filter((review) => review.boat_id === boat.id);
  const averageRating = reviews.length
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : null;

  return (
    <main className="min-h-screen bg-[#FCFBF8] text-[#0B1F33]">
      <MarketplaceHeader />

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-sm font-semibold text-[#14B8A6]">
              {[boat.manufacturer, boat.model].filter(Boolean).join(" · ") ||
                "Barca Boatly"}
            </p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">
              {boat.name}
            </h1>
            <p className="mt-3 text-sm text-[#64748B]">
              {[location?.name, location?.city, location?.administrative_area]
                .filter(Boolean)
                .join(" · ")}
              {averageRating ? ` · ★ ${averageRating.toFixed(1)} (${reviews.length})` : ""}
            </p>
          </div>

          <Link
            href="/cerca"
            className="rounded-xl border border-[#DEE5E8] bg-white px-4 py-3 text-sm font-semibold"
          >
            ← Torna alla ricerca
          </Link>
        </div>

        <div className="mt-8 grid gap-3 md:grid-cols-4 md:grid-rows-2">
          {signedImages.length > 0 ? (
            signedImages.slice(0, 5).map((image, index) => (
              <div
                key={image.id}
                className={
                  index === 0
                    ? "relative aspect-[4/3] overflow-hidden rounded-3xl bg-[#EAF2F2] md:col-span-2 md:row-span-2 md:aspect-auto"
                    : "relative aspect-[4/3] overflow-hidden rounded-3xl bg-[#EAF2F2]"
                }
              >
                {image.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={image.url}
                    alt={image.alt_text ?? boat.name}
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </div>
            ))
          ) : (
            <div className="col-span-full flex min-h-80 items-center justify-center rounded-3xl bg-[#EAF2F2] text-[#64748B]">
              Galleria non disponibile
            </div>
          )}
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-8">
            <section className="rounded-3xl border border-[#DEE5E8] bg-white p-7 shadow-sm">
              <div className="grid gap-5 sm:grid-cols-4">
                {[
                  [boat.operator_passenger_limit, "persone"],
                  [boat.length_m ? `${boat.length_m} m` : null, "lunghezza"],
                  [boat.cabins, "cabine"],
                  [boat.bathrooms, "bagni"],
                ].map(([value, label]) => (
                  <div key={label as string}>
                    <p className="text-xl font-semibold">{value ?? "—"}</p>
                    <p className="mt-1 text-xs uppercase tracking-wide text-[#64748B]">
                      {label}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold">La barca</h2>
              <p className="mt-4 whitespace-pre-line leading-8 text-[#475569]">
                {boat.description ?? boat.short_description ?? "Descrizione in aggiornamento."}
              </p>
            </section>

            {amenities.length > 0 ? (
              <section>
                <h2 className="text-2xl font-semibold">Dotazioni</h2>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {amenities.map((amenity) => (
                    <div
                      key={amenity.id}
                      className="rounded-xl border border-[#DEE5E8] bg-white px-4 py-3 text-sm font-medium"
                    >
                      ✓ {amenity.name}
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            <section>
              <h2 className="text-2xl font-semibold">Modalità di noleggio</h2>
              <div className="mt-5 space-y-3">
                {boatLegalOfferings.map((offering) => (
                  <article
                    key={offering.id}
                    className="rounded-2xl border border-[#DEE5E8] bg-white p-5"
                  >
                    <p className="font-semibold">
                      {offering.legal_type.replaceAll("_", " ")}
                    </p>
                    <p className="mt-2 text-sm text-[#64748B]">
                      {skipperLabel(offering.skipper_mode)}
                      {offering.self_drive_allowed
                        ? ` · Guida autonoma consentita${
                            offering.minimum_driver_age
                              ? ` da ${offering.minimum_driver_age} anni`
                              : ""
                          }`
                        : " · Guida autonoma non prevista"}
                    </p>
                  </article>
                ))}
              </div>
            </section>

            {extras.length > 0 ? (
              <section>
                <h2 className="text-2xl font-semibold">Extra disponibili</h2>
                <div className="mt-5 space-y-3">
                  {extras.map((extra) => (
                    <article
                      key={extra.extra_id}
                      className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-[#DEE5E8] bg-white p-5"
                    >
                      <div>
                        <p className="font-semibold">{extra.name}</p>
                        {extra.description ? (
                          <p className="mt-1 text-sm text-[#64748B]">
                            {extra.description}
                          </p>
                        ) : null}
                      </div>
                      <p className="font-semibold">
                        {money(extra.price_cents)}{" "}
                        <span className="text-xs font-normal text-[#64748B]">
                          {pricingUnitLabel(extra.pricing_unit)}
                        </span>
                      </p>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

            {operator ? (
              <section className="rounded-3xl bg-[#0B1F33] p-7 text-white">
                <p className="text-sm font-semibold text-[#5EEAD4]">
                  Noleggiatore verificato
                </p>
                <h2 className="mt-2 text-2xl font-semibold">
                  {operator.name ?? "Partner Boatly"}
                </h2>
                {operator.description ? (
                  <p className="mt-3 leading-7 text-white/70">
                    {operator.description}
                  </p>
                ) : null}
              </section>
            ) : null}

            {reviews.length > 0 ? (
              <section>
                <h2 className="text-2xl font-semibold">Recensioni</h2>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {reviews.slice(0, 6).map((review) => (
                    <article
                      key={review.id}
                      className="rounded-2xl border border-[#DEE5E8] bg-white p-5"
                    >
                      <p className="font-semibold">★ {review.rating}/5</p>
                      {review.title ? (
                        <p className="mt-2 font-semibold">{review.title}</p>
                      ) : null}
                      {review.body ? (
                        <p className="mt-2 text-sm leading-6 text-[#64748B]">
                          {review.body}
                        </p>
                      ) : null}
                    </article>
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          <aside className="lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-3xl border border-[#DEE5E8] bg-white p-6 shadow-lg">
              {primaryRate ? (
                <>
                  <p className="text-sm text-[#64748B]">A partire da</p>
                  <p className="mt-1 text-3xl font-bold">
                    {money(primaryRate.base_price_cents)}
                  </p>
                  <p className="mt-1 text-sm text-[#64748B]">
                    {primaryRate.base_duration_minutes / 60} ore · {primaryRate.name}
                  </p>
                </>
              ) : (
                <p className="font-semibold">Verifica prezzo e disponibilità</p>
              )}

              <form action="/checkout/start" className="mt-6 space-y-4">
                <input type="hidden" name="boat" value={boat.slug} />

                <label className="block text-sm font-medium">
                  Data
                  <input
                    name="date"
                    type="date"
                    required
                    className="mt-2 w-full rounded-xl border border-[#DEE5E8] px-4 py-3"
                  />
                </label>

                <label className="block text-sm font-medium">
                  Persone
                  <input
                    name="passengers"
                    type="number"
                    min={1}
                    max={boat.operator_passenger_limit ?? 50}
                    defaultValue={2}
                    required
                    className="mt-2 w-full rounded-xl border border-[#DEE5E8] px-4 py-3"
                  />
                </label>

                <button
                  type="submit"
                  className="w-full rounded-xl bg-[#14B8A6] px-5 py-3 text-sm font-bold text-white"
                >
                  Verifica disponibilità
                </button>
              </form>

              <p className="mt-4 text-center text-xs leading-5 text-[#64748B]">
                Nessun addebito prima della conferma del checkout.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
