import Link from "next/link";

import OperatorNav from "@/components/operator/operator-nav";
import { requireOperatorWorkspaceContext } from "@/lib/operator/workspace-context";

type MorePageProps = {
  searchParams: Promise<{ operator?: string }>;
};

export default async function OperatorMorePage({ searchParams }: MorePageProps) {
  const query = await searchParams;
  const { operator } = await requireOperatorWorkspaceContext(query.operator);
  const suffix = `?operator=${encodeURIComponent(operator.id)}`;
  const items = [
    {
      href: `/operator/team${suffix}`,
      title: "Collaboratori",
      description: "Gestisci chi può lavorare nel gestionale.",
      icon: "👥",
    },
    {
      href: "/account",
      title: "Account",
      description: "Profilo, sicurezza e uscita dal gestionale.",
      icon: "⚙",
    },
  ];

  return (
    <main className="min-h-screen bg-[#F7F6FB] pb-28 text-[#171A2B] lg:pb-12">
      <OperatorNav operatorId={operator.id} operatorName={operator.name} />
      <div className="mx-auto max-w-4xl px-4 py-7 sm:px-6 sm:py-10">
        <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#6D5DFB]">Altre funzioni</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Impostazioni e gestione</h1>
        <p className="mt-2 text-sm text-[#676B80]">Le attività quotidiane restano nel calendario. Qui trovi le funzioni usate meno spesso.</p>
        <section className="mt-7 grid gap-4 sm:grid-cols-2">
          {items.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-3xl border border-[#D8D5E5] bg-white p-6 shadow-sm transition hover:border-[#6D5DFB]/50 hover:shadow-md">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#EDE9FE] text-xl text-[#4C3FC2]">{item.icon}</span>
              <h2 className="mt-5 text-xl font-semibold">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-[#676B80]">{item.description}</p>
              <span className="mt-5 inline-flex text-sm font-semibold text-[#4C3FC2]">Apri →</span>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
