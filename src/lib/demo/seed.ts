import type { DemoState } from "@/lib/demo/types";

export const DEMO_STORAGE_KEY = "boatly:management-demo:v4";

export const DEMO_SEED: DemoState = {
  version: 4,
  workspaceName: "",
  workspaceLocation: null,
  boats: [
    {
      id: "boat-gozzo",
      name: "Gozzo Positano 32",
      type: "Gozzo",
      base: "Napoli",
      shortDescription: "Gozzo mediterraneo per escursioni giornaliere nel Golfo di Napoli.",
      description: "Imbarcazione dimostrativa con ampi prendisole, pozzetto ombreggiato e dotazioni per uscite giornaliere.",
      manufacturer: "Cantieri Demo",
      model: "Positano 32",
      manufactureYear: 2024,
      lengthMeters: 9.8,
      beamMeters: 3.1,
      capacity: 10,
      cabins: 1,
      berths: 2,
      bathrooms: 1,
      engineCount: 2,
      engineManufacturer: "Volvo Penta",
      engineModel: "D4",
      fuelType: "Diesel",
      horsepower: 600,
      maxSpeedKnots: 30,
      licenseRequired: true,
      dailyPriceCents: 78000,
      status: "ACTIVE",
      maintenanceNote: "",
      extras: [
        { id: "extra-sup", name: "Stand Up Paddle", description: "SUP aggiuntivo con pagaia e leash.", pricingUnit: "PER_UNIT", priceCents: 3500, maxQuantity: 2 },
        { id: "extra-snorkel", name: "Kit snorkeling", description: "Maschera, boccaglio e pinne.", pricingUnit: "PER_PERSON", priceCents: 1500, maxQuantity: 10 },
      ],
    },
  ],
  customers: [
    { id: "customer-martina", name: "Martina Russo", email: "martina.russo@example.test", phone: "+39 333 555 0191", segment: "RICORRENTE", notes: "Preferisce itinerari Capri e Nerano. Contatto WhatsApp." },
    { id: "customer-luca", name: "Luca Palmieri", email: "luca.palmieri@example.test", phone: "+39 339 555 0248", segment: "DIRETTO", notes: "Cliente acquisito tramite hotel partner." },
    { id: "customer-sophie", name: "Sophie Martin", email: "sophie.martin@example.test", phone: "+33 6 55 40 21 18", segment: "NUOVO", notes: "Comunicazioni in inglese. Richiesta opzione skipper." },
    { id: "customer-andrea", name: "Andrea Conti", email: "andrea.conti@example.test", phone: "+39 347 555 0380", segment: "ALTO_VALORE", notes: "Cliente corporate. Fattura sempre richiesta." },
  ],
  bookings: [
    { id: "booking-a91d", reference: "BTY-2908-A91D", boatId: "boat-gozzo", customerId: "customer-martina", startAt: "2026-08-29T09:00", endAt: "2026-08-29T17:00", source: "MARKETPLACE", status: "CONFIRMED", amountCents: 78000, passengers: 6, notes: "Pranzo a Nerano, rientro entro le 17:00.", createdAt: "2026-08-24T15:20" },
    { id: "booking-118", reference: "MAN-0309-118", boatId: "boat-gozzo", customerId: "customer-luca", startAt: "2026-09-03T10:00", endAt: "2026-09-03T18:00", source: "DIRECT", status: "REQUESTED", amountCents: 72000, passengers: 4, notes: "Richiesta diretta da confermare.", createdAt: "2026-08-27T10:10" },
    { id: "booking-old-2", reference: "MAN-1908-104", boatId: "boat-gozzo", customerId: "customer-andrea", startAt: "2026-08-19T09:00", endAt: "2026-08-19T18:00", source: "DIRECT", status: "COMPLETED", amountCents: 110000, passengers: 8, notes: "Evento aziendale completato.", createdAt: "2026-08-12T11:30" },
  ],
  activity: [
    { id: "activity-1", label: "Prenotazione confermata", detail: "BTY-2908-A91D · Gozzo Positano 32", occurredAt: "2026-08-27T16:20" },
    { id: "activity-2", label: "Flotta aggiornata", detail: "Gozzo Positano 32 pronta per il marketplace", occurredAt: "2026-08-27T12:40" },
    { id: "activity-3", label: "Richiesta diretta", detail: "MAN-0309-118 · € 720,00", occurredAt: "2026-08-27T10:05" },
  ],
};

export function freshDemoState(): DemoState {
  return structuredClone(DEMO_SEED);
}
