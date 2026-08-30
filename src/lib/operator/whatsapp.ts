export type WhatsAppBookingMessageKind =
  | "BOOKING_SUMMARY"
  | "DEPARTURE_REMINDER"
  | "RETURN_REMINDER";

type BookingMessageInput = {
  kind: WhatsAppBookingMessageKind;
  operatorName: string;
  customerName: string;
  boatName: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  passengers: number | null;
};

const CALLING_CODES: Record<string, string> = {
  AT: "43",
  AU: "61",
  BE: "32",
  CA: "1",
  CH: "41",
  DE: "49",
  ES: "34",
  FR: "33",
  GB: "44",
  GR: "30",
  IE: "353",
  IT: "39",
  NL: "31",
  PT: "351",
  US: "1",
};

export function normalizeWhatsAppPhone(
  value: string | null | undefined,
  countryCode: string | null | undefined = "IT",
) {
  const raw = value?.trim() ?? "";
  if (!raw) return null;

  const explicitInternationalPrefix = raw.startsWith("+") || raw.startsWith("00");
  let digits = raw.replace(/\D/g, "");
  if (raw.startsWith("00")) digits = digits.slice(2);

  if (!explicitInternationalPrefix) {
    const prefix = CALLING_CODES[(countryCode || "IT").toUpperCase()] ?? CALLING_CODES.IT;
    if (!digits.startsWith(prefix)) digits = `${prefix}${digits}`;
  }

  return digits.length >= 8 && digits.length <= 15 ? digits : null;
}

function customerGreeting(value: string) {
  return value.trim() || "cliente";
}

function dateLabel(value: string, timezone: string) {
  return new Intl.DateTimeFormat("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: timezone,
  }).format(new Date(value));
}

function timeLabel(value: string, timezone: string) {
  return new Intl.DateTimeFormat("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  }).format(new Date(value));
}

export function buildWhatsAppBookingMessage(input: BookingMessageInput) {
  const introduction = input.kind === "DEPARTURE_REMINDER"
    ? "ti ricordiamo la partenza della tua prenotazione:"
    : input.kind === "RETURN_REMINDER"
      ? "ti ricordiamo il rientro previsto per la tua prenotazione:"
      : "ecco il riepilogo della tua prenotazione:";

  const lines = [
    `Ciao ${customerGreeting(input.customerName)},`,
    "",
    introduction,
    "",
    `🚤 Imbarcazione: ${input.boatName}`,
    `📅 Data: ${dateLabel(input.startsAt, input.timezone)}`,
    `🕒 Orario: ${timeLabel(input.startsAt, input.timezone)} – ${timeLabel(input.endsAt, input.timezone)}`,
  ];

  if (input.passengers) lines.push(`👥 Passeggeri: ${input.passengers}`);

  lines.push(
    "",
    "Per qualsiasi necessità puoi rispondere direttamente a questo messaggio.",
    input.operatorName,
  );

  return lines.join("\n");
}

export function buildWhatsAppBookingUrl(
  phone: string | null | undefined,
  countryCode: string | null | undefined,
  input: BookingMessageInput,
) {
  const normalizedPhone = normalizeWhatsAppPhone(phone, countryCode);
  if (!normalizedPhone) return null;
  const message = buildWhatsAppBookingMessage(input);
  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
}
