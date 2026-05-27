// Demos hub entry: load the site infrastructure so the hub carries the same
// header + theme-picker as the gallery/docs pages. The bespoke per-card preview
// palettes stay in the page's own <style>.
import 'vanilla-breeze';
import 'vanilla-breeze/css';
import '../src/bg-wc.js';
import '@profpowell/browser-window';
import '../docs/prefer-dark.js';

// Clicking a grid tile opens its <browser-window> as a maximized overlay (the
// live demo in a 90vw/90vh modal with backdrop + Escape) rather than navigating.
// The transparent .bw-open overlay still catches the wheel so the PAGE scrolls,
// not the iframe. Modified clicks (cmd/ctrl/middle) and no-JS fall back to the
// link's href (the full demo page).
document.addEventListener('click', (e) => {
  const open = e.target.closest('.bw-open');
  if (!open) return;
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
  const win = open.closest('.bw-card')?.querySelector('browser-window');
  if (win && typeof win.toggleMaximize === 'function') {
    e.preventDefault();
    win.toggleMaximize();
  }
});
