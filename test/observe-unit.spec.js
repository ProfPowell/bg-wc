import { test, expect } from '@playwright/test';

// gl-wc-yg0: IntersectionObserver delivers batched entries oldest → newest. A
// fast scroll that takes the element in and out of the (margin-expanded)
// viewport before delivery yields [enter, leave] in one callback — the
// reported state must be the NEWEST entry, else the element is marked visible
// and animates offscreen indefinitely. A real IO can't batch deterministically
// in a test, so this drives the callback through a capturing stub.

test('observeVisibility reports the newest batched IO entry, not the oldest', async ({ page }) => {
  await page.goto('/test/new-presets-page.html');
  const r = await page.evaluate(async () => {
    const RealIO = window.IntersectionObserver;
    let captured = null;
    window.IntersectionObserver = class {
      constructor(cb) {
        captured = cb;
      }
      observe() {}
      disconnect() {}
    };
    try {
      const { observeVisibility } = await import('/src/util/observe.js');
      const seen = [];
      observeVisibility(document.body, (v) => seen.push(v));
      captured([{ isIntersecting: true }, { isIntersecting: false }]); // enter then leave
      captured([{ isIntersecting: false }, { isIntersecting: true }]); // leave then enter
      return seen;
    } finally {
      window.IntersectionObserver = RealIO;
    }
  });
  expect(r).toEqual([false, true]);
});
