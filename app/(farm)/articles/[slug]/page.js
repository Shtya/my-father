import Link from "next/link";
import { notFound } from "next/navigation";
import { getArticle, markRead } from "@/lib/farm";
import { BookmarkButton } from "@/components/actions";
import { Page } from "@/components/ui";

export default async function ArticlePage({ params }) {
  const { slug } = await params;
  let article;
  try {
    article = await getArticle(slug);
  } catch (error) {
    if (error.status === 404) notFound();
    throw error;
  }
  await markRead(slug);
  return (
    <Page eyebrow={article.category_name} title={article.title} action={<BookmarkButton slug={slug} initial={article.bookmarked} />}>
      <p className="text-muted">{article.summary}</p>
      <article className="whitespace-pre-wrap bg-paper px-4 py-4 leading-8">{article.content}</article>
      <p className="text-sm text-muted">المصدر: {article.source_name || "ملخص تعليمي"}{article.source_url ? ` · ${article.source_url}` : ""}</p>
      <Link href={`/articles?q=${encodeURIComponent(article.title)}`} className="text-sm font-semibold">المقالات المنشورة على المواقع</Link>
      {article.related?.length ? (
        <div>
          <p className="mb-2 text-sm font-semibold text-muted">مقالات قريبة</p>
          {article.related.map((item) => <Link key={item.slug} href={`/articles/${item.slug}`} className="block border-b border-line py-3">{item.title}</Link>)}
        </div>
      ) : null}
    </Page>
  );
}
