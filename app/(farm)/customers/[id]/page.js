import { notFound } from "next/navigation";
import { getCustomer } from "@/lib/farm";
import { PaySheet } from "@/components/actions";
import { Line, Page, Section } from "@/components/ui";
import { cairoToday, formatDate, formatMoney, formatNumber } from "@/lib/format";

export default async function CustomerPage({ params }) {
  const { id } = await params;
  let person;
  try {
    person = await getCustomer(id);
  } catch (error) {
    if (error.status === 404) notFound();
    throw error;
  }
  const remaining = Number(person.remaining);
  return (
    <Page back={{ href: "/customers", label: "العملاء" }} eyebrow={person.phone || "عميل"} title={person.name}>
      <Section title="الحساب">
        <Line label="إجمالي الشراء" value={formatMoney(person.total_amount)} />
        <Line label="اللي دفعه" value={formatMoney(person.paid_amount)} />
        <Line label="الباقي عليه" value={formatMoney(remaining)} />
      </Section>
      {remaining > 0 ? (
        <PaySheet title={`دفعة من ${person.name}`} submitLabel="تسجيل دفعة استلمتها" direction="in" personId={id} defaultDate={cairoToday()} max={remaining} />
      ) : <p className="bg-soft px-3 py-3 text-base">مافيش فلوس باقية على {person.name}.</p>}
      <Section title="البيوع">
        {person.sales.length ? person.sales.map((sale) => (
          <Line key={sale.id} label={formatDate(sale.sale_date)} value={formatMoney(sale.total_amount)} hint={`${formatNumber(sale.bird_count)} فرخة · باقي ${formatMoney(Number(sale.total_amount) - Number(sale.paid_amount))}`} />
        )) : <p className="px-3 py-3 text-base text-muted">لسه ما اشتراش حاجة.</p>}
      </Section>
      <Section title="الدفعات اللي استلمتها">
        {person.payments.length ? person.payments.map((payment) => (
          <Line key={payment.id} label={formatDate(payment.payment_date)} value={formatMoney(payment.amount)} hint={payment.notes || ""} />
        )) : <p className="px-3 py-3 text-base text-muted">لسه ما فيش دفعات.</p>}
      </Section>
    </Page>
  );
}
