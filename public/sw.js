// AgriConnect Service Worker — offline-first PWA support.
// __BUILD_HASH__ and __PRECACHE_ASSETS__ are injected by scripts/build-sw.mjs
// at build time so each deploy versions its caches and precaches the exact
// hashed assets it ships.
const BUILD_HASH = '__BUILD_HASH__';
const STATIC_CACHE = 'static-' + BUILD_HASH;
const DYNAMIC_CACHE = 'dynamic-' + BUILD_HASH;

// Precache list injected at build time (index.html + every hashed asset)
const PRECACHE_ASSETS = __PRECACHE_ASSETS__;

// API patterns to cache with network-first strategy
const API_PATTERNS = [
  /\/api\//,
  /supabase\.co/,
];

// Image patterns to cache aggressively
const IMAGE_PATTERNS = [
  /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
  /images\.unsplash\.com/,
];

// Upper bound on dynamic cache entries so stale hashed assets from past
// deploys never grow the cache without limit.
const MAX_DYNAMIC_ENTRIES = 80;

// Install event - precache the app shell + all hashed build assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate event - drop caches from older builds, claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();
      const stale = (await caches.keys()).filter((key) => key !== STATIC_CACHE && key !== DYNAMIC_CACHE);
      if (stale.length === 0) return;
      // Open tabs may still be running the previous build and lazily request
      // its hashed chunks. Deleting those caches immediately would cause
      // offline 404s → chunk-load crashes. Only prune once no window remains.
      const windows = await self.clients.matchAll({ type: 'window' });
      if (windows.length === 0) {
        await Promise.all(stale.map((key) => caches.delete(key)));
      } else {
        setTimeout(async () => {
          const win = await self.clients.matchAll({ type: 'window' });
          if (win.length === 0) await Promise.all(stale.map((key) => caches.delete(key)));
        }, 30 * 60 * 1000);
      }
    })()
  );
});

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) return;

  // Handle API requests - network first, cache fallback
  if (API_PATTERNS.some((pattern) => pattern.test(request.url))) {
    // NEVER cache authenticated requests: the cache is keyed by URL only, so a
    // family member on a shared device could receive another user's private
    // data (offline / failure fallback). Bypass caching entirely.
    if (request.headers.get('Authorization')) {
      event.respondWith(fetch(request).catch(() => new Response(
        JSON.stringify({ error: 'Offline', cached: false }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      )));
      return;
    }
    event.respondWith(networkFirst(request));
    return;
  }

  // Handle images - cache first, network fallback
  if (IMAGE_PATTERNS.some((pattern) => pattern.test(request.url))) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Handle navigation requests - network first, cache success, offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(navigationFirst(request));
    return;
  }

  // Default: stale-while-revalidate for everything else
  event.respondWith(staleWhileRevalidate(request));
});

// Network first strategy
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      await putBounded(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;

    // Return offline response for API calls
    return new Response(
      JSON.stringify({ error: 'Offline', cached: true }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// Navigation strategy - always serve the freshest app shell, cache it so the
// next offline visit still renders, and fall back to the precached shell.
async function navigationFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      await putBounded(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    return caches.match('/index.html');
  }
}

// Cache first strategy
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    // Opaque (cross-origin, no-cors) image responses have status 0 — cache
    // them too so offline images actually resolve.
    if (response.ok || response.type === 'opaque') {
      await putBounded(request, response.clone());
    }
    return response;
  } catch (error) {
    // Return placeholder for images
    return new Response('', { status: 404 });
  }
}

// Stale-while-revalidate strategy
async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        putBounded(request, response.clone());
      }
      return response;
    })
    .catch(() => cached);

  return cached || fetchPromise;
}

// Add a response to the bounded dynamic cache, evicting the oldest entry when
// the cap is exceeded.
async function putBounded(request, response) {
  const cache = await caches.open(DYNAMIC_CACHE);
  await cache.put(request, response);
  const keys = await cache.keys();
  while (keys.length > MAX_DYNAMIC_ENTRIES) {
    const oldest = keys.shift();
    if (oldest) await cache.delete(oldest);
  }
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    event.waitUntil(syncData());
  }
});

async function syncData() {
  // Sync any pending offline actions when back online
  console.log('[SW] Syncing offline data...');
}

// Push notification support
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  const title = data.title || 'AgriConnect';
  const options = {
    body: data.body || 'New update available',
    icon: '/apple-touch-icon.png',
    badge: '/agriconnect-icon-64.png',
    vibrate: [100, 50, 100],
    data: { url: data.url || '/' },
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
