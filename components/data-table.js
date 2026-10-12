"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { NETWORK_ERROR, Sheet } from "@/components/form";
import { notify } from "@/components/toast";

export function DataTable({ columns, rows, empty, addLabel, onAdd, note }) {
  return (
    <div className="border-y border-line bg-paper">
      <div className="table-scroll overflow-x-auto">
        <table className="w-full border-collapse text-[15px]">
          <thead>
            <tr className="border-b border-line text-muted">
              {columns.map((column, index) => (
                <th key={column} scope="col" className={`whitespace-nowrap px-3 py-2 text-start font-semibold ${index === 0 ? "" : "w-0"}`}>{column}</th>
              ))}
              <th scope="col" className="w-0 whitespace-nowrap px-2 py-2 text-start font-semibold">تعديل / حذف</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? rows.map((row) => (
              <tr key={row.id} className="border-b border-line last:border-b-0">
                {row.cells.map((cell, index) => (
                  <td key={`${row.id}-${index}`} className={`px-3 py-2 align-middle ${index === 0 ? "min-w-28 font-semibold" : "w-0 whitespace-nowrap"}`}>{cell}</td>
                ))}
                <td className="w-0 whitespace-nowrap px-2 py-1.5 align-middle">
                  <div className="flex w-max gap-1.5">
                    <button type="button" aria-label={`تعديل ${row.name || ""}`.trim()} title="تعديل" className="flex h-11 w-11 items-center justify-center border border-line bg-white" onClick={() => row.onEdit()}>
                      <Pencil size={18} aria-hidden="true" />
                    </button>
                    <button type="button" aria-label={`حذف ${row.name || ""}`.trim()} title="حذف" className="flex h-11 w-11 items-center justify-center border border-line bg-white text-clay" onClick={() => row.onDelete()}>
                      <Trash2 size={18} aria-hidden="true" />
                    </button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={columns.length + 1} className="px-3 py-5 text-muted">{empty}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {note ? <p className="border-t border-line px-3 py-2 text-sm text-muted">{note}</p> : null}
      {onAdd ? (
        <button type="button" className="flex h-12 w-full items-center justify-center gap-2 border-t border-line bg-green text-base font-semibold" onClick={onAdd}>
          <Plus size={20} aria-hidden="true" />
          {addLabel}
        </button>
      ) : null}
    </div>
  );
}

export function DeleteSheet({ title, body, error, pending, onClose, onConfirm }) {
  return (
    <Sheet title={title} onClose={onClose}>
      <p className="text-base">{body}</p>
      <p className="mt-2 text-sm text-muted">الحذف ما ينفعش يترجع.</p>
      {error ? <p className="mt-3 bg-clay-soft px-3 py-3 font-semibold text-clay" role="alert">{error}</p> : null}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button type="button" className="h-12 border border-line bg-white font-semibold" onClick={onClose}>
          لا، رجوع
        </button>
        <button type="button" disabled={pending} aria-busy={pending} className="h-12 bg-clay font-semibold text-white disabled:opacity-60" onClick={onConfirm}>
          {pending ? "بيتحذف..." : "أيوه، احذف"}
        </button>
      </div>
    </Sheet>
  );
}

export function useRecordActions() {
  const router = useRouter();
  const [sheet, setSheet] = useState(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  function open(next) {
    setError("");
    setSheet(next);
  }

  function close() {
    setError("");
    setPending(false);
    setSheet(null);
  }

  async function remove(url, message = "اتحذف.") {
    if (pending) return;
    setPending(true);
    setError("");
    let response;
    try {
      response = await fetch(url, { method: "DELETE" });
    } catch {
      setPending(false);
      setError(NETWORK_ERROR);
      return;
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setPending(false);
      setError(data.error || "ما قدرناش نحذف. جرّب تاني.");
      return;
    }
    close();
    notify(message);
    router.refresh();
  }

  return { sheet, error, pending, open, close, remove };
}
