"use client";

import { useRouter } from "next/navigation";
import { Select } from "@/components/form";
import { currentPath, submit, useOperations } from "@/components/mutations";
import { cycleOptionLabel } from "@/lib/cycle-rules";

export function CycleSelect({
  cycles,
  defaultValue,
  required = true,
  allowEmpty = false,
  reloadOnChange = false,
  showBirds = false,
}) {
  const router = useRouter();
  const hint = allowEmpty
    ? "اختار الدورة القديمة لو التسجيل ده ليها. تقدر تسيبها فاضية."
    : "اختار الدورة القديمة لو التسجيل ده ليها، مش لازم يروح للشغالة.";

  function onChange(event) {
    if (!reloadOnChange) return;
    const url = new URL(window.location.href);
    const value = event.target.value;
    if (value) url.searchParams.set("cycleId", value);
    else url.searchParams.delete("cycleId");
    router.replace(`${url.pathname}${url.search}`);
  }

  return (
    <Select key={defaultValue || "none"} label="الدورة" name="cycleId" required={required && !allowEmpty} defaultValue={defaultValue || ""} onChange={onChange} hint={hint}>
      {allowEmpty ? <option value="">من غير دورة</option> : null}
      {cycles.map((item) => (
        <option key={item.id} value={item.id}>
          {cycleOptionLabel(showBirds ? item : { ...item, current: null })}
        </option>
      ))}
    </Select>
  );
}

export function ExpenseCycleFields({ cycles, defaultValue, rememberedId, allowEmpty = true }) {
  const remembered = cycles.find((item) => item.id === rememberedId);
  return (
    <div className="space-y-3">
      <CycleSelect cycles={cycles} defaultValue={defaultValue} allowEmpty={allowEmpty} />
      <label className="flex min-h-12 items-center gap-3 border border-line bg-paper px-3 text-base">
        <input
          className="h-6 w-6 accent-[var(--green)]"
          type="checkbox"
          name="rememberCycle"
          defaultChecked={Boolean(rememberedId && rememberedId === defaultValue)}
        />
        خلّي الدورة دي الافتراضية للمصاريف الجاية
      </label>
      {remembered ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border border-line bg-paper px-3 py-2">
          <p className="text-sm text-muted">الافتراضية دلوقتي: {remembered.name}</p>
          <ClearDefaultCycle />
        </div>
      ) : null}
    </div>
  );
}

function ClearDefaultCycle() {
  const key = "PATCH /api/settings/default-cycle";
  const op = useOperations().find((item) => item.key === key) || null;
  const pending = op?.status === "pending";

  function clear() {
    if (pending) return;
    submit({
      key,
      formKey: key,
      url: "/api/settings/default-cycle",
      method: "PATCH",
      body: { cycleId: null },
      page: currentPath(),
      successMessage: "الدورة الافتراضية اتشالت.",
      label: "إلغاء الدورة الافتراضية",
    });
  }

  return (
    <button type="button" disabled={pending} className="h-11 px-3 text-sm font-semibold text-clay disabled:opacity-60" onClick={clear}>
      {pending ? "بيتشال..." : "إلغاء الافتراضي"}
    </button>
  );
}
