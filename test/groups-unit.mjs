// Units for the japanese/print registry groups added in the 2026-06-09 round.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { listGroups, listPresets } from '../src/presets/index.js';

test('japanese group contains the seven japanese presets', () => {
  const g = listGroups().find((x) => x.id === 'japanese');
  assert.ok(g, 'japanese group exists');
  assert.deepEqual(g.presets.map((p) => p.name).sort(), [
    'kintsugi',
    'origami',
    'sakura',
    'seigaiha',
    'sumi-e',
    'ukiyo-e',
    'zen-garden',
  ]);
});

test('print group contains the five print presets', () => {
  const g = listGroups().find((x) => x.id === 'print');
  assert.ok(g, 'print group exists');
  assert.deepEqual(g.presets.map((p) => p.name).sort(), [
    'cyanotype',
    'linocut',
    'plotter',
    'risograph',
    'screenprint',
  ]);
});

test('seigaiha moved out of geometric', () => {
  const p = listPresets().find((x) => x.name === 'seigaiha');
  assert.equal(p.group, 'japanese');
});

test('nature group exists with reeds', () => {
  const g = listGroups().find((x) => x.id === 'nature');
  assert.ok(g, 'nature group exists');
  for (const n of ['reeds', 'migration', 'komorebi', 'palms'])
    assert.ok(
      g.presets.some((p) => p.name === n),
      `nature has ${n}`
    );
});

test('lounge group exists with tiki', () => {
  const g = listGroups().find((x) => x.id === 'lounge');
  assert.ok(g, 'lounge group exists');
  assert.ok(g.presets.some((p) => p.name === 'tiki'));
});

test('particles group gained rain and fireflies (2026-07-01 gap wave)', () => {
  const g = listGroups().find((x) => x.id === 'particles');
  for (const n of ['rain', 'fireflies'])
    assert.ok(
      g.presets.some((p) => p.name === n),
      `particles has ${n}`
    );
});

test('retro group gained metaballs (2026-07-01 gap wave)', () => {
  const g = listGroups().find((x) => x.id === 'retro');
  assert.ok(
    g.presets.some((p) => p.name === 'metaballs'),
    'retro has metaballs'
  );
});

test('style-wave presets landed in their groups (2026-07-03)', () => {
  const STYLE_WAVE = {
    'art-nouveau': 'classic',
    constructivism: 'classic',
    psychedelia: 'pop',
    brushstroke: 'art',
    'celtic-knot': 'ornamental',
    paisley: 'ornamental',
    azulejo: 'ornamental',
    mudcloth: 'ornamental',
    terrazzo: 'texture',
    cyanotype: 'print',
    screenprint: 'print',
    'transit-diagram': 'dataviz',
  };
  const byName = new Map(listPresets().map((p) => [p.name, p.group]));
  for (const [name, group] of Object.entries(STYLE_WAVE)) {
    assert.equal(byName.get(name), group, `${name} in ${group}`);
  }
});

test('phenomena-wave presets landed in their groups (2026-07-03)', () => {
  const PHENOMENA_WAVE = {
    embers: 'particles',
    lightning: 'atmospheric',
    fog: 'atmospheric',
    constellation: 'particles',
    bubbles: 'particles',
    leaves: 'nature',
  };
  const byName = new Map(listPresets().map((p) => [p.name, p.group]));
  for (const [name, group] of Object.entries(PHENOMENA_WAVE)) {
    assert.equal(byName.get(name), group, `${name} in ${group}`);
  }
});

test('music-wave presets landed in the music group (2026-07-04)', () => {
  // The group itself must be registered with a label, or listGroups()
  // silently drops it and the gallery never shows the tab.
  const music = listGroups().find((x) => x.id === 'music');
  assert.ok(music, 'music group must exist in listGroups()');
  assert.equal(music.label, 'Music');
  const MUSIC_WAVE = {
    'liquid-light': 'music',
    bluenote: 'music',
    starburst: 'music',
    vinyl: 'music',
    prism: 'music',
    'laser-show': 'music',
    scanimate: 'music',
  };
  const byName = new Map(listPresets().map((p) => [p.name, p.group]));
  for (const [name, group] of Object.entries(MUSIC_WAVE)) {
    assert.equal(byName.get(name), group, `${name} in ${group}`);
  }
  assert.equal(
    music.presets.length,
    Object.keys(MUSIC_WAVE).length,
    'music group holds exactly the wave presets'
  );
});
