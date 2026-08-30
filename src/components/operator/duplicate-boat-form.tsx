"use client";

import { useFormStatus } from "react-dom";

import { duplicateBoat } from "@/app/operator/fleet/[boatId]/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-4 min-h-12 w-full shrink-0 cursor-pointer rounded-xl bg-[#6D5DFB] px-5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#5948ED] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B7CFF] active:translate-y-0 active:scale-[0.98] disabled:cursor-wait disabled:opacity-60 sm:mt-0 sm:w-auto"
    >
      {pending ? "Duplicazione…" : "Duplica imbarcazione"}
    </button>
  );
}

export default function DuplicateBoatForm({
  operatorId,
  boatId,
  boatName,
}: {
  operatorId: string;
  boatId: string;
  boatName: string;
}) {
  return (
    <form
      action={duplicateBoat}
      onSubmit={(event) => {
        if (!window.confirm(`Creare una nuova imbarcazione con la stessa configurazione di “${boatName}”?`)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="operator_id" value={operatorId} />
      <input type="hidden" name="boat_id" value={boatId} />
      <SubmitButton />
    </form>
  );
}
