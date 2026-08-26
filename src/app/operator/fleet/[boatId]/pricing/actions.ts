"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function toCents(value: string) {
  const normalized = value.replace(",", ".");

  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) {
    return null;
  }

  const amount = Number(normalized);
  return Number.isFinite(amount) ? Math.round(amount * 100) : null;
}

function pricingUrl(boatId: string, operatorId: string, extra?: string) {
  const base = `/operator/fleet/${encodeURIComponent(
    boatId,
  )}/pricing?operator=${encodeURIComponent(operatorId)}`;

  return extra ? `${base}&${extra}` : base;
}

export async function saveDefaultRatePlan(formData: FormData) {
  const operatorId = text(formData, "operator_id");
  const boatId = text(formData, "boat_id");
  const legalOfferingId = text(formData, "legal_offering_id");
  const name = text(formData, "name");
  const durationHours = Number(text(formData, "duration_hours"));
  const priceCents = toCents(text(formData, "price"));

  if (!operatorId || !boatId) {
    redirect("/operator/fleet");
  }

  if (
    !legalOfferingId ||
    !name ||
    !Number.isFinite(durationHours) ||
    durationHours <= 0 ||
    priceCents === null ||
    priceCents < 0
  ) {
    redirect(pricingUrl(boatId, operatorId, "error=invalid-rate"));
  }

  const baseDurationMinutes = Math.round(durationHours * 60);

  if (baseDurationMinutes <= 0 || baseDurationMinutes > 24 * 60) {
    redirect(pricingUrl(boatId, operatorId, "error=invalid-rate"));
  }

  const supabase = await createClient();
  const { data: claims, error: claimsError } = await supabase.auth.getClaims();

  if (claimsError || !claims?.claims) {
    redirect(
      `/sign-in?next=${encodeURIComponent(
        `/operator/fleet/${boatId}/pricing`,
      )}`,
    );
  }

  const { error } = await supabase.rpc("save_boat_default_rate_plan", {
    p_operator_id: operatorId,
    p_boat_id: boatId,
    p_legal_offering_id: legalOfferingId,
    p_name: name,
    p_base_duration_minutes: baseDurationMinutes,
    p_base_price_cents: priceCents,
  });

  if (error) {
    redirect(
      pricingUrl(
        boatId,
        operatorId,
        `error=${encodeURIComponent(
          error.message.includes("not_allowed") ? "not-allowed" : "save-failed",
        )}`,
      ),
    );
  }

  revalidatePath(`/operator/fleet/${boatId}/pricing`);
  redirect(pricingUrl(boatId, operatorId, "saved=1"));
}
