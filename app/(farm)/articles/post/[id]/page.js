import Link from "next/link";
import { ChevronRight } from "lucide-react";
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
      <div className="flex items-center gap-2 border-b border-line bg-paper px-3 py-1">
        <Link href="/articles" className="flex h-11 shrink-0 items-center gap-1 pe-2 text-base font-semibold text-green">
          <ChevronRight size={22} aria-hidden="true" />
          رجوع للمقالات
        </Link>
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
