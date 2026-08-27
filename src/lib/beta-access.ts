import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const BETA_ACCESS_COOKIE = "boatly_beta_access";
export const BETA_ACCESS_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

const COOKIE_PURPOSE = "boatly-private-beta-v1";

export function privateBetaEnabled() {
  const configured = process.env.BETA_PRIVATE_MODE?.trim().toLowerCase();

  if (configured === "false") {
    return false;
  }

  if (configured === "true") {
    return true;
  }

  return process.env.NODE_ENV === "production";
}

function accessToken() {
  const value = process.env.BETA_ACCESS_TOKEN?.trim();
  return value && value.length >= 24 ? value : null;
}

function digest(value: string) {
  return createHash("sha256").update(value, "utf8").digest();
}

function safeEqual(left: string, right: string) {
  return timingSafeEqual(digest(left), digest(right));
}

export function betaAccessConfigured() {
  return accessToken() !== null;
}

export function verifyBetaAccessToken(candidate: string) {
  const expected = accessToken();

  if (!expected || candidate.length > 512) {
    return false;
  }

  return safeEqual(candidate, expected);
}

export function betaAccessCookieValue() {
  const token = accessToken();

  if (!token) {
    return null;
  }

  return createHmac("sha256", token)
    .update(COOKIE_PURPOSE, "utf8")
    .digest("base64url");
}

export function verifyBetaAccessCookie(candidate: string | undefined) {
  const expected = betaAccessCookieValue();

  if (!candidate || !expected || candidate.length > 128) {
    return false;
  }

  return safeEqual(candidate, expected);
}
