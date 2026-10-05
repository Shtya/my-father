import Link from "next/link";
import { Empty, Line, Page, Section } from "@/components/ui";
import { listHealth } from "@/lib/farm";
import { formatDate, formatMoney } from "@/lib/format";

const types = { medicine: "دواء", vaccine: "تطعيم", symptom: "عرض", note: "ملاحظة" };

export default async function HealthPage() {
  const rows = await listHealth(null);
  return (
    <Page title="صحة الفراخ" action={<Link href="/health/new" className="font-semibold">تسجيل</Link>}>
      <p className="bg-amber-soft px-4 py-3 text-amber">التسجيل هنا للمتابعة فقط، ومش تشخيص. لو الأعراض شديدة كلم الطبيب البيطري.</p>
      <Section title="السجلات">
        {rows.length ? rows.map((row) => (
          <Line key={row.id} label={row.title} value={types[row.record_type] || "ملاحظة"} hint={`${formatDate(row.record_date)}${row.cost ? ` · ${formatMoney(row.cost)}` : ""}${row.dosage ? ` · ${row.dosage}` : ""}`} />
        )) : <Empty title="ما فيش سجل صحة" body="سجّل الدواء أو العرض اللي شفته، من غير ما التطبيق يوصف علاج." href="/health/new" action="تسجيل" />}
      </Section>
    </Page>
  );
}
