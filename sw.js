const CACHE_NAME = "binancinvest-pwa-v3-20260823";

const CORE = [
  "/",
  "/binancinvest-manifest-v3.webmanifest",
  "/app-icon-192.png",
  "/app-icon-512.png",
  "/apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  /*
    Cache items one by one. One missing optional file must never make
    the whole service-worker installation fail.
  */
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await Promise.all(
        CORE.map(async (url) => {
          try {
            await cache.add(
              new Request(url, { cache: "reload" })
            );
          } catch (error) {
            console.warn("PWA precache skipped:", url);
          }
        })
      );
    })
  );

  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();

      await Promise.all(
        names
          .filter((name) =>
            name.startsWith("binancinvest-pwa-") &&
            name !== CACHE_NAME
          )
          .map((name) => caches.delete(name))
      );

      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  /*
    Never intercept Supabase/API or other third-party account traffic.
  */
  if (url.origin !== self.location.origin) return;

  /*
    Page navigation: network first, cached home shell only if offline.
  */
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);

          if (response && response.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put("/", response.clone()).catch(() => {});
          }

          return response;
        } catch (error) {
          return (
            (await caches.match(request)) ||
            (await caches.match("/")) ||
            Response.error()
          );
        }
      })()
    );

    return;
  }

  /*
    PWA identity files: cache first and refresh in the background.
  */
  if (
    url.pathname === "/binancinvest-manifest-v3.webmanifest" ||
    url.pathname === "/app-icon-192.png" ||
    url.pathname === "/app-icon-512.png" ||
    url.pathname === "/apple-touch-icon.png"
  ) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);

        const freshPromise = fetch(request)
          .then(async (response) => {
            if (response && response.ok) {
              const cache = await caches.open(CACHE_NAME);
              await cache.put(request, response.clone());
            }
            return response;
          })
          .catch(() => null);

        return cached || (await freshPromise) || Response.error();
      })()
    );
  }
});
