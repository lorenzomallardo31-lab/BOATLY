import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { submitVerification } from "./actions";

type SubmitPageProps = {
  searchParams: Promise<{
    operator?: string;
    error?: string;
  }>;
};

type OperatorSummary = {
  id: string;
  name: string;
  status: string;
};

type DocumentTypeRow = {
  id: string;
  name: string;
  code: string;
};

type DocumentRow = {
  id: string;
  document_type_id: string;
  original_filename: string;
  status: string;
  expires_at: string | null;
  created_at: string;
};

function errorMessage(
  error?: string,
) {
  switch (error) {
    case "legal-incomplete":
      return "I dati aziendali e legali non risultano completi.";

    case "location-incomplete":
      return "La sede operativa principale non risulta completa.";

    case "documents-incomplete":
      return "Uno o più documenti richiesti sono mancanti, scaduti o non validi per l'invio.";

    case "already-submitted":
      return "La richiesta di verifica risulta già inviata.";

    case "not-allowed":
      return "Non hai i permessi necessari per inviare questa richiesta.";

    case "submit-failed":
      return "Non è stato possibile inviare la richiesta. Riprova.";

    default:
      return null;
  }
}

export default async function SubmitPage({
  searchParams,
}: SubmitPageProps) {
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

  if (operatorIds.length === 0) {
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
      : operators.find(
          (operator) =>
            operator.status ===
            "DRAFT",
        );

  if (!selectedOperator) {
    redirect(
      "/operator/onboarding",
    );
  }

  if (
    selectedOperator.status ===
    "PENDING_VERIFICATION"
  ) {
    redirect(
      `/operator/onboarding?operator=${selectedOperator.id}`,
    );
  }

  if (
    selectedOperator.status !==
    "DRAFT"
  ) {
    redirect(
      `/operator/onboarding?operator=${selectedOperator.id}`,
    );
  }

  const {
    data: legalProfile,
    error: legalError,
  } = await supabase
    .from(
      "operator_legal_profiles",
    )
    .select(
      "legal_name, vat_number, registered_city",
    )
    .eq(
      "operator_id",
      selectedOperator.id,
    )
    .maybeSingle();

  if (
    legalError ||
    !legalProfile
  ) {
    redirect(
      `/operator/onboarding/legal?operator=${selectedOperator.id}`,
    );
  }

  const {
    data: primaryLocation,
    error: locationError,
  } = await supabase
    .from("operator_locations")
    .select(
      "id, name, city, administrative_area, postal_code",
    )
    .eq(
      "operator_id",
      selectedOperator.id,
    )
    .eq(
      "is_primary",
      true,
    )
    .eq(
      "is_active",
      true,
    )
    .maybeSingle();

  if (
    locationError ||
    !primaryLocation
  ) {
    redirect(
      `/operator/onboarding/location?operator=${selectedOperator.id}`,
    );
  }

  const {
    data: documentTypeRows,
    error: documentTypesError,
  } = await supabase
    .from("document_types")
    .select(
      "id, name, code",
    )
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
    )
    .order(
      "sort_order",
      {
        ascending: true,
      },
    );

  if (documentTypesError) {
    throw new Error(
      "Unable to load document types.",
    );
  }

  const documentTypes =
    (documentTypeRows ??
      []) as DocumentTypeRow[];

  if (
    documentTypes.length !== 2
  ) {
    throw new Error(
      "Operator document configuration is incomplete.",
    );
  }

  const documentTypeIds =
    documentTypes.map(
      (documentType) =>
        documentType.id,
    );

  const {
    data: documentRows,
    error: documentsError,
  } = await supabase
    .from("operator_documents")
    .select(`
      id,
      document_type_id,
      original_filename,
      status,
      expires_at,
      created_at
    `)
    .eq(
      "operator_id",
      selectedOperator.id,
    )
    .in(
      "document_type_id",
      documentTypeIds,
    )
    .order(
      "created_at",
      {
        ascending: false,
      },
    );

  if (documentsError) {
    throw new Error(
      "Unable to load operator documents.",
    );
  }

  const documents =
    (documentRows ??
      []) as DocumentRow[];

  const latestByType =
    new Map<
      string,
      DocumentRow
    >();

  for (
    const document of documents
  ) {
    if (
      !latestByType.has(
        document.document_type_id,
      )
    ) {
      latestByType.set(
        document.document_type_id,
        document,
      );
    }
  }

  const error =
    errorMessage(
      params.error,
    );

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

        <div className="mt-10">
          <p className="text-sm font-semibold text-[#14B8A6]">
            Onboarding operatore · Passaggio 5 di 5
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Invia a Boatly
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#64748B]">
            Controlla il riepilogo prima di inviare
            il workspace alla verifica Boatly.
          </p>
        </div>

        {error ? (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        ) : null}

        <section className="mt-8 rounded-2xl border border-[#DEE5E8] bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-[#14B8A6]">
            Attività
          </p>

          <h2 className="mt-2 text-xl font-semibold">
            {selectedOperator.name}
          </h2>

          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-[#64748B]">
                Ragione sociale
              </dt>

              <dd className="mt-1 text-sm font-medium">
                {legalProfile.legal_name}
              </dd>
            </div>

            <div>
              <dt className="text-xs text-[#64748B]">
                Partita IVA
              </dt>

              <dd className="mt-1 text-sm font-medium">
                {legalProfile.vat_number}
              </dd>
            </div>
          </dl>
        </section>

        <section className="mt-5 rounded-2xl border border-[#DEE5E8] bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-[#14B8A6]">
            Sede principale
          </p>

          <h2 className="mt-2 text-xl font-semibold">
            {primaryLocation.name}
          </h2>

          <p className="mt-2 text-sm text-[#64748B]">
            {primaryLocation.city}
            {" · "}
            {primaryLocation.administrative_area}
            {" · "}
            {primaryLocation.postal_code}
          </p>
        </section>

        <section className="mt-5 rounded-2xl border border-[#DEE5E8] bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-[#14B8A6]">
            Documenti
          </p>

          <div className="mt-5 space-y-3">
            {documentTypes.map(
              (documentType) => {
                const document =
                  latestByType.get(
                    documentType.id,
                  );

                return (
                  <div
                    key={
                      documentType.id
                    }
                    className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-[#F1F5F4] p-4"
                  >
                    <div>
                      <p className="text-sm font-semibold">
                        {
                          documentType.name
                        }
                      </p>

                      <p className="mt-1 text-xs text-[#64748B]">
                        {document
                          ? document.original_filename
                          : "Documento mancante"}
                      </p>
                    </div>

                    <span className="text-xs font-semibold text-[#14B8A6]">
                      {document
                        ? document.status
                        : "MANCANTE"}
                    </span>
                  </div>
                );
              },
            )}
          </div>
        </section>

        <section className="mt-5 rounded-2xl border border-[#14B8A6]/30 bg-[#14B8A6]/10 p-6">
          <h2 className="font-semibold">
            Cosa succede dopo l&apos;invio?
          </h2>

          <p className="mt-2 text-sm leading-6 text-[#64748B]">
            Boatly creerà una fotografia dei dati
            inviati e la richiesta entrerà in coda
            per la verifica. Durante la revisione
            i dati dell&apos;onboarding non saranno
            modificabili.
          </p>
        </section>

        <form
          action={
            submitVerification
          }
          className="mt-6"
        >
          <input
            type="hidden"
            name="operator_id"
            value={
              selectedOperator.id
            }
          />

          <button
            type="submit"
            className="w-full rounded-xl bg-[#14B8A6] px-6 py-4 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Invia richiesta di verifica
          </button>
        </form>

      </div>
    </main>
  );
}