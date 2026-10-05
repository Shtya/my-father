import { fail } from "./errors.js";

export function text(value, max = 300) {
  if (value === null || value === undefined) return null;
  const clean = String(value).trim();
  if (!clean) return null;
  if (clean.length > max) fail("النص طويل زيادة");
  return clean;
}

export function requiredText(value, label) {
  const clean = text(value, 200);
  if (!clean) fail(`اكتب ${label}`);
  return clean;
}

export function asDate(value) {
  const clean = String(value || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(clean)) fail("التاريخ غير صحيح");
  return clean;
}

export function asInt(value, label, { min = 0, max = 1000000 } = {}) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) fail(`${label} غير صحيح`);
  return number;
}

export function asMoney(value, label = "المبلغ", { required = false } = {}) {
  if (value === "" || value === null || value === undefined) {
    if (required) fail(`اكتب ${label}`);
    return null;
  }
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > 100000000) fail(`${label} غير صحيح`);
  return Math.round(number * 100) / 100;
}

export function asQty(value, { required = false } = {}) {
  if (value === "" || value === null || value === undefined) {
    if (required) fail("اكتب الكمية");
    return null;
  }
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > 10000000) fail("الكمية غير صحيحة");
  return Math.round(number * 1000) / 1000;
}

export function cents(value) {
  return Math.round(Number(value || 0) * 100);
}

const MORTALITY_REASONS = new Set(["مرض", "ضعف", "حرارة", "إصابة", "غير معروف"]);

export function mortalityReason(value) {
  const clean = text(value, 40);
  if (!clean) return null;
  if (!MORTALITY_REASONS.has(clean)) fail("سبب النفوق غير معروف في القائمة");
  return clean;
}
