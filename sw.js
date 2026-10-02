const CACHE_NAME = "binancinvest-live-pwa-v6-20261002";
const CACHED_DOCUMENT = "/index.html";
const OFFLINE_PAGE = "/offline.html";

const STATIC_FILES = [
  OFFLINE_PAGE,
  "/binancinvest-icon-v37-192.png?v=20260824-1131",
  "/binancinvest-icon-v37-512.png?v=20260824-1131",
  "/binancinvest-icon-v37-maskable-512.png?v=20260824-1131",
  "/binancinvest-apple-touch-v37.png?v=20260824-1131",
  "/binancinvest-manifest-v5.webmanifest?v=20260824-1131"
];

async function fetchFresh(request) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    return await fetch(request, {
      cache: "no-store",
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function cacheSuccessfulDocument(response) {
  if (!response || !response.ok) return;
  const cache = await caches.open(CACHE_NAME);
  await cache.put(CACHED_DOCUMENT, response.clone());
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);

    await Promise.allSettled(
      STATIC_FILES.map((url) => cache.add(new Request(url, { cache: "reload" })))
    );

    try {
      const response = await fetchFresh(new Request("/", { cache: "reload" }));
      await cacheSuccessfulDocument(response);
    } catch (_) {
      const previousKeys = (await caches.keys()).filter((key) =>
        key.startsWith("binancinvest-") && key !== CACHE_NAME
      );

      for (const key of previousKeys) {
        const previousDocument = await (await caches.open(key)).match(CACHED_DOCUMENT);
        if (previousDocument) {
          await cache.put(CACHED_DOCUMENT, previousDocument);
          break;
        }
      }
    }

    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => key.startsWith("binancinvest-") && key !== CACHE_NAME)
        .map((key) => caches.delete(key))
    );

    await self.clients.claim();
  })());
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const response = await fetchFresh(request);
        if (!response.ok) throw new Error(`Navigation failed: ${response.status}`);

        await cacheSuccessfulDocument(response);
        return response;
      } catch (_) {
        const cache = await caches.open(CACHE_NAME);
        const lastSuccessfulDocument = await cache.match(CACHED_DOCUMENT);
        if (lastSuccessfulDocument) return lastSuccessfulDocument;

        const offline = await cache.match(OFFLINE_PAGE);
        if (offline) return offline;

        return new Response(
          "BinancInvest is temporarily unable to connect. Please try again.",
          {
            status: 503,
            headers: { "Content-Type": "text/plain; charset=utf-8" }
          }
        );
      }
    })());
    return;
  }

  const staticPaths = new Set([
    "/binancinvest-icon-v37-192.png",
    "/binancinvest-icon-v37-512.png",
    "/binancinvest-icon-v37-maskable-512.png",
    "/binancinvest-apple-touch-v37.png",
    "/binancinvest-manifest-v5.webmanifest",
    OFFLINE_PAGE
  ]);

  if (staticPaths.has(url.pathname)) {
    event.respondWith((async () => {
      try {
        const response = await fetch(request, { cache: "reload" });
        if (response?.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, response.clone());
        }
        return response;
      } catch (_) {
        return (await caches.match(request)) || Response.error();
      }
    })());
  }
});
