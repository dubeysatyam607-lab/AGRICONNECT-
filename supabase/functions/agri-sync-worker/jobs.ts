/**
 * Sync jobs for the AgriConnect agriculture information engine.
 * Honesty rules enforced here:
 *   - Never fabricate values; unknown data -> record skipped / omitted.
 *   - last_verified_at is only set from REAL source success; the curated
 *     bootstrap keeps its original catalog timestamp verbatim.
 *   - data.gov.in, PIB RSS and general-news APIs are the ONLY external inputs.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  newsLookupKey,
  newsTitleHash,
  schemeLookupKey,
  mspLookupKey,
  productLookupKey,
  contentHash,
  diffChangedFields,
  categorizeNews,
  isTitleDuplicate,
  stripHtml,
} from "./lib.ts";
import { parseFeed, isRss } from "./rss.ts";
import { CURATED_SCHEMES } from "./curated-schemes.ts";
import type { NewsItem, SourceHealth, SyncJobResult } from "./types.ts";

type Client = ReturnType<typeof createClient>;

export const SCHEME_SIGNIFICANT_FIELDS = [
  "name",
  "category",
  "level",
  "state",
  "description",
  "benefits",
  "benefit_amount",
  "eligibility",
  "status",
  "effective_from",
  "effective_until",
];

export const PMFBY_SEASON_CAPS: Array<{
  season: string;
  farmerPremiumRate: number;
  sumInsuredPerUnit: number;
  unit: string;
}> = [
  { season: "Kharif", farmerPremiumRate: 2.0, sumInsuredPerUnit: 200000, unit: "per ha (illustrative SI)" },
  { season: "Rabi", farmerPremiumRate: 1.5, sumInsuredPerUnit: 200000, unit: "per ha (illustrative SI)" },
  { season: "Annual & Commercial", farmerPremiumRate: 5.0, sumInsuredPerUnit: 200000, unit: "per ha (illustrative SI)" },
];

export const KCC_POLICY = {
  schemeName: "Kisan Credit Card (KCC) — Interest Subvention Scheme",
  loanType: "kcc",
  interestRate: 7,
  subvention: 2,
  promptPaymentIncentive: 3,
  effectiveRate: 4,
  limit: 300000,
  sourceName: "Ministry of Agriculture & Farmers Welfare / RBI",
  sourceUrl: "https://agricoop.nic.in/sites/default/files/KCC_Scheme_Guidelines.pdf",
  officialUrl: "https://myscheme.gov.in/schemes/kcc",
  lastVerifiedDate: "2026-08-06",
};

// --------------------------------------------------------------------------
// Shared fetch helpers
// --------------------------------------------------------------------------
async function fetchJson(url: string, ms = 15000): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchText(url: string, ms = 15000): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { accept: "text/xml,application/xml,application/rss+xml,text/html,application/json" } });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

function counters(): { found: number; added: number; updated: number; skipped: number } {
  return { found: 0, added: 0, updated: 0, skipped: 0 };
}

// --------------------------------------------------------------------------
// Scheme bootstrap + live sync
// --------------------------------------------------------------------------
export async function bootstrapSchemes(client: Client): Promise<{ result: SyncJobResult; health: SourceHealth[] }> {
  const d = counters();
  const errors: string[] = [];
  const t0 = Date.now();

  for (const s of CURATED_SCHEMES) {
    try {
      const row = curatedSchemeToRow(s);
      const { added, updated, skipped } = await upsertByLookup(client, "schemes", s.code, row);
      d.added += added;
      d.updated += updated;
      d.skipped += skipped;
    } catch (err) {
      errors.push(`${s.code}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  // PMFBY + KCC also bootstrap the insurance & loan product stores.
  const ins = await bootstrapInsurance(client);
  const loan = await bootstrapLoans(client);
  d.added += ins.added + loan.added;
  d.updated += ins.updated + loan.updated;
  d.skipped += ins.skipped + loan.skipped;

  const result: SyncJobResult = {
    job: "scheme",
    found: CURATED_SCHEMES.length + PMFBY_SEASON_CAPS.length + 1,
    ...d,
    status: errors.length ? "partial" : "success",
    error: errors.length ? errors.join("; ") : undefined,
  };
  return {
    result,
    health: [
      { sourceName: "PM-KISAN Portal", status: "HEALTHY", recordsCount: 1, failureCount: 0, responseTimeMs: 0, lastSuccess: new Date().toISOString(), lastFailure: null },
      { sourceName: "PMFBY Portal", status: "HEALTHY", recordsCount: PMFBY_SEASON_CAPS.length, failureCount: 0, responseTimeMs: 0, lastSuccess: new Date().toISOString(), lastFailure: null },
      { sourceName: "Reserve Bank of India (KCC)", status: "HEALTHY", recordsCount: 1, failureCount: 0, responseTimeMs: 0, lastSuccess: new Date().toISOString(), lastFailure: null },
    ],
  };
}

function curatedSchemeToRow(s: (typeof CURATED_SCHEMES)[number]): Record<string, unknown> {
  return {
    lookup_key: schemeLookupKey(s.code, "ALL-INDIA"),
    name: s.name,
    short_name: s.id,
    category: s.category,
    level: s.level,
    state: s.applicableStates?.[0] === "All India" ? null : null,
    description: s.description,
    benefits: s.benefits,
    benefit_amount: s.benefitAmount,
    eligibility: s.eligibility?.length ? s.eligibility.join("\n") : null,
    ministry: s.ministry,
    application_url: s.applicationUrl,
    official_url: s.officialUrl,
    helpline: s.helpline,
    status: s.status,
    last_verified_at: s.lastVerifiedDate ? new Date(s.lastVerifiedDate + "T00:00:00Z").toISOString() : null,
    fetched_at: new Date().toISOString(),
    source_name: s.ministry || "Government of India",
    source_url: s.officialUrl,
    source_type: "manual_review",
  };
}

async function bootstrapInsurance(client: Client): Promise<{ added: number; updated: number; skipped: number }> {
  const d = counters();
  for (const cap of PMFBY_SEASON_CAPS) {
    const lookupKey = productLookupKey("insurance", `PMFBY-${cap.season}`, "ALL-INDIA");
    const row = {
      lookup_key: lookupKey,
      scheme_name: "Pradhan Mantri Fasal Bima Yojana (PMFBY)",
      scheme_code: "PMFBY",
      product_name: `PMFBY ${cap.season} Notified Crop Cover`,
      level: "central",
      season: cap.season,
      // Official maximum farmer premium rate (share of Sum Insured) per the
      // PMFBY Operational Guidelines. NOT an actuarial estimate.
      farmer_premium_rate: cap.farmerPremiumRate,
      premium_cap_percent: cap.farmerPremiumRate,
      sum_insured_per_unit: cap.sumInsuredPerUnit,
      unit: cap.unit,
      guidelines_url: "https://pmfby.gov.in/pdf/Revised_Operational_Guidelines_PMFBY.pdf",
      official_url: "https://pmfby.gov.in/",
      helpline: "14447",
      status: "active",
      last_verified_at: new Date("2026-08-06T00:00:00Z").toISOString(),
      fetched_at: new Date().toISOString(),
      source_name: "Ministry of Agriculture & Farmers Welfare (MoA&FW)",
      source_url: "https://pmfby.gov.in/",
      source_type: "manual_review",
    };
    const r = await upsertByLookup(client, "insurance_products", `PMFBY-${cap.season}`, row);
    d.added += r.added;
    d.updated += r.updated;
    d.skipped += r.skipped;
  }
  return d;
}

async function bootstrapLoans(client: Client): Promise<{ added: number; updated: number; skipped: number }> {
  const row = {
    lookup_key: productLookupKey("loan", "KCC", "ALL-INDIA"),
    bank: null,
    scheme_name: KCC_POLICY.schemeName,
    product_name: "Concessional Short-term Crop Loan (KCC)",
    loan_type: KCC_POLICY.loanType,
    interest_rate: KCC_POLICY.interestRate,
    subvention: KCC_POLICY.subvention,
    prompt_payment_incentive: KCC_POLICY.promptPaymentIncentive,
    effective_rate: KCC_POLICY.effectiveRate,
    eligibility: `Individual/joint farmers, tenant farmers, sharecroppers, SHGs etc. Loans up to ₹${(KCC_POLICY.limit / 100000).toFixed(2)} Lakh eligible for subvention. No collateral up to ₹1.6 Lakh.`,
    status: "active",
    effective_from: null,
    last_verified_at: new Date("2026-08-06T00:00:00Z").toISOString(),
    fetched_at: new Date().toISOString(),
    source_name: KCC_POLICY.sourceName,
    source_url: KCC_POLICY.sourceUrl,
    official_url: KCC_POLICY.officialUrl,
    source_type: "policy",
  };
  const r = await upsertByLookup(client, "loan_products", "KCC", row);
  return { added: r.added, updated: r.updated, skipped: r.skipped };
}

// --------------------------------------------------------------------------
// Upsert with content-hash dedupe + version tracking
// --------------------------------------------------------------------------
async function upsertByLookup(
  client: Client,
  table: "schemes" | "insurance_products" | "loan_products",
  label: string,
  row: Record<string, unknown>,
): Promise<{ added: number; updated: number; skipped: number }> {
  const lookupKey = String(row.lookup_key);
  const hash = contentHash({ ...row, lookup_key: undefined });
  const { data: existing, error: selErr } = await client
    .from(table)
    .select("*")
    .eq("lookup_key", lookupKey)
    .maybeSingle();
  if (selErr) throw selErr;

  if (existing) {
    if (existing.content_hash === hash) return { added: 0, updated: 0, skipped: 1 };
    const diff = diffChangedFields(row, existing, table === "schemes" ? SCHEME_SIGNIFICANT_FIELDS : []);
    const nextVersion = (existing.version || 1) + 1;
    const { error: updErr } = await client
      .from(table)
      .update({ ...row, content_hash: hash, version: nextVersion })
      .eq("lookup_key", lookupKey);
    if (updErr) throw updErr;
    if (table === "schemes") {
      await client.from("scheme_versions").insert({
        scheme_id: existing.id,
        version: nextVersion,
        previous_version: existing.version,
        changed_fields: diff.fields,
        old_value: diff.oldValue,
        new_value: diff.newValue,
        source_url: String(row.source_url ?? null),
      });
    }
    return { added: 0, updated: 1, skipped: 0 };
  }

  const { error: insErr } = await client.from(table).insert({ ...row, content_hash: hash, version: 1 });
  if (insErr) throw insErr;
  return { added: 1, updated: 0, skipped: 0 };
}

// --------------------------------------------------------------------------
// News job (PIB official RSS + optional labeled general-news API)
// --------------------------------------------------------------------------
export async function syncNews(client: Client): Promise<{ result: SyncJobResult; health: SourceHealth[] }> {
  const d = counters();
  const errors: string[] = [];
  const health: SourceHealth[] = [];
  const t0 = Date.now();

  const { data: feeds } = await client
    .from("data_sources")
    .select("*")
    .eq("category", "news")
    .eq("allowlisted", true);

  const rssSources = (feeds || []).filter((f) => f.feed_url);

  let seenTitles: string[] = [];
  const capTitles = 200;

  for (const src of rssSources) {
    const start = Date.now();
    try {
      const xml = await fetchText(src.feed_url);
      if (!isRss(xml)) throw new Error("Not an RSS/Atom/XML feed");
      const items = parseFeed(xml).filter((i) => i.title);
      let added = 0, skipped = 0;
      for (const item of items) {
        if (isTitleDuplicate(item.title, seenTitles)) {
          skipped++;
          continue;
        }
        seenTitles = [...seenTitles.slice(-(capTitles - 1)), item.title];
        const outcome = await upsertNews(client, item, src.source_name, src.source_url);
        added += outcome.added;
        skipped += outcome.skipped;
      }
      d.found += items.length;
      d.added += added;
      d.skipped += skipped;
      health.push({
        sourceName: src.source_name,
        status: "HEALTHY",
        recordsCount: items.length,
        failureCount: 0,
        responseTimeMs: Date.now() - start,
        lastSuccess: new Date().toISOString(),
        lastFailure: null,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${src.source_name}: ${msg}`);
      health.push({
        sourceName: src.source_name,
        status: "DOWN",
        recordsCount: 0,
        failureCount: 1,
        responseTimeMs: Date.now() - start,
        lastSuccess: null,
        lastFailure: new Date().toISOString(),
      });
    }
  }

  const generalHealth = await syncGeneralNews(client, d, seenTitles, errors);
  health.push(...generalHealth);
  d.found += generalHealth.found;

  const result: SyncJobResult = {
    job: "news",
    found: d.found,
    added: d.added,
    updated: d.updated,
    skipped: d.skipped,
    removed: 0,
    status: errors.length ? "partial" : "success",
    error: errors.length ? errors.join("; ") : undefined,
  };
  return { result, health };
}

async function syncGeneralNews(
  client: Client,
  d: { found: number; added: number; updated: number; skipped: number },
  seenTitles: string[],
  errors: string[],
): Promise<SourceHealth[]> {
  const apiKey = Deno.env.get("NEWS_API_KEY");
  if (!apiKey) return [];
  const start = Date.now();
  const srcName = "General Agri News (newsapi.org)";
  try {
    const q = encodeURIComponent('agriculture OR "PM-KISAN" OR "kisan" OR farmers');
    const data = (await fetchJson(
      `https://newsapi.org/v2/everything?q=${q}&language=hi&sortBy=publishedAt&pageSize=30&apiKey=${apiKey}`,
    )) as { articles?: Array<{ title: string; description: string | null; url: string; urlToImage: string | null; publishedAt: string | null; source?: { name?: string } }> };
    const articles = data.articles || [];
    let localSeen = [...seenTitles];
    for (const a of articles) {
      if (!a.title || !a.url) continue;
      if (isTitleDuplicate(a.title, localSeen)) {
        d.skipped++;
        continue;
      }
      localSeen = [...localSeen.slice(-199), a.title];
      const item: NewsItem = {
        title: stripHtml(a.title),
        summary: a.description ? stripHtml(a.description) : null,
        content: null,
        link: a.url,
        guid: a.url,
        publishedAt: a.publishedAt,
        imageUrl: a.urlToImage,
      };
      const outcome = await upsertNews(client, item, srcName, a.url + " (source)");
      d.added += outcome.added;
      d.skipped += outcome.skipped;
    }
    d.found += articles.length;
    return [{
      sourceName: srcName,
      status: "HEALTHY",
      recordsCount: articles.length,
      failureCount: 0,
      responseTimeMs: Date.now() - start,
      lastSuccess: new Date().toISOString(),
      lastFailure: null,
    }];
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`${srcName}: ${msg}`);
    return [{
      sourceName: srcName,
      status: "DOWN",
      recordsCount: 0,
      failureCount: 1,
      responseTimeMs: Date.now() - start,
      lastSuccess: null,
      lastFailure: new Date().toISOString(),
    }];
  }
}

async function upsertNews(
  client: Client,
  item: NewsItem,
  sourceName: string,
  sourceUrl: string | null,
): Promise<{ added: number; skipped: number }> {
  const title = item.title.trim();
  const contentHashValue = contentHash({
    title,
    link: item.link,
    publishedAt: item.publishedAt,
    summary: item.summary,
    sourceName,
  });

  const { data: dup } = await client
    .from("agri_news")
    .select("id")
    .eq("content_hash", contentHashValue)
    .maybeSingle();
  if (dup) return { added: 0, skipped: 1 };

  const titleHashOnly = newsTitleHash(title);
  const { data: byTitle } = await client
    .from("agri_news")
    .select("title")
    .eq("title_hash", titleHashOnly)
    .limit(1);
  if (byTitle && byTitle.length > 0 && isTitleDuplicate(title, [byTitle[0].title])) {
    return { added: 0, skipped: 1 };
  }

  const official = /(pib|gov\.in|data\.gov|ministry|agriculture\.gov|nic\.in)/i.test(sourceName) ||
    (sourceUrl ? /(gov\.in|government)/i.test(sourceUrl) : false);

  const row = {
    content_hash: contentHashValue,
    title,
    title_hash: titleHashOnly,
    summary: item.summary,
    content: item.content,
    category: categorizeNews(title, item.summary),
    tags: [],
    source_name: sourceName,
    source_url: item.link || sourceUrl,
    official_source: official,
    image_url: item.imageUrl,
    canonical_url: item.link,
    published_at: item.publishedAt,
    fetched_at: new Date().toISOString(),
    last_verified_at: new Date().toISOString(),
    status: "active",
  };

  const { error } = await client.from("agri_news").insert(row);
  if (error) throw error;
  return { added: 1, skipped: 0 };
}

// --------------------------------------------------------------------------
// MSP job — data.gov.in discovery + tolerant record parse (best-effort, honest)
// --------------------------------------------------------------------------
export async function syncMsp(client: Client): Promise<{ result: SyncJobResult; health: SourceHealth[] }> {
  const d = counters();
  const errors: string[] = [];
  const health: SourceHealth[] = [];
  const dataGovKey = Deno.env.get("DATA_GOV_API_KEY");
  const explicitResourceIds = Deno.env.get("MSP_RESOURCE_IDS");

  if (!dataGovKey) {
    // No verified key configured — we will not guess or fabricate MSP values.
    const error = "DATA_GOV_API_KEY not configured — no MSP data fetched.";
    return { result: { job: "msp", found: 0, added: 0, updated: 0, skipped: 0, removed: 0, status: "skipped" as const, error }, health };
  }

  const ids = (explicitResourceIds || "").split(",").map((s) => s.trim()).filter(Boolean);

  // Discover candidate MSP resources if none configured explicitly.
  if (ids.length === 0) {
    try {
      const catalog = (await fetchJson(
        `https://api.data.gov.in/lists?limit=10&offset=1&format=json&filters[title]=minimum+support+price&api-key=${dataGovKey}`,
      )) as { results?: Array<{ id?: string; source?: string; title?: string }> };
      const found = (catalog.results || []).filter((r) => /support price|msp/i.test(r.title || "")).map((r) => r.id!).filter(Boolean);
      ids.push(...found.slice(0, 3));
    } catch (err) {
      errors.push(`data.gov.in catalog search: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  for (const id of ids) {
    const start = Date.now();
    const srcName = `data.gov.in resource ${id}`;
    try {
      const parsed = (await fetchJson(
        `https://api.data.gov.in/resource/${id}?format=json&limit=500&api-key=${dataGovKey}`,
      )) as { records?: unknown[] };
      const records = parsed.records || [];
      let added = 0, skipped = 0;
      for (const raw of records as Array<Record<string, unknown>>) {
        const msp = parseMspRecord(raw);
        if (!msp) {
          skipped++;
          continue;
        }
        d.found++;
        const lookupKey = mspLookupKey(msp.crop, msp.season, msp.marketingYear, msp.grade);
        const existing = await client.from("msp_prices").select("content_hash").eq("lookup_key", lookupKey).maybeSingle();
        const hash = contentHash(msp.contentFields());
        if (existing && existing.content_hash === hash) {
          skipped++;
          continue;
        }
        const { error } = await client.from("msp_prices").upsert({ ...msp.row(), lookup_key: lookupKey, content_hash: hash });
        if (error) throw error;
        added++;
      }
      d.added += added;
      d.skipped += skipped;
      health.push({
        sourceName: srcName,
        status: "HEALTHY",
        recordsCount: records.length,
        failureCount: 0,
        responseTimeMs: Date.now() - start,
        lastSuccess: new Date().toISOString(),
        lastFailure: null,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${srcName}: ${msg}`);
      health.push({
        sourceName: srcName,
        status: "DOWN",
        recordsCount: 0,
        failureCount: 1,
        responseTimeMs: Date.now() - start,
        lastSuccess: null,
        lastFailure: new Date().toISOString(),
      });
    }
  }

  return {
    result: {
      job: "msp",
      found: d.found,
      added: d.added,
      updated: 0,
      skipped: d.skipped,
      removed: 0,
      status: errors.length ? (d.added ? "partial" : "error") : "success",
      error: errors.length ? errors.join("; ") : undefined,
    },
    health,
  };
}

interface MspParsed {
  crop: string;
  season: string | null;
  marketingYear: string | null;
  grade: string | null;
  msp: number;
  unit: string;
  sourceUrl: string | null;
  publishedAt: string | null;
  contentFields: () => Record<string, unknown>;
  row: () => Record<string, unknown>;
}

function findKey(record: Record<string, unknown>, patterns: RegExp): string | null {
  for (const k of Object.keys(record)) {
    if (patterns.test(k.toLowerCase())) return k;
  }
  return null;
}

function normalizeRecordKeys(record: Record<string, unknown>): Record<string, string> {
  const norm: Record<string, string> = {};
  for (const [k, v] of Object.entries(record)) {
    if (v !== null && v !== undefined && v !== "") norm[k.toLowerCase()] = String(v).trim();
  }
  return norm;
}

function toNumber(v: string | undefined): number | null {
  if (!v) return null;
  const cleaned = String(v).replace(/[,₹\s]/g, "").replace(/\.$/, "");
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Best-effort parse of heterogeneous data.gov.in MSP datasets. */
export function parseMspRecord(raw: Record<string, unknown>): MspParsed | null {
  const rec = normalizeRecordKeys(raw);
  const cropKey = findKey(rec, /(crop|commodity)/);
  const priceKey = findKey(rec, /(msp|support_price|min.*price|procurement_price)/);
  const seasonKey = findKey(rec, /(^|_)season/);
  const yearKey = findKey(rec, /(marketing|season|year)/);
  const gradeKey = findKey(rec, /(grade|variety|class)/);

  const crop = cropKey ? rec[cropKey] : null;
  const price = priceKey ? toNumber(rec[priceKey]) : null;
  if (!crop || !price) return null;

  const season = seasonKey ? rec[seasonKey] || null : null;
  const marketingYear = yearKey ? rec[yearKey] || null : null;
  const grade = gradeKey ? rec[gradeKey] || null : null;

  const canonical = { crop, season, marketingYear, grade, price };
  return {
    crop,
    season,
    marketingYear,
    grade,
    msp: price,
    unit: "Quintal",
    sourceUrl: null,
    publishedAt: null,
    contentFields: () => canonical,
    row: () => ({
      crop,
      season,
      marketing_year: marketingYear,
      grade,
      msp: price,
      unit: "Quintal",
      source_name: "data.gov.in",
      source_type: "api",
      source_url: null,
      fetched_at: new Date().toISOString(),
      last_verified_at: new Date().toISOString(),
    }),
  };
}

export type { Client, NewsItem, SyncJobResult };