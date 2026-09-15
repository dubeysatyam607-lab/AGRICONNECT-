/**
 * Pure helpers for the AgriConnect sync engine. This module MUST NOT import
 * anything from deno.land / esm.sh so it can be unit-tested with vitest.
 */

/** Deterministic stable sort for keys so hashing is reproducible. */
export function stableStringify(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((v) => stableStringify(v)).join(",")}]`;
  }
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`)
    .join(",")}}`;
}

/**
 * FNV-1a 64-bit hex digest — synchronous, deterministic across Node/Deno/browsers.
 * Used for content_hash / title_hash change detection, NOT cryptography.
 */
export function hashText(input: string): string {
  let h = 0xcbf29ce484222325n;
  const m = 0x100000001b3n;
  for (let i = 0; i < input.length; i++) {
    h ^= BigInt(input.charCodeAt(i));
    h = (h * m) & 0xffffffffffffffffn;
  }
  return h.toString(16).padStart(16, "0");
}

/** Compact normalized hash of a canonical JSON blob. */
export function contentHash(obj: unknown): string {
  return hashText(stableStringify(obj));
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) : text;
}

function cleanToken(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9_अ-ह]+\s*/g, " ")
    .trim();
}

/**
 * Dedupe + change-detection helpers.
 * ----------------------------------------------------------------
 * lookupKey  -> stable DB uniqueness key (never changes for the same record)
 * contentHash -> changes whenever any significant field changes
 * titleHash   -> stable across editorial tweaks, used to suppress near-dupes
 */
export function newsLookupKey(title: string, sourceName: string): string {
  const t = truncate(cleanToken(title), 64);
  return hashText(`${sourceName}|${t}`);
}

export function newsTitleHash(title: string): string {
  return hashText(cleanToken(title));
}

export function schemeLookupKey(code: string, state?: string | null): string {
  return hashText(`${cleanToken(code)}|${(state || "ALL-INDIA").toUpperCase()}`);
}

export function mspLookupKey(
  crop: string,
  season: string | null,
  marketingYear: string | null,
  grade: string | null,
): string {
  return hashText(`${cleanToken(crop)}|${cleanToken(season || "")}|${cleanToken(marketingYear || "")}|${cleanToken(grade || "")}`);
}

export function productLookupKey(kind: "insurance" | "loan", code: string, state?: string | null): string {
  return hashText(`${kind}|${cleanToken(code)}|${(state || "ALL-INDIA").toUpperCase()}`);
}

/** Fields considered significant for scheme version tracking. */
const SCHEME_SIGNIFICANT_FIELDS = [
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

export interface SchemeChanged {
  changed: boolean;
  fields: string[];
  oldValue: Record<string, unknown>;
  newValue: Record<string, unknown>;
}

/**
 * Diff the significant fields of an incoming scheme against the stored one.
 * Returns which fields changed and snapshots for the scheme_versions row.
 */
export function diffChangedFields(
  incoming: Record<string, unknown>,
  stored: Record<string, unknown> | null,
  significantFields: string[] = SCHEME_SIGNIFICANT_FIELDS,
): SchemeChanged {
  const fields: string[] = [];
  const oldValue: Record<string, unknown> = {};
  const newValue: Record<string, unknown> = {};

  for (const f of significantFields) {
    const a = stableStringify(incoming[f]);
    const b = stableStringify(stored ? stored[f] : undefined);
    if (a !== b) {
      fields.push(f);
      oldValue[f] = stored ? stored[f] : null;
      newValue[f] = incoming[f];
    }
  }

  return { changed: fields.length > 0, fields, oldValue, newValue };
}

/** Is `candidate` a near-duplicate of an already-stored `existing` title? */
export function isTitleDuplicate(candidateTitle: string, existingTitles: string[]): boolean {
  if (existingTitles.length === 0) return false;
  const c = cleanToken(candidateTitle);
  if (!c) return false;
  const candTokens = c.split(/\s+/);
  if (candTokens.length < 2) return false;
  for (const t of existingTitles) {
    const exTokens = cleanToken(t).split(/\s+/);
    if (exTokens.length < 2) continue;
    const overlap = candTokens.filter((tok) => exTokens.includes(tok)).length;
    const smaller = Math.min(candTokens.length, exTokens.length);
    if (overlap / smaller >= 0.75) return true;
  }
  return false;
}

/**
 * Categorize a news item from its title/summary keywords. Both English and
 * Hindi (Devanagari) keyword sets are checked.
 */
const NEWS_CATEGORY_RULES: Array<{ category: string; keywords: string[] }> = [
  { category: "PM-KISAN", keywords: ["pm kisan", "pmkisan", "pm-kisan", "kisan samman", "किसान सम्मान", "पीएम किसान"] },
  { category: "PMFBY", keywords: ["pmfby", "fasal bima", "fasal bima yojana", "फसल बीमा"] },
  { category: "MSP & Prices", keywords: ["msp", "minimum support", "support price", "mandi bhav", "मंडी भाव", "समर्थन मूल्य"] },
  { category: "Weather & Monsoon", keywords: ["monsoon", "rain", "rainfall", "drought", "weather", "बारिश", "मानसून", "मौसम"] },
  { category: "Fertilizers", keywords: ["fertiliz", "urea", "dap", "पोटाश", "यूरिया", "उर्वरक", "खाद"] },
  { category: "Irrigation", keywords: ["irrigat", "drip", "सिंचाई", "ड्रिप"] },
  { category: "Credit & Loans", keywords: ["credit", "loan", "kcc", "finance", "कर्ज", "ऋण", "किसान क्रेडिट कार्ड"] },
  { category: "Government Schemes", keywords: ["scheme", "subsidi", "yojana", "sarkar", "योजना", "सब्सिडी"] },
];

export function categorizeNews(title: string, summary?: string | null): string {
  const haystack = `${title} ${summary || ""}`.toLowerCase();
  for (const rule of NEWS_CATEGORY_RULES) {
    if (rule.keywords.some((kw) => haystack.includes(kw))) return rule.category;
  }
  return "General";
}

/** Strip HTML tags + collapse whitespace for clean summaries. */
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

/** Extract the most relevant (smallest) image URL from an <enclosure>/content. */
export function pickImageUrl(sources: Array<string | null | undefined>): string | null {
  for (const src of sources) {
    if (src && /^https?:\/\/.+/i.test(src)) {
      const byExt = /\.(jpe?g|png|webp|gif|avif)(\?|$)/i.test(src);
      const byLength = src.length < 500;
      if ((byExt || byLength) && !/(logo|icon|banner|sprite)/i.test(src)) return src;
    }
  }
  return null;
}