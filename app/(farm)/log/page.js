import { Field, Form, Select, Sheet } from "@/components/form";
import { getActiveCycle, listInventory } from "@/lib/farm";
import { cairoToday } from "@/lib/format";

export default async function LogPage({ searchParams }) {
  const params = await searchParams;
  const [cycle, items] = await Promise.all([getActiveCycle(), listInventory()]);
  if (!cycle) return <Sheet title="المتابعة اليومية"><p>ابدأ دورة الأول.</p></Sheet>;
  const feed = items.find((item) => item.category === "feed") || items[0];
  return (
    <Sheet eyebrow={cycle.cycle.name} title="متابعة النهارده">
      <Form endpoint="/api/daily-logs" redirectTo="/home" submitLabel="حفظ المتابعة">
        <input type="hidden" name="cycleId" value={cycle.cycle.id} />
        <Field label="التاريخ" name="logDate" type="date" required defaultValue={cairoToday()} />
        <Field label="النفوق" name="mortality" type="number" min="0" defaultValue="0" required />
        <Select label="السبب لو تحب" name="mortalityReason" defaultValue="">
          <option value="">من غير سبب</option>
          <option>مرض</option>
          <option>ضعف</option>
          <option>حرارة</option>
          <option>إصابة</option>
          <option>غير معروف</option>
        </Select>
        <Field label="متوسط الوزن كجم" name="averageWeightKg" type="number" step="0.001" min="0" />
        <Field label="علف مستهلك" name="feedConsumed" type="number" step="0.001" min="0" />
        <input type="hidden" name="feedUnit" value={feed?.unit || "كجم"} />
        <Select label="من مخزون" name="feedItemId" defaultValue={params.focus === "weight" ? "" : feed?.id || ""}>
          <option value="">من غير خصم مخزون</option>
          {items.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.unit}</option>)}
        </Select>
        <details className="border border-line bg-paper p-3" open={params.focus !== "weight"}>
          <summary className="cursor-pointer font-semibold">تفاصيل اليوم</summary>
          <div className="mt-3 space-y-4">
            <Field label="المية باللتر" name="waterLiters" type="number" step="0.1" />
            <Field label="دواء" name="medicineNote" />
            <Field label="تطعيم" name="vaccinationNote" />
            <Field label="أعراض غير معتادة" name="symptoms" />
            <Field label="ملاحظة" name="notes" hint="مثال: الفراخ كويسة النهارده" />
          </div>
        </details>
      </Form>
    </Sheet>
  );
}
