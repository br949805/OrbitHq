const CACHE = 'orbithq-v1';

const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/images/icon-192.png',
  '/images/icon-512.png',
  '/js/app.js',
  '/js/archive.js',
  '/js/config.js',
  '/js/contacts.js',
  '/js/editor.js',
  '/js/filestore.js',
  '/js/folders.js',
  '/js/followups.js',
  '/js/graph.js',
  '/js/inbox.js',
  '/js/modals.js',
  '/js/notebooks.js',
  '/js/notes.js',
  '/js/nudges.js',
  '/js/resize.js',
  '/js/search.js',
  '/js/shortcuts.js',
  '/js/state.js',
  '/js/tags.js',
  '/js/tasks.js',
  '/js/tour.js',
  '/js/utils.js',
  '/css/archive.css',
  '/css/base.css',
  '/css/contacts.css',
  '/css/editor.css',
  '/css/followups.css',
  '/css/font-scale.css',
  '/css/inbox.css',
  '/css/modals.css',
  '/css/notes.css',
  '/css/nudges.css',
  '/css/search.css',
  '/css/sidebar.css',
  '/css/tasks.css',
  '/css/theme-aurora.css',
  '/css/theme-carbon.css',
  '/css/theme-clean-dark.css',
  '/css/theme-clean.css',
  '/css/theme-vibrant.css',
  '/css/toast.css',
  '/css/topbar.css',
  '/css/tour.css',
  '/css/variables.css',
];

// On install: cache all assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// On activate: delete old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// On fetch: serve from cache, fall back to network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
