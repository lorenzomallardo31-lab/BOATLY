export function skipperWhatsAppHref(phone: string | null | undefined) {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 10 && digits.startsWith("3")) digits = `39${digits}`;
  if (digits.length < 8 || digits.length > 15) return null;
  return `https://wa.me/${digits}`;
}
