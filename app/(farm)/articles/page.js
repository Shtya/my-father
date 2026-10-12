import Link from "next/link";
import { Suspense } from "react";
import { ArticlePrefetch } from "@/components/article-prefetch";
import { ArticleThumb } from "@/components/article-thumb";
import { Field } from "@/components/form";
import { MORE, Page } from "@/components/ui";
import { articleImage, liveArticles } from "@/lib/articles-live";
import { formatDate } from "@/lib/format";

const topics = [
  ["", "الكل"],
  ["فراخ", "الفراخ"],
  ["كتاكيت", "الكتاكيت"],
  ["دواجن", "الدواجن"],
];

export default async function ArticlesPage({ searchParams }) {
  const params = await searchParams;
  const q = params.q || "";
  const page = Number(params.page) || 1;
  return (
    <Page back={MORE} title="مقالات الدواجن">
      <form className="flex items-start gap-2" method="get">
        <div className="min-w-0 flex-1">
          <Field label="ابحث في المقالات" name="q" defaultValue={q} />
        </div>
        <button className="h-12 shrink-0 bg-green px-4 font-semibold" type="submit">بحث</button>
      </form>
      <div className="flex gap-2 overflow-x-auto">
        {topics.map(([id, label]) => (
          <Link key={label} href={id ? `/articles?q=${id}` : "/articles"} className={`flex h-11 shrink-0 items-center border border-line px-4 text-base ${(!id && !q) || q === id ? "bg-green" : "bg-paper"}`}>{label}</Link>
        ))}
      </div>
      <Suspense fallback={<ArticleSkeleton />}>
        <ArticleList query={q} page={page} />
      </Suspense>
    </Page>
  );
}

async function ArticleList({ query, page }) {
  let result = { articles: [], page: 1, pages: 1, total: 0, query: query || "دواجن" };
  let error = "";
  try {
    result = await liveArticles({ query, page });
  } catch {
    error = "مصدر المقالات مش متاح دلوقتي.";
  }
  const links = pageLinks(result.page, result.pages);
  return (
    <>
      <ArticlePrefetch query={query} page={result.page} pages={result.pages} />
      <p className="text-sm text-muted">
        {error ? "" : `صفحة ${result.page} من ${result.pages} · ${result.total} مقال. بتتحدث كل دقيقتين من أجرى توداي ودواجن مصر.`}
      </p>
      {error ? <p className="bg-clay-soft px-3 py-3 text-clay">{error}</p> : null}
      <div className="border-y border-line bg-paper">
        {result.articles.map((article) => (
          <Link key={article.key} href={`/articles/post/${article.key}`} className="flex items-start gap-3 border-b border-line px-3 py-3 last:border-b-0">
            <ArticleThumb src={article.image ? articleImage(article.image) : ""} />
            <span className="min-w-0">
              <span className="block text-base font-semibold leading-snug">{article.title}</span>
              <span className="mt-1 block text-sm text-muted">{article.source} · {formatDate(article.date)}</span>
            </span>
          </Link>
        ))}
        {!error && !result.articles.length ? <p className="px-3 py-3 text-sm">ما لقيناش مقالات بالموضوع ده.</p> : null}
      </div>
      {result.pages > 1 ? (
        <nav className="flex flex-wrap items-center gap-2" aria-label="صفحات المقالات">
          {result.page > 1 ? <PageLink href={articleHref(query, result.page - 1)}>السابق</PageLink> : null}
          {links.map((item, index) => item === "…"
            ? <span key={`gap-${index}`} className="px-1 text-muted">…</span>
            : <PageLink key={item} href={articleHref(query, item)} active={item === result.page}>{item}</PageLink>)}
          {result.page < result.pages ? <PageLink href={articleHref(query, result.page + 1)}>التالي</PageLink> : null}
        </nav>
      ) : null}
    </>
  );
}

function ArticleSkeleton() {
  return (
    <div className="space-y-2">
      <div className="h-4 w-48 animate-pulse bg-line" />
      <div className="border-y border-line bg-paper">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="flex items-start gap-3 border-b border-line px-3 py-3 last:border-b-0">
            <span className="h-14 w-14 shrink-0 animate-pulse bg-soft" />
            <span className="min-w-0 flex-1 space-y-2 py-1">
              <span className="block h-4 w-full animate-pulse bg-line" />
              <span className="block h-4 w-2/3 animate-pulse bg-line" />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PageLink({ href, active, children }) {
  return <Link href={href} prefetch className={`flex h-12 min-w-12 items-center justify-center border border-line px-3 text-base font-semibold ${active ? "bg-green" : "bg-paper"}`}>{children}</Link>;
}

function articleHref(query, page) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (page > 1) params.set("page", String(page));
  const text = params.toString();
  return text ? `/articles?${text}` : "/articles";
}

function pageLinks(current, total) {
  const around = [];
  for (let page = current - 1; page <= current + 4; page += 1) around.push(page);
  const wanted = [...new Set([1, ...around, total])].filter((page) => page >= 1 && page <= total).sort((left, right) => left - right);
  const links = [];
  for (const page of wanted) {
    if (links.length && page - links.at(-1) > 1) links.push("…");
    links.push(page);
  }
  return links;
}
