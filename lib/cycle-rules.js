export const NEW_CYCLE_CLOSES_ACTIVE =
  "أول ما تحفظ، الدورة الشغالة هتتقفل، والتسجيل الجديد هيروح للدورة الجديدة إلا لو اختارت دورة تانية من القائمة.";

export function splitCycles(rows) {
  const actives = rows.filter((row) => row.cycle.status === "active");
  return {
    current: actives[0] || null,
    extras: actives.slice(1),
    previous: rows.filter((row) => row.cycle.status !== "active"),
  };
}

export function logHref(cycleId, date) {
  const params = new URLSearchParams();
  if (cycleId) params.set("cycleId", cycleId);
  if (date) params.set("date", date);
  const query = params.toString();
  return query ? `/log?${query}` : "/log";
}

export function cycleOptionLabel({ name, status, current }) {
  const tag = status === "active" ? "شغالة" : "قديمة";
  if (current == null || current === "") return `${name} — ${tag}`;
  return `${name} — ${tag} · ${current} فرخة`;
}

export function defaultCycleId(choices, requestedId, preferredId) {
  if (requestedId && choices.some((item) => item.id === requestedId)) return requestedId;
  if (preferredId && choices.some((item) => item.id === preferredId)) return preferredId;
  return choices.find((item) => item.status === "active")?.id || choices[0]?.id || "";
}

export function groupExpensesByCycle(rows, cycles, preferredId) {
  const groups = cycles.map((cycle) => ({
    id: cycle.id,
    name: cycle.name,
    status: cycle.status,
    preferred: cycle.id === preferredId,
    rows: [],
  }));
  const index = new Map(groups.map((group) => [group.id, group]));
  const unassigned = [];
  for (const row of rows) {
    const group = row.cycleId ? index.get(row.cycleId) : null;
    if (group) group.rows.push(row);
    else unassigned.push(row);
  }
  if (unassigned.length || !groups.length) {
    groups.push({ id: "", name: "من غير دورة", status: "", preferred: false, rows: unassigned });
  }
  return groups;
}
