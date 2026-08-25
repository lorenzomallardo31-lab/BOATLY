import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { createOperatorWorkspace } from "./actions";

type OperatorOnboardingPageProps = {
  searchParams: Promise<{
    operator?: string;
    created?: string;
    error?: string;
  }>;
};

type OperatorSummary = {
  id: string;
  name: string;
  status: string;
};

function getErrorMessage(error?: string) {
  switch (error) {
    case "invalid-name":
      return "Inserisci un nome valido per la tua attività.";

    case "bootstrap-failed":
      return "Non è stato possibile creare il workspace operatore. Riprova.";

    default:
      return null;
  }
}

export default async function OperatorOnboardingPage({
  searchParams,
}: OperatorOnboardingPageProps) {
  const params = await searchParams;

  const supabase = await createClient();

  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

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
        (membership) => membership.operator_id,
      ),
    ),
  );

  let operators: OperatorSummary[] = [];

  if (operatorIds.length > 0) {
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

    operators = (operatorRows ?? []) as OperatorSummary[];
  }

  const requestedOperator =
    params.operator &&
    operators.find(
      (operator) =>
        operator.id === params.operator,
    );

  const draftOperator =
    operators.find(
      (operator) =>
        operator.status === "DRAFT",
    );

  const selectedOperator =
    requestedOperator || draftOperator || null;

  const errorMessage =
    getErrorMessage(params.error);

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
              className="text-sm font-medium text-[#64748B] hover:text-[#0B1F33]"
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

              <p className="mt-5 max-w-xl text-base leading-7 text-[#64748B]">
                Crea il workspace della tua attività. Nei
                prossimi passaggi inseriremo dati aziendali,
                sede operativa, documenti e informazioni
                necessarie alla verifica Boatly.
              </p>

              <div className="mt-8 rounded-2xl bg-[#F1F5F4] p-5">
                <p className="font-semibold">
                  Tutta la tua flotta. Un solo posto.
                </p>

                <p className="mt-2 text-sm leading-6 text-[#64748B]">
                  Il workspace servirà anche per gestire
                  prenotazioni marketplace, prenotazioni
                  manuali, calendario, prezzi e team.
                </p>
              </div>
            </section>

            <section className="rounded-2xl border border-[#DEE5E8] bg-white p-6 shadow-sm sm:p-8">
              <p className="text-sm font-medium text-[#14B8A6]">
                Primo passaggio
              </p>

              <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                Crea il workspace
              </h2>

              <p className="mt-2 text-sm leading-6 text-[#64748B]">
                Inserisci il nome con cui identifichi la tua
                attività di noleggio.
              </p>

              {errorMessage ? (
                <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                  {errorMessage}
                </div>
              ) : null}

              <form
                action={createOperatorWorkspace}
                className="mt-8 space-y-5"
              >
                <div>
                  <label
                    htmlFor="name"
                    className="mb-2 block text-sm font-medium"
                  >
                    Nome attività
                  </label>

                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    maxLength={120}
                    autoComplete="organization"
                    placeholder="Es. Boatly Test Operator"
                    className="w-full rounded-xl border border-[#DEE5E8] bg-white px-4 py-3 outline-none transition focus:border-[#14B8A6] focus:ring-2 focus:ring-[#14B8A6]/20"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full rounded-xl bg-[#14B8A6] px-4 py-3 font-semibold text-white transition hover:opacity-90"
                >
                  Crea workspace operatore
                </button>
              </form>

              <p className="mt-5 text-xs leading-5 text-[#64748B]">
                La creazione del workspace non pubblica
                automaticamente la tua attività sul marketplace.
                Prima sarà necessaria la verifica Boatly.
              </p>
            </section>
          </div>
        </div>
      </main>
    );
  }

  const steps = [
    {
      number: "01",
      title: "Workspace operatore",
      description:
        "Il workspace e la tua membership OWNER sono stati creati.",
      status: "Completato",
      completed: true,
    },
    {
      number: "02",
      title: "Dati aziendali e legali",
      description:
        "Inseriremo le informazioni anagrafiche e fiscali dell'attività.",
      status: "Da completare",
      completed: false,
    },
    {
      number: "03",
      title: "Prima sede operativa",
      description:
        "Configureremo il primo punto di partenza della flotta.",
      status: "Da completare",
      completed: false,
    },
    {
      number: "04",
      title: "Documenti",
      description:
        "Caricheremo i documenti necessari alla verifica.",
      status: "Da completare",
      completed: false,
    },
    {
      number: "05",
      title: "Invio a Boatly",
      description:
        "Controlleremo i dati e invieremo la richiesta di verifica.",
      status: "Da completare",
      completed: false,
    },
  ];

  return (
    <main className="min-h-screen bg-[#FCFBF8] px-4 py-8 text-[#0B1F33] sm:px-6 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/"
            className="text-2xl font-bold tracking-tight"
          >
            Boatly
          </Link>

          <Link
            href="/account"
            className="text-sm font-medium text-[#64748B] hover:text-[#0B1F33]"
          >
            Il tuo account
          </Link>
        </header>

        {params.created === "1" ? (
          <div className="mt-8 rounded-xl border border-[#14B8A6]/30 bg-[#14B8A6]/10 p-4 text-sm">
            <strong>Workspace creato.</strong>{" "}
            Ora completiamo l&apos;onboarding della tua attività.
          </div>
        ) : null}

        <section className="mt-8 rounded-2xl border border-[#DEE5E8] bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="text-sm font-semibold text-[#14B8A6]">
                Onboarding operatore
              </p>

              <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                {selectedOperator.name}
              </h1>

              <p className="mt-2 text-sm text-[#64748B]">
                Completa i passaggi necessari prima di inviare
                l&apos;attività alla verifica Boatly.
              </p>
            </div>

            <div className="rounded-full bg-[#F1F5F4] px-4 py-2 text-xs font-semibold">
              {selectedOperator.status}
            </div>
          </div>

          <div className="mt-8">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">
                Avanzamento onboarding
              </span>

              <span className="text-[#64748B]">
                1 di 5
              </span>
            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#F1F5F4]">
              <div className="h-full w-1/5 rounded-full bg-[#14B8A6]" />
            </div>
          </div>
        </section>

        <section className="mt-6 space-y-3">
          {steps.map((step) => (
            <div
              key={step.number}
              className="flex gap-4 rounded-2xl border border-[#DEE5E8] bg-white p-5 sm:items-center"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F1F5F4] text-sm font-semibold">
                {step.completed ? "✓" : step.number}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-semibold">
                    {step.title}
                  </h2>

                  <span
                    className={
                      step.completed
                        ? "text-xs font-semibold text-[#14B8A6]"
                        : "text-xs font-medium text-[#64748B]"
                    }
                  >
                    {step.status}
                  </span>
                </div>

                <p className="mt-1 text-sm leading-6 text-[#64748B]">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </section>

        <section className="mt-6 rounded-2xl border border-[#DEE5E8] bg-white p-6">
          <p className="text-sm font-semibold">
            Prossimo passaggio
          </p>

          <h2 className="mt-2 text-xl font-semibold">
            Dati aziendali e legali
          </h2>

          <p className="mt-2 text-sm leading-6 text-[#64748B]">
            Nel prossimo checkpoint collegheremo questo step a
            <code className="mx-1 rounded bg-[#F1F5F4] px-1.5 py-0.5">
              operator_legal_profiles
            </code>
            con salvataggio server-side e ripresa automatica
            dell&apos;onboarding.
          </p>

          <button
            type="button"
            disabled
            className="mt-5 rounded-xl bg-[#DEE5E8] px-5 py-3 text-sm font-semibold text-[#64748B]"
          >
            Continua — disponibile in C7.3
          </button>
        </section>
      </div>
    </main>
  );
}