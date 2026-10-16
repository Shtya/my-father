import { CycleSelect } from "@/components/cycle-select";
import { Field, Form, Select, Sheet } from "@/components/form";
import { defaultCycleId } from "@/lib/cycle-rules";
import { getDailyLog, listCycleChoices, listInventory } from "@/lib/farm";
import { cairoToday, formatDate } from "@/lib/format";

export default async function LogPage({ searchParams }) {
  const params = await searchParams;
  const [choices, items] = await Promise.all([listCycleChoices(), listInventory()]);
  if (!choices.length) return <Sheet title="المتابعة اليومية"><p>ابدأ دورة الأول.</p></Sheet>;
  const cycleId = defaultCycleId(choices, params.cycleId);
  const selected = choices.find((item) => item.id === cycleId);
  const today = cairoToday();
  const logDate = /^\d{4}-\d{2}-\d{2}$/.test(params.date || "") && params.date <= today ? params.date : today;
  const saved = await getDailyLog(cycleId, logDate);
  const feed = items.find((item) => item.category === "feed") || items[0];
  const feedItemId = saved ? saved.feed_item_id || "" : params.focus === "weight" ? "" : feed?.id || "";
  const hasDetails = Boolean(saved && (saved.water_liters || saved.medicine_note || saved.vaccination_note || saved.symptoms || saved.notes));
  const closed = selected?.status !== "active";
  return (
    <Sheet eyebrow={selected?.name} title={logDate === today ? "متابعة النهارده" : `متابعة يوم ${formatDate(logDate)}`}>
      <Form endpoint="/api/daily-logs" redirectTo={`/cycle/${cycleId}`} submitLabel={saved ? "حفظ التعديل" : "حفظ المتابعة"} successMessage={saved ? "المتابعة اتعدلت." : "المتابعة اتسجلت."} label="المتابعة اليومية">
        {closed ? (
          <p className="border border-amber bg-amber-soft px-3 py-3 text-base">
            الدورة دي قديمة. اللي هتحفظه هيتسجل عليها، مش على الدورة الشغالة.
          </p>
        ) : null}
        {saved ? (
          <p className="border border-amber bg-amber-soft px-3 py-3 text-base">
            اليوم ده متسجل قبل كده، والأرقام اللي تحت هي اللي اتسجلت. غيّر اللي محتاج تغيره بس.
          </p>
        ) : null}
        <CycleSelect cycles={choices} defaultValue={cycleId} reloadOnChange />
        <input type="hidden" name="observations" value={saved?.observations || ""} />
        <Field label="التاريخ" name="logDate" type="date" required defaultValue={logDate} max={today} hint="لتعديل يوم قديم افتحه من صفحة الدورة." />
        <Field label="النفوق" name="mortality" type="number" min="0" defaultValue={saved ? String(saved.mortality ?? 0) : "0"} required />
        <Select label="السبب لو تحب" name="mortalityReason" defaultValue={saved?.mortality_reason || ""}>
          <option value="">من غير سبب</option>
          <option>مرض</option>
          <option>ضعف</option>
          <option>حرارة</option>
          <option>إصابة</option>
          <option>غير معروف</option>
        </Select>
        <Field label="متوسط وزن الفرخة بالكيلو" name="averageWeightKg" type="number" step="0.001" min="0" defaultValue={saved?.average_weight_kg ?? ""} hint="بالكيلو مش بالجرام. مثال: فرخة 1950 جرام تتكتب 1.95" />
        <Field label="علف مستهلك" name="feedConsumed" type="number" step="0.001" min="0" defaultValue={saved?.feed_consumed ?? ""} />
        <input type="hidden" name="feedUnit" value={saved?.feed_unit || feed?.unit || "كجم"} />
        <Select label="من مخزون" name="feedItemId" defaultValue={feedItemId}>
          <option value="">من غير خصم مخزون</option>
          {items.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.unit}</option>)}
        </Select>
        <details className="border border-line bg-paper p-3" open={hasDetails || (!saved && params.focus !== "weight")}>
          <summary className="cursor-pointer font-semibold">تفاصيل اليوم</summary>
          <div className="mt-3 space-y-4">
            <Field label="المية باللتر" name="waterLiters" type="number" step="0.1" defaultValue={saved?.water_liters ?? ""} />
            <Field label="دواء" name="medicineNote" defaultValue={saved?.medicine_note || ""} />
            <Field label="تطعيم" name="vaccinationNote" defaultValue={saved?.vaccination_note || ""} />
            <Field label="أعراض غير معتادة" name="symptoms" defaultValue={saved?.symptoms || ""} />
            <Field label="ملاحظة" name="notes" defaultValue={saved?.notes || ""} hint="مثال: الفراخ كويسة النهارده" />
          </div>
        </details>
      </Form>
    </Sheet>
  );
}
