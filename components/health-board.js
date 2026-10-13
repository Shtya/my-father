"use client";

import { Field, Form, Select, Sheet } from "@/components/form";
import { DataTable, DeleteSheet, useRecordActions } from "@/components/data-table";
import { useOptimisticRows } from "@/components/mutations";
import { cairoToday } from "@/lib/format";

const types = [
  ["medicine", "دواء"],
  ["vaccine", "تطعيم"],
  ["symptom", "عرض"],
  ["note", "ملاحظة"],
];

export function HealthBoard({ rows: serverRows, cycleId, renderedAt }) {
  const { rows } = useOptimisticRows("health", serverRows, renderedAt);
  const actions = useRecordActions("health", rows);
  const record = actions.sheet?.row;

  return (
    <>
      <DataTable
        columns={["الاسم", "النوع", "التاريخ", "التكلفة"]}
        empty="لسه ما فيش سجل صحة. دوس «تسجيل دواء أو عرض» تحت."
        addLabel="تسجيل دواء أو عرض"
        onAdd={() => actions.open({ type: "add" })}
        rows={rows.map((row) => ({
          id: row.id,
          name: row.title,
          pending: row.pending,
          cells: [row.title, row.typeLabel, row.dateLabel, row.costLabel],
          onEdit: () => actions.open({ type: "edit", row }),
          onDelete: () => actions.open({ type: "delete", row }),
        }))}
      />
      {actions.sheet?.type === "add" || actions.sheet?.type === "edit" ? (
        <Sheet title={record ? "تعديل سجل" : "تسجيل صحة"} onClose={actions.close}>
          <p className="mb-3 text-sm text-muted">اكتب اللي حصل. التطبيق مش هيقولك تعالج بإيه.</p>
          <Form
            endpoint={record ? `/api/health/${record.id}` : "/api/health"}
            method={record ? "PATCH" : "POST"}
            onDone={actions.close}
            submitLabel={record ? "حفظ التعديل" : "حفظ السجل"}
            successMessage={record ? "التعديل اتحفظ." : "السجل اتحفظ."}
            label="سجل الصحة"
            optimistic="health"
            record={record}
            reopen={{ scope: "health", rowId: record?.id }}
          >
            {!record ? <input type="hidden" name="cycleId" value={cycleId || ""} /> : null}
            <Select label="النوع" name="recordType" defaultValue={record?.recordType || "medicine"}>
              {types.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </Select>
            <Field label="الاسم" name="title" required defaultValue={record?.title || ""} hint="اسم الدواء أو العرض" />
            <Field label="التاريخ" name="recordDate" type="date" defaultValue={record?.recordDate || cairoToday()} />
            <Field label="الجرعة كما كتبتها" name="dosage" defaultValue={record?.dosage || ""} />
            <Field label="السبب" name="reason" defaultValue={record?.reason || ""} />
            <Field label="التكلفة" name="cost" type="number" step="0.01" min="0" defaultValue={record?.cost ?? ""} />
            <Field label="الأعراض" name="symptoms" defaultValue={record?.symptoms || ""} />
            <Field label="ملاحظات" name="notes" defaultValue={record?.notes || ""} />
          </Form>
        </Sheet>
      ) : null}
      {actions.sheet?.type === "delete" ? (
        <DeleteSheet
          title="حذف سجل"
          body={`تحذف سجل ${record.title}؟`}
          onClose={actions.close}
          onConfirm={() => actions.remove(`/api/health/${record.id}`, { message: "السجل اتحذف.", label: "سجل الصحة", id: record.id })}
        />
      ) : null}
    </>
  );
}
