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
    `/operator/onboarding/legal?operator=${encodeURIComponent(
      operatorId,
    )}&error=${encodeURIComponent(error)}`,
  );
}

export async function saveLegalProfile(
  formData: FormData,
) {
  const operatorId =
    readText(formData, "operator_id");

  if (!operatorId) {
    redirect("/operator/onboarding");
  }

  const legalName =
    readText(formData, "legal_name");

  const legalForm =
    readText(formData, "legal_form");

  const vatNumber =
    readText(formData, "vat_number");

  const taxCode =
    readText(formData, "tax_code").toUpperCase();

  const businessRegisterNumber =
    readText(
      formData,
      "business_register_number",
    );

  const reaNumber =
    readText(formData, "rea_number").toUpperCase();

  const pecEmail =
    readText(formData, "pec_email").toLowerCase();

  const sdiCode =
    readText(formData, "sdi_code").toUpperCase();

  const registeredAddressLine1 =
    readText(
      formData,
      "registered_address_line_1",
    );

  const registeredAddressLine2 =
    readText(
      formData,
      "registered_address_line_2",
    );

  const registeredCity =
    readText(formData, "registered_city");

  const registeredAdministrativeArea =
    readText(
      formData,
      "registered_administrative_area",
    ).toUpperCase();

  const registeredPostalCode =
    readText(
      formData,
      "registered_postal_code",
    );

  const legalRepresentativeFirstName =
    readText(
      formData,
      "legal_representative_first_name",
    );

  const legalRepresentativeLastName =
    readText(
      formData,
      "legal_representative_last_name",
    );


  if (
    !legalName ||
    legalName.length > 200 ||
    !legalForm ||
    legalForm.length > 100
  ) {
    redirectWithError(
      operatorId,
      "invalid-company-data",
    );
  }


  if (!/^[0-9]{11}$/.test(vatNumber)) {
    redirectWithError(
      operatorId,
      "invalid-vat",
    );
  }


  if (
    !(
      /^[0-9]{11}$/.test(taxCode) ||
      /^[A-Z0-9]{16}$/.test(taxCode)
    )
  ) {
    redirectWithError(
      operatorId,
      "invalid-tax-code",
    );
  }


  if (
    !registeredAddressLine1 ||
    !registeredCity ||
    !registeredAdministrativeArea ||
    !/^[0-9]{5}$/.test(
      registeredPostalCode,
    )
  ) {
    redirectWithError(
      operatorId,
      "invalid-address",
    );
  }


  if (
    !legalRepresentativeFirstName ||
    !legalRepresentativeLastName
  ) {
    redirectWithError(
      operatorId,
      "invalid-representative",
    );
  }


  if (
    pecEmail &&
    !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(
      pecEmail,
    )
  ) {
    redirectWithError(
      operatorId,
      "invalid-pec",
    );
  }


  if (
    sdiCode &&
    !/^[A-Z0-9]{6,7}$/.test(sdiCode)
  ) {
    redirectWithError(
      operatorId,
      "invalid-sdi",
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
        `/operator/onboarding/legal?operator=${operatorId}`,
      )}`,
    );
  }


  const { data, error } = await supabase.rpc(
    "save_operator_legal_profile",
    {
      p_operator_id: operatorId,

      p_profile: {
        legal_name: legalName,
        legal_form: legalForm,
        vat_number: vatNumber,
        tax_code: taxCode,

        business_register_number:
          businessRegisterNumber || null,

        rea_number:
          reaNumber || null,

        pec_email:
          pecEmail || null,

        sdi_code:
          sdiCode || null,

        registered_address_line_1:
          registeredAddressLine1,

        registered_address_line_2:
          registeredAddressLine2 || null,

        registered_city:
          registeredCity,

        registered_administrative_area:
          registeredAdministrativeArea,

        registered_postal_code:
          registeredPostalCode,

        registered_country_code:
          "IT",

        legal_representative_first_name:
          legalRepresentativeFirstName,

        legal_representative_last_name:
          legalRepresentativeLastName,
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
    "/operator/onboarding/legal",
  );


  redirect(
    `/operator/onboarding?operator=${encodeURIComponent(
      data,
    )}&legalSaved=1`,
  );
}