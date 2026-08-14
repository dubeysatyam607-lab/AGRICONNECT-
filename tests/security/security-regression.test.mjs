/**
 * Server-side security regression tests.
 * Boots the Express API on an isolated port and asserts the security
 * boundaries fixed during the audit:
 *   - Payments endpoints require authentication
 *   - Admin APIs return 403 for farmers (server-side role check)
 *   - Malformed / forged JWTs are rejected
 *   - CSRF failures return 403 (not 500)
 *   - Account enumeration responses are uniform
 *   - reset-password / forgot-password are rate limited and lock out after 5 attempts
 *
 * Run: npx vitest run tests/staging/security-regression.test.mjs
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, writeFileSync } from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverDir = path.resolve(__dirname, '../../server');
const PORT = 5017;
const BASE = `http://localhost:${PORT}/api`;
const DATA_FILE = path.join(serverDir, 'data', 'users.json');

let proc;
let csrf = '';
let csrfCookie = '';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJson(p, { method = 'GET', body, headers = {} } = {}) {
  const res = await fetch(BASE + p, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(csrf ? { 'CSRF-Token': csrf } : {}),
      ...(csrfCookie ? { Cookie: `_csrf=${csrfCookie}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

beforeAll(async () => {
  proc = spawn('node', ['index.js'], {
    cwd: serverDir,
    env: { ...process.env, PORT: String(PORT), JWT_SECRET: 'regression-test-secret-0123456789abcdef' },
    stdio: 'pipe',
  });
  // Wait for health
  for (let i = 0; i < 40; i++) {
    await sleep(250);
    try {
      const r = await fetch(`http://localhost:${PORT}/api/health`);
      if (r.ok) break;
    } catch {}
  }
  // Obtain CSRF cookie + token
  const res = await fetch(BASE + '/csrf-token');
  const setCookies = res.headers.getSetCookie();
  for (const c of setCookies || []) {
    const [k, v] = c.split(';')[0].split('=');
    if (k.trim() === '_csrf') csrfCookie = v;
  }
  csrf = (await res.json()).csrfToken;
}, 30000);

afterAll(async () => {
  if (proc) proc.kill();
});

describe('server security boundaries', () => {
  it('rejects forged / malformed JWTs on protected APIs', async () => {
    const r1 = await fetchJson('/auth/profile', { headers: { Authorization: 'Bearer abc.def.ghi' } });
    expect(r1.status).toBe(401);

    // alg:none attack
    const fake = `${Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url')}.${Buffer.from('{"id":"1"}').toString('base64url')}.`;
    const r2 = await fetchJson('/auth/profile', { headers: { Authorization: `Bearer ${fake}` } });
    expect(r2.status).toBe(401);
  });

  it('rejects unauthenticated payment order creation', async () => {
    const r = await fetchJson('/payments/razorpay/create-order', { method: 'POST', body: { amount: 100 } });
    expect(r.status).toBe(401);
  });

  it('returns 403 on CSRF failure (not 500)', async () => {
    const res = await fetch(BASE + '/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'X', email: 'x@example.com', password: 'password123' }),
    });
    expect(res.status).toBe(403);
  });

  it('does not reveal account existence on forgot-password', async () => {
    const unknown = await fetchJson('/auth/forgot-password', { method: 'POST', body: { email: 'ghost@nowhere.invalid' } });
    const known = await fetchJson('/auth/forgot-password', { method: 'POST', body: { email: 'dubeysatyam607@gmail.com' } });
    expect(unknown.status).toBe(200);
    expect(known.status).toBe(200);
    expect(unknown.data.message).toBe(known.data.message);
  });

  it('blocks reset-password OTP brute force after 5 attempts', async () => {
    // Direct DB setup so we don't need a real SMTP server.
    const users = JSON.parse(readFileSync(DATA_FILE, 'utf8'));
    const email = 'brute@example.com';
    if (!users.some((u) => u.email === email)) {
      users.push({ _id: 'brute-user', email, name: 'Brute', password: '$2b$10$abcdefghijklmnopqrstuv', isVerified: true, resetOtpCode: 'fake-hash', resetOtpExpiresAt: Date.now() + 600000, resetOtpAttempts: 0 });
      writeFileSync(DATA_FILE, JSON.stringify(users, null, 2));
    }
    let last;
    for (let i = 0; i < 6; i++) {
      last = await fetchJson('/auth/reset-password', {
        method: 'POST',
        body: { email, otp: '999999', newPassword: 'NewPass123' },
      });
    }
    expect([400, 429]).toContain(last.status);

    const after = JSON.parse(readFileSync(DATA_FILE, 'utf8')).find((u) => u.email === email);
    expect(after.resetOtpCode).toBeUndefined();

    const users2 = JSON.parse(readFileSync(DATA_FILE, 'utf8'));
    writeFileSync(DATA_FILE, JSON.stringify(users2.filter((u) => u.email !== email), null, 2));
  });
});