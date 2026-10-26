// Only public static assets are cached. Never cache API responses or teacher pages.
const CACHE = "prado-public-localdraft-v1";
const ASSETS = [
  "/",
  "/index.html",
  "/app.js",
  "/style.css",
  "/fonts.css",
  "/images/page1-1.jpeg",
  "/images/page1-2.jpeg",
  "/images/page2-1.jpeg",
  "/images/page2-2.jpeg",
  "/images/page3-1.jpeg",
];
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting()),
  );
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("prado-public-") && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (
    event.request.method !== "GET" ||
    url.origin !== self.location.origin ||
    !ASSETS.includes(url.pathname)
  )
    return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          event.waitUntil(
            caches.open(CACHE).then((cache) => cache.put(url.pathname, copy)),
          );
        }
        return response;
      })
      .catch(async () => {
        const response = await caches.match(url.pathname);
        return response || Response.error();
      }),
  );
});
