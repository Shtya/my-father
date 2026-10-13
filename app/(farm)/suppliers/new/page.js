import { Field, Form, Sheet } from "@/components/form";

export default function NewSupplierPage() {
  return (
    <Sheet title="مورد جديد">
      <Form endpoint="/api/suppliers" redirectTo="/suppliers" submitLabel="حفظ" successMessage="المورد اتضاف." label="المورد" optimistic="supplier">
        <Field label="الاسم" name="name" required />
        <Field label="التليفون" name="phone" type="tel" />
        <Field label="بيبيع إيه" name="products" />
        <Field label="ملاحظات" name="notes" />
      </Form>
    </Sheet>
  );
}
