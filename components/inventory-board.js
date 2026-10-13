"use client";

import Link from "next/link";
import { Field, Form, Select, Sheet } from "@/components/form";
import { DataTable, DeleteSheet, useRecordActions } from "@/components/data-table";
import { useOptimisticRows } from "@/components/mutations";
import { formatMoney, formatNumber } from "@/lib/format";

export function InventoryBoard({ items, renderedAt }) {
  const { rows } = useOptimisticRows("inventory", items, renderedAt);
  const actions = useRecordActions("inventory", rows);
  const item = actions.sheet?.row;

  return (
    <>
      <DataTable
        columns={["الصنف", "الكمية", "متوسط التكلفة"]}
        empty="لسه ما فيش أصناف. دوس «إضافة صنف» تحت، أو سجّل شراء علف."
        addLabel="إضافة صنف"
        onAdd={() => actions.open({ type: "add" })}
        rows={rows.map((row) => ({
          id: row.id,
          name: row.name,
          pending: row.pending,
          cells: [
            row.name,
            <span key="qty" className={row.low ? "font-semibold text-clay" : ""}>{`${formatNumber(row.quantity, 1)} ${row.unit}`}{row.low ? " · قليل" : ""}</span>,
            formatMoney(row.avg_unit_cost),
          ],
          onEdit: () => actions.open({ type: "edit", row }),
          onDelete: () => actions.open({ type: "delete", row }),
        }))}
      />
      <Link href="/purchases/new" className="flex h-12 items-center justify-center border border-line bg-paper font-semibold">
        تسجيل شراء علف أو صنف
      </Link>
      {actions.sheet?.type === "edit" ? (
        <Sheet title={`تعديل كمية ${item.name}`} onClose={actions.close}>
          <p className="mb-3 text-sm text-muted">اكتب الكمية الموجودة فعلًا دلوقتي. الفرق هيتسجل كتعديل مخزون.</p>
          <Form
            endpoint={`/api/inventory/${item.id}`}
            method="PATCH"
            onDone={actions.close}
            submitLabel="حفظ الكمية"
            successMessage="الكمية اتحفظت."
            label="الكمية"
            optimistic="inventory"
            record={item}
            reopen={{ scope: "inventory", rowId: item.id }}
          >
            <Field label={`الكمية (${item.unit})`} name="quantity" type="number" step="0.001" min="0" required defaultValue={item.quantity} />
            <Field label="سبب التعديل" name="notes" hint="مثال: جرد، أو كيس اتقطع" />
          </Form>
        </Sheet>
      ) : null}
      {actions.sheet?.type === "delete" ? (
        <DeleteSheet
          title={`حذف ${item.name}`}
          body={`تحذف ${item.name} من المخزون؟ حركات الصنف ده هتتحذف معاه، والمصاريف المسجلة هتفضل.`}
          onClose={actions.close}
          onConfirm={() => actions.remove(`/api/inventory/${item.id}`, { message: "الصنف اتحذف.", label: "الصنف", id: item.id })}
        />
      ) : null}
      {actions.sheet?.type === "add" ? (
        <Sheet title="إضافة صنف" onClose={actions.close}>
          <Form
            endpoint="/api/inventory"
            onDone={actions.close}
            submitLabel="حفظ الصنف"
            successMessage="الصنف اتضاف."
            label="الصنف"
            optimistic="inventory"
            reopen={{ scope: "inventory" }}
          >
            <Field label="اسم الصنف" name="name" required hint="مثال: علف بادي" />
            <Select label="النوع" name="category" defaultValue="feed">
              <option value="feed">علف</option>
              <option value="corn">ذرة</option>
              <option value="soy">صويا</option>
              <option value="bran">ردة</option>
              <option value="clover">برسيم</option>
              <option value="other">أخرى</option>
            </Select>
            <Field label="الوحدة" name="unit" defaultValue="كجم" />
            <Field label="الكمية الموجودة" name="quantity" type="number" step="0.001" min="0" defaultValue="0" />
          </Form>
        </Sheet>
      ) : null}
    </>
  );
}
