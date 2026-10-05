import Link from "next/link";
import { notFound } from "next/navigation";
import { liveArticle } from "@/lib/articles-live";

export default async function LiveArticlePage({ params }) {
  const { id } = await params;
  if (!/^(?:(?:agri2day|egypoultry)-)?\d+$/.test(id)) notFound();
  let article;
  try {
    article = await liveArticle(id);
  } catch {
    article = null;
  }
  if (!article?.url) notFound();
  return (
    <div className="flex h-[calc(100dvh-5.75rem)] flex-col">
      <div className="flex items-center gap-3 px-3 py-2">
        <Link href="/articles" className="shrink-0 text-sm font-semibold">رجوع</Link>
        <p className="min-w-0 truncate text-sm font-semibold">{article.title}</p>
      </div>
      <iframe
        title={article.title}
        src={article.url}
        className="min-h-0 w-full flex-1 border-0 bg-white"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}
