"use client";

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="it">
      <body>
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#F7F6FB", color: "#171A2B", fontFamily: "system-ui, sans-serif" }}>
          <section style={{ width: "100%", maxWidth: 520, padding: 28, border: "1px solid #E2DFEB", borderRadius: 24, background: "white", textAlign: "center" }}>
            <h1 style={{ margin: 0, fontSize: 28 }}>Boatly non è riuscito ad aprire questa schermata</h1>
            <p style={{ margin: "12px 0 0", color: "#676B80", lineHeight: 1.6 }}>
              Le modifiche non confermate non sono state salvate. Riprova; se il problema continua, torna al calendario.
            </p>
            <div style={{ display: "grid", gap: 10, marginTop: 24 }}>
              <button type="button" onClick={reset} style={{ minHeight: 48, border: 0, borderRadius: 12, background: "#6D5DFB", color: "white", fontWeight: 700, cursor: "pointer" }}>
                Riprova
              </button>
              <a href="/operator/calendar" style={{ minHeight: 48, display: "grid", placeItems: "center", border: "1px solid #D8D5E5", borderRadius: 12, color: "#171A2B", fontWeight: 700, textDecoration: "none" }}>
                Torna al calendario
              </a>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
