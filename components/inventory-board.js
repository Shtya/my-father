"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Field, Form, Select, Sheet } from "@/components/form";
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
    setPending(false);
    if (!response.ok) {
      setError(data.error || "ما قدرناش نحذف الصنف");
      return;
    }
    setSheet(null);
    router.refresh();
  }

  return (
    <>
      <div className="border-y border-line bg-paper">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-3 border-b border-line px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{item.name}</p>
              <p className="text-xs text-muted">{formatNumber(item.quantity, 1)} {item.unit} · {formatMoney(item.avg_unit_cost)}</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button type="button" className="h-9 border border-line px-3 text-sm" onClick={() => { setError(""); setSheet({ type: "edit", item }); }}>تعديل</button>
              <button type="button" className="h-9 border border-line px-3 text-sm text-clay" onClick={() => { setError(""); setSheet({ type: "delete", item }); }}>حذف</button>
            </div>
          </div>
        ))}
        <button type="button" className="h-11 w-full text-sm font-semibold" onClick={() => { setError(""); setSheet({ type: "add" }); }}>
          صنف جديد
        </button>
      </div>
      {sheet?.type === "edit" ? (
        <Sheet title={`تعديل ${sheet.item.name}`} onClose={() => setSheet(null)}>
          <Form endpoint={`/api/inventory/${sheet.item.id}`} method="PATCH" redirectTo="/inventory" submitLabel="حفظ">
            <Field label="الكمية" name="quantity" type="number" step="0.001" min="0" required defaultValue={sheet.item.quantity} />
            <Field label="سبب التعديل" name="notes" />
          </Form>
        </Sheet>
      ) : null}
      {sheet?.type === "delete" ? (
        <Sheet title={`حذف ${sheet.item.name}`} onClose={() => setSheet(null)}>
          <p className="text-sm">تحذف الصنف من المخزون؟</p>
          {error ? <p className="mt-3 bg-clay-soft px-3 py-3 text-clay">{error}</p> : null}
          <button type="button" disabled={pending} className="mt-4 h-12 w-full bg-green font-semibold disabled:opacity-60" onClick={() => remove(sheet.item)}>
            {pending ? "بيتحذف..." : "حذف"}
          </button>
        </Sheet>
      ) : null}
      {sheet?.type === "add" ? (
        <Sheet title="صنف جديد" onClose={() => setSheet(null)}>
          <Form endpoint="/api/inventory" redirectTo="/inventory" submitLabel="إضافة">
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
