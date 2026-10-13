import { Field, Form, Select, Sheet } from "@/components/form";
import { getActiveCycle } from "@/lib/farm";
import { cairoToday } from "@/lib/format";

export default async function NewHealthPage() {
  const cycle = await getActiveCycle();
  return (
    <Sheet title="تسجيل صحة">
      <p className="text-sm text-muted">اكتب اللي حصل. التطبيق مش هيقولك تعالج بإيه.</p>
      <Form endpoint="/api/health" redirectTo="/health" submitLabel="حفظ" successMessage="السجل اتحفظ." label="سجل الصحة" optimistic="health">
        <input type="hidden" name="cycleId" value={cycle?.cycle.id || ""} />
        <Select label="النوع" name="recordType" defaultValue="medicine">
          <option value="medicine">دواء</option>
          <option value="vaccine">تطعيم</option>
          <option value="symptom">عرض</option>
          <option value="note">ملاحظة</option>
        </Select>
        <Field label="الاسم" name="title" required hint="اسم الدواء أو العرض" />
        <Field label="التاريخ" name="recordDate" type="date" defaultValue={cairoToday()} />
        <Field label="الجرعة كما كتبتها" name="dosage" />
        <Field label="السبب" name="reason" />
        <Field label="التكلفة" name="cost" type="number" step="0.01" min="0" />
        <Field label="الأعراض" name="symptoms" />
        <Field label="ملاحظات" name="notes" />
      </Form>
    </Sheet>
  );
}
