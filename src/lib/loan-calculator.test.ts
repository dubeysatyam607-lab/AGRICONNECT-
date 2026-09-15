import { describe, it, expect } from 'vitest';
import { calculateEmi, validateEmiInput } from './loan-calculator';

describe('loan-calculator engine', () => {
  it('rejects invalid inputs with actionable errors', () => {
    const bad = validateEmiInput({ principal: 5, annualRatePct: 7, tenureMonths: 12 });
    expect(bad.valid).toBe(false);
    expect(bad.errors.length).toBeGreaterThan(0);
    expect(calculateEmi({ principal: 5, annualRatePct: 7, tenureMonths: 12 })).toBeNull();
    expect(calculateEmi({ principal: 100000, annualRatePct: -1, tenureMonths: 12 })).toBeNull();
    expect(calculateEmi({ principal: 100000, annualRatePct: 7, tenureMonths: 0 })).toBeNull();
  });

  it('computes a standard EMI correctly for 7% / 12 months', () => {
    const r = calculateEmi({ principal: 100000, annualRatePct: 7, tenureMonths: 12 });
    expect(r).not.toBeNull();
    // Known closed-form value for P=100000, r=7%, n=12.
    expect(r!.emi).toBeCloseTo(8652.67, 1);
    expect(r!.totalInterest).toBeCloseTo(r!.totalPayment - 100000, 1);
  });

  it('handles 0% loans (simple division, no NaN)', () => {
    const r = calculateEmi({ principal: 120000, annualRatePct: 0, tenureMonths: 12 });
    expect(r).not.toBeNull();
    expect(r!.emi).toBeCloseTo(10000, 0);
    expect(r!.totalInterest).toBeCloseTo(0, 0);
  });

  it('is monotonic: longer tenure lowers EMI but raises total interest', () => {
    const short = calculateEmi({ principal: 300000, annualRatePct: 7, tenureMonths: 12 });
    const long = calculateEmi({ principal: 300000, annualRatePct: 7, tenureMonths: 60 });
    expect(long!.emi).toBeLessThan(short!.emi);
    expect(long!.totalInterest).toBeGreaterThan(short!.totalInterest);
  });
});