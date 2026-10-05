import Link from "next/link";
import { Field } from "@/components/form";
import { Page, Section } from "@/components/ui";
import { searchAll } from "@/lib/farm";
import { formatMoney } from "@/lib/format";

export default async function SearchPage({ searchParams }) {
  const params = await searchParams;
  const q = params.q || "";
  const result = q ? await searchAll(q) : null;
  return (
    <Page title="بحث">
      <form method="get" className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <Field label="عميل، مورد، دورة، مقال" name="q" defaultValue={q} />
        </div>
        <button className="h-12 shrink-0 bg-green px-4 font-semibold" type="submit">بحث</button>
      </form>
      {result ? (
        <>
          <Group title="العملاء" rows={result.customers.map((row) => ({ href: `/customers/${row.id}`, label: row.name, hint: row.phone }))} />
          <Group title="الموردين" rows={result.suppliers.map((row) => ({ href: `/suppliers/${row.id}`, label: row.name, hint: row.phone }))} />
          <Group title="الدورات" rows={result.cycles.map((row) => ({ href: `/cycle/${row.id}`, label: row.name }))} />
          <Group title="المصاريف" rows={result.expenses.map((row) => ({ href: "/expenses", label: row.category_name, hint: formatMoney(row.amount) }))} />
          <Group title="المبيعات" rows={result.sales.map((row) => ({ href: "/sales", label: row.customer_name || "بيع", hint: formatMoney(row.total_amount) }))} />
          <Group title="المخزون" rows={result.inventory.map((row) => ({ href: "/inventory", label: row.name, hint: `${row.quantity} ${row.unit}` }))} />
          <Group title="المقالات" rows={result.articles.map((row) => ({ href: `/articles?q=${encodeURIComponent(row.title)}`, label: row.title }))} />
        </>
      ) : null}
    </Page>
  );
}

function Group({ title, rows }) {
  if (!rows.length) return null;
  return (
    <Section title={title}>
      {rows.map((row) => <Link key={row.href + row.label} href={row.href} className="block border-b border-line px-3 py-2 text-sm last:border-b-0 hover:bg-soft"><span className="font-semibold">{row.label}</span>{row.hint ? <span className="text-muted"> · {row.hint}</span> : null}</Link>)}
    </Section>
  );
}
