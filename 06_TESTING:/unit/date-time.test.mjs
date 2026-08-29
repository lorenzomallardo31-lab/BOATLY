import assert from "node:assert/strict";
import test from "node:test";

import {
  addDays,
  isDateKey,
  localDateTimeInTimeZone,
  zonedDateTimeToIso,
} from "../../src/lib/operator/date-time.ts";

test("validates calendar dates and crosses month boundaries", () => {
  assert.equal(isDateKey("2026-02-29"), false);
  assert.equal(isDateKey("2028-02-29"), true);
  assert.equal(addDays("2026-08-31", 1), "2026-09-01");
});

test("converts Europe/Rome local time without losing the selected wall time", () => {
  const iso = zonedDateTimeToIso("2026-08-29T09:15", "Europe/Rome");
  assert.equal(iso, "2026-08-29T07:15:00.000Z");
  assert.equal(localDateTimeInTimeZone(iso, "Europe/Rome"), "2026-08-29T09:15");
});

test("rejects nonexistent local time during DST transition", () => {
  assert.equal(zonedDateTimeToIso("2026-03-29T02:30", "Europe/Rome"), null);
});
