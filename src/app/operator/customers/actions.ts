"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireOperatorWorkspaceContext } from "@/lib/operator/workspace-context";

export type CustomerActionState = {
  status: "idle" | "error" | "success";
  code?: string;
  customerId?: string;
};

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function mapCustomerError(message: string) {
  const mappings: Array<[string, string]> = [
    ["invalid_customer_name", "invalid-name"],
    ["customer_contact_required", "contact-required"],
    ["invalid_customer_email", "invalid-email"],
    ["invalid_customer_phone", "invalid-phone"],
    ["invalid_customer_country", "invalid-country"],
    ["invalid_customer_birth_date", "invalid-birth-date"],
    ["customer_notes_too_long", "notes-too-long"],
    ["customer_email_already_exists", "email-exists"],
    ["customer_phone_already_exists", "phone-exists"],
    ["customer_identity_conflict", "identity-conflict"],
    ["customer_not_found", "not-found"],
    ["operator_must_be_active", "operator-inactive"],
    ["customer_save_not_allowed", "not-allowed"],
  ];
  return mappings.find(([needle]) => message.includes(needle))?.[1] ?? "save-failed";
}

export async function saveCustomer(
  _previousState: CustomerActionState,
  formData: FormData,
): Promise<CustomerActionState> {
  const operatorId = text(formData, "operator_id");
  const customerId = text(formData, "customer_id");
  const displayName = text(formData, "display_name");
  const email = text(formData, "email");
  const phone = text(formData, "phone");
  const countryCode = text(formData, "country_code").toUpperCase();
  const dateOfBirth = text(formData, "date_of_birth");
  const notes = text(formData, "notes");

  if (!operatorId || displayName.length < 2) {
    return { status: "error", code: "invalid-name" };
  }
  if (!email && !phone) {
    return { status: "error", code: "contact-required" };
  }

  const { supabase, operator } = await requireOperatorWorkspaceContext(operatorId);
  const { data, error } = await supabase.rpc("operator_save_customer", {
    p_operator_id: operator.id,
    p_customer_id: customerId || null,
    p_display_name: displayName,
    p_email: email || null,
    p_phone: phone || null,
    p_country_code: countryCode || null,
    p_date_of_birth: dateOfBirth || null,
    p_notes: notes || null,
  });

  if (error || typeof data !== "string") {
    return {
      status: "error",
      code: error ? mapCustomerError(error.message) : "save-failed",
    };
  }

  revalidatePath("/operator/customers");
  revalidatePath(`/operator/customers/${data}`);
  revalidatePath("/operator/calendar");
  if (text(formData, "calendar_mode") === "1") {
    return { status: "success", customerId: data };
  }
  redirect(
    `/operator/customers/${data}?operator=${encodeURIComponent(operator.id)}&saved=1`,
  );
}
