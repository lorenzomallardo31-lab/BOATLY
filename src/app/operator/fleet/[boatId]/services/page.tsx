import Link from "next/link";

import { requireOperatorBoatContext } from "@/lib/operator/context";

type ServicesPageProps = {
  params: Promise<{ boatId: string }>;
};

export default async function BoatServicesPage({ params }: ServicesPageProps) {
  const { boatId } = await params;
  const { boat, operator } = await requireOperatorBoatContext(boatId);
  const cards = [
    {
      href: `/operator/fleet/${boat.id}/extras?operator=${operator.id}`,
      title: "Servizi aggiuntivi",
      description: "SUP, skipper, transfer, ghiacciaia, bevande e altri extra richiedibili dal cliente.",
      action: "Gestisci servizi",
    },
    {
      href: `/operator/fleet/${boat.id}/amenities?operator=${operator.id}`,
      title: "Dotazioni presenti",
      description: "Indica ciò che è già incluso e disponibile a bordo.",
      action: "Gestisci dotazioni",
    },
    {
      href: `/operator/fleet/${boat.id}/offering?operator=${operator.id}`,
      title: "Modalità di utilizzo",
      description: "Configura locazione, conducente e requisito patente quando necessario.",
      action: "Gestisci modalità",
    },
  ];

  return (
    <main className="min-h-screen bg-[#F7F6FB] px-4 pb-28 pt-7 text-[#171A2B] sm:px-6 lg:pb-12">
      <div className="mx-auto max-w-5xl">
        <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#6D5DFB]">{boat.name}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Servizi e dotazioni</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#676B80]">Configura soltanto ciò che ti serve per lavorare. Tutte queste informazioni sono facoltative e modificabili in seguito.</p>
        <section className="mt-7 grid gap-4 md:grid-cols-3">
          {cards.map((card) => (
            <Link key={card.href} href={card.href} className="rounded-3xl border border-[#D8D5E5] bg-white p-6 shadow-sm transition hover:border-[#6D5DFB]/50">
              <h2 className="text-xl font-semibold">{card.title}</h2>
              <p className="mt-3 text-sm leading-6 text-[#676B80]">{card.description}</p>
              <span className="mt-5 inline-flex text-sm font-semibold text-[#4C3FC2]">{card.action} →</span>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
