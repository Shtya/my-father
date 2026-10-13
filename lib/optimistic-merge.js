const UPDATE_MARGIN = 2000;

function applies(op, patch, ids, renderedAt) {
  if (op.status === "error") return false;
  if (patch.type === "add" && ids.has(patch.id)) return false;
  if (op.status === "pending") return true;
  const rendered = Number(renderedAt || 0);
  if (patch.type === "add") return rendered < op.serverAt;
  if (patch.type === "remove") return ids.has(patch.id) && rendered < op.serverAt;
  return rendered + UPDATE_MARGIN < op.serverAt;
}

function bump(row, increment) {
  if (!increment) return row;
  const next = { ...row };
  for (const [name, by] of Object.entries(increment)) {
    next[name] = Math.round((Number(row[name]) || 0) * 1000 + Number(by) * 1000) / 1000;
  }
  return next;
}

/**
 * Server rows + every operation that the server rows do not reflect yet.
 * Failed operations are skipped, so a failure rolls the list back to the server state.
 * A finished operation stops applying once the rows were rendered after the server answered
 * (add/remove also stop as soon as the rows show them). Updates keep a margin because the render
 * time is taken before its queries run. `increment` adds to the current value,
 * so two payments sent back to back both count.
 */
export function mergeRows(scope, rows, operations, renderedAt) {
  let result = rows;
  let delta = 0;
  const ids = new Set(rows.map((row) => row.id));
  for (const op of operations) {
    for (const patch of op.patches || []) {
      if (patch.scope !== scope || !applies(op, patch, ids, renderedAt)) continue;
      const pending = op.status === "pending";
      if (patch.type === "add") result = [{ ...patch.row, id: patch.id, pending }, ...result];
      else if (patch.type === "update") result = result.map((row) => (row.id === patch.id ? bump({ ...row, ...patch.changes, pending }, patch.increment) : row));
      else if (patch.type === "remove") result = result.filter((row) => row.id !== patch.id);
      delta += Number(patch.delta) || 0;
    }
  }
  return { rows: result, delta };
}
