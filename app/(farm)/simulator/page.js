"use client";

import { useState } from "react";
import { Field, NETWORK_ERROR } from "@/components/form";
import { Page } from "@/components/ui";
import { formatMoney } from "@/lib/format";

export default function SimulatorPage() {
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError("");
    const body = Object.fromEntries(new FormData(event.currentTarget).entries());
    let response;
    try {
      response = await fetch("/api/simulate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    } catch {
      setError(NETWORK_ERROR);
      setPending(false);
      return;
    }
    const data = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) {
      setError(data.error || "ما قدرناش نحسب. راجع الأرقام.");
      return;
    }
    setResult(data);
  }

  return (
    <Page back={{ href: "/cycle", label: "الدورة" }} title="حاسبة الربح">
      <p className="text-base text-muted">اكتب الأرقام المتوقعة، والحاسبة تقولك الربح التقريبي.</p>
      <form onSubmit={onSubmit} className="space-y-4">
        <NumberField label="عدد الفراخ" name="birds" step="1" />
        <NumberField label="متوسط الوزن المتوقع كجم" name="weightKg" />
        <NumberField label="سعر بيع الكيلو" name="price" />
        <NumberField label="اللي اتصرف لحد دلوقتي" name="currentCost" />
        <NumberField label="مصاريف لسه هتتصرف" name="extraCost" optional />
        {error ? <p className="bg-clay-soft px-3 py-3 font-semibold text-clay" role="alert">{error}</p> : null}
        <button className="h-12 w-full bg-green text-base font-semibold disabled:opacity-60" type="submit" disabled={pending} aria-busy={pending}>
          {pending ? "بيحسب..." : "احسب الربح"}
        </button>
      </form>
      {result ? (
        <div className="border-y border-line bg-paper" aria-live="polite">
          <Row label="الإيراد المتوقع" value={formatMoney(result.revenue)} />
          <Row label="التكلفة" value={formatMoney(result.totalCost)} />
          <Row label={result.profit >= 0 ? "الربح المتوقع" : "الخسارة المتوقعة"} value={formatMoney(Math.abs(result.profit))} />
          <Row label="أقل سعر كيلو يغطي التكلفة" value={result.breakEven ? formatMoney(result.breakEven) : "—"} />
          <p className="px-4 py-3 text-sm text-muted">تقدير حسب الأرقام اللي كتبتها، مش ضمان.</p>
        </div>
      ) : null}
    </Page>
  );
}

function NumberField({ label, name, step = "0.01", optional = false }) {
  return <Field label={label} name={name} type="number" step={step} min="0" required={!optional} />;
}

function Row({ label, value }) {
  return <div className="flex min-h-12 items-baseline justify-between gap-3 border-b border-line px-4 py-3"><span className="text-base">{label}</span><strong className="num text-xl">{value}</strong></div>;
}
