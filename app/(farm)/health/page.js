import { HealthBoard } from "@/components/health-board";
import { MORE, Page } from "@/components/ui";
import { defaultCycleId } from "@/lib/cycle-rules";
import { listCycleChoices, listHealth, serverNow } from "@/lib/farm";
import { formatDate, formatMoney } from "@/lib/format";

const types = { medicine: "دواء", vaccine: "تطعيم", symptom: "عرض", note: "ملاحظة" };

function day(value) {
  if (!value) return "";
  const match = String(value).match(/\d{4}-\d{2}-\d{2}/);
  if (match) return match[0];
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const date = String(value.getDate()).padStart(2, "0");
    return `${value.getFullYear()}-${month}-${date}`;
  }
  return "";
}

export default async function HealthPage() {
  const renderedAt = serverNow();
  const [rows, choices] = await Promise.all([listHealth(null), listCycleChoices()]);
  return (
    <Page back={MORE} title="صحة الفراخ">
      <p className="bg-amber-soft px-4 py-3 text-amber">التسجيل هنا للمتابعة فقط، ومش تشخيص. لو الأعراض شديدة كلم الطبيب البيطري.</p>
      <HealthBoard
        renderedAt={renderedAt}
        cycles={choices}
        cycleId={defaultCycleId(choices)}
        rows={rows.map((row) => ({
          id: row.id,
          title: row.title,
          recordType: row.record_type,
          typeLabel: types[row.record_type] || "ملاحظة",
          recordDate: day(row.record_date),
          dateLabel: formatDate(row.record_date),
          cost: row.cost ?? "",
          costLabel: row.cost ? formatMoney(row.cost) : "—",
          dosage: row.dosage || "",
          reason: row.reason || "",
          symptoms: row.symptoms || "",
          notes: row.notes || "",
        }))}
      />
    </Page>
  );
}
