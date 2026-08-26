"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function publicationUrl(boatId: string, operatorId: string, extra?: string) {
  const base = `/operator/fleet/${encodeURIComponent(
    boatId,
  )}/publication?operator=${encodeURIComponent(operatorId)}`;

  return extra ? `${base}&${extra}` : base;
}

export async function submitPublication(formData: FormData) {
  const operatorId = text(formData, "operator_id");
  const boatId = text(formData, "boat_id");

  if (!operatorId || !boatId) {
    redirect("/operator/fleet");
  }

  const supabase = await createClient();
  const { data: claims, error: claimsError } = await supabase.auth.getClaims();

  if (claimsError || !claims?.claims) {
    redirect(
      `/sign-in?next=${encodeURIComponent(
        `/operator/fleet/${boatId}/publication`,
      )}`,
    );
  }

  const { error } = await supabase.rpc("submit_boat_for_publication", {
    p_operator_id: operatorId,
    p_boat_id: boatId,
  });

  if (error) {
    let code = "submit-failed";

    if (error.message.includes("availability_required")) {
      code = "availability-required";
    } else if (error.message.includes("rate_plan_required")) {
      code = "pricing-required";
    } else if (error.message.includes("boat_must_be_active")) {
      code = "boat-not-active";
    } else if (error.message.includes("boat_not_ready")) {
      code = "boat-not-ready";
    } else if (error.message.includes("not_allowed")) {
      code = "not-allowed";
    }

    redirect(publicationUrl(boatId, operatorId, `error=${code}`));
  }

  revalidatePath(`/operator/fleet/${boatId}/publication`);
  redirect(publicationUrl(boatId, operatorId, "submitted=1"));
}
