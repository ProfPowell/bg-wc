// Pure unit tests for the doodles preset's icon library + mode parsing.
// These import the module directly in Node (no browser) and exercise the
// deterministic, side-effect-free helpers.
import { test, expect } from '@playwright/test';
import { parseMode, poolFor, FAMILIES } from '../src/presets/doodles.js';

// Expanded icon roster (gl-wc-l16): planner 6, botanical 4, geometric 5.
const EXPECTED_COUNTS = { planner: 6, botanical: 4, geometric: 5 };

for (const [family, count] of Object.entries(EXPECTED_COUNTS)) {
  test(`family "${family}" exposes ${count} icons`, () => {
    expect(FAMILIES[family]).toBeDefined();
    expect(FAMILIES[family].length).toBe(count);
  });
}

test('every icon returns valid normalized stroke data', () => {
  for (const family of Object.keys(FAMILIES)) {
    for (const icon of FAMILIES[family]) {
      const strokes = icon();
      expect(Array.isArray(strokes)).toBe(true);
      expect(strokes.length).toBeGreaterThan(0);
      for (const stroke of strokes) {
        expect(Array.isArray(stroke)).toBe(true);
        expect(stroke.length).toBeGreaterThanOrEqual(2); // a drawable polyline
        for (const pt of stroke) {
          expect(pt.length).toBe(2);
          for (const coord of pt) {
            expect(Number.isFinite(coord)).toBe(true);
            // normalized 0..1 box, small overflow tolerated for round shapes
            expect(coord).toBeGreaterThanOrEqual(-0.1);
            expect(coord).toBeLessThanOrEqual(1.1);
          }
        }
      }
    }
  }
});

test('parseMode selects the named family', () => {
  expect(parseMode('planner')).toEqual(['planner']);
  expect(parseMode('geometric')).toEqual(['geometric']);
});

test('parseMode accepts space/comma lists and is case-insensitive', () => {
  expect(parseMode('planner botanical')).toEqual(['planner', 'botanical']);
  expect(parseMode('planner, geometric')).toEqual(['planner', 'geometric']);
  expect(parseMode('PLANNER  Botanical')).toEqual(['planner', 'botanical']);
});

test('parseMode falls back to all three on empty/unknown', () => {
  expect(parseMode('')).toEqual(['planner', 'botanical', 'geometric']);
  expect(parseMode(null)).toEqual(['planner', 'botanical', 'geometric']);
  expect(parseMode('nope bogus')).toEqual(['planner', 'botanical', 'geometric']);
});

test('poolFor unions the icons of the selected families', () => {
  expect(poolFor(['planner']).length).toBe(6);
  expect(poolFor(['botanical']).length).toBe(4);
  expect(poolFor(['planner', 'geometric']).length).toBe(11);
});
