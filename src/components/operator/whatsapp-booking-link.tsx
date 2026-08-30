"use client";

import {
  buildWhatsAppBookingUrl,
  type WhatsAppBookingMessageKind,
} from "@/lib/operator/whatsapp";

type WhatsAppBookingLinkProps = {
  phone: string | null;
  countryCode: string | null;
  customerName: string;
  operatorName: string;
  boatName: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  passengers: number | null;
  kind?: WhatsAppBookingMessageKind;
  label?: string;
  className?: string;
};

export default function WhatsAppBookingLink({
  phone,
  countryCode,
  customerName,
  operatorName,
  boatName,
  startsAt,
  endsAt,
  timezone,
  passengers,
  kind = "BOOKING_SUMMARY",
  label = "Invia su WhatsApp",
  className = "",
}: WhatsAppBookingLinkProps) {
  const href = buildWhatsAppBookingUrl(phone, countryCode, {
    kind,
    operatorName,
    customerName,
    boatName,
    startsAt,
    endsAt,
    timezone,
    passengers,
  });

  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={`inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 text-center text-sm font-semibold text-[#073B20] transition hover:-translate-y-0.5 hover:bg-[#20C45D] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#128C4A] focus-visible:ring-offset-2 active:translate-y-0 active:scale-[0.98] ${className}`}
      aria-label={`${label} per ${customerName}`}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-current">
        <path d="M12 2a9.7 9.7 0 0 0-8.35 14.65L2.4 21.3l4.77-1.25A9.77 9.77 0 1 0 12 2Zm0 17.75a8 8 0 0 1-4.08-1.12l-.29-.17-2.83.74.76-2.76-.19-.29A8.04 8.04 0 1 1 12 19.75Zm4.4-6.02c-.24-.12-1.43-.7-1.65-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.01-.37-1.93-1.19a7.2 7.2 0 0 1-1.34-1.66c-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.47-.4-.4-.54-.41h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.69 2.58 4.1 3.62.57.25 1.02.4 1.37.51.58.18 1.1.16 1.51.1.46-.07 1.43-.59 1.63-1.15.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28Z" />
      </svg>
      {label}
    </a>
  );
}
