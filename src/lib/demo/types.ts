export type DemoView =
  | "dashboard"
  | "prenotazioni"
  | "flotta"
  | "clienti"
  | "finanza";

export type DemoBookingStatus =
  | "REQUESTED"
  | "CONFIRMED"
  | "PREPARING"
  | "COMPLETED"
  | "CANCELLED";

export type DemoBoatStatus = "ACTIVE" | "MAINTENANCE" | "UNAVAILABLE";

export type DemoBooking = {
  id: string;
  reference: string;
  boatId: string;
  customerId: string;
  startAt: string;
  endAt: string;
  source: "MARKETPLACE" | "DIRECT";
  status: DemoBookingStatus;
  amountCents: number;
  passengers: number;
  notes: string;
  createdAt: string;
};

export type DemoBoat = {
  id: string;
  name: string;
  type: string;
  base: string;
  capacity: number;
  dailyPriceCents: number;
  status: DemoBoatStatus;
  maintenanceNote: string;
};

export type DemoCustomer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  segment: "NUOVO" | "DIRETTO" | "RICORRENTE" | "ALTO_VALORE";
  notes: string;
};

export type DemoActivity = {
  id: string;
  label: string;
  detail: string;
  occurredAt: string;
};

export type DemoState = {
  version: 2;
  bookings: DemoBooking[];
  boats: DemoBoat[];
  customers: DemoCustomer[];
  activity: DemoActivity[];
};

