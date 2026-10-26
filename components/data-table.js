"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";
import { Sheet } from "@/components/form";
import { currentPath, submit, useReopen } from "@/components/mutations";

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
              <tr key={row.id} aria-busy={row.pending || undefined} className={`border-b border-line last:border-b-0 ${row.pending ? "bg-soft/60" : ""}`}>
                {row.cells.map((cell, index) => (
                  <td key={`${row.id}-${index}`} className={`px-3 py-2 align-middle ${index === 0 ? "min-w-28 font-semibold" : "w-0 whitespace-nowrap"} ${row.pending ? "text-muted" : ""}`}>
                    {cell}
                    {index === 0 && row.pending ? <span className="block text-sm font-normal text-muted">بيتحفظ...</span> : null}
                  </td>
                ))}
                <td className="w-0 whitespace-nowrap px-2 py-1.5 align-middle">
                  <div className="flex w-max gap-1.5">
                    <button type="button" disabled={row.pending} aria-label={`تعديل ${row.name || ""}`.trim()} title={row.pending ? "استنى لحد ما يتحفظ" : "تعديل"} className="flex h-11 w-11 items-center justify-center border border-line bg-white disabled:opacity-40" onClick={() => row.onEdit()}>
                      <Pencil size={18} aria-hidden="true" />
                    </button>
                    <button type="button" disabled={row.pending} aria-label={`حذف ${row.name || ""}`.trim()} title={row.pending ? "استنى لحد ما يتحفظ" : "حذف"} className="flex h-11 w-11 items-center justify-center border border-line bg-white text-clay disabled:opacity-40" onClick={() => row.onDelete()}>
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

export function DeleteSheet({ title, body, onClose, onConfirm }) {
  return (
    <Sheet title={title} onClose={onClose}>
      <p className="text-base">{body}</p>
      <p className="mt-2 text-sm text-muted">الحذف ما ينفعش يترجع.</p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button type="button" className="h-12 border border-line bg-white font-semibold" onClick={onClose}>
          لا، رجوع
        </button>
        <button type="button" className="h-12 bg-clay font-semibold text-white" onClick={onConfirm}>
          أيوه، احذف
        </button>
      </div>
    </Sheet>
  );
}

/**
 * Sheet state for a table plus optimistic delete. `scope` and `rows` let a failed save reopen
 * the right sheet (add, or edit of the same row) after the list was rolled back.
 */
export function useRecordActions(scope, rows = []) {
  const [sheet, setSheet] = useState(null);

  const open = useCallback((next) => setSheet(next), []);
  const close = useCallback(() => setSheet(null), []);

  const onReopen = useCallback((op) => {
    const rowId = op.reopen?.rowId;
    if (!rowId) {
      setSheet({ type: "add", cycleId: op.reopen?.cycleId || "" });
      return true;
    }
    const row = rows.find((item) => item.id === rowId);
    if (!row) return false;
    setSheet({ type: "edit", row });
    return true;
  }, [rows]);
  useReopen(scope, onReopen);

  function remove(url, { message = "اتحذف.", label = "السجل", id, delta = 0 } = {}) {
    submit({
      key: `DELETE ${url}`,
      formKey: `DELETE ${url}`,
      url,
      method: "DELETE",
      body: null,
      page: currentPath(),
      landing: null,
      successMessage: message,
      label,
      patches: scope && id ? [{ scope, type: "remove", id, delta: -Number(delta || 0) }] : [],
      reopen: null,
    });
    setSheet(null);
  }

  return { sheet, open, close, remove };
}
