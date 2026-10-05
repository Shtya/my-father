"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

export function Sheet({ title, eyebrow, children, onClose }) {
  const router = useRouter();

  function close() {
    if (onClose) onClose();
    else router.back();
  }

  const closeRef = useRef(close);
  closeRef.current = close;

  useEffect(() => {
    function onKey(event) {
      if (event.key === "Escape") closeRef.current();
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div className="sheet-root" onClick={close}>
      <div
        className="sheet-panel"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sheet-handle" />
        <div className="sheet-head">
          <div>
            {eyebrow ? <p className="text-sm text-muted">{eyebrow}</p> : null}
            <h2>{title}</h2>
          </div>
          <button type="button" aria-label="إغلاق" className="flex h-11 w-11 items-center justify-center" onClick={close}>
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Form({ endpoint, method = "POST", redirectTo, children, submitLabel }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError("");
    const form = event.currentTarget;
    const data = new FormData(form);
    const body = Object.fromEntries(data.entries());
    for (const element of form.querySelectorAll('input[type="checkbox"]')) {
      body[element.name] = element.checked;
    }
    try {
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "حصل خطأ");
      if (payload.vetNotice) setNotice("لو الأعراض شديدة، كلم الطبيب البيطري. التسجيل هنا للمتابعة فقط.");
      form.reset();
      if (redirectTo) {
        router.push(redirectTo);
        router.refresh();
      } else {
        router.refresh();
        if (!payload.vetNotice) setNotice("اتسجل.");
      }
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {children}
      {error ? <p className="bg-clay-soft px-3 py-3 text-clay" role="alert">{error}</p> : null}
      {notice ? <p className="bg-amber-soft px-3 py-3 text-amber">{notice}</p> : null}
      <button type="submit" disabled={pending} className="h-12 w-full bg-green font-semibold disabled:opacity-60">
        {pending ? "بيتسجل..." : submitLabel}
      </button>
    </form>
  );
}

export function Field({ label, name, type = "text", required = false, defaultValue, step, min, hint }) {
  const initial = defaultValue === undefined || defaultValue === null ? "" : String(defaultValue);
  const [filled, setFilled] = useState(initial !== "");
  return (
    <label className={`field${filled ? " is-filled" : ""}`}>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        step={step}
        min={min}
        placeholder=" "
        inputMode={type === "number" ? "decimal" : undefined}
        aria-describedby={hint ? `${name}-hint` : undefined}
        onChange={(event) => setFilled(event.target.value !== "")}
      />
      <span>{label}</span>
      {hint ? <p id={`${name}-hint`} className="mt-1 text-xs text-muted">{hint}</p> : null}
    </label>
  );
}

export function Select({ label, name, defaultValue = "", children, required = false }) {
  const initial = defaultValue === undefined || defaultValue === null ? "" : String(defaultValue);
  const [filled, setFilled] = useState(initial !== "");
  return (
    <label className={`field${filled ? " is-filled" : ""}`}>
      <select
        name={name}
        defaultValue={defaultValue}
        required={required}
        onChange={(event) => setFilled(event.target.value !== "")}
      >
        {children}
      </select>
      <span>{label}</span>
    </label>
  );
}
