"use client";

import Link from "next/link";
import { Field, Form, Sheet } from "@/components/form";
import { DataTable, DeleteSheet, useRecordActions } from "@/components/data-table";

export function PeopleBoard({ kind, rows }) {
  const actions = useRecordActions();
  const record = actions.sheet?.row;
  const customer = kind === "customer";
  const endpoint = customer ? "/api/customers" : "/api/suppliers";
  const noun = customer ? "العميل" : "المورد";

  return (
    <>
      <DataTable
        columns={customer ? ["الاسم", "التليفون", "عليه", "الإجمالي"] : ["الاسم", "التليفون", "علينا", "الإجمالي"]}
        empty={customer ? "ما فيش عملاء." : "ما فيش موردين."}
        addLabel={customer ? "عميل جديد" : "مورد جديد"}
        onAdd={() => actions.open({ type: "add" })}
        rows={rows.map((row) => ({
          id: row.id,
          cells: [
            <Link key="name" href={row.href} className="font-semibold">{row.name}</Link>,
            row.phone || "—",
            row.remainingLabel,
            row.totalLabel,
          ],
          onEdit: () => actions.open({ type: "edit", row }),
          onDelete: () => actions.open({ type: "delete", row }),
        }))}
      />
      {actions.sheet?.type === "add" || actions.sheet?.type === "edit" ? (
        <Sheet title={record ? `تعديل ${noun}` : `${noun} جديد`} onClose={actions.close}>
          <Form
            endpoint={record ? `${endpoint}/${record.id}` : endpoint}
            method={record ? "PATCH" : "POST"}
            onDone={actions.close}
            submitLabel="حفظ"
          >
            <Field label="الاسم" name="name" required defaultValue={record?.name || ""} />
            <Field label="التليفون" name="phone" defaultValue={record?.phone || ""} />
            {customer ? null : <Field label="بيبيع إيه" name="products" defaultValue={record?.products || ""} />}
            <Field label="ملاحظات" name="notes" defaultValue={record?.notes || ""} />
          </Form>
        </Sheet>
      ) : null}
      {actions.sheet?.type === "delete" ? (
        <DeleteSheet
          title={`حذف ${noun}`}
          body={customer ? "تحذف العميل؟ البيوع المسجلة هتفضل من غير اسمه." : "تحذف المورد؟ المصاريف هتفضل من غير اسمه."}
          error={actions.error}
          pending={actions.pending}
          onClose={actions.close}
          onConfirm={() => actions.remove(`${endpoint}/${record.id}`)}
        />
      ) : null}
    </>
  );
}
