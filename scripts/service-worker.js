// Generated with a complete, content-hashed public bundle. Never cache runtime requests.
const ASSETS = __DJAYVO_ASSETS__;
const PREFIX = `djayvo-studio:${self.registration.scope}:`;
const CACHE = PREFIX + '__DJAYVO_VERSION__';
const assets = new Map(Object.entries(ASSETS).map(([name, details]) => [new URL(name, self.registration.scope).href, details]));

async function verifiedResponse(url, signal) {
  const expected = assets.get(url);
  const response = await fetch(url, { cache: 'no-store', credentials: 'omit', redirect: 'error', signal });
  if (!response.ok) throw new Error('Offline download failed');
  const reader = response.body.getReader(), chunks = [];
  let length = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > expected.bytes) { await reader.cancel(); throw new Error('Offline asset size mismatch'); }
    chunks.push(value);
  }
  if (length !== expected.bytes) throw new Error('Incomplete offline asset');
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), n => n.toString(16).padStart(2, '0')).join('');
  if (hash !== expected.sha256) throw new Error('Offline asset integrity mismatch');
  const headers = new Headers(response.headers);
  headers.delete('content-encoding'); headers.set('content-length', String(length));
  return new Response(bytes, { headers });
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);
    let created = false;
    try {
      const existing = (await caches.keys()).filter(key => key.startsWith(PREFIX));
      if (existing.includes(CACHE)) {
        const cache = await caches.open(CACHE);
        if ((await Promise.all([...assets.keys()].map(url => cache.match(url)))).every(Boolean)) return;
      }
      // Keep at most the active and waiting build while a studio tab remains open.
      if (existing.length >= 2 && !existing.includes(CACHE)) throw new Error('Close studio tabs to finish the pending update');
      created = true;
      const cache = await caches.open(CACHE);
      for (const url of assets.keys()) await cache.put(url, await verifiedResponse(url, controller.signal));
    } catch (error) { if (created) await caches.delete(CACHE); throw error; }
    finally { clearTimeout(timeout); }
  })());
});

self.addEventListener('activate', event => {
  // Default waiting protects open recordings/renders; never force activation or claim clients.
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key)))));
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.search) return;
  url.hash = '';
  const key = url.href === self.registration.scope ? new URL('index.html', self.registration.scope).href : url.href;
  if (!assets.has(key)) return;
  event.respondWith((async () => {
    const cached = await (await caches.open(CACHE)).match(key);
    if (cached) return cached;
    // Eviction/removal cannot mix a newer engine with an older open page.
    try { return await verifiedResponse(key, AbortSignal.timeout(15000)); }
    catch { return new Response('Studio files are unavailable. Reopen Djayvo online.', { status: 503, headers: { 'Content-Type': 'text/plain' } }); }
  })());
});
