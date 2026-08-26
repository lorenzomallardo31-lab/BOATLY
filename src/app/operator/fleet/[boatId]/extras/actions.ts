"use server";

import {
  revalidatePath,
} from "next/cache";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

const PRICING_UNITS = [
  "FIXED",
  "PER_PERSON",
  "PER_HOUR",
  "PER_DAY",
  "PER_UNIT",
] as const;

type PricingUnit =
  (typeof PRICING_UNITS)[number];


function readText(
  formData: FormData,
  field: string,
) {
  const value =
    formData.get(field);

  return typeof value === "string"
    ? value.trim()
    : "";
}


function extrasUrl(
  boatId: string,
  operatorId: string,
  extra?: string,
) {
  const base =
    `/operator/fleet/${encodeURIComponent(
      boatId,
    )}/extras?operator=${encodeURIComponent(
      operatorId,
    )}`;

  return extra
    ? `${base}&${extra}`
    : base;
}


function isPricingUnit(
  value: string,
): value is PricingUnit {
  return PRICING_UNITS.includes(
    value as PricingUnit,
  );
}


function priceToCents(
  rawValue: string,
) {
  const normalized =
    rawValue
      .trim()
      .replace(",", ".");

  if (
    !/^\d+(?:\.\d{1,2})?$/.test(
      normalized,
    )
  ) {
    return null;
  }

  const amount =
    Number(normalized);

  if (
    !Number.isFinite(amount) ||
    amount < 0
  ) {
    return null;
  }

  return Math.round(
    amount * 100,
  );
}


export async function saveOperatorExtra(
  formData: FormData,
) {
  const operatorId =
    readText(
      formData,
      "operator_id",
    );

  const boatId =
    readText(
      formData,
      "boat_id",
    );

  const extraId =
    readText(
      formData,
      "extra_id",
    );

  const name =
    readText(
      formData,
      "name",
    );

  const description =
    readText(
      formData,
      "description",
    );

  const pricingUnit =
    readText(
      formData,
      "pricing_unit",
    );

  const price =
    readText(
      formData,
      "price",
    );

  const maxQuantity =
    readText(
      formData,
      "max_quantity",
    );

  const isActive =
    formData.get(
      "is_active",
    ) === "on";


  if (
    !operatorId ||
    !boatId
  ) {
    redirect(
      "/operator/fleet",
    );
  }


  if (
    !name ||
    name.length > 120
  ) {
    redirect(
      extrasUrl(
        boatId,
        operatorId,
        "error=invalid-name",
      ),
    );
  }


  if (
    !isPricingUnit(
      pricingUnit,
    )
  ) {
    redirect(
      extrasUrl(
        boatId,
        operatorId,
        "error=invalid-unit",
      ),
    );
  }


  const priceCents =
    priceToCents(
      price,
    );


  if (
    priceCents === null
  ) {
    redirect(
      extrasUrl(
        boatId,
        operatorId,
        "error=invalid-price",
      ),
    );
  }


  if (
    maxQuantity &&
    !/^[1-9][0-9]*$/.test(
      maxQuantity,
    )
  ) {
    redirect(
      extrasUrl(
        boatId,
        operatorId,
        "error=invalid-quantity",
      ),
    );
  }


  const supabase =
    await createClient();


  const {
    data: claimsData,
    error: claimsError,
  } =
    await supabase.auth.getClaims();


  if (
    claimsError ||
    !claimsData?.claims
  ) {
    redirect(
      `/sign-in?next=${encodeURIComponent(
        `/operator/fleet/${boatId}/extras`,
      )}`,
    );
  }


  const {
    error,
  } = await supabase.rpc(
    "save_operator_extra",
    {
      p_operator_id:
        operatorId,

      p_extra_id:
        extraId || null,

      p_payload: {
        name,
        description:
          description || null,

        pricing_unit:
          pricingUnit,

        price_cents:
          priceCents,

        max_quantity:
          maxQuantity || null,

        is_active:
          isActive,
      },
    },
  );


  if (error) {
    let errorCode =
      "catalog-save-failed";


    if (
      error.message.includes(
        "duplicate_extra_name",
      )
    ) {
      errorCode =
        "duplicate-name";
    }


    if (
      error.message.includes(
        "operator_extra_save_not_allowed",
      )
    ) {
      errorCode =
        "not-allowed";
    }


    redirect(
      extrasUrl(
        boatId,
        operatorId,
        `error=${encodeURIComponent(
          errorCode,
        )}`,
      ),
    );
  }


  revalidatePath(
    `/operator/fleet/${boatId}/extras`,
  );


  redirect(
    extrasUrl(
      boatId,
      operatorId,
      extraId
        ? "catalogSaved=updated"
        : "catalogSaved=created",
    ),
  );
}


export async function saveBoatExtras(
  formData: FormData,
) {
  const operatorId =
    readText(
      formData,
      "operator_id",
    );

  const boatId =
    readText(
      formData,
      "boat_id",
    );


  if (
    !operatorId ||
    !boatId
  ) {
    redirect(
      "/operator/fleet",
    );
  }


  const supabase =
    await createClient();


  const {
    data: claimsData,
    error: claimsError,
  } =
    await supabase.auth.getClaims();


  if (
    claimsError ||
    !claimsData?.claims
  ) {
    redirect(
      `/sign-in?next=${encodeURIComponent(
        `/operator/fleet/${boatId}/extras`,
      )}`,
    );
  }


  const {
    data: extraRows,
    error: extrasError,
  } = await supabase.rpc(
    "get_operator_extras",
    {
      p_operator_id:
        operatorId,
    },
  );


  if (
    extrasError ||
    !Array.isArray(
      extraRows,
    )
  ) {
    redirect(
      extrasUrl(
        boatId,
        operatorId,
        "error=load-failed",
      ),
    );
  }


  const items:
    Array<{
      extra_id: string;
      price_override_cents:
        number | null;
      max_quantity_override:
        string | null;
    }> = [];


  for (
    const extra of extraRows
  ) {
    if (
      !extra.is_active
    ) {
      continue;
    }


    const selected =
      formData.get(
        `extra_${extra.id}`,
      ) === "on";


    if (!selected) {
      continue;
    }


    const priceOverride =
      readText(
        formData,
        `price_override_${extra.id}`,
      );


    const quantityOverride =
      readText(
        formData,
        `quantity_override_${extra.id}`,
      );


    let priceOverrideCents:
      number | null = null;


    if (priceOverride) {
      priceOverrideCents =
        priceToCents(
          priceOverride,
        );


      if (
        priceOverrideCents ===
        null
      ) {
        redirect(
          extrasUrl(
            boatId,
            operatorId,
            "error=invalid-override-price",
          ),
        );
      }
    }


    if (
      quantityOverride &&
      !/^[1-9][0-9]*$/.test(
        quantityOverride,
      )
    ) {
      redirect(
        extrasUrl(
          boatId,
          operatorId,
          "error=invalid-override-quantity",
        ),
      );
    }


    items.push({
      extra_id:
        extra.id,

      price_override_cents:
        priceOverrideCents,

      max_quantity_override:
        quantityOverride || null,
    });
  }


  const {
    error,
  } = await supabase.rpc(
    "save_boat_extras",
    {
      p_operator_id:
        operatorId,

      p_boat_id:
        boatId,

      p_items:
        items,
    },
  );


  if (error) {
    let errorCode =
      "boat-save-failed";


    if (
      error.message.includes(
        "boat_extras_save_not_allowed",
      )
    ) {
      errorCode =
        "not-allowed";
    }


    redirect(
      extrasUrl(
        boatId,
        operatorId,
        `error=${encodeURIComponent(
          errorCode,
        )}`,
      ),
    );
  }


  revalidatePath(
    `/operator/fleet/${boatId}/extras`,
  );


  redirect(
    extrasUrl(
      boatId,
      operatorId,
      "saved=1",
    ),
  );
}