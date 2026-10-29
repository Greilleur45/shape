// Cache de l'appli pour fonctionner hors ligne (au fond de la salle).
// Code de l'appli : réseau d'abord (toujours la dernière version), cache si pas de réseau ou réseau trop lent.
// Photos d'exercices : cache d'abord (elles ne changent pas).
const CACHE = 'shape-v7';
const IMG_CACHE = 'shape-img-v1';
const SHELL = ['./', 'index.html', 'css/style.css', 'js/app.js', 'js/program.js', 'js/store.js', 'js/sync.js',
  'js/charts.js', 'js/guide.js', 'vendor/qrcode.js', 'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-180.png', 'icons/icon-192.png'];

self.addEventListener('install', e => {
  // cache: 'reload' contourne le cache HTTP du navigateur (GitHub Pages garde les fichiers 10 min)
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== IMG_CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

function timeout(ms) { return new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms)); }

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;

  if (url.pathname.includes('/img/ex/')) {
    e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(r => {
      if (r.ok) { const copy = r.clone(); caches.open(IMG_CACHE).then(c => c.put(e.request, copy)); }
      return r;
    })));
    return;
  }

  const key = url.pathname.endsWith('/') ? './' : e.request;
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    try {
      const r = await Promise.race([fetch(url.href, { cache: 'no-cache' }), timeout(3500)]);
      if (r.ok) c.put(key, r.clone());
      return r;
    } catch {
      return (await caches.match(key, { ignoreSearch: true })) || Response.error();
    }
  })());
});
