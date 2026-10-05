"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Field, Form, Sheet } from "@/components/form";

export function CloseCycle({ id }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function closeCycle() {
    if (pending) return;
    setPending(true);
    setError("");
    const response = await fetch(`/api/cycles/${id}/close`, { method: "POST" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error || "ما قدرناش نقفل الدورة");
      setPending(false);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <div>
      <button type="button" className="h-12 border border-line px-4" onClick={() => setOpen(true)}>
        إغلاق الدورة
      </button>
      {open ? (
        <Sheet title="إغلاق الدورة" onClose={() => setOpen(false)}>
          <p>تقفل الدورة؟ التسجيل بعدها هيبقى على دورة جديدة.</p>
          {error ? <p className="mt-3 bg-clay-soft px-3 py-3 text-clay">{error}</p> : null}
          <button type="button" disabled={pending} className="mt-4 h-12 w-full bg-green font-semibold disabled:opacity-60" onClick={closeCycle}>
            {pending ? "بيتقفل..." : "إغلاق الدورة"}
          </button>
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

export function PaySheet({ title, submitLabel, direction, personId, redirectTo, defaultDate }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="h-12 w-full bg-green font-semibold" onClick={() => setOpen(true)}>
        {submitLabel}
      </button>
      {open ? (
        <Sheet title={title} onClose={() => setOpen(false)}>
          <Form endpoint="/api/payments" redirectTo={redirectTo} submitLabel={submitLabel}>
            <input type="hidden" name="direction" value={direction} />
            <input type="hidden" name={direction === "in" ? "customerId" : "supplierId"} value={personId} />
            <Field label="المبلغ" name="amount" type="number" required step="0.01" min="0" />
            <Field label="التاريخ" name="paymentDate" type="date" defaultValue={defaultDate} />
          </Form>
        </Sheet>
      ) : null}
    </>
  );
}

