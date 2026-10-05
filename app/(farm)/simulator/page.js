"use client";

import { useState } from "react";
import { Field } from "@/components/form";
import { Page } from "@/components/ui";

export default function SimulatorPage() {
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  async function onSubmit(event) {
    event.preventDefault();
    setError("");
    const body = Object.fromEntries(new FormData(event.currentTarget).entries());
    const response = await fetch("/api/simulate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "حصل خطأ");
      return;
    }
    setResult(data);
  }

  return (
    <Page title="حاسبة الربح">
      <form onSubmit={onSubmit} className="space-y-4">
        <Number label="عدد الفراخ" name="birds" />
        <Number label="متوسط الوزن المتوقع كجم" name="weightKg" />
        <Number label="سعر البيع للكيلو" name="price" />
        <Number label="التكلفة الحالية" name="currentCost" />
        <Number label="مصاريف لسه متوقعة" name="extraCost" />
        {error ? <p className="text-clay">{error}</p> : null}
        <button className="h-12 w-full bg-green font-semibold" type="submit">احسب</button>
      </form>
      {result ? (
        <div className="bg-paper">
          <Row label="الإيراد المتوقع" value={money(result.revenue)} />
          <Row label="التكلفة" value={money(result.totalCost)} />
          <Row label="الربح المتوقع" value={money(result.profit)} />
          <Row label="أقل سعر بيع لتغطية التكلفة" value={result.breakEven ? money(result.breakEven) : "—"} />
          <p className="px-4 py-3 text-sm text-muted">تقدير حسب الأرقام اللي كتبتها، مش ضمان.</p>
        </div>
      ) : null}
    </Page>
  );
}

function Number({ label, name }) {
  return <Field label={label} name={name} type="number" step="0.01" min="0" required={name !== "extraCost"} />;
}

function Row({ label, value }) {
  return <div className="flex items-baseline justify-between border-b border-line px-4 py-3"><span>{label}</span><strong className="num text-xl">{value}</strong></div>;
}

function money(value) {
  return `${Math.round(Number(value)).toLocaleString("ar-EG")} جنيه`;
}
