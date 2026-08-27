import type { Metadata } from "next";
import Link from "next/link";

type DemoView = "dashboard" | "prenotazioni" | "flotta" | "clienti" | "finanza";

type DemoPageProps = {
  searchParams: Promise<{ vista?: string }>;
};

const VIEWS: Array<{ id: DemoView; label: string; note: string }> = [
  { id: "dashboard", label: "Dashboard", note: "Controllo giornaliero" },
  { id: "prenotazioni", label: "Prenotazioni", note: "Marketplace e dirette" },
  { id: "flotta", label: "Flotta", note: "Barche e disponibilità" },
  { id: "clienti", label: "Clienti", note: "CRM centralizzato" },
  { id: "finanza", label: "Finanza", note: "Incassi e riconciliazione" },
];

const UPCOMING_BOOKINGS = [
  {
    reference: "BTY-2408-A91D",
    boat: "Gozzo Positano 32",
    customer: "Martina R.",
    date: "29 ago · 09:00",
    source: "Marketplace",
    status: "Confermata",
    value: "€ 780",
  },
  {
    reference: "MAN-2408-118",
    boat: "Blu Mediterraneo",
    customer: "Luca P.",
    date: "30 ago · 10:00",
    source: "Diretta",
    status: "Confermata",
    value: "€ 540",
  },
  {
    reference: "BTY-3108-F72A",
    boat: "Liberty 28",
    customer: "Sophie M.",
    date: "31 ago · 08:30",
    source: "Marketplace",
    status: "Da preparare",
    value: "€ 690",
  },
  {
    reference: "MAN-0109-121",
    boat: "Vesuvio 40",
    customer: "Andrea C.",
    date: "1 set · 09:30",
    source: "Diretta",
    status: "In attesa",
    value: "€ 1.240",
  },
] as const;

const FLEET = [
  { name: "Gozzo Positano 32", type: "Gozzo", base: "Napoli", bookings: 14, occupancy: "82%", status: "Attiva" },
  { name: "Blu Mediterraneo", type: "Open", base: "Napoli", bookings: 11, occupancy: "76%", status: "Attiva" },
  { name: "Liberty 28", type: "Motoscafo", base: "Sorrento", bookings: 8, occupancy: "64%", status: "Attiva" },
  { name: "Vesuvio 40", type: "Yacht", base: "Napoli", bookings: 5, occupancy: "51%", status: "Manutenzione 4 set" },
] as const;

const CUSTOMERS = [
  { name: "Martina R.", bookings: 3, spent: "€ 2.140", last: "24 ago 2026", segment: "Ricorrente" },
  { name: "Luca P.", bookings: 2, spent: "€ 1.080", last: "19 ago 2026", segment: "Diretto" },
  { name: "Sophie M.", bookings: 1, spent: "€ 690", last: "17 ago 2026", segment: "Nuovo" },
  { name: "Andrea C.", bookings: 4, spent: "€ 4.860", last: "11 ago 2026", segment: "Alto valore" },
] as const;

export const metadata: Metadata = {
  title: "Demo gestionale operatori",
  description:
    "Anteprima read-only del gestionale Boatly per noleggiatori di barche.",
};

function selectedView(value?: string): DemoView {
  return VIEWS.some((view) => view.id === value)
    ? (value as DemoView)
    : "dashboard";
}

function Status({ children }: { children: string }) {
  const positive = ["Confermata", "Attiva", "MATCHED", "Pagato"].includes(children);

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
        positive
          ? "bg-[#CCFBF1] text-[#0F766E]"
          : "bg-amber-50 text-amber-800"
      }`}
    >
      {children}
    </span>
  );
}

function DashboardView() {
  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Ricavi agosto", "€ 12.860", "+18% sul mese scorso"],
          ["Prenotazioni", "38", "31 confermate"],
          ["Occupazione flotta", "72%", "+9 punti in 30 giorni"],
          ["Da gestire oggi", "4", "2 richieste · 2 partenze"],
        ].map(([label, value, note]) => (
          <article key={label} className="rounded-2xl border border-[#DEE5E8] bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">{label}</p>
            <p className="mt-3 text-2xl font-semibold tracking-tight">{value}</p>
            <p className="mt-1 text-xs text-[#0F766E]">{note}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.55fr_0.75fr]">
        <div className="rounded-3xl border border-[#DEE5E8] bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#14B8A6]">Agenda operativa</p>
              <h3 className="mt-2 text-xl font-semibold">Prossime partenze</h3>
            </div>
            <span className="text-xs text-[#64748B]">Aggiornata ora</span>
          </div>
          <div className="mt-5 space-y-3">
            {UPCOMING_BOOKINGS.slice(0, 3).map((booking) => (
              <div key={booking.reference} className="grid gap-3 rounded-2xl border border-[#DEE5E8] p-4 sm:grid-cols-[1.2fr_1fr_auto] sm:items-center">
                <div>
                  <p className="font-semibold">{booking.boat}</p>
                  <p className="mt-1 text-xs text-[#64748B]">{booking.reference} · {booking.customer}</p>
                </div>
                <div className="text-sm">
                  <p className="font-medium">{booking.date}</p>
                  <p className="mt-1 text-xs text-[#64748B]">{booking.source}</p>
                </div>
                <Status>{booking.status}</Status>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-5">
          <section className="rounded-3xl bg-[#0B1F33] p-6 text-white">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#5EEAD4]">Obiettivo del mese</p>
            <div className="mt-5 flex items-end justify-between gap-4">
              <p className="text-3xl font-semibold">72%</p>
              <p className="text-sm text-white/60">target 80%</p>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/15">
              <div className="h-full w-[72%] rounded-full bg-[#2DD4BF]" />
            </div>
            <p className="mt-4 text-sm leading-6 text-white/65">Mancano 4 giornate prenotate per raggiungere il target flotta.</p>
          </section>
          <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Attenzione richiesta</p>
            <p className="mt-3 font-semibold text-amber-950">2 richieste di cancellazione</p>
            <p className="mt-2 text-sm leading-6 text-amber-800">Valuta policy, importo stimato e disponibilità liberata.</p>
          </section>
        </div>
      </section>
    </div>
  );
}

function BookingsView() {
  return (
    <section className="rounded-3xl border border-[#DEE5E8] bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#14B8A6]">Booking control</p>
          <h3 className="mt-2 text-xl font-semibold">Tutte le prenotazioni in un solo flusso</h3>
        </div>
        <div className="flex gap-2 text-xs">
          <span className="rounded-xl bg-[#0B1F33] px-3 py-2 font-semibold text-white">Tutte 38</span>
          <span className="rounded-xl border border-[#DEE5E8] px-3 py-2 text-[#64748B]">Da gestire 4</span>
        </div>
      </div>
      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[#DEE5E8] text-xs uppercase tracking-wide text-[#64748B]">
              <th className="pb-3 font-semibold">Prenotazione</th>
              <th className="pb-3 font-semibold">Cliente</th>
              <th className="pb-3 font-semibold">Partenza</th>
              <th className="pb-3 font-semibold">Origine</th>
              <th className="pb-3 font-semibold">Valore</th>
              <th className="pb-3 font-semibold">Stato</th>
            </tr>
          </thead>
          <tbody>
            {UPCOMING_BOOKINGS.map((booking) => (
              <tr key={booking.reference} className="border-b border-[#EEF2F3] last:border-0">
                <td className="py-4"><strong>{booking.boat}</strong><p className="mt-1 text-xs text-[#64748B]">{booking.reference}</p></td>
                <td className="py-4">{booking.customer}</td>
                <td className="py-4">{booking.date}</td>
                <td className="py-4">{booking.source}</td>
                <td className="py-4 font-semibold">{booking.value}</td>
                <td className="py-4"><Status>{booking.status}</Status></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function FleetView() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {FLEET.map((boat) => (
        <article key={boat.name} className="rounded-3xl border border-[#DEE5E8] bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#14B8A6]">{boat.type} · {boat.base}</p>
              <h3 className="mt-2 text-xl font-semibold">{boat.name}</h3>
            </div>
            <Status>{boat.status}</Status>
          </div>
          <div className="mt-7 grid grid-cols-2 gap-4 border-t border-[#DEE5E8] pt-5">
            <div><p className="text-xs text-[#64748B]">Prenotazioni mese</p><p className="mt-1 text-2xl font-semibold">{boat.bookings}</p></div>
            <div><p className="text-xs text-[#64748B]">Occupazione</p><p className="mt-1 text-2xl font-semibold">{boat.occupancy}</p></div>
          </div>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-[#E8EFEE]">
            <div className="h-full rounded-full bg-[#14B8A6]" style={{ width: boat.occupancy }} />
          </div>
        </article>
      ))}
    </div>
  );
}

function CustomersView() {
  return (
    <section className="grid gap-5 xl:grid-cols-[1.4fr_0.6fr]">
      <div className="rounded-3xl border border-[#DEE5E8] bg-white p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#14B8A6]">CRM clienti</p>
        <h3 className="mt-2 text-xl font-semibold">Relazioni e storico senza fogli sparsi</h3>
        <div className="mt-6 space-y-3">
          {CUSTOMERS.map((customer) => (
            <div key={customer.name} className="grid gap-3 rounded-2xl border border-[#DEE5E8] p-4 sm:grid-cols-[1.1fr_0.7fr_0.7fr_auto] sm:items-center">
              <div><p className="font-semibold">{customer.name}</p><p className="mt-1 text-xs text-[#64748B]">Ultima attività {customer.last}</p></div>
              <p className="text-sm"><strong>{customer.bookings}</strong> booking</p>
              <p className="text-sm font-semibold">{customer.spent}</p>
              <span className="rounded-full bg-[#F1F5F4] px-3 py-1 text-xs font-semibold text-[#475569]">{customer.segment}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-5">
        {[
          ["Clienti totali", "164", "+21 questo mese"],
          ["Tasso di ritorno", "34%", "+6 punti"],
          ["Valore medio", "€ 612", "ultimi 90 giorni"],
        ].map(([label, value, note]) => (
          <article key={label} className="rounded-3xl border border-[#DEE5E8] bg-white p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">{label}</p>
            <p className="mt-3 text-3xl font-semibold">{value}</p>
            <p className="mt-1 text-xs text-[#0F766E]">{note}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function FinanceView() {
  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Incassato", "€ 18.420"],
          ["Quota operatore", "€ 16.946"],
          ["Commissioni", "€ 1.474"],
          ["Da riconciliare", "€ 0"],
        ].map(([label, value]) => (
          <article key={label} className="rounded-2xl border border-[#DEE5E8] bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">{label}</p>
            <p className="mt-3 text-2xl font-semibold">{value}</p>
          </article>
        ))}
      </section>
      <section className="rounded-3xl border border-[#DEE5E8] bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-xs font-semibold uppercase tracking-wide text-[#14B8A6]">Controllo finanziario</p><h3 className="mt-2 text-xl font-semibold">Pagamenti, rimborsi e payout riconciliati</h3></div>
          <Status>MATCHED</Status>
        </div>
        <div className="mt-6 space-y-3">
          {[
            ["31 agosto", "Payout settimanale", "€ 4.860", "Pagato"],
            ["28 agosto", "BTY-2408-A91D", "€ 780", "MATCHED"],
            ["27 agosto", "Rimborso BTY-2208-C14P", "− € 350", "MATCHED"],
            ["26 agosto", "MAN-2408-118", "€ 540", "MATCHED"],
          ].map(([date, reference, value, status]) => (
            <div key={`${date}-${reference}`} className="grid gap-3 rounded-2xl border border-[#DEE5E8] p-4 sm:grid-cols-[0.7fr_1.5fr_0.6fr_auto] sm:items-center">
              <p className="text-sm text-[#64748B]">{date}</p><p className="font-semibold">{reference}</p><p className="font-semibold">{value}</p><Status>{status}</Status>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function DemoContent({ view }: { view: DemoView }) {
  switch (view) {
    case "prenotazioni":
      return <BookingsView />;
    case "flotta":
      return <FleetView />;
    case "clienti":
      return <CustomersView />;
    case "finanza":
      return <FinanceView />;
    default:
      return <DashboardView />;
  }
}

export default async function ManagementDemoPage({ searchParams }: DemoPageProps) {
  const params = await searchParams;
  const view = selectedView(params.vista);
  const selected = VIEWS.find((item) => item.id === view) ?? VIEWS[0];

  return (
    <main className="min-h-screen bg-[#EEF3F2] text-[#0B1F33]">
      <header className="border-b border-[#DEE5E8] bg-white">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <Link href="/" className="text-xl font-bold tracking-tight">Boatly</Link>
            <p className="mt-0.5 text-xs text-[#64748B]">Gestionale operatori · demo</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#CCFBF1] px-3 py-1.5 text-xs font-semibold text-[#0F766E]">Sola lettura · dati sintetici</span>
            <Link href="/sign-up" className="rounded-xl bg-[#0B1F33] px-4 py-2 text-sm font-semibold text-white">Crea account</Link>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] gap-0 lg:grid-cols-[260px_1fr]">
        <aside className="border-b border-[#DEE5E8] bg-white p-4 lg:min-h-[calc(100vh-73px)] lg:border-b-0 lg:border-r lg:p-6">
          <div className="rounded-2xl bg-[#0B1F33] p-4 text-white">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#5EEAD4]">Workspace demo</p>
            <p className="mt-2 font-semibold">MareVivo Charter</p>
            <p className="mt-1 text-xs text-white/60">Napoli · 4 imbarcazioni</p>
          </div>

          <nav className="mt-4 grid gap-1 sm:grid-cols-5 lg:grid-cols-1" aria-label="Sezioni demo gestionale">
            {VIEWS.map((item) => {
              const active = item.id === view;
              return (
                <Link
                  key={item.id}
                  href={`/demo-gestionale?vista=${item.id}`}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-xl px-4 py-3 transition ${active ? "bg-[#CCFBF1] text-[#0F766E]" : "text-[#475569] hover:bg-[#F1F5F4]"}`}
                >
                  <span className="block text-sm font-semibold">{item.label}</span>
                  <span className="mt-0.5 hidden text-xs opacity-70 lg:block">{item.note}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-6 hidden rounded-2xl border border-[#DEE5E8] p-4 text-xs leading-5 text-[#64748B] lg:block">
            Questa demo non legge né modifica account, prenotazioni o pagamenti reali.
          </div>
        </aside>

        <div className="p-4 sm:p-6 lg:p-8">
          <section className="mb-6 flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="text-sm font-semibold text-[#14B8A6]">{selected.note}</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{selected.label}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#64748B]">Un unico spazio per vendere online e governare anche prenotazioni dirette, flotta, clienti e incassi.</p>
            </div>
            <div className="rounded-2xl border border-[#DEE5E8] bg-white px-4 py-3 text-sm">
              <span className="text-[#64748B]">Oggi</span> <strong>27 agosto 2026</strong>
            </div>
          </section>

          <DemoContent view={view} />

          <section className="mt-8 flex flex-wrap items-center justify-between gap-5 rounded-3xl bg-[#0B1F33] p-6 text-white sm:p-8">
            <div>
              <p className="text-sm font-semibold text-[#5EEAD4]">Il marketplace porta domanda. Il gestionale resta ogni giorno.</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">Prova anche i flussi reali della beta.</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/65">Crea un account per esplorare marketplace, prenotazioni e onboarding operatore nell&apos;ambiente TEST.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/" className="rounded-xl border border-white/20 px-5 py-3 text-sm font-semibold">Torna al marketplace</Link>
              <Link href="/sign-up" className="rounded-xl bg-[#14B8A6] px-5 py-3 text-sm font-semibold">Registrati per provare</Link>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
