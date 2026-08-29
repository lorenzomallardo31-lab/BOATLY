import Link from "next/link";

import CustomerImportForm from "@/components/operator/customer-import-form";
import OperatorNav from "@/components/operator/operator-nav";
import { requireOperatorWorkspaceContext } from "@/lib/operator/workspace-context";

type PageProps = { searchParams: Promise<{ operator?: string }> };

export default async function CustomerImportPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const { operator } = await requireOperatorWorkspaceContext(query.operator);
  return (
    <main className="min-h-screen bg-[#F7F6FB] pb-28 text-[#171A2B] lg:pb-12">
      <OperatorNav operatorId={operator.id} operatorName={operator.name} />
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <Link href={`/operator/customers?operator=${operator.id}`} className="text-sm font-semibold text-[#676B80]">← Clienti</Link>
        <p className="mt-5 text-xs font-bold uppercase tracking-[0.1em] text-[#6D5DFB]">Migrazione dati</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Importa clienti</h1>
        <p className="mt-2 text-sm leading-6 text-[#676B80]">Usa il modello, controlla il riepilogo e correggi soltanto le righe segnalate.</p>
        <section className="mt-6 rounded-3xl border border-[#E2DFEB] bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-semibold">CSV clienti</h2><p className="mt-1 text-xs text-[#676B80]">Supporta virgola o punto e virgola e campi tra virgolette.</p></div><a href="/operator/customers/import/template" download className="inline-flex min-h-11 items-center rounded-xl border border-[#D8D5E5] px-4 text-sm font-semibold text-[#4C3FC2]">Scarica modello</a></div>
          <div className="mt-6"><CustomerImportForm operatorId={operator.id} /></div>
        </section>
      </div>
    </main>
  );
}
