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
  const remaining = Number(person.remaining);
  return (
    <Page back={{ href: "/suppliers", label: "الموردين" }} eyebrow={person.products || person.phone || "مورد"} title={person.name}>
      <Section title="الحساب">
        <Line label="إجمالي الشراء منه" value={formatMoney(person.total_amount)} />
        <Line label="اللي دفعناه" value={formatMoney(person.paid_amount)} />
        <Line label="الباقي علينا" value={formatMoney(remaining)} />
      </Section>
      {remaining > 0 ? (
        <PaySheet title={`سداد لـ ${person.name}`} submitLabel="تسجيل فلوس دفعتها" direction="out" personId={id} defaultDate={cairoToday()} max={remaining} />
      ) : <p className="bg-soft px-3 py-3 text-base">مافيش فلوس باقية علينا لـ {person.name}.</p>}
      <Section title="المشتريات">
        {person.expenses.length ? person.expenses.map((row) => (
          <Line key={row.id} label={row.category_name} value={formatMoney(row.amount)} hint={`${formatDate(row.expense_date)} · باقي ${formatMoney(Number(row.amount) - Number(row.paid_amount))}`} />
        )) : <p className="px-3 py-3 text-base text-muted">لسه ما فيش مشتريات منه.</p>}
      </Section>
      <Section title="الفلوس اللي دفعناها">
        {person.payments.length ? person.payments.map((payment) => (
          <Line key={payment.id} label={formatDate(payment.payment_date)} value={formatMoney(payment.amount)} hint={payment.notes || ""} />
        )) : <p className="px-3 py-3 text-base text-muted">لسه ما فيش سداد.</p>}
      </Section>
    </Page>
  );
}
