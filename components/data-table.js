"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Sheet } from "@/components/form";

export function DataTable({ columns, rows, empty, addLabel, onAdd }) {
  return (
    <div className="overflow-x-auto border-y border-line bg-paper">
      <table className="w-max border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-muted">
            {columns.map((column) => (
              <th key={column} className="w-0 whitespace-nowrap px-3 py-2 text-start font-semibold">{column}</th>
            ))}
            <th className="w-0 whitespace-nowrap px-2 py-2 text-start font-semibold">إجراء</th>
          </tr>
        </thead>
        <tbody>
          {rows.length ? rows.map((row) => (
            <tr key={row.id} className="border-b border-line last:border-b-0">
              {row.cells.map((cell, index) => (
                <td key={`${row.id}-${index}`} className="w-0 whitespace-nowrap px-3 py-2 align-middle">{cell}</td>
              ))}
              <td className="w-0 whitespace-nowrap px-2 py-2 align-middle">
                <div className="flex w-max gap-1">
                  <button type="button" aria-label="تعديل" className="flex h-9 w-9 items-center justify-center border border-line" onClick={() => row.onEdit()}>
                    <Pencil size={16} />
                  </button>
                  <button type="button" aria-label="حذف" className="flex h-9 w-9 items-center justify-center border border-line text-clay" onClick={() => row.onDelete()}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </td>
            </tr>
          )) : (
            <tr>
              <td colSpan={columns.length + 1} className="px-3 py-4 text-muted">{empty}</td>
            </tr>
          )}
        </tbody>
      </table>
      {onAdd ? (
        <button type="button" className="h-11 w-full border-t border-line text-sm font-semibold" onClick={onAdd}>
          {addLabel}
        </button>
      ) : null}
    </div>
  );
}

export function DeleteSheet({ title, body, error, pending, onClose, onConfirm }) {
  return (
    <Sheet title={title} onClose={onClose}>
      <p className="text-sm">{body}</p>
      {error ? <p className="mt-3 bg-clay-soft px-3 py-3 text-clay" role="alert">{error}</p> : null}
      <button type="button" disabled={pending} className="mt-4 h-12 w-full bg-green font-semibold disabled:opacity-60" onClick={onConfirm}>
        {pending ? "بيتحذف..." : "حذف"}
      </button>
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

  async function remove(url) {
    if (pending) return;
    setPending(true);
    setError("");
    const response = await fetch(url, { method: "DELETE" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setPending(false);
      setError(data.error || "ما قدرناش نحذف");
      return;
    }
    close();
    router.refresh();
  }

  return { sheet, error, pending, open, close, remove };
}
