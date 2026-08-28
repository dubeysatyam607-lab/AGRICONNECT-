import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PAYMENT_CONFIG,
  buildUpiUri,
  normalizeUtr,
  validateUtr,
  prepareProofImage,
} from '@/features/payments/domain/manualUpi';

describe('manualUpi — Default Config & Security', () => {
  it('uses 7067820256@airtel as the official default UPI ID', () => {
    expect(DEFAULT_PAYMENT_CONFIG.upi_id).toBe('7067820256@airtel');
    expect(DEFAULT_PAYMENT_CONFIG.payee_name).toBe('SATYAM DUBEY');
    expect(DEFAULT_PAYMENT_CONFIG.currency).toBe('INR');
  });

  it('builds a secure upi://pay URI with 7067820256@airtel properly encoded', () => {
    const uri = buildUpiUri(DEFAULT_PAYMENT_CONFIG, 49, 'AgriConnect Subscription');
    expect(uri.startsWith('upi://pay?')).toBe(true);
    expect(uri).toContain('pa=7067820256%40airtel');
    expect(uri).toContain('pn=SATYAM%20DUBEY');
    expect(uri).toContain('am=49');
    expect(uri).toContain('cu=INR');
    expect(uri).toContain('tn=AgriConnect%20Subscription');
  });
});

describe('manualUpi — UTR Validation & Anti-Injection Security', () => {
  it('normalizes UTR to uppercase and strips whitespace', () => {
    expect(normalizeUtr('  ab 12 cd ')).toBe('AB12CD');
    expect(normalizeUtr('415974832196')).toBe('415974832196');
  });

  it('accepts valid banking UTRs (alphanumeric, dashes, slashes)', () => {
    expect(validateUtr('415974832196')).toBeNull();
    expect(validateUtr('SBIN5512345678901234')).toBeNull();
    expect(validateUtr('AB-12/CD45')).toBeNull();
  });

  it('rejects short (< 6 chars) and excessively long (> 40 chars) UTRs', () => {
    expect(validateUtr('abc')).toMatch(/at least 6/);
    expect(validateUtr('A'.repeat(41))).toMatch(/at most 40/);
  });

  it('rejects SQL injection, XSS, and script injection payload attempts in UTR', () => {
    expect(validateUtr("'; DROP TABLE payment_requests;--")).toMatch(/letters, digits/);
    expect(validateUtr('<script>alert(1)</script>')).toMatch(/letters, digits/);
    expect(validateUtr('SELECT * FROM users')).toMatch(/letters, digits/); // spaces stripped, but other chars checked
    expect(validateUtr('AB_12@#$')).toMatch(/letters, digits/);
    expect(validateUtr('123456%27')).toMatch(/letters, digits/);
  });
});

describe('manualUpi — Proof File Security Validation', () => {
  it('rejects null/missing file', async () => {
    const res = await prepareProofImage(null as any);
    expect(res.error).toMatch(/select a payment screenshot/i);
  });

  it('rejects oversized files (> 5MB)', async () => {
    const hugeBlob = new Blob([new Uint8Array(6 * 1024 * 1024)], { type: 'image/png' });
    const hugeFile = new File([hugeBlob], 'huge.png', { type: 'image/png' });
    const res = await prepareProofImage(hugeFile);
    expect(res.error).toMatch(/under 5 MB/i);
  });
});