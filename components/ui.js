import Link from "next/link";

export function Page({ eyebrow, title, action, children }) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-4 pb-6">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          {eyebrow ? <p className="text-xs text-muted">{eyebrow}</p> : null}
          <h1 className="truncate text-xl font-semibold leading-snug">{title}</h1>
        </div>
        {action}
      </header>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

export function Section({ title, children, aside }) {
  return (
    <section>
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold text-muted">{title}</h2>
        {aside}
      </div>
      <div className="border-y border-line bg-paper">{children}</div>
    </section>
  );
}

export function Line({ label, value, hint, href }) {
  const className = "flex items-center justify-between gap-3 border-b border-line px-3 py-2 last:border-b-0";
  const content = (
    <>
      <div className="min-w-0">
        <p className="truncate text-sm">{label}</p>
        {hint ? <p className="truncate text-xs text-muted">{hint}</p> : null}
      </div>
      <p className="num shrink-0 text-base font-semibold">{value}</p>
    </>
  );
  if (!href) return <div className={className}>{content}</div>;
  return <Link href={href} className={`${className} hover:bg-soft`}>{content}</Link>;
}

export function Empty({ title, body, href, action }) {
  return (
    <div className="flex items-center justify-between gap-3 bg-paper px-3 py-3">
      <div className="min-w-0">
        <p className="font-semibold">{title}</p>
        {body ? <p className="truncate text-sm text-muted">{body}</p> : null}
      </div>
      {href ? <Link href={href} className="inline-flex h-10 shrink-0 items-center bg-green px-3 text-sm font-semibold text-white">{action}</Link> : null}
    </div>
  );
}

export function ButtonLink({ href, children }) {
  return <Link href={href} className="inline-flex h-10 shrink-0 items-center bg-green px-3 text-sm font-semibold text-white">{children}</Link>;
}
