// Battery-aware power-save hook. Resolves to a disposer.
// If the Battery API is unavailable, returns a no-op disposer and never invokes cb.
export async function observeBatteryPowerSave(cb) {
  if (!navigator.getBattery) return () => {};
  try {
    const battery = await navigator.getBattery();
    const handler = () => cb(battery.level < 0.2 && !battery.charging);
    battery.addEventListener('levelchange', handler);
    battery.addEventListener('chargingchange', handler);
    handler();
    return () => {
      battery.removeEventListener('levelchange', handler);
      battery.removeEventListener('chargingchange', handler);
    };
  } catch {
    return () => {};
  }
}

// Tiny seedable PRNG (mulberry32). Deterministic per seed.
export function mulberry32(seed) {
  let a = (seed | 0) || 1;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
