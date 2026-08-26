import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { createOperatorWorkspace } from "./actions";

type OperatorOnboardingPageProps = {
  searchParams: Promise<{
    operator?: string;
    created?: string;
    legalSaved?: string;
    locationSaved?: string;
    submitted?: string;
    error?: string;
  }>;
};

type OperatorSummary = {
  id: string;
  name: string;
  status: string;
};

type LegalProfileSummary = {
  legal_name: string | null;
  legal_form: string | null;
  vat_number: string | null;
  tax_code: string | null;
  registered_address_line_1: string | null;
  registered_city: string | null;
  registered_administrative_area: string | null;
  registered_postal_code: string | null;
  registered_country_code: string;
  legal_representative_first_name: string | null;
  legal_representative_last_name: string | null;
};

type OperatorLocationSummary = {
  id: string;
  name: string;
  address_line_1: string | null;
  city: string | null;
  administrative_area: string | null;
  postal_code: string | null;
  country_code: string;
  timezone: string;
  is_primary: boolean;
  is_public: boolean;
  is_active: boolean;
};

type VerificationStatusRow = {
  verification_id: string | null;
  verification_status: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  decision_note: string | null;
  operator_status: string;
};

function getErrorMessage(
  error?: string,
) {
  switch (error) {
    case "invalid-name":
      return "Inserisci un nome valido per la tua attività.";

    case "bootstrap-failed":
      return "Non è stato possibile creare il workspace operatore. Riprova.";

    default:
      return null;
  }
}

function isLegalProfileComplete(
  profile: LegalProfileSummary | null,
) {
  if (!profile) {
    return false;
  }

  return Boolean(
    profile.legal_name?.trim() &&
      profile.legal_form?.trim() &&
      profile.vat_number?.trim() &&
      profile.tax_code?.trim() &&
      profile.registered_address_line_1?.trim() &&
      profile.registered_city?.trim() &&
      profile.registered_administrative_area?.trim() &&
      profile.registered_postal_code?.trim() &&
      profile.registered_country_code === "IT" &&
      profile.legal_representative_first_name?.trim() &&
      profile.legal_representative_last_name?.trim(),
  );
}

function isLocationComplete(
  location: OperatorLocationSummary | null,
) {
  if (!location) {
    return false;
  }

  return Boolean(
    location.name?.trim() &&
      location.address_line_1?.trim() &&
      location.city?.trim() &&
      location.administrative_area?.trim() &&
      location.postal_code?.trim() &&
      location.country_code === "IT" &&
      location.timezone === "Europe/Rome" &&
      location.is_primary &&
      location.is_public &&
      location.is_active,
  );
}

function verificationStepLabel(
  status: string | null,
) {
  switch (status) {
    case "PENDING":
      return "Inviato";

    case "IN_REVIEW":
      return "In revisione";

    case "NEEDS_CHANGES":
      return "Modifiche richieste";

    case "APPROVED":
      return "Approvato";

    case "REJECTED":
      return "Respinto";

    default:
      return "Da completare";
  }
}

export default async function OperatorOnboardingPage({
  searchParams,
}: OperatorOnboardingPageProps) {
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

  let operators:
    OperatorSummary[] = [];

  if (
    operatorIds.length > 0
  ) {
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

    operators =
      (operatorRows ??
        []) as OperatorSummary[];
  }

  const requestedOperator =
    params.operator
      ? operators.find(
          (operator) =>
            operator.id ===
            params.operator,
        )
      : undefined;

  const selectedOperator =
    requestedOperator ||
    operators.find(
      (operator) =>
        operator.status === "DRAFT",
    ) ||
    operators.find(
      (operator) =>
        operator.status ===
        "PENDING_VERIFICATION",
    ) ||
    operators.find(
      (operator) =>
        operator.status === "ACTIVE",
    ) ||
    operators.find(
      (operator) =>
        operator.status ===
        "REJECTED",
    ) ||
    operators[0] ||
    null;

  const errorMessage =
    getErrorMessage(
      params.error,
    );

  if (!selectedOperator) {
    return (
      <main className="min-h-screen bg-[#FCFBF8] px-4 py-10 text-[#0B1F33] sm:py-14">

        <div className="mx-auto w-full max-w-3xl">

          <div className="flex items-center justify-between gap-4">

            <Link
              href="/"
              className="text-2xl font-bold tracking-tight"
            >
              Boatly
            </Link>

            <Link
              href="/account"
              className="text-sm font-medium text-[#64748B]"
            >
              Torna al tuo account
            </Link>

          </div>

          <div className="mt-12 grid gap-8 lg:grid-cols-[1fr_0.8fr]">

            <section>

              <p className="text-sm font-semibold text-[#14B8A6]">
                Boatly per operatori
              </p>

              <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
                Porta la tua flotta su Boatly.
              </h1>

              <p className="mt-5 text-base leading-7 text-[#64748B]">
                Crea il workspace della tua attività
                e completa il processo di onboarding.
              </p>

            </section>

            <section className="rounded-2xl border border-[#DEE5E8] bg-white p-6 shadow-sm sm:p-8">

              <h2 className="text-2xl font-semibold">
                Crea il workspace
              </h2>

              {errorMessage ? (
                <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                  {errorMessage}
                </div>
              ) : null}

              <form
                action={
                  createOperatorWorkspace
                }
                className="mt-6 space-y-5"
              >

                <input
                  name="name"
                  type="text"
                  required
                  maxLength={120}
                  placeholder="Nome attività"
                  className="w-full rounded-xl border border-[#DEE5E8] px-4 py-3"
                />

                <button
                  type="submit"
                  className="w-full rounded-xl bg-[#14B8A6] px-4 py-3 font-semibold text-white"
                >
                  Crea workspace operatore
                </button>

              </form>

            </section>

          </div>

        </div>

      </main>
    );
  }

  const {
    data: legalProfileRow,
    error: legalProfileError,
  } = await supabase
    .from(
      "operator_legal_profiles",
    )
    .select(`
      legal_name,
      legal_form,
      vat_number,
      tax_code,
      registered_address_line_1,
      registered_city,
      registered_administrative_area,
      registered_postal_code,
      registered_country_code,
      legal_representative_first_name,
      legal_representative_last_name
    `)
    .eq(
      "operator_id",
      selectedOperator.id,
    )
    .maybeSingle();

  if (legalProfileError) {
    throw new Error(
      "Unable to load operator legal profile.",
    );
  }

  const legalProfile =
    legalProfileRow as
      LegalProfileSummary | null;

  const legalComplete =
    isLegalProfileComplete(
      legalProfile,
    );

  const {
    data: locationRow,
    error: locationError,
  } = await supabase
    .from("operator_locations")
    .select(`
      id,
      name,
      address_line_1,
      city,
      administrative_area,
      postal_code,
      country_code,
      timezone,
      is_primary,
      is_public,
      is_active
    `)
    .eq(
      "operator_id",
      selectedOperator.id,
    )
    .eq(
      "is_primary",
      true,
    )
    .maybeSingle();

  if (locationError) {
    throw new Error(
      "Unable to load operator primary location.",
    );
  }

  const primaryLocation =
    locationRow as
      OperatorLocationSummary | null;

  const locationComplete =
    legalComplete &&
    isLocationComplete(
      primaryLocation,
    );

  const {
    data: requiredDocumentTypes,
    error: requiredDocumentTypesError,
  } = await supabase
    .from("document_types")
    .select("id")
    .eq(
      "subject_type",
      "OPERATOR",
    )
    .eq(
      "is_active",
      true,
    )
    .in(
      "code",
      [
        "COMPANY_REGISTRY_EXTRACT",
        "LEGAL_REPRESENTATIVE_ID",
      ],
    );

  if (
    requiredDocumentTypesError
  ) {
    throw new Error(
      "Unable to load required onboarding documents.",
    );
  }

  const requiredDocumentTypeIds =
    (requiredDocumentTypes ??
      []).map(
        (documentType) =>
          documentType.id,
      );

  const {
    data: uploadedDocuments,
    error: uploadedDocumentsError,
  } =
    requiredDocumentTypeIds.length ===
    2
      ? await supabase
          .from(
            "operator_documents",
          )
          .select(
            "document_type_id",
          )
          .eq(
            "operator_id",
            selectedOperator.id,
          )
          .in(
            "document_type_id",
            requiredDocumentTypeIds,
          )
      : {
          data: [],
          error: null,
        };

  if (
    uploadedDocumentsError
  ) {
    throw new Error(
      "Unable to load onboarding documents.",
    );
  }

  const uploadedDocumentTypeIds =
    new Set(
      (uploadedDocuments ??
        []).map(
        (document) =>
          document.document_type_id,
      ),
    );

  const documentsComplete =
    locationComplete &&
    requiredDocumentTypeIds.length ===
      2 &&
    requiredDocumentTypeIds.every(
      (documentTypeId) =>
        uploadedDocumentTypeIds.has(
          documentTypeId,
        ),
    );

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

  const verificationStatus =
    verification?.verification_status ??
    null;

  const needsChanges =
    verificationStatus ===
    "NEEDS_CHANGES";

  const verificationSubmitted =
    verificationStatus ===
      "PENDING" ||
    verificationStatus ===
      "IN_REVIEW" ||
    verificationStatus ===
      "APPROVED" ||
    verificationStatus ===
      "REJECTED";

  const completedSteps =
    verificationSubmitted
      ? 5
      : documentsComplete
        ? 4
        : locationComplete
          ? 3
          : legalComplete
            ? 2
            : 1;

  const steps = [
    {
      number: "01",
      title:
        "Workspace operatore",
      status:
        "Completato",
      completed:
        true,
    },

    {
      number: "02",
      title:
        "Dati aziendali e legali",
      status:
        legalComplete
          ? "Completato"
          : "Da completare",
      completed:
        legalComplete,
    },

    {
      number: "03",
      title:
        "Prima sede operativa",
      status:
        locationComplete
          ? "Completato"
          : "Da completare",
      completed:
        locationComplete,
    },

    {
      number: "04",
      title:
        "Documenti",
      status:
        documentsComplete
          ? "Completato"
          : "Da completare",
      completed:
        documentsComplete,
    },

    {
      number: "05",
      title:
        "Invio a Boatly",
      status:
        verificationStepLabel(
          verificationStatus,
        ),
      completed:
        verificationSubmitted,
    },
  ];

  return (
    <main className="min-h-screen bg-[#FCFBF8] px-4 py-8 text-[#0B1F33] sm:px-6 sm:py-10">

      <div className="mx-auto max-w-5xl">

        <header className="flex items-center justify-between gap-4">

          <Link
            href="/"
            className="text-2xl font-bold"
          >
            Boatly
          </Link>

          <Link
            href="/account"
            className="text-sm text-[#64748B]"
          >
            Il tuo account
          </Link>

        </header>

        {params.submitted ===
        "1" ? (
          <div className="mt-8 rounded-xl border border-[#14B8A6]/30 bg-[#14B8A6]/10 p-4 text-sm">
            <strong>
              Richiesta inviata.
            </strong>{" "}
            Boatly prenderà in carico
            la verifica del tuo workspace.
          </div>
        ) : null}

        <section className="mt-8 rounded-2xl border border-[#DEE5E8] bg-white p-6 shadow-sm sm:p-8">

          <div className="flex flex-wrap items-start justify-between gap-5">

            <div>

              <p className="text-sm font-semibold text-[#14B8A6]">
                Onboarding operatore
              </p>

              <h1 className="mt-2 text-3xl font-semibold">
                {
                  selectedOperator.name
                }
              </h1>

            </div>

            <div className="rounded-full bg-[#F1F5F4] px-4 py-2 text-xs font-semibold">
              {
                selectedOperator.status
              }
            </div>

          </div>

          <div className="mt-8">

            <div className="flex justify-between text-sm">

              <span>
                Avanzamento onboarding
              </span>

              <span className="text-[#64748B]">
                {completedSteps} di 5
              </span>

            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#F1F5F4]">

              <div
                className="h-full rounded-full bg-[#14B8A6]"
                style={{
                  width:
                    `${completedSteps * 20}%`,
                }}
              />

            </div>

          </div>

        </section>

        <section className="mt-6 space-y-3">

          {steps.map(
            (step) => (
              <div
                key={
                  step.number
                }
                className="flex items-center gap-4 rounded-2xl border border-[#DEE5E8] bg-white p-5"
              >

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F1F5F4] font-semibold">

                  {step.completed
                    ? "✓"
                    : step.number}

                </div>

                <div className="flex-1">

                  <div className="flex justify-between gap-4">

                    <h2 className="font-semibold">
                      {
                        step.title
                      }
                    </h2>

                    <span
                      className={
                        step.completed
                          ? "text-xs font-semibold text-[#14B8A6]"
                          : needsChanges &&
                              step.number ===
                                "05"
                            ? "text-xs font-semibold text-amber-700"
                            : "text-xs text-[#64748B]"
                      }
                    >
                      {
                        step.status
                      }
                    </span>

                  </div>

                </div>

              </div>
            ),
          )}

        </section>

        {!legalComplete ? (

          <section className="mt-6 rounded-2xl border border-[#DEE5E8] bg-white p-6">

            <h2 className="text-xl font-semibold">
              Dati aziendali e legali
            </h2>

            <Link
              href={`/operator/onboarding/legal?operator=${selectedOperator.id}`}
              className="mt-5 inline-flex rounded-xl bg-[#14B8A6] px-5 py-3 text-sm font-semibold text-white"
            >
              Continua
            </Link>

          </section>

        ) : !locationComplete ? (

          <section className="mt-6 rounded-2xl border border-[#DEE5E8] bg-white p-6">

            <h2 className="text-xl font-semibold">
              Prima sede operativa
            </h2>

            <Link
              href={`/operator/onboarding/location?operator=${selectedOperator.id}`}
              className="mt-5 inline-flex rounded-xl bg-[#14B8A6] px-5 py-3 text-sm font-semibold text-white"
            >
              Continua
            </Link>

          </section>

        ) : !documentsComplete ? (

          <section className="mt-6 rounded-2xl border border-[#DEE5E8] bg-white p-6">

            <h2 className="text-xl font-semibold">
              Documenti
            </h2>

            <Link
              href={`/operator/onboarding/documents?operator=${selectedOperator.id}`}
              className="mt-5 inline-flex rounded-xl bg-[#14B8A6] px-5 py-3 text-sm font-semibold text-white"
            >
              Continua con i documenti
            </Link>

          </section>

        ) : needsChanges ? (

          <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-6">

            <p className="text-sm font-semibold text-amber-700">
              Modifiche richieste
            </p>

            <h2 className="mt-2 text-xl font-semibold">
              Boatly richiede alcune correzioni
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#64748B]">
              Consulta lo stato della verifica per
              leggere la nota del team e sapere cosa
              correggere prima del nuovo invio.
            </p>

            <Link
              href={`/operator/onboarding/status?operator=${selectedOperator.id}`}
              className="mt-5 inline-flex rounded-xl bg-[#14B8A6] px-5 py-3 text-sm font-semibold text-white"
            >
              Vedi modifiche richieste
            </Link>

          </section>

        ) : verification?.verification_id ? (

          <section className="mt-6 rounded-2xl border border-[#14B8A6]/30 bg-[#14B8A6]/10 p-6">

            <p className="text-sm font-semibold text-[#14B8A6]">
              Stato verifica
            </p>

            <h2 className="mt-2 text-xl font-semibold">
              {
                verificationStepLabel(
                  verificationStatus,
                )
              }
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#64748B]">
              Consulta la pagina di stato per
              seguire l&apos;avanzamento della
              verifica Boatly.
            </p>

            <Link
              href={`/operator/onboarding/status?operator=${selectedOperator.id}`}
              className="mt-5 inline-flex rounded-xl bg-[#14B8A6] px-5 py-3 text-sm font-semibold text-white"
            >
              Vedi stato verifica
            </Link>

          </section>

        ) : selectedOperator.status ===
          "DRAFT" ? (

          <section className="mt-6 rounded-2xl border border-[#DEE5E8] bg-white p-6">

            <p className="text-sm font-semibold text-[#14B8A6]">
              Ultimo passaggio
            </p>

            <h2 className="mt-2 text-xl font-semibold">
              Invia a Boatly
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#64748B]">
              Tutti i dati necessari sono presenti.
              Controlla il riepilogo finale e invia
              il workspace alla verifica.
            </p>

            <Link
              href={`/operator/onboarding/submit?operator=${selectedOperator.id}`}
              className="mt-5 inline-flex rounded-xl bg-[#14B8A6] px-5 py-3 text-sm font-semibold text-white"
            >
              Controlla e invia
            </Link>

          </section>

        ) : (

          <section className="mt-6 rounded-2xl border border-[#DEE5E8] bg-white p-6">

            <h2 className="text-xl font-semibold">
              Stato workspace
            </h2>

            <p className="mt-2 text-sm text-[#64748B]">
              Stato attuale:{" "}
              <strong>
                {
                  selectedOperator.status
                }
              </strong>
            </p>

          </section>

        )}

      </div>

    </main>
  );
}