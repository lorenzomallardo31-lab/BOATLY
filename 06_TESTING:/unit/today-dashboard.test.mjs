import assert from "node:assert/strict";
import test from "node:test";

import { buildTodayDashboard } from "../../src/lib/operator/today-dashboard.ts";

const day = {
  start: "2026-09-03T00:00:00.000Z",
  end: "2026-09-04T00:00:00.000Z",
};

const boats = [
  { id: "boat-a", name: "Aurora", status: "ACTIVE" },
  { id: "boat-b", name: "Maestrale", status: "ACTIVE" },
];

function booking(overrides = {}) {
  return {
    id: "booking-a",
    boatId: "boat-a",
    kind: "BOOKING",
    startsAt: "2026-09-03T08:00:00.000Z",
    endsAt: "2026-09-03T16:00:00.000Z",
    customer: "Mario Rossi",
    passengers: 4,
    notes: null,
    customerPhone: "+393331234567",
    operatorCustomerId: "customer-a",
    ...overrides,
  };
}

test("builds the daily agenda from only overlapping items", () => {
  const overview = buildTodayDashboard([
    booking(),
    booking({
      id: "outside",
      startsAt: "2026-09-04T08:00:00.000Z",
      endsAt: "2026-09-04T16:00:00.000Z",
    }),
    {
      ...booking({ id: "block", boatId: "boat-b" }),
      kind: "BLOCK",
      customer: null,
      customerPhone: null,
      operatorCustomerId: null,
    },
  ], boats, day);

  assert.equal(overview.bookings.length, 1);
  assert.equal(overview.blockedBoatCount, 1);
  assert.deepEqual(overview.events.map((event) => event.kind), [
    "DEPARTURE",
    "BLOCK",
    "RETURN",
  ]);
});

test("flags missing phone and a turnaround shorter than one hour", () => {
  const overview = buildTodayDashboard([
    booking({ endsAt: "2026-09-03T11:00:00.000Z", customerPhone: null }),
    booking({
      id: "booking-b",
      startsAt: "2026-09-03T11:30:00.000Z",
      endsAt: "2026-09-03T15:00:00.000Z",
      operatorCustomerId: "customer-b",
    }),
  ], boats, day);

  assert.equal(overview.customerCount, 2);
  assert.equal(overview.missingPhoneCount, 1);
  assert.ok(overview.alerts.some((alert) => alert.title === "Telefono non inserito"));
  assert.ok(overview.alerts.some((alert) => alert.title === "Rientro e partenza ravvicinati"));
});

test("keeps a multi-day booking visible as already in use", () => {
  const overview = buildTodayDashboard([
    booking({
      startsAt: "2026-09-02T08:00:00.000Z",
      endsAt: "2026-09-04T16:00:00.000Z",
    }),
  ], boats, day);

  assert.deepEqual(overview.events.map((event) => event.kind), ["IN_USE"]);
});
