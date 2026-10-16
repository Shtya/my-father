import Link from "next/link";
import { ButtonLink, Empty, Line, Page, Section } from "@/components/ui";
import { splitCycles } from "@/lib/cycle-rules";
import { listCycles } from "@/lib/farm";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";

export default async function CyclesPage() {
  const cycles = await listCycles();
  const { current, extras, previous } = splitCycles(cycles);
  return (
    <Page title="الدورة" action={<ButtonLink href="/cycle/new">دورة جديدة</ButtonLink>}>
      {extras.length ? (
        <p className="border border-amber bg-amber-soft px-4 py-3 text-base">
          في أكتر من دورة متعلمة إنها شغالة. قفل اللي خلصت عشان المتابعة والبيع ما يروحوش لدورة غلط.
        </p>
      ) : null}
      {current ? <CycleBlock row={current} /> : <Empty title="ما فيش دورة شغالة" body="ابدأ بتسجيل عدد الكتاكيت وتاريخ البداية." href="/cycle/new" action="ابدأ دورة" />}
      {extras.length ? (
        <Section title="دورات لسه متعلمة شغالة">
          {extras.map((row) => (
            <Line key={row.cycle.id} href={`/cycle/${row.cycle.id}`} label={row.cycle.name} value={formatNumber(row.current)} hint={`من ${formatDate(row.cycle.start_date)} · اقفلها لو خلصت`} />
          ))}
        </Section>
      ) : null}
      {previous.length ? (
        <Section title="دورات سابقة">
          {previous.map((row) => (
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
    <Section title={row.cycle.name} aside={<Link href={`/cycle/${row.cycle.id}`} className="-my-2 flex min-h-11 items-center px-2 text-base font-semibold text-green underline underline-offset-4">فتح الدورة</Link>}>
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
