export const COMMODITIES = [
  { id: "broiler_kg", label: "سعر كيلو الفراخ", category: "poultry", unit: "جنيه/كجم" },
  { id: "sasso_kg", label: "لحم ساسو", category: "poultry", unit: "جنيه/كجم" },
  { id: "chick", label: "سعر الكتكوت", category: "poultry", unit: "جنيه/كتكوت" },
  { id: "chick_flock", label: "كتكوت أبيض قطعان", category: "poultry", unit: "جنيه/كتكوت" },
  { id: "egg_white", label: "بيض أبيض", category: "poultry", unit: "جنيه" },
  { id: "egg_red", label: "بيض أحمر", category: "poultry", unit: "جنيه" },
  { id: "egg_baladi", label: "بيض بلدي", category: "poultry", unit: "جنيه" },
  { id: "feed", label: "سعر العلف", category: "feed", unit: "جنيه/طن" },
  { id: "corn", label: "سعر الذرة", category: "feed", unit: "جنيه/طن" },
  { id: "soy", label: "سعر الصويا", category: "feed", unit: "جنيه/طن" },
  { id: "bran", label: "سعر الردة", category: "feed", unit: "جنيه/طن" },
  { id: "clover", label: "سعر البرسيم", category: "feed", unit: "جنيه/كجم" },
];

export function cairoToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function formatDate(value) {
  if (!value) return "";
  const [year, month, day] = String(value).slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return "";
  return new Intl.DateTimeFormat("ar-EG", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Africa/Cairo",
    numberingSystem: "latn",
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

export function formatTime(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("ar-EG", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Africa/Cairo",
    numberingSystem: "latn",
  }).format(new Date(value));
}

export function formatMoney(value) {
  const formatted = new Intl.NumberFormat("ar-EG", {
    numberingSystem: "latn",
    maximumFractionDigits: 0,
  }).format(Math.round(Number(value || 0)));
  return `${formatted} جنيه`;
}

export function formatNumber(value, digits = 0) {
  return new Intl.NumberFormat("ar-EG", {
    numberingSystem: "latn",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number(value || 0));
}

export function addCalendarDays(isoDate, days) {
  const [year, month, day] = String(isoDate).slice(0, 10).split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + Number(days));
  return date.toISOString().slice(0, 10);
}

export function startDateFromAgeDays(age, today = cairoToday()) {
  return addCalendarDays(today, -Math.round(Number(age) || 0));
}

export function ageDays(startDate, today = cairoToday()) {
  if (!startDate) return 0;
  const start = new Date(`${String(startDate).slice(0, 10)}T00:00:00Z`);
  const now = new Date(`${today}T00:00:00Z`);
  return Math.max(0, Math.round((now - start) / 86400000));
}

export function percentChange(current, previous) {
  const now = Number(current);
  const then = Number(previous);
  if (!then) return null;
  return ((now - then) / then) * 100;
}

export function changeLabel(percent) {
  if (percent === null || Number.isNaN(percent)) return null;
  const rounded = Math.round(percent * 10) / 10;
  if (Math.abs(rounded) < 0.05) return { word: "ثابت", text: "0%" };
  const sign = rounded > 0 ? "+" : "";
  return {
    word: rounded > 0 ? "ارتفاع" : "انخفاض",
    text: `${sign}${formatNumber(rounded, 1)}%`,
  };
}
