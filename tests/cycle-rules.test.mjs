import assert from "node:assert/strict";
import test from "node:test";
import { cycleOptionLabel, defaultCycleId, logHref, splitCycles } from "../lib/cycle-rules.js";

test("splitCycles keeps one current cycle and lists leftover actives separately", () => {
  const rows = [
    { cycle: { id: "new", status: "active", name: "أكتوبر" } },
    { cycle: { id: "old", status: "active", name: "سبتمبر" } },
    { cycle: { id: "done", status: "closed", name: "أغسطس" } },
  ];
  const { current, extras, previous } = splitCycles(rows);
  assert.equal(current.cycle.id, "new");
  assert.deepEqual(extras.map((row) => row.cycle.id), ["old"]);
  assert.deepEqual(previous.map((row) => row.cycle.id), ["done"]);
});

test("logHref keeps the chosen cycle so a save cannot jump to another flock", () => {
  assert.equal(logHref("abc", "2026-10-11"), "/log?cycleId=abc&date=2026-10-11");
  assert.equal(logHref("abc"), "/log?cycleId=abc");
  assert.equal(logHref(), "/log");
});

test("cycleOptionLabel marks the running cycle and the old ones", () => {
  assert.equal(cycleOptionLabel({ name: "أكتوبر", status: "active", current: 80 }), "أكتوبر — شغالة · 80 فرخة");
  assert.equal(cycleOptionLabel({ name: "سبتمبر", status: "closed" }), "سبتمبر — قديمة");
});

test("defaultCycleId prefers the requested cycle, then the running one", () => {
  const choices = [
    { id: "new", status: "active" },
    { id: "old", status: "closed" },
  ];
  assert.equal(defaultCycleId(choices, "old"), "old");
  assert.equal(defaultCycleId(choices, "missing"), "new");
  assert.equal(defaultCycleId(choices), "new");
  assert.equal(defaultCycleId([{ id: "old", status: "closed" }]), "old");
  assert.equal(defaultCycleId([]), "");
});
