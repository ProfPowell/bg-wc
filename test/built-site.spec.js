import { test, expect } from '@playwright/test';
import { sitePages } from '../vite.site.config.js';

// gl-wc-kkgm: the PRODUCTION site (dist-site, served by the second webServer in
// playwright.config.js on :5175) must work without the dev middleware that
// masks missing assets. Dev serves vanilla-breeze's whole icon pack from
// node_modules; the build emits an allow-list, so an icon the markup uses but
// the list omits (the GitHub icon, originally) only 404s on GitHub Pages. Each
// built page is loaded and must show no same-origin 4xx/5xx, no page errors,
// no console errors, every <icon-wc> (light DOM and inside shadow roots, e.g.
// theme-picker's) rendered its SVG, and — where the page uses backgrounds —
// <bg-wc> is actually registered (the tree-shaking guard verify-site-build.mjs
// checks statically).

const BUILT = 'http://localhost:5175';

// The demos hub embeds every demo in iframes; each demo is covered on its own.
const PAGES = sitePages().filter((p) => p !== 'demos/index.html');

// Noise the pages cannot avoid; anything else in the console at error level
// fails the test. (Keep this list empty unless a line is documented here.)
// Console errors whose source is a THIRD-PARTY URL (a Google Fonts woff2 the
// CDN 404s on, say) are skipped as well: they are the network's, not the
// site's — same-origin failures are still caught by the response check.
const IGNORED_CONSOLE = [];

for (const path of PAGES) {
  test(`built ${path}: no 4xx, no errors, icons render, element registered`, async ({ page }) => {
    const bad = [];
    const pageErrors = [];
    const consoleErrors = [];
    page.on('response', (r) => {
      const url = r.url();
      if (url.startsWith(BUILT) && r.status() >= 400) bad.push(`${r.status()} ${url}`);
    });
    page.on('pageerror', (e) => pageErrors.push(String(e)));
    page.on('console', (m) => {
      if (m.type() !== 'error') return;
      const src = m.location()?.url;
      if (src && !src.startsWith(BUILT)) return; // third-party resource, see above
      const text = m.text();
      if (IGNORED_CONSOLE.some((re) => re.test(text))) return;
      consoleErrors.push(`${text}${src ? ` (${src})` : ''}`);
    });

    const res = await page.goto(`${BUILT}/${path}`, { waitUntil: 'load' });
    expect(res?.status(), `GET /${path}`).toBe(200);
    // The site root is a <meta http-equiv="refresh"> hop to the gallery: follow
    // it (proving the redirect target ships) and check the landing page.
    if (path === 'index.html') await page.waitForURL(/\/docs\/index\.html$/);

    // Settle: every <icon-wc> (walking shadow roots) has either loaded its SVG
    // or flagged data-error; then report the failures by name.
    const icons = await page.evaluate(async () => {
      const all = (root, out = []) => {
        for (const el of root.querySelectorAll('*')) {
          if (el.tagName === 'ICON-WC') out.push(el);
          if (el.shadowRoot) all(el.shadowRoot, out);
        }
        return out;
      };
      const settled = (el) =>
        el.hasAttribute('data-error') || !!el.shadowRoot?.querySelector('svg');
      const deadline = Date.now() + 10000;
      let list = all(document);
      while (!list.every(settled) && Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 50));
        list = all(document);
      }
      return {
        total: list.length,
        failed: list
          .filter((el) => !settled(el) || el.hasAttribute('data-error'))
          .map(
            (el) =>
              `${el.getAttribute('name')}${el.hasAttribute('data-error') ? ' (data-error)' : ' (never loaded)'}`
          ),
      };
    });

    const usesBg = await page.evaluate(
      () => !!document.querySelector('bg-wc, [data-background], [data-bg]')
    );
    const registered = await page.evaluate(() => !!customElements.get('bg-wc'));

    // Give lazy fetches (icons, presets, themes) a beat to surface as responses.
    await page.waitForTimeout(100);

    expect(bad, 'same-origin responses >= 400').toEqual([]);
    expect(pageErrors, 'uncaught page errors').toEqual([]);
    expect(consoleErrors, 'console.error output').toEqual([]);
    expect(icons.failed, `icon-wc failures (of ${icons.total})`).toEqual([]);
    if (usesBg) expect(registered, '<bg-wc> must be defined on a page that uses it').toBe(true);
  });
}
