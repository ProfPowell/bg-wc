# Consistent Demo Navigation Implementation Plan (gl-wc-le3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make navigation consistent across the bg-wc gallery, docs, and demos — fix the demos-hub broken links, normalize all 32 per-demo back-links to "← Demos", refresh the stale root redirect copy, and unify the gallery/api site-header nav.

**Architecture:** Static HTML edits only. A consistent breadcrumb hierarchy (Gallery ⇄ Docs ⇄ Demos hub; each demo → the hub). One scripted sweep normalizes the 32 demo back-link labels (preserving each demo's `<a>` attributes/styling); the hub, root redirect, and two site headers get targeted edits.

**Tech Stack:** Static HTML, Vite site build (`vite.site.config.js`), Playwright (already installed) for a headless link-integrity crawl.

**Target:** `~/src/gl-wc/`. Feature branch `feat/demo-nav-le3`. Spec: `docs/superpowers/specs/2026-05-26-demo-nav-consistency-le3-design.md`.

---

### Task 1: Normalize the 32 per-demo back-links

Every demo (excluding `demos/index.html`) has exactly one `<a … href="./">…</a>` back-link (verified). Replace its inner text with `&larr; Demos`, preserving the opening tag's attributes.

**Files:** `demos/*.html` (32, excluding `index.html`)

- [ ] **Step 1: Apply the scripted normalization**

Run (from `/Users/tpowell/src/gl-wc`):
```bash
for f in demos/*.html; do
  [ "$f" = "demos/index.html" ] && continue
  perl -0777 -i -pe 's{(<a\b[^>]*\bhref="\./"[^>]*>).*?(</a>)}{$1&larr; Demos$2}s' "$f"
done
```
This rewrites only the inner content of the `href="./"` anchor; classes and other attributes on the `<a>` tag are untouched. (`perl -0777` slurps the whole file so the match works even if the anchor spans whitespace; `.*?` is non-greedy so it stops at the first `</a>`.)

- [ ] **Step 2: Verify every demo now has the normalized label and no stragglers**

Run:
```bash
echo "should be 31 (count of demos with the normalized link):"
grep -lE '<a\b[^>]*href="\./"[^>]*>&larr; Demos</a>' demos/*.html | grep -v 'demos/index.html' | wc -l
echo "should be 0 (leftover variants):"
grep -onE '(INDEX|\[&larr;|&lt; *DEMOS|/DEMOS|/demos)' demos/*.html | grep -v 'demos/index.html' | grep -iE 'INDEX|DEMOS|/demos' | wc -l
```
Expected: first count `31` (32 demo files minus `index.html`); second count `0`.
(If a demo's anchor had a child element instead of plain text, the first count will be < 31 — inspect that file and fix its back-link by hand to `<a … href="./">&larr; Demos</a>`.)

- [ ] **Step 3: Build + commit**

Run: `npm run build:site 2>&1 | tail -2` (expect `✓ built`).
```bash
git add demos/*.html
git commit -m "feat(demos): normalize per-demo back-link label to '← Demos'"
```

---

### Task 2: Fix the demos-hub topbar links

**Files:** `demos/index.html`

- [ ] **Step 1: Inspect the current topbar links** (to match exact whitespace)

Run: `grep -n 'href="\.\./' demos/index.html`
Expected: two lines — `<a href="../docs/">Docs &rarr;</a>` and `<a href="../">&larr; Gallery</a>` (around lines 94–95).

- [ ] **Step 2: Replace the two links** (correct targets + order: Gallery first, then Docs)

In `demos/index.html`, replace:
```html
      <a href="../docs/">Docs &rarr;</a>
      <a href="../">&larr; Gallery</a>
```
with:
```html
      <a href="../docs/">&larr; Gallery</a>
      <a href="../docs/api.html">Docs &rarr;</a>
```
(`../docs/` is the gallery `docs/index.html`; `../docs/api.html` is the API docs. This fixes the prior bug where "Docs →" pointed at the gallery and "← Gallery" went through the root redirect.)

- [ ] **Step 3: Build + commit**

Run: `npm run build:site 2>&1 | tail -2` (expect `✓ built`).
```bash
git add demos/index.html
git commit -m "fix(demos): hub topbar links to gallery + actual API docs"
```

---

### Task 3: Refresh the stale root redirect copy

**Files:** `index.html`

- [ ] **Step 1: Update the title + link text** (keep the redirect target)

In `index.html`, replace:
```html
  <title>gl-wc</title>
  <meta http-equiv="refresh" content="0; url=./docs/index.html">
</head>
<body>
  <p><a href="./docs/">Open the gl-wc preset gallery &rarr;</a></p>
```
with:
```html
  <title>bg-wc</title>
  <meta http-equiv="refresh" content="0; url=./docs/index.html">
</head>
<body>
  <p><a href="./docs/">Open the bg-wc preset gallery &rarr;</a></p>
```

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "docs: refresh root redirect copy (gl-wc -> bg-wc)"
```

---

### Task 4: Unify the gallery + api site-header nav

Both headers carry **Gallery, Docs, Demos, GitHub** in that order, current page marked `aria-current="page"`.

**Files:** `docs/index.html`, `docs/api.html`

- [ ] **Step 1: Gallery (`docs/index.html`) — replace the nav `<ul>`.**

Find:
```html
    <nav class="horizontal pills" aria-label="Site">
      <ul>
        <li><a href="./api.html">Docs</a></li>
        <li><a href="../demos/">Demos</a></li>
        <li><a href="https://github.com/ProfPowell/bg-wc" target="_blank" rel="noopener">GitHub</a></li>
      </ul>
    </nav>
```
Replace with:
```html
    <nav class="horizontal pills" aria-label="Site">
      <ul>
        <li><a href="./index.html" aria-current="page">Gallery</a></li>
        <li><a href="./api.html">Docs</a></li>
        <li><a href="../demos/">Demos</a></li>
        <li><a href="https://github.com/ProfPowell/bg-wc" target="_blank" rel="noopener">GitHub</a></li>
      </ul>
    </nav>
```

- [ ] **Step 2: API (`docs/api.html`) — reorder the nav `<ul>` to match (Docs current).**

Find:
```html
    <nav class="horizontal pills" aria-label="Site">
      <ul>
        <li><a href="./index.html">Gallery</a></li>
        <li><a href="../demos/">Demos</a></li>
        <li><a href="./api.html" aria-current="page">Docs</a></li>
        <li><a href="https://github.com/ProfPowell/bg-wc" target="_blank" rel="noopener">GitHub</a></li>
      </ul>
    </nav>
```
Replace with:
```html
    <nav class="horizontal pills" aria-label="Site">
      <ul>
        <li><a href="./index.html">Gallery</a></li>
        <li><a href="./api.html">Docs</a></li>
        <li><a href="../demos/">Demos</a></li>
        <li><a href="./api.html" aria-current="page">Docs</a></li>
        <li><a href="https://github.com/ProfPowell/bg-wc" target="_blank" rel="noopener">GitHub</a></li>
      </ul>
    </nav>
```
**Wait — that duplicates Docs.** The correct replacement (Gallery, Docs[current], Demos, GitHub) is:
```html
    <nav class="horizontal pills" aria-label="Site">
      <ul>
        <li><a href="./index.html">Gallery</a></li>
        <li><a href="./api.html" aria-current="page">Docs</a></li>
        <li><a href="../demos/">Demos</a></li>
        <li><a href="https://github.com/ProfPowell/bg-wc" target="_blank" rel="noopener">GitHub</a></li>
      </ul>
    </nav>
```
Use this last block (4 items, Docs marked current, no duplicate).

- [ ] **Step 3: Build + commit**

Run: `npm run build:site 2>&1 | tail -2` (expect `✓ built`).
```bash
git add docs/index.html docs/api.html
git commit -m "style(docs): unify gallery + api site-header nav (Gallery/Docs/Demos/GitHub)"
```

---

### Task 5: Headless link-integrity crawl

**Files:** none (throwaway verification script, not committed)

- [ ] **Step 1: Start the site dev server**

Run: `npm run dev -- --port 5179 >/tmp/vite-site.log 2>&1 &` then wait until `/tmp/vite-site.log` shows `Local:` (poll up to ~20s).

- [ ] **Step 2: Run the crawl.** Create `/Users/tpowell/src/gl-wc/.nav-check.mjs` (so it resolves `@playwright/test` from the repo):

```js
import { chromium } from '@playwright/test';
const base = 'http://localhost:5179';
const b = await chromium.launch();
const page = await b.newPage();
const errs = [];
page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
page.on('pageerror', (e) => errs.push(String(e)));

async function hrefOf(url, text) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  return page.evaluate((t) => {
    const a = [...document.querySelectorAll('a')].find((x) => x.textContent.replace(/\s+/g, ' ').trim().includes(t));
    return a ? a.href : null;
  }, text);
}
async function title(url) {
  const res = await page.goto(url, { waitUntil: 'domcontentloaded' });
  return { status: res.status(), title: await page.title() };
}

const results = {};
// Demos hub → Gallery + Docs
results.hubGallery = await hrefOf(base + '/demos/index.html', 'Gallery');
results.hubDocs = await hrefOf(base + '/demos/index.html', 'Docs');
// A sample demo → hub
results.demoBack = await hrefOf(base + '/demos/cyberpunk.html', 'Demos');
// Resolve each target
for (const [k, href] of Object.entries({ ...results })) {
  if (href) results[k + '_resolved'] = await title(href);
}
// Gallery + api header links resolve
results.galleryHeader = {};
for (const t of ['Gallery', 'Docs', 'Demos', 'GitHub']) {
  const h = await hrefOf(base + '/docs/index.html', t);
  if (h && !h.startsWith('https://github')) results.galleryHeader[t] = await title(h);
}
console.log(JSON.stringify(results, null, 2));
console.log('errors:', errs);
await b.close();
```
Run: `node .nav-check.mjs` then `rm -f .nav-check.mjs`.

Expected:
- `hubGallery` ends with `/docs/` (or `/docs/index.html`); its `_resolved` is status 200, title contains "gallery".
- `hubDocs` ends with `/docs/api.html`; its `_resolved` is status 200, title contains "API" (api.html's title).
- `demoBack` ends with `/demos/` (the hub); `_resolved` status 200.
- `galleryHeader.Gallery/.Docs/.Demos` each resolve to status 200 with the expected titles (gallery/API/demos).
- `errors:` empty.

- [ ] **Step 3: Stop the dev server**

Run: `pkill -f "vite --config vite.site.config.js"; rm -f /tmp/vite-site.log`

- [ ] **Step 4: Report.** If any link resolves to the wrong page or 404s, fix the offending markup and re-run before finishing. (No commit unless a fix was needed.)

---

## Self-Review

**1. Spec coverage:**
- §3.1 per-demo back-link normalization (text → "← Demos", keep attrs, target `./`) → Task 1. ✓
- §3.2 demos-hub topbar targets (Gallery → `../docs/`, Docs → `../docs/api.html`) → Task 2. ✓
- §3.3 root redirect copy (gl-wc → bg-wc, target unchanged) → Task 3. ✓
- §3.4 site-header parity (Gallery/Docs/Demos/GitHub, aria-current) → Task 4. ✓
- §5 verification (build:site; link-integrity crawl no-404; consistency greps; no console errors) → Task 1 Step 2 grep + Task 5 crawl + each task's build. ✓
- §6 out of scope (no demo content/aesthetic change; hub keeps bespoke topbar; demos link to hub not gallery) → respected. ✓

**2. Placeholder scan:** No TBD/TODO. The Task 4 Step 2 deliberately shows the wrong-then-right block to flag the duplicate-Docs trap and ends with the explicit correct block to use — every edit has concrete before/after. The crawl script is complete runnable code.

**3. Consistency:** Back-link text `&larr; Demos` (Task 1) matches the grep assertion in Task 1 Step 2 and the `demoBack`/`Demos` lookup in Task 5. Hub targets `../docs/` + `../docs/api.html` (Task 2) match the `hubGallery`/`hubDocs` expectations (Task 5). Header item set Gallery/Docs/Demos/GitHub (Task 4) matches the `galleryHeader` crawl keys (Task 5). The redirect target `./docs/index.html` is explicitly preserved (Task 3).
