import { createClient } from "@/lib/supabase/server";

import type {
  MarketplaceBoat,
  PublicBoatDetail,
} from "@/lib/marketplace/types";

export async function signBoatImage(
  storagePath: string | null | undefined,
  expiresInSeconds = 900,
) {
  if (!storagePath) {
    return null;
  }

  const supabase = await createClient();

  const { data, error } = await supabase.storage
    .from("boat-images")
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error) {
    return null;
  }

  return data.signedUrl;
}

export async function searchMarketplaceBoats(params: {
  query?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  passengers?: number | null;
  boatTypeId?: string | null;
  licenseRequired?: boolean | null;
}) {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    "marketplace_search_boats_v2",
    {
      p_query: params.query || null,
      p_starts_at: params.startsAt || null,
      p_ends_at: params.endsAt || null,
      p_passengers: params.passengers || null,
      p_boat_type_id: params.boatTypeId || null,
      p_license_required:
        typeof params.licenseRequired === "boolean"
          ? params.licenseRequired
          : null,
    },
  );

  if (error) {
    throw new Error(`Marketplace search failed: ${error.message}`);
  }

  const rows = (Array.isArray(data) ? data : []) as MarketplaceBoat[];

  return Promise.all(
    rows.map(async (boat) => ({
      ...boat,
      cover_url: await signBoatImage(boat.cover_storage_path),
    })),
  );
}

export async function getMarketplaceBoatBySlug(slug: string) {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("marketplace_boats");

  if (error) {
    throw new Error(`Boat detail failed: ${error.message}`);
  }

  const boats = (Array.isArray(data) ? data : []) as PublicBoatDetail[];

  return boats.find((boat) => boat.slug === slug) ?? null;
}
