import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#F7F6FB] px-4 text-[#171A2B]">
      <section className="w-full max-w-lg rounded-3xl border border-[#E2DFEB] bg-white p-7 text-center shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#6D5DFB]">Errore 404</p>
        <h1 className="mt-3 text-3xl font-semibold">Questa pagina non esiste</h1>
        <p className="mt-3 text-sm leading-6 text-[#676B80]">Il collegamento potrebbe essere vecchio. Torna al calendario operativo per continuare.</p>
        <Link href="/operator/calendar" className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-[#6D5DFB] px-5 text-sm font-semibold text-white">Apri il calendario</Link>
      </section>
    </main>
  );
}
