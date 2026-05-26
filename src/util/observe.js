export function observeVisibility(host, cb) {
  const io = new IntersectionObserver((entries) => cb(entries[0].isIntersecting), {
    rootMargin: '200px',
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
