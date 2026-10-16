"use client";

import { useRouter } from "next/navigation";
import { Select } from "@/components/form";
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
