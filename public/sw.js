/*!
 * Catalog GEALAN - cautare rapida articole
 * Copyright (c) 2026 Aurel Cirlan - https://aurelcirlan.ro
 * Toate drepturile rezervate. Copierea, modificarea sau redistribuirea
 * acestui cod fara acordul scris al autorului este interzisa.
 */
const CACHE = "catalog-v27";
const SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./cover.webp",
  "./app.js",
  "./manifest.webmanifest",
  "./data/index.json",
  "./data/old/index.json",
];

// the shell changes with every release, the catalog assets never do
const FRESH = /\.(html|css|js|webmanifest|json)$/;
const IMMUTABLE = /\/(data|vendor|icons)\//;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function store(request, response) {
  if (response.ok && new URL(request.url).origin === location.origin) {
    const copy = response.clone();
    caches.open(CACHE).then((cache) => cache.put(request, copy));
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const path = new URL(event.request.url).pathname;
  // a shared list arrives as ?lista=..., so the page itself is matched without the query
  const navigating = event.request.mode === "navigate";
  const fresh = navigating || (FRESH.test(path) && !IMMUTABLE.test(path));
  event.respondWith(
    fresh
      ? fetch(event.request)
          .then((response) => store(event.request, response))
          .catch(() =>
            caches
              .match(event.request, { ignoreSearch: navigating })
              .then((hit) => hit || Response.error()),
          )
      : caches
          .match(event.request)
          .then(
            (hit) =>
              hit ||
              fetch(event.request).then((response) =>
                store(event.request, response),
              ),
          ),
  );
});
