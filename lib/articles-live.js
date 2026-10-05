const SOURCES = {
  agri2day: { name: "أجرى توداي", origin: "https://agri2day.com" },
  egypoultry: { name: "دواجن مصر", origin: "https://egypoultry.com" },
};

const PAGE_SIZE = 12;
const headers = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  Accept: "application/json",
};

function plain(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, "")
    .replace(/&#8211;/g, "–")
    .replace(/&#8220;|&#8221;|&quot;/g, "\"")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function mapPost(post, sourceId) {
  const source = SOURCES[sourceId];
  const title = plain(post.title?.rendered);
  const url = String(post.link || "");
  if (!title || !url.startsWith(`${source.origin}/`)) return null;
  return {
    id: post.id,
    key: `${sourceId}-${post.id}`,
    title,
    image: post._embedded?.["wp:featuredmedia"]?.[0]?.source_url || "",
    url,
    date: String(post.modified || post.date || "").slice(0, 10),
    source: source.name,
    sourceId,
  };
}

async function loadPosts(sourceId, query, page) {
  const source = SOURCES[sourceId];
  const url = `${source.origin}/wp-json/wp/v2/posts?search=${encodeURIComponent(query)}&per_page=${PAGE_SIZE}&page=${page}&orderby=modified&order=desc&_embed=wp:featuredmedia`;
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(12000) });
  if (response.status === 400) return { posts: [], total: 0, pages: 1 };
  if (!response.ok) throw new Error("articles");
  const posts = await response.json();
  return {
    posts: posts.map((post) => mapPost(post, sourceId)).filter(Boolean),
    total: Number(response.headers.get("x-wp-total") || posts.length),
    pages: Math.max(1, Number(response.headers.get("x-wp-totalpages") || 1)),
  };
}

export async function liveArticles({ query, page } = {}) {
  const term = String(query || "دواجن").trim() || "دواجن";
  const current = Math.max(1, Number(page) || 1);
  const cacheKey = `${term}:${current}`;
  const cache = globalThis.__poultryArticles || { times: {}, data: {} };
  cache.times = cache.times || {};
  if (cache.data[cacheKey] && Date.now() - cache.times[cacheKey] < 2 * 60 * 1000) return cache.data[cacheKey];

  const [main, side] = await Promise.all([
    loadPosts("agri2day", term, current),
    current === 1 ? loadPosts("egypoultry", term, 1).catch(() => ({ posts: [] })) : Promise.resolve({ posts: [] }),
  ]);
  const extra = side.posts || [];
  const result = {
    articles: [...extra, ...main.posts],
    page: current,
    pages: main.pages,
    total: main.total,
    query: term,
  };
  cache.times[cacheKey] = Date.now();
  cache.data[cacheKey] = result;
  globalThis.__poultryArticles = cache;
  return result;
}

export async function liveArticle(ref) {
  const match = String(ref).match(/^(?:(agri2day|egypoultry)-)?(\d+)$/);
  if (!match) return null;
  const sourceId = match[1] || "agri2day";
  const source = SOURCES[sourceId];
  const response = await fetch(`${source.origin}/wp-json/wp/v2/posts/${match[2]}?_embed`, { headers, signal: AbortSignal.timeout(12000) });
  if (!response.ok) return null;
  return mapPost(await response.json(), sourceId);
}

export function articleImage(url) {
  if (!url) return "";
  return `/api/article-image?src=${encodeURIComponent(url)}`;
}
