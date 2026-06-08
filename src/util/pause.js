// Battery-aware power-save hook. Resolves to a disposer.
// If the Battery API is unavailable, returns a no-op disposer and never invokes cb.
// Pass an AbortSignal to cancel: if it aborts before getBattery() resolves no
// listeners are attached; if it aborts after, they're removed — so a caller that
// tears down during the async gap can't leak listeners.
export async function observeBatteryPowerSave(cb, signal) {
  if (!navigator.getBattery || signal?.aborted) return () => {};
  try {
    const battery = await navigator.getBattery();
    if (signal?.aborted) return () => {};
    const handler = () => cb(battery.level < 0.2 && !battery.charging);
    battery.addEventListener('levelchange', handler);
    battery.addEventListener('chargingchange', handler);
    handler();
    const dispose = () => {
      battery.removeEventListener('levelchange', handler);
      battery.removeEventListener('chargingchange', handler);
    };
    signal?.addEventListener('abort', dispose, { once: true });
    return dispose;
  } catch {
    return () => {};
  }
}

// Tiny seedable PRNG (mulberry32). Deterministic per seed.
export function mulberry32(seed) {
  let a = seed | 0 || 1;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
