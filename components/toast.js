"use client";

import { CheckCircle2, CircleAlert } from "lucide-react";
import { useEffect, useState } from "react";

const EVENT = "farm:toast";

export function notify(message, tone = "ok") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { message, tone } }));
}

export function Toaster() {
  const [toast, setToast] = useState(null);

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
    <div className="toast-dock" role="status" aria-live="polite">
      {toast ? (
        <p key={toast.key} className={`toast flex items-center gap-2 px-4 py-3 font-semibold ${tone}`}>
          {ok ? <CheckCircle2 size={22} aria-hidden="true" /> : <CircleAlert size={22} aria-hidden="true" />}
          {toast.message}
        </p>
      ) : null}
    </div>
  );
}
