const CACHE_TTL: Record<string, number> = {
  weather: 30 * 60 * 1000,
  mandi: 15 * 60 * 1000,
  profile: 60 * 60 * 1000,
};

export interface CachedEntry<T> {
  value: T;
  savedAt: number;
}

export function readCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(`cache:${key}`);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CachedEntry<T>;
    const ttl = CACHE_TTL[key.split(":")[0] as keyof typeof CACHE_TTL] ?? 30 * 60 * 1000;
    if (Date.now() - entry.savedAt > ttl) return null;
    return entry.value;
  } catch {
    return null;
  }
}

export function readStaleCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(`cache:${key}`);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CachedEntry<T>;
    return entry.value;
  } catch {
    return null;
  }
}

export function writeCache<T>(key: string, value: T): void {
  try {
    const entry: CachedEntry<T> = { value, savedAt: Date.now() };
    localStorage.setItem(`cache:${key}`, JSON.stringify(entry));
  } catch {
    // Storage full or unavailable — fail silently
  }
}

export function clearCache(key: string): void {
  try {
    localStorage.removeItem(`cache:${key}`);
  } catch {
    // ignore
  }
}

export function isOnline(): boolean {
  return typeof navigator === "undefined" || navigator.onLine;
}
