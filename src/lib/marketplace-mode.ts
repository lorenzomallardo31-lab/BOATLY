import { operatorEntryDestination } from "@/lib/product-mode";

const ENABLED_VALUES = new Set(["1", "true", "yes", "on"]);

const MARKETPLACE_PATHS = [
  "/barche",
  "/cerca",
  "/checkout",
  "/come-funziona",
  "/prenotazioni",
  "/search",
] as const;

const MANAGEMENT_DESTINATIONS = [
  "/account",
  "/admin",
  "/demo-gestionale",
  "/forgot-password",
  "/operator",
  "/sign-in",
  "/update-password",
] as const;

/**
 * The marketplace is deliberately fail-closed: omitting the variable keeps
 * customer-facing routes offline. Reopening it requires an explicit opt-in.
 */
export function marketplaceEnabled() {
  const value = process.env.MARKETPLACE_ENABLED?.trim().toLowerCase();
  return value ? ENABLED_VALUES.has(value) : false;
}

export function isMarketplacePath(pathname: string) {
  return pathname === "/" || MARKETPLACE_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

export function safeManagementDestination(value?: string) {
  if (!value?.startsWith("/") || value.startsWith("//")) {
    return operatorEntryDestination(false);
  }

  const pathname = value.split(/[?#]/, 1)[0];
  const allowed = MANAGEMENT_DESTINATIONS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  return allowed ? value : operatorEntryDestination(false);
}
