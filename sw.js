const CACHE = "dice-thrower-v2";
const ASSETS = [
  "./",
  "index.html",
  "style.css",
  "manifest.webmanifest",
  "icon-192.png",
  "icon-512.png",
  "src/presentation/main.js",
  "src/domain/math3.js",
  "src/domain/solids.js",
  "src/domain/dice.js",
  "src/application/ports.js",
  "src/application/rollDice.js",
  "src/infrastructure/randomSource.js",
  "src/infrastructure/geometry.js",
  "src/infrastructure/canvasRenderer.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || !event.request.url.startsWith(self.location.origin)) return;

  // Navigations: network-first so new deploys show up immediately, cache as
  // the offline fallback.
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        return response;
      }).catch(() => caches.match(event.request).then((cached) => cached || caches.match("index.html")))
    );
    return;
  }

  // Assets: serve from cache, but refresh the cache in the background
  // (stale-while-revalidate) so updates propagate on the next visit.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        }
        return response;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
