/**
 * Enterprise Secure Storage Adapter for Authentication JWTs and Sensitive Preferences.
 * Uses Web Crypto API AES-GCM encryption when available, falling back to
 * base64 obfuscation. Persisted in localStorage with memory fallback for
 * private browsing or restricted iframes.
 */

export interface ISecureStorage {
  setItem(key: string, value: string): Promise<void>;
  getItem(key: string): Promise<string | null>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
}

const DB_NAME = 'agri_secure_storage';
const STORE_NAME = 'keys';
const ALIAS_STORE = 'aliases';
const CRYPTO_KEY_NAME = 'agri_aes_key_v1';

async function getKey(): Promise<CryptoKey | null> {
  if (typeof crypto === 'undefined' || !crypto.subtle) return null;
  try {
    const idb = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
        if (!db.objectStoreNames.contains(ALIAS_STORE)) db.createObjectStore(ALIAS_STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    // Try to extract existing AES-GCM key from IDB
    const raw = await new Promise<ArrayBuffer | undefined>((resolve) => {
      const tx = idb.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(CRYPTO_KEY_NAME);
      req.onsuccess = () => resolve(req.result as ArrayBuffer | undefined);
      req.onerror = () => resolve(undefined);
    });
    if (raw) {
      return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
    }
    // Generate and persist a new AES-GCM key
    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    const exported = await crypto.subtle.exportKey('raw', key);
    const tx2 = idb.transaction(STORE_NAME, 'readwrite');
    tx2.objectStore(STORE_NAME).put(exported, CRYPTO_KEY_NAME);
    return key;
  } catch {
    return null;
  }
}

export class SecureStorage implements ISecureStorage {
  private memoryFallback = new Map<string, string>();
  private isLocalStorageAvailable: boolean;
  private cryptoKey: CryptoKey | null = null;
  private cryptoKeyReady: Promise<void>;

  constructor() {
    this.isLocalStorageAvailable = this.checkLocalStorage();
    this.cryptoKeyReady = getKey().then(k => { this.cryptoKey = k; });
  }

  private checkLocalStorage(): boolean {
    try {
      const testKey = '__secure_storage_test__';
      window.localStorage.setItem(testKey, testKey);
      window.localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      console.warn('[SecureStorage] localStorage is unavailable. Using in-memory fallback.');
      return false;
    }
  }

  private async encrypt(val: string): Promise<string> {
    if (!this.cryptoKey) await this.cryptoKeyReady;
    if (!this.cryptoKey) return this.fallbackEncode(val);
    try {
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encoded = new TextEncoder().encode(val);
      const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, this.cryptoKey, encoded);
      // Store as base64(iv + ciphertext)
      const combined = new Uint8Array(iv.length + new Uint8Array(cipher).length);
      combined.set(iv, 0);
      combined.set(new Uint8Array(cipher), iv.length);
      return this.arrayBufferToBase64(combined.buffer);
    } catch {
      return this.fallbackEncode(val);
    }
  }

  private async decrypt(val: string): Promise<string> {
    if (!this.cryptoKey) await this.cryptoKeyReady;
    if (!this.cryptoKey) return this.fallbackDecode(val);
    try {
      const combined = this.base64ToArrayBuffer(val);
      const iv = combined.slice(0, 12);
      const cipher = combined.slice(12);
      const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, this.cryptoKey, cipher);
      return new TextDecoder().decode(plain);
    } catch {
      return this.fallbackDecode(val);
    }
  }

  private fallbackEncode(val: string): string {
    try { return typeof window !== 'undefined' ? window.btoa(val) : val; } catch { return val; }
  }

  private fallbackDecode(val: string): string {
    try { return typeof window !== 'undefined' ? window.atob(val) : val; } catch { return val; }
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return window.btoa(binary);
  }

  private base64ToArrayBuffer(b64: string): Uint8Array {
    const binary = window.atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  public async setItem(key: string, value: string): Promise<void> {
    const encodedValue = await this.encrypt(value);
    if (this.isLocalStorageAvailable) {
      try {
        window.localStorage.setItem(`bkl_secure_${key}`, encodedValue);
        return;
      } catch (e) {
        console.error(`[SecureStorage] Error setting key ${key} in localStorage`, e);
      }
    }
    this.memoryFallback.set(key, encodedValue);
  }

  public async getItem(key: string): Promise<string | null> {
    if (this.isLocalStorageAvailable) {
      try {
        const val = window.localStorage.getItem(`bkl_secure_${key}`);
        return val ? await this.decrypt(val) : null;
      } catch (e) {
        console.error(`[SecureStorage] Error reading key ${key} from localStorage`, e);
      }
    }
    const memVal = this.memoryFallback.get(key);
    return memVal ? await this.decrypt(memVal) : null;
  }

  public async removeItem(key: string): Promise<void> {
    if (this.isLocalStorageAvailable) {
      try {
        window.localStorage.removeItem(`bkl_secure_${key}`);
      } catch (e) {
        console.error(`[SecureStorage] Error removing key ${key}`, e);
      }
    }
    this.memoryFallback.delete(key);
  }

  public async clear(): Promise<void> {
    if (this.isLocalStorageAvailable) {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < window.localStorage.length; i++) {
          const k = window.localStorage.key(i);
          if (k && k.startsWith('bkl_secure_')) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach(k => window.localStorage.removeItem(k));
      } catch (e) {
        console.error('[SecureStorage] Error clearing storage', e);
      }
    }
    this.memoryFallback.clear();
  }
}

export const secureStorage = new SecureStorage();
