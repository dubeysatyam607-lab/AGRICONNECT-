/** Shared worker types. File intentionally has no deno imports. */

export interface CuratedScheme {
  id: string;
  code: string;
  name: string;
  nameHi: string;
  category: string;
  level: string;
  applicableStates: string[];
  ministry: string;
  benefits: string;
  benefitAmount: string;
  benefitAmountNum: number;
  description: string;
  descriptionHi: string | null;
  applicationUrl: string;
  officialUrl: string;
  helpline: string;
  status: string;
  lastVerifiedDate: string;
  eligibility: string[];
}

export interface NewsItem {
  title: string;
  summary: string | null;
  content: string | null;
  link: string | null;
  guid: string | null;
  publishedAt: string | null;
  imageUrl: string | null;
}

export interface SyncJobResult {
  job: string;
  found: number;
  added: number;
  updated: number;
  skipped: number;
  removed: number;
  status: "success" | "partial" | "error" | "skipped";
  error?: string;
}

export interface SourceHealth {
  sourceName: string;
  status: "HEALTHY" | "DEGRADED" | "DOWN" | "STALE" | "UNVERIFIED";
  recordsCount: number;
  failureCount: number;
  responseTimeMs: number;
  lastSuccess: string | null;
  lastFailure: string | null;
}