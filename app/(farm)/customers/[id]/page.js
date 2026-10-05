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
  return (
    <Page eyebrow={person.phone || "عميل"} title={person.name}>
      <Section title="الحساب">
        <Line label="إجمالي الشراء" value={formatMoney(person.total_amount)} />
        <Line label="المدفوع" value={formatMoney(person.paid_amount)} />
        <Line label="فلوس عند الناس" value={formatMoney(person.remaining)} />
      </Section>
      {Number(person.remaining) > 0 ? (
        <PaySheet title="تسجيل دفعة" submitLabel="تسجيل الدفعة" direction="in" personId={id} redirectTo={`/customers/${id}`} defaultDate={cairoToday()} />
      ) : null}
      <Section title="المبيعات">
        {person.sales.map((sale) => (
          <Line key={sale.id} label={formatDate(sale.sale_date)} value={formatMoney(sale.total_amount)} hint={`${formatNumber(sale.bird_count)} طائر · متبقي ${formatMoney(Number(sale.total_amount) - Number(sale.paid_amount))}`} />
        ))}
      </Section>
    </Page>
  );
}
