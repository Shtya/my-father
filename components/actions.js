"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Field, Form, NETWORK_ERROR, Sheet } from "@/components/form";
import { notify } from "@/components/toast";
import { formatMoney } from "@/lib/format";

export function CloseCycle({ id }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function closeCycle() {
    if (pending) return;
    setPending(true);
    setError("");
    let response;
    try {
      response = await fetch(`/api/cycles/${id}/close`, { method: "POST" });
    } catch {
      setError(NETWORK_ERROR);
      setPending(false);
      return;
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error || "ما قدرناش نقفل الدورة");
      setPending(false);
      return;
    }
    setPending(false);
    setOpen(false);
    notify("الدورة اتقفلت.");
    router.refresh();
  }

  return (
    <div>
      <button type="button" className="h-12 w-full border border-line bg-paper px-4 text-base font-semibold" onClick={() => setOpen(true)}>
        إغلاق الدورة
      </button>
      {open ? (
        <Sheet title="إغلاق الدورة" onClose={() => setOpen(false)}>
          <p className="text-base">تقفل الدورة؟ بعد الإغلاق، المتابعة والبيع الجديد هيتسجلوا على دورة جديدة.</p>
          {error ? <p className="mt-3 bg-clay-soft px-3 py-3 font-semibold text-clay" role="alert">{error}</p> : null}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button type="button" className="h-12 border border-line bg-white font-semibold" onClick={() => setOpen(false)}>لا، رجوع</button>
            <button type="button" disabled={pending} aria-busy={pending} className="h-12 bg-green font-semibold disabled:opacity-60" onClick={closeCycle}>
              {pending ? "بيتقفل..." : "أيوه، اقفلها"}
            </button>
          </div>
        </Sheet>
      ) : null}
    </div>
  );
}

export function EditCycle({ cycle }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type="button" className="h-12 w-full border border-line bg-paper px-4 text-base font-semibold" onClick={() => setOpen(true)}>
        تعديل بيانات الدورة
      </button>
      {open ? (
        <Sheet title="تعديل بيانات الدورة" onClose={() => setOpen(false)}>
          <p className="mb-3 text-sm text-muted">عدد الكتاكيت وتاريخ البداية ما بيتعدلوش هنا عشان الحسابات ما تتلخبطش.</p>
          <Form endpoint={`/api/cycles/${cycle.id}`} method="PATCH" onDone={() => setOpen(false)} submitLabel="حفظ التعديل" successMessage="بيانات الدورة اتحفظت.">
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
  const router = useRouter();
  return (
    <button
      type="button"
      className="h-12 border border-line px-4"
      onClick={async () => {
        await fetch(`/api/articles/${slug}/bookmark`, { method: "POST" });
        router.refresh();
      }}
    >
      {initial ? "محفوظ" : "حفظ المقال"}
    </button>
  );
}

export function PaySheet({ title, submitLabel, direction, personId, defaultDate, max }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="h-12 w-full bg-green text-base font-semibold" onClick={() => setOpen(true)}>
        {submitLabel}
      </button>
      {open ? (
        <Sheet title={title} onClose={() => setOpen(false)}>
          {max ? <p className="mb-3 text-base">الباقي: <b className="num">{formatMoney(max)}</b></p> : null}
          <Form endpoint="/api/payments" onDone={() => setOpen(false)} submitLabel="حفظ الدفعة" successMessage="الدفعة اتسجلت.">
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

