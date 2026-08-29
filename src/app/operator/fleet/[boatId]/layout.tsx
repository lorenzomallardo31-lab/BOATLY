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
    ["Scheda", `/operator/fleet/${boatId}`],
    ["Offerta legale", `/operator/fleet/${boatId}/offering`],
    ["Foto", `/operator/fleet/${boatId}/photos`],
    ["Dotazioni", `/operator/fleet/${boatId}/amenities`],
    ["Extra", `/operator/fleet/${boatId}/extras`],
    ["Disponibilità", `/operator/fleet/${boatId}/availability`],
    ["Prezzi", `/operator/fleet/${boatId}/pricing`],
    ["Stato", `/operator/fleet/${boatId}/status`],
    ["Pubblicazione", `/operator/fleet/${boatId}/publication`],
  ] as const;

  return (
    <>
      <OperatorNav operatorId={operator.id} operatorName={operator.name} />
      <div className="bg-[#F7F6FB] px-4 pt-5 sm:px-6">
        <nav className="mx-auto flex max-w-5xl flex-wrap gap-2 rounded-2xl border border-[#DEE5E8] bg-white p-2 shadow-sm">
          {items.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-[#0B1F33] hover:bg-[#F1F5F4]"
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>

      {children}
    </>
  );
}
