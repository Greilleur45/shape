// Cache de l'appli pour fonctionner hors ligne (au fond de la salle).
// Stale-while-revalidate : on sert le cache tout de suite et on met à jour en arrière-plan.
const CACHE = 'shape-v1';
const SHELL = ['./', 'index.html', 'css/style.css', 'js/app.js', 'js/program.js', 'js/store.js', 'js/sync.js',
  'js/charts.js', 'vendor/qrcode.js', 'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-180.png', 'icons/icon-192.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async c => {
    const key = url.pathname.endsWith('/') ? './' : e.request;
    const hit = await c.match(key, { ignoreSearch: true });
    const net = fetch(e.request).then(r => { if (r.ok) c.put(key, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  }));
});
