"use client";

import { Field, Form, Select, Sheet } from "@/components/form";
import { DataTable, DeleteSheet, useRecordActions } from "@/components/data-table";
import { cairoToday } from "@/lib/format";

export function SalesBoard({ rows, customers, cycleId }) {
  const actions = useRecordActions();
  const record = actions.sheet?.row;

  return (
    <>
      <DataTable
        columns={["العميل", "الإجمالي", "التاريخ", "العدد", "المتبقي"]}
        empty="لسه ما فيش بيع. دوس «تسجيل بيع» تحت لما تبيع فراخ."
        addLabel="تسجيل بيع"
        note={rows.length >= 200 ? "ظاهر آخر 200 بيع. للأقدم استخدم التقارير." : ""}
        onAdd={() => actions.open({ type: "add" })}
        rows={rows.map((row) => ({
          id: row.id,
          name: row.customerName || "بيع نقدي",
          cells: [row.customerName || "بيع نقدي", row.totalLabel, row.dateLabel, row.birdsLabel, row.remainingLabel],
          onEdit: () => actions.open({ type: "edit", row }),
          onDelete: () => actions.open({ type: "delete", row }),
        }))}
      />
      {actions.sheet?.type === "add" || actions.sheet?.type === "edit" ? (
        <Sheet title={record ? "تعديل بيع" : "تسجيل بيع"} onClose={actions.close}>
          {record || cycleId ? (
            <Form
              endpoint={record ? `/api/sales/${record.id}` : "/api/sales"}
              method={record ? "PATCH" : "POST"}
              onDone={actions.close}
              submitLabel={record ? "حفظ التعديل" : "حفظ البيع"}
              successMessage={record ? "التعديل اتحفظ." : "البيع اتسجل."}
            >
              {!record ? <input type="hidden" name="cycleId" value={cycleId} /> : null}
              <Select label="العميل" name="customerId" defaultValue={record?.customerId || ""}>
                <option value="">عميل جديد</option>
                {customers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </Select>
              <Field label="أو اسم العميل" name="customerName" />
              <Field label="العدد" name="birdCount" type="number" required min="1" defaultValue={record?.birdCount ?? ""} />
              <Field label="الوزن كجم" name="weightKg" type="number" required step="0.001" min="0" defaultValue={record?.weightKg ?? ""} />
              <Field label="سعر الكيلو" name="pricePerKg" type="number" required step="0.01" min="0" defaultValue={record?.pricePerKg ?? ""} />
              {!record ? <Field label="المدفوع" name="paidAmount" type="number" step="0.01" min="0" defaultValue="0" /> : null}
              <Field label="التاريخ" name="saleDate" type="date" required defaultValue={record?.saleDate || cairoToday()} />
              <Field label="ملاحظات" name="notes" defaultValue={record?.notes || ""} />
            </Form>
          ) : <p className="text-sm">ابدأ دورة الأول عشان البيع يخصم من الفراخ الموجودة.</p>}
        </Sheet>
      ) : null}
      {actions.sheet?.type === "delete" ? (
        <DeleteSheet
          title="حذف بيع"
          body={`تحذف بيع ${record.birdsLabel} فرخة بـ ${record.totalLabel} يوم ${record.dateLabel}؟ العدد هيرجع للفراخ الموجودة، والدفعات المسجلة على البيع ده هتتحذف معاه.`}
          error={actions.error}
          pending={actions.pending}
          onClose={actions.close}
          onConfirm={() => actions.remove(`/api/sales/${record.id}`, "البيع اتحذف.")}
        />
      ) : null}
    </>
  );
}
