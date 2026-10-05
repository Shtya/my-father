import { NextResponse } from "next/server";
import * as farm from "@/lib/farm";

function json(data, status = 200) {
  return NextResponse.json(data, { status });
}

async function dispatch(request, context, method) {
  const { path = [] } = await context.params;
  const url = new URL(request.url);
  const [root, id, action] = path;
  try {
    const body = method === "GET" || method === "DELETE" ? {} : await request.json().catch(() => ({}));
    const filters = {
      cycleId: url.searchParams.get("cycleId"),
      from: url.searchParams.get("from"),
      to: url.searchParams.get("to"),
      q: url.searchParams.get("q"),
      category: url.searchParams.get("category"),
      days: url.searchParams.get("days"),
    };

    if (root === "dashboard" && method === "GET") return json(await farm.dashboard());
    if (root === "insights" && method === "GET") return json({ lines: await farm.insights() });
    if (root === "cycles" && !id && method === "GET") return json(await farm.listCycles());
    if (root === "cycles" && !id && method === "POST") return json(await farm.createCycle(body), 201);
    if (root === "cycles" && id && !action && method === "GET") return json(await farm.getCycleStats(id));
    if (root === "cycles" && id && !action && method === "PATCH") return json(await farm.updateCycle(id, body));
    if (root === "cycles" && id && action === "close" && method === "POST") return json(await farm.closeCycle(id));
    if (root === "cycles" && id && action === "stats" && method === "GET") return json(await farm.getCycleStats(id));
    if (root === "cycles" && id && action === "decision" && method === "GET") return json(await farm.decision(id, filters.days));
    if (root === "daily-logs" && method === "GET") return json(await farm.listDailyLogs(filters.cycleId));
    if (root === "daily-logs" && method === "POST") return json(await farm.saveDailyLog(body), 201);
    if (root === "expenses" && method === "GET") return json(await farm.listExpenses(filters));
    if (root === "expenses" && method === "POST") return json(await farm.createExpense(body), 201);
    if (root === "expense-categories" && method === "GET") return json(await farm.listCategories());
    if (root === "purchases" && method === "POST") return json(await farm.createPurchase(body), 201);
    if (root === "sales" && method === "GET") return json(await farm.listSales(filters));
    if (root === "sales" && method === "POST") return json(await farm.createSale(body), 201);
    if (root === "payments" && method === "POST") return json(await farm.createPayment(body), 201);
    if (root === "customers" && !id && method === "GET") return json(await farm.listCustomers());
    if (root === "customers" && !id && method === "POST") return json(await farm.saveCustomer(body), 201);
    if (root === "customers" && id && method === "GET") return json(await farm.getCustomer(id));
    if (root === "customers" && id && method === "PATCH") return json(await farm.saveCustomer(body, id));
    if (root === "suppliers" && !id && method === "GET") return json(await farm.listSuppliers());
    if (root === "suppliers" && !id && method === "POST") return json(await farm.saveSupplier(body), 201);
    if (root === "suppliers" && id && method === "GET") return json(await farm.getSupplier(id));
    if (root === "suppliers" && id && method === "PATCH") return json(await farm.saveSupplier(body, id));
    if (root === "inventory" && !id && method === "GET") return json(await farm.listInventory());
    if (root === "inventory" && !id && method === "POST") return json(await farm.createInventoryItem(body), 201);
    if (root === "inventory" && id && method === "PATCH") return json(await farm.adjustInventory(id, body));
    if (root === "inventory" && id && method === "DELETE") return json(await farm.deleteInventoryItem(id));
    if (root === "market-prices" && method === "GET") return json(await farm.marketOverview());
    if (root === "market-prices" && method === "POST") return json(await farm.addMarketPrice(body), 201);
    if (root === "health" && method === "GET") return json(await farm.listHealth(filters.cycleId));
    if (root === "health" && method === "POST") return json(await farm.createHealth(body), 201);
    if (root === "articles" && !id && method === "GET") return json(await farm.listArticles(filters));
    if (root === "articles" && id && action === "bookmark" && method === "POST") return json(await farm.toggleBookmark(id));
    if (root === "articles" && id && action === "read" && method === "POST") return json(await farm.markRead(id));
    if (root === "articles" && id && method === "GET") return json(await farm.getArticle(id));
    if (root === "article-categories" && method === "GET") return json(await farm.listArticleCategories());
    if (root === "notifications" && !id && method === "GET") return json(await farm.listNotifications());
    if (root === "notifications" && id === "read" && method === "POST") return json(await farm.markNotificationsRead());
    if (root === "search" && method === "GET") return json(await farm.searchAll(filters.q));
    if (root === "settings" && method === "GET") {
      const record = await farm.getFarm();
      return json({ ...record, password_hash: undefined });
    }
    if (root === "settings" && method === "PATCH") return json(await farm.updateSettings(body));
    if (root === "simulate" && method === "POST") return json(farm.simulate(body));
    if (root === "backup" && method === "GET") {
      const data = await farm.backupData();
      return new NextResponse(JSON.stringify(data, null, 2), {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": "attachment; filename=poultry-backup.json",
        },
      });
    }
    if (root === "reports" && method === "GET") {
      const type = url.searchParams.get("type") || "cycle";
      const report = await farm.buildReport(type, filters);
      if (url.searchParams.get("format") === "csv") {
        return new NextResponse(farm.reportToCsv(report), {
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename=${type}.csv`,
          },
        });
      }
      return json(report);
    }
    return json({ error: "المسار غير موجود" }, 404);
  } catch (error) {
    const status = error.status || 500;
    if (status === 500) console.error(error);
    const message = status === 500 ? "حصل خطأ. حاول مرة تانية." : error.message;
    if (error.code === "23503") return json({ error: "البيانات المرتبطة غير موجودة. راجع الاختيار." }, 400);
    if (error.code === "22P02") return json({ error: "في رقم أو تاريخ غير مفهوم." }, 400);
    return json({ error: message }, status);
  }
}

export function GET(request, context) {
  return dispatch(request, context, "GET");
}
export function POST(request, context) {
  return dispatch(request, context, "POST");
}
export function PATCH(request, context) {
  return dispatch(request, context, "PATCH");
}
export function DELETE(request, context) {
  return dispatch(request, context, "DELETE");
}
