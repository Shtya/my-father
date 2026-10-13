"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useSyncExternalStore } from "react";
import { mergeRows } from "@/lib/optimistic-merge";

export const NETWORK_ERROR = "النت فصل أو الإرسال ما وصلش. اللي كتبته محفوظ، دوس «حاول تاني».";
const SERVER_ERROR = "حصل خطأ في السيرفر. اللي كتبته محفوظ، دوس «حاول تاني».";
const INVALID_ERROR = "ما اتحفظش. راجع البيانات وجرّب تاني.";
const RELOAD_ERROR = "الصفحة اتقفلت قبل ما نتأكد إن الحفظ تم. دوس «حاول تاني»، ومش هيتسجل مرتين.";
const STORAGE = "farm:operations:v1";
const DONE_TTL = 120000;
const REQUEST_TIMEOUT = 25000;
const EMPTY = [];

const operations = new Map();
const listeners = new Set();
const queues = new Map();
const mounted = new Map();
const bridge = {
  refresh() {},
  navigate(href) {
    window.location.assign(href);
  },
};
let snapshot = EMPTY;
let loaded = false;

function toast(message, tone = "ok") {
  window.dispatchEvent(new CustomEvent("farm:toast", { detail: { message, tone } }));
}

function persist() {
  try {
    const keep = snapshot
      .filter((op) => op.status === "pending" || op.status === "error")
      .map(({ owner, reopenRequested, ...op }) => op);
    if (keep.length) window.localStorage.setItem(STORAGE, JSON.stringify(keep));
    else window.localStorage.removeItem(STORAGE);
  } catch {}
}

function emit() {
  snapshot = [...operations.values()];
  persist();
  for (const listener of listeners) listener();
}

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE) || "[]");
    for (const op of saved) {
      if (!op?.key || operations.has(op.key)) continue;
      const interrupted = op.status === "pending";
      operations.set(op.key, {
        ...op,
        status: "error",
        error: interrupted ? RELOAD_ERROR : op.error,
        retryable: interrupted ? true : op.retryable,
        network: interrupted ? true : op.network,
      });
    }
    if (operations.size) emit();
  } catch {}
}

function subscribe(listener) {
  load();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useOperations() {
  return useSyncExternalStore(subscribe, () => snapshot, () => EMPTY);
}

export function uuid() {
  if (typeof globalThis.crypto?.randomUUID === "function") return globalThis.crypto.randomUUID();
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function currentPath() {
  return `${window.location.pathname}${window.location.search}`;
}

export function getOperation(key) {
  return operations.get(key) || null;
}

export function ownedOperation(owner) {
  return snapshot.find((op) => op.owner === owner) || null;
}

export function isOwnerMounted(owner) {
  return Boolean(owner && mounted.get(owner));
}

export function registerOwner(owner) {
  mounted.set(owner, (mounted.get(owner) || 0) + 1);
  emit();
  return () => {
    const count = (mounted.get(owner) || 1) - 1;
    if (count > 0) mounted.set(owner, count);
    else mounted.delete(owner);
    emit();
  };
}

/**
 * Runs one Create/Update/Delete in the background.
 * The same key means the same operation: a second submit while pending is ignored,
 * and a retry re-sends the exact same request (POST bodies carry the key as requestId).
 */
export function submit(input) {
  load();
  const previous = operations.get(input.key);
  if (previous?.status === "pending") return false;
  const op = {
    patches: [],
    reopen: null,
    ...input,
    status: "pending",
    error: "",
    retryable: false,
    network: false,
    serverAt: 0,
    reopenRequested: false,
    attempts: (previous?.attempts || 0) + 1,
    createdAt: previous?.createdAt || Date.now(),
  };
  if (op.owner) {
    for (const [key, other] of operations) {
      if (key !== op.key && other.owner === op.owner) operations.set(key, { ...other, owner: null });
    }
  }
  operations.set(op.key, op);
  emit();
  const resource = op.method === "POST" ? op.key : op.url;
  const before = queues.get(resource) || Promise.resolve();
  const run = before.then(() => send(op.key));
  queues.set(resource, run);
  run.finally(() => {
    if (queues.get(resource) === run) queues.delete(resource);
  });
  return true;
}

async function send(key) {
  const op = operations.get(key);
  if (!op || op.status !== "pending") return;
  let response;
  try {
    response = await fetch(op.url, {
      method: op.method,
      headers: op.body ? { "Content-Type": "application/json" } : undefined,
      body: op.body ? JSON.stringify(op.body) : undefined,
      signal: typeof AbortSignal.timeout === "function" ? AbortSignal.timeout(REQUEST_TIMEOUT) : undefined,
    });
  } catch {
    finish(key, { ok: false, retryable: true, network: true, error: NETWORK_ERROR });
    return;
  }
  const payload = await response.json().catch(() => ({}));
  if (response.ok || (op.method === "DELETE" && response.status === 404)) {
    finish(key, { ok: true, payload, serverAt: Number(response.headers.get("x-server-time")) || Date.now() });
    return;
  }
  const retryable = response.status >= 500 || response.status === 408 || response.status === 429;
  finish(key, { ok: false, retryable, error: payload.error && response.status < 500 ? payload.error : retryable ? SERVER_ERROR : INVALID_ERROR });
}

let refreshTimer = null;
function scheduleRefresh() {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => bridge.refresh(), 120);
}

function finish(key, result) {
  const op = operations.get(key);
  if (!op || op.status !== "pending") return;
  if (result.ok) {
    operations.set(key, { ...op, status: "done", serverAt: result.serverAt });
    emit();
    const payload = result.payload || {};
    if (payload.duplicate) toast("ده كان اتسجل قبل كده، ومش هيتكرر.");
    else if (payload.vetNotice) toast("اتحفظ. لو الأعراض شديدة كلم الطبيب البيطري.", "warn");
    else if (op.successMessage) toast(op.successMessage);
    scheduleRefresh();
    setTimeout(() => {
      if (operations.get(key)?.status === "done") {
        operations.delete(key);
        emit();
      }
    }, DONE_TTL);
    return;
  }
  const failed = { ...op, status: "error", error: result.error, retryable: result.retryable, network: Boolean(result.network) };
  operations.set(key, failed);
  emit();
  if (!failed.retryable && failed.method !== "DELETE" && shouldReopen(failed)) reopen(key);
}

function shouldReopen(op) {
  if (isOwnerMounted(op.owner) || document.querySelector(".sheet-panel")) return false;
  if (op.reopen) return currentPath() === op.page;
  if (op.landing) return window.location.pathname === op.landing;
  return false;
}

export function retry(key) {
  const op = operations.get(key);
  if (!op || op.status !== "error") return;
  submit(op);
}

export function dismiss(key) {
  if (operations.delete(key)) emit();
}

export function reopen(key) {
  const op = operations.get(key);
  if (!op) return;
  operations.set(key, { ...op, reopenRequested: true });
  emit();
  if (op.page && currentPath() !== op.page) bridge.navigate(op.page);
}

/** A form that just mounted takes over the failed operation it belongs to, so it can restore the typed values. */
export function adoptDraft(formKey, owner) {
  load();
  const mine = snapshot.find((op) => op.owner === owner && op.formKey === formKey);
  if (mine) return mine;
  const failed = snapshot.filter((op) => op.formKey === formKey && op.status === "error" && !isOwnerMounted(op.owner));
  if (!failed.length) return null;
  const op = failed.find((item) => item.reopenRequested) || failed[failed.length - 1];
  operations.set(op.key, { ...op, owner, reopenRequested: false });
  emit();
  return op;
}

export function useReopen(scope, handler) {
  const all = useOperations();
  useEffect(() => {
    if (!scope) return;
    const op = all.find((item) => item.reopenRequested && item.reopen?.scope === scope);
    if (!op) return;
    if (handler(op) === false) return;
    const current = operations.get(op.key);
    if (current?.reopenRequested) {
      operations.set(op.key, { ...current, reopenRequested: false });
      emit();
    }
  }, [all, scope, handler]);
}

export function useOptimisticRows(scope, rows, renderedAt) {
  const all = useOperations();
  return useMemo(() => mergeRows(scope, rows, all, renderedAt), [all, rows, renderedAt, scope]);
}

export function MutationBridge() {
  const router = useRouter();
  useEffect(() => {
    bridge.refresh = () => router.refresh();
    bridge.navigate = (href) => router.push(href);
    load();
    function online() {
      for (const op of snapshot) {
        if (op.status === "error" && op.network) retry(op.key);
      }
    }
    function leave(event) {
      if (!snapshot.some((op) => op.status === "pending")) return;
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("online", online);
    window.addEventListener("beforeunload", leave);
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("beforeunload", leave);
    };
  }, [router]);
  return null;
}
