/* Life OS offline cache.
   The app page (index.html) is network-first, so a new upload shows on the next open when online;
   the cached copy is used only offline. Icons / Tailwind are cache-first. */
const CACHE = 'lifeos-v4-4';
const SHELL = ['./', './index.html', './manifest.json', './apple-touch-icon.png', './icon-192.png', './icon-512.png', './icon-32.png',
  'https://cdn.tailwindcss.com/3.4.17'];

self.addEventListener('install', e => {
  // cache:'reload' skips the browser's HTTP cache, so we never store an old copy
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(SHELL.map(u =>
    c.add(new Request(u, u.startsWith('http') ? { mode: 'no-cors' } : { cache: 'reload' })).catch(() => {})))));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.hostname.endsWith('script.google.com') || url.hostname.endsWith('googleusercontent.com')) return;
  const isPage = req.mode === 'navigate' || (url.origin === location.origin && /\/(index\.html)?$/.test(url.pathname));
  if (isPage) {
    e.respondWith(
      fetch(req.url.split('?')[0], { cache: 'no-store' }).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put('./index.html', copy)); }
        return res;
      }).catch(() => caches.match('./index.html').then(hit => hit || caches.match('./')))
    );
    return;
  }
  e.respondWith(
    caches.match(req, { ignoreSearch: url.origin === location.origin }).then(hit => {
      const net = fetch(req).then(res => {
        if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
