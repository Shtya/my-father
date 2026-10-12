import assert from "node:assert/strict";
import test from "node:test";
import { asBirdWeight, asDate, asInt, asMoney, asQty, cents, mortalityReason, requiredText, text } from "../lib/validate.js";

function message(fn) {
  try {
    fn();
  } catch (error) {
    return { message: error.message, status: error.status };
  }
  return null;
}

test("asDate accepts real calendar dates only", () => {
  assert.equal(asDate("2026-10-05"), "2026-10-05");
  assert.equal(asDate("2026-10-05T12:00:00Z"), "2026-10-05");
  assert.deepEqual(message(() => asDate("2026-13-45")), { message: "التاريخ غير صحيح", status: 400 });
  assert.deepEqual(message(() => asDate("2026-02-30")), { message: "التاريخ غير صحيح", status: 400 });
  assert.ok(message(() => asDate("")));
  assert.ok(message(() => asDate("1990-01-01")));
});

test("asMoney rounds to piasters and rejects negatives", () => {
  assert.equal(asMoney("12.345"), 12.35);
  assert.equal(asMoney(""), null);
  assert.equal(message(() => asMoney("", "المبلغ", { required: true })).message, "اكتب المبلغ");
  assert.equal(message(() => asMoney("-1")).message, "المبلغ غير صحيح");
  assert.equal(message(() => asMoney("abc", "سعر الكيلو")).message, "سعر الكيلو غير صحيح");
});

test("asQty keeps three decimals", () => {
  assert.equal(asQty("1.23456"), 1.235);
  assert.equal(asQty(undefined), null);
  assert.ok(message(() => asQty("-2")));
});

test("asBirdWeight rejects grams typed into the kilo field", () => {
  assert.equal(asBirdWeight("1.95"), 1.95);
  assert.equal(asBirdWeight(""), null);
  assert.match(message(() => asBirdWeight("1950")).message, /اكتبه 1\.95/);
  assert.ok(message(() => asBirdWeight("", { required: true })));
});

test("asInt enforces bounds", () => {
  assert.equal(asInt("5", "العدد", { min: 1 }), 5);
  assert.ok(message(() => asInt("0", "العدد", { min: 1 })));
  assert.ok(message(() => asInt("2.5", "العدد")));
});

test("cents compares money without float drift", () => {
  assert.equal(cents(0.1 + 0.2), cents(0.3));
  assert.equal(cents("434"), 43400);
});

test("text and requiredText trim and limit", () => {
  assert.equal(text("  علف  "), "علف");
  assert.equal(text("   "), null);
  assert.equal(message(() => requiredText(" ", "الاسم")).message, "اكتب الاسم");
  assert.ok(message(() => text("x".repeat(11), 10)));
});

test("mortalityReason only accepts the listed reasons", () => {
  assert.equal(mortalityReason("مرض"), "مرض");
  assert.equal(mortalityReason(""), null);
  assert.ok(message(() => mortalityReason("سبب جديد")));
});
