const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const siteRoot = path.resolve(__dirname, "..");

test("repository uses the canonical source and deployment directories", () => {
  for (const retiredDirectory of ["public", "static", "src", "monkeytactics-wasm-menu"]) {
    assert.equal(
      fs.existsSync(path.join(siteRoot, retiredDirectory)),
      false,
      `${retiredDirectory}/ must not return as a competing source or deployment directory`,
    );
  }

  for (const requiredDirectory of [
    "apps/qr-studio",
    "assets/css/shared",
    "assets/css/pages",
    "assets/css/tools",
    "assets/js/shared",
    "assets/js/pages",
    "assets/js/tools",
    "assets/wasm/menu",
    "assets/wasm/mortgage",
    "assets/wasm/qr-code-generator",
    "assets/wasm/text-analyzer",
    "assets/wasm/word-unscrambler",
    "wasm/menu-engine",
    "wasm/mortgage-engine",
    "wasm/qr-code-generator-engine",
    "wasm/text-analyzer-engine",
    "wasm/word-unscrambler-engine",
  ]) {
    assert.ok(fs.statSync(path.join(siteRoot, requiredDirectory)).isDirectory(), requiredDirectory);
  }
});

test("tools contains production HTML routes only", () => {
  const entries = fs.readdirSync(path.join(siteRoot, "tools"), { withFileTypes: true });
  assert.ok(entries.length > 0);
  assert.deepEqual(
    entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name),
    [],
    "tool implementation modules belong under assets/js/tools, not tools/",
  );
  assert.deepEqual(
    entries.filter((entry) => !entry.isDirectory() && !entry.name.endsWith(".html")).map((entry) => entry.name),
    [],
  );
});

test("authored CSS and JavaScript are assigned to explicit namespaces", () => {
  for (const directory of ["assets/css", "assets/js"]) {
    const flatFiles = fs
      .readdirSync(path.join(siteRoot, directory), { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name);
    assert.deepEqual(flatFiles, [], `${directory}/ must not mix unclassified files with its namespaces`);
  }
});

test("every local HTML asset reference resolves", () => {
  const pages = [
    ...fs.readdirSync(siteRoot).filter((name) => name.endsWith(".html")).map((name) => path.join(siteRoot, name)),
    ...fs.readdirSync(path.join(siteRoot, "tools")).filter((name) => name.endsWith(".html")).map((name) => path.join(siteRoot, "tools", name)),
  ];

  for (const page of pages) {
    const html = fs.readFileSync(page, "utf8");
    for (const match of html.matchAll(/(?:src|href)=["']([^"'?#]+)/gi)) {
      const reference = match[1];
      if (!reference.startsWith("/assets/") && !reference.startsWith("../assets/")) continue;
      const target = reference.startsWith("/")
        ? path.join(siteRoot, ...reference.slice(1).split("/"))
        : path.resolve(path.dirname(page), reference);
      assert.ok(fs.existsSync(target), `${path.relative(siteRoot, page)} references missing ${reference}`);
    }
  }
});

test("every absolute asset reference in authored code resolves", () => {
  const sourceFiles = [];
  const collect = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) collect(target);
      else if (/\.(?:css|js|ts|tsx)$/.test(entry.name)) sourceFiles.push(target);
    }
  };
  collect(path.join(siteRoot, "assets", "js"));
  collect(path.join(siteRoot, "assets", "css"));
  collect(path.join(siteRoot, "apps"));

  for (const sourceFile of sourceFiles) {
    const source = fs.readFileSync(sourceFile, "utf8");
    for (const match of source.matchAll(/["'(](\/assets\/[^"')?#\s]+)/g)) {
      const target = path.join(siteRoot, ...match[1].slice(1).split("/"));
      assert.ok(fs.existsSync(target), `${path.relative(siteRoot, sourceFile)} references missing ${match[1]}`);
    }
  }
});

test("the canonical sitemap index includes tools and generated word maps", () => {
  const sitemap = fs.readFileSync(path.join(siteRoot, "sitemap.xml"), "utf8");
  assert.match(sitemap, /sitemap-tools\.xml/);
  for (let index = 1; index <= 6; index += 1) {
    assert.match(sitemap, new RegExp(`sitemap-words-${index}\\.xml`));
  }
});
