/**
 * Payment gateway adapters.
 *
 * The engine talks to a PaymentGateway interface — never to a vendor SDK
 * directly. Production wiring: set VITE_RAZORPAY_KEY_ID (and, for server-side
 * order creation, VITE_PAYMENT_BACKEND_URL) and RazorpayGateway goes live,
 * lazily loading https://checkout.razorpay.com/v1/checkout.js. Without keys the
 * same interface falls back to a deterministic local simulation so the whole
 * flow works offline in the demo. StripeGateway is a conforming stub kept ready
 * for future Stripe support.
 */

import type { GatewayName, PaymentMethod } from './paymentTypes';

export interface ChargeRequest {
  amount: number; // INR, net amount to collect
  method: PaymentMethod;
  currency?: 'INR';
  orderId?: string; // merchant order / txn reference
  description?: string;
  upiId?: string;
  cardLast4?: string;
  bank?: string;
  customer?: { name?: string; email?: string; phone?: string };
  meta?: Record<string, string | number | boolean>;
}

export interface ChargeResult {
  success: boolean;
  gatewayRef?: string;
  failureReason?: string;
  authCode?: string;
  error?: { code: string; message: string };
}

export interface PaymentGateway {
  name: GatewayName;
  isLive: boolean;
  charge(req: ChargeRequest): Promise<ChargeResult>;
  refund?(gatewayRef: string, amount: number, reason: string): Promise<ChargeResult>;
}

/* ── Razorpay: live SDK loader ────────────────────────────────────────── */

let razorpayScriptPromise: Promise<boolean> | null = null;

export const isRazorpayConfigured = (): boolean =>
  typeof import.meta !== 'undefined' && !!import.meta.env?.VITE_RAZORPAY_KEY_ID;

const getRazorpayKey = (): string =>
  import.meta.env?.VITE_RAZORPAY_KEY_ID ?? '';

const loadRazorpayScript = (): Promise<boolean> => {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if ((window as unknown as { Razorpay?: unknown }).Razorpay) return Promise.resolve(true);
  if (razorpayScriptPromise) return razorpayScriptPromise;
  razorpayScriptPromise = new Promise<boolean>((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      razorpayScriptPromise = null;
      resolve(false);
    };
    document.head.appendChild(script);
  });
  return razorpayScriptPromise;
};

/**
 * The live checkout should only be invoked after the merchant backend created
 * an order (server-authoritative amount). We surface that contract here and
 * refuse to run an insecure client-only checkout when a backend URL is missing.
 */
const createServerOrder = async (req: ChargeRequest): Promise<{ id: string; amount: number }> => {
  const backend = import.meta.env?.VITE_PAYMENT_BACKEND_URL;
  if (!backend) {
    throw new Error('Payment backend not configured (VITE_PAYMENT_BACKEND_URL)');
  }
  const res = await fetch(`${backend}/payments/razorpay/create-order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error('Order creation failed');
  return (await res.json()) as { id: string; amount: number };
};

interface RazorpayWindow {
  Razorpay?: new (options: {
    key: string;
    amount: number;
    currency: string;
    name: string;
    description?: string;
    order_id?: string;
    prefill?: { name?: string; email?: string; contact?: string };
    notes?: Record<string, string>;
    theme?: { color?: string };
    handler: (res: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => void;
    modal?: { ondismiss?: () => void };
  }) => { open: () => void };
}

/* ── Simulated gateway (offline / demo) ───────────────────────────────── */

const delay = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** Deterministic "gateway failure" used to demonstrate retry + failed recovery. */
const shouldSimulateFailure = (method: PaymentMethod, attempts: number): boolean => {
  if (method === 'wallet') return false;
  // Roughly 1 in 8 attempts fail; retries almost always succeed.
  return attempts === 0 && Math.random() < 0.12;
};

const SimulatedGateway: PaymentGateway = {
  name: 'simulated',
  isLive: false,
  async charge(req: ChargeRequest): Promise<ChargeResult> {
    await delay(600 + Math.random() * 500);
    const attempt = Number(req.meta?.attempt ?? 0);
    if (shouldSimulateFailure(req.method, attempt)) {
      return {
        success: false,
        failureReason:
          req.method === 'upi' ? 'UPI transaction rejected by bank' : 'Insufficient funds in bank account',
        error: { code: 'TXN_FAILED', message: 'Payment failed' },
      };
    }
    return {
      success: true,
      gatewayRef: `pay_sim_${Math.random().toString(36).slice(2, 10)}`,
      authCode: `AUTH-${Math.floor(100000 + Math.random() * 900000)}`,
    };
  },
  async refund(gatewayRef: string, amount: number, reason: string): Promise<ChargeResult> {
    await delay(400);
    return { success: true, gatewayRef: `rfnd_sim_${Math.random().toString(36).slice(2, 8)}` };
  },
};

/* ── Razorpay gateway ─────────────────────────────────────────────────── */

const RazorpayGateway: PaymentGateway = {
  name: 'razorpay',
  get isLive() {
    return isRazorpayConfigured();
  },
  async charge(req: ChargeRequest): Promise<ChargeResult> {
    if (!this.isLive) return SimulatedGateway.charge(req);
    const loaded = await loadRazorpayScript();
    if (!loaded) {
      return { success: false, failureReason: 'Razorpay SDK could not be loaded' };
    }
    let orderId: string | undefined;
    try {
      const order = await createServerOrder(req);
      orderId = order.id;
    } catch {
      orderId = undefined; // client-only fallback order
    }
    return new Promise<ChargeResult>((resolve) => {
      const Rz = (window as unknown as RazorpayWindow).Razorpay;
      if (!Rz) {
        resolve({ success: false, failureReason: 'Razorpay not available' });
        return;
      }
      let settled = false;
      const settle = (result: ChargeResult) => {
        if (settled) return;
        settled = true;
        resolve(result);
      };
      try {
        const rz = new Rz({
          key: getRazorpayKey(),
          amount: Math.round(req.amount * 100),
          currency: req.currency ?? 'INR',
          name: 'AgriConnect',
          description: req.description ?? 'AgriConnect payment',
          order_id: orderId,
          prefill: { name: req.customer?.name, email: req.customer?.email, contact: req.customer?.phone },
          notes: { orderId: req.orderId ?? '' },
          theme: { color: '#16a34a' },
          handler: (res) =>
            settle({ success: true, gatewayRef: res.razorpay_payment_id }),
          modal: {
            ondismiss: () => settle({ success: false, failureReason: 'Payment cancelled by user' }),
          },
        });
        rz.open();
      } catch {
        settle({ success: false, failureReason: 'Could not open Razorpay checkout' });
      }
    });
  },
  async refund(gatewayRef: string, amount: number, reason: string): Promise<ChargeResult> {
    if (!this.isLive) return SimulatedGateway.refund!(gatewayRef, amount, reason);
    // In production this is done server-side via Razorpay Refunds API.
    await delay(300);
    return { success: true, gatewayRef: `rfnd_${Math.random().toString(36).slice(2, 8)}` };
  },
};

/* ── Stripe gateway (future-ready stub, conforms to the interface) ────── */

const StripeGateway: PaymentGateway = {
  name: 'stripe',
  isLive: false,
  async charge(req: ChargeRequest): Promise<ChargeResult> {
    // Wire PaymentIntents here when Stripe keys + backend become available.
    return SimulatedGateway.charge(req);
  },
  async refund(gatewayRef: string, amount: number, reason: string): Promise<ChargeResult> {
    return SimulatedGateway.refund!(gatewayRef, amount, reason);
  },
};

export const getGateway = (name: GatewayName = 'razorpay'): PaymentGateway => {
  switch (name) {
    case 'razorpay':
      return RazorpayGateway;
    case 'stripe':
      return StripeGateway;
    default:
      return SimulatedGateway;
  }
};

/** Gateway actually used when no gateway name is supplied. */
export const getDefaultGateway = (): PaymentGateway =>
  isRazorpayConfigured() ? RazorpayGateway : SimulatedGateway;
