"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function url(operatorId: string, extra?: string) {
  const base = `/operator/bookings/new?operator=${encodeURIComponent(operatorId)}`;
  return extra ? `${base}&${extra}` : base;
}

export async function createManualBooking(formData: FormData) {
  const operatorId = text(formData, "operator_id");
  const boatId = text(formData, "boat_id");
  const legalOfferingId = text(formData, "legal_offering_id");
  const pickupLocationId = text(formData, "pickup_location_id");
  const startsAt = text(formData, "starts_at");
  const endsAt = text(formData, "ends_at");
  const passengerCount = Number(text(formData, "passenger_count"));
  const customerName = text(formData, "customer_name");
  const customerEmail = text(formData, "customer_email");
  const customerPhone = text(formData, "customer_phone");
  const operatorNote = text(formData, "operator_note");
  const totalRaw = text(formData, "total").replace(",", ".");
  const total = Number(totalRaw);

  if (!operatorId || !boatId || !legalOfferingId || !pickupLocationId || !startsAt || !endsAt || !customerName) {
    redirect(url(operatorId, "error=missing-fields"));
  }

  if (!Number.isInteger(passengerCount) || passengerCount <= 0 || !Number.isFinite(total) || total < 0) {
    redirect(url(operatorId, "error=invalid-values"));
  }

  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !claimsData?.claims) {
    redirect(`/sign-in?next=${encodeURIComponent(url(operatorId))}`);
  }

  const { data, error } = await supabase.rpc("operator_create_manual_booking", {
    p_operator_id: operatorId,
    p_boat_id: boatId,
    p_legal_offering_id: legalOfferingId,
    p_pickup_location_id: pickupLocationId,
    p_starts_at: new Date(startsAt).toISOString(),
    p_ends_at: new Date(endsAt).toISOString(),
    p_passenger_count: passengerCount,
    p_customer_name: customerName,
    p_customer_email: customerEmail || null,
    p_customer_phone: customerPhone || null,
    p_total_cents: Math.round(total * 100),
    p_operator_note: operatorNote || null,
  });

  if (error) {
    let code = "save-failed";
    if (error.message.includes("operator_must_be_active")) code = "operator-inactive";
    if (error.message.includes("boat_must_be_active")) code = "boat-inactive";
    if (error.message.includes("boat_occupancies_no_active_overlap")) code = "overlap";
    if (error.message.includes("passenger_limit_exceeded")) code = "passengers";
    redirect(url(operatorId, `error=${code}`));
  }

  revalidatePath("/operator/dashboard");
  revalidatePath("/operator/bookings");
  redirect(`/operator/bookings/${data}?operator=${encodeURIComponent(operatorId)}&created=1`);
}
