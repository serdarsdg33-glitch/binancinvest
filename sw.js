const CACHE_NAME = "binancinvest-live-pwa-v5-20260824-1131";
const STATIC_FILES = [
  "/binancinvest-icon-v37-192.png?v=20260824-1131",
  "/binancinvest-icon-v37-512.png?v=20260824-1131",
  "/binancinvest-icon-v37-maskable-512.png?v=20260824-1131",
  "/binancinvest-apple-touch-v37.png?v=20260824-1131",
  "/binancinvest-manifest-v5.webmanifest?v=20260824-1131",
  "/offline.html"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const url of STATIC_FILES) {
        try {
          await cache.add(new Request(url, { cache: "reload" }));
        } catch (_) {}
      }
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Always load live HTML from network.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request, { cache: "no-store" })
        .catch(() => caches.match("/offline.html"))
    );
    return;
  }

  const staticPaths = new Set([
    "/binancinvest-icon-v37-192.png",
    "/binancinvest-icon-v37-512.png",
    "/binancinvest-icon-v37-maskable-512.png",
    "/binancinvest-apple-touch-v37.png",
    "/binancinvest-manifest-v5.webmanifest",
    "/offline.html"
  ]);

  if (staticPaths.has(url.pathname)) {
    event.respondWith(
      fetch(request, { cache: "reload" })
        .then((response) => {
          if (response && response.ok) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, response.clone());
            });
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
  }
});
