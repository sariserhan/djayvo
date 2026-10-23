// Keep the cache identity so the normal waiting/activation lifecycle replaces old builds.
// Generated with a complete, content-hashed public bundle. Never cache runtime requests.
const ASSETS = __JAMLOOM_ASSETS__;
const PREFIX = `djayvo-studio:${self.registration.scope}:`;
const CACHE = PREFIX + '__JAMLOOM_VERSION__';
const hostedPro = new URL(self.registration.scope).pathname === '/studio/';
const assets = new Map(Object.entries(ASSETS).filter(([name]) => !hostedPro || !name.endsWith('.html') || name === 'dj.html').map(([name, details]) => [new URL(name, self.registration.scope).href, details]));

async function verifiedResponse(url, signal) {
  const expected = assets.get(url);
  const response = await fetch(url, { cache: 'no-store', credentials: 'same-origin', redirect: 'error', signal });
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

async function studioAccess(cached, key) {
  try {
    const response = await fetch('/api/pro/access', {cache:'no-store', credentials:'same-origin', signal:AbortSignal.timeout(5000)});
    let active = false;
    if (response.ok) active = (await response.json()).active === true;
    else if (![401,403].includes(response.status)) throw Error('Access check unavailable');
    if (cached) {
      const headers = new Headers(cached.headers);
      if (active) headers.set('X-Jamloom-Pro-Expires', String(Date.now() + 30 * 86400000));
      else headers.delete('X-Jamloom-Pro-Expires');
      await (await caches.open(CACHE)).put(key, new Response(await cached.clone().arrayBuffer(), {headers}));
    }
    return active;
  } catch {
    return !!cached && Number(cached.headers.get('X-Jamloom-Pro-Expires')) > Date.now();
  }
}

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.search) return;
  if (hostedPro && url.origin === new URL(self.registration.scope).origin && url.pathname === '/api/pro/access') {
    event.respondWith((async () => {
      const key = new URL('dj.html', self.registration.scope).href;
      const cached = await (await caches.open(CACHE)).match(key);
      return Response.json({active: await studioAccess(cached, key)}, {headers:{'Cache-Control':'private, no-store'}});
    })());
    return;
  }
  url.hash = '';
  const key = url.href === self.registration.scope ? new URL('index.html', self.registration.scope).href : url.href;
  if (!assets.has(key)) return;
  event.respondWith((async () => {
    const cached = await (await caches.open(CACHE)).match(key);
    if (hostedPro && url.pathname === '/studio/dj.html') {
      await studioAccess(cached, key);
      if (cached) return (await (await caches.open(CACHE)).match(key)) ?? cached;
    }
    if (cached) return cached;
    // Eviction/removal cannot mix a newer engine with an older open page.
    try { return await verifiedResponse(key, AbortSignal.timeout(15000)); }
    catch { return new Response('Studio files are unavailable. Reopen Jamloom online.', { status: 503, headers: { 'Content-Type': 'text/plain' } }); }
  })());
});
