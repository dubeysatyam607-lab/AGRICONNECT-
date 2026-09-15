import { invokeEdgeWithTimeout } from "@/lib/invoke-edge";

/**
 * AgriConnect Live Agriculture Information — client for the `agri-data` edge
 * function. Uses TTL caches (same pattern as news-api.ts). Honesty rules that
 * matter downstream: every row carries `last_verified_at` + `source_name` /
 * `source_url`; nulls are rendered as "not available", never invented.
 */

export type AgriContentType = "schemes" | "news" | "msp" | "insurance" | "loans";

export interface AgriScheme {
  id: string;
  name: string;
  short_name?: string | null;
  category?: string | null;
  level?: "central" | "state" | null;
  state?: string | null;
  description?: string | null;
  benefits?: string | null;
  benefit_amount?: string | null;
  eligibility?: string | null;
  ministry?: string | null;
  application_url?: string | null;
  official_url?: string | null;
  helpline?: string | null;
  status?: string | null;
  last_verified_at?: string | null;
  updated_at?: string | null;
  source_name?: string | null;
  source_url?: string | null;
}

export interface AgriNews {
  id: string;
  title: string;
  title_hash?: string;
  summary?: string | null;
  content?: string | null;
  category?: string | null;
  source_name: string;
  source_url?: string | null;
  official_source?: boolean;
  image_url?: string | null;
  canonical_url?: string | null;
  published_at?: string | null;
  last_verified_at?: string | null;
}

export interface AgriMsp {
  id: string;
  crop: string;
  season?: string | null;
  marketing_year?: string | null;
  grade?: string | null;
  msp: number;
  unit?: string | null;
  source_name?: string | null;
  source_url?: string | null;
  published_at?: string | null;
  last_verified_at?: string | null;
}

export interface AgriInsurance {
  id: string;
  scheme_name: string;
  season?: string | null;
  state?: string | null;
  crop?: string | null;
  farmer_premium_rate?: number | null;
  premium_cap_percent?: number | null;
  sum_insured_per_unit?: number | null;
  unit?: string | null;
  guidelines_url?: string | null;
  official_url?: string | null;
  helpline?: string | null;
  status?: string | null;
  last_verified_at?: string | null;
  source_name?: string | null;
  source_url?: string | null;
}

export interface AgriLoan {
  id: string;
  scheme_name: string;
  product_name?: string | null;
  loan_type?: string | null;
  interest_rate?: number | null;
  min_rate?: number | null;
  max_rate?: number | null;
  subvention?: number | null;
  prompt_payment_incentive?: number | null;
  effective_rate?: number | null;
  eligibility?: string | null;
  status?: string | null;
  official_url?: string | null;
  source_url?: string | null;
  last_verified_at?: string | null;
  source_name?: string | null;
}

export interface FreshnessTable {
  hasData: boolean;
  count: number;
  lastFetchedAt: string | null;
  lastVerifiedAt: string | null;
}

export interface AgriFreshness {
  tables: Record<AgriContentType, FreshnessTable>;
  latestSync: {
    job_name?: string;
    status?: string;
    started_at?: string;
    records_added?: number;
  } | null;
  now: string;
}

export interface AgriSearchResults {
  term: string;
  total: number;
  schemes: AgriScheme[];
  news: AgriNews[];
  msp: AgriMsp[];
  insurance: AgriInsurance[];
  loans: AgriLoan[];
}

export interface ContentFilters {
  category?: string;
  level?: string;
  state?: string;
  season?: string;
  year?: string;
  crop?: string;
  status?: string;
}

export interface DataSourceHealth {
  source_name: string;
  source_url: string | null;
  source_type: string;
  category: string;
  status: string;
  allowlisted: boolean;
  records_count: number;
  failure_count: number;
  last_success: string | null;
  last_failure: string | null;
  created_at: string;
}

export interface SyncLogRow {
  id: number;
  job_name: string;
  started_at: string;
  completed_at: string | null;
  status: string;
  records_found: number;
  records_added: number;
  records_updated: number;
  records_removed: number;
  records_skipped: number;
  error_message: string | null;
  duration_ms: number | null;
}

export interface AgriReport {
  sources: DataSourceHealth[];
  syncLogs: SyncLogRow[];
  generatedAt: string;
}

const TTL_DEFAULT = 10 * 60 * 1000;

const cache = new Map<string, { expiresAt: number; value: unknown }>();

function cached<T>(key: string, ttlMs: number): T | null {
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value as T;
  return null;
}

function remember(key: string, value: unknown, ttlMs: number): void {
  cache.set(key, { expiresAt: Date.now() + ttlMs, value });
  if (cache.size > 200) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
}

function filterKey(f: ContentFilters = {}): string {
  return JSON.stringify(f);
}

/** Fetch a typed listing (with optional freshness TTL). */
export async function getAgriContent<T = AgriScheme[]>(
  type: AgriContentType,
  filters: ContentFilters = {},
  q?: string,
  opts: { noCache?: boolean; limit?: number } = {},
): Promise<{ rows: T; count: number }> {
  const cacheKey = `agri:${type}:${q || ""}:${filterKey(filters)}:${opts.limit || 25}`;
  if (!opts.noCache) {
    const hit = cached<{ rows: T; count: number }>(cacheKey, TTL_DEFAULT);
    if (hit) return hit;
  }
  const { data } = await invokeEdgeWithTimeout<{ rows: T; count: number }>("agri-data", {
    action: "content",
    type,
    q,
    filters,
    limit: opts.limit ?? 25,
  });
  const result = data ?? { rows: [] as T, count: 0 };
  if (!opts.noCache) remember(cacheKey, result, TTL_DEFAULT);
  return result;
}

/** Cross-type search (EN / Hindi / Hinglish-tolerant, server-side ILIKE). */
export async function searchAgri(q: string): Promise<AgriSearchResults | null> {
  const term = q.trim();
  if (term.length < 2) return null;
  const cacheKey = `agri:search:${term}`;
  const hit = cached<AgriSearchResults>(cacheKey, 5 * 60 * 1000);
  if (hit) return hit;
  const { data } = await invokeEdgeWithTimeout<AgriSearchResults>("agri-data", {
    action: "search",
    q: term,
  });
  if (data) remember(cacheKey, data, 5 * 60 * 1000);
  return data ?? null;
}

/** Source freshness summary — powers the "Last updated" labels. */
export async function getAgriFreshness(): Promise<AgriFreshness | null> {
  const hit = cached<AgriFreshness>("agri:freshness", 60 * 1000);
  if (hit) return hit;
  const { data } = await invokeEdgeWithTimeout<AgriFreshness>("agri-data", { action: "freshness" });
  if (data) remember("agri:freshness", data, 60 * 1000);
  return data ?? null;
}

/** Admin: trigger the sync engine now. */
export async function triggerAgriSync(
  jobs: Array<"scheme" | "news" | "msp"> = ["scheme", "news", "msp"],
): Promise<{ ok: boolean; completed?: Array<{ job: string; status: string; added: number; updated: number }>; error?: string } | null> {
  const { data } = await invokeEdgeWithTimeout("agri-data", { action: "sync", jobs });
  return data ?? null;
}

/** Admin: source health + sync log report. */
export async function getAgriReport(): Promise<AgriReport | null> {
  const { data } = await invokeEdgeWithTimeout<AgriReport>("agri-data", { action: "report" }, 15000);
  return data ?? null;
}

// ---------------------------------------------------------------------------
// Presentation helpers
// ---------------------------------------------------------------------------
export function formatVerifiedLabel(iso: string | null | undefined, lang: string = "en"): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  try {
    if (lang === "hi" || lang === "hindi") {
      return `अंतिम सत्यापन: ${d.toLocaleDateString("hi-IN", { day: "2-digit", month: "short", year: "numeric" })}`;
    }
    return `Verified ${d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`;
  } catch {
    return "";
  }
}

export function formatSourceLabel(sourceName: string | null | undefined, lang: string = "en"): string {
  if (!sourceName) return "";
  return lang === "hi" || lang === "hindi" ? `स्रोत: ${sourceName}` : `Source: ${sourceName}`;
}

export function formatRupees(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "";
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "";
  return `${Number(value).toLocaleString("en-IN")}%`;
}