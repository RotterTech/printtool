// Empty service worker — forces unregistration of old cached versions
// This file exists only so browsers that still reference sw.js get a clean version

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.map((name) => caches.delete(name)))
    )
  );
  self.clients.claim();
});

// No fetch handler — all requests go to network
