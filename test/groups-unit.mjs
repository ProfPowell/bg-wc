// Units for the japanese/print registry groups added in the 2026-06-09 round.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { listGroups, listPresets } from '../src/presets/index.js';

test('japanese group contains the five japanese presets', () => {
  const g = listGroups().find((x) => x.id === 'japanese');
  assert.ok(g, 'japanese group exists');
  assert.deepEqual(
    g.presets.map((p) => p.name).sort(),
    ['kintsugi', 'sakura', 'seigaiha', 'sumi-e', 'ukiyo-e']
  );
});

test('print group contains the three print presets', () => {
  const g = listGroups().find((x) => x.id === 'print');
  assert.ok(g, 'print group exists');
  assert.deepEqual(g.presets.map((p) => p.name).sort(), ['linocut', 'plotter', 'risograph']);
});

test('seigaiha moved out of geometric', () => {
  const p = listPresets().find((x) => x.name === 'seigaiha');
  assert.equal(p.group, 'japanese');
});
