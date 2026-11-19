"use client";

import { useCallback, useState } from "react";
import { Field, Form, Sheet } from "@/components/form";
import { useReopen } from "@/components/mutations";
import { PersonBalance } from "@/components/actions";
import { Section } from "@/components/ui";
import { formatMoney } from "@/lib/format";

function moneyInput(value) {
  const number = Math.round(Number(value) * 100) / 100;
  return Number.isFinite(number) ? String(number) : "";
}

function BalancePreview({ total, paid }) {
  const left = Math.round((Number(total || 0) - Number(paid || 0)) * 100) / 100;
  if (left < 0) {
    return <p className="bg-clay-soft px-3 py-3 font-semibold text-clay">المدفوع أكبر من الإجمالي. قلّل المدفوع أو زوّد الإجمالي.</p>;
  }
  return <p className="bg-soft px-3 py-3 text-base">الباقي علينا: <b className="num">{formatMoney(left)}</b></p>;
}

function EditButton({ label, onClick }) {
  return (
    <button type="button" className="h-11 shrink-0 border border-line bg-white px-3 text-sm font-semibold" onClick={onClick}>
      {label}
    </button>
  );
}

function MoneyRow({ label, value, hint, onEdit }) {
  return (
    <div className="flex min-h-12 items-center justify-between gap-3 border-b border-line px-3 py-2.5 last:border-b-0">
      <div className="min-w-0">
        <p className="text-base">{label}</p>
        {hint ? <p className="text-sm text-muted">{hint}</p> : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <p className="num text-lg font-bold">{value}</p>
        <EditButton label="تعديل" onClick={onEdit} />
      </div>
    </div>
  );
}

export function SupplierLedger({ supplierId, total, paid, remaining, renderedAt, expenses, payments, children }) {
  const [sheet, setSheet] = useState(null);
  const scope = `supplier:${supplierId}`;
  const close = useCallback(() => setSheet(null), []);

  useReopen(scope, useCallback((op) => {
    const kind = op.reopen?.kind;
    if (kind === "account") setSheet({ type: "account" });
    else if (kind === "expense" || kind === "payment") setSheet({ type: kind, id: op.reopen.rowId });
  }, []));

  const expense = sheet?.type === "expense" ? expenses.find((row) => row.id === sheet.id) : null;
  const payment = sheet?.type === "payment" ? payments.find((row) => row.id === sheet.id) : null;

  return (
    <>
      <Section
        title="الحساب"
        aside={<EditButton label="تعديل الحساب" onClick={() => setSheet({ type: "account" })} />}
      >
        <PersonBalance
          scope="suppliers"
          id={supplierId}
          total={total}
          paid={paid}
          remaining={remaining}
          renderedAt={renderedAt}
          totalLabel="إجمالي الشراء منه"
          paidLabel="اللي دفعناه"
          remainingLabel="الباقي علينا"
        />
      </Section>
      {children}
      <Section title="المشتريات">
        {expenses.length ? expenses.map((row) => {
          const left = Math.round((row.amount - row.paidAmount) * 100) / 100;
          const price = row.quantity > 0 && row.unitPrice !== null && row.unitPrice !== undefined
            ? `كمية ${row.quantity} · سعر الوحدة ${formatMoney(row.unitPrice)} · `
            : "";
          return (
            <MoneyRow
              key={row.id}
              label={row.categoryName}
              value={formatMoney(row.amount)}
              hint={`${row.dateLabel} · ${price}باقي ${formatMoney(left)} · مدفوع ${formatMoney(row.paidAmount)}`}
              onEdit={() => setSheet({ type: "expense", id: row.id })}
            />
          );
        }) : <p className="px-3 py-3 text-base text-muted">لسه ما فيش مشتريات منه. تقدر تسجّل الرصيد من «تعديل الحساب».</p>}
      </Section>
      <Section title="الفلوس اللي دفعناها">
        {payments.length ? payments.map((row) => (
          <MoneyRow
            key={row.id}
            label={row.dateLabel}
            value={formatMoney(row.amount)}
            hint={row.notes}
            onEdit={() => setSheet({ type: "payment", id: row.id })}
          />
        )) : <p className="px-3 py-3 text-base text-muted">لسه ما فيش سداد.</p>}
      </Section>

      {sheet?.type === "account" ? (
        <AccountSheet supplierId={supplierId} total={total} paid={paid} scope={scope} onClose={close} />
      ) : null}
      {expense ? (
        <ExpenseSheet expense={expense} scope={scope} onClose={close} />
      ) : null}
      {payment ? (
        <PaymentSheet payment={payment} scope={scope} onClose={close} />
      ) : null}
    </>
  );
}

function AccountSheet({ supplierId, total, paid, scope, onClose }) {
  const [nextTotal, setNextTotal] = useState(total);
  const [nextPaid, setNextPaid] = useState(paid);
  return (
    <Sheet title="تعديل حساب المورد" onClose={onClose}>
      <p className="mb-3 text-base">اكتب الرقم الجديد على نفس القيمة. رقم أصغر يخصم، ورقم أكبر يزوّد. الباقي بيتظبط لوحده. لو فيه أكتر من فاتورة، الإجمالي بيتعدل على آخر فاتورة، والمدفوع الزيادة بيتسجل على أقدم فاتورة لسه مفتوحة.</p>
      <div
        onInput={(event) => {
          if (event.target.name === "totalAmount") setNextTotal(event.target.value);
          if (event.target.name === "paidAmount") setNextPaid(event.target.value);
        }}
      >
        <Form
          endpoint={`/api/suppliers/${supplierId}/account`}
          method="PATCH"
          onDone={onClose}
          submitLabel="حفظ التعديل"
          successMessage="حساب المورد اتعدل."
          label="حساب المورد"
          reopen={{ scope, kind: "account" }}
        >
          <Field label="إجمالي الشراء منه" name="totalAmount" type="number" required step="0.01" min="0" defaultValue={moneyInput(total)} hint="اللي علينا له قبل ما نخصم المدفوع." />
          <Field label="اللي دفعناه" name="paidAmount" type="number" required step="0.01" min="0" defaultValue={moneyInput(paid)} />
          <BalancePreview total={nextTotal} paid={nextPaid} />
        </Form>
      </div>
    </Sheet>
  );
}

function ExpenseSheet({ expense, scope, onClose }) {
  const [amount, setAmount] = useState(expense.amount);
  const [paidAmount, setPaidAmount] = useState(expense.paidAmount);
  const priceHint = expense.quantity > 0
    ? `الكمية ${expense.quantity} هتفضل زي ما هي. سعر الوحدة يتظبط من المبلغ الجديد.`
    : "اكتب المبلغ الجديد للفاتورة دي.";
  return (
    <Sheet title={`تعديل ${expense.categoryName}`} onClose={onClose}>
      <p className="mb-3 text-base">{expense.dateLabel}. غيّر المبلغ اللي علينا أو المدفوع. رقم أصغر يخصم، ورقم أكبر يزوّد.</p>
      <div
        onInput={(event) => {
          if (event.target.name === "amount") setAmount(event.target.value);
          if (event.target.name === "paidAmount") setPaidAmount(event.target.value);
        }}
      >
        <Form
          endpoint={`/api/expenses/${expense.id}/money`}
          method="PATCH"
          onDone={onClose}
          submitLabel="حفظ التعديل"
          successMessage="الفاتورة اتعدلت."
          label="فاتورة المورد"
          reopen={{ scope, kind: "expense", rowId: expense.id }}
        >
          <Field label="المبلغ اللي علينا" name="amount" type="number" required step="0.01" min="0" defaultValue={moneyInput(expense.amount)} hint={priceHint} />
          <Field label="المدفوع في الفاتورة دي" name="paidAmount" type="number" required step="0.01" min="0" defaultValue={moneyInput(expense.paidAmount)} />
          <BalancePreview total={amount} paid={paidAmount} />
        </Form>
      </div>
    </Sheet>
  );
}

function PaymentSheet({ payment, scope, onClose }) {
  return (
    <Sheet title="تعديل الدفعة" onClose={onClose}>
      <p className="mb-3 text-base">{payment.dateLabel}. اكتب المبلغ الجديد. صفر يشيل الدفعة ويرجّع الفلوس على حساب المورد.</p>
      <Form
        endpoint={`/api/payments/${payment.id}`}
        method="PATCH"
        onDone={onClose}
        submitLabel="حفظ التعديل"
        successMessage="الدفعة اتعدلت."
        label="دفعة المورد"
        reopen={{ scope, kind: "payment", rowId: payment.id }}
      >
        <Field label="المبلغ" name="amount" type="number" required step="0.01" min="0" defaultValue={moneyInput(payment.amount)} />
        <Field label="ملاحظة" name="notes" defaultValue={payment.notes} />
      </Form>
    </Sheet>
  );
}
