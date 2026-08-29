"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function url(boatId: string, operatorId: string, extra?: string) {
  const base = `/operator/fleet/${encodeURIComponent(
    boatId,
  )}/availability?operator=${encodeURIComponent(operatorId)}`;

  return extra ? `${base}&${extra}` : base;
}

async function requireSession(next: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect(`/sign-in?next=${encodeURIComponent(next)}`);
  }

  return supabase;
}

export async function createCalendarBlock(formData: FormData) {
  const operatorId = text(formData, "operator_id");
  const boatId = text(formData, "boat_id");
  const start = text(formData, "starts_at");
  const end = text(formData, "ends_at");
  const timezone = text(formData, "timezone") || "Europe/Rome";
  const notes = text(formData, "notes");

  if (!operatorId || !boatId) {
    redirect("/operator/fleet");
  }

  if (!start || !end) {
    redirect(url(boatId, operatorId, "error=invalid-block"));
  }

  const supabase = await requireSession(
    `/operator/fleet/${boatId}/availability`,
  );

  const { error } = await supabase.rpc("create_operator_boat_occupancy", {
    p_operator_id: operatorId,
    p_boat_id: boatId,
    p_occupancy_type: "OPERATOR_BLOCK",
    p_starts_at: `${start.replace("T", " ")}:00 ${timezone}`,
    p_ends_at: `${end.replace("T", " ")}:00 ${timezone}`,
    p_title: "Non disponibile",
    p_notes: notes || null,
  });

  if (error) {
    const code = error.message.includes("boat_time_conflict")
      ? "conflict"
      : "block-failed";

    redirect(url(boatId, operatorId, `error=${code}`));
  }

  revalidatePath(`/operator/fleet/${boatId}/availability`);
  revalidatePath("/operator/calendar");
  redirect(url(boatId, operatorId, "saved=block"));
}

export async function releaseCalendarBlock(formData: FormData) {
  const operatorId = text(formData, "operator_id");
  const boatId = text(formData, "boat_id");
  const occupancyId = text(formData, "occupancy_id");

  if (!operatorId || !boatId || !occupancyId) {
    redirect("/operator/fleet");
  }

  const supabase = await requireSession(
    `/operator/fleet/${boatId}/availability`,
  );

  const { error } = await supabase.rpc("release_operator_boat_occupancy", {
    p_operator_id: operatorId,
    p_boat_id: boatId,
    p_occupancy_id: occupancyId,
    p_reason: "RELEASED_BY_OPERATOR",
  });

  if (error) {
    redirect(url(boatId, operatorId, "error=release-failed"));
  }

  revalidatePath(`/operator/fleet/${boatId}/availability`);
  revalidatePath("/operator/calendar");
  redirect(url(boatId, operatorId, "saved=released"));
}
