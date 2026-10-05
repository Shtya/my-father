import Link from "next/link";
import { ButtonLink, Empty, Line, Page, Section } from "@/components/ui";
import { listCustomers } from "@/lib/farm";
import { formatMoney } from "@/lib/format";

export default async function CustomersPage() {
  const rows = await listCustomers();
  const due = rows.filter((row) => Number(row.remaining) >= 1);
  const total = due.reduce((sum, row) => sum + Number(row.remaining), 0);
  return (
    <Page title="العملاء" action={<ButtonLink href="/customers/new">عميل جديد</ButtonLink>}>
      <Section title="فلوس عند الناس" aside={<span className="num font-semibold">{formatMoney(total)}</span>}>
        {due.length ? due.map((row) => (
          <Line key={row.id} href={`/customers/${row.id}`} label={row.name} value={formatMoney(row.remaining)} />
        )) : <p className="px-3 py-3 text-sm">ما فيش حد عليه فلوس دلوقتي.</p>}
      </Section>
      <Section title="كل العملاء">
        {rows.length ? rows.map((row) => (
          <Line key={row.id} href={`/customers/${row.id}`} label={row.name} value={formatMoney(row.total_amount)} hint={row.phone || ""} />
        )) : <Empty title="ما فيش عملاء" body="أضف عميل أو سجّل بيع باسمه." href="/customers/new" action="عميل جديد" />}
      </Section>
      <Link href="/payments/new?direction=in" className="flex h-12 items-center justify-center bg-green font-semibold">تسجيل دفعة</Link>
    </Page>
  );
}
