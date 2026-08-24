const CACHE_NAME = "binancinvest-live-pwa-v4-20260824-1115";
const STATIC_FILES = [
  "/app-icon-192.png",
  "/app-icon-512.png",
  "/apple-touch-icon.png",
  "/binancinvest-manifest-v4.webmanifest",
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

  // Never interfere with Supabase/APIs/cross-origin account traffic.
  if (url.origin !== self.location.origin) return;

  // Every page navigation is NETWORK FIRST and HTML is never stored in
  // our PWA cache. This is what lets website changes appear automatically.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/offline.html"))
    );
    return;
  }

  // Cache only stable install identity files.
  if (
    url.pathname === "/app-icon-192.png" ||
    url.pathname === "/app-icon-512.png" ||
    url.pathname === "/apple-touch-icon.png" ||
    url.pathname === "/binancinvest-manifest-v4.webmanifest" ||
    url.pathname === "/offline.html"
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request)
          .then((response) => {
            if (response && response.ok) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, response.clone());
              });
            }
            return response;
          })
          .catch(() => cached);

        return cached || network;
      })
    );
  }
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
