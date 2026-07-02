import { test, expect } from '@playwright/test';

// gl-wc-51h: a malformed tile tag (a missing `>` on an <a>) made the browser
// swallow a card's .meta into the anchor and mis-nest the cards after it.
// Pin the hub's card shape as the BROWSER parses it: every card carries its
// three direct children, so any future tag-soup regression fails loudly.

test('every demos-hub card parses into its three-part shape', async ({ page }) => {
  await page.goto('/demos/index.html');
  const bad = await page.evaluate(() =>
    [...document.querySelectorAll('.bw-card')]
      .filter(
        (card) =>
          !card.querySelector(':scope > browser-window') ||
          !card.querySelector(':scope > a.bw-open') ||
          !card.querySelector(':scope > .meta > .desc')?.textContent.trim()
      )
      .map(
        (card) =>
          card.querySelector('.name')?.textContent.trim() ||
          card.querySelector('browser-window')?.getAttribute('title') ||
          'unknown'
      )
  );
  expect(bad, `malformed hub cards: ${bad.join(', ')}`).toEqual([]);
});
