import fs from "node:fs";
import pg from "pg";

const base = process.env.APP_URL || "http://127.0.0.1:3000";
const envFile = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const line of envFile.split(/\r?\n/)) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) process.env[match[1]] = match[2];
}

let cookie = "";

async function api(path, { method = "GET", body } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const setCookie = response.headers.getSetCookie?.() || [];
  const raw = setCookie.find((item) => item.startsWith("farm_session="));
  if (raw) cookie = raw.split(";")[0];
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${method} ${path} ${response.status} ${data.error || ""}`);
  return data;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const today = new Date().toISOString().slice(0, 10);

const cycle = await api("/api/cycles", {
  method: "POST",
  body: { name: "دورة اختبار", startDate: today, initialQuantity: 500, chickUnitPrice: 20, poultryType: "تسمين" },
});
const supplier = await api("/api/suppliers", { method: "POST", body: { name: "مورد العلف" } });
const items = await api("/api/inventory");
const feed = items.find((item) => item.category === "feed");
const beforeQty = Number(feed.quantity);
await api("/api/purchases", {
  method: "POST",
  body: { itemId: feed.id, quantity: 10, unitPrice: 25, supplierId: supplier.id, cycleId: cycle.id, paymentMethod: "partial", paidAmount: 100, date: today },
});
const afterItems = await api("/api/inventory");
const afterFeed = afterItems.find((item) => item.id === feed.id);
assert(Number(afterFeed.quantity) === beforeQty + 10, "inventory did not increase");
const supplierAfter = await api(`/api/suppliers/${supplier.id}`);
assert(Number(supplierAfter.remaining) === 150, `supplier debt expected 150 got ${supplierAfter.remaining}`);
await api("/api/payments", { method: "POST", body: { direction: "out", supplierId: supplier.id, amount: 50, paymentDate: today } });
const supplierPaid = await api(`/api/suppliers/${supplier.id}`);
assert(Number(supplierPaid.remaining) === 100, `supplier debt after payment expected 100 got ${supplierPaid.remaining}`);

await api("/api/expenses", { method: "POST", body: { categoryId: "medicine", amount: 300, expenseDate: today, cycleId: cycle.id, paymentMethod: "cash" } });
await api("/api/daily-logs", { method: "POST", body: { cycleId: cycle.id, logDate: today, mortality: 14, averageWeightKg: 1.35, feedConsumed: 2, feedItemId: feed.id, feedUnit: feed.unit } });
const customer = await api("/api/customers", { method: "POST", body: { name: "محمد" } });
const sale = await api("/api/sales", {
  method: "POST",
  body: { cycleId: cycle.id, customerId: customer.id, birdCount: 50, weightKg: 95, pricePerKg: 85, paidAmount: 5000, saleDate: today },
});
assert(Number(sale.total) === 8075, `sale total expected 8075 got ${sale.total}`);
assert(Number(sale.remaining) === 3075, `remaining expected 3075 got ${sale.remaining}`);
const person = await api(`/api/customers/${customer.id}`);
assert(Number(person.remaining) === 3075, "customer debt mismatch");
const stats = await api(`/api/cycles/${cycle.id}/stats`);
assert(stats.current === 436, `birds expected 436 got ${stats.current}`);
assert(stats.mortality === 14, "mortality mismatch");

let rejected = false;
try {
  await api("/api/daily-logs", { method: "POST", body: { cycleId: cycle.id, logDate: today, mortality: 600 } });
} catch {
  rejected = true;
}
assert(rejected, "oversized mortality was accepted");

await api("/api/market-prices", { method: "POST", body: { commodity: "broiler_kg", price: 85, sellPrice: 87, buyPrice: 82, priceDate: today, sourceLabel: "اختبار" } });
const market = await api("/api/market-prices");
const bird = market.items.find((item) => item.id === "broiler_kg");
assert(bird.latest && Number(bird.latest.price) === 85, "market price missing");
const home = await api("/api/dashboard");
assert(home.sellPrice && Number(home.sellPrice.price) === 85, "dashboard price missing");

const article = await api("/api/articles?category=breeding");
assert(article.length > 0, "articles missing");
const opened = await api(`/api/articles/${article[0].slug}`);
assert(opened.title, "article did not open");
const found = await api(`/api/search?q=${encodeURIComponent("حرارة")}`);
assert(found.articles.length > 0, "article search failed");

console.log("FLOWS_OK");

const parsed = new URL(process.env.DATABASE_URL);
const local = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
parsed.searchParams.delete("sslmode");
const client = new pg.Client({
  connectionString: parsed.toString(),
  ssl: local ? false : { rejectUnauthorized: false },
});
await client.connect();
try {
  await client.query("BEGIN");
  await client.query("DELETE FROM payments");
  await client.query("DELETE FROM sales");
  await client.query("DELETE FROM inventory_movements");
  await client.query("DELETE FROM expenses");
  await client.query("DELETE FROM daily_logs");
  await client.query("DELETE FROM health_records");
  await client.query("DELETE FROM market_prices");
  await client.query("DELETE FROM notifications");
  await client.query("DELETE FROM audit_logs");
  await client.query("DELETE FROM customers");
  await client.query("DELETE FROM suppliers");
  await client.query("DELETE FROM cycles");
  await client.query("DELETE FROM article_reads");
  await client.query("DELETE FROM article_bookmarks");
  await client.query("UPDATE inventory_items SET quantity = 0, avg_unit_cost = 0, last_unit_cost = NULL");
  await client.query("UPDATE farms SET password_hash = NULL, name = 'بيت عبد الرحمن', owner_name = 'عبد الرحمن'");
  await client.query("COMMIT");
} finally {
  await client.end();
}
console.log("TEST_DATA_REMOVED");
