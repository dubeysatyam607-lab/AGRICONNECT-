/**
 * Encrypted storage for sensitive payment data.
 *
 * Real-world rule: the browser never persists full card numbers — only masked
 * values. This module encrypts transient sensitive payloads (payment session
 * tokens, raw card captures during checkout) with AES-256-GCM using a key
 * derived via PBKDF2 from a per-install random secret bound to the session.
 *
 * Security model (client-side):
 *  - Data at rest is AES-256-GCM encrypted with a 100k-iteration PBKDF2 key.
 *  - The key secret lives in sessionStorage, so ciphertext written to
 *    localStorage is not decryptable after a full browser restart.
 *  - In production the authoritative store is the payment backend; this is the
 *    honest client-side boundary, never a substitute for server-side custody.
 */

const APP_SALT = 'agri-connect-payments:v1';
const SESSION_SECRET_KEY = 'agri_payments_session_secret';
const ENVELOPE_PREFIX = 'agx1:';

const isCryptoAvailable = (): boolean =>
  typeof window !== 'undefined' && !!window.crypto?.subtle;

const b64 = (buf: ArrayBuffer | Uint8Array): string => {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    s += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  return btoa(s);
};

const fromB64 = (s: string): Uint8Array => {
  const bin = atob(s);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
};

let cachedKey: CryptoKey | null = null;

const getOrCreateSecret = (): string => {
  try {
    let secret = sessionStorage.getItem(SESSION_SECRET_KEY);
    if (!secret) {
      const bytes = new Uint8Array(32);
      window.crypto.getRandomValues(bytes);
      secret = b64(bytes);
      sessionStorage.setItem(SESSION_SECRET_KEY, secret);
    }
    return secret;
  } catch {
    /* sessionStorage unavailable — generate a non-persisted key each call */
    const bytes = new Uint8Array(32);
    window.crypto.getRandomValues(bytes);
    return b64(bytes);
  }
};

const deriveKey = async (): Promise<CryptoKey> => {
  if (cachedKey) return cachedKey;
  const material = await window.crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(getOrCreateSecret()),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  cachedKey = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: new TextEncoder().encode(APP_SALT),
      iterations: 100000,
      hash: 'SHA-256',
    },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
  return cachedKey;
};

/** Encrypt a string. Returns an "agx1:" envelope or the input if crypto is unavailable. */
export const encryptSecret = async (plaintext: string): Promise<string> => {
  if (!isCryptoAvailable()) return plaintext;
  try {
    const key = await deriveKey();
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      new TextEncoder().encode(plaintext),
    );
    return ENVELOPE_PREFIX + b64(iv) + '.' + b64(ciphertext);
  } catch {
    return plaintext;
  }
};

/** Decrypt an "agx1:" envelope. Returns the original string for non-envelopes. */
export const decryptSecret = async (envelope: string): Promise<string> => {
  if (!envelope.startsWith(ENVELOPE_PREFIX)) return envelope;
  if (!isCryptoAvailable()) return envelope;
  try {
    const payload = envelope.slice(ENVELOPE_PREFIX.length);
    const [ivB64, cipherB64] = payload.split('.');
    const key = await deriveKey();
    const plaintext = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromB64(ivB64) },
      key,
      fromB64(cipherB64),
    );
    return new TextDecoder().decode(plaintext);
  } catch {
    return '';
  }
};

/** Write an encrypted value to localStorage. Fails silently on quota errors. */
export const secureSetItem = async (key: string, value: string): Promise<void> => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, await encryptSecret(value));
  } catch {
    /* ignore */
  }
};

/** Read and decrypt a value from localStorage. */
export const secureGetItem = async (key: string): Promise<string | null> => {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    return await decryptSecret(raw);
  } catch {
    return null;
  }
};

/** Format a card number into groups of 4 for display while typing. */
export const formatCardNumber = (value: string): string =>
  value
    .replace(/\D/g, '')
    .slice(0, 19)
    .replace(/(.{4})/g, '$1 ')
    .trim();

/** Format MM/YY expiry while typing. */
export const formatExpiry = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
};

/** Mask a full card number, keeping the last 4 digits. */
export const maskCardNumber = (cardNumber: string): string => {
  const digits = cardNumber.replace(/\D/g, '');
  if (digits.length < 4) return '••••';
  return `•••• •••• •••• ${digits.slice(-4)}`;
};

/** Basic Luhn check — used to validate card numbers client-side. */
export const isLuhnValid = (cardNumber: string): boolean => {
  const digits = cardNumber.replace(/\D/g, '');
  if (digits.length < 12) return false;
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = Number(digits[i]);
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
};

/** Detect card network from the leading digits. */
export const detectCardBrand = (cardNumber: string): string => {
  const d = cardNumber.replace(/\D/g, '');
  if (/^4/.test(d)) return 'Visa';
  if (/^5[1-5]/.test(d)) return 'Mastercard';
  if (/^3[47]/.test(d)) return 'Amex';
  if (/^6(?:011|5)/.test(d)) return 'Discover';
  if (/^(?:2131|1800|35)/.test(d)) return 'JCB';
  if (/^62/.test(d)) return 'RuPay';
  return 'Card';
};

/** Build a UPI QR deep-link payload for a VPA. */
export const buildUpiPayload = (
  vpa: string,
  name: string,
  amount: number,
  note: string,
): string =>
  `upi://pay?pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent(name)}&am=${amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(note)}&mode=02`;
