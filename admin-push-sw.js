'use strict';

const DEFAULT_URL = '/admin.html';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

self.addEventListener('push', event => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_) {
    data = { body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'Binanc Invest Admin';
  const options = {
    body: data.body || 'یک اعلان مدیریتی جدید دارید.',
    icon: data.icon || '/binancinvest-icon-192.png',
    badge: data.badge || '/binancinvest-icon-32.png',
    tag: data.tag || 'binancinvest-admin',
    renotify: true,
    requireInteraction: Boolean(data.requireInteraction),
    data: { url: data.url || DEFAULT_URL }
  };

  event.waitUntil((async () => {
    await self.registration.showNotification(title, options);
    if (self.navigator && 'setAppBadge' in self.navigator) {
      try { await self.navigator.setAppBadge(Number(data.badgeCount) || 1); } catch (_) {}
    }
  })());
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || DEFAULT_URL, self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if (new URL(client.url).origin === self.location.origin) {
        if ('navigate' in client) await client.navigate(target);
        return client.focus();
      }
    }
    return self.clients.openWindow(target);
  })());
});

