import { query, withTx } from "./db.js";
import { fail } from "./errors.js";
import { ageDays, cairoToday, COMMODITIES, formatTime, percentChange } from "./format.js";
import { fetchBoard } from "./market-live.js";
import { asDate, asInt, asMoney, asQty, cents, mortalityReason, requiredText, text } from "./validate.js";

const SERIOUS_SYMPTOMS = ["دم", "شلل", "نفوق مفاجئ", "إسهال", "خمول", "نهجان", "تنفس"];

async function audit(client, entity, entityId, action, summary) {
  const runner = client?.query ? client : { query };
  await runner.query(
    "INSERT INTO audit_logs (entity, entity_id, action, summary) VALUES ($1, $2, $3, $4)",
    [entity, entityId ? String(entityId) : null, action, summary]
  );
}

export async function getFarm() {
  const result = await query("SELECT id, name, owner_name, currency, password_hash, weight_unit, notify_stock, notify_debt, notify_daily, notify_prices, assumed_daily_gain_grams FROM farms WHERE id = 1");
  return result.rows[0] || null;
}

export async function updateSettings(body) {
  const gain = Number(body.assumedDailyGainGrams);
  if (!Number.isFinite(gain) || gain < 0 || gain > 200) fail("زيادة الوزن اليومية غير صحيحة");
  await query(
    `UPDATE farms SET name = 'بيت عبد الرحمن', owner_name = 'عبد الرحمن', password_hash = NULL,
      assumed_daily_gain_grams = $1, notify_stock = $2, notify_debt = $3, notify_daily = $4,
      notify_prices = $5, updated_at = now() WHERE id = 1`,
    [gain, !!body.notifyStock, !!body.notifyDebt, !!body.notifyDaily, !!body.notifyPrices]
  );
  await audit(null, "farms", "1", "edited", "تعديل الإعدادات");
  return getFarm();
}

async function numbersForCycle(runner, cycleId) {
  const cycleResult = await runner.query("SELECT * FROM cycles WHERE id = $1", [cycleId]);
  const cycle = cycleResult.rows[0];
  if (!cycle) fail("الدورة غير موجودة", 404);
  const mortalityResult = await runner.query(
    "SELECT COALESCE(SUM(mortality), 0)::int AS total FROM daily_logs WHERE cycle_id = $1",
    [cycleId]
  );
  const salesResult = await runner.query(
    `SELECT COALESCE(SUM(bird_count), 0)::int AS birds,
            COALESCE(SUM(weight_kg), 0) AS weight,
            COALESCE(SUM(total_amount), 0) AS total,
            COALESCE(SUM(paid_amount), 0) AS paid
     FROM sales WHERE cycle_id = $1`,
    [cycleId]
  );
  const expenseResult = await runner.query(
    `SELECT COALESCE(SUM(amount), 0) AS total,
            COALESCE(SUM(amount) FILTER (WHERE category_id IN ('feed','corn','soy','clover')), 0) AS feed,
            COALESCE(SUM(amount) FILTER (WHERE category_id IN ('medicine','vaccine','vitamins')), 0) AS medicine
     FROM expenses WHERE cycle_id = $1`,
    [cycleId]
  );
  const weightResult = await runner.query(
    `SELECT average_weight_kg, log_date FROM daily_logs
     WHERE cycle_id = $1 AND average_weight_kg IS NOT NULL
     ORDER BY log_date DESC LIMIT 1`,
    [cycleId]
  );
  const feedResult = await runner.query(
    "SELECT COALESCE(SUM(feed_consumed), 0) AS total FROM daily_logs WHERE cycle_id = $1",
    [cycleId]
  );
  const mortality = Number(mortalityResult.rows[0].total);
  const soldBirds = Number(salesResult.rows[0].birds);
  const current = cycle.initial_quantity - mortality - soldBirds;
  const expenses = Number(expenseResult.rows[0].total);
  const feedCost = Number(expenseResult.rows[0].feed);
  const medicineCost = Number(expenseResult.rows[0].medicine);
  const salesTotal = Number(salesResult.rows[0].total);
  const soldWeight = Number(salesResult.rows[0].weight);
  const avgWeight = weightResult.rows[0] ? Number(weightResult.rows[0].average_weight_kg) : null;
  const liveWeight = avgWeight && current > 0 ? current * avgWeight : null;
  return {
    cycle,
    ageDays: ageDays(cycle.start_date),
    mortality,
    mortalityPercent: cycle.initial_quantity ? (mortality / cycle.initial_quantity) * 100 : 0,
    soldBirds,
    soldWeight,
    current,
    expenses,
    feedCost,
    medicineCost,
    feedShare: expenses ? (feedCost / expenses) * 100 : 0,
    medicineShare: expenses ? (medicineCost / expenses) * 100 : 0,
    salesTotal,
    result: salesTotal - expenses,
    avgWeight,
    feedConsumed: Number(feedResult.rows[0].total),
    costPerBird: current > 0 ? expenses / current : null,
    costPerStartedBird: expenses / cycle.initial_quantity,
    costPerKg: liveWeight ? expenses / liveWeight : null,
    revenuePerKg: soldWeight ? salesTotal / soldWeight : null,
    averageSellingPrice: soldWeight ? salesTotal / soldWeight : null,
  };
}

export async function getCycleStats(cycleId) {
  return numbersForCycle({ query }, cycleId);
}

export async function listCycles() {
  const result = await query("SELECT * FROM cycles ORDER BY status = 'active' DESC, start_date DESC");
  const rows = [];
  for (const cycle of result.rows) rows.push(await getCycleStats(cycle.id));
  return rows;
}

export async function getActiveCycle() {
  const result = await query("SELECT id FROM cycles WHERE status = 'active' ORDER BY start_date DESC LIMIT 1");
  if (!result.rows[0]) return null;
  return getCycleStats(result.rows[0].id);
}

export async function createCycle(body) {
  const name = requiredText(body.name, "اسم الدورة");
  const startDate = asDate(body.startDate || cairoToday());
  const quantity = asInt(body.initialQuantity, "عدد الكتاكيت", { min: 1, max: 100000 });
  const chickPrice = asMoney(body.chickUnitPrice, "سعر الكتكوت");
  const targetWeight = asQty(body.targetWeightKg);
  const expected = body.expectedSellDate ? asDate(body.expectedSellDate) : null;
  return withTx(async (client) => {
    const inserted = await client.query(
      `INSERT INTO cycles
        (name, poultry_type, breed, start_date, expected_sell_date, initial_quantity, chick_supplier, chick_unit_price, location, target_weight_kg, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
      [
        name,
        text(body.poultryType, 40) || "تسمين",
        text(body.breed, 80),
        startDate,
        expected,
        quantity,
        text(body.chickSupplier, 120),
        chickPrice,
        text(body.location, 120),
        targetWeight,
        text(body.notes, 1000),
      ]
    );
    const id = inserted.rows[0].id;
    if (chickPrice && chickPrice > 0) {
      const amount = Math.round(quantity * chickPrice * 100) / 100;
      await client.query(
        `INSERT INTO expenses (cycle_id, category_id, amount, quantity, unit, unit_price, expense_date, payment_method, paid_amount, notes)
         VALUES ($1, 'chicks', $2, $3, 'كتكوت', $4, $5, 'cash', $2, 'شراء الكتاكيت مع بداية الدورة')`,
        [id, amount, quantity, chickPrice, startDate]
      );
    }
    await audit(client, "cycles", id, "created", `دورة جديدة: ${name}`);
    return { id };
  });
}

export async function updateCycle(id, body) {
  const name = requiredText(body.name, "اسم الدورة");
  await query(
    `UPDATE cycles SET name = $1, poultry_type = $2, breed = $3, expected_sell_date = $4,
      location = $5, target_weight_kg = $6, notes = $7, updated_at = now() WHERE id = $8`,
    [
      name,
      text(body.poultryType, 40) || "تسمين",
      text(body.breed, 80),
      body.expectedSellDate ? asDate(body.expectedSellDate) : null,
      text(body.location, 120),
      asQty(body.targetWeightKg),
      text(body.notes, 1000),
      id,
    ]
  );
  await audit(null, "cycles", id, "edited", `تعديل دورة: ${name}`);
  return { id };
}

export async function closeCycle(id) {
  const stats = await getCycleStats(id);
  await query(
    "UPDATE cycles SET status = 'closed', closed_at = $1, updated_at = now() WHERE id = $2",
    [cairoToday(), id]
  );
  await audit(null, "cycles", id, "edited", `إغلاق الدورة: ${stats.cycle.name}`);
  return { id };
}

async function assertBirdCount(client, cycleId, extraMortality = 0, ignoreLogDate = null) {
  await client.query("SELECT id FROM cycles WHERE id = $1 FOR UPDATE", [cycleId]);
  const cycle = await client.query("SELECT initial_quantity FROM cycles WHERE id = $1", [cycleId]);
  if (!cycle.rows[0]) fail("الدورة غير موجودة", 404);
  const mortality = await client.query(
    "SELECT COALESCE(SUM(mortality),0)::int AS total FROM daily_logs WHERE cycle_id = $1 AND ($2::date IS NULL OR log_date <> $2::date)",
    [cycleId, ignoreLogDate]
  );
  const sold = await client.query("SELECT COALESCE(SUM(bird_count),0)::int AS total FROM sales WHERE cycle_id = $1", [cycleId]);
  const current = cycle.rows[0].initial_quantity - Number(mortality.rows[0].total) - Number(sold.rows[0].total) - extraMortality;
  if (current < 0) fail("العدد أكبر من عدد الفراخ الموجودة. راجع الرقم.");
  return current;
}

async function replaceFeedUse(client, logId, { itemId, quantity, unit, date, cycleId }) {
  const oldMoves = await client.query("SELECT id, item_id, quantity FROM inventory_movements WHERE notes = $1", [`daily:${logId}`]);
  for (const move of oldMoves.rows) {
    await client.query("UPDATE inventory_items SET quantity = quantity - $1, updated_at = now() WHERE id = $2", [move.quantity, move.item_id]);
    await client.query("DELETE FROM inventory_movements WHERE id = $1", [move.id]);
  }
  if (!itemId || !quantity) return;
  const item = await client.query("SELECT unit, quantity FROM inventory_items WHERE id = $1 FOR UPDATE", [itemId]);
  if (!item.rows[0]) fail("صنف العلف غير موجود");
  if (unit && item.rows[0].unit !== unit) fail("وحدة العلف مختلفة عن وحدة المخزون. سجّل بنفس الوحدة.");
  if (Number(item.rows[0].quantity) + 0.0001 < quantity) fail("كمية العلف أكبر من المخزون الموجود");
  await client.query("UPDATE inventory_items SET quantity = quantity - $1, updated_at = now() WHERE id = $2", [quantity, itemId]);
  await client.query(
    `INSERT INTO inventory_movements (item_id, cycle_id, movement_type, quantity, movement_date, notes)
     VALUES ($1, $2, 'consume', $3, $4, $5)`,
    [itemId, cycleId, -quantity, date, `daily:${logId}`]
  );
}

export async function saveDailyLog(body) {
  const cycleId = requiredText(body.cycleId, "الدورة");
  const logDate = asDate(body.logDate || cairoToday());
  const mortality = asInt(body.mortality ?? 0, "النفوق", { min: 0, max: 100000 });
  const feed = asQty(body.feedConsumed);
  const weight = asQty(body.averageWeightKg);
  const water = asQty(body.waterLiters);
  const symptoms = text(body.symptoms, 1000);
  return withTx(async (client) => {
    await assertBirdCount(client, cycleId, mortality, logDate);
    const saved = await client.query(
      `INSERT INTO daily_logs
        (cycle_id, log_date, mortality, mortality_reason, feed_consumed, feed_unit, feed_item_id, water_liters, average_weight_kg, medicine_note, vaccination_note, symptoms, observations, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       ON CONFLICT (cycle_id, log_date) DO UPDATE SET
        mortality = EXCLUDED.mortality,
        mortality_reason = EXCLUDED.mortality_reason,
        feed_consumed = EXCLUDED.feed_consumed,
        feed_unit = EXCLUDED.feed_unit,
        feed_item_id = EXCLUDED.feed_item_id,
        water_liters = EXCLUDED.water_liters,
        average_weight_kg = EXCLUDED.average_weight_kg,
        medicine_note = EXCLUDED.medicine_note,
        vaccination_note = EXCLUDED.vaccination_note,
        symptoms = EXCLUDED.symptoms,
        observations = EXCLUDED.observations,
        notes = EXCLUDED.notes,
        updated_at = now()
       RETURNING id`,
      [
        cycleId,
        logDate,
        mortality,
        mortalityReason(body.mortalityReason),
        feed,
        text(body.feedUnit, 20),
        body.feedItemId || null,
        water,
        weight,
        text(body.medicineNote, 300),
        text(body.vaccinationNote, 300),
        symptoms,
        text(body.observations, 1000),
        text(body.notes, 1000),
      ]
    );
    await replaceFeedUse(client, saved.rows[0].id, {
      itemId: body.feedItemId || null,
      quantity: feed,
      unit: text(body.feedUnit, 20),
      date: logDate,
      cycleId,
    });
    await audit(client, "daily_logs", saved.rows[0].id, "edited", `متابعة يوم ${logDate}`);
    return {
      id: saved.rows[0].id,
      vetNotice: symptoms ? SERIOUS_SYMPTOMS.some((word) => symptoms.includes(word)) : false,
    };
  });
}

export async function listDailyLogs(cycleId) {
  const result = await query(
    "SELECT * FROM daily_logs WHERE cycle_id = $1 ORDER BY log_date DESC LIMIT 60",
    [cycleId]
  );
  return result.rows;
}

export async function createExpense(body) {
  const categoryId = requiredText(body.categoryId, "نوع المصروف");
  const expenseDate = asDate(body.expenseDate || cairoToday());
  const quantity = asQty(body.quantity);
  const unitPrice = asMoney(body.unitPrice, "سعر الوحدة");
  let amount = asMoney(body.amount, "المبلغ");
  if (quantity && unitPrice !== null) amount = Math.round(quantity * unitPrice * 100) / 100;
  if (amount === null || amount <= 0) fail("اكتب المبلغ");
  const method = ["cash", "credit", "partial"].includes(body.paymentMethod) ? body.paymentMethod : "cash";
  let paid = method === "cash" ? amount : asMoney(body.paidAmount, "المدفوع") || 0;
  if (method === "credit") paid = Math.min(paid, amount);
  if (cents(paid) > cents(amount)) fail("المدفوع أكبر من مبلغ المصروف");
  const supplierId = await ensureSupplier(body.supplierId, body.supplierName);
  const inserted = await query(
    `INSERT INTO expenses
      (cycle_id, category_id, supplier_id, amount, quantity, unit, unit_price, expense_date, payment_method, paid_amount, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
    [
      body.cycleId || null,
      categoryId,
      supplierId,
      amount,
      quantity,
      text(body.unit, 20),
      unitPrice,
      expenseDate,
      method,
      paid,
      text(body.notes, 1000),
    ]
  );
  await audit(null, "expenses", inserted.rows[0].id, "created", `مصروف ${amount}`);
  return { id: inserted.rows[0].id, amount };
}

async function ensureSupplier(id, name) {
  if (id) return id;
  const clean = text(name, 120);
  if (!clean) return null;
  const existing = await query("SELECT id FROM suppliers WHERE name = $1 LIMIT 1", [clean]);
  if (existing.rows[0]) return existing.rows[0].id;
  const created = await query("INSERT INTO suppliers (name) VALUES ($1) RETURNING id", [clean]);
  await audit(null, "suppliers", created.rows[0].id, "created", `مورد: ${clean}`);
  return created.rows[0].id;
}

async function ensureCustomer(id, name) {
  if (id) return id;
  const clean = text(name, 120);
  if (!clean) return null;
  const existing = await query("SELECT id FROM customers WHERE name = $1 LIMIT 1", [clean]);
  if (existing.rows[0]) return existing.rows[0].id;
  const created = await query("INSERT INTO customers (name) VALUES ($1) RETURNING id", [clean]);
  await audit(null, "customers", created.rows[0].id, "created", `عميل: ${clean}`);
  return created.rows[0].id;
}

export async function createPurchase(body) {
  const itemId = requiredText(body.itemId, "الصنف");
  const quantity = asQty(body.quantity, { required: true });
  if (!quantity) fail("اكتب الكمية");
  const unitPrice = asMoney(body.unitPrice, "سعر الوحدة", { required: true });
  const amount = Math.round(quantity * unitPrice * 100) / 100;
  const date = asDate(body.date || cairoToday());
  const method = ["cash", "credit", "partial"].includes(body.paymentMethod) ? body.paymentMethod : "cash";
  let paid = method === "cash" ? amount : asMoney(body.paidAmount, "المدفوع") || 0;
  if (cents(paid) > cents(amount)) fail("المدفوع أكبر من الإجمالي");
  const supplierId = await ensureSupplier(body.supplierId, body.supplierName);
  return withTx(async (client) => {
    const item = await client.query("SELECT * FROM inventory_items WHERE id = $1 FOR UPDATE", [itemId]);
    if (!item.rows[0]) fail("الصنف غير موجود", 404);
    const category = ["feed", "corn", "soy", "clover", "bran"].includes(item.rows[0].category) ? item.rows[0].category : "other";
    const expense = await client.query(
      `INSERT INTO expenses
        (cycle_id, category_id, supplier_id, amount, quantity, unit, unit_price, expense_date, payment_method, paid_amount, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
      [body.cycleId || null, category === "bran" ? "other" : category, supplierId, amount, quantity, item.rows[0].unit, unitPrice, date, method, paid, text(body.notes, 500) || `شراء ${item.rows[0].name}`]
    );
    const oldQty = Number(item.rows[0].quantity);
    const newQty = Math.round((oldQty + quantity) * 1000) / 1000;
    const avg = Math.round(((oldQty * Number(item.rows[0].avg_unit_cost) + quantity * unitPrice) / newQty) * 100) / 100;
    await client.query(
      "UPDATE inventory_items SET quantity = $1, avg_unit_cost = $2, last_unit_cost = $3, supplier_id = COALESCE($4, supplier_id), updated_at = now() WHERE id = $5",
      [newQty, avg, unitPrice, supplierId, itemId]
    );
    await client.query(
      `INSERT INTO inventory_movements (item_id, cycle_id, expense_id, movement_type, quantity, unit_cost, movement_date, notes)
       VALUES ($1,$2,$3,'purchase',$4,$5,$6,$7)`,
      [itemId, body.cycleId || null, expense.rows[0].id, quantity, unitPrice, date, text(body.notes, 300)]
    );
    await audit(client, "purchases", expense.rows[0].id, "created", `شراء ${quantity} ${item.rows[0].unit} ${item.rows[0].name}`);
    return { id: expense.rows[0].id, amount, quantity: newQty };
  });
}

export async function createSale(body) {
  const cycleId = requiredText(body.cycleId, "الدورة");
  const birds = asInt(body.birdCount, "عدد الفراخ", { min: 1 });
  const weight = asQty(body.weightKg, { required: true });
  if (!weight) fail("اكتب الوزن");
  const price = asMoney(body.pricePerKg, "سعر الكيلو", { required: true });
  const total = Math.round(weight * price * 100) / 100;
  const paid = asMoney(body.paidAmount, "المدفوع") || 0;
  if (cents(paid) > cents(total)) fail("المدفوع أكبر من الإجمالي");
  const date = asDate(body.saleDate || cairoToday());
  const customerId = await ensureCustomer(body.customerId, body.customerName);
  return withTx(async (client) => {
    const current = await assertBirdCount(client, cycleId, 0, null);
    if (birds > current) fail("العدد أكبر من عدد الفراخ الموجودة. راجع الرقم.");
    const sale = await client.query(
      `INSERT INTO sales (cycle_id, customer_id, sale_date, bird_count, weight_kg, price_per_kg, total_amount, paid_amount, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
      [cycleId, customerId, date, birds, weight, price, total, paid, text(body.notes, 500)]
    );
    if (paid > 0) {
      await client.query(
        `INSERT INTO payments (direction, customer_id, sale_id, amount, payment_date, notes)
         VALUES ('in', $1, $2, $3, $4, 'دفعة مع البيع')`,
        [customerId, sale.rows[0].id, paid, date]
      );
    }
    await audit(client, "sales", sale.rows[0].id, "created", `بيع ${birds} طائر`);
    return { id: sale.rows[0].id, total, remaining: Math.round((total - paid) * 100) / 100 };
  });
}

export async function createPayment(body) {
  const amount = asMoney(body.amount, "مبلغ الدفعة", { required: true });
  if (!amount) fail("اكتب مبلغ الدفعة");
  const date = asDate(body.paymentDate || cairoToday());
  const direction = body.direction === "out" ? "out" : "in";
  return withTx(async (client) => {
    if (direction === "in") {
      const customerId = requiredText(body.customerId, "العميل");
      const sales = await client.query(
        `SELECT id, total_amount, paid_amount FROM sales
         WHERE customer_id = $1 AND paid_amount < total_amount
         ORDER BY sale_date, created_at FOR UPDATE`,
        [customerId]
      );
      const remaining = sales.rows.reduce((sum, row) => sum + Number(row.total_amount) - Number(row.paid_amount), 0);
      if (cents(amount) > cents(remaining)) fail("المبلغ أكبر من الفلوس المتبقية عند العميل");
      let left = amount;
      for (const sale of sales.rows) {
        if (left <= 0) break;
        const due = Number(sale.total_amount) - Number(sale.paid_amount);
        const take = Math.min(due, left);
        await client.query("UPDATE sales SET paid_amount = paid_amount + $1, updated_at = now() WHERE id = $2", [take, sale.id]);
        await client.query(
          `INSERT INTO payments (direction, customer_id, sale_id, amount, payment_date, notes) VALUES ('in',$1,$2,$3,$4,$5)`,
          [customerId, sale.id, take, date, text(body.notes, 300)]
        );
        left = Math.round((left - take) * 100) / 100;
      }
      await audit(client, "payments", customerId, "created", `تحصيل ${amount}`);
      return { ok: true };
    }
    const supplierId = requiredText(body.supplierId, "المورد");
    const expenses = await client.query(
      `SELECT id, amount, paid_amount FROM expenses
       WHERE supplier_id = $1 AND paid_amount < amount
       ORDER BY expense_date, created_at FOR UPDATE`,
      [supplierId]
    );
    const remaining = expenses.rows.reduce((sum, row) => sum + Number(row.amount) - Number(row.paid_amount), 0);
    if (cents(amount) > cents(remaining)) fail("المبلغ أكبر من الفلوس اللي علينا للمورد");
    let left = amount;
    for (const expense of expenses.rows) {
      if (left <= 0) break;
      const due = Number(expense.amount) - Number(expense.paid_amount);
      const take = Math.min(due, left);
      await client.query("UPDATE expenses SET paid_amount = paid_amount + $1, updated_at = now() WHERE id = $2", [take, expense.id]);
      await client.query(
        `INSERT INTO payments (direction, supplier_id, expense_id, amount, payment_date, notes) VALUES ('out',$1,$2,$3,$4,$5)`,
        [supplierId, expense.id, take, date, text(body.notes, 300)]
      );
      left = Math.round((left - take) * 100) / 100;
    }
    await audit(client, "payments", supplierId, "created", `سداد ${amount}`);
    return { ok: true };
  });
}

export async function listExpenses({ cycleId, from, to } = {}) {
  const result = await query(
    `SELECT e.*, c.name_ar AS category_name, s.name AS supplier_name, cy.name AS cycle_name
     FROM expenses e
     JOIN expense_categories c ON c.id = e.category_id
     LEFT JOIN suppliers s ON s.id = e.supplier_id
     LEFT JOIN cycles cy ON cy.id = e.cycle_id
     WHERE ($1::uuid IS NULL OR e.cycle_id = $1)
       AND ($2::date IS NULL OR e.expense_date >= $2)
       AND ($3::date IS NULL OR e.expense_date <= $3)
     ORDER BY e.expense_date DESC, e.created_at DESC
     LIMIT 200`,
    [cycleId || null, from || null, to || null]
  );
  return result.rows;
}

export async function listSales({ cycleId, from, to } = {}) {
  const result = await query(
    `SELECT s.*, cu.name AS customer_name, cy.name AS cycle_name
     FROM sales s
     LEFT JOIN customers cu ON cu.id = s.customer_id
     JOIN cycles cy ON cy.id = s.cycle_id
     WHERE ($1::uuid IS NULL OR s.cycle_id = $1)
       AND ($2::date IS NULL OR s.sale_date >= $2)
       AND ($3::date IS NULL OR s.sale_date <= $3)
     ORDER BY s.sale_date DESC, s.created_at DESC
     LIMIT 200`,
    [cycleId || null, from || null, to || null]
  );
  return result.rows;
}

export async function listCustomers() {
  const result = await query(
    `SELECT c.*,
       COALESCE(SUM(s.total_amount), 0) AS total_amount,
       COALESCE(SUM(s.paid_amount), 0) AS paid_amount,
       COALESCE(SUM(s.total_amount - s.paid_amount), 0) AS remaining,
       MAX(s.sale_date) AS last_date
     FROM customers c
     LEFT JOIN sales s ON s.customer_id = c.id
     GROUP BY c.id
     ORDER BY remaining DESC, c.name`
  );
  return result.rows;
}

export async function getCustomer(id) {
  const people = await listCustomers();
  const person = people.find((row) => row.id === id);
  if (!person) fail("العميل غير موجود", 404);
  const sales = await query("SELECT * FROM sales WHERE customer_id = $1 ORDER BY sale_date DESC", [id]);
  const payments = await query("SELECT * FROM payments WHERE customer_id = $1 ORDER BY payment_date DESC", [id]);
  return { ...person, sales: sales.rows, payments: payments.rows };
}

export async function saveCustomer(body, id = null) {
  const name = requiredText(body.name, "اسم العميل");
  if (id) {
    await query("UPDATE customers SET name = $1, phone = $2, notes = $3, updated_at = now() WHERE id = $4", [name, text(body.phone, 30), text(body.notes, 500), id]);
    await audit(null, "customers", id, "edited", name);
    return { id };
  }
  const created = await query("INSERT INTO customers (name, phone, notes) VALUES ($1,$2,$3) RETURNING id", [name, text(body.phone, 30), text(body.notes, 500)]);
  await audit(null, "customers", created.rows[0].id, "created", name);
  return { id: created.rows[0].id };
}

export async function listSuppliers() {
  const result = await query(
    `SELECT s.*,
       COALESCE(SUM(e.amount), 0) AS total_amount,
       COALESCE(SUM(e.paid_amount), 0) AS paid_amount,
       COALESCE(SUM(e.amount - e.paid_amount), 0) AS remaining,
       MAX(e.expense_date) AS last_date
     FROM suppliers s
     LEFT JOIN expenses e ON e.supplier_id = s.id
     GROUP BY s.id
     ORDER BY remaining DESC, s.name`
  );
  return result.rows;
}

export async function getSupplier(id) {
  const rows = await listSuppliers();
  const person = rows.find((row) => row.id === id);
  if (!person) fail("المورد غير موجود", 404);
  const expenses = await query(
    `SELECT e.*, c.name_ar AS category_name FROM expenses e
     JOIN expense_categories c ON c.id = e.category_id
     WHERE e.supplier_id = $1 ORDER BY e.expense_date DESC`,
    [id]
  );
  return { ...person, expenses: expenses.rows };
}

export async function saveSupplier(body, id = null) {
  const name = requiredText(body.name, "اسم المورد");
  if (id) {
    await query("UPDATE suppliers SET name = $1, phone = $2, products = $3, notes = $4, updated_at = now() WHERE id = $5", [name, text(body.phone, 30), text(body.products, 200), text(body.notes, 500), id]);
    await audit(null, "suppliers", id, "edited", name);
    return { id };
  }
  const created = await query("INSERT INTO suppliers (name, phone, products, notes) VALUES ($1,$2,$3,$4) RETURNING id", [name, text(body.phone, 30), text(body.products, 200), text(body.notes, 500)]);
  await audit(null, "suppliers", created.rows[0].id, "created", name);
  return { id: created.rows[0].id };
}

export async function listInventory() {
  const result = await query("SELECT * FROM inventory_items ORDER BY name");
  return result.rows;
}

export async function adjustInventory(id, body) {
  const quantity = asQty(body.quantity, { required: true });
  return withTx(async (client) => {
    const item = await client.query("SELECT * FROM inventory_items WHERE id = $1 FOR UPDATE", [id]);
    if (!item.rows[0]) fail("الصنف غير موجود", 404);
    const delta = Math.round((quantity - Number(item.rows[0].quantity)) * 1000) / 1000;
    await client.query("UPDATE inventory_items SET quantity = $1, updated_at = now() WHERE id = $2", [quantity, id]);
    await client.query(
      `INSERT INTO inventory_movements (item_id, movement_type, quantity, movement_date, notes)
       VALUES ($1, 'adjust', $2, $3, $4)`,
      [id, delta, cairoToday(), text(body.notes, 300) || "تعديل كمية"]
    );
    await audit(client, "inventory", id, "edited", `تعديل كمية ${item.rows[0].name}`);
    return { quantity };
  });
}

export async function createInventoryItem(body) {
  const name = requiredText(body.name, "الاسم");
  const unit = text(body.unit, 20) || "كجم";
  const quantity = asQty(body.quantity) ?? 0;
  const category = ["feed", "corn", "soy", "bran", "clover", "other"].includes(body.category) ? body.category : "other";
  const inserted = await query(
    `INSERT INTO inventory_items (name, category, unit, quantity, min_quantity)
     VALUES ($1,$2,$3,$4,0) RETURNING id`,
    [name, category, unit, quantity]
  );
  if (quantity > 0) {
    await query(
      `INSERT INTO inventory_movements (item_id, movement_type, quantity, movement_date, notes)
       VALUES ($1, 'adjust', $2, $3, 'رصيد أول')`,
      [inserted.rows[0].id, quantity, cairoToday()]
    );
  }
  await audit(null, "inventory", inserted.rows[0].id, "created", name);
  return { id: inserted.rows[0].id };
}

export async function deleteInventoryItem(id) {
  const item = await query("SELECT name FROM inventory_items WHERE id = $1", [id]);
  if (!item.rows[0]) fail("الصنف غير موجود", 404);
  await query("DELETE FROM inventory_items WHERE id = $1", [id]);
  await audit(null, "inventory", id, "deleted", item.rows[0].name);
  return { ok: true };
}

export async function listCategories() {
  const result = await query("SELECT * FROM expense_categories ORDER BY sort_order");
  return result.rows;
}

export function commodityCatalog() {
  return COMMODITIES;
}

export async function addMarketPrice(body) {
  const commodity = COMMODITIES.find((item) => item.id === body.commodity);
  if (!commodity) fail("نوع السعر غير معروف");
  const price = asMoney(body.price, "السعر", { required: true });
  const buy = asMoney(body.buyPrice, "سعر الشراء");
  const sell = asMoney(body.sellPrice, "سعر البيع");
  const date = asDate(body.priceDate || cairoToday());
  const sourceLabel = text(body.sourceLabel, 120) || "إدخال يدوي";
  const inserted = await query(
    `INSERT INTO market_prices
      (commodity, label_ar, category, price, buy_price, sell_price, unit, source_id, source_label, confidence, price_date)
     VALUES ($1,$2,$3,$4,$5,$6,$7,'manual',$8,'manual',$9) RETURNING *`,
    [commodity.id, commodity.label, commodity.category, price, buy, sell, commodity.unit, sourceLabel, date]
  );
  await audit(null, "market_prices", inserted.rows[0].id, "created", `${commodity.label}: ${price}`);
  return inserted.rows[0];
}

async function priceHistory(commodity, sourceId) {
  const result = await query(
    `SELECT price, buy_price, sell_price, unit, source_label, source_id, confidence, price_date, recorded_at, label_ar, category
     FROM market_prices WHERE commodity = $1 AND source_id = $2
     ORDER BY price_date DESC, recorded_at DESC LIMIT 60`,
    [commodity, sourceId]
  );
  if (!result.rows[0]) {
    const other = await query(
      `SELECT price, buy_price, sell_price, unit, source_label, source_id, confidence, price_date, recorded_at
       FROM market_prices WHERE commodity = $1 AND source_id <> $2
       ORDER BY recorded_at DESC LIMIT 1`,
      [commodity, sourceId]
    );
    return { latest: other.rows[0] || null, filledFrom: other.rows[0]?.source_id || null, weekChange: null, monthChange: null, points: [] };
  }
  const rows = result.rows;
  const latest = rows[0] || null;
  if (!latest) return { latest: null, week: null, month: null, points: [] };
  const week = rows.find((row) => row.price_date <= shiftDate(latest.price_date, -7)) || null;
  const month = rows.find((row) => row.price_date <= shiftDate(latest.price_date, -30)) || null;
  return {
    latest,
    filledFrom: null,
    weekAgo: week,
    monthAgo: month,
    weekChange: week ? percentChange(latest.price, week.price) : null,
    monthChange: month ? percentChange(latest.price, month.price) : null,
    points: [...rows].reverse().slice(-14),
  };
}

function shiftDate(value, days) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

const MARKET_BOARDS = [
  { id: "elmorshd", name: "المرشد للدواجن" },
  { id: "egypoultry", name: "دواجن مصر" },
];
const MARKET_REFRESH_MS = 2 * 60 * 1000;

let marketSync = null;

export async function syncMarket() {
  if (!marketSync) {
    marketSync = syncMarketNow().finally(() => {
      marketSync = null;
    });
  }
  return marketSync;
}

async function syncMarketNow() {
  await query(
    `INSERT INTO market_sources (id, name_ar, kind, notes) VALUES
      ('elmorshd', 'المرشد للدواجن', 'external', 'بورصة الدواجن اليومية في مصر'),
      ('egypoultry', 'دواجن مصر', 'external', 'بورصة دواجن مصر للفراخ والكتاكيت')
     ON CONFLICT (id) DO NOTHING`
  );
  const clocks = globalThis.__marketClocks || {};
  globalThis.__marketClocks = clocks;
  const today = cairoToday();
  let saved = 0;
  for (const board of MARKET_BOARDS) {
    if (clocks[board.id] && Date.now() - clocks[board.id] < MARKET_REFRESH_MS) continue;
    try {
      const quotes = await fetchBoard(board.id, today);
      clocks[board.id] = Date.now();
      for (const quote of quotes) {
        const current = await query(
          `SELECT price, price_date::text AS price_date FROM market_prices
           WHERE commodity = $1 AND source_id = $2
           ORDER BY recorded_at DESC LIMIT 1`,
          [quote.commodity, board.id]
        );
        const row = current.rows[0];
        if (row && Math.abs(Number(row.price) - Number(quote.price)) < 0.05 && String(row.price_date).slice(0, 10) === quote.priceDate) continue;
        const commodity = COMMODITIES.find((item) => item.id === quote.commodity);
        await query(
          `INSERT INTO market_prices
            (commodity, label_ar, category, price, buy_price, sell_price, unit, source_id, source_label, confidence, price_date)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'external',$10)`,
          [
            quote.commodity,
            commodity?.label || quote.commodity,
            commodity?.category || "feed",
            quote.price,
            quote.buyPrice || null,
            quote.sellPrice || null,
            quote.unit,
            board.id,
            quote.sourceLabel,
            quote.priceDate,
          ]
        );
        saved += 1;
      }
    } catch {
      clocks[board.id] = 0;
    }
  }
  return { saved };
}

export async function marketOverview(sourceId = "elmorshd") {
  const active = MARKET_BOARDS.some((board) => board.id === sourceId) ? sourceId : "elmorshd";
  let live = true;
  try {
    await syncMarket();
  } catch {
    live = false;
  }
  const items = [];
  for (const commodity of COMMODITIES) {
    const history = await priceHistory(commodity.id, active);
    const filled = MARKET_BOARDS.find((board) => board.id === history.filledFrom);
    items.push({ ...commodity, ...history, filledFromName: filled?.name || "" });
  }
  const latestStamp = items.map((item) => item.filledFrom ? null : item.latest?.recorded_at).filter(Boolean).sort().at(-1) || null;
  const board = MARKET_BOARDS.find((item) => item.id === active);
  const when = latestStamp ? formatTime(latestStamp) : "";
  return {
    items,
    latestStamp,
    sources: MARKET_BOARDS,
    activeSource: active,
    statusLine: live
      ? `بورصة ${board.name}. بتتحدث كل دقيقتين.${when ? ` آخر تحديث كان ${when}.` : ""}`
      : `بورصة ${board.name}. آخر سعر محفوظ، والتحديث متعطل دلوقتي.`,
  };
}

export async function createHealth(body) {
  const title = requiredText(body.title, "الاسم");
  const symptoms = text(body.symptoms, 1000);
  const recordType = ["medicine", "vaccine", "symptom", "note"].includes(body.recordType) ? body.recordType : "note";
  const inserted = await query(
    `INSERT INTO health_records (cycle_id, record_date, record_type, title, dosage, reason, cost, symptoms, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
    [
      body.cycleId || null,
      asDate(body.recordDate || cairoToday()),
      recordType,
      title,
      text(body.dosage, 120),
      text(body.reason, 200),
      asMoney(body.cost, "التكلفة"),
      symptoms,
      text(body.notes, 1000),
    ]
  );
  if (body.cost && Number(body.cost) > 0 && body.cycleId) {
    const category = recordType === "vaccine" ? "vaccine" : "medicine";
    await query(
      `INSERT INTO expenses (cycle_id, category_id, amount, expense_date, payment_method, paid_amount, notes)
       VALUES ($1,$2,$3,$4,'cash',$3,$5)`,
      [body.cycleId, category, asMoney(body.cost, "التكلفة"), asDate(body.recordDate || cairoToday()), title]
    );
  }
  await audit(null, "health_records", inserted.rows[0].id, "created", title);
  const blob = `${symptoms || ""} ${text(body.notes, 1000) || ""} ${text(body.reason, 200) || ""}`;
  return {
    id: inserted.rows[0].id,
    vetNotice: SERIOUS_SYMPTOMS.some((word) => blob.includes(word)),
  };
}

export async function listHealth(cycleId) {
  const result = await query(
    `SELECT * FROM health_records
     WHERE ($1::uuid IS NULL OR cycle_id = $1)
     ORDER BY record_date DESC LIMIT 100`,
    [cycleId || null]
  );
  return result.rows;
}

export async function listArticles({ category, q } = {}) {
  const result = await query(
    `SELECT a.*, c.name_ar AS category_name,
       EXISTS(SELECT 1 FROM article_bookmarks b WHERE b.article_id = a.id) AS bookmarked
     FROM articles a
     JOIN article_categories c ON c.id = a.category_id
     WHERE ($1::text IS NULL OR a.category_id = $1)
       AND ($2::text IS NULL OR a.title ILIKE $2 OR a.summary ILIKE $2 OR a.content ILIKE $2)
     ORDER BY c.sort_order, a.title`,
    [category || null, q ? `%${q}%` : null]
  );
  return result.rows;
}

export async function getArticle(slug) {
  const result = await query(
    `SELECT a.*, c.name_ar AS category_name,
       EXISTS(SELECT 1 FROM article_bookmarks b WHERE b.article_id = a.id) AS bookmarked
     FROM articles a JOIN article_categories c ON c.id = a.category_id
     WHERE a.slug = $1`,
    [slug]
  );
  if (!result.rows[0]) fail("المقال غير موجود", 404);
  const related = await query(
    "SELECT slug, title FROM articles WHERE category_id = $1 AND slug <> $2 LIMIT 3",
    [result.rows[0].category_id, slug]
  );
  return { ...result.rows[0], related: related.rows };
}

export async function listArticleCategories() {
  const result = await query("SELECT * FROM article_categories ORDER BY sort_order");
  return result.rows;
}

export async function toggleBookmark(slug) {
  const article = await query("SELECT id FROM articles WHERE slug = $1", [slug]);
  if (!article.rows[0]) fail("المقال غير موجود", 404);
  const existing = await query("SELECT 1 FROM article_bookmarks WHERE article_id = $1", [article.rows[0].id]);
  if (existing.rows[0]) {
    await query("DELETE FROM article_bookmarks WHERE article_id = $1", [article.rows[0].id]);
    return { bookmarked: false };
  }
  await query("INSERT INTO article_bookmarks (article_id) VALUES ($1)", [article.rows[0].id]);
  return { bookmarked: true };
}

export async function markRead(slug) {
  const article = await query("SELECT id FROM articles WHERE slug = $1", [slug]);
  if (!article.rows[0]) return { ok: false };
  await query(
    `INSERT INTO article_reads (article_id, read_at) VALUES ($1, now())
     ON CONFLICT (article_id) DO UPDATE SET read_at = now()`,
    [article.rows[0].id]
  );
  return { ok: true };
}

export async function recentReads() {
  const result = await query(
    `SELECT a.slug, a.title, r.read_at FROM article_reads r
     JOIN articles a ON a.id = r.article_id
     ORDER BY r.read_at DESC LIMIT 5`
  );
  return result.rows;
}

async function feedCoverage(cycleId) {
  const logs = await query(
    `SELECT feed_consumed, feed_unit, feed_item_id FROM daily_logs
     WHERE cycle_id = $1 AND feed_consumed > 0 AND feed_item_id IS NOT NULL
     ORDER BY log_date DESC LIMIT 7`,
    [cycleId]
  );
  if (logs.rows.length < 1) return null;
  const key = `${logs.rows[0].feed_item_id}|${logs.rows[0].feed_unit}`;
  if (logs.rows.some((row) => `${row.feed_item_id}|${row.feed_unit}` !== key)) return null;
  const avg = logs.rows.reduce((sum, row) => sum + Number(row.feed_consumed), 0) / logs.rows.length;
  if (avg <= 0) return null;
  const item = await query("SELECT name, quantity, unit FROM inventory_items WHERE id = $1", [logs.rows[0].feed_item_id]);
  if (!item.rows[0] || item.rows[0].unit !== logs.rows[0].feed_unit) return null;
  return {
    name: item.rows[0].name,
    quantity: Number(item.rows[0].quantity),
    unit: item.rows[0].unit,
    days: Number(item.rows[0].quantity) / avg,
  };
}

async function mortalityTrend(cycleId) {
  const today = cairoToday();
  const result = await query(
    `SELECT
       COALESCE(SUM(mortality) FILTER (WHERE log_date > $2::date - 7 AND log_date <= $2::date), 0)::int AS this_week,
       COALESCE(SUM(mortality) FILTER (WHERE log_date > $2::date - 14 AND log_date <= $2::date - 7), 0)::int AS last_week
     FROM daily_logs WHERE cycle_id = $1`,
    [cycleId, today]
  );
  return result.rows[0];
}

export async function refreshNotifications() {
  const farm = await getFarm();
  const active = await getActiveCycle();
  const today = cairoToday();
  const alerts = [];
  if (farm.notify_daily && active) {
    const log = await query("SELECT 1 FROM daily_logs WHERE cycle_id = $1 AND log_date = $2", [active.cycle.id, today]);
    if (!log.rows[0]) {
      alerts.push({
        kind: "daily",
        title: "متابعة النهارده لسه متتسجلتش",
        body: "سجّل عدد النافق والعلف والوزن لو قدرتش.",
        href: "/log",
        dedupe: `daily:${active.cycle.id}:${today}`,
      });
    }
  }
  if (active && farm.notify_stock) {
    const cover = await feedCoverage(active.cycle.id);
    if (cover && cover.days <= 4) {
      alerts.push({
        kind: "stock",
        title: "مخزون العلف قرب يخلّص",
        body: `${cover.name} يكفي تقريبًا ${Math.max(0, Math.floor(cover.days))} أيام حسب متوسط الاستهلاك.`,
        href: "/inventory",
        dedupe: `stock:${active.cycle.id}`,
      });
    }
  }
  if (farm.notify_debt) {
    const debts = await query(
      `SELECT c.name, SUM(s.total_amount - s.paid_amount) AS remaining
       FROM sales s JOIN customers c ON c.id = s.customer_id
       GROUP BY c.id HAVING SUM(s.total_amount - s.paid_amount) >= 1
       ORDER BY remaining DESC LIMIT 3`
    );
    for (const debt of debts.rows) {
      alerts.push({
        kind: "debt",
        title: "فلوس عند الناس",
        body: `${debt.name} عليه ${Math.round(Number(debt.remaining))} جنيه.`,
        href: "/customers",
        dedupe: `debt:${debt.name}:${Math.round(Number(debt.remaining))}`,
      });
    }
  }
  if (active) {
    const trend = await mortalityTrend(active.cycle.id);
    if (Number(trend.this_week) >= 3 && Number(trend.this_week) > Number(trend.last_week) * 1.5) {
      alerts.push({
        kind: "mortality",
        title: "النفوق زاد هذا الأسبوع",
        body: `نافق ${trend.this_week} هذا الأسبوع، مقابل ${trend.last_week} الأسبوع السابق. لو الزيادة مستمرة كلم الطبيب البيطري.`,
        href: "/health",
        dedupe: `mortality:${active.cycle.id}:${today.slice(0, 7)}`,
      });
    }
    if (active.cycle.expected_sell_date) {
      const days = ageDays(today) - ageDays(active.cycle.expected_sell_date);
      const until = Math.round((new Date(`${active.cycle.expected_sell_date}T00:00:00Z`) - new Date(`${today}T00:00:00Z`)) / 86400000);
      if (until >= 0 && until <= 3) {
        alerts.push({
          kind: "sell",
          title: "ميعاد البيع المتوقع قرب",
          body: until === 0 ? "ميعاد البيع المتوقع النهارده." : `ميعاد البيع المتوقع بعد ${until} أيام.`,
          href: `/cycle/${active.cycle.id}`,
          dedupe: `sell:${active.cycle.id}:${active.cycle.expected_sell_date}`,
        });
      }
      void days;
    }
  }
  if (farm.notify_prices) {
    const feed = await priceHistory("feed");
    if (feed.weekChange !== null && feed.weekChange >= 5) {
      alerts.push({
        kind: "price",
        title: "سعر العلف طالع",
        body: `سعر العلف ارتفع حوالي ${Math.round(feed.weekChange)}% مقارنة بسعر أقدم من أسبوع، حسب الأسعار اللي سجلتها.`,
        href: "/market",
        dedupe: `price:feed:${feed.latest.price_date}`,
      });
    }
    const bird = await priceHistory("broiler_kg");
    if (bird.weekChange !== null && bird.weekChange <= -5) {
      alerts.push({
        kind: "price",
        title: "سعر البيع نازل",
        body: `سعر الكيلو انخفض حوالي ${Math.abs(Math.round(bird.weekChange))}% مقارنة بسعر أقدم من أسبوع.`,
        href: "/market",
        dedupe: `price:broiler:${bird.latest.price_date}`,
      });
    }
  }
  for (const alert of alerts) {
    await query(
      `INSERT INTO notifications (kind, title, body, href, dedupe_key)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (dedupe_key) DO UPDATE SET title = EXCLUDED.title, body = EXCLUDED.body, href = EXCLUDED.href
       WHERE notifications.read_at IS NULL`,
      [alert.kind, alert.title, alert.body, alert.href, alert.dedupe]
    );
  }
  return alerts;
}

export async function unreadCount() {
  const result = await query("SELECT count(*)::int AS total FROM notifications WHERE read_at IS NULL");
  return Number(result.rows[0].total);
}

export async function listNotifications() {
  await refreshNotifications();
  const result = await query("SELECT * FROM notifications ORDER BY created_at DESC LIMIT 40");
  return result.rows;
}

export async function markNotificationsRead() {
  await query("UPDATE notifications SET read_at = now() WHERE read_at IS NULL");
  return { ok: true };
}

export async function dashboard() {
  const farm = await getFarm();
  const cycle = await getActiveCycle();
  const market = await marketOverview();
  const alerts = await refreshNotifications();
  const customers = await listCustomers();
  const suppliers = await listSuppliers();
  const receivable = customers.reduce((sum, row) => sum + Number(row.remaining), 0);
  const payable = suppliers.reduce((sum, row) => sum + Number(row.remaining), 0);
  const today = cairoToday();
  let loggedToday = false;
  let cover = null;
  if (cycle) {
    const log = await query("SELECT * FROM daily_logs WHERE cycle_id = $1 AND log_date = $2", [cycle.cycle.id, today]);
    loggedToday = Boolean(log.rows[0]);
    cover = await feedCoverage(cycle.cycle.id);
  }
  const primary = alerts[0] || null;
  let headline = "لسه ما فيش دورة شغالة.";
  if (cycle && !loggedToday) headline = "لسه ما سجلتش متابعة النهارده.";
  else if (primary?.kind === "mortality") headline = "النفوق محتاج متابعة.";
  else if (primary?.kind === "stock") headline = "راجع العلف النهارده.";
  else if (cycle) headline = "الدنيا ماشية كويس النهارده.";
  const feedPrice = market.items.find((item) => item.id === "feed")?.latest;
  const sellPrice = market.items.find((item) => item.id === "broiler_kg")?.latest;
  const todayExpense = cycle
    ? await query("SELECT COALESCE(SUM(amount),0) AS total FROM expenses WHERE cycle_id = $1 AND expense_date = $2", [cycle.cycle.id, today])
    : { rows: [{ total: 0 }] };
  const todayMortality = cycle
    ? await query("SELECT COALESCE(SUM(mortality),0)::int AS total FROM daily_logs WHERE cycle_id = $1 AND log_date = $2", [cycle.cycle.id, today])
    : { rows: [{ total: 0 }] };
  return {
    farm: { name: farm.name, ownerName: farm.owner_name },
    today,
    cycle,
    receivable,
    payable,
    market,
    alerts,
    headline,
    primary,
    cover,
    loggedToday,
    todayExpense: Number(todayExpense.rows[0].total),
    todayMortality: Number(todayMortality.rows[0].total),
    feedPrice,
    sellPrice,
  };
}

export async function decision(cycleId, days = 7) {
  const stats = await getCycleStats(cycleId);
  const market = await priceHistory("broiler_kg");
  const feed = await priceHistory("feed");
  const farm = await getFarm();
  const waitDays = Math.min(30, Math.max(1, Number(days) || 7));
  const price = market.latest ? Number(market.latest.sell_price || market.latest.price) : null;
  const coverLogs = await query(
    `SELECT feed_consumed FROM daily_logs
     WHERE cycle_id = $1 AND feed_consumed > 0 ORDER BY log_date DESC LIMIT 7`,
    [cycleId]
  );
  const avgFeed = coverLogs.rows.length
    ? coverLogs.rows.reduce((sum, row) => sum + Number(row.feed_consumed), 0) / coverLogs.rows.length
    : null;
  const feedUnitPrice = feed.latest ? Number(feed.latest.price) : null;
  const extraDaily = avgFeed && feedUnitPrice ? avgFeed * feedUnitPrice : null;
  const weight = stats.avgWeight;
  const gain = Number(farm.assumed_daily_gain_grams);
  if (!stats.current || !weight || !price) {
    return {
      ready: false,
      message: "عشان التقدير يظهر، سجّل الوزن الحالي وسعر كيلو البيع وخلّي فيه فراخ موجودة.",
      stats,
    };
  }
  const nowRevenue = stats.current * weight * price;
  const laterWeight = weight + (gain / 1000) * waitDays;
  const extraCost = extraDaily ? extraDaily * waitDays : 0;
  const laterRevenue = stats.current * laterWeight * price;
  return {
    ready: true,
    disclaimer: "تقدير بحسب البيانات الحالية، وليس ضمانًا.",
    price,
    priceDate: market.latest.price_date,
    weekChange: market.weekChange,
    waitDays,
    gainGrams: gain,
    nowRevenue,
    nowResult: nowRevenue - stats.expenses,
    laterWeight,
    laterRevenue,
    extraCost,
    laterResult: laterRevenue - stats.expenses - extraCost,
    breakEven: (stats.current * weight) > 0 ? stats.expenses / (stats.current * weight) : null,
    extraKnown: extraDaily !== null,
    stats,
  };
}

export function simulate(body) {
  const birds = asInt(body.birds, "عدد الفراخ", { min: 0 });
  const weight = asQty(body.weightKg, { required: true });
  const price = asMoney(body.price, "سعر البيع", { required: true });
  const cost = asMoney(body.currentCost, "التكلفة الحالية", { required: true });
  const extra = asMoney(body.extraCost, "مصاريف إضافية") || 0;
  if (!weight) fail("اكتب الوزن المتوقع");
  const totalCost = cost + extra;
  const revenue = Math.round(birds * weight * price * 100) / 100;
  const liveKg = birds * weight;
  return {
    revenue,
    totalCost,
    profit: revenue - totalCost,
    breakEven: liveKg > 0 ? totalCost / liveKg : null,
  };
}

export async function searchAll(q) {
  const term = text(q, 80);
  if (!term || term.length < 2) return { customers: [], suppliers: [], cycles: [], expenses: [], sales: [], articles: [], inventory: [] };
  const like = `%${term}%`;
  const [customers, suppliers, cycles, expenses, sales, articles, inventory] = await Promise.all([
    query("SELECT id, name, phone FROM customers WHERE name ILIKE $1 OR phone ILIKE $1 LIMIT 8", [like]),
    query("SELECT id, name, phone FROM suppliers WHERE name ILIKE $1 OR phone ILIKE $1 LIMIT 8", [like]),
    query("SELECT id, name FROM cycles WHERE name ILIKE $1 LIMIT 8", [like]),
    query("SELECT e.id, e.amount, e.expense_date, c.name_ar AS category_name FROM expenses e JOIN expense_categories c ON c.id = e.category_id WHERE c.name_ar ILIKE $1 OR e.notes ILIKE $1 ORDER BY e.expense_date DESC LIMIT 8", [like]),
    query("SELECT s.id, s.total_amount, s.sale_date, cu.name AS customer_name FROM sales s LEFT JOIN customers cu ON cu.id = s.customer_id WHERE cu.name ILIKE $1 OR s.notes ILIKE $1 ORDER BY s.sale_date DESC LIMIT 8", [like]),
    query("SELECT slug, title FROM articles WHERE title ILIKE $1 OR summary ILIKE $1 LIMIT 8", [like]),
    query("SELECT id, name, quantity, unit FROM inventory_items WHERE name ILIKE $1 LIMIT 8", [like]),
  ]);
  return {
    customers: customers.rows,
    suppliers: suppliers.rows,
    cycles: cycles.rows,
    expenses: expenses.rows,
    sales: sales.rows,
    articles: articles.rows,
    inventory: inventory.rows,
  };
}

export async function buildReport(type, filters) {
  const cycleId = filters.cycleId || null;
  const from = filters.from || null;
  const to = filters.to || null;
  if (type === "expenses") {
    const rows = await listExpenses({ cycleId, from, to });
    return { title: "تقرير المصاريف", columns: ["التاريخ", "النوع", "المبلغ", "المورد", "الدورة"], rows: rows.map((row) => [row.expense_date, row.category_name, row.amount, row.supplier_name || "", row.cycle_name || ""]) };
  }
  if (type === "sales") {
    const rows = await listSales({ cycleId, from, to });
    return { title: "تقرير المبيعات", columns: ["التاريخ", "العميل", "العدد", "الوزن", "الإجمالي", "المدفوع", "المتبقي"], rows: rows.map((row) => [row.sale_date, row.customer_name || "", row.bird_count, row.weight_kg, row.total_amount, row.paid_amount, Number(row.total_amount) - Number(row.paid_amount)]) };
  }
  if (type === "customers") {
    const rows = await listCustomers();
    return { title: "تقرير العملاء", columns: ["الاسم", "التليفون", "الإجمالي", "المدفوع", "المتبقي"], rows: rows.map((row) => [row.name, row.phone || "", row.total_amount, row.paid_amount, row.remaining]) };
  }
  if (type === "suppliers") {
    const rows = await listSuppliers();
    return { title: "تقرير الموردين", columns: ["الاسم", "التليفون", "الإجمالي", "المدفوع", "علينا"], rows: rows.map((row) => [row.name, row.phone || "", row.total_amount, row.paid_amount, row.remaining]) };
  }
  if (type === "prices") {
    const market = await marketOverview();
    return { title: "تقرير الأسعار", columns: ["الصنف", "السعر", "التاريخ", "المصدر"], rows: market.items.filter((item) => item.latest).map((item) => [item.label, item.latest.price, item.latest.price_date, item.latest.source_label]) };
  }
  if (type === "mortality") {
    const result = await query(
      `SELECT d.log_date, d.mortality, d.mortality_reason, c.name
       FROM daily_logs d JOIN cycles c ON c.id = d.cycle_id
       WHERE d.mortality > 0 AND ($1::uuid IS NULL OR d.cycle_id = $1)
         AND ($2::date IS NULL OR d.log_date >= $2) AND ($3::date IS NULL OR d.log_date <= $3)
       ORDER BY d.log_date DESC`,
      [cycleId, from, to]
    );
    return { title: "تقرير النفوق", columns: ["التاريخ", "الدورة", "العدد", "السبب"], rows: result.rows.map((row) => [row.log_date, row.name, row.mortality, row.mortality_reason || ""]) };
  }
  if (type === "feed") {
    const result = await query(
      `SELECT d.log_date, d.feed_consumed, d.feed_unit, c.name
       FROM daily_logs d JOIN cycles c ON c.id = d.cycle_id
       WHERE d.feed_consumed IS NOT NULL AND ($1::uuid IS NULL OR d.cycle_id = $1)
       ORDER BY d.log_date DESC LIMIT 200`,
      [cycleId]
    );
    return { title: "تقرير الأعلاف", columns: ["التاريخ", "الدورة", "الكمية", "الوحدة"], rows: result.rows.map((row) => [row.log_date, row.name, row.feed_consumed, row.feed_unit || ""]) };
  }
  const cycles = cycleId ? [await getCycleStats(cycleId)] : await listCycles();
  if (type === "profit" || type === "cycle") {
    return {
      title: type === "profit" ? "تقرير الأرباح" : "تقرير الدورة",
      columns: ["الدورة", "البداية", "الحالي", "النفوق", "المصاريف", "المبيعات", "النتيجة", "تكلفة الكيلو"],
      rows: cycles.map((row) => [row.cycle.name, row.cycle.start_date, row.current, row.mortality, row.expenses, row.salesTotal, row.result, row.costPerKg ? Math.round(row.costPerKg) : ""]),
    };
  }
  fail("نوع التقرير غير معروف");
}

export function reportToCsv(report) {
  const lines = [report.columns.join(",")];
  for (const row of report.rows) {
    lines.push(row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(","));
  }
  return `\uFEFF${lines.join("\n")}`;
}

export async function backupData() {
  const tables = ["cycles", "daily_logs", "expenses", "sales", "payments", "customers", "suppliers", "inventory_items", "inventory_movements", "market_prices", "health_records", "articles", "notifications", "audit_logs"];
  const data = { exportedAt: new Date().toISOString() };
  for (const table of tables) {
    const result = await query(`SELECT * FROM ${table}`);
    data[table] = result.rows;
  }
  const farm = await query("SELECT id, name, owner_name, currency, weight_unit FROM farms WHERE id = 1");
  data.farm = farm.rows[0];
  return data;
}

export async function insights() {
  const cycle = await getActiveCycle();
  const lines = [];
  if (cycle) {
    if (cycle.expenses > 0) lines.push(`العلف يمثل ${Math.round(cycle.feedShare)}% من مصاريف الدورة.`);
    if (cycle.costPerKg) lines.push(`تكلفة الكيلو الحالية تقريبًا ${Math.round(cycle.costPerKg)} جنيه.`);
    if (cycle.medicineShare > 0) lines.push(`الأدوية والتطعيمات والفيتامينات تمثل ${Math.round(cycle.medicineShare)}% من المصاريف.`);
    const trend = await mortalityTrend(cycle.cycle.id);
    if (Number(trend.this_week) > Number(trend.last_week)) lines.push("معدل النفوق هذا الأسبوع أعلى من الأسبوع السابق.");
    const cover = await feedCoverage(cycle.cycle.id);
    if (cover) lines.push(`مخزون ${cover.name} يكفي تقريبًا ${Math.max(0, Math.floor(cover.days))} أيام حسب متوسط الاستهلاك.`);
  }
  const feed = await priceHistory("feed");
  if (feed.weekChange !== null) {
    const word = feed.weekChange >= 0 ? "ارتفع" : "انخفض";
    lines.push(`سعر العلف ${word} ${Math.abs(Math.round(feed.weekChange))}% مقارنة بسعر أقدم مسجّل من أسبوع على الأقل.`);
  }
  const customers = await listCustomers();
  const receivable = customers.reduce((sum, row) => sum + Number(row.remaining), 0);
  if (receivable > 0) lines.push(`إجمالي الفلوس عند الناس: ${Math.round(receivable)} جنيه.`);
  return lines;
}
