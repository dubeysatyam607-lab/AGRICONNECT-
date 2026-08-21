import { describe, it, expect } from 'vitest';
import {
  validateAadhaarVerhoeff,
  maskAadhaarNumber,
  maskKccNumber,
  validateKccCard,
  SUPPORTED_KCC_BANKS,
} from './FarmerKYC';

describe('FarmerKYC — UIDAI Aadhaar Verhoeff Validation & Masking', () => {
  it('validates a correct Verhoeff checksum 12-digit Aadhaar number', () => {
    // Known valid Verhoeff numbers
    const validNumber = '234567890124';

    // Testing algorithmic check on valid candidate
    const result = validateAadhaarVerhoeff(validNumber);
    expect(result.valid).toBe(true);
  });

  it('rejects empty, short, or invalid-length Aadhaar numbers', () => {
    expect(validateAadhaarVerhoeff('').valid).toBe(false);
    expect(validateAadhaarVerhoeff('12345').error).toContain('12 digits');
    expect(validateAadhaarVerhoeff('123456789012345').error).toContain('12 digits');
  });

  it('rejects Aadhaar numbers starting with 0 or 1 per UIDAI specifications', () => {
    expect(validateAadhaarVerhoeff('012345678901').valid).toBe(false);
    expect(validateAadhaarVerhoeff('012345678901').error).toContain('cannot start with 0 or 1');
    expect(validateAadhaarVerhoeff('112345678901').valid).toBe(false);
  });

  it('rejects repeating identical digits', () => {
    expect(validateAadhaarVerhoeff('999999999999').valid).toBe(false);
    expect(validateAadhaarVerhoeff('999999999999').error).toContain('repeated digits');
  });

  it('masks Aadhaar numbers to show only last 4 digits for DPDP compliance', () => {
    expect(maskAadhaarNumber('543210987654')).toBe('XXXX-XXXX-7654');
    expect(maskAadhaarNumber('9876 5432 1098')).toBe('XXXX-XXXX-1098');
    expect(maskAadhaarNumber('')).toBe('');
  });

  it('masks Kisan Credit Card numbers correctly', () => {
    expect(maskKccNumber('4532987612345678')).toBe('XXXX-XXXX-XXXX-5678');
    expect(maskKccNumber('123456789012')).toBe('XXXX-XXXX-XXXX-9012');
  });
});

describe('FarmerKYC — Kisan Credit Card (KCC) Validation', () => {
  it('validates 16-digit card number and recognized issuing bank', () => {
    const valid = validateKccCard('4532987612345678', 'SBI');
    expect(valid.valid).toBe(true);
  });

  it('rejects missing bank selection or invalid card length', () => {
    expect(validateKccCard('4532987612345678', '').valid).toBe(false);
    expect(validateKccCard('123', 'SBI').valid).toBe(false);
  });

  it('provides comprehensive list of supported PSU and RRB banks with 4% subsidized interest rate', () => {
    expect(SUPPORTED_KCC_BANKS.length).toBeGreaterThanOrEqual(10);
    const sbi = SUPPORTED_KCC_BANKS.find((b) => b.code === 'SBI');
    expect(sbi?.subsidizedRate).toBe('4.00%');
  });
});
