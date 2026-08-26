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

export async function saveWeeklyAvailability(formData: FormData) {
  const operatorId = text(formData, "operator_id");
  const boatId = text(formData, "boat_id");
  const timezone = text(formData, "timezone") || "Europe/Rome";

  if (!operatorId || !boatId) {
    redirect("/operator/fleet");
  }

  const rules: Array<{
    weekday: number;
    available_from: string;
    available_to: string;
    timezone: string;
    valid_from: string | null;
    valid_to: string | null;
  }> = [];

  for (let weekday = 1; weekday <= 7; weekday += 1) {
    if (formData.get(`enabled_${weekday}`) !== "on") {
      continue;
    }

    const availableFrom = text(formData, `from_${weekday}`);
    const availableTo = text(formData, `to_${weekday}`);

    if (!availableFrom || !availableTo || availableTo <= availableFrom) {
      redirect(url(boatId, operatorId, "error=invalid-window"));
    }

    rules.push({
      weekday,
      available_from: availableFrom,
      available_to: availableTo,
      timezone,
      valid_from: text(formData, `valid_from_${weekday}`) || null,
      valid_to: text(formData, `valid_to_${weekday}`) || null,
    });
  }

  const supabase = await requireSession(
    `/operator/fleet/${boatId}/availability`,
  );

  const { error } = await supabase.rpc("save_boat_weekly_availability", {
    p_operator_id: operatorId,
    p_boat_id: boatId,
    p_rules: rules,
  });

  if (error) {
    redirect(
      url(
        boatId,
        operatorId,
        `error=${encodeURIComponent(
          error.message.includes("not_allowed") ? "not-allowed" : "save-failed",
        )}`,
      ),
    );
  }

  revalidatePath(`/operator/fleet/${boatId}/availability`);
  redirect(url(boatId, operatorId, "saved=availability"));
}

export async function createCalendarBlock(formData: FormData) {
  const operatorId = text(formData, "operator_id");
  const boatId = text(formData, "boat_id");
  const occupancyType = text(formData, "occupancy_type");
  const start = text(formData, "starts_at");
  const end = text(formData, "ends_at");
  const timezone = text(formData, "timezone") || "Europe/Rome";
  const title = text(formData, "title");
  const notes = text(formData, "notes");

  const allowed = new Set([
    "MAINTENANCE",
    "TRANSFER",
    "PRIVATE_USE",
    "OPERATOR_BLOCK",
    "OTHER",
  ]);

  if (!operatorId || !boatId || !allowed.has(occupancyType)) {
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
    p_occupancy_type: occupancyType,
    p_starts_at: `${start.replace("T", " ")}:00 ${timezone}`,
    p_ends_at: `${end.replace("T", " ")}:00 ${timezone}`,
    p_title: title || null,
    p_notes: notes || null,
  });

  if (error) {
    const code = error.message.includes("boat_time_conflict")
      ? "conflict"
      : "block-failed";

    redirect(url(boatId, operatorId, `error=${code}`));
  }

  revalidatePath(`/operator/fleet/${boatId}/availability`);
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
  redirect(url(boatId, operatorId, "saved=released"));
}
