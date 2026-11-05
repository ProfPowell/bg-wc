// fixedStep (src/presets/_clock.js) — the elapsed-time stepping contract every
// stateful preset relies on (gl-wc-beh4).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fixedStep } from '../src/presets/_clock.js';

test('identical t yields zero steps; the first call only sets the epoch', () => {
  const c = fixedStep(60);
  assert.equal(c.advance(0.5), 0);
  assert.equal(c.advance(0.5), 0);
  assert.equal(c.advance(0.5), 0);
  assert.equal(c.time, 0);
});

test('steps derive from absolute elapsed time, not per-call deltas', () => {
  const c = fixedStep(60, 600);
  c.advance(0);
  assert.equal(c.advance(1 / 60), 1);
  assert.equal(c.advance(2 / 60), 1);
  assert.equal(c.advance(2 / 60), 0);
  assert.equal(c.advance(0.5), 28);
  assert.equal(c.time, 30 / 60);
});

test('a 60 Hz and a 120 Hz walk to the same t take the same number of steps', () => {
  const walk = (hz) => {
    const c = fixedStep(60);
    let total = 0;
    const n = Math.round(1.5 * hz);
    for (let i = 0; i <= n; i++) total += c.advance(i / hz);
    return { total, time: c.time };
  };
  assert.deepEqual(walk(60), walk(120));
  assert.equal(walk(60).total, 90);
});

test('steps per call are bounded and the surplus is dropped, not queued', () => {
  const c = fixedStep(60, 6);
  c.advance(0);
  assert.equal(c.advance(5), 6); // 300 steps elapsed → capped
  assert.equal(c.advance(5), 0); // nothing queued behind the cap
  assert.equal(c.advance(5 + 1 / 60), 1);
});

test('default cap is 0.1 s worth of steps (matches the host MAX_DT_S clamp)', () => {
  assert.equal(fixedStep(60).advance(0), 0);
  const c = fixedStep(60);
  c.advance(0);
  assert.equal(c.advance(10), 6);
  const fast = fixedStep(90);
  fast.advance(0);
  assert.equal(fast.advance(10), 9);
});

test('t moving backwards re-bases the clock instead of going negative', () => {
  const c = fixedStep(60, 600);
  c.advance(1);
  assert.equal(c.advance(2), 60);
  assert.equal(c.advance(0.25), 0);
  assert.equal(c.advance(0.25 + 1 / 60), 1);
});

test('non-finite or negative t is ignored', () => {
  const c = fixedStep(60);
  assert.equal(c.advance(NaN), 0);
  assert.equal(c.advance(-1), 0);
  assert.equal(c.advance(0), 0);
  assert.equal(c.advance(1 / 60), 1);
});

test('reset() forgets the epoch', () => {
  const c = fixedStep(60);
  c.advance(0);
  c.advance(1);
  c.reset();
  assert.equal(c.time, 0);
  assert.equal(c.advance(5), 0);
});
