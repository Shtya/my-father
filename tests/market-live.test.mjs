import assert from "node:assert/strict";
import test from "node:test";
import { parseBoard, parseEgyptBoard, parseFeed } from "../lib/market-live.js";

const today = "2026-10-05";

function table(rows) {
  return `<table>${rows.map((cells) => `<tr>${cells.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}</table>`;
}

test("parseFeed ignores the 23% header and factories that publish zero", () => {
  const html = table([
    ["المصنع", "23%", "21%"],
    ["مصنع أ", "00", "00"],
    ["مصنع ب", "0", "0"],
  ]);
  assert.deepEqual(parseFeed(html, today), []);
});

test("parseFeed uses the median ton price when factories publish it", () => {
  const html = table([
    ["مصنع أ", "24000"],
    ["مصنع ب", "25000"],
    ["مصنع ج", "26500"],
  ]);
  const [quote] = parseFeed(html, today);
  assert.equal(quote.commodity, "feed");
  assert.equal(quote.price, 25000);
  assert.equal(quote.unit, "جنيه/طن");
});

test("parseBoard reads broiler, chick median, corn range and soy", () => {
  const html = `
    <div class="card-title">اللحم الابيض</div><h5 class="h1 x">76</h5><h5 class="h1 y">74</h5>
    <h2 class="t">بورصة الكتاكيت</h2>
    ${table([["شركة أ", "10-04", "30"], ["شركة ب", "10-05", "35"], ["شركة ج", "10-05", "33"]])}
    <h2 class="t">بورصة الدواجن</h2>
    <h2 class="t">اسعار الخامات</h2>
    ${table([
      ["ذرة أرجنتيني", "14500", "10-03"],
      ["ذرة اوكراني", "14000", "10-03"],
      ["ذرة امريكي", "00", "02-15"],
      ["صويا 46%", "26500", "10-03"],
      ["صويا 44%", "25500", "10-03"],
    ])}
    end all price`;
  const quotes = Object.fromEntries(parseBoard(html, today).map((quote) => [quote.commodity, quote]));
  assert.equal(quotes.broiler_kg.price, 76);
  assert.equal(quotes.broiler_kg.buyPrice, 74);
  assert.equal(quotes.chick.price, 33);
  assert.equal(quotes.chick.priceDate, "2026-10-05");
  assert.equal(quotes.corn.price, 14250);
  assert.equal(quotes.corn.buyPrice, 14000);
  assert.equal(quotes.corn.sellPrice, 14500);
  assert.equal(quotes.soy.price, 26500);
  assert.equal(quotes.soy.buyPrice, 25500);
  assert.equal(quotes.feed, undefined);
});

test("parseBoard never dates a quote in the future", () => {
  const html = `<h2 class="t">اسعار الخامات</h2>${table([["ذرة برازيلي", "14500", "12-30"]])}end all price`;
  const [corn] = parseBoard(html, today);
  assert.equal(corn.priceDate, "2025-12-30");
});

test("parseEgyptBoard keeps only published, non-zero rows", () => {
  const html = `آخر تحديث تلقائي: 2026-10-05 ${table([
    ["الصنف", "سعر اليوم"],
    ["اللحم الابيض", "76"],
    ["اللحم الساسو", "113"],
    ["معلن شركات الكتاكيت", "35"],
    ["كتكوت أبيض(قطعان)", "24.5"],
    ["بيض ابيض", "115"],
    ["بيض احمر", "00"],
  ])}`;
  const quotes = Object.fromEntries(parseEgyptBoard(html, "2026-10-06").map((quote) => [quote.commodity, quote]));
  assert.equal(quotes.broiler_kg.price, 76);
  assert.equal(quotes.sasso_kg.price, 113);
  assert.equal(quotes.chick.price, 35);
  assert.equal(quotes.chick_flock.price, 24.5);
  assert.equal(quotes.egg_white.price, 115);
  assert.equal(quotes.egg_red, undefined);
  assert.equal(quotes.broiler_kg.priceDate, "2026-10-05");
  assert.ok(Object.values(quotes).every((quote) => quote.sourceId === "egypoultry"));
});
