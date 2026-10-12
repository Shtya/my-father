import Link from "next/link";
import { Field, Select } from "@/components/form";
import { MORE, Page, Section } from "@/components/ui";
import { buildReport, listCycles } from "@/lib/farm";
import { formatMoney } from "@/lib/format";

const types = [
  ["cycle", "تقرير الدورة"],
  ["expenses", "تقرير المصاريف"],
  ["sales", "تقرير المبيعات"],
  ["profit", "تقرير الأرباح"],
  ["customers", "تقرير العملاء"],
  ["suppliers", "تقرير الموردين"],
  ["prices", "تقرير الأسعار"],
  ["mortality", "تقرير النفوق"],
  ["feed", "تقرير الأعلاف"],
];

export default async function ReportsPage({ searchParams }) {
  const params = await searchParams;
  const type = types.some(([id]) => id === params.type) ? params.type : "cycle";
  const cycles = await listCycles();
  const report = await buildReport(type, { cycleId: params.cycleId || null, from: params.from || null, to: params.to || null });
  const query = new URLSearchParams({ type, ...(params.cycleId ? { cycleId: params.cycleId } : {}), ...(params.from ? { from: params.from } : {}), ...(params.to ? { to: params.to } : {}) });
  return (
    <Page back={MORE} title="التقارير">
      <form className="grid gap-3 bg-paper p-4" method="get">
        <Select label="التقرير" name="type" defaultValue={type}>
          {types.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </Select>
        <Select label="الدورة" name="cycleId" defaultValue={params.cycleId || ""}>
          <option value="">كل الدورات</option>
          {cycles.map((row) => <option key={row.cycle.id} value={row.cycle.id}>{row.cycle.name}</option>)}
        </Select>
        <div className="grid grid-cols-2 gap-3">
          <Field label="من" name="from" type="date" defaultValue={params.from || ""} />
          <Field label="إلى" name="to" type="date" defaultValue={params.to || ""} />
        </div>
        <button className="h-12 bg-green text-base font-semibold" type="submit">عرض التقرير</button>
      </form>
      <Section title={report.title}>
        {report.rows.length ? report.rows.map((row, index) => (
          <div key={index} className="border-b border-line px-4 py-3 last:border-b-0">
            <p className="text-base font-semibold">{row[0]}</p>
            <p className="text-base text-muted">{report.columns.slice(1).map((column, cell) => `${column}: ${display(column, row[cell + 1])}`).join(" · ")}</p>
          </div>
        )) : <p className="px-3 py-3 text-base">ما فيش بيانات في الفترة دي. جرّب تشيل التاريخ أو تختار دورة تانية.</p>}
      </Section>
      {report.rows.length ? (
        <a href={`/api/reports?${query.toString()}&format=csv`} download className="flex h-12 items-center justify-center border border-line bg-paper text-base font-semibold">
          تنزيل التقرير كملف Excel
        </a>
      ) : null}
      <p className="text-sm text-muted">للطباعة كملف PDF استخدم طباعة المتصفح واختر حفظ كـ PDF.</p>
    </Page>
  );
}

function display(column, value) {
  const moneyColumns = ["المبلغ", "الإجمالي", "المدفوع", "المتبقي", "المصاريف", "المبيعات", "النتيجة", "علينا", "السعر", "تكلفة"];
  if (value === "" || value === null || value === undefined) return "";
  if (moneyColumns.some((name) => column.includes(name))) return formatMoney(value);
  return value;
}
