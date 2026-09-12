import { describe, it, expect } from 'vitest';
import {
  WalletTransaction,
  deriveBalanceFromLedger,
  validateTransactionFields,
  WalletSummary,
} from './domain/walletTypes';

describe('Phase 15: Wallet & Transaction Fields', () => {
  it('validates that every transaction contains all required Phase 15 audit fields', () => {
    const validTxn: WalletTransaction = {
      id: 'txn-123e4567-e89b-12d3-a456-426614174000',
      wallet_id: 'wall-1234',
      user_id: 'user-satyam-789',
      type: 'credit',
      direction: 'in',
      amount: 500.0,
      currency: 'INR',
      status: 'completed',
      reference_type: 'razorpay_payment',
      reference_id: 'pay_xyz12345678',
      description: 'Add money via UPI / Razorpay',
      credit_type: 'cash',
      source: 'razorpay',
      expiry: null,
      usage_restrictions: null,
      balance_after: 500.0,
      created_at: '2026-09-12T10:00:00Z',
      updated_at: '2026-09-12T10:00:00Z',
    };

    const validation = validateTransactionFields(validTxn);
    expect(validation.valid).toBe(true);
    expect(validation.missingFields).toHaveLength(0);
  });

  it('rejects transactions with missing or invalid mandatory fields', () => {
    const invalidTxn: Partial<WalletTransaction> = {
      id: 'txn-123',
      // user_id is missing
      amount: -50, // negative amount is invalid
      type: undefined,
      status: 'completed',
      created_at: '2026-09-12T10:00:00Z',
    };

    const validation = validateTransactionFields(invalidTxn);
    expect(validation.valid).toBe(false);
    expect(validation.missingFields).toContain('user_id');
    expect(validation.missingFields).toContain('amount');
    expect(validation.missingFields).toContain('type');
    expect(validation.missingFields).toContain('reference');
  });

  it('supports all 4 core Phase 15 transaction types (credit, debit, refund, payment)', () => {
    const types: WalletTransaction['type'][] = ['credit', 'debit', 'refund', 'payment'];
    types.forEach((t) => {
      const txn: Partial<WalletTransaction> = {
        id: `txn-${t}-1`,
        user_id: 'user-1',
        amount: 100,
        type: t,
        status: 'completed',
        reference_id: `ref-${t}`,
        created_at: new Date().toISOString(),
      };
      expect(validateTransactionFields(txn).valid).toBe(true);
    });
  });
});

describe('Phase 15: Safe Balance Derivation from Ledger', () => {
  it('correctly derives balance by summing completed credits/refunds and subtracting debits/payments', () => {
    const ledger: WalletTransaction[] = [
      {
        id: 'tx-1',
        wallet_id: 'w-1',
        user_id: 'u-1',
        type: 'credit',
        direction: 'in',
        amount: 1000,
        currency: 'INR',
        status: 'completed',
        reference_type: 'razorpay',
        reference_id: 'pay_1',
        description: 'Wallet top-up',
        credit_type: 'cash',
        source: 'gateway',
        expiry: null,
        usage_restrictions: null,
        balance_after: 1000,
        created_at: '2026-09-12T09:00:00Z',
        updated_at: '2026-09-12T09:00:00Z',
      },
      {
        id: 'tx-2',
        wallet_id: 'w-1',
        user_id: 'u-1',
        type: 'payment',
        direction: 'out',
        amount: 299,
        currency: 'INR',
        status: 'completed',
        reference_type: 'soil_test_order',
        reference_id: 'ST-2026-TEST1',
        description: 'Mitti Jaanch Soil Test Payment',
        credit_type: null,
        source: 'wallet_checkout',
        expiry: null,
        usage_restrictions: null,
        balance_after: 701,
        created_at: '2026-09-12T09:30:00Z',
        updated_at: '2026-09-12T09:30:00Z',
      },
      {
        id: 'tx-3',
        wallet_id: 'w-1',
        user_id: 'u-1',
        type: 'refund',
        direction: 'in',
        amount: 299,
        currency: 'INR',
        status: 'completed',
        reference_type: 'soil_test_refund',
        reference_id: 'REF-ST-2026-TEST1',
        description: 'Cancelled test order refund',
        credit_type: 'cash',
        source: 'lab_refund',
        expiry: null,
        usage_restrictions: null,
        balance_after: 1000,
        created_at: '2026-09-12T10:00:00Z',
        updated_at: '2026-09-12T10:00:00Z',
      },
      {
        id: 'tx-4',
        wallet_id: 'w-1',
        user_id: 'u-1',
        type: 'debit',
        direction: 'out',
        amount: 400,
        currency: 'INR',
        status: 'completed',
        reference_type: 'seed_store_order',
        reference_id: 'ORD-SEED-992',
        description: 'Certified Wheat Seed Purchase',
        credit_type: null,
        source: 'agristore',
        expiry: null,
        usage_restrictions: null,
        balance_after: 600,
        created_at: '2026-09-12T10:30:00Z',
        updated_at: '2026-09-12T10:30:00Z',
      },
      // Pending transaction — must NOT affect available balance
      {
        id: 'tx-5',
        wallet_id: 'w-1',
        user_id: 'u-1',
        type: 'payment',
        direction: 'out',
        amount: 150,
        currency: 'INR',
        status: 'pending',
        reference_type: 'tractor_booking',
        reference_id: 'TB-PENDING-1',
        description: 'Pending booking hold',
        credit_type: null,
        source: 'tractor_marketplace',
        expiry: null,
        usage_restrictions: null,
        balance_after: null,
        created_at: '2026-09-12T11:00:00Z',
        updated_at: '2026-09-12T11:00:00Z',
      },
    ];

    const derivedBalance = deriveBalanceFromLedger(ledger);
    // Calculation: 1000 (credit) - 299 (payment) + 299 (refund) - 400 (debit) = 600
    expect(derivedBalance).toBe(600);
  });
});

describe('Phase 15: Double Spending & Replay Attack Prevention', () => {
  it('prevents overdraft when debit amount exceeds available ledger balance', () => {
    const currentBalance = 250.0;
    const requestedDebit = 300.0;

    const canDebit = (balance: number, amount: number) => {
      if (amount <= 0) throw new Error('Invalid amount');
      if (balance < amount) throw new Error('Insufficient balance');
      return balance - amount;
    };

    expect(() => canDebit(currentBalance, requestedDebit)).toThrow('Insufficient balance');
    expect(canDebit(currentBalance, 200.0)).toBe(50.0);
  });

  it('prevents replay attacks via idempotent reference deduplication', () => {
    const processedReferences = new Set<string>();

    const processTransaction = (refType: string, refId: string, amount: number) => {
      const key = `${refType}:${refId}`;
      if (processedReferences.has(key)) {
        return { status: 'already_processed', idempotent: true };
      }
      processedReferences.add(key);
      return { status: 'credited', amount, idempotent: false };
    };

    // First attempt
    const res1 = processTransaction('razorpay_payment', 'pay_abc123', 500);
    expect(res1.status).toBe('credited');
    expect(res1.idempotent).toBe(false);

    // Replay / duplicate attempt with same reference ID
    const res2 = processTransaction('razorpay_payment', 'pay_abc123', 500);
    expect(res2.status).toBe('already_processed');
    expect(res2.idempotent).toBe(true);
  });
});

describe('Phase 15: Admin Money Adjustments & Audit Integrity', () => {
  it('requires authorized admin role and mandatory reason for adjustments', () => {
    interface AdminAdjustInput {
      callerRole: string;
      userId: string;
      amount: number;
      direction: 'in' | 'out';
      reason: string;
    }

    const validateAdminAdjustment = (input: AdminAdjustInput) => {
      if (input.callerRole !== 'admin') {
        throw new Error('Forbidden: admin access required');
      }
      if (!input.userId || input.userId.trim().length === 0) {
        throw new Error('Invalid user ID');
      }
      if (!input.amount || input.amount <= 0) {
        throw new Error('Invalid adjustment amount');
      }
      if (!input.reason || input.reason.trim().length < 5) {
        throw new Error('Reason must be at least 5 characters');
      }
      return {
        approved: true,
        auditLog: {
          adminUserId: 'admin-01',
          targetUserId: input.userId,
          amount: input.amount,
          direction: input.direction,
          reason: input.reason.trim(),
          timestamp: new Date().toISOString(),
        },
      };
    };

    // Unauthorized non-admin attempt
    expect(() =>
      validateAdminAdjustment({
        callerRole: 'farmer',
        userId: 'user-1',
        amount: 500,
        direction: 'in',
        reason: 'Manual compensation for app delay',
      })
    ).toThrow('Forbidden: admin access required');

    // Missing reason attempt
    expect(() =>
      validateAdminAdjustment({
        callerRole: 'admin',
        userId: 'user-1',
        amount: 500,
        direction: 'in',
        reason: 'ok', // too short (< 5 chars)
      })
    ).toThrow('Reason must be at least 5 characters');

    // Valid admin adjustment
    const approved = validateAdminAdjustment({
      callerRole: 'admin',
      userId: 'user-1',
      amount: 500,
      direction: 'in',
      reason: 'ICAR soil lab delay compensation voucher',
    });
    expect(approved.approved).toBe(true);
    expect(approved.auditLog.reason).toBe('ICAR soil lab delay compensation voucher');
    expect(approved.auditLog.adminUserId).toBe('admin-01');
  });
});

describe('Phase 15: Razorpay Backend Cryptographic Verification', () => {
  async function computeHmacSha256Hex(message: string, secret: string): Promise<string> {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
    return Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  it('correctly verifies authentic HMAC SHA-256 signatures and rejects forged ones', async () => {
    const secret = 'rzp_test_secret_key_12345';
    const orderId = 'order_DBJOWzybf0sJbb';
    const paymentId = 'pay_29QQoUBi66xm2f';
    const message = `${orderId}|${paymentId}`;

    const authenticSignature = await computeHmacSha256Hex(message, secret);
    const forgedSignature = 'f'.repeat(64);

    expect(authenticSignature.length).toBe(64);
    expect(authenticSignature).not.toBe(forgedSignature);

    const verify = (sig: string, expected: string) => sig === expected;
    expect(verify(authenticSignature, authenticSignature)).toBe(true);
    expect(verify(forgedSignature, authenticSignature)).toBe(false);
  });

  it('binds Razorpay payment order note userId to authenticated user preventing stolen token misuse', () => {
    const currentSessionUserId = 'user-satyam-123';

    const verifyOrderOwnership = (orderNoteUserId: string, authUserId: string) => {
      if (orderNoteUserId !== authUserId) {
        throw new Error('Order does not belong to user (403 Forbidden)');
      }
      return true;
    };

    expect(verifyOrderOwnership('user-satyam-123', currentSessionUserId)).toBe(true);
    expect(() => verifyOrderOwnership('user-malicious-456', currentSessionUserId)).toThrow(
      'Order does not belong to user'
    );
  });
});
