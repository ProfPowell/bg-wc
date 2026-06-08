// Start animating slightly before the element scrolls into view (and keep going
// slightly past) so motion is already running when it's visible.
const VISIBILITY_ROOT_MARGIN = '200px';

export function observeVisibility(host, cb) {
  const io = new IntersectionObserver((entries) => cb(entries[0].isIntersecting), {
    rootMargin: VISIBILITY_ROOT_MARGIN,
  });
  io.observe(host);
  return () => io.disconnect();
}

export function observeReducedMotion(cb) {
  const mq = matchMedia('(prefers-reduced-motion: reduce)');
  const handler = () => cb(mq.matches);
  mq.addEventListener('change', handler);
  return {
    matches: () => mq.matches,
    dispose: () => mq.removeEventListener('change', handler),
  };
}

export function observeTabVisibility(cb) {
  const handler = () => cb(!document.hidden);
  document.addEventListener('visibilitychange', handler);
  return () => document.removeEventListener('visibilitychange', handler);
}
