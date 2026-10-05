import { ButtonLink, Empty, Line, Page, Section } from "@/components/ui";
import { listSuppliers } from "@/lib/farm";
import { formatMoney } from "@/lib/format";

export default async function SuppliersPage() {
  const rows = await listSuppliers();
  const due = rows.filter((row) => Number(row.remaining) >= 1);
  const total = due.reduce((sum, row) => sum + Number(row.remaining), 0);
  return (
    <Page title="الموردين" action={<ButtonLink href="/suppliers/new">مورد جديد</ButtonLink>}>
      <Section title="فلوس علينا" aside={<span className="num font-semibold">{formatMoney(total)}</span>}>
        {due.length ? due.map((row) => (
          <Line key={row.id} href={`/suppliers/${row.id}`} label={row.name} value={formatMoney(row.remaining)} />
        )) : <p className="px-3 py-3 text-sm">ما عليكش فلوس لمورد دلوقتي.</p>}
      </Section>
      <Section title="كل الموردين">
        {rows.length ? rows.map((row) => (
          <Line key={row.id} href={`/suppliers/${row.id}`} label={row.name} value={formatMoney(row.total_amount)} hint={row.phone || row.products || ""} />
        )) : <Empty title="ما فيش موردين" body="أضف المورد لما تشتري علف أو كتاكيت." href="/suppliers/new" action="مورد جديد" />}
      </Section>
    </Page>
  );
}
