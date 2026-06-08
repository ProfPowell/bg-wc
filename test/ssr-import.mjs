// SSR smoke: importing the entry modules in a non-browser context (HTMLElement
// shimmed by the SSR framework, but no customElements registry) must not throw.
import { test } from 'node:test';
import assert from 'node:assert/strict';

// Minimal SSR-like globals: a class to extend, but no customElements.
globalThis.HTMLElement = class HTMLElement {};

test('bg-wc.js imports without a customElements registry', async () => {
  await assert.doesNotReject(() => import('../src/bg-wc.js'));
});

test('data-background.js imports without a DOM', async () => {
  await assert.doesNotReject(() => import('../src/data-background.js'));
});
