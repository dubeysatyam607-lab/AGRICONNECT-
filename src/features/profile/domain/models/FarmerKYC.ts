/**
 * Farmer KYC & Government Verification Domain Models & Algorithms.
 * Implements UIDAI Verhoeff algorithm for Aadhaar validation,
 * Kisan Credit Card (KCC) banking verification, and DPDP masking.
 */

// ── Verhoeff Checksum Algorithm for Aadhaar (UIDAI specification) ─────────
const d: number[][] = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];

const p: number[][] = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

const inv: number[] = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9];

/**
 * Computes the 12th Verhoeff checksum digit for any 11-digit prefix.
 */
export function generateVerhoeffChecksum(digits11: string): string {
  const clean = digits11.replace(/\D/g, '').slice(0, 11);
  const inverted = clean.split('').reverse().map(Number);
  let c = 0;
  for (let i = 0; i < inverted.length; i++) {
    c = d[c][p[(i + 1) % 8][inverted[i]]];
  }
  return String(inv[c]);
}

/**
 * Validates a 12-digit Aadhaar number using the UIDAI Verhoeff algorithm.
 */
export function validateAadhaarVerhoeff(aadhaar: string): { valid: boolean; error?: string } {
  const clean = (aadhaar || '').replace(/\D/g, '');
  if (!clean) {
    return { valid: false, error: 'Aadhaar number cannot be empty.' };
  }
  if (clean.length !== 12) {
    return { valid: false, error: 'Aadhaar number must be exactly 12 digits.' };
  }
  if (/^[01]/.test(clean)) {
    return { valid: false, error: 'Aadhaar number cannot start with 0 or 1.' };
  }
  if (/^(\d)\1{11}$/.test(clean)) {
    return { valid: false, error: 'Aadhaar number cannot consist of identical repeated digits.' };
  }

  // Verhoeff checksum calculation
  let c = 0;
  const invertedArray = clean.split('').reverse().map(Number);

  for (let i = 0; i < invertedArray.length; i++) {
    c = d[c][p[i % 8][invertedArray[i]]];
  }

  if (c !== 0) {
    return { valid: false, error: 'Invalid Aadhaar checksum digits.' };
  }

  return { valid: true };
}

/**
 * Masks Aadhaar number to display only last 4 digits (e.g., 'XXXX-XXXX-1234')
 */
export function maskAadhaarNumber(aadhaar?: string | null): string {
  if (!aadhaar) return '';
  const clean = aadhaar.replace(/\D/g, '');
  if (clean.length < 4) return clean;
  const last4 = clean.slice(-4);
  return `XXXX-XXXX-${last4}`;
}

/**
 * Masks Kisan Credit Card number (e.g., 'XXXX-XXXX-XXXX-5678')
 */
export function maskKccNumber(kccNumber?: string | null): string {
  if (!kccNumber) return '';
  const clean = kccNumber.replace(/\D/g, '');
  if (clean.length < 4) return clean;
  const last4 = clean.slice(-4);
  return `XXXX-XXXX-XXXX-${last4}`;
}

/**
 * Supported Indian Banks for Kisan Credit Card (KCC) Verification
 */
export interface IKccBank {
  code: string;
  name: string;
  category: 'PSU' | 'Private' | 'RRB' | 'Cooperative';
  defaultInterestRate: string;
  subsidizedRate: string;
}

export const SUPPORTED_KCC_BANKS: IKccBank[] = [
  { code: 'SBI', name: 'State Bank of India (SBI)', category: 'PSU', defaultInterestRate: '7.00%', subsidizedRate: '4.00%' },
  { code: 'PNB', name: 'Punjab National Bank (PNB)', category: 'PSU', defaultInterestRate: '7.00%', subsidizedRate: '4.00%' },
  { code: 'BOB', name: 'Bank of Baroda (BoB)', category: 'PSU', defaultInterestRate: '7.00%', subsidizedRate: '4.00%' },
  { code: 'CANARA', name: 'Canara Bank', category: 'PSU', defaultInterestRate: '7.00%', subsidizedRate: '4.00%' },
  { code: 'UNION', name: 'Union Bank of India', category: 'PSU', defaultInterestRate: '7.00%', subsidizedRate: '4.00%' },
  { code: 'BOI', name: 'Bank of India', category: 'PSU', defaultInterestRate: '7.00%', subsidizedRate: '4.00%' },
  { code: 'INDIAN', name: 'Indian Bank', category: 'PSU', defaultInterestRate: '7.00%', subsidizedRate: '4.00%' },
  { code: 'CENTRAL', name: 'Central Bank of India', category: 'PSU', defaultInterestRate: '7.00%', subsidizedRate: '4.00%' },
  { code: 'HDFC', name: 'HDFC Bank (Agri Kisan)', category: 'Private', defaultInterestRate: '7.50%', subsidizedRate: '4.00%' },
  { code: 'ICICI', name: 'ICICI Bank (Kisan Credit)', category: 'Private', defaultInterestRate: '7.50%', subsidizedRate: '4.00%' },
  { code: 'AXIS', name: 'Axis Bank (Agri Card)', category: 'Private', defaultInterestRate: '7.50%', subsidizedRate: '4.00%' },
  { code: 'KOTAK', name: 'Kotak Mahindra Bank', category: 'Private', defaultInterestRate: '7.50%', subsidizedRate: '4.00%' },
  { code: 'NABARD_RRB', name: 'NABARD Regional Rural Bank (RRB)', category: 'RRB', defaultInterestRate: '7.00%', subsidizedRate: '4.00%' },
  { code: 'COOP', name: 'District Central Cooperative Bank (DCCB)', category: 'Cooperative', defaultInterestRate: '7.00%', subsidizedRate: '4.00%' },
];

/**
 * Validates Kisan Credit Card (KCC) input.
 */
export function validateKccCard(kccNumber: string, bankCode: string): { valid: boolean; error?: string } {
  const clean = (kccNumber || '').replace(/\D/g, '');
  if (!clean) {
    return { valid: false, error: 'KCC card or account number cannot be empty.' };
  }
  if (clean.length !== 16 && clean.length !== 12 && clean.length !== 14) {
    return { valid: false, error: 'KCC number must be 12 to 16 digits long.' };
  }
  if (!bankCode) {
    return { valid: false, error: 'Please select your KCC issuing bank.' };
  }
  return { valid: true };
}

/**
 * KCC Verification Record
 */
export interface IKccVerificationDetails {
  kccNumberMasked: string;
  bankCode: string;
  bankName: string;
  verifiedAt: string;
  creditLimit: number; // e.g. 150000 (₹1.5 Lakhs)
  linkedLandAcres: number;
  interestSubventionTier: string; // "4% subsidized rate under PM-KISAN"
  status: 'VERIFIED' | 'PENDING' | 'EXPIRED';
}

/**
 * Complete Farmer KYC State
 */
export interface IFarmerKYCState {
  isAadhaarVerified: boolean;
  aadhaarMasked?: string;
  aadhaarVerifiedAt?: string;
  isKccVerified: boolean;
  kccDetails?: IKccVerificationDetails;
}
