import { ButtonLink, Empty, Line, Page, Section } from "@/components/ui";
import { listExpenses } from "@/lib/farm";
import { formatDate, formatMoney } from "@/lib/format";

export default async function ExpensesPage() {
  const rows = await listExpenses();
  const total = rows.reduce((sum, row) => sum + Number(row.amount), 0);
  return (
    <Page title="المصاريف" action={<ButtonLink href="/expenses/new">إضافة مصروف</ButtonLink>}>
      <Section title="آخر المصاريف" aside={<span className="num font-semibold">{formatMoney(total)}</span>}>
        {rows.length ? rows.map((row) => (
          <Line key={row.id} label={row.category_name} value={formatMoney(row.amount)} hint={`${formatDate(row.expense_date)}${row.supplier_name ? ` · ${row.supplier_name}` : ""}`} />
        )) : <Empty title="ما فيش مصاريف مسجلة" body="ابدأ بتسجيل أول مصروف." href="/expenses/new" action="إضافة مصروف" />}
      </Section>
    </Page>
  );
}
