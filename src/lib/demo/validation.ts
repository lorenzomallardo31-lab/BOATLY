import type {
  DemoBoat,
  DemoBooking,
  DemoCustomer,
  DemoState,
} from "@/lib/demo/types";

export type DemoValidationIssue = {
  field: string;
  message: string;
};

export function normalizeIdentity(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("it-IT")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function normalizeEmail(value: string) {
  return value.trim().toLocaleLowerCase("it-IT");
}

export function normalizePhone(value: string) {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length >= 8 && digits.length <= 10 && !digits.startsWith("39")) {
    digits = `39${digits}`;
  }
  return digits;
}

function addIssue(issues: DemoValidationIssue[], field: string, message: string) {
  if (!issues.some((issue) => issue.field === field && issue.message === message)) {
    issues.push({ field, message });
  }
}

export function validateCustomer(
  candidate: DemoCustomer,
  customers: DemoCustomer[],
  excludeCustomerId?: string,
) {
  const issues: DemoValidationIssue[] = [];
  const name = normalizeIdentity(candidate.name);
  const email = normalizeEmail(candidate.email);
  const phone = normalizePhone(candidate.phone);
  const others = customers.filter((customer) => customer.id !== excludeCustomerId);

  if (name.length < 2) {
    addIssue(issues, "customerName", "Inserisci un nome cliente di almeno 2 caratteri.");
  }

  const sameName = name
    ? others.find((customer) => normalizeIdentity(customer.name) === name)
    : undefined;
  if (sameName) {
    addIssue(issues, "customerName", `Il cliente “${sameName.name}” esiste già. Selezionalo dall’elenco invece di crearne uno nuovo.`);
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    addIssue(issues, "customerEmail", "L’indirizzo email non è valido.");
  }
  const sameEmail = email
    ? others.find((customer) => normalizeEmail(customer.email) === email)
    : undefined;
  if (sameEmail) {
    addIssue(issues, "customerEmail", `Questa email appartiene già a ${sameEmail.name}.`);
  }

  if (candidate.phone.trim() && (phone.length < 8 || phone.length > 15)) {
    addIssue(issues, "customerPhone", "Il numero di telefono deve contenere da 8 a 15 cifre.");
  }
  const samePhone = phone
    ? others.find((customer) => normalizePhone(customer.phone) === phone)
    : undefined;
  if (samePhone) {
    addIssue(issues, "customerPhone", `Questo numero di telefono appartiene già a ${samePhone.name}.`);
  }

  return issues;
}

function validOptionalNumber(value: number | null, minimum: number, integer = false) {
  if (value === null) return true;
  return Number.isFinite(value) && value >= minimum && (!integer || Number.isInteger(value));
}

export function validateBoat(
  candidate: DemoBoat,
  boats: DemoBoat[],
  excludeBoatId?: string,
) {
  const issues: DemoValidationIssue[] = [];
  const name = normalizeIdentity(candidate.name);
  const duplicate = boats.find(
    (boat) => boat.id !== excludeBoatId && normalizeIdentity(boat.name) === name,
  );

  if (name.length < 2) {
    addIssue(issues, "boatName", "Inserisci un nome barca di almeno 2 caratteri.");
  }
  if (duplicate) {
    addIssue(issues, "boatName", `Esiste già una barca chiamata “${duplicate.name}”. Usa un nome univoco per evitare errori operativi.`);
  }
  if (!Number.isInteger(candidate.horsepower) || candidate.horsepower <= 0) {
    addIssue(issues, "horsepower", "La potenza deve essere un numero intero maggiore di zero.");
  }
  if (!Number.isInteger(candidate.dailyPriceCents) || candidate.dailyPriceCents < 0) {
    addIssue(issues, "dailyPrice", "La tariffa giornaliera non è valida.");
  }
  if (!validOptionalNumber(candidate.capacity, 1, true)) {
    addIssue(issues, "capacity", "La capienza deve essere un numero intero maggiore di zero.");
  }
  if (!validOptionalNumber(candidate.engineCount, 1, true)) {
    addIssue(issues, "engineCount", "Il numero di motori deve essere un intero maggiore di zero.");
  }
  if (!validOptionalNumber(candidate.cabins, 0, true) || !validOptionalNumber(candidate.berths, 0, true) || !validOptionalNumber(candidate.bathrooms, 0, true)) {
    addIssue(issues, "technicalData", "Cabine, posti letto e bagni devono essere numeri interi non negativi.");
  }
  if (!validOptionalNumber(candidate.lengthMeters, 0.1) || !validOptionalNumber(candidate.beamMeters, 0.1) || !validOptionalNumber(candidate.maxSpeedKnots, 0.1)) {
    addIssue(issues, "technicalData", "Dimensioni e velocità, quando indicate, devono essere maggiori di zero.");
  }
  const maximumYear = new Date().getFullYear() + 1;
  if (candidate.manufactureYear !== null && (!Number.isInteger(candidate.manufactureYear) || candidate.manufactureYear < 1900 || candidate.manufactureYear > maximumYear)) {
    addIssue(issues, "manufactureYear", `L’anno di costruzione deve essere compreso tra 1900 e ${maximumYear}.`);
  }

  const extraNames = new Set<string>();
  for (const extra of candidate.extras) {
    const extraName = normalizeIdentity(extra.name);
    if (extraName.length < 2) {
      addIssue(issues, "extras", "Ogni optional deve avere un nome valido.");
    } else if (extraNames.has(extraName)) {
      addIssue(issues, "extras", `L’optional “${extra.name}” è presente più di una volta.`);
    }
    extraNames.add(extraName);
    if (!Number.isInteger(extra.priceCents) || extra.priceCents < 0) {
      addIssue(issues, "extras", `Il prezzo dell’optional “${extra.name}” non è valido.`);
    }
    if (extra.maxQuantity !== null && (!Number.isInteger(extra.maxQuantity) || extra.maxQuantity < 1)) {
      addIssue(issues, "extras", `La quantità massima dell’optional “${extra.name}” non è valida.`);
    }
  }

  return issues;
}

export function validateBoatOperationalConstraints(candidate: DemoBoat, state: DemoState) {
  const issues: DemoValidationIssue[] = [];
  const activeBookings = state.bookings.filter((booking) => (
    booking.boatId === candidate.id
    && ["REQUESTED", "CONFIRMED", "PREPARING"].includes(booking.status)
  ));

  if (candidate.status !== "ACTIVE" && activeBookings.length > 0) {
    addIssue(issues, "boatStatus", `Non puoi rendere la barca non disponibile: risultano ancora ${activeBookings.length} prenotazioni attive. Prima spostale o cancellale.`);
  }
  if (candidate.capacity !== null) {
    const oversizedBooking = activeBookings.find((booking) => booking.passengers > candidate.capacity!);
    if (oversizedBooking) {
      addIssue(issues, "capacity", `La capienza non può scendere sotto ${oversizedBooking.passengers}: la prenotazione ${oversizedBooking.reference} ha già quel numero di passeggeri.`);
    }
  }

  return issues;
}

function bookingTimeLabel(booking: DemoBooking) {
  return `${booking.startAt.slice(8, 10)}/${booking.startAt.slice(5, 7)} ${booking.startAt.slice(11, 16)}–${booking.endAt.slice(11, 16)}`;
}

export function validateBooking(
  candidate: DemoBooking,
  state: DemoState,
  excludeBookingId?: string,
) {
  const issues: DemoValidationIssue[] = [];
  const boat = state.boats.find((item) => item.id === candidate.boatId);
  const customer = state.customers.find((item) => item.id === candidate.customerId);
  const start = Date.parse(candidate.startAt);
  const end = Date.parse(candidate.endAt);

  if (!boat) addIssue(issues, "boatId", "La barca selezionata non esiste più.");
  if (!customer) addIssue(issues, "customerId", "Il cliente selezionato non esiste più.");
  if (boat && !["CANCELLED", "COMPLETED"].includes(candidate.status) && boat.status !== "ACTIVE") {
    addIssue(issues, "boatId", `“${boat.name}” non è prenotabile perché risulta ${boat.status === "MAINTENANCE" ? "in manutenzione" : "non disponibile"}.`);
  }
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    addIssue(issues, "time", "Data e orari della prenotazione non sono validi.");
  } else if (end <= start) {
    addIssue(issues, "time", "L’orario di rientro deve essere successivo a quello di partenza.");
  }
  if (!Number.isInteger(candidate.passengers) || candidate.passengers < 1) {
    addIssue(issues, "passengers", "Il numero di passeggeri deve essere un intero maggiore di zero.");
  } else if (boat?.capacity && candidate.passengers > boat.capacity) {
    addIssue(issues, "passengers", `La barca accetta al massimo ${boat.capacity} passeggeri.`);
  }
  if (!Number.isInteger(candidate.amountCents) || candidate.amountCents < 0) {
    addIssue(issues, "amount", "Il valore economico della prenotazione non è valido.");
  }
  if (state.bookings.some((booking) => booking.id !== excludeBookingId && booking.reference === candidate.reference)) {
    addIssue(issues, "reference", "Il codice della prenotazione è già utilizzato.");
  }

  if (candidate.status !== "CANCELLED" && Number.isFinite(start) && Number.isFinite(end) && end > start) {
    const blockingBookings = state.bookings.filter((booking) => (
      booking.id !== excludeBookingId
      && booking.status !== "CANCELLED"
      && Date.parse(booking.startAt) < end
      && Date.parse(booking.endAt) > start
    ));
    const boatConflict = blockingBookings.find((booking) => booking.boatId === candidate.boatId);
    if (boatConflict) {
      addIssue(issues, "boatId", `Barca già occupata dalla prenotazione ${boatConflict.reference} (${bookingTimeLabel(boatConflict)}). Anche una sovrapposizione parziale non è consentita.`);
    }
    const customerConflict = blockingBookings.find((booking) => booking.customerId === candidate.customerId);
    if (customerConflict) {
      addIssue(issues, "customerId", `${customer?.name ?? "Il cliente"} ha già la prenotazione ${customerConflict.reference} nello stesso intervallo (${bookingTimeLabel(customerConflict)}).`);
    }
  }

  return issues;
}

export function auditDemoState(state: DemoState) {
  const issues = [
    ...state.customers.flatMap((customer) => validateCustomer(customer, state.customers, customer.id)),
    ...state.boats.flatMap((boat) => [
      ...validateBoat(boat, state.boats, boat.id),
      ...validateBoatOperationalConstraints(boat, state),
    ]),
    ...state.bookings.flatMap((booking) => validateBooking(booking, state, booking.id)),
  ];

  return issues.filter((issue, index) => (
    issues.findIndex((candidate) => candidate.field === issue.field && candidate.message === issue.message) === index
  ));
}
