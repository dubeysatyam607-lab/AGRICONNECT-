// Polyfill fetch for Node environment
import fetch from 'node-fetch';
if (typeof globalThis.fetch === 'undefined') {
  // @ts-expect-error -- Node's global fetch type is not assignable in this test shim.
  (globalThis as any).fetch = fetch;
}

import 'dotenv/config';

import { describe, it, expect } from 'vitest';

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

describe.skipIf(!supabaseUrl || !publishableKey)('RLS verification', () => {
  it('should enforce row level security as expected', async () => {
    // Unauthenticated request should be blocked
    const unauthRes = await fetch(`${supabaseUrl}/rest/v1/profiles`, {
      method: 'GET',
      headers: { 'apikey': publishableKey }
    });
    if (unauthRes.status !== 401 && unauthRes.status !== 403) {
      throw new Error(`Unauthenticated SELECT profiles: expected 401 or 403, got ${unauthRes.status}`);
    }
    console.log('✅ RLS verification tests passed');
  });
});
