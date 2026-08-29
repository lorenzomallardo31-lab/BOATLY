import Link from "next/link";

import CustomerForm from "@/components/operator/customer-form";
import OperatorNav from "@/components/operator/operator-nav";
import { requireOperatorWorkspaceContext } from "@/lib/operator/workspace-context";

type PageProps = { searchParams: Promise<{ operator?: string }> };

export default async function NewCustomerPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const { operator } = await requireOperatorWorkspaceContext(query.operator);

  return (
    <main className="min-h-screen bg-[#F7F6FB] pb-28 text-[#171A2B] lg:pb-12">
      <OperatorNav operatorId={operator.id} operatorName={operator.name} />
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <Link href={`/operator/customers?operator=${operator.id}`} className="text-sm font-semibold text-[#676B80]">← Clienti</Link>
        <div className="mt-4">
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#6D5DFB]">CRM operativo</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Nuovo cliente</h1>
          <p className="mt-2 text-sm leading-6 text-[#676B80]">Crea una scheda riutilizzabile nelle prenotazioni dirette.</p>
        </div>
        <section className="mt-7 rounded-3xl border border-[#E2DFEB] bg-white p-5 shadow-sm sm:p-7">
          <CustomerForm operatorId={operator.id} />
        </section>
      </div>
    </main>
  );
}
