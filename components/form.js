"use client";

import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { notify } from "@/components/toast";

export const NETWORK_ERROR = "النت فصل أو الإرسال ما وصلش. اللي كتبته لسه موجود، جرّب تاني.";

export function Sheet({ title, eyebrow, children, onClose }) {
  const router = useRouter();
  const panelRef = useRef(null);

  function close() {
    if (onClose) onClose();
    else router.back();
  }

  const closeRef = useRef(close);
  useLayoutEffect(() => {
    closeRef.current = close;
  });

  useEffect(() => {
    function onKey(event) {
      if (event.key === "Escape") closeRef.current();
    }
    const previousFocus = document.activeElement;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    panelRef.current?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);

  return (
    <div className="sheet-root" onClick={close}>
      <div
        ref={panelRef}
        tabIndex={-1}
        className="sheet-panel outline-none"
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
          <button type="button" className="flex h-12 shrink-0 items-center gap-1 border border-line px-3 text-sm font-semibold" onClick={close}>
            <X size={20} aria-hidden="true" />
            قفل
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Form({ endpoint, method = "POST", redirectTo, onDone, children, submitLabel, successMessage = "اتحفظ بنجاح." }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const errorRef = useRef(null);

  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [error]);

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
    let response;
    try {
      response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch {
      setError(NETWORK_ERROR);
      setPending(false);
      return;
    }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(payload.error || "ما اتحفظش. راجع البيانات وجرّب تاني.");
      setPending(false);
      return;
    }
    if (payload.vetNotice) notify("اتحفظ. لو الأعراض شديدة كلم الطبيب البيطري.", "warn");
    else notify(successMessage);
    form.reset();
    setPending(false);
    if (onDone) {
      onDone();
      router.refresh();
      return;
    }
    if (redirectTo && form.closest(".sheet-panel")) {
      if (window.history.length > 1) router.back();
      else router.push(redirectTo);
      router.refresh();
    } else if (redirectTo) {
      router.push(redirectTo);
      router.refresh();
    } else {
      router.refresh();
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {children}
      {error ? <p ref={errorRef} className="bg-clay-soft px-3 py-3 font-semibold text-clay" role="alert">{error}</p> : null}
      <button type="submit" disabled={pending} aria-busy={pending} className="h-13 w-full bg-green text-base font-semibold disabled:opacity-60">
        {pending ? "بيتحفظ..." : submitLabel}
      </button>
    </form>
  );
}

const INPUT_MODES = { number: "decimal", tel: "tel" };

export function Field({ label, name, type = "text", required = false, defaultValue, step, min, max, hint }) {
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
        max={max}
        placeholder=" "
        dir={type === "tel" ? "ltr" : undefined}
        inputMode={INPUT_MODES[type]}
        enterKeyHint="next"
        aria-describedby={hint ? `${name}-hint` : undefined}
        onChange={(event) => setFilled(event.target.value !== "")}
        onFocus={(event) => {
          const input = event.currentTarget;
          setTimeout(() => input.scrollIntoView({ block: "center", behavior: "smooth" }), 300);
        }}
      />
      <span>{label}{required ? <b className="text-clay" aria-hidden="true"> *</b> : null}</span>
      {hint ? <p id={`${name}-hint`} className="mt-1 text-sm text-muted">{hint}</p> : null}
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
      <span>{label}{required ? <b className="text-clay" aria-hidden="true"> *</b> : null}</span>
    </label>
  );
}
