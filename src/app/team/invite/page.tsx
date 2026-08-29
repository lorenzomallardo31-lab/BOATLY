import type { Metadata } from "next";

import InvitationAcceptor from "./invitation-acceptor";

export const metadata: Metadata = { title: "Invito Boatly Ops", robots: { index: false, follow: false } };

export default function TeamInvitePage() {
  return (
    <main className="min-h-screen bg-[#F7F6FB] px-4 py-12 text-[#171A2B]">
      <div className="mx-auto max-w-xl">
        <p className="text-xl font-bold">Boatly Ops</p>
        <section className="mt-8 rounded-3xl border border-[#E2DFEB] bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#6D5DFB]">Invito al workspace</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Entra nel team</h1>
          <InvitationAcceptor />
        </section>
      </div>
    </main>
  );
}
