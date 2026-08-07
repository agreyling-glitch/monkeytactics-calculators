# MonkeyTactics WASM navigation

This client-side Leptos component owns the complete MonkeyTactics site header.
It renders the brand, global tool search, a four-group hierarchical menu, and a
hamburger-triggered slide-in drawer at every screen size. Pressing `/` focuses
the header search. Search results support wrapping Up/Down arrow navigation and
Enter activation. `Escape` closes search results, dropdowns, and the drawer.

The hierarchy in `src/tools.rs` is derived from the site's 23 real tools:

- Generators
- Calculators
- Text & Data
- Batch & Automation

Calculators contains a third hierarchy level with Finance, Health, Time & Date,
and Construction subsections. Counts are computed recursively from leaf tools,
and global search traverses the same nested tree.

The component mounts only when the current hostname passes the exact allowlist
in `src/domain.rs`. Every failure path returns silently.

## Build and copy into the site

From the repository root, run:

```powershell
npm run build:menu
```

The build uses `wasm-pack`, writes the browser package to
`monkeytactics-wasm-menu/dist/`, makes `dist/menu.js` self-starting, loads the
component stylesheet, and copies the deployment files to:

- `static/wasm/menu.js`
- `static/wasm/menu_bg.wasm`
- `static/wasm/menu.css`

`Trunk.toml` and `index.html` are included for local component development. The
caller validates `location.hostname`, so the approved `127.0.0.1` entry works
on any development-server port without changing `verify_domain`.

## Page integration

Replace the complete legacy site header with:

```html
<div id="mt-header"></div>
<script type="module" src="/static/wasm/menu.js"></script>
```

Do not retain the old header or its Finance, Health, Utilities, Productivity,
and Construction navigation links. The Rust initializer also removes legacy
`header.site-header`, direct page headers, and `.tool-categories` as a defensive
fallback before mounting.

The relevant page and template locations are:

- all top-level pages: `/*.html`
- the tool directory page: `/tools/index.html`
- every tool and category page: `/tools/*.html`
- the future-tool template: `/tools/tool-template.html`
- the retained legacy page template: `/tools/unit-converter-previous.html`

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
`npm run build:menu` before publishing and deploy the repository root while
preserving `/static/wasm/`.
