import type { Metadata } from "next";
import Link from "next/link";

import { safeManagementDestination } from "@/lib/marketplace-mode";

import AccessActivator from "./access-activator";

type AccessPageProps = {
  searchParams: Promise<{ next?: string }>;
};

export const metadata: Metadata = {
  title: "Anteprima privata",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
  },
};

export default async function BetaAccessPage({ searchParams }: AccessPageProps) {
  const params = await searchParams;

  return (
    <main className="min-h-screen bg-[#FCFBF8] px-4 py-14 text-[#0B1F33] sm:px-6">
      <div className="mx-auto max-w-2xl">
        <Link href="/accesso-beta" className="text-2xl font-bold tracking-tight">
          Boatly Ops
        </Link>

        <section className="mt-10 overflow-hidden rounded-[2rem] border border-[#DEE5E8] bg-white shadow-sm">
          <div className="bg-[#0B1F33] p-7 text-white sm:p-10">
            <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#5EEAD4]">
              Private preview
            </span>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl">
              Benvenuto in Boatly Ops.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-white/70 sm:text-lg">
              Il gestionale operativo per attività di noleggio nautico. Questa
              anteprima interattiva è riservata alle persone invitate.
            </p>
          </div>

          <div className="p-7 sm:p-10">
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                ["01", "Configura", "Attività, sede e flotta"],
                ["02", "Organizza", "Calendario, booking e clienti"],
                ["03", "Controlla", "Ricavi e operatività in tempo reale"],
              ].map(([number, title, text]) => (
                <div key={number} className="rounded-2xl bg-[#F1F5F4] p-4">
                  <span className="text-xs font-semibold text-[#14B8A6]">{number}</span>
                  <p className="mt-4 font-semibold">{title}</p>
                  <p className="mt-1 text-xs leading-5 text-[#64748B]">{text}</p>
                </div>
              ))}
            </div>

            <AccessActivator nextPath={safeManagementDestination(params.next)} />

            <p className="mt-6 text-xs leading-5 text-[#64748B]">
              Ambiente dimostrativo: i dati restano nel browser e non
              modificano clienti, disponibilità o pagamenti reali.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
