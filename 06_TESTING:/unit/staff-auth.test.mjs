import assert from "node:assert/strict";
import test from "node:test";

import {
  isValidStaffUsername,
  normalizeStaffUsername,
  staffAuthenticationEmail,
} from "../../src/lib/operator/staff-auth.ts";

test("normalizes usernames consistently", () => {
  assert.equal(normalizeStaffUsername("  Mario.Rossi  "), "mario.rossi");
});

test("accepts only simple globally unique username syntax", () => {
  assert.equal(isValidStaffUsername("mario.rossi"), true);
  assert.equal(isValidStaffUsername("op-01"), true);
  assert.equal(isValidStaffUsername("ab"), false);
  assert.equal(isValidStaffUsername("mario@email.it"), false);
  assert.equal(isValidStaffUsername("mario rossi"), false);
});

test("derives a deterministic internal auth email without exposing the username", () => {
  const first = staffAuthenticationEmail("Mario.Rossi");
  const second = staffAuthenticationEmail("mario.rossi");
  assert.equal(first, second);
  assert.match(first, /^staff-[a-f0-9]{64}@accounts\.boatly\.invalid$/);
  assert.equal(first.includes("mario"), false);
});
