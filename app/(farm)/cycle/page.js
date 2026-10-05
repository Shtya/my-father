import Link from "next/link";
import { ButtonLink, Empty, Line, Page, Section } from "@/components/ui";
import { listCycles } from "@/lib/farm";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";

export default async function CyclesPage() {
  const cycles = await listCycles();
  const active = cycles.find((row) => row.cycle.status === "active");
  return (
    <Page title="الدورة" action={<ButtonLink href="/cycle/new">دورة جديدة</ButtonLink>}>
      {active ? <CycleBlock row={active} /> : <Empty title="ما فيش دورة شغالة" body="ابدأ بتسجيل عدد الكتاكيت وتاريخ البداية." href="/cycle/new" action="ابدأ دورة" />}
      {cycles.filter((row) => row.cycle.status !== "active").length ? (
        <Section title="دورات سابقة">
          {cycles.filter((row) => row.cycle.status !== "active").map((row) => (
            <Line key={row.cycle.id} href={`/cycle/${row.cycle.id}`} label={row.cycle.name} value={formatMoney(row.result)} hint={formatDate(row.cycle.start_date)} />
          ))}
        </Section>
      ) : null}
      <Link href="/simulator" className="flex h-12 items-center border-y border-line bg-paper px-3 text-sm font-semibold hover:bg-soft">حاسبة الربح المتوقع</Link>
    </Page>
  );
}

function CycleBlock({ row }) {
  return (
    <Section title={row.cycle.name} aside={<Link href={`/cycle/${row.cycle.id}`} className="text-sm font-semibold">فتح</Link>}>
      <Line label="البداية" value={`${formatNumber(row.cycle.initial_quantity)} كتكوت`} hint={formatDate(row.cycle.start_date)} />
      <Line label="الحالي" value={formatNumber(row.current)} />
      <Line label="النفوق" value={formatNumber(row.mortality)} />
      <Line label="العمر" value={`${formatNumber(row.ageDays)} يوم`} />
      <Line label="متوسط الوزن" value={row.avgWeight ? `${formatNumber(row.avgWeight, 2)} كجم` : "—"} />
      <Line label="إجمالي التكلفة" value={formatMoney(row.expenses)} />
      <Line label="المبيعات" value={formatMoney(row.salesTotal)} />
      <Line label="النتيجة" value={formatMoney(row.result)} />
    </Section>
  );
}
