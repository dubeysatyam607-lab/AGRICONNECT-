/**
 * Loan calculator engine (pure, tested). Enforces honest math: no invented
 * rates, no negative-interest illusions, sane input bounds.
 */

export interface EmiInput {
  principal: number;
  annualRatePct: number;
  tenureMonths: number;
}

export interface EmiResult {
  principal: number;
  annualRatePct: number;
  tenureMonths: number;
  emi: number;
  totalPayment: number;
  totalInterest: number;
}

export interface EmiValidation {
  valid: boolean;
  errors: string[];
}

export function validateEmiInput(input: EmiInput): EmiValidation {
  const errors: string[] = [];
  const { principal, annualRatePct, tenureMonths } = input;
  if (!Number.isFinite(principal) || principal < 1000 || principal > 50_000_000) {
    errors.push("Principal must be between ₹1,000 and ₹5,00,00,000.");
  }
  if (!Number.isFinite(annualRatePct) || annualRatePct < 0 || annualRatePct > 50) {
    errors.push("Annual interest rate must be between 0% and 50%.");
  }
  if (!Number.isInteger(tenureMonths) || tenureMonths < 1 || tenureMonths > 120) {
    errors.push("Tenure must be a whole number of months between 1 and 120.");
  }
  return { valid: errors.length === 0, errors };
}

/** Monthly EMI via the standard reducing-balance formula. 0% is handled. */
export function calculateEmi(input: EmiInput): EmiResult | null {
  const check = validateEmiInput(input);
  if (!check.valid) return null;
  const { principal, annualRatePct, tenureMonths } = input;

  let emi: number;
  if (annualRatePct === 0) {
    emi = principal / tenureMonths;
  } else {
    const r = annualRatePct / 12 / 100;
    const n = tenureMonths;
    emi = (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  }
  const totalPayment = emi * tenureMonths;
  return {
    principal,
    annualRatePct,
    tenureMonths,
    emi,
    totalPayment,
    totalInterest: totalPayment - principal,
  };
}