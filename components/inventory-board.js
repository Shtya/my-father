"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Field, Form, Select, Sheet } from "@/components/form";
import { DataTable, DeleteSheet } from "@/components/data-table";
import { formatMoney, formatNumber } from "@/lib/format";

export function InventoryBoard({ items }) {
  const router = useRouter();
  const [sheet, setSheet] = useState(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function remove(item) {
    if (pending) return;
    setPending(true);
    setError("");
    const response = await fetch(`/api/inventory/${item.id}`, { method: "DELETE" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setPending(false);
      setError(data.error || "ما قدرناش نحذف الصنف");
      return;
    }
    setPending(false);
    setSheet(null);
    router.refresh();
  }

  return (
    <>
      <DataTable
        columns={["الصنف", "الكمية", "متوسط التكلفة"]}
        empty="ما فيش أصناف في المخزون."
        addLabel="صنف جديد"
        onAdd={() => { setError(""); setSheet({ type: "add" }); }}
        rows={items.map((item) => ({
          id: item.id,
          cells: [item.name, `${formatNumber(item.quantity, 1)} ${item.unit}`, formatMoney(item.avg_unit_cost)],
          onEdit: () => { setError(""); setSheet({ type: "edit", item }); },
          onDelete: () => { setError(""); setSheet({ type: "delete", item }); },
        }))}
      />
      {sheet?.type === "edit" ? (
        <Sheet title={`تعديل ${sheet.item.name}`} onClose={() => setSheet(null)}>
          <Form endpoint={`/api/inventory/${sheet.item.id}`} method="PATCH" onDone={() => setSheet(null)} submitLabel="حفظ">
            <Field label="الكمية" name="quantity" type="number" step="0.001" min="0" required defaultValue={sheet.item.quantity} />
            <Field label="سبب التعديل" name="notes" />
          </Form>
        </Sheet>
      ) : null}
      {sheet?.type === "delete" ? (
        <DeleteSheet
          title={`حذف ${sheet.item.name}`}
          body="تحذف الصنف من المخزون؟"
          error={error}
          pending={pending}
          onClose={() => setSheet(null)}
          onConfirm={() => remove(sheet.item)}
        />
      ) : null}
      {sheet?.type === "add" ? (
        <Sheet title="صنف جديد" onClose={() => setSheet(null)}>
          <Form endpoint="/api/inventory" onDone={() => setSheet(null)} submitLabel="إضافة">
            <Field label="الاسم" name="name" required />
            <Select label="النوع" name="category" defaultValue="feed">
              <option value="feed">علف</option>
              <option value="corn">ذرة</option>
              <option value="soy">صويا</option>
              <option value="bran">ردة</option>
              <option value="clover">برسيم</option>
              <option value="other">أخرى</option>
            </Select>
            <Field label="الوحدة" name="unit" defaultValue="كجم" />
            <Field label="الكمية" name="quantity" type="number" step="0.001" min="0" defaultValue="0" />
          </Form>
        </Sheet>
      ) : null}
    </>
  );
}
