"use client";

import { useEffect } from "react";

export default function ApplicationError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Boatly application error", { digest: error.digest });
  }, [error]);

  return (
    <main className="grid min-h-screen place-items-center bg-[#F7F6FB] px-4 text-[#171A2B]">
      <section className="w-full max-w-lg rounded-3xl border border-[#E2DFEB] bg-white p-7 text-center shadow-sm">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-rose-50 text-xl text-rose-700">!</div>
        <h1 className="mt-5 text-2xl font-semibold">Qualcosa non ha funzionato</h1>
        <p className="mt-2 text-sm leading-6 text-[#676B80]">I dati non sono stati modificati automaticamente. Riprova oppure torna al gestionale.</p>
        {error.digest ? <p className="mt-3 text-xs text-[#8A8EA1]">Riferimento: {error.digest}</p> : null}
        <div className="mt-6 grid gap-2 sm:grid-cols-2"><button onClick={reset} className="min-h-12 rounded-xl bg-[#6D5DFB] px-4 text-sm font-semibold text-white">Riprova</button><a href="/operator/dashboard" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[#D8D5E5] px-4 text-sm font-semibold">Dashboard</a></div>
      </section>
    </main>
  );
}
