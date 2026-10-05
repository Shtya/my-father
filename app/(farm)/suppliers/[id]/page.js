import { notFound } from "next/navigation";
import { getSupplier } from "@/lib/farm";
import { PaySheet } from "@/components/actions";
import { cairoToday, formatDate, formatMoney } from "@/lib/format";
import { Line, Page, Section } from "@/components/ui";

export default async function SupplierPage({ params }) {
  const { id } = await params;
  let person;
  try {
    person = await getSupplier(id);
  } catch (error) {
    if (error.status === 404) notFound();
    throw error;
  }
  return (
    <Page eyebrow="فلوس علينا" title={person.name}>
      <Section title="الحساب">
        <Line label="إجمالي الشراء" value={formatMoney(person.total_amount)} />
        <Line label="المدفوع" value={formatMoney(person.paid_amount)} />
        <Line label="الباقي علينا" value={formatMoney(person.remaining)} />
      </Section>
      {Number(person.remaining) > 0 ? (
        <PaySheet title="تسجيل السداد" submitLabel="تسجيل السداد" direction="out" personId={id} redirectTo={`/suppliers/${id}`} defaultDate={cairoToday()} />
      ) : null}
      <Section title="المشتريات">
        {person.expenses.map((row) => (
          <Line key={row.id} label={row.category_name} value={formatMoney(row.amount)} hint={`${formatDate(row.expense_date)} · باقي ${formatMoney(Number(row.amount) - Number(row.paid_amount))}`} />
        ))}
      </Section>
    </Page>
  );
}
