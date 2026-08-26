import Link from "next/link";

import { requireOperatorBoatContext } from "@/lib/operator/context";

import {
  createCalendarBlock,
  releaseCalendarBlock,
  saveWeeklyAvailability,
} from "./actions";

type PageProps = {
  params: Promise<{ boatId: string }>;
  searchParams: Promise<{
    operator?: string;
    saved?: string;
    error?: string;
  }>;
};

type Rule = {
  id: string;
  weekday: number;
  available_from: string;
  available_to: string;
  timezone: string;
  valid_from: string | null;
  valid_to: string | null;
  is_active: boolean;
};

type Occupancy = {
  id: string;
  occupancy_type: string;
  starts_at: string;
  ends_at: string;
  hold_expires_at: string | null;
  title: string | null;
  notes: string | null;
  is_active: boolean;
  released_at: string | null;
  release_reason: string | null;
};

const DAYS = [
  [1, "Lunedì"],
  [2, "Martedì"],
  [3, "Mercoledì"],
  [4, "Giovedì"],
  [5, "Venerdì"],
  [6, "Sabato"],
  [7, "Domenica"],
] as const;

const BLOCK_LABELS: Record<string, string> = {
  MAINTENANCE: "Manutenzione",
  TRANSFER: "Trasferimento",
  PRIVATE_USE: "Uso privato",
  OPERATOR_BLOCK: "Blocco operatore",
  OTHER: "Altro",
  HOLD: "Hold checkout",
  BOOKING: "Prenotazione marketplace",
  MANUAL_BOOKING: "Prenotazione manuale",
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Rome",
  }).format(new Date(value));
}

function errorMessage(error?: string) {
  switch (error) {
    case "invalid-window":
      return "Controlla gli orari: l'orario di fine deve essere successivo all'inizio.";
    case "conflict":
      return "Il periodo si sovrappone a un'altra occupazione attiva della barca.";
    case "not-allowed":
      return "Non hai i permessi necessari per modificare la disponibilità.";
    case "release-failed":
      return "Non è stato possibile rilasciare il blocco.";
    case "invalid-block":
      return "Inserisci un intervallo valido per il blocco.";
    case "block-failed":
      return "Non è stato possibile creare il blocco operativo.";
    case "save-failed":
      return "Non è stato possibile salvare la disponibilità settimanale.";
    default:
      return null;
  }
}

export default async function AvailabilityPage({
  params,
  searchParams,
}: PageProps) {
  const { boatId } = await params;
  const query = await searchParams;

  const context = await requireOperatorBoatContext(boatId, query.operator);
  const { supabase, boat, operator, canManage } = context;

  const { data: location } = boat.primary_location_id
    ? await supabase
        .from("operator_locations")
        .select("timezone")
        .eq("id", boat.primary_location_id)
        .eq("operator_id", operator.id)
        .maybeSingle()
    : { data: null };

  const timezone = location?.timezone ?? "Europe/Rome";

  const { data: ruleRows, error: ruleError } = await supabase.rpc(
    "get_boat_availability_rules",
    {
      p_operator_id: operator.id,
      p_boat_id: boat.id,
    },
  );

  if (ruleError) {
    throw new Error(`Unable to load availability: ${ruleError.message}`);
  }

  const rules = (Array.isArray(ruleRows) ? ruleRows : []) as Rule[];
  const ruleByWeekday = new Map(rules.map((rule) => [rule.weekday, rule]));

  const from = new Date();
  from.setDate(from.getDate() - 1);
  const to = new Date();
  to.setDate(to.getDate() + 90);

  const { data: occupancyRows, error: occupancyError } = await supabase.rpc(
    "get_boat_calendar_occupancies",
    {
      p_operator_id: operator.id,
      p_boat_id: boat.id,
      p_from: from.toISOString(),
      p_to: to.toISOString(),
    },
  );

  if (occupancyError) {
    throw new Error(`Unable to load calendar: ${occupancyError.message}`);
  }

  const occupancies = (Array.isArray(occupancyRows)
    ? occupancyRows
    : []) as Occupancy[];

  const activeOccupancies = occupancies.filter((item) => item.is_active);
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
          <p className="text-sm font-semibold text-[#14B8A6]">Disponibilità</p>
          <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">
                Calendario di {boat.name}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#64748B]">
                Definisci gli orari normalmente prenotabili e i periodi in cui
                la barca deve risultare occupata. I conflitti vengono bloccati
                direttamente da PostgreSQL.
              </p>
            </div>

            <span className="rounded-full bg-[#F1F5F4] px-4 py-2 text-xs font-semibold">
              {activeOccupancies.length} blocchi attivi
            </span>
          </div>
        </section>

        {query.saved ? (
          <div className="mt-5 rounded-xl border border-[#14B8A6]/30 bg-[#14B8A6]/10 p-4 text-sm">
            <strong>Configurazione aggiornata.</strong> Le modifiche sono state
            applicate al calendario.
          </div>
        ) : null}

        {error ? (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        ) : null}

        <form
          action={saveWeeklyAvailability}
          className="mt-6 rounded-2xl border border-[#DEE5E8] bg-white p-6 shadow-sm"
        >
          <input type="hidden" name="operator_id" value={operator.id} />
          <input type="hidden" name="boat_id" value={boat.id} />
          <input type="hidden" name="timezone" value={timezone} />

          <p className="text-sm font-semibold text-[#14B8A6]">
            Settimana tipo
          </p>
          <h2 className="mt-2 text-xl font-semibold">Finestre prenotabili</h2>
          <p className="mt-2 text-sm text-[#64748B]">
            Timezone: {timezone}. Le finestre sono locali; le occupazioni reali
            vengono salvate come timestamptz.
          </p>

          <div className="mt-6 space-y-3">
            {DAYS.map(([weekday, label]) => {
              const rule = ruleByWeekday.get(weekday);

              return (
                <div
                  key={weekday}
                  className="grid gap-3 rounded-xl border border-[#DEE5E8] p-4 md:grid-cols-[170px_1fr_1fr] md:items-center"
                >
                  <label className="flex items-center gap-3 font-semibold">
                    <input
                      type="checkbox"
                      name={`enabled_${weekday}`}
                      defaultChecked={Boolean(rule)}
                      disabled={!canManage}
                      className="h-4 w-4"
                    />
                    {label}
                  </label>

                  <label className="text-sm">
                    <span className="mb-1 block text-xs text-[#64748B]">
                      Dalle
                    </span>
                    <input
                      type="time"
                      name={`from_${weekday}`}
                      defaultValue={rule?.available_from?.slice(0, 5) ?? "09:00"}
                      disabled={!canManage}
                      className="w-full rounded-lg border border-[#DEE5E8] px-3 py-2"
                    />
                  </label>

                  <label className="text-sm">
                    <span className="mb-1 block text-xs text-[#64748B]">
                      Alle
                    </span>
                    <input
                      type="time"
                      name={`to_${weekday}`}
                      defaultValue={rule?.available_to?.slice(0, 5) ?? "18:00"}
                      disabled={!canManage}
                      className="w-full rounded-lg border border-[#DEE5E8] px-3 py-2"
                    />
                  </label>
                </div>
              );
            })}
          </div>

          {canManage ? (
            <button
              type="submit"
              className="mt-6 rounded-xl bg-[#14B8A6] px-5 py-3 text-sm font-semibold text-white"
            >
              Salva disponibilità
            </button>
          ) : null}
        </form>

        {canManage ? (
          <form
            action={createCalendarBlock}
            className="mt-6 rounded-2xl border border-[#DEE5E8] bg-white p-6 shadow-sm"
          >
            <input type="hidden" name="operator_id" value={operator.id} />
            <input type="hidden" name="boat_id" value={boat.id} />
            <input type="hidden" name="timezone" value={timezone} />

            <p className="text-sm font-semibold text-[#14B8A6]">
              Eccezioni operative
            </p>
            <h2 className="mt-2 text-xl font-semibold">Blocca un periodo</h2>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="text-sm font-medium">
                Tipo
                <select
                  name="occupancy_type"
                  defaultValue="OPERATOR_BLOCK"
                  className="mt-2 w-full rounded-xl border border-[#DEE5E8] px-4 py-3"
                >
                  <option value="OPERATOR_BLOCK">Blocco operatore</option>
                  <option value="MAINTENANCE">Manutenzione</option>
                  <option value="PRIVATE_USE">Uso privato</option>
                  <option value="TRANSFER">Trasferimento</option>
                  <option value="OTHER">Altro</option>
                </select>
              </label>

              <label className="text-sm font-medium">
                Titolo
                <input
                  name="title"
                  maxLength={160}
                  className="mt-2 w-full rounded-xl border border-[#DEE5E8] px-4 py-3"
                  placeholder="Es. Manutenzione motore"
                />
              </label>

              <label className="text-sm font-medium">
                Inizio
                <input
                  name="starts_at"
                  type="datetime-local"
                  required
                  className="mt-2 w-full rounded-xl border border-[#DEE5E8] px-4 py-3"
                />
              </label>

              <label className="text-sm font-medium">
                Fine
                <input
                  name="ends_at"
                  type="datetime-local"
                  required
                  className="mt-2 w-full rounded-xl border border-[#DEE5E8] px-4 py-3"
                />
              </label>
            </div>

            <label className="mt-4 block text-sm font-medium">
              Note
              <textarea
                name="notes"
                rows={3}
                className="mt-2 w-full rounded-xl border border-[#DEE5E8] px-4 py-3"
              />
            </label>

            <button
              type="submit"
              className="mt-5 rounded-xl bg-[#0B1F33] px-5 py-3 text-sm font-semibold text-white"
            >
              Crea blocco
            </button>
          </form>
        ) : null}

        <section className="mt-6 rounded-2xl border border-[#DEE5E8] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-[#14B8A6]">
                Prossimi 90 giorni
              </p>
              <h2 className="mt-2 text-xl font-semibold">Occupazioni</h2>
            </div>
            <span className="text-sm text-[#64748B]">
              {activeOccupancies.length} attive
            </span>
          </div>

          {activeOccupancies.length === 0 ? (
            <p className="mt-5 rounded-xl bg-[#F1F5F4] p-4 text-sm text-[#64748B]">
              Nessuna occupazione concreta nel periodo.
            </p>
          ) : (
            <div className="mt-5 space-y-3">
              {activeOccupancies.map((occupancy) => {
                const releasable = ![
                  "BOOKING",
                  "MANUAL_BOOKING",
                  "HOLD",
                ].includes(occupancy.occupancy_type);

                return (
                  <article
                    key={occupancy.id}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#DEE5E8] p-4"
                  >
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#14B8A6]">
                        {BLOCK_LABELS[occupancy.occupancy_type] ??
                          occupancy.occupancy_type}
                      </p>
                      <p className="mt-1 font-semibold">
                        {occupancy.title ?? "Occupazione calendario"}
                      </p>
                      <p className="mt-1 text-sm text-[#64748B]">
                        {formatDateTime(occupancy.starts_at)} →{" "}
                        {formatDateTime(occupancy.ends_at)}
                      </p>
                    </div>

                    {canManage && releasable ? (
                      <form action={releaseCalendarBlock}>
                        <input
                          type="hidden"
                          name="operator_id"
                          value={operator.id}
                        />
                        <input type="hidden" name="boat_id" value={boat.id} />
                        <input
                          type="hidden"
                          name="occupancy_id"
                          value={occupancy.id}
                        />
                        <button
                          type="submit"
                          className="rounded-lg border border-[#DEE5E8] px-3 py-2 text-xs font-semibold hover:bg-[#F1F5F4]"
                        >
                          Rilascia
                        </button>
                      </form>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
