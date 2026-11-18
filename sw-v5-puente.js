// La Plataforma — service worker v5 (acto «Puente Súper ↔ La Plataforma», INF-63).
// Es el v4 ÍNTEGRO (el motor que mantiene la app viva con lo guardado en el
// iPhone cuando el repositorio queda vacío) MÁS los manejadores de
// notificaciones push del puente. En el ciclo de alojamiento sustituye a
// sw.js junto con el index.html de la v68; no se sube solo.
const CACHE = 'la-plataforma-v5';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png'];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const isDoc = req.mode === 'navigate' || req.url.endsWith('/index.html') || req.url.endsWith('/');
  if (isDoc) {
    e.respondWith(fetch(req).then((res) => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put('./index.html', copy));
        return res;
      }
      return caches.match('./index.html').then((hit) => hit || res);
    }).catch(() => caches.match('./index.html')));
    return;
  }
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
    if (res.ok) {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy));
    }
    return res;
  })));
});
// --- Puente: notificaciones push (la carga es genérica, sin contenido) ---
self.addEventListener('push', (e) => {
  let titulo = 'Súper';
  let cuerpo = 'Súper te ha escrito en La Plataforma';
  try {
    if (e.data) {
      const datos = e.data.json();
      if (datos && typeof datos.title === 'string' && datos.title) titulo = datos.title;
      if (datos && typeof datos.body === 'string' && datos.body) cuerpo = datos.body;
    }
  } catch (err) { /* carga ilegible: se usan los textos genéricos */ }
  e.waitUntil(self.registration.showNotification(titulo, {
    body: cuerpo,
    icon: './icon-192.png',
    badge: './icon-192.png',
    data: { destino: 'chat-super' }
  }));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((lista) => {
    for (const cliente of lista) {
      if ('focus' in cliente) {
        cliente.postMessage({ tipo: 'abrir-chat-super' });
        return cliente.focus();
      }
    }
    if (self.clients.openWindow) return self.clients.openWindow('./index.html#chat-super');
  }));
});
