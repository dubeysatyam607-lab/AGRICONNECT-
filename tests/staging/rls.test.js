// Polyfill fetch for Node environment
import fetch from 'node-fetch';
if (typeof globalThis.fetch === 'undefined') {
  globalThis.fetch = fetch;
}

import 'dotenv/config';

import { describe, it, expect } from 'vitest';

async function login(email: string, password: string) {
  const res = await fetch(`${process.env.SUPABASE_URL}/auth/v1/token`, {
    method: 'POST',
    headers: { 'apikey': process.env.SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (!data.access_token) throw new Error('Login failed for ' + email);
  return data.access_token;
}

async function assertSelect(table: string, token: string, expectedStatus: number) {
  const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${table}`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}`, 'apikey': process.env.SUPABASE_ANON_KEY }
  });
  if (res.status !== expectedStatus) {
    throw new Error(`SELECT ${table}: expected ${expectedStatus}, got ${res.status}`);
  }
}

describe('RLS verification', () => {
  it('should enforce row level security as expected', async () => {
    const farmerToken = await login('farmer1@test.local', 'FarmerPass123!');
    const adminToken = await login('admin@test.local', 'AdminPass123!');
    // Farmer should be blocked from reading profiles (owner only)
    await assertSelect('profiles', farmerToken, 403);
    // Admin should succeed
    await assertSelect('profiles', adminToken, 200);
    console.log('✅ RLS verification tests passed');
  });
});
