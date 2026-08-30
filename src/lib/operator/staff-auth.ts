import { createHash } from "node:crypto";

const STAFF_USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,30}[a-z0-9]$/;

export function normalizeStaffUsername(value: string) {
  return value.trim().toLowerCase();
}

export function isValidStaffUsername(value: string) {
  return STAFF_USERNAME_PATTERN.test(normalizeStaffUsername(value));
}

export function staffAuthenticationEmail(username: string) {
  const normalized = normalizeStaffUsername(username);
  const digest = createHash("sha256").update(normalized, "utf8").digest("hex");
  return `staff-${digest}@accounts.boatly.invalid`;
}
