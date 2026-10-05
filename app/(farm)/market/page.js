import { MarketSourceSelect } from "@/components/market-source";
import { Line, Page, Section } from "@/components/ui";
import { marketOverview } from "@/lib/farm";
import { changeLabel, formatDate, formatMoney } from "@/lib/format";

export default async function MarketPage({ searchParams }) {
  const params = await searchParams;
  const market = await marketOverview(params.source);
  const poultry = market.items.filter((item) => item.category === "poultry");
  const feed = market.items.filter((item) => item.category === "feed");
  return (
    <Page title="السوق">
      <MarketSourceSelect sources={market.sources} active={market.activeSource} />
      <p className="text-xs text-muted">{market.statusLine} اللي مش موجود في البورصة دي بيظهر من البورصة التانية.</p>
      <Section title="الدواجن">{poultry.map((item) => <PriceItem key={item.id} item={item} />)}</Section>
      <Section title="الأعلاف">{feed.map((item) => <PriceItem key={item.id} item={item} />)}</Section>
      <Section title="اتجاه الأسعار">
        {market.items.filter((item) => item.latest).map((item) => {
          const week = changeLabel(item.weekChange);
          const month = changeLabel(item.monthChange);
          return (
            <Line key={item.id} label={item.label} value={week ? `${week.word} ${week.text}` : "لسه مقارنة"} hint={month ? `خلال شهر: ${month.word} ${month.text}` : "محتاج سعر أقدم عشان المقارنة"} />
          );
        })}
        {!market.items.some((item) => item.latest) ? <p className="px-3 py-3 text-sm">لسه الأسعار مجاتش من البورصة.</p> : null}
      </Section>
    </Page>
  );
}

function PriceItem({ item }) {
  const latest = item.latest;
  if (!latest) return <Line label={item.label} value="—" hint="غير معلن دلوقتي" />;
  if (item.filledFromName) return <Line label={item.label} value={formatMoney(latest.price)} hint={`من بورصة ${item.filledFromName}، لأن البورصة المختارة مش معلنها`} />;
  const detail = item.id === "soy" && latest.buy_price ? `صويا 44% ${formatMoney(latest.buy_price)} · ${latest.unit}` : latest.unit;
  return (
    <>
      <Line label={item.label} value={formatMoney(latest.price)} hint={`${detail} · ${formatDate(latest.price_date)}`} />
      <Spark points={item.points} />
    </>
  );
}

function Spark({ points }) {
  if (!points || points.length < 2) return null;
  const values = points.map((point) => Number(point.price));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const width = 280;
  const height = 42;
  const d = values.map((value, index) => {
    const x = (index / (values.length - 1)) * width;
    const y = max === min ? height / 2 : height - 4 - ((value - min) / (max - min)) * (height - 8);
    return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ");
  return <svg viewBox={`0 0 ${width} ${height}`} className="h-8 w-full px-3 text-green" role="img" aria-label="حركة السعر"><path d={d} fill="none" stroke="currentColor" strokeWidth="2" /></svg>;
}
