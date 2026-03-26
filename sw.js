const CACHE = 'fitcoach-v1.6.1';
const ASSETS = [
  '/',
  '/index.html',
  'https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.23.2/babel.min.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js',
];

self.addEventListener('install', e => {
  // Forceer direct activeren — geen wachten op oude tabs
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(cache =>
      Promise.allSettled(ASSETS.map(url => cache.add(url).catch(() => {})))
    )
  );
});

self.addEventListener('activate', e => {
  // Verwijder ALLE oude caches
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => {
        console.log('Deleting old cache:', k);
        return caches.delete(k);
      }))
    ).then(() => self.clients.claim()) // Neem direct controle over alle tabs
  );
});

self.addEventListener('fetch', e => {
  // Supabase, AI en externe API calls altijd via netwerk
  if (e.request.url.includes('supabase.co') ||
      e.request.url.includes('workers.dev') ||
      e.request.url.includes('anthropic') ||
      e.request.url.includes('postimg.cc') ||
      e.request.url.includes('unsplash.com')) {
    return;
  }

  e.respondWith(
    fetch(e.request).then(response => {
      // Sla verse versie op in cache
      if (response.ok && e.request.method === 'GET') {
        const clone = response.clone();
        caches.open(CACHE).then(cache => cache.put(e.request, clone));
      }
      return response;
    }).catch(() => {
      // Offline: gebruik cache
      return caches.match(e.request).then(cached => {
        if (cached) return cached;
        if (e.request.destination === 'document') {
          return caches.match('/index.html') || caches.match('/');
        }
      });
    })
  );
});
