const SHELL = "poultry-shell-v3";

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL);
    await Promise.all(["/home", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png"].map((url) => cache.add(url).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key !== SHELL).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

function offline() {
  return new Response("<!doctype html><html lang=\"ar\" dir=\"rtl\"><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><body style=\"font-family:sans-serif;padding:2rem;font-size:18px\"><p>النت مش شغال دلوقتي. أول ما يرجع افتح الصفحة تاني.</p></body></html>", {
    status: 503,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

// Live data (API, server-component refreshes) always goes to the network untouched:
// a cached copy would show old numbers as if they were current.
self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.searchParams.has("_rsc") || request.headers.get("RSC")) return;

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) {
          const copy = response.clone();
          caches.open(SHELL).then((cache) => cache.put(request, copy)).catch(() => {});
        }
        return response;
      } catch {
        return (await caches.match(request)) || (await caches.match("/home")) || offline();
      }
    })());
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || /\.(png|svg|ico|webmanifest|woff2?)$/.test(url.pathname)) {
    event.respondWith((async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) {
        const copy = response.clone();
        caches.open(SHELL).then((cache) => cache.put(request, copy)).catch(() => {});
      }
      return response;
    })());
  }
});
