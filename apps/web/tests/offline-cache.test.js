import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

test('verified cache survives reinstall and serves fragment navigation without caching private URLs', async () => {
  const handlers = new Map();
  const scope = 'https://example.test/local/';
  const key = `djayvo-studio:${scope}:test-version`;
  const source = (await readFile(new URL('../../../scripts/service-worker.js', import.meta.url), 'utf8'))
    .replace('__JAMLOOM_ASSETS__', JSON.stringify({ 'index.html': { bytes: 6, sha256: 'unused-for-existing-cache' } }))
    .replace('__JAMLOOM_VERSION__', 'test-version');
  let requests = 0, deletions = 0;
  vm.runInNewContext(source, {
    self: { registration: { scope }, addEventListener: (name, handler) => handlers.set(name, handler) },
    caches: { keys: async () => [key], open: async name => {
      assert.equal(name, key);
      return { match: async url => { assert.equal(url, `${scope}index.html`); return new Response('public'); } };
    }, delete: async () => { deletions++; } },
    fetch: async () => { requests++; throw Error('Network disconnected'); },
    URL, Response, Headers, crypto, AbortController, AbortSignal, setTimeout, clearTimeout,
  });
  let installed;
  handlers.get('install')({ waitUntil: promise => { installed = promise; } });
  await installed;
  for (const url of [scope, `${scope}#mixes`, `${scope}index.html#mixes`]) {
    let response;
    handlers.get('fetch')({ request: new Request(url), respondWith: promise => { response = promise; } });
    assert.equal(await (await response).text(), 'public');
  }
  for (const url of [`${scope}index.html?private=1#mixes`, 'https://example.test/account#mixes',
    'https://example.test/api/library', 'https://other.test/studio/index.html#mixes']) {
    handlers.get('fetch')({ request: new Request(url), respondWith: () => assert.fail('Private request intercepted') });
  }
  handlers.get('fetch')({ request: new Request(`${scope}index.html`, { method: 'POST' }), respondWith: () => assert.fail('POST intercepted') });
  assert.equal(requests, 0);
  assert.equal(deletions, 0);
});


test('public studio keeps the demo available while Pro renewal and revocation stay enforced',async()=>{
 const handlers=new Map(),scope='https://example.test/studio/';
 let active=true,online=true,status=200,cached=new Response('deck');
 const source=(await readFile(new URL('../../../scripts/service-worker.js',import.meta.url),'utf8')).replace('__JAMLOOM_ASSETS__',JSON.stringify({'dj.html':{bytes:4,sha256:'unused'},'index.html':{bytes:6,sha256:'unused'}})).replace('__JAMLOOM_VERSION__','test-version');
 vm.runInNewContext(source,{self:{registration:{scope},addEventListener:(name,fn)=>handlers.set(name,fn)},caches:{open:async()=>({match:async()=>cached.clone(),put:async(_,r)=>{cached=r;}})},fetch:async url=>{assert.equal(url,'/api/pro/access');if(!online)throw Error('offline');return Response.json({active},{status});},URL,Response,Headers,AbortSignal,Date});
 const request=async path=>{let response;handlers.get('fetch')({request:new Request('https://example.test'+path),respondWith:p=>response=p});return response;};
 const access=async()=>(await(await request('/api/pro/access')).json()).active;
 assert.equal(await(await request('/studio/dj.html')).text(),'deck');assert.equal(await access(),true);
 online=false;assert.equal(await access(),true);assert.equal(await(await request('/studio/dj.html')).text(),'deck');
 cached=new Response('deck',{headers:{'X-Jamloom-Pro-Expires':'1'}});
 assert.equal(await access(),false);assert.equal((await request('/studio/dj.html')).status,200);
 online=true;assert.equal(await access(),true);assert.ok(Number(cached.headers.get('X-Jamloom-Pro-Expires'))>Date.now());
 active=false;assert.equal(await access(),false);assert.equal(cached.headers.has('X-Jamloom-Pro-Expires'),false);
 online=false;assert.equal(await access(),false);assert.equal((await request('/studio/dj.html')).status,200);
 online=true;active=true;assert.equal(await access(),true);status=401;assert.equal(await access(),false);online=false;assert.equal(await access(),false);
 handlers.get('fetch')({request:new Request(scope+'index.html'),respondWith:()=>assert.fail('Gated unrelated product HTML intercepted')});
});
