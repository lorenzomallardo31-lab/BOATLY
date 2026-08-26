import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { DocumentUploadForm } from "./document-upload-form";

type DocumentsPageProps = {
  searchParams: Promise<{
    operator?: string;
  }>;
};

type OperatorSummary = {
  id: string;
  name: string;
  status: string;
};

type DocumentTypeRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  requires_expiry_date: boolean;
};

type OperatorDocumentRow = {
  id: string;
  document_type_id: string;
  original_filename: string;
  mime_type: string;
  file_size_bytes: number;
  issued_at: string | null;
  expires_at: string | null;
  status: string;
  replaces_document_id: string | null;
  created_at: string;
};

function formatBytes(
  value: number,
) {
  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${(
      value / 1024
    ).toFixed(1)} KB`;
  }

  return `${(
    value /
    (1024 * 1024)
  ).toFixed(1)} MB`;
}

function statusLabel(
  status: string,
) {
  switch (status) {
    case "UPLOADED":
      return "Caricato";

    case "IN_REVIEW":
      return "In revisione";

    case "APPROVED":
      return "Approvato";

    case "REJECTED":
      return "Da sostituire";

    default:
      return status;
  }
}

export default async function DocumentsPage({
  searchParams,
}: DocumentsPageProps) {
  const params =
    await searchParams;

  const supabase =
    await createClient();


  const {
    data: claimsData,
    error: claimsError,
  } = await supabase.auth.getClaims();


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
    .select("id, name, status")
    .in("id", operatorIds);


  if (operatorsError) {
    throw new Error(
      "Unable to load operator workspaces.",
    );
  }


  const operators =
    (operatorRows ?? []) as OperatorSummary[];


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


  if (
    !selectedOperator ||
    selectedOperator.status !==
      "DRAFT"
  ) {
    redirect(
      "/operator/onboarding",
    );
  }


  const {
    data: legalProfile,
    error: legalError,
  } = await supabase
    .from(
      "operator_legal_profiles",
    )
    .select("operator_id")
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
    .select("id")
    .eq(
      "operator_id",
      selectedOperator.id,
    )
    .eq("is_primary", true)
    .eq("is_active", true)
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
    .select(`
      id,
      code,
      name,
      description,
      requires_expiry_date
    `)
    .eq(
      "subject_type",
      "OPERATOR",
    )
    .eq("is_active", true)
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
      "Unable to load operator document types.",
    );
  }


  const documentTypes =
    (documentTypeRows ??
      []) as DocumentTypeRow[];


  if (documentTypes.length !== 2) {
    throw new Error(
      "Operator onboarding document configuration is incomplete.",
    );
  }


  const {
    data: documentRows,
    error: documentsError,
  } = await supabase
    .from("operator_documents")
    .select(`
      id,
      document_type_id,
      original_filename,
      mime_type,
      file_size_bytes,
      issued_at,
      expires_at,
      status,
      replaces_document_id,
      created_at
    `)
    .eq(
      "operator_id",
      selectedOperator.id,
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
      []) as OperatorDocumentRow[];


  const latestDocumentByType =
    new Map<
      string,
      OperatorDocumentRow
    >();


  for (const document of documents) {
    if (
      !latestDocumentByType.has(
        document.document_type_id,
      )
    ) {
      latestDocumentByType.set(
        document.document_type_id,
        document,
      );
    }
  }


  const documentsComplete =
    documentTypes.every(
      (documentType) =>
        latestDocumentByType.has(
          documentType.id,
        ),
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
            Onboarding operatore · Passaggio 4 di 5
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Documenti
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#64748B]">
            Carica i documenti utilizzati da Boatly
            per verificare{" "}
            <strong className="text-[#0B1F33]">
              {selectedOperator.name}
            </strong>
            . I file sono conservati in uno spazio
            privato e non sono pubblici sul marketplace.
          </p>
        </div>


        <div className="mt-6 rounded-xl bg-[#F1F5F4] p-4 text-sm leading-6 text-[#64748B]">
          I documenti caricati in questa fase sono
          requisiti del processo di verifica Boatly.
          I requisiti nautici delle singole
          imbarcazioni saranno gestiti separatamente.
        </div>


        <section className="mt-8 space-y-5">
          {documentTypes.map(
            (documentType) => {
              const currentDocument =
                latestDocumentByType.get(
                  documentType.id,
                ) ?? null;

              return (
                <article
                  key={
                    documentType.id
                  }
                  className="rounded-2xl border border-[#DEE5E8] bg-white p-6 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#14B8A6]">
                        Documento richiesto
                      </p>

                      <h2 className="mt-2 text-xl font-semibold">
                        {
                          documentType.name
                        }
                      </h2>

                      {documentType.description ? (
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#64748B]">
                          {
                            documentType.description
                          }
                        </p>
                      ) : null}
                    </div>


                    <div
                      className={
                        currentDocument
                          ? "rounded-full bg-[#14B8A6]/10 px-3 py-2 text-xs font-semibold text-[#0B1F33]"
                          : "rounded-full bg-[#F1F5F4] px-3 py-2 text-xs font-medium text-[#64748B]"
                      }
                    >
                      {currentDocument
                        ? statusLabel(
                            currentDocument.status,
                          )
                        : "Da caricare"}
                    </div>

                  </div>


                  {currentDocument ? (
                    <div className="mt-5 rounded-xl border border-[#DEE5E8] bg-[#FCFBF8] p-4">

                      <div className="flex flex-wrap items-center justify-between gap-3">

                        <div>
                          <p className="text-sm font-semibold">
                            {
                              currentDocument.original_filename
                            }
                          </p>

                          <p className="mt-1 text-xs text-[#64748B]">
                            {formatBytes(
                              currentDocument.file_size_bytes,
                            )}
                            {" · "}
                            {
                              currentDocument.mime_type
                            }
                          </p>

                          {currentDocument.expires_at ? (
                            <p className="mt-1 text-xs text-[#64748B]">
                              Scadenza:{" "}
                              {
                                currentDocument.expires_at
                              }
                            </p>
                          ) : null}
                        </div>


                        <Link
                          href={`/operator/onboarding/documents/${currentDocument.id}/open`}
                          target="_blank"
                          className="rounded-xl border border-[#DEE5E8] bg-white px-4 py-2 text-sm font-semibold hover:bg-[#F1F5F4]"
                        >
                          Apri documento
                        </Link>

                      </div>
                    </div>
                  ) : null}


                  <DocumentUploadForm
                    operatorId={
                      selectedOperator.id
                    }
                    documentTypeId={
                      documentType.id
                    }
                    documentTypeName={
                      documentType.name
                    }
                    requiresExpiryDate={
                      documentType.requires_expiry_date
                    }
                    replacesDocumentId={
                      currentDocument?.id ??
                      null
                    }
                  />

                </article>
              );
            },
          )}
        </section>


        {documentsComplete ? (
          <section className="mt-6 rounded-2xl border border-[#14B8A6]/30 bg-[#14B8A6]/10 p-6">

            <p className="text-sm font-semibold text-[#14B8A6]">
              Passaggio 4 completato
            </p>

            <h2 className="mt-2 text-xl font-semibold">
              Documenti caricati
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#64748B]">
              Hai caricato tutti i documenti richiesti
              per questa fase. Nel prossimo passaggio
              controlleremo i dati prima dell&apos;invio
              della richiesta di verifica.
            </p>

            <Link
              href={`/operator/onboarding?operator=${selectedOperator.id}`}
              className="mt-5 inline-flex rounded-xl bg-[#14B8A6] px-5 py-3 text-sm font-semibold text-white"
            >
              Torna all&apos;onboarding
            </Link>

          </section>
        ) : null}

      </div>
    </main>
  );
}