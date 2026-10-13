import { cairoToday } from "@/lib/format";
import { Field, Form, Select, Sheet } from "@/components/form";

export default function NewCyclePage() {
  return (
    <Sheet title="دورة جديدة">
      <Form endpoint="/api/cycles" redirectTo="/cycle" submitLabel="حفظ الدورة" successMessage="الدورة اتفتحت." label="الدورة الجديدة">
        <Field label="اسم الدورة" name="name" required hint="مثال: دورة أكتوبر" />
        <Field label="تاريخ البداية" name="startDate" type="date" required defaultValue={cairoToday()} />
        <Field label="عدد الكتاكيت" name="initialQuantity" type="number" required min="1" />
        <Field label="سعر الكتكوت" name="chickUnitPrice" type="number" step="0.01" min="0" />
        <details className="border border-line bg-paper p-3">
          <summary className="cursor-pointer font-semibold">تفاصيل إضافية</summary>
          <div className="mt-3 space-y-4">
            <Select label="نوع الفراخ" name="poultryType" defaultValue="تسمين">
              <option>تسمين</option>
              <option>بياض</option>
              <option>بلدي</option>
              <option>أخرى</option>
            </Select>
            <Field label="السلالة" name="breed" />
            <Field label="المورد" name="chickSupplier" />
            <Field label="المكان" name="location" />
            <Field label="تاريخ البيع المتوقع" name="expectedSellDate" type="date" />
            <Field label="الوزن المستهدف كجم" name="targetWeightKg" type="number" step="0.01" />
            <Field label="ملاحظات" name="notes" />
          </div>
        </details>
      </Form>
    </Sheet>
  );
}
