/* Battery HUB admin app service worker: shows new-order notifications and opens the admin when one is tapped. */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : '' };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Battery HUB', {
      body: data.body || '',
      icon: '/admin-app/icon-192.png',
      tag: data.tag,
      renotify: Boolean(data.tag),
      vibrate: [200, 100, 200],
      data: { url: data.url || '/admin/orders' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || '/admin/orders', self.location.origin).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const open = windows.find((w) => new URL(w.url).pathname.startsWith('/admin'));
      if (open) {
        await open.focus();
        return open.navigate(url).catch(() => undefined);
      }
      return self.clients.openWindow(url);
    })(),
  );
});
