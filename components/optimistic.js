import { formatDate, formatMoney, formatNumber } from "@/lib/format";

const HEALTH_TYPES = { medicine: "دواء", vaccine: "تطعيم", symptom: "عرض", note: "ملاحظة" };

function num(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value) {
  return Math.round(num(value) * 100) / 100;
}

function blank(value) {
  return value === undefined || value === null || String(value).trim() === "";
}

function field(form, name) {
  const element = form?.elements?.namedItem(name);
  return element && !(element instanceof RadioNodeList) ? element : null;
}

function selectedText(form, name) {
  const element = field(form, name);
  if (!element || element.tagName !== "SELECT" || !element.value) return "";
  return element.selectedOptions[0]?.textContent?.trim() || "";
}

function selectedData(form, name, key) {
  const element = field(form, name);
  if (!element) return undefined;
  const source = element.tagName === "SELECT" ? element.selectedOptions[0] : element;
  return source?.dataset?.[key];
}

export function expensePatches(values, form, id, record) {
  const quantity = num(values.quantity);
  const unitPrice = blank(values.unitPrice) ? null : num(values.unitPrice);
  const amount = quantity && unitPrice !== null ? money(quantity * unitPrice) : money(values.amount);
  const method = values.paymentMethod || record?.paymentMethod || "cash";
  const paid = method === "cash" ? amount : blank(values.paidAmount) ? num(record?.paidAmount) : money(values.paidAmount);
  const row = {
    categoryId: values.categoryId,
    categoryName: selectedText(form, "categoryId") || record?.categoryName || "",
    amount,
    amountLabel: formatMoney(amount),
    expenseDate: values.expenseDate,
    dateLabel: formatDate(values.expenseDate),
    supplierId: values.supplierId || "",
    supplierName: values.supplierId ? selectedText(form, "supplierId") : String(values.supplierName || "").trim(),
    paymentMethod: method,
    paidAmount: paid,
    quantity: values.quantity ?? "",
    unit: values.unit || "",
    unitPrice: values.unitPrice ?? "",
    notes: values.notes || "",
    cycleId: values.cycleId || "",
    cycleName: values.cycleId ? selectedText(form, "cycleId") : "",
  };
  if (record) return [{ scope: "expenses", type: "update", id: record.id, changes: row, delta: amount - num(record.amount) }];
  return [{ scope: "expenses", type: "add", id, row, delta: amount }];
}

export function salePatches(values, form, id, record) {
  const birds = num(values.birdCount);
  const total = money(num(values.weightKg) * num(values.pricePerKg));
  const paid = record ? num(record.paidAmount) : money(values.paidAmount);
  const row = {
    customerId: values.customerId || "",
    customerName: values.customerId ? selectedText(form, "customerId") : String(values.customerName || "").trim(),
    totalAmount: total,
    totalLabel: formatMoney(total),
    paidAmount: paid,
    saleDate: values.saleDate,
    dateLabel: formatDate(values.saleDate),
    birdCount: birds,
    birdsLabel: formatNumber(birds),
    remainingLabel: formatMoney(total - paid),
    weightKg: values.weightKg,
    pricePerKg: values.pricePerKg,
    notes: values.notes || "",
  };
  if (record) return [{ scope: "sales", type: "update", id: record.id, changes: row, delta: total - num(record.totalAmount) }];
  return [{ scope: "sales", type: "add", id, row, delta: total }];
}

function personPatches(scope) {
  return (values, form, id, record) => {
    const details = {
      name: String(values.name || "").trim(),
      phone: values.phone || "",
      notes: values.notes || "",
      products: values.products || "",
    };
    if (record) return [{ scope, type: "update", id: record.id, changes: details }];
    return [{
      scope,
      type: "add",
      id,
      row: { ...details, href: `/${scope}/${id}`, remaining: 0, remainingLabel: formatMoney(0), totalLabel: formatMoney(0) },
    }];
  };
}

export function healthPatches(values, form, id, record) {
  const row = {
    title: String(values.title || "").trim(),
    recordType: values.recordType,
    typeLabel: HEALTH_TYPES[values.recordType] || "ملاحظة",
    recordDate: values.recordDate,
    dateLabel: formatDate(values.recordDate),
    cost: values.cost ?? "",
    costLabel: num(values.cost) ? formatMoney(values.cost) : "—",
    dosage: values.dosage || "",
    reason: values.reason || "",
    symptoms: values.symptoms || "",
    notes: values.notes || "",
  };
  if (record) return [{ scope: "health", type: "update", id: record.id, changes: row }];
  return [{ scope: "health", type: "add", id, row }];
}

export function inventoryPatches(values, form, id, record) {
  if (record) return [{ scope: "inventory", type: "update", id: record.id, changes: { quantity: num(values.quantity) } }];
  return [{
    scope: "inventory",
    type: "add",
    id,
    row: { name: String(values.name || "").trim(), unit: String(values.unit || "").trim() || "كجم", quantity: num(values.quantity), avg_unit_cost: 0, low: false },
  }];
}

export function purchasePatches(values, form, id) {
  const quantity = num(values.quantity);
  const amount = money(quantity * num(values.unitPrice));
  const method = values.paymentMethod || "cash";
  const patches = [{ scope: "inventory", type: "update", id: values.itemId, increment: { quantity } }];
  patches.push({
    scope: "expenses",
    type: "add",
    id,
    delta: amount,
    row: {
      categoryId: selectedData(form, "itemId", "categoryId") || "other",
      categoryName: selectedData(form, "itemId", "categoryName") || "",
      amount,
      amountLabel: formatMoney(amount),
      expenseDate: values.date,
      dateLabel: formatDate(values.date),
      supplierId: values.supplierId || "",
      supplierName: values.supplierId ? selectedText(form, "supplierId") : String(values.supplierName || "").trim(),
      paymentMethod: method,
      paidAmount: method === "cash" ? amount : money(values.paidAmount),
      quantity,
      unit: selectedData(form, "itemId", "unit") || "",
      unitPrice: values.unitPrice,
      notes: "",
      cycleId: values.cycleId || "",
      cycleName: values.cycleId ? selectedText(form, "cycleId") : "",
    },
  });
  return patches;
}

export function paymentPatches(values, form) {
  const scope = values.direction === "out" ? "suppliers" : "customers";
  const name = scope === "suppliers" ? "supplierId" : "customerId";
  const personId = values[name];
  if (!personId) return [];
  const amount = money(values.amount);
  return [{ scope, type: "update", id: personId, increment: { remaining: -amount }, delta: -amount }];
}

export const BUILDERS = {
  expense: expensePatches,
  sale: salePatches,
  customer: personPatches("customers"),
  supplier: personPatches("suppliers"),
  health: healthPatches,
  inventory: inventoryPatches,
  purchase: purchasePatches,
  payment: paymentPatches,
};

export function buildPatches(optimistic, values, form, id, record) {
  const builder = typeof optimistic === "function" ? optimistic : BUILDERS[optimistic];
  if (!builder) return [];
  try {
    return builder(values, form, id, record) || [];
  } catch {
    return [];
  }
}
