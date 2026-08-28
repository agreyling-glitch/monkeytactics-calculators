# MonkeyTactics WASM navigation

This client-side Leptos component owns the complete MonkeyTactics site header.
It renders the brand, global tool-and-guide search, a four-group hierarchical
menu, and a hamburger-triggered slide-in drawer at every screen size. Pressing
`/` focuses the header search. Search results support wrapping Up/Down arrow
navigation and Enter activation. `Escape` closes search results, dropdowns, and
the drawer.

The hierarchy is loaded at runtime from
`/assets/wasm/menu/tools-manifest.json`:

- Generators
- Calculators
- Text & Data
- Batch & Automation

Calculators contains a third hierarchy level with Finance, Health, Time & Date,
and Construction subsections. Counts are computed recursively from leaf tools,
and global search traverses the same nested tree. Changing labels, URLs, groups,
or hierarchy only requires deploying the manifest; WASM does not need rebuilding.
Leaf entries also provide descriptions and intent-oriented keywords. Search combines
exact and prefix matching, TF-IDF cosine similarity, and typo tolerance to rank
queries by purpose instead of requiring the visible tool name.

Visitors can favorite up to 12 tools from the drawer. Favorite IDs are stored
locally in a versioned `localStorage` record, shown in manifest order above the
main hierarchy, and receive a small search-ranking bonus. No account or network
write is involved.

The header, search panel, and drawer use progressive glass styling with subtle
disclosure, search-result, favorite, and control animations. Opaque fallbacks
preserve contrast without backdrop-filter support, and reduced-motion settings
disable nonessential movement.

Each manifest leaf also owns exactly three concise `capabilities`. Run
`npm run build:tools-directory` after editing the catalog to regenerate the
accessible capability lists on `/tools/`; desktop hover and keyboard focus
reveal them, while touch-oriented layouts keep them visible.

The component also loads the public Hugo blog index from
`https://blog.monkeytactics.com/menu-search.json`. Article titles and tags are
searchable, and failures are silent so the local tool index remains available.
The blog generates this compact endpoint during every Hugo build; publishing a
new tagged article is enough to add it to the menu after the endpoint's
five-minute cache expires.

When the menu runs on `127.0.0.1` or `localhost`, it loads
`http://localhost:1313/menu-search.json` instead. This allows a Wrangler site at
`http://127.0.0.1:8788/` to search articles served by the local Hugo server.

The component mounts only when the current hostname passes the exact allowlist
in `src/domain.rs`. Every failure path returns silently.

## Build and copy into the site

From the repository root, run:

```powershell
npm run build:menu-wasm
```

The build uses `wasm-pack`, writes the browser package to
`wasm/menu-engine/dist/`, makes `dist/menu.js` self-starting, loads the
component stylesheet, and copies the deployment files to:

- `assets/wasm/menu/menu.js`
- `assets/wasm/menu/menu_bg.wasm`
- `assets/wasm/menu/menu.css`

The runtime manifest remains a separately deployed content asset, so rebuilding
the component cannot overwrite a newer navigation catalog.

`Trunk.toml` and `index.html` are included for local component development. The
caller validates `location.hostname`, so the approved `127.0.0.1` entry works
on any development-server port without changing `verify_domain`.

## Page integration

Replace the complete legacy site header with:

```html
<div id="mt-header"></div>
<script type="module" src="/assets/wasm/menu/menu.js"></script>
```

Do not retain the old header or its Finance, Health, Utilities, Productivity,
and Construction navigation links. The Rust initializer also removes legacy
`header.site-header`, direct page headers, and `.tool-categories` as a defensive
fallback before mounting.

The relevant page and template locations are:

- all top-level pages: `/*.html`
- the tool directory page: `/tools/index.html`
- every tool and category page: `/tools/*.html`
- the development template: `/dev/templates/tool-template.html`
- the retired unit-converter snapshot: `/dev/archive/unit-converter-previous.html.txt`

There is currently no `/templates/tools.html`; apply the same integration there
if that template is introduced. Breadcrumbs, page content, tool-directory
filters, and metadata remain page-owned and are not header navigation.

## Hosting and deployment

The static server must return:

- `menu_bg.wasm` as `application/wasm`
- `menu.js` as `application/javascript`
- `menu.css` as `text/css`

The repository's `_headers` file defines these MIME types and requires
revalidation so rebuilt navigation assets cannot remain stale. Run
`npm run build:menu-wasm` before publishing and deploy the repository root while
preserving `/assets/wasm/menu/`.
