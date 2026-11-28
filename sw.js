/* Service Worker de socialinv: funciona sin conexión y reenvía la cola de mensajes. */
const VERSION = 'socialinv-v1.1.2';
const SHELL = [
  './', './index.html', './styles.css', './manifest.json',
  './source/css/social.css', './source/css/polish.css', './source/css/Generales.css',
  './source/fonts/Paloseco-Medium.ttf',
  './source/imgs/user-default.png', './source/imgs/post-default.png', './source/imgs/post-default2.png',
  './source/imgs/icon-192.png', './source/imgs/icon-512.png',
  './source/js/lib/colorthief-lite.js', './source/js/lib/svcolor.js', './source/css/design.css', './source/css/redesign.css', './source/css/neutral.css', './source/vid/reel-aurora.mp4', './source/vid/reel-marea.mp4', './source/vid/reel-brasa.mp4', './source/vid/reel-neon.mp4',
  './source/js/01-navegacion.js', './source/js/02-datos-tema-ajustes.js', './source/js/03-persistencia-offline.js',
  './source/js/04-perfil.js', './source/js/05-buscador-historias.js', './source/js/06-opciones-comentarios.js',
  './source/js/07-mensajeria.js', './source/js/08-compartir-compositor.js', './source/js/09-home-feed-quickpeek.js',
  './source/js/10-social.js', './source/js/11-aura.js', './source/js/12-extras.js', './source/js/13-ambient.js', './source/js/16-redesign.js', './source/js/14-persistencia.js', './source/js/15-home.js', './source/js/17-neutral.js', './source/js/config.js', './source/js/lib/backend.js', './source/js/18-auth.js', './source/js/19-sync-perfil.js', './source/js/20-sync-feed.js', './source/js/21-sync-relaciones.js', './source/js/lib/sync-util.js', './source/js/22-sync-notificaciones.js', './source/js/23-sync-comentarios.js', './source/js/24-sync-historias.js', './source/js/25-sync-busqueda-cuenta.js', './source/js/26-sync-mensajes.js', './source/js/27-sync-listas.js', './source/js/28-sync-reels.js', './source/js/29-comunidades.js', './terminos.html', './privacidad.html'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION)
      // allSettled-like: un archivo faltante no debe impedir la instalación
      .then((c) => Promise.all(SHELL.map((u) => c.add(u).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || !/^https?:/.test(req.url)) return;
  const sameOrigin = new URL(req.url).origin === self.location.origin;
  if (req.headers.has('range')) return; // el streaming de video lo maneja el navegador
  if (sameOrigin) {
    // Red primero para el HTML (siempre fresco si hay conexión), caché primero para el resto
    if (req.mode === 'navigate') {
      e.respondWith(fetch(req).then((r) => { const c = r.clone(); caches.open(VERSION).then((x) => x.put('./index.html', c)); return r; })
        .catch(() => caches.match('./index.html')));
      return;
    }
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((r) => {
      if (r.ok) { const c = r.clone(); caches.open(VERSION).then((x) => x.put(req, c)); }
      return r;
    })));
  } else if (req.destination === 'image') {
    // Imágenes remotas: se guardan al verlas y quedan disponibles sin conexión
    e.respondWith(caches.match(req).then((hit) => {
      const net = fetch(req).then((r) => { if (r.ok || r.type === 'opaque') { const c = r.clone(); caches.open(VERSION).then((x) => x.put(req, c)); } return r; })
        .catch(() => hit);
      return hit || net;
    }));
  }
});

// Background Sync: avisa a las pestañas abiertas para que reenvíen los mensajes pendientes
self.addEventListener('sync', (e) => {
  if (e.tag === 'sync-pending-messages') {
    e.waitUntil(self.clients.matchAll({ includeUncontrolled: true }).then((cs) =>
      cs.forEach((c) => c.postMessage({ type: 'retry-pending' }))));
  }
});
