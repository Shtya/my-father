import assert from "node:assert/strict";
import test from "node:test";
import { addCalendarDays, ageDays, startDateFromAgeDays } from "../lib/format.js";

test("startDateFromAgeDays writes the start date that ageDays reads back", () => {
  assert.equal(addCalendarDays("2026-10-26", -12), "2026-10-14");
  assert.equal(startDateFromAgeDays(12, "2026-10-26"), "2026-10-14");
  assert.equal(ageDays("2026-10-14", "2026-10-26"), 12);
  assert.equal(startDateFromAgeDays(0, "2026-10-26"), "2026-10-26");
  assert.equal(ageDays("2026-10-26", "2026-10-26"), 0);
});
