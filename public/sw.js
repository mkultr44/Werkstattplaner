self.addEventListener("install", e => {
  e.waitUntil(
    caches.open("werkstatt-cache").then(cache => {
      return cache.addAll(["/", "/index.html", "/app.js", "/styles.css"]);
    })
  );
});

self.addEventListener("fetch", e => {
  e.respondWith(
    caches.match(e.request).then(response => response || fetch(e.request))
  );
});
