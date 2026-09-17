const CACHE = "gberp-v1";
const SHELL = ["/offline", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function baseUrl(scope) {
  const url = new URL(scope);
  return url.origin === self.location.origin ? url : null;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (baseUrl(request.referrer) || url.origin === self.location.origin) {
    if (request.mode === "navigate") {
      event.respondWith(
        fetch(request)
          .then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(request.url, copy));
            }
            return res;
          })
          .catch(async () => {
            const cached = await caches.match(request.url);
            if (cached) return cached;
            const shell = await caches.match("/offline");
            if (shell) return shell;
            return new Response("오프라인 상태입니다.", {
              status: 503,
              headers: { "Content-Type": "text/plain; charset=utf-8" },
            });
          })
      );
      return;
    }

    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            if (res.ok && url.pathname.startsWith("/icons/")) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(request, copy));
            }
            return res;
          })
      )
    );
  }
});

self.addEventListener("push", (event) => {
  let data = { title: "배차 알림", body: "", url: "/driver" };
  try {
    const raw = event.data ? event.data.json() : null;
    if (raw) data = { ...data, ...raw };
  } catch {
    if (event.data) {
      data.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration
      .showNotification(data.title, {
        body: data.body,
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        tag: data.tag || "dispatch",
        renotify: true,
        vibrate: [300, 100, 300],
        data: { url: data.url || "/driver" },
      })
      .catch(() => {})
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/driver";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    })
  );
});

self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "SHOW_NOTIFICATION") {
    event.waitUntil(
      self.registration.showNotification(data.title || "알림", {
        body: data.body || "",
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        tag: data.tag || new Date().toISOString(),
        vibrate: [200, 100, 200],
        data: { url: data.url || "/driver" },
      })
    );
  }
});