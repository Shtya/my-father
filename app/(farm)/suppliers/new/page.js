import { Field, Form, Sheet } from "@/components/form";

export default function NewSupplierPage() {
  return (
    <Sheet title="مورد جديد">
      <Form endpoint="/api/suppliers" redirectTo="/suppliers" submitLabel="حفظ">
        <Field label="الاسم" name="name" required />
        <Field label="التليفون" name="phone" />
        <Field label="بيبيع إيه" name="products" />
        <Field label="ملاحظات" name="notes" />
      </Form>
    </Sheet>
  );
}
