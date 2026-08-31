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
    completedAt: null,
    customer: "Mario Rossi",
    passengers: 4,
    notes: null,
    customerPhone: "+393331234567",
    operatorCustomerId: "customer-a",
    rawStatus: "CONFIRMED",
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

test("flags only bookings explicitly waiting for a skipper", () => {
  const overview = buildTodayDashboard([
    booking({ skipperAssignmentState: "UNASSIGNED" }),
    booking({
      id: "booking-b",
      boatId: "boat-b",
      operatorCustomerId: "customer-b",
      skipperAssignmentState: "ASSIGNED",
      skipperName: "Anna Verdi",
      skipperPhone: "+393331112222",
    }),
  ], boats, day);

  const skipperAlerts = overview.alerts.filter((alert) => alert.title === "Skipper da assegnare");
  assert.equal(skipperAlerts.length, 1);
  assert.equal(skipperAlerts[0].itemId, "booking-a");
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

test("groups every movement scheduled at the same time", () => {
  const overview = buildTodayDashboard([
    booking(),
    booking({ id: "booking-b", boatId: "boat-b", operatorCustomerId: "customer-b" }),
  ], boats, day);

  assert.equal(overview.eventGroups.length, 2);
  assert.equal(overview.eventGroups[0].events.length, 2);
  assert.deepEqual(overview.eventGroups[0].events.map((event) => event.kind), [
    "DEPARTURE",
    "DEPARTURE",
  ]);
});

test("replaces a completed departure task with an in-use movement", () => {
  const overview = buildTodayDashboard([
    booking({ rawStatus: "IN_PROGRESS" }),
  ], boats, day);

  assert.deepEqual(overview.events.map((event) => event.kind), ["IN_USE", "RETURN"]);
  assert.equal(overview.events.some((event) => event.kind === "DEPARTURE"), false);
});

test("shows a completed booking only as returned", () => {
  const overview = buildTodayDashboard([
    booking({
      rawStatus: "COMPLETED",
      completedAt: "2026-09-03T15:42:00.000Z",
    }),
  ], boats, day);

  assert.deepEqual(overview.events.map((event) => event.kind), ["RETURNED"]);
  assert.equal(overview.events[0].at, "2026-09-03T15:42:00.000Z");
});
