"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { Field, Form, Sheet } from "@/components/form";
import { currentPath, registerOwner, submit, useOperations, useOptimisticRows, useReopen } from "@/components/mutations";
import { Line } from "@/components/ui";
import { formatMoney } from "@/lib/format";

export function CloseCycle({ id }) {
  const owner = useId();
  const key = `POST /api/cycles/${id}/close`;
  const scope = `close:${id}`;
  const [open, setOpen] = useState(false);
  const op = useOperations().find((item) => item.key === key) || null;
  const pending = op?.status === "pending";
  const error = op?.status === "error" ? op.error : "";

  useEffect(() => (open ? registerOwner(owner) : undefined), [open, owner]);
  useReopen(scope, useCallback(() => setOpen(true), []));

  function closeCycle() {
    if (pending) return;
    submit({
      key,
      formKey: key,
      owner,
      url: `/api/cycles/${id}/close`,
      method: "POST",
      page: currentPath(),
      successMessage: "الدورة اتقفلت.",
      label: "إغلاق الدورة",
      reopen: { scope },
    });
    setOpen(false);
  }

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        aria-busy={pending}
        className="h-12 w-full border border-line bg-paper px-4 text-base font-semibold disabled:opacity-60"
        onClick={() => setOpen(true)}
      >
        {pending ? "الدورة بتتقفل..." : "إغلاق الدورة"}
      </button>
      {open ? (
        <Sheet title="إغلاق الدورة" onClose={() => setOpen(false)}>
          <p className="text-base">تقفل الدورة؟ بعد الإغلاق، المتابعة والبيع الجديد هيتسجلوا على دورة جديدة.</p>
          {error ? <p className="mt-3 bg-clay-soft px-3 py-3 font-semibold text-clay" role="alert">{error}</p> : null}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button type="button" className="h-12 border border-line bg-white font-semibold" onClick={() => setOpen(false)}>لا، رجوع</button>
            <button type="button" disabled={pending} aria-busy={pending} className="h-12 bg-green font-semibold disabled:opacity-60" onClick={closeCycle}>
              {pending ? "بيتقفل..." : error && op?.retryable ? "حاول تاني" : "أيوه، اقفلها"}
            </button>
          </div>
        </Sheet>
      ) : null}
    </div>
  );
}

export function EditCycle({ cycle }) {
  const [open, setOpen] = useState(false);
  const scope = `cycle:${cycle.id}`;
  useReopen(scope, useCallback(() => setOpen(true), []));
  return (
    <div>
      <button type="button" className="h-12 w-full border border-line bg-paper px-4 text-base font-semibold" onClick={() => setOpen(true)}>
        تعديل بيانات الدورة
      </button>
      {open ? (
        <Sheet title="تعديل بيانات الدورة" onClose={() => setOpen(false)}>
          <p className="mb-3 text-sm text-muted">عدد الكتاكيت وتاريخ البداية ما بيتعدلوش هنا عشان الحسابات ما تتلخبطش.</p>
          <Form
            endpoint={`/api/cycles/${cycle.id}`}
            method="PATCH"
            onDone={() => setOpen(false)}
            submitLabel="حفظ التعديل"
            successMessage="بيانات الدورة اتحفظت."
            label="بيانات الدورة"
            reopen={{ scope }}
          >
            <Field label="اسم الدورة" name="name" required defaultValue={cycle.name} />
            <Field label="النوع" name="poultryType" defaultValue={cycle.poultry_type || ""} />
            <Field label="السلالة" name="breed" defaultValue={cycle.breed || ""} />
            <Field label="ميعاد البيع المتوقع" name="expectedSellDate" type="date" defaultValue={cycle.expected_sell_date ? String(cycle.expected_sell_date).slice(0, 10) : ""} />
            <Field label="الوزن المستهدف كجم" name="targetWeightKg" type="number" step="0.001" min="0" defaultValue={cycle.target_weight_kg ?? ""} />
            <Field label="المكان" name="location" defaultValue={cycle.location || ""} />
            <Field label="ملاحظات" name="notes" defaultValue={cycle.notes || ""} />
          </Form>
        </Sheet>
      ) : null}
    </div>
  );
}

export function BookmarkButton({ slug, initial }) {
  const url = `/api/articles/${slug}/bookmark`;
  const operations = useOperations();
  const latest = operations.findLast?.((op) => op.url === url && op.status !== "error")
    ?? [...operations].reverse().find((op) => op.url === url && op.status !== "error");
  const bookmarked = latest ? latest.body.bookmarked : initial;

  function toggle() {
    const next = !bookmarked;
    submit({
      key: `${url} ${next}`,
      formKey: url,
      url,
      method: "POST",
      body: { bookmarked: next },
      page: currentPath(),
      successMessage: next ? "المقال اتحفظ." : "المقال اتشال من المحفوظ.",
      label: next ? "حفظ المقال" : "شيل المقال من المحفوظ",
    });
  }

  return (
    <button type="button" className="h-12 border border-line px-4" aria-pressed={bookmarked} onClick={toggle}>
      {bookmarked ? "محفوظ" : "حفظ المقال"}
    </button>
  );
}

export function PersonBalance({ scope, id, total, paid, remaining, renderedAt, paidLabel, remainingLabel, totalLabel }) {
  const rows = useMemo(() => [{ id, remaining: Number(remaining) }], [id, remaining]);
  const { rows: live } = useOptimisticRows(scope, rows, renderedAt);
  const left = Number(live[0]?.remaining ?? remaining);
  return (
    <>
      <Line label={totalLabel} value={formatMoney(total)} />
      <Line label={paidLabel} value={formatMoney(Number(paid) + Number(remaining) - left)} />
      <Line label={remainingLabel} value={formatMoney(left)} />
    </>
  );
}

export function PaySheet({ title, submitLabel, direction, personId, defaultDate, max }) {
  const [open, setOpen] = useState(false);
  const scope = `pay:${personId}`;
  useReopen(scope, useCallback(() => setOpen(true), []));
  return (
    <>
      <button type="button" className="h-12 w-full bg-green text-base font-semibold" onClick={() => setOpen(true)}>
        {submitLabel}
      </button>
      {open ? (
        <Sheet title={title} onClose={() => setOpen(false)}>
          {max ? <p className="mb-3 text-base">الباقي: <b className="num">{formatMoney(max)}</b></p> : null}
          <Form
            endpoint="/api/payments"
            onDone={() => setOpen(false)}
            submitLabel="حفظ الدفعة"
            successMessage="الدفعة اتسجلت."
            label="الدفعة"
            optimistic="payment"
            reopen={{ scope }}
          >
            <input type="hidden" name="direction" value={direction} />
            <input type="hidden" name={direction === "in" ? "customerId" : "supplierId"} value={personId} />
            <Field label="المبلغ" name="amount" type="number" required step="0.01" min="0" />
            <Field label="التاريخ" name="paymentDate" type="date" defaultValue={defaultDate} />
            <Field label="ملاحظة" name="notes" />
          </Form>
        </Sheet>
      ) : null}
    </>
  );
}
