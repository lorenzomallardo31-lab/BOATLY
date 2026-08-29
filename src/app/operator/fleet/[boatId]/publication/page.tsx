import Link from "next/link";

import { requireOperatorBoatContext } from "@/lib/operator/context";

import { submitPublication } from "./actions";

type PageProps = {
  params: Promise<{ boatId: string }>;
  searchParams: Promise<{
    operator?: string;
    submitted?: string;
    error?: string;
  }>;
};

type Readiness = {
  completion_percent: number;
  ready_for_activation: boolean;
};

type Publication = {
  review_id: string;
  status: string;
  submitted_at: string;
  reviewed_at: string | null;
  decision_note: string | null;
};

function errorMessage(error?: string) {
  switch (error) {
    case "availability-required":
      return "Configura almeno una finestra di disponibilità prima di inviare la barca.";
    case "pricing-required":
      return "Configura una tariffa attiva prima di inviare la barca.";
    case "boat-not-active":
      return "La barca deve essere disponibile prima dell'invio.";
    case "boat-not-ready":
      return "La scheda Fleet non è ancora completa.";
    case "not-allowed":
      return "Non hai i permessi necessari per inviare la barca.";
    case "submit-failed":
      return "Non è stato possibile inviare la barca alla revisione Boatly.";
    default:
      return null;
  }
}

export default async function PublicationPage({
  params,
  searchParams,
}: PageProps) {
  const { boatId } = await params;
  const query = await searchParams;

  const { supabase, boat, operator, canManage } =
    await requireOperatorBoatContext(boatId, query.operator);

  const { data: readinessRows, error: readinessError } = await supabase.rpc(
    "get_boat_fleet_readiness",
    {
      p_operator_id: operator.id,
      p_boat_id: boat.id,
    },
  );

  if (readinessError) {
    throw new Error(`Unable to load readiness: ${readinessError.message}`);
  }

  const readiness = (Array.isArray(readinessRows)
    ? readinessRows[0]
    : null) as Readiness | null;

  const { data: publicationRows, error: publicationError } = await supabase.rpc(
    "get_boat_publication_status",
    {
      p_operator_id: operator.id,
      p_boat_id: boat.id,
    },
  );

  if (publicationError) {
    throw new Error(`Unable to load publication: ${publicationError.message}`);
  }

  const publication = (Array.isArray(publicationRows)
    ? publicationRows[0]
    : null) as Publication | null;

  const { count: availabilityCount } = await supabase
    .from("boat_availability_rules")
    .select("id", { count: "exact", head: true })
    .eq("boat_id", boat.id)
    .eq("is_active", true);

  const { count: ratePlanCount } = await supabase
    .from("boat_rate_plans")
    .select("id", { count: "exact", head: true })
    .eq("boat_id", boat.id)
    .eq("is_active", true);

  const checks = [
    {
      label: "Scheda Fleet completa",
      ok: Boolean(readiness?.ready_for_activation),
      href: `/operator/fleet/${boat.id}/status`,
    },
    {
      label: "Barca disponibile",
      ok: boat.status === "ACTIVE",
      href: `/operator/fleet/${boat.id}/status`,
    },
    {
      label: "Disponibilità configurata",
      ok: (availabilityCount ?? 0) > 0,
      href: `/operator/fleet/${boat.id}/availability`,
    },
    {
      label: "Tariffa configurata",
      ok: (ratePlanCount ?? 0) > 0,
      href: `/operator/fleet/${boat.id}/pricing`,
    },
  ];

  const canSubmit = canManage && checks.every((check) => check.ok);
  const error = errorMessage(query.error);

  return (
    <main className="min-h-screen bg-[#FCFBF8] px-4 py-8 text-[#0B1F33] sm:px-6 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link href="/" className="text-2xl font-bold tracking-tight">
              Boatly
            </Link>
            <p className="mt-1 text-sm text-[#64748B]">Fleet Management</p>
          </div>
          <Link
            href={`/operator/fleet?operator=${operator.id}`}
            className="text-sm font-medium text-[#64748B] hover:text-[#0B1F33]"
          >
            Torna alla flotta
          </Link>
        </header>

        <section className="mt-8 rounded-2xl border border-[#DEE5E8] bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold text-[#14B8A6]">Marketplace</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Pubblicazione di {boat.name}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#64748B]">
            L&apos;attivazione Fleet e la pubblicazione B2C sono separate. La barca
            diventa visibile ai clienti soltanto dopo l&apos;approvazione della
            revisione e quando anche l&apos;operatore è marketplace-eligible.
          </p>
        </section>

        {query.submitted === "1" ? (
          <div className="mt-5 rounded-xl border border-[#14B8A6]/30 bg-[#14B8A6]/10 p-4 text-sm">
            <strong>Richiesta inviata.</strong> La barca è entrata nella coda di
            revisione Boatly.
          </div>
        ) : null}

        {error ? (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        ) : null}

        <section className="mt-6 rounded-2xl border border-[#DEE5E8] bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm text-[#64748B]">Stato revisione</p>
              <p className="mt-1 text-2xl font-semibold">
                {publication?.status ?? "NON INVIATA"}
              </p>
            </div>
            {boat.slug ? (
              <span className="rounded-full bg-[#F1F5F4] px-4 py-2 text-xs font-semibold">
                /barche/{boat.slug}
              </span>
            ) : null}
          </div>

          {publication?.decision_note ? (
            <div className="mt-5 rounded-xl bg-[#F1F5F4] p-4 text-sm">
              <strong>Nota Boatly:</strong> {publication.decision_note}
            </div>
          ) : null}
        </section>

        <section className="mt-6 rounded-2xl border border-[#DEE5E8] bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Preflight pubblicazione</h2>
          <div className="mt-5 space-y-3">
            {checks.map((check) => (
              <Link
                key={check.label}
                href={check.href}
                className="flex items-center justify-between gap-4 rounded-xl border border-[#DEE5E8] p-4 hover:border-[#14B8A6]/50"
              >
                <span className="font-medium">{check.label}</span>
                <span
                  className={
                    check.ok
                      ? "font-semibold text-[#0F766E]"
                      : "font-semibold text-amber-700"
                  }
                >
                  {check.ok ? "✓ Pronto" : "Da completare"}
                </span>
              </Link>
            ))}
          </div>

          {canSubmit && !["PENDING", "IN_REVIEW", "APPROVED"].includes(publication?.status ?? "") ? (
            <form action={submitPublication} className="mt-6">
              <input type="hidden" name="operator_id" value={operator.id} />
              <input type="hidden" name="boat_id" value={boat.id} />
              <button
                type="submit"
                className="rounded-xl bg-[#14B8A6] px-6 py-3 text-sm font-semibold text-white"
              >
                Invia alla revisione Boatly
              </button>
            </form>
          ) : null}
        </section>
      </div>
    </main>
  );
}
