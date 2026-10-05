import Link from "next/link";
import { ButtonLink, Line, Page, Section } from "@/components/ui";
import { dashboard } from "@/lib/farm";
import { changeLabel, formatDate, formatMoney, formatNumber } from "@/lib/format";

export default async function HomePage() {
  const data = await dashboard();
  const cycle = data.cycle;
  return (
    <Page eyebrow={formatDate(data.today)} title={data.headline}>
      <Section title="الحالة الآن" aside={cycle ? <Link href={`/cycle/${cycle.cycle.id}`} className="text-sm font-semibold">تفاصيل</Link> : null}>
        {cycle ? (
          <>
            <Line label="الدورة الحالية" value={cycle.cycle.name} />
            <Line label="العمر" value={`${formatNumber(cycle.ageDays)} يوم`} />
            <Line label="عدد الفراخ" value={formatNumber(cycle.current)} />
            <Line label="متوسط الوزن" value={cycle.avgWeight ? `${formatNumber(cycle.avgWeight, 2)} كجم` : "لسه"} />
            <Line label="النفوق" value={`${formatNumber(cycle.mortality)} · ${formatNumber(cycle.mortalityPercent, 1)}%`} />
          </>
        ) : (
          <div className="flex items-center justify-between gap-3 px-3 py-3">
            <p className="text-sm">لسه ما فيش دورة شغالة.</p>
            <ButtonLink href="/cycle/new">ابدأ دورة</ButtonLink>
          </div>
        )}
      </Section>

      <Section title="المال">
        <Line label="إجمالي المصاريف" value={formatMoney(cycle?.expenses || 0)} href="/expenses" />
        <Line label="إجمالي المبيعات" value={formatMoney(cycle?.salesTotal || 0)} href="/sales" />
        <Line label="فلوس عند الناس" value={formatMoney(data.receivable)} href="/customers" />
        <Line label="فلوس علينا" value={formatMoney(data.payable)} href="/suppliers" />
        <Line label="صافي النتيجة الحالية" value={formatMoney(cycle?.result || 0)} hint={cycle?.costPerKg ? `تكلفة الكيلو تقريبًا ${formatMoney(cycle.costPerKg)}` : "سجّل الوزن عشان نحسب تكلفة الكيلو"} />
      </Section>

      <Section title="السوق" aside={<Link href="/market" className="text-sm font-semibold">كل الأسعار</Link>}>
        <PriceRow label="سعر الكيلو" item={data.market.items.find((item) => item.id === "broiler_kg")} />
        <PriceRow label="سعر الكتكوت" item={data.market.items.find((item) => item.id === "chick")} />
        <PriceRow label="سعر العلف" item={data.market.items.find((item) => item.id === "feed")} />
        <PriceRow label="سعر الذرة" item={data.market.items.find((item) => item.id === "corn")} />
        <PriceRow label="سعر الصويا" item={data.market.items.find((item) => item.id === "soy")} />
        <p className="px-3 py-2 text-xs text-muted">{data.market.statusLine}</p>
      </Section>

      <Section title="أهم حاجة">
        {data.primary ? (
          <Link href={data.primary.href} className="block px-3 py-3 hover:bg-soft">
            <p className="font-semibold">{data.primary.title}</p>
            <p className="text-muted">{data.primary.body}</p>
          </Link>
        ) : (
          <p className="px-3 py-3 text-sm">ما فيش حاجة مستعجلة دلوقتي.</p>
        )}
      </Section>

      <section className="bg-green px-3 py-3 text-white">
        <p className="text-xs text-white/75">ملخص اليوم</p>
        <ul className="mt-2 space-y-1 text-sm">
          <li className="flex justify-between gap-3"><span>عدد الفراخ</span><span>{formatNumber(cycle?.current || 0)}</span></li>
          <li className="flex justify-between gap-3"><span>النفوق النهارده</span><span>{formatNumber(data.todayMortality)}</span></li>
          <li className="flex justify-between gap-3"><span>متوسط الوزن</span><span>{cycle?.avgWeight ? `${formatNumber(cycle.avgWeight, 2)} كجم` : "غير مسجل"}</span></li>
          <li className="flex justify-between gap-3"><span>مصاريف النهارده</span><span>{formatMoney(data.todayExpense)}</span></li>
          <li className="flex justify-between gap-3"><span>سعر البيع</span><span>{data.sellPrice ? formatMoney(data.sellPrice.sell_price || data.sellPrice.price) : "غير معلن"}</span></li>
          <li className="flex justify-between gap-3"><span>سعر العلف</span><span>{data.feedPrice ? formatMoney(data.feedPrice.price) : "غير معلن"}</span></li>
        </ul>
        {data.cover ? <p className="mt-2 text-sm">العلف يكفي {formatNumber(Math.max(0, Math.floor(data.cover.days)))} أيام تقريبًا.</p> : null}
      </section>
    </Page>
  );
}

function PriceRow({ label, item }) {
  const change = changeLabel(item?.weekChange);
  return (
    <Line
      label={label}
      value={item?.latest ? formatMoney(item.latest.price) : "—"}
      hint={change ? `${change.word} ${change.text}` : item?.latest ? item.latest.unit : "غير معلن"}
      href="/market"
    />
  );
}
