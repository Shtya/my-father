"use client";

import { CheckCircle2, CircleAlert, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { dismiss, isOwnerMounted, reopen, retry, useOperations } from "@/components/mutations";

const EVENT = "farm:toast";

export function notify(message, tone = "ok") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { message, tone } }));
}

function FailedCard({ op }) {
  const editable = op.method !== "DELETE" && op.page && (op.reopen || op.values);
  return (
    <div className="toast pointer-events-auto w-full bg-white px-4 py-3 text-ink ring-1 ring-clay" role="alert">
      <p className="flex items-start gap-2 font-semibold text-clay">
        <CircleAlert size={22} className="mt-0.5 shrink-0" aria-hidden="true" />
        <span>{op.label ? `${op.label}: ` : ""}{op.error}</span>
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {op.retryable ? (
          <button type="button" className="h-11 bg-green px-4 font-semibold" onClick={() => retry(op.key)}>حاول تاني</button>
        ) : null}
        {editable ? (
          <button type="button" className="h-11 border border-line bg-paper px-4 font-semibold" onClick={() => reopen(op.key)}>افتح البيانات وعدّل</button>
        ) : null}
        <button type="button" className="h-11 border border-line bg-white px-4 font-semibold" onClick={() => dismiss(op.key)}>
          {op.retryable ? "إلغاء" : "تمام"}
        </button>
      </div>
    </div>
  );
}

export function Toaster() {
  const [toast, setToast] = useState(null);
  const operations = useOperations();
  const failed = operations.filter((op) => op.status === "error" && !isOwnerMounted(op.owner)).slice(-3);
  const pending = operations.filter((op) => op.status === "pending").length;

  useEffect(() => {
    let timer;
    function onToast(event) {
      clearTimeout(timer);
      setToast({ ...event.detail, key: Date.now() });
      timer = setTimeout(() => setToast(null), event.detail.tone === "ok" ? 3500 : 7000);
    }
    window.addEventListener(EVENT, onToast);
    return () => {
      clearTimeout(timer);
      window.removeEventListener(EVENT, onToast);
    };
  }, []);

  const ok = toast?.tone === "ok";
  const tone = { ok: "bg-green", warn: "bg-amber text-white", error: "bg-clay text-white" }[toast?.tone] || "bg-green";
  return (
    <div className="toast-dock">
      {failed.map((op) => <FailedCard key={op.key} op={op} />)}
      <div role="status" aria-live="polite" className="flex flex-col items-center gap-2">
        {pending ? (
          <p className="toast flex items-center gap-2 bg-white px-4 py-2 text-sm font-semibold text-ink ring-1 ring-line">
            <LoaderCircle size={18} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
            {pending > 1 ? `بيتحفظ... (${pending})` : "بيتحفظ..."}
          </p>
        ) : null}
        {toast ? (
          <p key={toast.key} className={`toast flex items-center gap-2 px-4 py-3 font-semibold ${tone}`}>
            {ok ? <CheckCircle2 size={22} aria-hidden="true" /> : <CircleAlert size={22} aria-hidden="true" />}
            {toast.message}
          </p>
        ) : null}
      </div>
    </div>
  );
}
