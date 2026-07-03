import { test, expect } from '@playwright/test';
import { MAX_WEBGL } from '../docs/gallery-config.js';

// The gallery must never hold more live <bg-wc> (and therefore WebGL contexts)
// than a fixed budget, no matter how many presets a group contains. A large
// group plus the persistent hero context and the transient overlap during a
// group switch used to push a GPU-backed browser past its ~16 live-context
// limit — the browser then evicted contexts it could not restore, leaving cards
// blank. Cards mount lazily by viewport visibility and unmount when scrolled
// away, so the live count stays within the budget (imported from the same
// module the gallery enforces, so test and code can't drift).

// Cards mount from an async IntersectionObserver callback; "settled" means at
// least one card is mounted and the mounted count held steady across two
// frames — no fixed sleeps.
async function settleMounts(page) {
  await page.waitForFunction(() => !!document.querySelector('#grid .card bg-wc'));
  await page.waitForFunction(
    () =>
      new Promise((res) => {
        const count = () => document.querySelectorAll('#grid .card bg-wc').length;
        const before = count();
        requestAnimationFrame(() => requestAnimationFrame(() => res(count() === before)));
      })
  );
}

async function showGroup(page, re) {
  await page.evaluate((r) => {
    const btn = [...document.querySelectorAll('.group-tab')].find((b) =>
      new RegExp(r, 'i').test(b.textContent)
    );
    btn?.click();
  }, re);
  await settleMounts(page);
}

// Scroll a named card into view and wait until the lazy mount lands.
async function mountCard(page, name) {
  await page.evaluate((n) => {
    [...document.querySelectorAll('#grid .card')]
      .find((c) => c.querySelector('.card-meta h3')?.textContent.trim() === n)
      ?.scrollIntoView({ block: 'center' });
  }, name);
  await page.waitForFunction(
    (n) =>
      !![...document.querySelectorAll('#grid .card')]
        .find((c) => c.querySelector('.card-meta h3')?.textContent.trim() === n)
        ?.querySelector('bg-wc'),
    name
  );
}

// Count mounted cards whose preset renders with WebGL (badge class). Only these
// hold a GPU context and count toward the budget.
const webglMounted = (page) =>
  page.evaluate(
    () =>
      [...document.querySelectorAll('#grid .card')].filter(
        (c) => c.querySelector('.badge.webgl') && c.querySelector('bg-wc')
      ).length
  );

test('live WebGL context budget holds across every group', async ({ page }) => {
  await page.setViewportSize({ width: 1000, height: 700 });
  await page.goto('/docs/index.html', { waitUntil: 'networkidle' });
  const ids = await page.evaluate(() =>
    [...document.querySelectorAll('.group-tab')].map((b) => b.dataset.group)
  );
  for (const g of ids) {
    // Match the tab by its data-group id to avoid label/regex collisions.
    await page.evaluate((id) => {
      [...document.querySelectorAll('.group-tab')].find((b) => b.dataset.group === id)?.click();
    }, g);
    await settleMounts(page);
    expect(await webglMounted(page), `group ${g} exceeds the WebGL budget`).toBeLessThanOrEqual(
      MAX_WEBGL
    );
  }
});

// Cards late in a group's DOM (the Geometric group ends with doodles/scandi;
// seigaiha moved to the Japanese group in the 2026-06-09 round) must mount when
// scrolled to — the lazy-mount budget must prioritise what's at the viewport,
// not the first cards in document order.
test('cards at the end of a group mount when scrolled into view', async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 800 });
  await page.goto('/docs/index.html', { waitUntil: 'networkidle' });
  await showGroup(page, 'geometric');
  for (const name of ['doodles', 'scandi']) {
    await mountCard(page, name); // waits for the mount — failing to mount times out here
  }
});

// paper-grain renders correctly but is a deliberately faint overlay; at the
// card's default intensity it is invisible and reads as "not showing". The
// gallery showcases such subtle presets at full intensity so the effect is
// actually visible (the preset's own defaults are unchanged).
test('paper-grain is showcased at full intensity', async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 800 });
  await page.goto('/docs/index.html', { waitUntil: 'networkidle' });
  await showGroup(page, 'texture');
  await mountCard(page, 'paper-grain');
  const intensity = await page.evaluate(() => {
    const card = [...document.querySelectorAll('#grid .card')].find(
      (c) => c.querySelector('.card-meta h3')?.textContent.trim() === 'paper-grain'
    );
    return card?.querySelector('bg-wc')?.getAttribute('intensity');
  });
  expect(intensity).toBe('1');
});

// The old 13-preset "Patterns" group is split into "Geometric" and "Texture"
// so no group mixes shapes with overlay textures (and each holds fewer shaders).
test('Patterns is split into Geometric and Texture groups', async ({ page }) => {
  await page.goto('/docs/index.html', { waitUntil: 'networkidle' });
  const tabs = await page.evaluate(() =>
    [...document.querySelectorAll('.group-tab')].map((b) =>
      b.textContent.replace(/\s*\d+\s*$/, '').trim()
    )
  );
  expect(tabs).toContain('Geometric');
  expect(tabs).toContain('Texture');
  expect(tabs).not.toContain('Patterns');

  const placement = await page.evaluate(() => {
    const groupOf = (name) => {
      for (const b of document.querySelectorAll('.group-tab')) {
        b.click();
        const here = [...document.querySelectorAll('#grid .card h3')].some(
          (h) => h.textContent.trim() === name
        );
        if (here) return b.textContent.replace(/\s*\d+\s*$/, '').trim();
      }
      return null;
    };
    return {
      paperGrain: groupOf('paper-grain'),
      scandi: groupOf('scandi'),
      mosaic: groupOf('mosaic'),
    };
  });
  expect(placement.paperGrain).toBe('Texture');
  expect(placement.scandi).toBe('Geometric');
  expect(placement.mosaic).toBe('Geometric');
});

// Faint light-grain overlays (paper-grain, grain) are invisible on a white page
// theme. The gallery gives those cards a dark stage backdrop so the effect shows
// regardless of the visitor's theme (preset behaviour is unchanged).
test('faint overlay cards render on a dark backing on a light theme', async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 800 });
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/docs/index.html', { waitUntil: 'networkidle' });
  await showGroup(page, 'texture');

  const lumOf = (cssColor) => {
    const m = cssColor.match(/[\d.]+/g);
    return m ? 0.299 * +m[0] + 0.587 * +m[1] + 0.114 * +m[2] : null;
  };

  const bgOf = async (name) => {
    await mountCard(page, name);
    return page.evaluate((n) => {
      const card = [...document.querySelectorAll('#grid .card')].find(
        (c) => c.querySelector('.card-meta h3')?.textContent.trim() === n
      );
      const el = card?.querySelector('bg-wc');
      return {
        mounted: !!el,
        dark: card?.querySelector('.card-stage')?.classList.contains('stage-dark'),
        hostBg: el ? getComputedStyle(el).backgroundColor : null,
      };
    }, name);
  };

  // The <bg-wc> host paints its own --color-background; on a light theme that is
  // white and would hide the faint grain. The card must force a dark backing on
  // the host itself, not just the stage behind it.
  const pg = await bgOf('paper-grain');
  expect(pg.mounted).toBe(true);
  expect(pg.dark, 'paper-grain stage should be flagged dark').toBe(true);
  expect(lumOf(pg.hostBg), 'paper-grain host must render on a dark backing').toBeLessThan(80);

  const grain = await bgOf('grain');
  expect(lumOf(grain.hostBg), 'grain host must render on a dark backing').toBeLessThan(80);

  // Vivid texture presets keep the normal theme background.
  const dither = await bgOf('dither');
  expect(dither.dark, 'dither should not be dark-backed').toBe(false);

  // oscilloscope's additive traces clamp invisibly over a light bg — its
  // card needs the same dark backing (its fade targets the host bg token).
  await showGroup(page, 'tech');
  const scope = await bgOf('oscilloscope');
  expect(scope.mounted).toBe(true);
  expect(scope.dark, 'oscilloscope stage should be flagged dark').toBe(true);
  expect(lumOf(scope.hostBg), 'oscilloscope host must render on a dark backing').toBeLessThan(80);
});
