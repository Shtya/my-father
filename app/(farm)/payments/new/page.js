import { Field, Form, Select, Sheet } from "@/components/form";
import { listCustomers, listSuppliers } from "@/lib/farm";
import { cairoToday } from "@/lib/format";

export default async function NewPaymentPage({ searchParams }) {
  const params = await searchParams;
  const direction = params.direction === "out" ? "out" : "in";
  const [customers, suppliers] = await Promise.all([listCustomers(), listSuppliers()]);
  return (
    <Sheet title={direction === "out" ? "سداد لمورد" : "تسجيل دفعة"}>
      <Form endpoint="/api/payments" redirectTo={direction === "out" ? "/suppliers" : "/customers"} submitLabel="حفظ الدفعة">
        <input type="hidden" name="direction" value={direction} />
        {direction === "in" ? (
          <Select label="العميل" name="customerId" required defaultValue={customers[0]?.id || ""}>
            {customers.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.remaining}</option>)}
          </Select>
        ) : (
          <Select label="المورد" name="supplierId" required defaultValue={suppliers[0]?.id || ""}>
            {suppliers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </Select>
        )}
        <Field label="المبلغ" name="amount" type="number" required step="0.01" min="0" />
        <Field label="التاريخ" name="paymentDate" type="date" defaultValue={cairoToday()} />
        <Field label="ملاحظة" name="notes" />
      </Form>
    </Sheet>
  );
}
