const CACHE = 'samara-erp-1.3.16-bills-charges-workflow';
const SHELL = [
  './', './index.html', './styles.css?v=1.3.16', './app.js?v=1.3.16',
  './bootstrap-error.js?v=1.3.16', './health-check.js?v=1.3.16',
  './config.js?v=1.3.16', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  const isCritical = /\/(index\.html|app\.js|styles\.css|config\.js|bootstrap-error\.js|health-check\.js)(\?|$)/.test(url.pathname + url.search);
  if (isCritical) {
    event.respondWith(fetch(event.request, {cache:'no-store'}).then(response => {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put(event.request, copy));
      return response;
    }).catch(() => caches.match(event.request)));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    const copy = response.clone();
    caches.open(CACHE).then(cache => cache.put(event.request, copy));
    return response;
  })));
});
