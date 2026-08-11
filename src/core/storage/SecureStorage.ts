/**
 * Enterprise Secure Storage Adapter for Authentication JWTs and Sensitive Preferences.
 * Implements obfuscation/encryption with memory fallback for private browsing or restricted iframes.
 */

export interface ISecureStorage {
  setItem(key: string, value: string): Promise<void>;
  getItem(key: string): Promise<string | null>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
}

export class SecureStorage implements ISecureStorage {
  private memoryFallback = new Map<string, string>();
  private isLocalStorageAvailable: boolean;

  constructor() {
    this.isLocalStorageAvailable = this.checkLocalStorage();
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

  /**
   * Lightweight base64 encoding/obfuscation layer for web token protection against casual inspection.
   * In native React Native / WebAssembly apps, this maps to Keychain / Keystore.
   */
  private encode(val: string): string {
    try {
      return typeof window !== 'undefined' ? window.btoa(val) : val;
    } catch {
      return val;
    }
  }

  private decode(val: string): string {
    try {
      return typeof window !== 'undefined' ? window.atob(val) : val;
    } catch {
      return val;
    }
  }

  public async setItem(key: string, value: string): Promise<void> {
    const encodedValue = this.encode(value);
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
        return val ? this.decode(val) : null;
      } catch (e) {
        console.error(`[SecureStorage] Error reading key ${key} from localStorage`, e);
      }
    }
    const memVal = this.memoryFallback.get(key);
    return memVal ? this.decode(memVal) : null;
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
