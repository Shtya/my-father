const HOSTS = new Set(["agri2day.com", "www.agri2day.com", "egypoultry.com", "www.egypoultry.com"]);

export async function GET(request) {
  const src = new URL(request.url).searchParams.get("src") || "";
  let target;
  try {
    target = new URL(src);
  } catch {
    return new Response(null, { status: 400 });
  }
  if (target.protocol !== "https:" || !HOSTS.has(target.hostname)) return new Response(null, { status: 403 });
  const upstream = await fetch(target, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
      Accept: "image/*",
      Referer: `${target.origin}/`,
    },
    signal: AbortSignal.timeout(12000),
  });
  const type = upstream.headers.get("content-type") || "";
  if (!upstream.ok || !type.startsWith("image/")) return new Response(null, { status: 404 });
  return new Response(upstream.body, {
    headers: {
      "Content-Type": type,
      "Cache-Control": "public, max-age=86400",
    },
  });
}
