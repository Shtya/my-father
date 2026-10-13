import { Field, Form, Sheet } from "@/components/form";

export default function NewCustomerPage() {
  return (
    <Sheet title="عميل جديد">
      <Form endpoint="/api/customers" redirectTo="/customers" submitLabel="حفظ" successMessage="العميل اتضاف." label="العميل" optimistic="customer">
        <Field label="الاسم" name="name" required />
        <Field label="التليفون" name="phone" type="tel" />
        <Field label="ملاحظات" name="notes" />
      </Form>
    </Sheet>
  );
}
