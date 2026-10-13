import { Field, Form, Select, Sheet } from "@/components/form";
import { getActiveCycle, listCategories, listSuppliers } from "@/lib/farm";
import { cairoToday } from "@/lib/format";

export default async function NewExpensePage() {
  const [categories, suppliers, cycle] = await Promise.all([listCategories(), listSuppliers(), getActiveCycle()]);
  return (
    <Sheet title="إضافة مصروف">
      <Form endpoint="/api/expenses" redirectTo="/expenses" submitLabel="حفظ المصروف" successMessage="المصروف اتسجل." label="المصروف" optimistic="expense">
        <Select label="نوع المصروف" name="categoryId" required defaultValue="feed">
          {categories.map((item) => <option key={item.id} value={item.id}>{item.name_ar}</option>)}
        </Select>
        <Field label="المبلغ" name="amount" type="number" step="0.01" min="0" required />
        <Field label="التاريخ" name="expenseDate" type="date" required defaultValue={cairoToday()} />
        <input type="hidden" name="cycleId" value={cycle?.cycle.id || ""} />
        <details className="border border-line bg-paper p-3">
          <summary className="cursor-pointer font-semibold">تفاصيل إضافية</summary>
          <div className="mt-3 space-y-4">
            <Select label="طريقة الدفع" name="paymentMethod" defaultValue="cash">
              <option value="cash">كاش</option>
              <option value="partial">جزء كاش والباقي آجل</option>
              <option value="credit">آجل</option>
            </Select>
            <Field label="المدفوع لو مش كله" name="paidAmount" type="number" step="0.01" min="0" />
            <Field label="الكمية" name="quantity" type="number" step="0.001" />
            <Field label="الوحدة" name="unit" hint="مثال: كجم" />
            <Field label="سعر الوحدة" name="unitPrice" type="number" step="0.01" />
            <Select label="المورد" name="supplierId" defaultValue="">
              <option value="">من غير مورد</option>
              {suppliers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </Select>
            <Field label="أو اسم مورد جديد" name="supplierName" />
            <Field label="ملاحظات" name="notes" />
          </div>
        </details>
      </Form>
    </Sheet>
  );
}
