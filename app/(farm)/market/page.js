import { MarketSourceSelect } from "@/components/market-source";
import { Line, Page, Section } from "@/components/ui";
import { marketOverview } from "@/lib/farm";
import { formatDate, formatMoney } from "@/lib/format";

const CORE = new Set(["broiler_kg", "chick", "feed", "corn", "soy", "bran", "clover"]);

export default async function MarketPage({ searchParams }) {
  const params = await searchParams;
  const market = await marketOverview(params.source);
  const visible = market.items.filter((item) => CORE.has(item.id) || item.latest);
  const poultry = visible.filter((item) => item.category === "poultry");
  const feed = visible.filter((item) => item.category === "feed");
  return (
    <Page title="السوق">
      <MarketSourceSelect sources={market.sources} active={market.activeSource} />
      <p className="text-sm text-muted">{market.statusLine} اللي مش موجود في البورصة دي بيظهر من البورصة التانية.</p>
      <Section title="الدواجن">{poultry.map((item) => <PriceItem key={item.id} item={item} />)}</Section>
      <Section title="الأعلاف">{feed.map((item) => <PriceItem key={item.id} item={item} />)}</Section>
    </Page>
  );
}

function PriceItem({ item }) {
  const latest = item.latest;
  if (!latest) {
    const hint = item.id === "feed" ? "المصانع مش معلنة سعر الطن دلوقتي" : "غير معلن دلوقتي";
    return <Line label={item.label} value="—" hint={hint} />;
  }
  if (item.filledFromName) return <Line label={item.label} value={formatMoney(latest.price)} hint={`من بورصة ${item.filledFromName}، لأن البورصة المختارة مش معلنها`} />;
  let detail = latest.unit;
  if (item.id === "soy" && latest.buy_price) detail = `صويا 44% ${formatMoney(latest.buy_price)} · ${latest.unit}`;
  if (item.id === "corn" && latest.buy_price && latest.sell_price) detail = `من ${formatMoney(latest.buy_price)} إلى ${formatMoney(latest.sell_price)} للطن`;
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
