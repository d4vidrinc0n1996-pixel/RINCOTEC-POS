/**
 * Service worker de Patrones de Mostacillas: guarda la app para usarla sin
 * conexión. Al cambiar archivos de la app, sube VERSION para renovar la caché.
 */
const VERSION = 'mostacillas-v2';
const APP_SHELL = [
    './',
    'index.html',
    'manifest.webmanifest',
    'css/mostacillas.css?v=2',
    'js/beads-data.js?v=2',
    'js/color.js?v=2',
    'js/pattern.js?v=2',
    'js/render.js?v=2',
    'js/app.js?v=2',
    'icons/icon-192.png',
    'icons/icon-512.png',
    'icons/apple-touch-icon.png',
    'icons/favicon-32.png'
];

self.addEventListener('install', event => {
    event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys.filter(k => k.startsWith('mostacillas-') && k !== VERSION).map(k => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

// Responde desde la caché y la actualiza en segundo plano (también fuentes e íconos del CDN).
self.addEventListener('fetch', event => {
    const req = event.request;
    if (req.method !== 'GET' || !req.url.startsWith('http')) return;
    event.respondWith(caches.open(VERSION).then(async cache => {
        const cached = await cache.match(req, { ignoreSearch: req.mode === 'navigate' });
        const network = fetch(req).then(res => {
            if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
            return res;
        }).catch(() => cached);
        return cached || network;
    }));
});
