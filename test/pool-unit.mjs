// Units for the seeded-pool helper (gl-wc-e9z1): the rebuild/ensure/lastKey
// scaffold particle presets used to copy by hand.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seededPool } from '../src/presets/_pool.js';

test('builds once per key and returns what build produced', () => {
  let builds = 0;
  const ensure = seededPool(
    (p) => {
      builds++;
      return [p.seed, p.density];
    },
    (p) => `${p.seed}|${p.density}`
  );
  const a = ensure({ seed: 1, density: 0.5 });
  const b = ensure({ seed: 1, density: 0.5 });
  assert.deepEqual(a, [1, 0.5]);
  assert.equal(a, b, 'same key → same object, no rebuild');
  assert.equal(builds, 1);
});

test('rebuilds when the key changes', () => {
  let builds = 0;
  const ensure = seededPool(
    (p) => ({ n: ++builds, seed: p.seed }),
    (p) => `${p.seed}`
  );
  ensure({ seed: 1 });
  const c = ensure({ seed: 2 });
  assert.equal(c.seed, 2);
  assert.equal(builds, 2);
  ensure({ seed: 2 });
  assert.equal(builds, 2, 'unchanged key → no rebuild');
});

test('defaults the key to seed|density', () => {
  let builds = 0;
  const ensure = seededPool(() => ++builds);
  ensure({ seed: 3, density: 0.2, intensity: 0.1 });
  ensure({ seed: 3, density: 0.2, intensity: 0.9 });
  assert.equal(builds, 1, 'intensity is not part of the default key');
  ensure({ seed: 3, density: 0.3 });
  assert.equal(builds, 2);
});

test('an empty build is cached, not rebuilt every call', () => {
  let builds = 0;
  const ensure = seededPool(() => {
    builds++;
    return [];
  });
  ensure({ seed: 1, density: 0 });
  ensure({ seed: 1, density: 0 });
  assert.equal(builds, 1);
});
