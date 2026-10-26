import { ExpensesBoard } from "@/components/expenses-board";
import { LiveTotal } from "@/components/live-total";
import { MORE, Page } from "@/components/ui";
import { defaultCycleId } from "@/lib/cycle-rules";
import { getFarm, listCategories, listCycleChoices, listExpenses, listSuppliers, serverNow } from "@/lib/farm";
import { formatDate, formatMoney } from "@/lib/format";

function day(value) {
  if (!value) return "";
  const match = String(value).match(/\d{4}-\d{2}-\d{2}/);
  if (match) return match[0];
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const date = String(value.getDate()).padStart(2, "0");
    return `${value.getFullYear()}-${month}-${date}`;
  }
  return "";
}

export default async function ExpensesPage() {
  const renderedAt = serverNow();
  const [rows, categories, suppliers, choices, farm] = await Promise.all([
    listExpenses(),
    listCategories(),
    listSuppliers(),
    listCycleChoices(),
    getFarm(),
  ]);
  const rememberedId = farm?.default_cycle_id || "";
  const total = rows.reduce((sum, row) => sum + Number(row.amount), 0);
  return (
    <Page back={MORE} title="المصاريف" action={<LiveTotal label="إجمالي المصاريف" base={total} scope="expenses" ids={rows.map((row) => row.id)} renderedAt={renderedAt} />}>
      <ExpensesBoard
        renderedAt={renderedAt}
        cycles={choices}
        cycleId={defaultCycleId(choices, null, rememberedId)}
        rememberedId={rememberedId}
        categories={categories.map((item) => ({ id: item.id, name_ar: item.name_ar }))}
        suppliers={suppliers.map((item) => ({ id: item.id, name: item.name }))}
        rows={rows.map((row) => ({
          id: row.id,
          categoryId: row.category_id,
          categoryName: row.category_name,
          amount: row.amount,
          amountLabel: formatMoney(row.amount),
          expenseDate: day(row.expense_date),
          dateLabel: formatDate(row.expense_date),
          supplierId: row.supplier_id || "",
          supplierName: row.supplier_name || "",
          paymentMethod: row.payment_method,
          paidAmount: row.paid_amount,
          quantity: row.quantity ?? "",
          unit: row.unit || "",
          unitPrice: row.unit_price ?? "",
          notes: row.notes || "",
          cycleId: row.cycle_id || "",
          cycleName: row.cycle_name || "",
        }))}
      />
    </Page>
  );
}
