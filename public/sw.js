// Service Worker do Amazônia Pop — apenas Web Push e cliques.
// NÃO faz cache de app shell (não é PWA offline).
self.addEventListener("install", (e) => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (_) {}
  const title = data.title || "Amazônia Pop";
  const options = {
    body: data.body || "",
    icon: "/placeholder.svg",
    badge: "/placeholder.svg",
    tag: data.tag || "amazonia-pop",
    data: { url: data.url || "/" },
    renotify: true,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of all) {
      try {
        const u = new URL(client.url);
        if (u.origin === self.location.origin) {
          await client.focus();
          if ("navigate" in client) await client.navigate(url);
          return;
        }
      } catch (_) {}
    }
    await self.clients.openWindow(url);
  })());
});
