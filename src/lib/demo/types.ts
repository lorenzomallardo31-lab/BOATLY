export type DemoView =
  | "dashboard"
  | "calendario"
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

export type DemoExtraPricingUnit =
  | "FIXED"
  | "PER_PERSON"
  | "PER_DAY"
  | "PER_UNIT";

export type DemoBoatExtra = {
  id: string;
  name: string;
  description: string;
  pricingUnit: DemoExtraPricingUnit;
  priceCents: number;
  maxQuantity: number | null;
};

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
  shortDescription: string;
  description: string;
  manufacturer: string;
  model: string;
  manufactureYear: number | null;
  lengthMeters: number | null;
  beamMeters: number | null;
  capacity: number | null;
  cabins: number | null;
  berths: number | null;
  bathrooms: number | null;
  engineCount: number | null;
  engineManufacturer: string;
  engineModel: string;
  fuelType: string;
  horsepower: number;
  maxSpeedKnots: number | null;
  licenseRequired: boolean;
  dailyPriceCents: number;
  status: DemoBoatStatus;
  maintenanceNote: string;
  extras: DemoBoatExtra[];
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

export type DemoLocation = {
  id: string;
  label: string;
  fullName: string;
  city: string;
  region: string;
  countryCode: "IT";
  longitude: number;
  latitude: number;
};

export type DemoState = {
  version: 4;
  workspaceName: string;
  workspaceLocation: DemoLocation | null;
  bookings: DemoBooking[];
  boats: DemoBoat[];
  customers: DemoCustomer[];
  activity: DemoActivity[];
};
