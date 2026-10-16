import { CycleSelect } from "@/components/cycle-select";
import { Field, Form, Select, Sheet } from "@/components/form";
import { defaultCycleId } from "@/lib/cycle-rules";
import { listCustomers, listCycleChoices } from "@/lib/farm";
import { cairoToday } from "@/lib/format";

export default async function NewSalePage({ searchParams }) {
  const params = await searchParams;
  const [choices, customers] = await Promise.all([listCycleChoices(), listCustomers()]);
  if (!choices.length) return <Sheet title="تسجيل بيع"><p>ابدأ دورة الأول عشان البيع يخصم من الفراخ الموجودة.</p></Sheet>;
  const cycleId = defaultCycleId(choices, params.cycleId);
  return (
    <Sheet title="تسجيل بيع">
      <Form endpoint="/api/sales" redirectTo="/sales" submitLabel="حفظ البيع" successMessage="البيع اتسجل." label="البيع" optimistic="sale">
        <CycleSelect cycles={choices} defaultValue={cycleId} showBirds />
        <Select label="العميل" name="customerId" defaultValue="">
          <option value="">عميل جديد</option>
          {customers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </Select>
        <Field label="أو اسم العميل" name="customerName" hint="مثال: محمد" />
        <Field label="العدد" name="birdCount" type="number" required min="1" />
        <Field label="الوزن كجم" name="weightKg" type="number" required step="0.001" min="0" />
        <Field label="سعر الكيلو" name="pricePerKg" type="number" required step="0.01" min="0" />
        <Field label="المدفوع" name="paidAmount" type="number" step="0.01" min="0" defaultValue="0" />
        <Field label="التاريخ" name="saleDate" type="date" required defaultValue={cairoToday()} />
        <p className="text-sm text-muted">الإجمالي والمتبقي بيتحسبوا لوحدهم. لو العدد أكبر من الفراخ الموجودة في الدورة المختارة، التسجيل هيتوقف.</p>
      </Form>
    </Sheet>
  );
}
