import { test, expect } from '@playwright/test';

// The gallery must never hold more live <bg-wc> (and therefore WebGL contexts)
// than a fixed budget, no matter how many presets a group contains. The
// "Patterns" group has the most WebGL presets (8) and, together with the
// persistent hero context and the transient overlap during a group switch,
// used to push a GPU-backed browser past its ~16 live-context limit — the
// browser then evicted contexts it could not restore, leaving cards blank.
// Cards mount lazily by viewport visibility and unmount when scrolled away, so
// the live count stays within MAX_LIVE.
const MAX_LIVE = 8;

async function showGroup(page, re) {
  await page.evaluate((r) => {
    const btn = [...document.querySelectorAll('.group-tab')].find((b) => new RegExp(r, 'i').test(b.textContent));
    btn?.click();
  }, re);
  // Let the IntersectionObserver settle and cards mount.
  await page.waitForTimeout(800);
}

test('gallery never mounts more than MAX_LIVE bg-wc at once (Patterns)', async ({ page }) => {
  await page.setViewportSize({ width: 1000, height: 700 });
  await page.goto('/docs/index.html', { waitUntil: 'networkidle' });
  await showGroup(page, 'pattern');

  const mounted = await page.evaluate(() => document.querySelectorAll('#grid bg-wc').length);
  const cards = await page.evaluate(() => document.querySelectorAll('#grid .card').length);

  // The group still shows all its cards (chrome/controls), but only a bounded
  // subset hold a live background at any moment.
  expect(cards).toBeGreaterThan(MAX_LIVE); // patterns has 11 cards — proves the cap matters
  expect(mounted).toBeGreaterThan(0); // visible cards do render
  expect(mounted).toBeLessThanOrEqual(MAX_LIVE);
});

test('live bg-wc budget holds after cycling through every group', async ({ page }) => {
  await page.setViewportSize({ width: 1000, height: 700 });
  await page.goto('/docs/index.html', { waitUntil: 'networkidle' });
  for (const g of ['gradient', 'atmospheric', 'retro', 'pattern']) {
    await showGroup(page, g);
    const mounted = await page.evaluate(() => document.querySelectorAll('#grid bg-wc').length);
    expect(mounted, `group ${g} should stay within budget`).toBeLessThanOrEqual(MAX_LIVE);
  }
});

// Cards late in a group's DOM (the Patterns group ends with scandi/seigaiha)
// must mount when scrolled to — the lazy-mount budget must prioritise what's at
// the viewport, not the first cards in document order.
test('cards at the end of a group mount when scrolled into view', async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 800 });
  await page.goto('/docs/index.html', { waitUntil: 'networkidle' });
  await showGroup(page, 'pattern');
  for (const name of ['scandi', 'seigaiha']) {
    await page.evaluate((n) => {
      const card = [...document.querySelectorAll('#grid .card')].find(
        (c) => c.querySelector('.card-meta h4')?.textContent.trim() === n
      );
      card?.scrollIntoView({ block: 'center' });
    }, name);
    await page.waitForTimeout(700);
    const mounted = await page.evaluate((n) => {
      const card = [...document.querySelectorAll('#grid .card')].find(
        (c) => c.querySelector('.card-meta h4')?.textContent.trim() === n
      );
      return !!card?.querySelector('bg-wc');
    }, name);
    expect(mounted, `${name} should mount when scrolled into view`).toBe(true);
  }
});
