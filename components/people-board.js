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
        empty={customer ? "لسه ما فيش عملاء. دوس «إضافة عميل» تحت، أو سجّل بيع باسمه." : "لسه ما فيش موردين. دوس «إضافة مورد» تحت."}
        addLabel={customer ? "إضافة عميل" : "إضافة مورد"}
        onAdd={() => actions.open({ type: "add" })}
        rows={rows.map((row) => ({
          id: row.id,
          name: row.name,
          cells: [
            <Link key="name" href={row.href} className="inline-flex min-h-11 items-center font-semibold text-green underline underline-offset-4">{row.name}</Link>,
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
            submitLabel={record ? "حفظ التعديل" : `حفظ ${noun}`}
            successMessage={record ? "التعديل اتحفظ." : `${noun} اتضاف.`}
          >
            <Field label="الاسم" name="name" required defaultValue={record?.name || ""} />
            <Field label="التليفون" name="phone" type="tel" defaultValue={record?.phone || ""} />
            {customer ? null : <Field label="بيبيع إيه" name="products" defaultValue={record?.products || ""} />}
            <Field label="ملاحظات" name="notes" defaultValue={record?.notes || ""} />
          </Form>
        </Sheet>
      ) : null}
      {actions.sheet?.type === "delete" ? (
        <DeleteSheet
          title={`حذف ${noun}`}
          body={`تحذف ${record.name}؟ الحذف متاح بس لو ما فيش عليه حساب متسجل.`}
          error={actions.error}
          pending={actions.pending}
          onClose={actions.close}
          onConfirm={() => actions.remove(`${endpoint}/${record.id}`, `${noun} اتحذف.`)}
        />
      ) : null}
    </>
  );
}
