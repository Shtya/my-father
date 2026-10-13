import { LiveTotal } from "@/components/live-total";
import { SalesBoard } from "@/components/sales-board";
import { MORE, Page } from "@/components/ui";
import { getActiveCycle, listCustomers, listSales, serverNow } from "@/lib/farm";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";

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

export default async function SalesPage() {
  const renderedAt = serverNow();
  const [rows, customers, cycle] = await Promise.all([listSales(), listCustomers(), getActiveCycle()]);
  const total = rows.reduce((sum, row) => sum + Number(row.total_amount), 0);
  return (
    <Page back={MORE} title="المبيعات" action={<LiveTotal label="إجمالي المبيعات" base={total} scope="sales" ids={rows.map((row) => row.id)} renderedAt={renderedAt} />}>
      <SalesBoard
        renderedAt={renderedAt}
        cycleId={cycle?.cycle.id || ""}
        customers={customers.map((item) => ({ id: item.id, name: item.name }))}
        rows={rows.map((row) => ({
          id: row.id,
          customerId: row.customer_id || "",
          customerName: row.customer_name || "",
          totalAmount: Number(row.total_amount),
          paidAmount: Number(row.paid_amount),
          totalLabel: formatMoney(row.total_amount),
          dateLabel: formatDate(row.sale_date),
          saleDate: day(row.sale_date),
          birdsLabel: formatNumber(row.bird_count),
          birdCount: row.bird_count,
          remainingLabel: formatMoney(Number(row.total_amount) - Number(row.paid_amount)),
          weightKg: row.weight_kg,
          pricePerKg: row.price_per_kg,
          notes: row.notes || "",
        }))}
      />
    </Page>
  );
}
