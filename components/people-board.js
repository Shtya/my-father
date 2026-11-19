"use client";

import Link from "next/link";
import { Field, Form, Sheet } from "@/components/form";
import { DataTable, DeleteSheet, useRecordActions } from "@/components/data-table";
import { useOptimisticRows } from "@/components/mutations";
import { formatMoney } from "@/lib/format";

function moneyInput(value) {
  const number = Math.round(Number(value) * 100) / 100;
  return Number.isFinite(number) ? String(number) : "";
}

export function PeopleBoard({ kind, rows: serverRows, renderedAt }) {
  const customer = kind === "customer";
  const scope = customer ? "customers" : "suppliers";
  const { rows } = useOptimisticRows(scope, serverRows, renderedAt);
  const actions = useRecordActions(scope, rows);
  const record = actions.sheet?.row;
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
          pending: row.pending,
          cells: [
            row.pending
              ? <span key="name">{row.name}</span>
              : <Link key="name" href={row.href} className="inline-flex min-h-11 items-center font-semibold text-green underline underline-offset-4">{row.name}</Link>,
            row.phone || "—",
            formatMoney(row.remaining),
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
            label={noun}
            optimistic={customer ? "customer" : "supplier"}
            record={record}
            reopen={{ scope, rowId: record?.id }}
          >
            <Field label="الاسم" name="name" required defaultValue={record?.name || ""} />
            <Field label="التليفون" name="phone" type="tel" defaultValue={record?.phone || ""} />
            {customer ? null : <Field label="بيبيع إيه" name="products" defaultValue={record?.products || ""} />}
            <Field label="ملاحظات" name="notes" defaultValue={record?.notes || ""} />
            {customer ? null : (
              <>
                <Field
                  label="الإجمالي"
                  name="totalAmount"
                  type="number"
                  required={Boolean(record)}
                  step="0.01"
                  min="0"
                  defaultValue={record ? moneyInput(record.total) : ""}
                  hint="الرقم الجديد على نفس القيمة. أصغر يخصم، وأكبر يزوّد."
                />
                <Field
                  label="علينا"
                  name="owedAmount"
                  type="number"
                  required={Boolean(record)}
                  step="0.01"
                  min="0"
                  defaultValue={record ? moneyInput(record.remaining) : ""}
                  hint="الباقي اللي لسه علينا له."
                />
              </>
            )}
          </Form>
        </Sheet>
      ) : null}
      {actions.sheet?.type === "delete" ? (
        <DeleteSheet
          title={`حذف ${noun}`}
          body={`تحذف ${record.name}؟ الحذف متاح بس لو ما فيش عليه حساب متسجل.`}
          onClose={actions.close}
          onConfirm={() => actions.remove(`${endpoint}/${record.id}`, { message: `${noun} اتحذف.`, label: noun, id: record.id, delta: record.remaining })}
        />
      ) : null}
    </>
  );
}
