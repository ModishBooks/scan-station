// Minimal service worker — only here so browsers treat this page as an installable PWA.
// It caches the static shell (page, icons, manifest) so the app opens instantly, but
// deliberately does NOT touch requests to your Google Apps Script URL — every scan
// still goes straight to your live Sheet, never a cached/stale response.
var CACHE = 'scan-station-v1';
var SHELL = ['./index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }));
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
  // Only handle same-origin GET requests for the shell files above — everything else
  // (in particular, the Apps Script API calls) goes straight to the network as normal.
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  e.respondWith(
    caches.match(e.request).then(function (cached) {
      return cached || fetch(e.request);
    })
  );
});
