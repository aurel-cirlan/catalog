/*!
 * Catalog GEALAN - cautare rapida articole
 * Copyright (c) 2026 Aurel Cirlan - https://aurelcirlan.ro
 * Toate drepturile rezervate. Copierea, modificarea sau redistribuirea
 * acestui cod fara acordul scris al autorului este interzisa.
 */

// The shell (markup/code) is small and changes with every release, so it
// lives in its own versioned cache that gets replaced on update.
const SHELL_CACHE = "catalog-shell-e3a823f0";
// The catalog itself (page scans, article drawings, OCR assets) is large
// and does not change between releases, so it lives in a separate cache
// that survives shell updates. Bump this only if the dataset itself is
// rebuilt in an incompatible way (e.g. thumbnails renamed on a new
// catalog edition) and you want every phone to redownload it from scratch.
const DATA_CACHE = "catalog-data-v1";
const OFFLINE_FLAG = "./__offline-complete__";

const SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.webmanifest",
  "./data/index.json",
  "./data/old/index.json",
];

// Large, rarely-changing assets: downloaded once in the background and
// kept across shell updates so a new release never forces a re-download.
const STATIC_DATA_ASSETS = [
  "./cover.webp",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./tut/cod.gif",
  "./tut/denumire.gif",
  "./tut/categorii.gif",
  "./tut/lista.gif",
  "./tut/trimite.gif",
  "./vendor/tesseract/tesseract.min.js",
  "./vendor/tesseract/tesseract-core-lstm.wasm.js",
  "./vendor/tesseract/tesseract-core-simd-lstm.wasm.js",
  "./vendor/tesseract/worker.min.js",
  "./vendor/tessdata/eng.traineddata.gz",
];

// the shell changes with every release, the catalog assets never do
const FRESH = /\.(html|css|js|webmanifest|json)$/;
const IMMUTABLE = /\/(data|vendor|icons|tut)\//;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
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
          keys
            .filter((key) => key !== SHELL_CACHE && key !== DATA_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
  // Downloads the full catalog (every article drawing + page scan) in the
  // background, so the app works offline even for articles nobody opened
  // yet, not just the ones already browsed.
  event.waitUntil(precacheCatalog());
});

// A page asks for this on every boot (see app.js), in case the previous
// attempt was interrupted (app closed, connection dropped mid-download).
// Cheap to call repeatedly: once complete it's a single cache lookup.
self.addEventListener("message", (event) => {
  if (event.data === "ensure-offline") precacheCatalog();
});

async function catalogUrls(indexPath, prefix) {
  const urls = new Set();
  try {
    const response = await fetch(indexPath);
    const index = await response.json();
    // page numbers come from the article hits themselves, not pageCount:
    // data/old only ships the pages of archived articles, never the full
    // previous edition, so looping 1..pageCount would 404 on purpose-skipped
    // pages every single run.
    for (const article of index.articles || []) {
      for (const hit of article.hits || []) {
        if (hit.page) {
          urls.add(`${prefix}pages/${String(hit.page).padStart(3, "0")}.webp`);
        }
        if (hit.thumb) urls.add(`${prefix}thumbs/${hit.thumb}`);
      }
    }
  } catch (error) {
    // offline or first run before anything is reachable; try again later
  }
  return urls;
}

async function notifyProgress(done, total) {
  const clientsList = await self.clients.matchAll();
  for (const client of clientsList) {
    client.postMessage({ type: "offline-progress", done, total });
  }
}

async function cacheMissing(cache, urls) {
  const list = Array.from(urls);
  const total = list.length;
  let done = 0;
  let failures = 0;
  let cursor = 0;

  async function worker() {
    while (cursor < list.length) {
      const url = list[cursor++];
      if (!(await cache.match(url))) {
        try {
          const response = await fetch(url);
          if (response.ok) await cache.put(url, response);
          else failures++;
        } catch (error) {
          failures++;
        }
      }
      done++;
      if (done % 20 === 0 || done === total) notifyProgress(done, total);
    }
  }

  const workers = Array.from({ length: Math.min(6, list.length) }, worker);
  await Promise.all(workers);
  return failures;
}

async function precacheCatalog() {
  const cache = await caches.open(DATA_CACHE);
  if (await cache.match(OFFLINE_FLAG)) return;

  const [current, old] = await Promise.all([
    catalogUrls("./data/index.json", "./data/"),
    catalogUrls("./data/old/index.json", "./data/old/"),
  ]);
  // both index files failed: no network yet, nothing more to do right now
  if (current.size === 0 && old.size === 0) return;

  const urls = new Set([...STATIC_DATA_ASSETS, ...current, ...old]);
  const failures = await cacheMissing(cache, urls);
  if (failures === 0) await cache.put(OFFLINE_FLAG, new Response("ok"));
}

function store(cacheName, request, response) {
  if (response.ok && new URL(request.url).origin === location.origin) {
    const copy = response.clone();
    caches.open(cacheName).then((cache) => cache.put(request, copy));
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
          .then((response) => store(SHELL_CACHE, event.request, response))
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
                store(DATA_CACHE, event.request, response),
              ),
          ),
  );
});
