"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function ArticlePrefetch({ query, page, pages }) {
  const router = useRouter();

  useEffect(() => {
    const hrefs = [];
    for (let step = 1; step <= 4; step += 1) {
      const target = page + step;
      if (target <= pages) hrefs.push(articleHref(query, target));
    }
    if (page > 1) hrefs.push(articleHref(query, page - 1));
    let index = 0;
    let timer = 0;
    function next() {
      const href = hrefs[index];
      if (!href) return;
      router.prefetch(href);
      index += 1;
      timer = window.setTimeout(next, 350);
    }
    timer = window.setTimeout(next, 200);
    return () => window.clearTimeout(timer);
  }, [query, page, pages, router]);

  return null;
}

function articleHref(query, page) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (page > 1) params.set("page", String(page));
  const text = params.toString();
  return text ? `/articles?${text}` : "/articles";
}
