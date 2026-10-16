import { CycleSelect } from "@/components/cycle-select";
import { Field, Form, Select, Sheet } from "@/components/form";
import { defaultCycleId } from "@/lib/cycle-rules";
import { listCategories, listCycleChoices, listInventory, listSuppliers } from "@/lib/farm";
import { cairoToday } from "@/lib/format";

const EXPENSE_CATEGORY = new Set(["feed", "corn", "soy", "clover"]);

export default async function NewPurchasePage({ searchParams }) {
  const params = await searchParams;
  const [items, suppliers, choices, categories] = await Promise.all([listInventory(), listSuppliers(), listCycleChoices(), listCategories()]);
  const categoryName = Object.fromEntries(categories.map((item) => [item.id, item.name_ar]));
  const cycleId = defaultCycleId(choices, params.cycleId);
  return (
    <Sheet title="إضافة شراء">
      <Form endpoint="/api/purchases" redirectTo="/inventory" submitLabel="حفظ الشراء" successMessage="الشراء اتسجل." label="الشراء" optimistic="purchase">
        <CycleSelect cycles={choices} defaultValue={cycleId} allowEmpty />
        <Select label="الصنف" name="itemId" required defaultValue={items[0]?.id}>
          {items.map((item) => {
            const category = EXPENSE_CATEGORY.has(item.category) ? item.category : "other";
            return (
              <option
                key={item.id}
                value={item.id}
                data-unit={item.unit}
                data-category-id={category}
                data-category-name={categoryName[category] || ""}
              >
                {item.name} · {item.unit}
              </option>
            );
          })}
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
