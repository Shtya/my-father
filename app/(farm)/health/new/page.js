import { CycleSelect } from "@/components/cycle-select";
import { Field, Form, Select, Sheet } from "@/components/form";
import { defaultCycleId } from "@/lib/cycle-rules";
import { listCycleChoices } from "@/lib/farm";
import { cairoToday } from "@/lib/format";

export default async function NewHealthPage({ searchParams }) {
  const params = await searchParams;
  const choices = await listCycleChoices();
  const cycleId = defaultCycleId(choices, params.cycleId);
  return (
    <Sheet title="تسجيل صحة">
      <p className="mb-3 text-sm text-muted">اكتب اللي حصل. التطبيق مش هيقولك تعالج بإيه.</p>
      <Form endpoint="/api/health" redirectTo="/health" submitLabel="حفظ" successMessage="السجل اتحفظ." label="سجل الصحة" optimistic="health">
        <CycleSelect cycles={choices} defaultValue={cycleId} allowEmpty />
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
