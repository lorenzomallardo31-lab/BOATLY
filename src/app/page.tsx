export default function Home() {
  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6 lg:px-8">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center">
        <div className="w-full">
          <div className="mb-8 inline-flex rounded-full border border-border bg-card px-3 py-1 text-sm font-medium">
            C2 · Next.js
          </div>

          <h1 className="max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            La base di Boatly è pronta.
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
            Next.js, React, TypeScript e Tailwind CSS sono configurati.
            Da qui costruiremo il marketplace, il gestionale per i noleggiatori
            e il back office Boatly.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-sm text-muted-foreground">Marketplace</p>
              <p className="mt-2 font-semibold">Customer experience</p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-sm text-muted-foreground">Operator</p>
              <p className="mt-2 font-semibold">Fleet management</p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-sm text-muted-foreground">Admin</p>
              <p className="mt-2 font-semibold">Platform operations</p>
            </div>
          </div>

          <div className="mt-10 inline-flex rounded-xl bg-accent px-5 py-3 font-semibold text-accent-foreground">
            Freedom, made simple.
          </div>
        </div>
      </section>
    </main>
  );
}