/* Run from the project root: node --test tests/pwa.test.cjs */
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const core = require('./core.js');
const Papa = require('./papaparse.min.js');
const csv = 'Title,Semester,Type,Subject,Link,Email\nAlgebra,Sem 1,Notes, Mathematics ,https://drive.google.com/file/d/example/view,private@example.test\n';
const parsed = () => Papa.parse(csv, { header: true, skipEmptyLines: 'greedy' });

test('catalogue normalizes semester and only retains public fields', () => {
  const [row] = core.catalogue(parsed());
  assert.equal(row.semester, '1'); assert.equal(row.subject, 'Mathematics');
  assert.equal(Object.hasOwn(row, 'Email'), false);
  assert.deepEqual(Object.keys(row).sort(), ['id','link','semester','subject','title','type']);
});
test('script URLs and malformed relative links cannot become resource links', () => {
  for (const link of ['javascript:alert(1)', 'data:text/html,hello', 'not-a-url', 'https://user:password@example.test']) assert.equal(core.safeLink(link), '');
});
test('invalid CSV cannot overwrite the last successful catalogue', () => {
  assert.throws(() => core.catalogue(Papa.parse('<html>Unavailable</html>', { header: true })));
  assert.throws(() => core.catalogue({ ...parsed(), errors: [{ type: 'FieldMismatch' }] }));
});
test('corrupt saved preferences fall back safely', () => {
  assert.deepEqual(core.preferences('{bad'), { semester: 'All', type: 'All', subject: 'All' });
  assert.equal(core.preferences('{"semester":"99"}').semester, 'All');
  assert.equal(core.preferences('{"semester":4}').semester, '4');
});
function appHarness({ online = true, saved, network, writeFails = false } = {}) {
  let options, fetches = 0, written;
  const context = {
    Vue: { createApp(value) { options = value; return { mount() {} }; } },
    navigator: { onLine: online }, LibraryCore: core, Papa,
    LibraryPWA: { state: {} }, localStorage: { getItem: () => null, setItem() {} },
    LibraryStorage: { read: async () => saved, write: async value => { if (writeFails) throw Error('quota'); written = value; } },
    LIBRARY_CONFIG: { catalogueUrl: 'https://example.test/catalogue.csv' },
    fetch: async () => { fetches++; return network ? network() : new Response(csv); },
    AbortController, setTimeout, clearTimeout, URL, console, window: {}
  };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'app.js'), 'utf8'), context);
  const app = options.data();
  for (const [name, method] of Object.entries(options.methods)) app[name] = method.bind(app);
  return { app, get fetches() { return fetches; }, get written() { return written; } };
}
const saved = () => ({ schema: 1, updatedAt: 1234, resources: core.catalogue(parsed()) });
test('offline startup restores the catalogue without a network request', async () => {
  const h = appHarness({ online: false, saved: saved() });
  await h.app.loadSavedCatalogue(); await h.app.fetchData();
  assert.equal(h.fetches, 0); assert.equal(h.app.resources.length, 1);
  assert.equal(h.app.loading, false); assert.equal(h.app.cacheSaved, true);
});
test('first offline visit stops loading and shows no invented catalogue', async () => {
  const h = appHarness({ online: false });
  await h.app.loadSavedCatalogue(); await h.app.fetchData();
  assert.equal(h.app.catalogueAvailable, false); assert.equal(h.app.loading, false);
});
test('successful refresh saves a validated catalogue', async () => {
  const h = appHarness(); await h.app.fetchData();
  assert.equal(h.written.resources.length, 1); assert.equal(h.app.cacheSaved, true);
  assert.equal(h.app.refreshing, false); assert.equal(h.app.loadError, '');
});
test('network failure keeps the previous offline catalogue', async () => {
  const h = appHarness({ saved: saved(), network: async () => { throw Error('offline'); } });
  await h.app.loadSavedCatalogue(); await h.app.fetchData();
  assert.equal(h.app.resources[0].title, 'Algebra'); assert.equal(h.app.lastUpdated, 1234);
  assert.match(h.app.loadError, /previous catalogue/); assert.equal(h.written, undefined);
});
test('HTTP error and HTML error pages do not replace a saved catalogue', async () => {
  for (const response of [new Response('Unavailable', { status: 503 }), new Response('<html>sign in</html>')]) {
    const h = appHarness({ saved: saved(), network: async () => response });
    await h.app.loadSavedCatalogue(); await h.app.fetchData();
    assert.equal(h.app.lastUpdated, 1234); assert.equal(h.written, undefined);
  }
});
test('storage failure still permits online browsing and does not claim offline saving', async () => {
  const h = appHarness({ writeFails: true }); await h.app.fetchData();
  assert.equal(h.app.resources.length, 1); assert.equal(h.app.cacheSaved, false);
  assert.match(h.app.storageWarning, /could not be saved/);
});
test('offline contribution is not sent or queued', async () => {
  const h = appHarness({ online: false });
  h.app.newEntry.link = 'https://drive.google.com/file/d/example/view';
  await h.app.submitForm();
  assert.equal(h.fetches, 0); assert.match(h.app.formError, /Reconnect/);
});

function workerHarness(failPath) {
  const handlers = {}, stores = new Map();
  let skips = 0, claims = 0, network = 0;
  const origin = 'https://example.test/';
  const caches = {
    async keys() { return [...stores.keys()]; },
    async delete(key) { return stores.delete(key); },
    async open(key) {
      if (!stores.has(key)) stores.set(key, new Map());
      const store = stores.get(key);
      return {
        async addAll(requests) {
          const entries = requests.map(request => {
            const url = new URL(request.url), file = path.join(root, decodeURIComponent(url.pathname));
            if (url.pathname === failPath) throw Error('asset unavailable');
            return [url.href, new Response(fs.readFileSync(file))];
          });
          for (const [url, response] of entries) store.set(url, response);
        },
        async match(key) { const response = store.get(typeof key === 'string' ? key : key.url); return response && response.clone(); }
      };
    }
  };
  const self = {
    registration: { scope: origin }, addEventListener: (name, fn) => { handlers[name] = fn; },
    skipWaiting: async () => { skips++; }, clients: { claim: async () => { claims++; } }
  };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'sw.js'), 'utf8'), {
    self, caches, Request, Response, URL, Set, Promise,
    fetch: async () => { network++; throw Error('offline'); }
  });
  return {
    stores, get skips() { return skips; }, get claims() { return claims; }, get network() { return network; },
    async dispatch(name, fields = {}) {
      let task; handlers[name]({ ...fields, waitUntil(p) { task = p; }, respondWith(p) { task = p; } });
      return task === undefined ? undefined : await task;
    }
  };
}
test('worker precaches all required files without forcing an update', async () => {
  const h = workerHarness(); await h.dispatch('install');
  assert.equal(h.skips, 0); assert.ok([...h.stores.values()][0].size >= 20);
});
test('offline navigation and app scripts are served entirely from the shell cache', async () => {
  const h = workerHarness(); await h.dispatch('install');
  const page = await h.dispatch('fetch', { request: { method: 'GET', mode: 'navigate', url: 'https://example.test/?source=homescreen' } });
  assert.match(await page.text(), /Abhimanyu Learning Space/);
  const script = await h.dispatch('fetch', { request: { method: 'GET', mode: 'cors', url: 'https://example.test/app.js' } });
  assert.match(await script.text(), /createApp/); assert.equal(h.network, 0);
});
test('Google Drive, catalogue, POST and document navigations bypass the worker cache', async () => {
  const h = workerHarness();
  for (const request of [
    { method: 'GET', mode: 'cors', url: 'https://docs.google.com/spreadsheets/export' },
    { method: 'GET', mode: 'navigate', url: 'https://drive.google.com/file/d/example/view' },
    { method: 'POST', mode: 'cors', url: 'https://example.test/submit' },
    { method: 'GET', mode: 'navigate', url: 'https://example.test/book.pdf' }
  ]) assert.equal(await h.dispatch('fetch', { request }), undefined);
});
test('a missing required asset rejects worker installation', async () => {
  const h = workerHarness('/app.js');
  await assert.rejects(h.dispatch('install'), /asset unavailable/); assert.equal(h.skips, 0);
});
test('only an explicit update message asks the waiting worker to activate', async () => {
  const h = workerHarness();
  await h.dispatch('message', { data: { type: 'UNKNOWN' } }); assert.equal(h.skips, 0);
  await h.dispatch('message', { data: { type: 'SKIP_WAITING' } }); assert.equal(h.skips, 1);
});
test('activation cleans old app shells while retaining unrelated caches', async () => {
  const h = workerHarness(); await h.dispatch('install');
  h.stores.set('imsc-library-shell-old', new Map()); h.stores.set('another-app', new Map());
  await h.dispatch('activate');
  assert.equal(h.stores.has('imsc-library-shell-old'), false);
  assert.equal(h.stores.has('another-app'), true); assert.equal(h.claims, 1);
});
test('manifest icons and linked assets are present in the package', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.webmanifest')));
  assert.equal(manifest.display, 'standalone');
  for (const icon of manifest.icons) {
    const buffer = fs.readFileSync(path.resolve(root, icon.src));
    const [width, height] = icon.sizes.split('x').map(Number);
    assert.equal(buffer.readUInt32BE(16), width); assert.equal(buffer.readUInt32BE(20), height);
  }
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  for (const match of html.matchAll(/(?:src|href)="(\.\/[^"#]+)"/g)) assert.ok(fs.existsSync(path.resolve(root, match[1])), match[1]);
  assert.equal(/<script[^>]+src="https?:/.test(html), false);
});
