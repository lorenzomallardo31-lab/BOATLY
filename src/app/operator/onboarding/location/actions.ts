"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

function readText(
  formData: FormData,
  field: string,
) {
  const value = formData.get(field);

  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function redirectWithError(
  operatorId: string,
  error: string,
): never {
  redirect(
    `/operator/onboarding/location?operator=${encodeURIComponent(
      operatorId,
    )}&error=${encodeURIComponent(error)}`,
  );
}

export async function savePrimaryLocation(
  formData: FormData,
) {
  const operatorId =
    readText(formData, "operator_id");

  if (!operatorId) {
    redirect("/operator/onboarding");
  }


  const name =
    readText(formData, "name");

  const addressLine1 =
    readText(formData, "address_line_1");

  const addressLine2 =
    readText(formData, "address_line_2");

  const city =
    readText(formData, "city");

  const administrativeArea =
    readText(
      formData,
      "administrative_area",
    ).toUpperCase();

  const postalCode =
    readText(formData, "postal_code");

  const phone =
    readText(formData, "phone");

  const email =
    readText(formData, "email").toLowerCase();

  const pickupInstructions =
    readText(
      formData,
      "pickup_instructions",
    );


  if (
    !name ||
    name.length > 160
  ) {
    redirectWithError(
      operatorId,
      "invalid-name",
    );
  }


  if (
    !addressLine1 ||
    addressLine1.length > 200 ||
    !city ||
    city.length > 120 ||
    !administrativeArea ||
    administrativeArea.length > 120 ||
    !/^[0-9]{5}$/.test(postalCode)
  ) {
    redirectWithError(
      operatorId,
      "invalid-address",
    );
  }


  if (
    email &&
    !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(
      email,
    )
  ) {
    redirectWithError(
      operatorId,
      "invalid-email",
    );
  }


  if (
    phone &&
    phone.length > 50
  ) {
    redirectWithError(
      operatorId,
      "invalid-phone",
    );
  }


  if (
    pickupInstructions.length > 2000
  ) {
    redirectWithError(
      operatorId,
      "invalid-pickup-instructions",
    );
  }


  const supabase = await createClient();

  const {
    data: claimsData,
    error: claimsError,
  } = await supabase.auth.getClaims();


  if (
    claimsError ||
    !claimsData?.claims
  ) {
    redirect(
      `/sign-in?next=${encodeURIComponent(
        `/operator/onboarding/location?operator=${operatorId}`,
      )}`,
    );
  }


  const { data, error } = await supabase.rpc(
    "save_operator_primary_location",
    {
      p_operator_id: operatorId,

      p_location: {
        name,
        address_line_1: addressLine1,

        address_line_2:
          addressLine2 || null,

        city,

        administrative_area:
          administrativeArea,

        postal_code:
          postalCode,

        country_code:
          "IT",

        timezone:
          "Europe/Rome",

        phone:
          phone || null,

        email:
          email || null,

        pickup_instructions:
          pickupInstructions || null,

        is_public:
          true,
      },
    },
  );


  if (
    error ||
    typeof data !== "string"
  ) {
    redirectWithError(
      operatorId,
      "save-failed",
    );
  }


  revalidatePath(
    "/operator/onboarding",
  );

  revalidatePath(
    "/operator/onboarding/location",
  );


  redirect(
    `/operator/onboarding?operator=${encodeURIComponent(
      operatorId,
    )}&locationSaved=1`,
  );
}