const CACHE_PREFIX = `english-review-${BASE}-`;
const SHELL_CACHE = `${CACHE_PREFIX}shell-${VERSION}`;
// Keep vocabulary separate so replacing cards.json needs no app rebuild.
const DATA_CACHE = `${CACHE_PREFIX}data-v1`;
const DATA_URL = `${BASE}data/cards.json`;
async function freshCards() {
  const response = await fetch(DATA_URL, { cache: 'no-store', signal: AbortSignal.timeout(6000) });
  if (!response.ok || !isCardList(await response.clone().json())) throw new Error('Invalid vocabulary');
  const cache = await caches.open(DATA_CACHE);
  await cache.put(DATA_URL, response.clone());
  return response;
}
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    await cache.addAll(SHELL);
    await freshCards();
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith(`${CACHE_PREFIX}shell-`) && key !== SHELL_CACHE) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || !url.pathname.startsWith(BASE)) return;
  if (url.pathname === DATA_URL) {
    event.respondWith((async () => {
      try { return await freshCards(); }
      catch {
        return await (await caches.open(DATA_CACHE)).match(DATA_URL) || new Response('Vocabulary unavailable', { status: 503 });
      }
    })());
    return;
  }
  // The shell and its hashed assets are upgraded atomically by a new worker.
  if (event.request.mode === 'navigate') {
    event.respondWith(caches.open(SHELL_CACHE).then(async cache => await cache.match(`${BASE}index.html`) || fetch(event.request)));
  } else {
    // Static same-origin assets never vary by Origin. Precache requests and
    // module requests may have different Origin headers (e.g. Vite preview).
    event.respondWith(caches.open(SHELL_CACHE).then(async cache => await cache.match(event.request, { ignoreVary: true }) || fetch(event.request)));
  }
});
