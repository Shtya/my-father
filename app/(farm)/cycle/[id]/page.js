import { notFound } from "next/navigation";
import { decision, getCycleStats, listDailyLogs } from "@/lib/farm";
import { formatDate, formatMoney, formatNumber, changeLabel } from "@/lib/format";
import { ButtonLink, Line, Page, Section, WeightLine } from "@/components/ui";
import { CloseCycle, EditCycle } from "@/components/actions";

export default async function CycleDetailPage({ params }) {
  const { id } = await params;
  let stats;
  try {
    stats = await getCycleStats(id);
  } catch (error) {
    if (error.status === 404) notFound();
    throw error;
  }
  const [logs, estimate] = await Promise.all([listDailyLogs(id), decision(id, 7)]);
  const trend = changeLabel(estimate.weekChange);
  const active = stats.cycle.status === "active";
  const cycle = stats.cycle;
  return (
    <Page
      back={{ href: "/cycle", label: "الدورة" }}
      eyebrow={active ? "دورة شغالة" : "دورة مقفولة"}
      title={cycle.name}
      action={active ? <ButtonLink href="/log">تسجيل متابعة النهارده</ButtonLink> : null}
    >
      <Section title="الفراخ">
        <Line label="البداية" value={formatNumber(stats.cycle.initial_quantity)} hint={formatDate(stats.cycle.start_date)} />
        <Line label="الموجود" value={formatNumber(stats.current)} />
        <Line label="النفوق" value={`${formatNumber(stats.mortality)} · ${formatNumber(stats.mortalityPercent, 1)}%`} />
        <Line label="العمر" value={`${formatNumber(stats.ageDays)} يوم`} />
        <WeightLine stats={stats} active={active} />
        <Line label="علف مستهلك" value={formatNumber(stats.feedConsumed, 1)} />
      </Section>
      <Section title="الحساب">
        <Line label="إجمالي التكلفة" value={formatMoney(stats.expenses)} />
        <Line label="المبيعات" value={formatMoney(stats.salesTotal)} />
        <Line label="النتيجة" value={formatMoney(stats.result)} />
        <Line label="تكلفة الفرخة الموجودة" value={stats.costPerBird ? formatMoney(stats.costPerBird) : "—"} />
        <Line label="تكلفة الكيلو" value={stats.costPerKg ? formatMoney(stats.costPerKg) : "سجّل الوزن"} />
        <Line label="نصيب العلف من التكلفة" value={`${formatNumber(stats.feedShare, 0)}%`} />
      </Section>
      <Section title="لو بعت ولا استنيت">
        {estimate.ready ? (
          <div className="space-y-0">
            <p className="px-4 py-3 text-sm text-muted">{estimate.disclaimer}</p>
            <Line label="لو بعت دلوقتي" value={formatMoney(estimate.nowResult)} hint={`إيراد ${formatMoney(estimate.nowRevenue)} بسعر ${formatMoney(estimate.price)}`} />
            <Line label={`لو استنيت ${formatNumber(estimate.waitDays)} أيام`} value={formatMoney(estimate.laterResult)} hint={estimate.extraKnown ? `تقدير علف إضافي ${formatMoney(estimate.extraCost)} وزيادة وزن إلى ${formatNumber(estimate.laterWeight, 2)} كجم` : "من غير تقدير علف لأن الاستهلاك أو سعر العلف مش متسجل"} />
            <Line label="أقل سعر بيع لتغطية التكلفة" value={estimate.breakEven ? formatMoney(estimate.breakEven) : "—"} />
            {trend ? <p className="px-4 py-3 text-sm">سعر الكيلو: {trend.word} {trend.text} حسب الأسعار المسجلة.</p> : null}
          </div>
        ) : <p className="px-3 py-3 text-sm">{estimate.message}</p>}
      </Section>
      <Section title="آخر المتابعة">
        {logs.length ? logs.slice(0, 7).map((log) => (
          <Line key={log.id} href={active ? `/log?date=${String(log.log_date).slice(0, 10)}` : undefined} label={formatDate(log.log_date)} value={log.mortality ? `نفوق ${formatNumber(log.mortality)}` : "من غير نفوق"} hint={log.average_weight_kg ? `وزن ${formatNumber(log.average_weight_kg, 2)} كجم` : log.notes || ""} />
        )) : <p className="px-3 py-3 text-sm">لسه ما فيش متابعة.</p>}
      </Section>
      <EditCycle cycle={{
        id: cycle.id,
        name: cycle.name,
        poultry_type: cycle.poultry_type,
        breed: cycle.breed,
        expected_sell_date: cycle.expected_sell_date,
        target_weight_kg: cycle.target_weight_kg,
        location: cycle.location,
        notes: cycle.notes,
      }} />
      {active ? <CloseCycle id={id} /> : null}
    </Page>
  );
}
