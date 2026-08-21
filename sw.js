const CACHE_NAME = "invest-app-shell-v1";

const SHELL = [
  "/",
  "/manifest.webmanifest",
  "/app-icon-192.png",
  "/app-icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL))
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

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  // درخواست‌های Supabase و سرویس‌های خارجی کش نمی‌شوند.
  if (url.origin !== self.location.origin) {
    return;
  }

  // صفحات سایت همیشه اول از اینترنت گرفته می‌شوند.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/"))
    );

    return;
  }

  // فقط فایل‌های ثابت مربوط به نصب برنامه کش می‌شوند.
  if (
    url.pathname === "/manifest.webmanifest" ||
    url.pathname === "/app-icon-192.png" ||
    url.pathname === "/app-icon-512.png"
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) => cached || fetch(request)
      )
    );
  }
});
