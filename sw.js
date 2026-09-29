// Minimal service worker — only here so browsers treat this page as an installable PWA.
// It deliberately does NOT touch requests to your Google Apps Script URL — every scan
// still goes straight to your live Sheet, never a cached/stale response.
//
// index.html (and this file) change often as the app gets updated, so those always
// go to the NETWORK first — you'll see edits the moment you reload, with the last-seen
// copy used only as a fallback if you're offline. Only the icons/manifest (which never
// change) are served cache-first, since re-fetching them on every load is pointless.
var CACHE = 'scan-station-v2';
var STATIC_SHELL = ['./manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(STATIC_SHELL); }));
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function (e) {
  var url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;

  var isHtml = e.request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('/');

  if (isHtml) {
    // Network-first: always try to get the latest page; only fall back to a cached
    // copy (kept in a runtime cache below) if there's no internet right now.
    e.respondWith(
      fetch(e.request).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        return res;
      }).catch(function () {
        return caches.match(e.request);
      })
    );
    return;
  }

  // Static assets (icons, manifest): cache-first, they don't change.
  e.respondWith(
    caches.match(e.request).then(function (cached) {
      return cached || fetch(e.request);
    })
  );
});
