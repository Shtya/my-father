"use client";

import { useMemo } from "react";
import { useOptimisticRows } from "@/components/mutations";
import { Total } from "@/components/ui";
import { formatMoney } from "@/lib/format";

export function LiveTotal({ label, base, scope, ids, renderedAt }) {
  const rows = useMemo(() => ids.map((id) => ({ id })), [ids]);
  const { delta } = useOptimisticRows(scope, rows, renderedAt);
  return <Total label={label} value={formatMoney(Number(base) + delta)} />;
}
