import { test, expect } from '@playwright/test';
import { readdirSync } from 'node:fs';

// Whole-catalog demo smoke: every page mounts its layers and nothing
// collapses. Guards the vocabulary-idiom conversions (gl-wc-otn): a
// data-background host that loses its geometry (e.g. to a stylesheet
// specificity fight, gl-wc-aoi) shows up here as a zero-size rect.

const PAGES = readdirSync('demos')
  .filter((f) => f.endsWith('.html') && f !== 'index.html')
  .sort();

test.describe('demos smoke', () => {
  for (const page_ of PAGES) {
    test(page_, async ({ page }) => {
      const errors = [];
      page.on('pageerror', (e) => errors.push(String(e)));
      page.on('console', (m) => {
        if (m.type() !== 'error') return;
        const loc = m.location()?.url || '';
        if (loc.includes('favicon') || m.text().includes('favicon')) return;
        // third-party CDNs (fonts etc.) can flake; only our own origin fails the smoke
        if (/^https?:/.test(loc) && !loc.includes('localhost')) return;
        errors.push(`${m.text()} @ ${loc}`);
      });
      await page.goto(`/demos/${page_}`);
      const r = await page.evaluate(async () => {
        // let the binder scan and the presets mount
        await new Promise((res) => setTimeout(res, 400));
        const hosts = [...document.querySelectorAll('[data-background]')];
        const collapsed = hosts
          .filter((h) => {
            const b = h.getBoundingClientRect();
            return b.width < 8 || b.height < 8;
          })
          .map((h) => h.tagName.toLowerCase());
        const unbound = hosts.filter((h) => !h.querySelector(':scope > bg-wc')).length;
        return {
          hosts: hosts.length,
          literal: document.querySelectorAll('bg-wc:not([data-bg-element])').length,
          collapsed,
          unbound,
          hscroll: document.documentElement.scrollWidth > innerWidth + 1,
        };
      });
      expect(r.hosts + r.literal, 'page must have at least one background').toBeGreaterThan(0);
      expect(r.unbound, 'every data-background host must get its layer').toBe(0);
      expect(r.collapsed, 'no host may collapse to zero size').toEqual([]);
      expect(errors, 'no page errors').toEqual([]);
      expect(r.hscroll, 'no horizontal overflow').toBe(false);
    });
  }
});
