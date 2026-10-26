"use client";

import { ExpenseCycleFields } from "@/components/cycle-select";
import { Field, Form, Select, Sheet } from "@/components/form";
import { DataTable, DeleteSheet, useRecordActions } from "@/components/data-table";
import { useOptimisticRows } from "@/components/mutations";
import { groupExpensesByCycle } from "@/lib/cycle-rules";
import { cairoToday, formatMoney } from "@/lib/format";

export function ExpensesBoard({ rows: serverRows, categories, suppliers, cycles, cycleId, rememberedId, renderedAt }) {
  const { rows } = useOptimisticRows("expenses", serverRows, renderedAt);
  const actions = useRecordActions("expenses", rows);
  const record = actions.sheet?.row;
  const groups = groupExpensesByCycle(rows, cycles, rememberedId);
  const formCycleId = record?.cycleId || actions.sheet?.cycleId || cycleId;

  return (
    <div className="space-y-5">
      {groups.map((group) => {
        const total = group.rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
        const tag = group.status === "active" ? "شغالة" : group.status === "closed" ? "قديمة" : "";
        const title = [group.name, tag, group.preferred ? "افتراضية" : ""].filter(Boolean).join(" — ");
        return (
          <section key={group.id || "none"}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <h2 className="text-base font-bold">{title}</h2>
              <p className="num text-base font-bold">{formatMoney(total)}</p>
            </div>
            <DataTable
              columns={["النوع", "المبلغ", "التاريخ", "المورد"]}
              empty={group.id ? "ما فيش مصاريف على الدورة دي." : "ما فيش مصاريف من غير دورة."}
              addLabel="إضافة مصروف"
              onAdd={() => actions.open({ type: "add", cycleId: group.id })}
              rows={group.rows.map((row) => ({
                id: row.id,
                name: row.categoryName,
                pending: row.pending,
                cells: [row.categoryName, row.amountLabel, row.dateLabel, row.supplierName || "—"],
                onEdit: () => actions.open({ type: "edit", row }),
                onDelete: () => actions.open({ type: "delete", row }),
              }))}
            />
          </section>
        );
      })}
      {rows.length >= 200 ? <p className="text-sm text-muted">ظاهر آخر 200 مصروف. للأقدم استخدم التقارير.</p> : null}
      {actions.sheet?.type === "add" || actions.sheet?.type === "edit" ? (
        <Sheet title={record ? "تعديل مصروف" : "إضافة مصروف"} onClose={actions.close}>
          <ExpenseForm
            row={record}
            categories={categories}
            suppliers={suppliers}
            cycles={cycles}
            cycleId={formCycleId}
            rememberedId={rememberedId}
            onDone={actions.close}
          />
        </Sheet>
      ) : null}
      {actions.sheet?.type === "delete" ? (
        <DeleteSheet
          title="حذف مصروف"
          body={`تحذف مصروف ${record.categoryName} بـ ${record.amountLabel} يوم ${record.dateLabel}؟ لو كان شراء دخل المخزون، الكمية هتتشال من المخزون.`}
          onClose={actions.close}
          onConfirm={() => actions.remove(`/api/expenses/${record.id}`, { message: "المصروف اتحذف.", label: "المصروف", id: record.id, delta: record.amount })}
        />
      ) : null}
    </div>
  );
}

function ExpenseForm({ row, categories, suppliers, cycles = [], cycleId, rememberedId, onDone }) {
  return (
    <Form
      endpoint={row ? `/api/expenses/${row.id}` : "/api/expenses"}
      method={row ? "PATCH" : "POST"}
      onDone={onDone}
      submitLabel={row ? "حفظ التعديل" : "حفظ المصروف"}
      successMessage={row ? "التعديل اتحفظ." : "المصروف اتسجل."}
      label="المصروف"
      optimistic="expense"
      record={row}
      reopen={{ scope: "expenses", rowId: row?.id, cycleId }}
    >
      <Select label="نوع المصروف" name="categoryId" required defaultValue={row?.categoryId || "feed"}>
        {categories.map((item) => <option key={item.id} value={item.id}>{item.name_ar}</option>)}
      </Select>
      <Field label="المبلغ" name="amount" type="number" step="0.01" min="0" required defaultValue={row?.amount ?? ""} />
      <Field label="التاريخ" name="expenseDate" type="date" required defaultValue={row?.expenseDate || cairoToday()} />
      <ExpenseCycleFields cycles={cycles} defaultValue={cycleId} rememberedId={rememberedId} />
      <Select label="طريقة الدفع" name="paymentMethod" defaultValue={row?.paymentMethod || "cash"}>
        <option value="cash">كاش</option>
        <option value="partial">جزء كاش والباقي آجل</option>
        <option value="credit">آجل</option>
      </Select>
      <Field label="المدفوع لو مش كله" name="paidAmount" type="number" step="0.01" min="0" defaultValue={row?.paidAmount ?? ""} />
      <Field label="الكمية" name="quantity" type="number" step="0.001" defaultValue={row?.quantity ?? ""} />
      <Field label="الوحدة" name="unit" defaultValue={row?.unit || ""} hint="مثال: كجم" />
      <Field label="سعر الوحدة" name="unitPrice" type="number" step="0.01" defaultValue={row?.unitPrice ?? ""} />
      <Select label="المورد" name="supplierId" defaultValue={row?.supplierId || ""}>
        <option value="">من غير مورد</option>
        {suppliers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </Select>
      <Field label="أو اسم مورد جديد" name="supplierName" />
      <Field label="ملاحظات" name="notes" defaultValue={row?.notes || ""} />
    </Form>
  );
}
