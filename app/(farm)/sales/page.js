import { ButtonLink, Empty, Line, Page, Section } from "@/components/ui";
import { listSales } from "@/lib/farm";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";

export default async function SalesPage() {
  const rows = await listSales();
  return (
    <Page title="المبيعات" action={<ButtonLink href="/sales/new">تسجيل بيع</ButtonLink>}>
      <Section title="آخر البيوع">
        {rows.length ? rows.map((row) => (
          <Line key={row.id} label={row.customer_name || "بيع نقدي"} value={formatMoney(row.total_amount)} hint={`${formatDate(row.sale_date)} · ${formatNumber(row.bird_count)} طائر · متبقي ${formatMoney(Number(row.total_amount) - Number(row.paid_amount))}`} />
        )) : <Empty title="ما فيش مبيعات" body="لما تبيع، سجّل العدد والوزن وسعر الكيلو." href="/sales/new" action="تسجيل بيع" />}
      </Section>
    </Page>
  );
}
