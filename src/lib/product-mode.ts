export type BoatlyAppMode = "preview" | "pilot" | "production";

const REAL_OPERATOR_MODES = new Set<BoatlyAppMode>([
  "pilot",
  "production",
]);

export function boatlyAppMode(
  configured = process.env.BOATLY_APP_MODE,
): BoatlyAppMode {
  const value = configured?.trim().toLowerCase();

  if (value === "pilot" || value === "production") {
    return value;
  }

  return "preview";
}

export function realOperatorModeEnabled(
  configured = process.env.BOATLY_APP_MODE,
) {
  return REAL_OPERATOR_MODES.has(boatlyAppMode(configured));
}

export function operatorEntryDestination(
  authenticated: boolean,
  configured = process.env.BOATLY_APP_MODE,
) {
  if (!realOperatorModeEnabled(configured)) {
    return "/demo-gestionale";
  }

  return authenticated ? "/operator/calendar" : "/sign-in";
}
