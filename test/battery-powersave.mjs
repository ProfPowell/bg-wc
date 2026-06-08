// observeBatteryPowerSave must honour an AbortSignal so a <bg-wc> that
// disconnects before navigator.getBattery() resolves doesn't leak battery
// listeners (gl-wc-27s).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { observeBatteryPowerSave } from '../src/util/pause.js';

// Node provides a read-only `navigator`; override it for the test.
function setNavigator(v) {
  Object.defineProperty(globalThis, 'navigator', { value: v, configurable: true, writable: true });
}

function fakeBattery() {
  let added = 0;
  let removed = 0;
  return {
    level: 1,
    charging: true,
    addEventListener: () => {
      added += 1;
    },
    removeEventListener: () => {
      removed += 1;
    },
    counts: () => ({ added, removed }),
  };
}

test('aborting before getBattery resolves attaches no listeners', async () => {
  const battery = fakeBattery();
  let resolve;
  setNavigator({
    getBattery: () =>
      new Promise((r) => {
        resolve = r;
      }),
  });
  const ctrl = new AbortController();
  const p = observeBatteryPowerSave(() => {}, ctrl.signal);
  ctrl.abort();
  resolve(battery);
  const dispose = await p;
  assert.equal(battery.counts().added, 0, 'no listeners attached after abort');
  assert.doesNotThrow(() => dispose());
});

test('aborting after attach removes the listeners', async () => {
  const battery = fakeBattery();
  setNavigator({ getBattery: async () => battery });
  const ctrl = new AbortController();
  await observeBatteryPowerSave(() => {}, ctrl.signal);
  assert.equal(battery.counts().added, 2, 'levelchange + chargingchange attached');
  ctrl.abort();
  assert.equal(battery.counts().removed, 2, 'both removed on abort');
});
