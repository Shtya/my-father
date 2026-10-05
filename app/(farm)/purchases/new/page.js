import { Field, Form, Select, Sheet } from "@/components/form";
import { getActiveCycle, listInventory, listSuppliers } from "@/lib/farm";
import { cairoToday } from "@/lib/format";

export default async function NewPurchasePage() {
  const [items, suppliers, cycle] = await Promise.all([listInventory(), listSuppliers(), getActiveCycle()]);
  return (
    <Sheet title="إضافة شراء">
      <Form endpoint="/api/purchases" redirectTo="/inventory" submitLabel="حفظ الشراء">
        <input type="hidden" name="cycleId" value={cycle?.cycle.id || ""} />
        <Select label="الصنف" name="itemId" required defaultValue={items[0]?.id}>
          {items.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.unit}</option>)}
        </Select>
        <Field label="الكمية" name="quantity" type="number" required step="0.001" min="0" />
        <Field label="سعر الوحدة" name="unitPrice" type="number" required step="0.01" min="0" />
        <Field label="التاريخ" name="date" type="date" required defaultValue={cairoToday()} />
        <Select label="الدفع" name="paymentMethod" defaultValue="cash">
          <option value="cash">كاش</option>
          <option value="partial">جزء والباقي علينا</option>
          <option value="credit">آجل كله</option>
        </Select>
        <Field label="المدفوع لو مش كله" name="paidAmount" type="number" step="0.01" min="0" />
        <Select label="المورد" name="supplierId" defaultValue="">
          <option value="">من غير مورد</option>
          {suppliers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </Select>
        <Field label="أو اسم مورد جديد" name="supplierName" />
      </Form>
    </Sheet>
  );
}
