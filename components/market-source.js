"use client";

import { useRouter } from "next/navigation";

export function MarketSourceSelect({ sources, active }) {
  const router = useRouter();
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-muted">الأسعار من بورصة</span>
      <select
        className="h-12 w-full border border-line bg-white px-3 text-base focus-visible:border-green"
        value={active}
        aria-label="البورصة"
        onChange={(event) => {
          const source = event.target.value;
          router.push(source === "elmorshd" ? "/market" : `/market?source=${source}`);
        }}
      >
        {sources.map((source) => (
          <option key={source.id} value={source.id}>{source.name}</option>
        ))}
      </select>
    </label>
  );
}
