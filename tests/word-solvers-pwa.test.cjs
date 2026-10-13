const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const slugs = ['word-unscrambler', 'words-with-friends-solver'];

test('offline update action is offered only for an older saved package and disappears after activation', () => {
  const source = read('assets/js/tools/word-unscrambler/word-unscrambler.js');
  const start = source.indexOf('function renderOfflineState(');
  const end = source.indexOf('\nasync function readOfflineManifest', start);
  const button = { hidden: true };
  const context = {
    offlineToggle: { setAttribute() {} }, offlineStatus: {},
    offlineCacheName: 'previous-package', offlineModeEnabled: false,
    IS_WWF: false, dictionaryDirectoryDialog: null,
    document: { querySelector: () => button, querySelectorAll: () => [] }
  };
  vm.createContext(context);
  vm.runInContext(source.slice(start, end), context);
  context.renderOfflineState();
  assert.equal(button.hidden, false);
  context.offlineModeEnabled = true;
  context.renderOfflineState();
  assert.equal(button.hidden, true);
  context.offlineCacheName = '';
  context.offlineModeEnabled = false;
  context.renderOfflineState();
  assert.equal(button.hidden, true);
});

test('installed solvers default to focus mode, allow exit, and leave browser visits unchanged', () => {
  for (const slug of slugs) assert.match(read(`tools/${slug}.html`), /data-focus-mode-installed/);
  for (const [standalone, ios, optedIn, expected] of [
    [true, false, true, true], [false, true, true, true],
    [false, false, true, false], [true, false, false, false]
  ]) {
    const classes = new Set();
    const bodyClasses = new Set();
    const classList = (set) => ({
      toggle(name, enabled) { enabled ? set.add(name) : set.delete(name); },
      contains: (name) => set.has(name)
    });
    const handlers = {};
    const button = { setAttribute() {}, focus() {}, addEventListener: (name, handler) => { handlers[name] = handler; } };
    const target = { dataset: {}, classList: classList(classes), hasAttribute: () => optedIn,
      prepend() {}, querySelector: () => button };
    vm.runInNewContext(read('assets/js/shared/focus-mode.js'), {
      document: { querySelectorAll: () => [target], createElement: () => button,
        body: { classList: classList(bodyClasses) }, addEventListener: (name, handler) => { handlers[name] = handler; } },
      window: { matchMedia: () => ({ matches: standalone }) }, navigator: { standalone: ios }
    });
    assert.equal(classes.has('is-focus-mode'), expected);
    assert.equal(bodyClasses.has('focus-mode-open'), expected);
    if (expected) {
      handlers.click();
      assert.equal(classes.has('is-focus-mode'), false);
      handlers.click();
      handlers.keydown({ key: 'Escape', preventDefault() {} });
      assert.equal(classes.has('is-focus-mode'), false);
    }
  }
});

test('solver manifests install distinct apps with valid PNGs and disjoint launch scopes', () => {
  const manifests = slugs.map((slug) => JSON.parse(read(`${slug}.webmanifest`)));
  assert.notEqual(manifests[0].id, manifests[1].id);
  for (const [index, manifest] of manifests.entries()) {
    const slug = slugs[index];
    assert.equal(manifest.display, 'standalone');
    assert.ok(manifest.start_url.startsWith(manifest.scope));
    assert.ok(!manifests[1 - index].start_url.startsWith(manifest.scope));
    assert.ok(read(`tools/${slug}.html`).includes(`href="/${slug}.webmanifest"`));
    for (const icon of manifest.icons) {
      const bytes = fs.readFileSync(path.join(root, icon.src));
      assert.equal(bytes.subarray(1, 4).toString(), 'PNG');
      assert.equal(`${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`, icon.sizes);
    }
    assert.ok(manifest.icons.some((icon) => icon.purpose === 'maskable'));
  }
});

function fixture(standalone = false) {
  const handlers = {};
  const button = { hidden: true, addEventListener: (event, handler) => { handlers.click = handler; } };
  const status = { textContent: '' };
  const registrations = [];
  const context = {
    document: { querySelector: (selector) => selector === '#solver-install' ? button : status },
    window: { matchMedia: () => ({ matches: standalone }), addEventListener: (event, handler) => { handlers[event] = handler; } },
    navigator: { userAgent: 'Edge', serviceWorker: { register: (...args) => { registrations.push(args); return Promise.resolve(); } } },
    console
  };
  vm.runInNewContext(read('assets/js/shared/word-solver-pwa.js'), context);
  return { handlers, button, status, registrations };
}

test('installation prompts only on a click and consumes each browser prompt once', async () => {
  const f = fixture();
  let prompts = 0;
  let prevented = false;
  f.handlers.beforeinstallprompt({ preventDefault() { prevented = true; }, async prompt() { prompts++; }, userChoice: Promise.resolve({ outcome: 'dismissed' }) });
  assert.ok(prevented);
  assert.equal(f.button.hidden, false);
  assert.equal(prompts, 0);
  await f.handlers.click();
  await f.handlers.click();
  assert.equal(prompts, 1);
  assert.equal(f.button.hidden, true);
  assert.equal(f.registrations[0][0], '/crossword-offline-sw.js');
  f.handlers.appinstalled();
  assert.ok(f.status.textContent.includes('Offline Mode'));
});

test('installed windows do not offer another installation', () => {
  const f = fixture(true);
  f.handlers.beforeinstallprompt({ preventDefault() {} });
  assert.equal(f.button.hidden, true);
});

test('offline package includes app metadata, icons, and install script for both solvers', async () => {
  const source = read('assets/js/tools/word-unscrambler/word-unscrambler.js');
  const start = source.indexOf('async function buildOfflineUrls(cache)');
  const end = source.indexOf('\nasync function cacheOfflineUrl', start);
  for (const slug of slugs) {
    const assets = [...read(`tools/${slug}.html`).matchAll(/<(?:script|link)\b[^>]*\b(?:src|href)="([^"]+)"/gi)]
      .map((match) => new URL(match[1], `https://example.test/tools/${slug}`).href);
    const context = {
      Dictionary: { offlineAssets: async () => ['/dictionary.gz'] },
      readOfflineManifest: async () => ({ shards: {} }),
      DEFINITION_MANIFEST_URL: '/definitions.json', DEFINITION_BASE_URL: '/definitions/',
      OFFLINE_TOOL_ID: slug, URL,
      location: { pathname: `/tools/${slug}`, href: `https://example.test/tools/${slug}`, origin: 'https://example.test' },
      document: { querySelectorAll: () => assets.map((href) => ({ href })) }
    };
    vm.createContext(context);
    vm.runInContext(source.slice(start, end), context);
    const urls = await context.buildOfflineUrls({});
    assert.ok(urls.includes(`https://example.test/${slug}.webmanifest`));
    assert.ok(urls.some((url) => url.includes('/word-solver-pwa.js')));
    for (const icon of JSON.parse(read(`${slug}.webmanifest`)).icons) assert.ok(urls.includes(icon.src));
  }
});
