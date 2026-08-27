import type { DemoState } from "@/lib/demo/types";

export const DEMO_STORAGE_KEY = "boatly:management-demo:v3";

export const DEMO_SEED: DemoState = {
  version: 3,
  workspaceName: "",
  boats: [
    { id: "boat-gozzo", name: "Gozzo Positano 32", type: "Gozzo", base: "Napoli", capacity: 10, dailyPriceCents: 78000, status: "ACTIVE", maintenanceNote: "" },
    { id: "boat-blu", name: "Blu Mediterraneo", type: "Open", base: "Napoli", capacity: 8, dailyPriceCents: 54000, status: "ACTIVE", maintenanceNote: "" },
    { id: "boat-liberty", name: "Liberty 28", type: "Motoscafo", base: "Sorrento", capacity: 7, dailyPriceCents: 69000, status: "ACTIVE", maintenanceNote: "" },
    { id: "boat-vesuvio", name: "Vesuvio 40", type: "Yacht", base: "Napoli", capacity: 12, dailyPriceCents: 124000, status: "MAINTENANCE", maintenanceNote: "Tagliando motori programmato fino al 4 settembre." },
  ],
  customers: [
    { id: "customer-martina", name: "Martina Russo", email: "martina.russo@example.test", phone: "+39 333 555 0191", segment: "RICORRENTE", notes: "Preferisce itinerari Capri e Nerano. Contatto WhatsApp." },
    { id: "customer-luca", name: "Luca Palmieri", email: "luca.palmieri@example.test", phone: "+39 339 555 0248", segment: "DIRETTO", notes: "Cliente acquisito tramite hotel partner." },
    { id: "customer-sophie", name: "Sophie Martin", email: "sophie.martin@example.test", phone: "+33 6 55 40 21 18", segment: "NUOVO", notes: "Comunicazioni in inglese. Richiesta opzione skipper." },
    { id: "customer-andrea", name: "Andrea Conti", email: "andrea.conti@example.test", phone: "+39 347 555 0380", segment: "ALTO_VALORE", notes: "Cliente corporate. Fattura sempre richiesta." },
  ],
  bookings: [
    { id: "booking-a91d", reference: "BTY-2908-A91D", boatId: "boat-gozzo", customerId: "customer-martina", startAt: "2026-08-29T09:00", endAt: "2026-08-29T17:00", source: "MARKETPLACE", status: "CONFIRMED", amountCents: 78000, passengers: 6, notes: "Pranzo a Nerano, rientro entro le 17:00.", createdAt: "2026-08-24T15:20" },
    { id: "booking-118", reference: "MAN-3008-118", boatId: "boat-blu", customerId: "customer-luca", startAt: "2026-08-30T10:00", endAt: "2026-08-30T18:00", source: "DIRECT", status: "CONFIRMED", amountCents: 54000, passengers: 4, notes: "Saldo registrato. Acqua e soft drink inclusi.", createdAt: "2026-08-25T10:10" },
    { id: "booking-f72a", reference: "BTY-3108-F72A", boatId: "boat-liberty", customerId: "customer-sophie", startAt: "2026-08-31T08:30", endAt: "2026-08-31T16:30", source: "MARKETPLACE", status: "PREPARING", amountCents: 69000, passengers: 5, notes: "Confermare skipper bilingue entro venerdì.", createdAt: "2026-08-25T17:40" },
    { id: "booking-121", reference: "MAN-0509-121", boatId: "boat-vesuvio", customerId: "customer-andrea", startAt: "2026-09-05T09:30", endAt: "2026-09-05T19:00", source: "DIRECT", status: "REQUESTED", amountCents: 124000, passengers: 9, notes: "Verificare fine manutenzione prima della conferma.", createdAt: "2026-08-26T09:15" },
    { id: "booking-old-1", reference: "BTY-2208-C14P", boatId: "boat-blu", customerId: "customer-martina", startAt: "2026-08-22T09:00", endAt: "2026-08-22T17:00", source: "MARKETPLACE", status: "COMPLETED", amountCents: 65000, passengers: 5, notes: "Escursione completata senza segnalazioni.", createdAt: "2026-08-17T12:15" },
    { id: "booking-old-2", reference: "MAN-1908-104", boatId: "boat-gozzo", customerId: "customer-andrea", startAt: "2026-08-19T09:00", endAt: "2026-08-19T18:00", source: "DIRECT", status: "COMPLETED", amountCents: 110000, passengers: 8, notes: "Evento aziendale completato.", createdAt: "2026-08-12T11:30" },
  ],
  activity: [
    { id: "activity-1", label: "Prenotazione confermata", detail: "BTY-2908-A91D · Gozzo Positano 32", occurredAt: "2026-08-27T16:20" },
    { id: "activity-2", label: "Flotta aggiornata", detail: "Vesuvio 40 impostata in manutenzione", occurredAt: "2026-08-27T12:40" },
    { id: "activity-3", label: "Pagamento riconciliato", detail: "MAN-3008-118 · € 540,00", occurredAt: "2026-08-27T10:05" },
  ],
};

export function freshDemoState(): DemoState {
  return structuredClone(DEMO_SEED);
}
