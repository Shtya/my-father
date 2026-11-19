import { notFound } from "next/navigation";
import { getSupplier, serverNow } from "@/lib/farm";
import { PaySheet } from "@/components/actions";
import { SupplierLedger } from "@/components/supplier-ledger";
import { cairoToday, formatDate } from "@/lib/format";
import { Page } from "@/components/ui";

export default async function SupplierPage({ params }) {
  const { id } = await params;
  const renderedAt = serverNow();
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
      <SupplierLedger
        supplierId={id}
        total={Number(person.total_amount)}
        paid={Number(person.paid_amount)}
        remaining={remaining}
        renderedAt={renderedAt}
        expenses={person.expenses.map((row) => ({
          id: row.id,
          categoryName: row.category_name,
          amount: Number(row.amount),
          paidAmount: Number(row.paid_amount),
          quantity: row.quantity === null || row.quantity === undefined ? null : Number(row.quantity),
          unitPrice: row.unit_price === null || row.unit_price === undefined ? null : Number(row.unit_price),
          dateLabel: formatDate(row.expense_date),
        }))}
        payments={person.payments.map((payment) => ({
          id: payment.id,
          amount: Number(payment.amount),
          dateLabel: formatDate(payment.payment_date),
          notes: payment.notes || "",
        }))}
      >
        {remaining > 0 ? (
          <PaySheet title={`سداد لـ ${person.name}`} submitLabel="تسجيل فلوس دفعتها" direction="out" personId={id} defaultDate={cairoToday()} max={remaining} />
        ) : <p className="bg-soft px-3 py-3 text-base">مافيش فلوس باقية علينا لـ {person.name}.</p>}
      </SupplierLedger>
    </Page>
  );
}
