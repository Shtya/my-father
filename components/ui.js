import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { formatNumber } from "@/lib/format";

export const MORE = { href: "/more", label: "المزيد" };

export function Total({ label, value }) {
  return (
    <div className="text-end">
      <p className="text-sm text-muted">{label}</p>
      <p className="num text-lg font-bold">{value}</p>
    </div>
  );
}

export function Page({ eyebrow, title, action, back, children }) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-4 pb-6">
      {back ? (
        <Link href={back.href} className="mb-2 inline-flex h-11 items-center gap-1 pe-3 text-base font-semibold text-green">
          <ChevronRight size={22} aria-hidden="true" />
          رجوع إلى {back.label}
        </Link>
      ) : null}
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          {eyebrow ? <p className="text-sm text-muted">{eyebrow}</p> : null}
          <h1 className="text-2xl font-bold leading-snug">{title}</h1>
        </div>
        {action}
      </header>
      <div className="space-y-5">{children}</div>
    </div>
  );
}

export function Section({ title, children, aside }) {
  return (
    <section>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <h2 className="text-base font-bold">{title}</h2>
        {aside}
      </div>
      <div className="border-y border-line bg-paper">{children}</div>
    </section>
  );
}

export function Line({ label, value, hint, href }) {
  const className = "flex min-h-12 items-center justify-between gap-3 border-b border-line px-3 py-2.5 last:border-b-0";
  const content = (
    <>
      <div className="min-w-0">
        <p className="text-base">{label}</p>
        {hint ? <p className="text-sm text-muted">{hint}</p> : null}
      </div>
      <p className="num shrink-0 text-lg font-bold">{value}</p>
      {href ? <ChevronRight size={20} className="shrink-0 rotate-180 text-muted" aria-hidden="true" /> : null}
    </>
  );
  if (!href) return <div className={className}>{content}</div>;
  return <Link href={href} className={`${className} hover:bg-soft active:bg-soft`}>{content}</Link>;
}

export function WeightLine({ stats, active, empty = "—" }) {
  if (stats.weightSuspect) {
    const day = String(stats.suspectWeightDate).slice(0, 10);
    return (
      <Line
        label="متوسط الوزن"
        value={<span className="text-clay">راجع الوزن</span>}
        hint={`اتسجل ${formatNumber(stats.suspectWeight)} كيلو للفرخة. لو ده بالجرام اكتبه بالكيلو.${active ? " دوس هنا للتصحيح." : ""}`}
        href={active ? `/log?date=${day}` : undefined}
      />
    );
  }
  return <Line label="متوسط الوزن" value={stats.avgWeight ? `${formatNumber(stats.avgWeight, 2)} كجم` : empty} />;
}

export function Empty({ title, body, href, action }) {
  return (
    <div className="space-y-3 bg-paper px-3 py-4">
      <div>
        <p className="text-base font-semibold">{title}</p>
        {body ? <p className="text-sm text-muted">{body}</p> : null}
      </div>
      {href ? <ButtonLink href={href}>{action}</ButtonLink> : null}
    </div>
  );
}

export function ButtonLink({ href, children }) {
  return <Link href={href} className="inline-flex h-12 shrink-0 items-center justify-center bg-green px-4 text-base font-semibold text-white">{children}</Link>;
}
