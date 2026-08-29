export function GET() {
  const csv = "nome,email,telefono,paese,data_nascita,note\nMario Rossi,mario@example.it,+393331234567,IT,1985-06-20,Cliente abituale\n";
  return new Response(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="boatly-clienti-modello.csv"',
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
