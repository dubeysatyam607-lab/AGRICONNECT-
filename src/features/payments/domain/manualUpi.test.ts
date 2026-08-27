import { describe, expect, it } from 'vitest';
import { buildUpiUri, normalizeUtr, validateUtr } from '@/features/payments/domain/manualUpi';

describe('manualUpi — UTR validation', () => {
  it('normalizes UTR to uppercase and strips whitespace', () => {
    expect(normalizeUtr('  ab 12 cd ')).toBe('AB12CD');
    expect(normalizeUtr('415974832196')).toBe('415974832196');
  });

  it('accepts valid UTRs', () => {
    expect(validateUtr('415974832196')).toBeNull();
    expect(validateUtr('SBIN5512345678901234')).toBeNull();
    expect(validateUtr('AB-12/CD45')).toBeNull();
  });

  it('rejects short / long / invalid-character UTRs', () => {
    expect(validateUtr('abc')).toMatch(/at least 6/);
    expect(validateUtr('A'.repeat(41))).toMatch(/at most 40/);
    expect(validateUtr('AB_12@#$')).toMatch(/letters, digits/);
  });
});

describe('manualUpi — UPI URI builder', () => {
  const cfg = { upi_id: 'agriconnect@upi', payee_name: 'AgriConnect', currency: 'INR' };

  it('builds a proper upi://pay URI with encoded params', () => {
    const uri = buildUpiUri(cfg, 49, 'AgriConnect Farmer Plus');
    expect(uri.startsWith('upi://pay?')).toBe(true);
    expect(uri).toContain('pa=agriconnect%40upi');
    expect(uri).toContain('pn=AgriConnect');
    expect(uri).toContain('am=49');
    expect(uri).toContain('cu=INR');
    expect(uri).toContain('tn=AgriConnect%20Farmer%20Plus');
  });

  it('defaults the note omitted', () => {
    const uri = buildUpiUri(cfg, 99);
    expect(uri).not.toContain('tn=');
    expect(uri).toContain('am=99');
  });
});