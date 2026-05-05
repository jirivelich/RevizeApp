// Service Worker pro RevizeApp – cache statických souborů a vybraných API odpovědí

const CACHE_VERSION = 'revizeapp-v2';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const API_CACHE = `${CACHE_VERSION}-api`;

// Statické soubory k cache-ování (přizpůsobte dle potřeby)
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/logo192.png',
  '/logo512.png',
  // Přidejte další statické soubory (např. CSS, JS, obrázky)
];

// API endpointy, které se mají cache-ovat (pouze GET)
const CACHED_API_ENDPOINTS = [
  '/api/revize',
  '/api/rozvadece',
  '/api/okruhy',
  '/api/chranice',
  '/api/mistnosti',
  '/api/zavady',
  '/api/zarizeni',
  '/api/firmy',
  '/api/zakaznici',
  '/api/pristroje',
  '/api/predvolene-texty',
  '/api/zavady-katalog',
];

// Instalace SW – cache statických assetů
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Aktivace SW – mazání starých cache
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => ![STATIC_CACHE, API_CACHE].includes(key))
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Helper: zjistí, zda je URL API endpoint, který chceme cache-ovat
function isCachedApiRequest(request) {
  if (request.method !== 'GET') return false;
  try {
    const url = new URL(request.url);
    return (
      url.origin === self.location.origin &&
      CACHED_API_ENDPOINTS.some(endpoint => url.pathname.startsWith(endpoint))
    );
  } catch {
    return false;
  }
}

// Fetch event – cache first pro statické, network first pro API
self.addEventListener('fetch', event => {
  const { request } = event;

  // Statické assety – cache first
  if (
    request.method === 'GET' &&
    STATIC_ASSETS.some(asset => request.url.endsWith(asset))
  ) {
    event.respondWith(
      caches.match(request).then(
        cached =>
          cached ||
          fetch(request).then(response => {
            // Uložíme do cache pro příště
            return caches.open(STATIC_CACHE).then(cache => {
              cache.put(request, response.clone());
              return response;
            });
          })
      )
    );
    return;
  }

  // API GET – network first, fallback na cache
  if (isCachedApiRequest(request)) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Uložíme do cache
          const respClone = response.clone();
          caches.open(API_CACHE).then(cache => cache.put(request, respClone));
          return response;
        })
        .catch(() =>
          caches.match(request).then(
            cached =>
              cached ||
              new Response(
                JSON.stringify({ error: 'Offline a data nejsou v cache.' }),
                { status: 503, headers: { 'Content-Type': 'application/json' } }
              )
          )
        )
    );
    return;
  }

  // API write operations – po úspěchu invaliduj odpovídající GET cache
  if (
    ['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method) &&
    (() => {
      try {
        const url = new URL(request.url);
        return (
          url.origin === self.location.origin &&
          CACHED_API_ENDPOINTS.some(ep => url.pathname.startsWith(ep))
        );
      } catch { return false; }
    })()
  ) {
    event.respondWith(
      fetch(request).then(response => {
        if (response.ok) {
          try {
            const url = new URL(request.url);
            const matchingEndpoint = CACHED_API_ENDPOINTS.find(ep => url.pathname.startsWith(ep));
            if (matchingEndpoint) {
              caches.open(API_CACHE).then(async cache => {
                const keys = await cache.keys();
                for (const key of keys) {
                  try {
                    const keyUrl = new URL(key.url);
                    if (keyUrl.pathname.startsWith(matchingEndpoint)) {
                      await cache.delete(key);
                    }
                  } catch { /* ignoruj nevalidní URL */ }
                }
              });
            }
          } catch { /* ignoruj chyby při invalidaci */ }
        }
        return response;
      })
    );
    return;
  }

  // Ostatní požadavky – default (přeposlat dál)
  // (lze rozšířit dle potřeby)
});
