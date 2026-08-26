import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

type StatusPageProps = {
  searchParams: Promise<{
    operator?: string;
  }>;
};

type OperatorSummary = {
  id: string;
  name: string;
  status: string;
};

type VerificationStatusRow = {
  verification_id: string | null;
  verification_status: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  decision_note: string | null;
  operator_status: string;
};

function formatDate(
  value: string | null,
) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat(
    "it-IT",
    {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Europe/Rome",
    },
  ).format(
    new Date(value),
  );
}

function statusPresentation(
  verificationStatus: string | null,
  operatorStatus: string,
) {
  if (
    verificationStatus === "PENDING"
  ) {
    return {
      eyebrow: "Richiesta ricevuta",
      title:
        "La verifica è in attesa di presa in carico",
      description:
        "Boatly ha ricevuto il workspace e i documenti inviati. La richiesta entrerà nella coda di revisione del team Compliance.",
    };
  }

  if (
    verificationStatus === "IN_REVIEW"
  ) {
    return {
      eyebrow: "Verifica in corso",
      title:
        "Boatly sta controllando il workspace",
      description:
        "Il team Compliance sta verificando le informazioni aziendali, la sede e i documenti inviati.",
    };
  }

  if (
    verificationStatus ===
    "NEEDS_CHANGES"
  ) {
    return {
      eyebrow:
        "Modifiche richieste",
      title:
        "Sono necessarie alcune correzioni",
      description:
        "Boatly ha completato una prima revisione e richiede alcune modifiche prima di poter continuare con la verifica.",
    };
  }

  if (
    verificationStatus === "APPROVED" ||
    operatorStatus === "ACTIVE"
  ) {
    return {
      eyebrow:
        "Verifica approvata",
      title:
        "Il workspace è stato approvato",
      description:
        "La verifica Boatly è stata completata con esito positivo. Il workspace può proseguire verso la configurazione operativa della flotta.",
    };
  }

  if (
    verificationStatus === "REJECTED" ||
    operatorStatus === "REJECTED"
  ) {
    return {
      eyebrow:
        "Verifica non approvata",
      title:
        "La richiesta è stata respinta",
      description:
        "La verifica si è conclusa con esito negativo. Consulta la motivazione riportata da Boatly.",
    };
  }

  return {
    eyebrow:
      "Stato onboarding",
    title:
      "Nessuna verifica attiva",
    description:
      "Non risulta ancora una richiesta di verifica per questo workspace.",
  };
}

export default async function StatusPage({
  searchParams,
}: StatusPageProps) {
  const params =
    await searchParams;

  const supabase =
    await createClient();

  const {
    data: claimsData,
    error: claimsError,
  } =
    await supabase.auth.getClaims();

  if (
    claimsError ||
    !claimsData?.claims ||
    typeof claimsData.claims.sub !==
      "string"
  ) {
    redirect(
      "/sign-in?next=/operator/onboarding",
    );
  }

  const userId =
    claimsData.claims.sub;

  const {
    data: memberships,
    error: membershipsError,
  } = await supabase
    .from("operator_members")
    .select("operator_id")
    .eq("user_id", userId)
    .eq("role", "OWNER")
    .eq("status", "ACTIVE");

  if (membershipsError) {
    throw new Error(
      "Unable to load operator memberships.",
    );
  }

  const operatorIds =
    Array.from(
      new Set(
        (memberships ?? []).map(
          (membership) =>
            membership.operator_id,
        ),
      ),
    );

  if (
    operatorIds.length === 0
  ) {
    redirect(
      "/operator/onboarding",
    );
  }

  const {
    data: operatorRows,
    error: operatorsError,
  } = await supabase
    .from("operators")
    .select(
      "id, name, status",
    )
    .in(
      "id",
      operatorIds,
    );

  if (operatorsError) {
    throw new Error(
      "Unable to load operator workspaces.",
    );
  }

  const operators =
    (operatorRows ??
      []) as OperatorSummary[];

  const selectedOperator =
    params.operator
      ? operators.find(
          (operator) =>
            operator.id ===
            params.operator,
        )
      : operators[0];

  if (!selectedOperator) {
    redirect(
      "/operator/onboarding",
    );
  }

  const {
    data: verificationRows,
    error: verificationError,
  } = await supabase.rpc(
    "get_operator_onboarding_verification_status",
    {
      p_operator_id:
        selectedOperator.id,
    },
  );

  if (verificationError) {
    throw new Error(
      "Unable to load operator verification status.",
    );
  }

  const verification =
    Array.isArray(
      verificationRows,
    )
      ? (
          verificationRows[0] as
            | VerificationStatusRow
            | undefined
        ) ?? null
      : null;

  if (
    !verification ||
    !verification.verification_id
  ) {
    redirect(
      `/operator/onboarding?operator=${selectedOperator.id}`,
    );
  }

  const presentation =
    statusPresentation(
      verification.verification_status,
      verification.operator_status,
    );

  const submittedAt =
    formatDate(
      verification.submitted_at,
    );

  const reviewedAt =
    formatDate(
      verification.reviewed_at,
    );

  const needsChanges =
    verification.verification_status ===
    "NEEDS_CHANGES";

  const approved =
    verification.verification_status ===
      "APPROVED" ||
    verification.operator_status ===
      "ACTIVE";

  const rejected =
    verification.verification_status ===
      "REJECTED" ||
    verification.operator_status ===
      "REJECTED";

  const waiting =
    verification.verification_status ===
      "PENDING" ||
    verification.verification_status ===
      "IN_REVIEW";

  const canCorrect =
    needsChanges &&
    verification.operator_status ===
      "DRAFT";

  return (
    <main className="min-h-screen bg-[#FCFBF8] px-4 py-8 text-[#0B1F33] sm:px-6 sm:py-10">
      <div className="mx-auto max-w-4xl">

        <header className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/"
            className="text-2xl font-bold tracking-tight"
          >
            Boatly
          </Link>

          <Link
            href={`/operator/onboarding?operator=${selectedOperator.id}`}
            className="text-sm font-medium text-[#64748B] hover:text-[#0B1F33]"
          >
            Torna all&apos;onboarding
          </Link>
        </header>

        <section className="mt-10 rounded-2xl border border-[#DEE5E8] bg-white p-6 shadow-sm sm:p-8">

          <p className="text-sm font-semibold text-[#14B8A6]">
            {presentation.eyebrow}
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            {presentation.title}
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-6 text-[#64748B]">
            {presentation.description}
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">

            <div className="rounded-xl bg-[#F1F5F4] p-4">
              <p className="text-xs font-medium text-[#64748B]">
                Workspace
              </p>

              <p className="mt-1 font-semibold">
                {selectedOperator.name}
              </p>
            </div>

            <div className="rounded-xl bg-[#F1F5F4] p-4">
              <p className="text-xs font-medium text-[#64748B]">
                Stato workspace
              </p>

              <p className="mt-1 font-semibold">
                {
                  verification.operator_status
                }
              </p>
            </div>

            <div className="rounded-xl bg-[#F1F5F4] p-4">
              <p className="text-xs font-medium text-[#64748B]">
                Stato verifica
              </p>

              <p className="mt-1 font-semibold">
                {
                  verification.verification_status
                }
              </p>
            </div>

            <div className="rounded-xl bg-[#F1F5F4] p-4">
              <p className="text-xs font-medium text-[#64748B]">
                Inviata
              </p>

              <p className="mt-1 font-semibold">
                {
                  submittedAt ??
                  "Non disponibile"
                }
              </p>
            </div>

          </div>

          {reviewedAt ? (
            <p className="mt-5 text-xs text-[#64748B]">
              Ultima revisione Boatly:{" "}
              {reviewedAt}
            </p>
          ) : null}

        </section>

        {verification.decision_note ? (
          <section className="mt-5 rounded-2xl border border-[#DEE5E8] bg-white p-6">

            <p className="text-sm font-semibold text-[#14B8A6]">
              Nota di Boatly
            </p>

            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#0B1F33]">
              {
                verification.decision_note
              }
            </p>

          </section>
        ) : null}

        {waiting ? (
          <section className="mt-5 rounded-2xl border border-[#DEE5E8] bg-white p-6">

            <h2 className="text-lg font-semibold">
              Non devi fare nulla per ora
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#64748B]">
              I dati inviati rimangono bloccati
              durante la revisione. Quando lo stato
              cambierà, questa pagina mostrerà
              l&apos;esito della verifica.
            </p>

          </section>
        ) : null}

        {needsChanges ? (
          <section className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-6">

            <h2 className="text-lg font-semibold">
              Correggi e reinvia
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#64748B]">
              Segui le indicazioni riportate nella
              nota di Boatly, aggiorna i dati
              interessati e poi invia nuovamente il
              workspace.
            </p>

            {canCorrect ? (
              <div className="mt-5 flex flex-wrap gap-3">

                <Link
                  href={`/operator/onboarding/legal?operator=${selectedOperator.id}`}
                  className="rounded-xl border border-[#DEE5E8] bg-white px-4 py-3 text-sm font-semibold"
                >
                  Dati aziendali
                </Link>

                <Link
                  href={`/operator/onboarding/location?operator=${selectedOperator.id}`}
                  className="rounded-xl border border-[#DEE5E8] bg-white px-4 py-3 text-sm font-semibold"
                >
                  Sede
                </Link>

                <Link
                  href={`/operator/onboarding/documents?operator=${selectedOperator.id}`}
                  className="rounded-xl border border-[#DEE5E8] bg-white px-4 py-3 text-sm font-semibold"
                >
                  Documenti
                </Link>

                <Link
                  href={`/operator/onboarding?operator=${selectedOperator.id}`}
                  className="rounded-xl bg-[#14B8A6] px-4 py-3 text-sm font-semibold text-white"
                >
                  Torna all&apos;onboarding
                </Link>

              </div>
            ) : (
              <div className="mt-5 rounded-xl bg-white p-4 text-sm leading-6 text-[#64748B]">
                La richiesta di modifica è stata
                registrata. Il workspace sarà
                modificabile quando il relativo
                stato operativo sarà riaperto da
                Boatly.
              </div>
            )}

          </section>
        ) : null}

        {approved ? (
          <section className="mt-5 rounded-2xl border border-[#14B8A6]/30 bg-[#14B8A6]/10 p-6">

            <h2 className="text-lg font-semibold">
              Verifica completata
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#64748B]">
              Il workspace ha superato la verifica
              iniziale Boatly. La configurazione
              operativa della flotta verrà gestita
              nelle fasi successive.
            </p>

          </section>
        ) : null}

        {rejected ? (
          <section className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-6">

            <h2 className="text-lg font-semibold">
              Richiesta non approvata
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#64748B]">
              Consulta la nota di Boatly sopra per
              conoscere la motivazione dell&apos;esito.
            </p>

          </section>
        ) : null}

      </div>
    </main>
  );
}