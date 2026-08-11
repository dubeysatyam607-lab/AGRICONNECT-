// vitest.setup.ts – global test setup
// Polyfill fetch for Node environments used in tests
import fetch from 'node-fetch';
if (typeof globalThis.fetch === 'undefined') {
  // @ts-expect-error -- Node's global fetch type is not assignable in this test shim.
  (globalThis as any).fetch = fetch;
}

// Ensure global window exists for any test that expects it (jsdom provides it, but fallback for safety)
if (typeof globalThis.window === 'undefined') {
  // @ts-expect-error -- jsdom supplies window for browser-focused tests.
  (globalThis as any).window = {};
}
if (typeof globalThis.document === 'undefined') {
  // @ts-expect-error -- jsdom supplies document for browser-focused tests.
  (globalThis as any).document = {};
}

// Polyfill ResizeObserver (used by recharts ResponsiveContainer in jsdom)
if (typeof globalThis.ResizeObserver === 'undefined') {
  // @ts-expect-error -- the test-only polyfill intentionally supplies this browser API.
  (globalThis as any).ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// Polyfill IntersectionObserver (used by lazy/virtualized lists in jsdom)
if (typeof globalThis.IntersectionObserver === 'undefined') {
  // @ts-expect-error -- the test-only polyfill intentionally supplies this browser API.
  (globalThis as any).IntersectionObserver = class IntersectionObserver {
    constructor() {}
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
    root = null;
    rootMargin = '';
    thresholds = [];
  };
}
