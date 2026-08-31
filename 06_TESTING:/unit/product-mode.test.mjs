import assert from "node:assert/strict";
import test from "node:test";

import {
  boatlyAppMode,
  operatorEntryDestination,
  realOperatorModeEnabled,
} from "../../src/lib/product-mode.ts";

test("falls back safely to preview for missing or unknown modes", () => {
  assert.equal(boatlyAppMode(""), "preview");
  assert.equal(boatlyAppMode("unexpected"), "preview");
  assert.equal(realOperatorModeEnabled("unexpected"), false);
});

test("recognizes pilot and production as real operator modes", () => {
  assert.equal(boatlyAppMode(" PILOT "), "pilot");
  assert.equal(realOperatorModeEnabled("production"), true);
});

test("routes a real operator to authentication or the calendar", () => {
  assert.equal(operatorEntryDestination(false, "pilot"), "/sign-in");
  assert.equal(operatorEntryDestination(true, "pilot"), "/operator/calendar");
  assert.equal(operatorEntryDestination(false, "preview"), "/demo-gestionale");
});
