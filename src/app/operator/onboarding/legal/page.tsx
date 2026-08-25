import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { saveLegalProfile } from "./actions";

type LegalPageProps = {
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

type LegalProfile = {
  legal_name: string | null;
  legal_form: string | null;
  vat_number: string | null;
  tax_code: string | null;
  business_register_number: string | null;
  rea_number: string | null;
  pec_email: string | null;
  sdi_code: string | null;
  registered_address_line_1: string | null;
  registered_address_line_2: string | null;
  registered_city: string | null;
  registered_administrative_area: string | null;
  registered_postal_code: string | null;
  registered_country_code: string;
  legal_representative_first_name: string | null;
  legal_representative_last_name: string | null;
};

function getErrorMessage(
  error?: string,
) {
  switch (error) {
    case "invalid-company-data":
      return "Controlla denominazione e forma giuridica.";

    case "invalid-vat":
      return "Per l'onboarding italiano inserisci una Partita IVA di 11 cifre.";

    case "invalid-tax-code":
      return "Inserisci un codice fiscale valido nel formato previsto.";

    case "invalid-address":
      return "Completa correttamente l'indirizzo della sede legale.";

    case "invalid-representative":
      return "Inserisci nome e cognome del rappresentante legale.";

    case "invalid-pec":
      return "Controlla l'indirizzo PEC inserito.";

    case "invalid-sdi":
      return "Il codice destinatario SDI deve contenere 6 o 7 caratteri alfanumerici.";

    case "save-failed":
      return "Non è stato possibile salvare i dati. Riprova.";

    default:
      return null;
  }
}

export default async function LegalPage({
  searchParams,
}: LegalPageProps) {
  const params = await searchParams;

  const supabase = await createClient();

  const {
    data: claimsData,
    error: claimsError,
  } = await supabase.auth.getClaims();

  if (
    claimsError ||
    !claimsData?.claims ||
    typeof claimsData.claims.sub !== "string"
  ) {
    redirect(
      "/sign-in?next=/operator/onboarding",
    );
  }

  const userId = claimsData.claims.sub;


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


  const operatorIds = Array.from(
    new Set(
      (memberships ?? []).map(
        (membership) =>
          membership.operator_id,
      ),
    ),
  );


  if (operatorIds.length === 0) {
    redirect("/operator/onboarding");
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
            operator.id === params.operator,
        )
      : operators.find(
          (operator) =>
            operator.status === "DRAFT",
        );


  if (
    !selectedOperator ||
    selectedOperator.status !== "DRAFT"
  ) {
    redirect("/operator/onboarding");
  }


  const {
    data: legalProfile,
    error: legalProfileError,
  } = await supabase
    .from("operator_legal_profiles")
    .select(`
      legal_name,
      legal_form,
      vat_number,
      tax_code,
      business_register_number,
      rea_number,
      pec_email,
      sdi_code,
      registered_address_line_1,
      registered_address_line_2,
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


  const profile =
    legalProfile as LegalProfile | null;

  const errorMessage =
    getErrorMessage(params.error);


  const inputClassName =
    "w-full rounded-xl border border-[#DEE5E8] bg-white px-4 py-3 outline-none transition focus:border-[#14B8A6] focus:ring-2 focus:ring-[#14B8A6]/20";

  const labelClassName =
    "mb-2 block text-sm font-medium";


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
            Onboarding operatore · Passaggio 2 di 5
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Dati aziendali e legali
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#64748B]">
            Inserisci i dati dell&apos;impresa che gestisce{" "}
            <strong className="text-[#0B1F33]">
              {selectedOperator.name}
            </strong>
            . Queste informazioni saranno utilizzate nei
            successivi controlli di verifica Boatly.
          </p>
        </div>


        {errorMessage ? (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {errorMessage}
          </div>
        ) : null}


        <form
          action={saveLegalProfile}
          className="mt-8 space-y-6"
        >
          <input
            type="hidden"
            name="operator_id"
            value={selectedOperator.id}
          />


          <section className="rounded-2xl border border-[#DEE5E8] bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-[#14B8A6]">
              Impresa
            </p>

            <h2 className="mt-1 text-xl font-semibold">
              Informazioni aziendali
            </h2>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label
                  htmlFor="legal_name"
                  className={labelClassName}
                >
                  Denominazione / ragione sociale *
                </label>

                <input
                  id="legal_name"
                  name="legal_name"
                  type="text"
                  required
                  maxLength={200}
                  defaultValue={
                    profile?.legal_name ?? ""
                  }
                  placeholder="Es. Boatly Test Operator S.r.l."
                  className={inputClassName}
                />
              </div>


              <div>
                <label
                  htmlFor="legal_form"
                  className={labelClassName}
                >
                  Forma giuridica *
                </label>

                <input
                  id="legal_form"
                  name="legal_form"
                  type="text"
                  required
                  maxLength={100}
                  defaultValue={
                    profile?.legal_form ?? ""
                  }
                  placeholder="Es. S.r.l."
                  className={inputClassName}
                />
              </div>


              <div>
                <label
                  htmlFor="vat_number"
                  className={labelClassName}
                >
                  Partita IVA *
                </label>

                <input
                  id="vat_number"
                  name="vat_number"
                  type="text"
                  inputMode="numeric"
                  required
                  maxLength={11}
                  defaultValue={
                    profile?.vat_number ?? ""
                  }
                  placeholder="11 cifre"
                  className={inputClassName}
                />
              </div>


              <div>
                <label
                  htmlFor="tax_code"
                  className={labelClassName}
                >
                  Codice fiscale *
                </label>

                <input
                  id="tax_code"
                  name="tax_code"
                  type="text"
                  required
                  maxLength={16}
                  defaultValue={
                    profile?.tax_code ?? ""
                  }
                  placeholder="Codice fiscale impresa"
                  className={inputClassName}
                />
              </div>


              <div>
                <label
                  htmlFor="business_register_number"
                  className={labelClassName}
                >
                  Numero Registro Imprese
                </label>

                <input
                  id="business_register_number"
                  name="business_register_number"
                  type="text"
                  defaultValue={
                    profile?.business_register_number ??
                    ""
                  }
                  className={inputClassName}
                />
              </div>


              <div>
                <label
                  htmlFor="rea_number"
                  className={labelClassName}
                >
                  Numero REA
                </label>

                <input
                  id="rea_number"
                  name="rea_number"
                  type="text"
                  defaultValue={
                    profile?.rea_number ?? ""
                  }
                  placeholder="Es. NA-123456"
                  className={inputClassName}
                />
              </div>
            </div>
          </section>


          <section className="rounded-2xl border border-[#DEE5E8] bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-[#14B8A6]">
              Fatturazione elettronica
            </p>

            <h2 className="mt-1 text-xl font-semibold">
              PEC e codice destinatario
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#64748B]">
              Puoi inserirli già ora. Saranno comunque
              ricontrollati durante la verifica dell&apos;operatore.
            </p>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="pec_email"
                  className={labelClassName}
                >
                  PEC
                </label>

                <input
                  id="pec_email"
                  name="pec_email"
                  type="email"
                  defaultValue={
                    profile?.pec_email ?? ""
                  }
                  placeholder="azienda@pec.it"
                  className={inputClassName}
                />
              </div>


              <div>
                <label
                  htmlFor="sdi_code"
                  className={labelClassName}
                >
                  Codice destinatario SDI
                </label>

                <input
                  id="sdi_code"
                  name="sdi_code"
                  type="text"
                  maxLength={7}
                  defaultValue={
                    profile?.sdi_code ?? ""
                  }
                  placeholder="Es. ABC1234"
                  className={inputClassName}
                />
              </div>
            </div>
          </section>


          <section className="rounded-2xl border border-[#DEE5E8] bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-[#14B8A6]">
              Sede legale
            </p>

            <h2 className="mt-1 text-xl font-semibold">
              Indirizzo registrato
            </h2>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label
                  htmlFor="registered_address_line_1"
                  className={labelClassName}
                >
                  Indirizzo *
                </label>

                <input
                  id="registered_address_line_1"
                  name="registered_address_line_1"
                  type="text"
                  required
                  maxLength={200}
                  defaultValue={
                    profile?.registered_address_line_1 ??
                    ""
                  }
                  placeholder="Via/Piazza e numero civico"
                  className={inputClassName}
                />
              </div>


              <div className="sm:col-span-2">
                <label
                  htmlFor="registered_address_line_2"
                  className={labelClassName}
                >
                  Informazioni aggiuntive
                </label>

                <input
                  id="registered_address_line_2"
                  name="registered_address_line_2"
                  type="text"
                  defaultValue={
                    profile?.registered_address_line_2 ??
                    ""
                  }
                  placeholder="Scala, interno, edificio..."
                  className={inputClassName}
                />
              </div>


              <div>
                <label
                  htmlFor="registered_city"
                  className={labelClassName}
                >
                  Comune *
                </label>

                <input
                  id="registered_city"
                  name="registered_city"
                  type="text"
                  required
                  defaultValue={
                    profile?.registered_city ?? ""
                  }
                  placeholder="Napoli"
                  className={inputClassName}
                />
              </div>


              <div>
                <label
                  htmlFor="registered_administrative_area"
                  className={labelClassName}
                >
                  Provincia *
                </label>

                <input
                  id="registered_administrative_area"
                  name="registered_administrative_area"
                  type="text"
                  required
                  defaultValue={
                    profile?.registered_administrative_area ??
                    ""
                  }
                  placeholder="NA"
                  className={inputClassName}
                />
              </div>


              <div>
                <label
                  htmlFor="registered_postal_code"
                  className={labelClassName}
                >
                  CAP *
                </label>

                <input
                  id="registered_postal_code"
                  name="registered_postal_code"
                  type="text"
                  inputMode="numeric"
                  required
                  maxLength={5}
                  defaultValue={
                    profile?.registered_postal_code ??
                    ""
                  }
                  placeholder="80100"
                  className={inputClassName}
                />
              </div>


              <div>
                <label
                  htmlFor="registered_country_display"
                  className={labelClassName}
                >
                  Paese *
                </label>

                <input
                  id="registered_country_display"
                  type="text"
                  disabled
                  value="Italia"
                  className={`${inputClassName} bg-[#F1F5F4] text-[#64748B]`}
                />

                <input
                  type="hidden"
                  name="registered_country_code"
                  value="IT"
                />
              </div>
            </div>
          </section>


          <section className="rounded-2xl border border-[#DEE5E8] bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-[#14B8A6]">
              Rappresentante legale
            </p>

            <h2 className="mt-1 text-xl font-semibold">
              Persona autorizzata
            </h2>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="legal_representative_first_name"
                  className={labelClassName}
                >
                  Nome *
                </label>

                <input
                  id="legal_representative_first_name"
                  name="legal_representative_first_name"
                  type="text"
                  required
                  defaultValue={
                    profile?.legal_representative_first_name ??
                    ""
                  }
                  className={inputClassName}
                />
              </div>


              <div>
                <label
                  htmlFor="legal_representative_last_name"
                  className={labelClassName}
                >
                  Cognome *
                </label>

                <input
                  id="legal_representative_last_name"
                  name="legal_representative_last_name"
                  type="text"
                  required
                  defaultValue={
                    profile?.legal_representative_last_name ??
                    ""
                  }
                  className={inputClassName}
                />
              </div>
            </div>
          </section>


          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href={`/operator/onboarding?operator=${selectedOperator.id}`}
              className="rounded-xl border border-[#DEE5E8] bg-white px-5 py-3 text-center text-sm font-semibold hover:bg-[#F1F5F4]"
            >
              Annulla
            </Link>

            <button
              type="submit"
              className="rounded-xl bg-[#14B8A6] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Salva e continua
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}