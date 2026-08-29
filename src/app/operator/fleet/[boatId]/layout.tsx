import Link from "next/link";

import OperatorNav from "@/components/operator/operator-nav";
import { requireOperatorBoatContext } from "@/lib/operator/context";

type BoatLayoutProps = {
  children: React.ReactNode;
  params: Promise<{
    boatId: string;
  }>;
};

export default async function BoatLayout({
  children,
  params,
}: BoatLayoutProps) {
  const { boatId } = await params;
  const { operator } = await requireOperatorBoatContext(boatId);

  const items = [
    ["Dati barca", `/operator/fleet/${boatId}`],
    ["Servizi", `/operator/fleet/${boatId}/services`],
    ["Periodi e blocchi", `/operator/fleet/${boatId}/availability`],
    ["Disponibilità ed elimina", `/operator/fleet/${boatId}/status`],
  ] as const;

  return (
    <>
      <OperatorNav operatorId={operator.id} operatorName={operator.name} />
      <div className="bg-[#F7F6FB] px-4 pt-5 sm:px-6">
        <nav className="mx-auto flex max-w-5xl flex-wrap items-center gap-2 rounded-2xl border border-[#DEE5E8] bg-white p-2 shadow-sm">
          {items.map(([label, href]) => (
            <Link key={href} href={href} className="rounded-xl px-4 py-2 text-sm font-semibold text-[#0B1F33] hover:bg-[#F1F5F4]">
              {label}
            </Link>
          ))}
          <details className="relative">
            <summary className="cursor-pointer list-none rounded-xl px-4 py-2 text-sm font-semibold text-[#64748B] hover:bg-[#F1F5F4]">
              Altre impostazioni
            </summary>
            <div className="absolute right-0 z-30 mt-2 grid min-w-56 gap-1 rounded-2xl border border-[#DEE5E8] bg-white p-2 shadow-xl">
              <Link href={`/operator/fleet/${boatId}/offering`} className="rounded-xl px-3 py-2 text-sm hover:bg-[#F1F5F4]">Modalità di noleggio</Link>
              <Link href={`/operator/fleet/${boatId}/pricing`} className="rounded-xl px-3 py-2 text-sm hover:bg-[#F1F5F4]">Prezzi</Link>
            </div>
          </details>
        </nav>
      </div>

      {children}
    </>
  );
}
