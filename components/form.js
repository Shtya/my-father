"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { adoptDraft, currentPath, ownedOperation, registerOwner, submit, useOperations, uuid } from "@/components/mutations";
import { buildPatches } from "@/components/optimistic";

export { NETWORK_ERROR } from "@/components/mutations";

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

function readValues(form) {
  const values = Object.fromEntries(new FormData(form).entries());
  for (const element of form.querySelectorAll('input[type="checkbox"]')) {
    values[element.name] = element.checked;
  }
  return values;
}

const VALUE_SETTERS = {
  INPUT: Object.getOwnPropertyDescriptor(globalThis.HTMLInputElement?.prototype || {}, "value")?.set,
  SELECT: Object.getOwnPropertyDescriptor(globalThis.HTMLSelectElement?.prototype || {}, "value")?.set,
  TEXTAREA: Object.getOwnPropertyDescriptor(globalThis.HTMLTextAreaElement?.prototype || {}, "value")?.set,
};

function restoreValues(form, values) {
  if (!form || !values) return;
  for (const [name, value] of Object.entries(values)) {
    const element = form.elements.namedItem(name);
    if (!element || element instanceof RadioNodeList || element.type === "hidden") continue;
    if (element.type === "checkbox") {
      if (element.checked !== Boolean(value)) element.click();
      continue;
    }
    const text = value === null || value === undefined ? "" : String(value);
    VALUE_SETTERS[element.tagName]?.call(element, text);
    element.dispatchEvent(new Event(element.tagName === "SELECT" ? "change" : "input", { bubbles: true }));
    if (text) element.closest("details")?.setAttribute("open", "");
  }
}

/**
 * Optimistic form: the sheet closes and the list updates right away, the request runs in the
 * background (components/mutations.js), and a failure rolls the list back and keeps the typed values
 * so the same form can reopen with them.
 */
export function Form({
  endpoint,
  method = "POST",
  redirectTo,
  onDone,
  children,
  submitLabel,
  successMessage = "اتحفظ بنجاح.",
  optimistic,
  record,
  reopen,
  label = "البيانات",
}) {
  const router = useRouter();
  const owner = useId();
  const formRef = useRef(null);
  const errorRef = useRef(null);
  const formKey = `${method} ${endpoint}`;
  const op = useOperations().find((item) => item.owner === owner) || null;
  const pending = op?.status === "pending";
  const error = op?.status === "error" ? op.error : "";

  useEffect(() => registerOwner(owner), [owner]);

  useEffect(() => {
    const draft = adoptDraft(formKey, owner);
    if (draft) restoreValues(formRef.current, draft.values);
  }, [formKey, owner]);

  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [error]);

  function onSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const current = ownedOperation(owner);
    if (current?.status === "pending") return;
    const values = readValues(form);
    const key = current?.status === "error" ? current.key : uuid();
    submit({
      key,
      formKey,
      owner,
      url: endpoint,
      method,
      body: method === "POST" ? { ...values, requestId: key } : values,
      values,
      page: currentPath(),
      landing: redirectTo || null,
      successMessage,
      label,
      patches: buildPatches(optimistic, values, form, key, record),
      reopen: reopen || null,
    });
    if (onDone) {
      onDone();
      return;
    }
    if (redirectTo) {
      if (form.closest(".sheet-panel") && window.history.length > 1) router.back();
      else router.push(redirectTo);
    }
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-4">
      {children}
      {error ? (
        <p ref={errorRef} className="bg-clay-soft px-3 py-3 font-semibold text-clay" role="alert">
          {error}
          {op?.retryable ? <span className="mt-1 block text-sm font-normal">البيانات زي ما كتبتها. دوس الزرار تحت تاني.</span> : null}
        </p>
      ) : null}
      <button type="submit" disabled={pending} aria-busy={pending} className="h-13 w-full bg-green text-base font-semibold disabled:opacity-60">
        {pending ? "بيتحفظ..." : error && op?.retryable ? "حاول تاني" : submitLabel}
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

export function Select({ label, name, defaultValue = "", children, required = false, hint, onChange }) {
  const initial = defaultValue === undefined || defaultValue === null ? "" : String(defaultValue);
  const [filled, setFilled] = useState(initial !== "");
  return (
    <label className={`field${filled ? " is-filled" : ""}`}>
      <select
        name={name}
        defaultValue={defaultValue}
        required={required}
        aria-describedby={hint ? `${name}-hint` : undefined}
        onChange={(event) => {
          setFilled(event.target.value !== "");
          onChange?.(event);
        }}
      >
        {children}
      </select>
      <span>{label}{required ? <b className="text-clay" aria-hidden="true"> *</b> : null}</span>
      {hint ? <p id={`${name}-hint`} className="mt-1 text-sm text-muted">{hint}</p> : null}
    </label>
  );
}
