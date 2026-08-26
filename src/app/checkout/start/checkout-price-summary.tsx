"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type PricingOption = {
  value: string;
  rentalPriceCents: number;
  durationMinutes: number;
  currency: string;
};

type PricingExtra = {
  id: string;
  name: string;
  priceCents: number;
  pricingUnit: string;
};

type CheckoutPriceSummaryProps = {
  options: PricingOption[];
  extras: PricingExtra[];
  fallbackCurrency: string;
};

type PriceState = {
  currency: string;
  rentalCents: number;
  extrasCents: number;
  totalCents: number;
  selectedExtras: Array<{
    id: string;
    name: string;
    quantity: number;
    lineTotalCents: number;
  }>;
};

function money(cents: number, currency: string) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

function effectiveQuantity(input: {
  pricingUnit: string;
  requestedQuantity: number;
  durationMinutes: number;
}) {
  if (input.pricingUnit === "FIXED") {
    return 1;
  }

  if (input.pricingUnit === "PER_HOUR") {
    return Math.max(1, Math.ceil(input.durationMinutes / 60));
  }

  if (input.pricingUnit === "PER_DAY") {
    return Math.max(1, Math.ceil(input.durationMinutes / 1440));
  }

  return Math.max(1, input.requestedQuantity);
}

export default function CheckoutPriceSummary({
  options,
  extras,
  fallbackCurrency,
}: CheckoutPriceSummaryProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  const firstOption = options[0];
  const [price, setPrice] = useState<PriceState>({
    currency: firstOption?.currency ?? fallbackCurrency,
    rentalCents: firstOption?.rentalPriceCents ?? 0,
    extrasCents: 0,
    totalCents: firstOption?.rentalPriceCents ?? 0,
    selectedExtras: [],
  });

  const recalculate = useCallback(() => {
    const form = rootRef.current?.closest("form");
    if (!form) {
      return;
    }

    const selectedRadio = form.querySelector<HTMLInputElement>(
      'input[name="booking_option"]:checked',
    );

    const selectedOption =
      options.find((option) => option.value === selectedRadio?.value) ??
      options[0];

    if (!selectedOption) {
      setPrice({
        currency: fallbackCurrency,
        rentalCents: 0,
        extrasCents: 0,
        totalCents: 0,
        selectedExtras: [],
      });
      return;
    }

    const selectedExtras: PriceState["selectedExtras"] = [];
    let extrasCents = 0;

    for (const extra of extras) {
      const checkbox = form.querySelector<HTMLInputElement>(
        `input[name="extra_${extra.id}"]`,
      );

      if (!checkbox?.checked) {
        continue;
      }

      const quantityInput = form.querySelector<HTMLInputElement>(
        `input[name="quantity_${extra.id}"]`,
      );
      const requestedQuantity = Math.max(
        1,
        Number.parseInt(quantityInput?.value ?? "1", 10) || 1,
      );
      const quantity = effectiveQuantity({
        pricingUnit: extra.pricingUnit,
        requestedQuantity,
        durationMinutes: selectedOption.durationMinutes,
      });
      const lineTotalCents = extra.priceCents * quantity;

      extrasCents += lineTotalCents;
      selectedExtras.push({
        id: extra.id,
        name: extra.name,
        quantity,
        lineTotalCents,
      });
    }

    setPrice({
      currency: selectedOption.currency,
      rentalCents: selectedOption.rentalPriceCents,
      extrasCents,
      totalCents: selectedOption.rentalPriceCents + extrasCents,
      selectedExtras,
    });
  }, [extras, fallbackCurrency, options]);

  useEffect(() => {
    const form = rootRef.current?.closest("form");
    if (!form) {
      return;
    }

    recalculate();
    form.addEventListener("change", recalculate);
    form.addEventListener("input", recalculate);

    return () => {
      form.removeEventListener("change", recalculate);
      form.removeEventListener("input", recalculate);
    };
  }, [recalculate]);

  return (
    <div ref={rootRef} className="mt-5 border-t border-[#DEE5E8] pt-5">
      <div className="flex items-center justify-between gap-4 text-sm">
        <span className="text-[#64748B]">Noleggio</span>
        <span className="font-semibold">
          {money(price.rentalCents, price.currency)}
        </span>
      </div>

      {price.selectedExtras.map((extra) => (
        <div
          key={extra.id}
          className="mt-3 flex items-start justify-between gap-4 text-sm"
        >
          <span className="text-[#64748B]">
            {extra.name}
            {extra.quantity > 1 ? ` × ${extra.quantity}` : ""}
          </span>
          <span className="font-semibold">
            {money(extra.lineTotalCents, price.currency)}
          </span>
        </div>
      ))}

      {price.extrasCents > 0 ? (
        <div className="mt-4 flex items-center justify-between gap-4 border-t border-[#DEE5E8] pt-4 text-sm">
          <span className="text-[#64748B]">Extra</span>
          <span className="font-semibold">
            {money(price.extrasCents, price.currency)}
          </span>
        </div>
      ) : null}

      <div className="mt-4 flex items-end justify-between gap-4 border-t border-[#DEE5E8] pt-4">
        <div>
          <p className="text-sm font-semibold">Totale stimato</p>
          <p className="mt-1 text-xs leading-5 text-[#64748B]">
            Boatly ricalcola e valida lo stesso totale lato server prima di creare il pagamento Stripe.
          </p>
        </div>
        <p className="whitespace-nowrap text-2xl font-semibold">
          {money(price.totalCents, price.currency)}
        </p>
      </div>
    </div>
  );
}
