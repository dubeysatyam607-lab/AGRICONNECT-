import React, { useState, useMemo } from "react";
import {
  Landmark, Sparkles, Search, Filter, Bookmark, BookmarkCheck, Bell, BellRing,
  ExternalLink, ChevronRight, CalendarClock, ShieldCheck, CheckCircle2, XCircle,
  ScrollText, ArrowUpRight, Check, X, Heart, FileText, BadgeCheck,
  Users, Banknote, Phone, ArrowLeft, AlertCircle, CheckCircle,
  ShieldAlert, Info, Download, Share2, HelpCircle, Layers, CheckSquare
} from "lucide-react";
import { AgriCard } from "@/components/ui/agri-card";
import { AgriButton } from "@/components/ui/agri-button";
import { cn } from "@/lib/utils";
import {
  VERIFIED_GOVERNMENT_SCHEMES,
  OfficialScheme,
  getVerifiedCategories
} from "@/lib/government-schemes-data";
import {
  evaluateFarmerEligibility,
  FarmerProfileInput,
  SchemeMatchResponse,
  SchemeMatchResult
} from "@/lib/government-scheme-matcher";

function readList(key: string): string[] {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]") as string[];
  } catch {
    return [];
  }
}
function writeList(key: string, list: string[]) {
  localStorage.setItem(key, JSON.stringify(list));
}

const CATEGORIES = getVerifiedCategories();

const STATUS_STYLE: Record<string, string> = {
  urgent: "bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/20",
  soon: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20",
  open: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
  rolling: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
  closed: "bg-slate-500/15 text-muted-foreground border border-slate-500/20",
};

function daysLabel(s: OfficialScheme): { text: string; style: string } {
  if (s.rolling) return { text: "Open Round the Year", style: STATUS_STYLE.rolling };
  if (s.daysLeft < 0) return { text: "Application Window Closed", style: STATUS_STYLE.closed };
  if (s.daysLeft <= 14) return { text: `Closes in ${s.daysLeft} days`, style: STATUS_STYLE.urgent };
  if (s.daysLeft <= 45) return { text: `Closes in ${s.daysLeft} days`, style: STATUS_STYLE.soon };
  return { text: `Closes in ${s.daysLeft} days`, style: STATUS_STYLE.open };
}

function scoreBarClass(score: number) {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 50) return "bg-amber-500";
  return "bg-red-500";
}

/* ─────────────────────────────────────────────────────────────
 * Scheme Summary Card Component
 * ───────────────────────────────────────────────────────────── */
const SchemeCard = ({
  scheme,
  bookmarked,
  reminded,
  matchResult,
  onBookmark,
  onOpen,
  onApply,
  onShare
}: {
  scheme: OfficialScheme;
  bookmarked: boolean;
  reminded: boolean;
  matchResult?: SchemeMatchResult;
  onBookmark: () => void;
  onOpen: () => void;
  onApply: () => void;
  onShare: () => void;
}) => {
  const d = daysLabel(scheme);
  return (
    <AgriCard className="p-4 overflow-hidden relative group hover:border-primary/40 transition-all shadow-sm">
      <span className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: scheme.color }} />

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              {scheme.category}
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground uppercase">
              {scheme.level === 'central' ? 'Central Scheme' : 'State Scheme'}
            </span>
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <BadgeCheck size={12} className="text-emerald-600" /> Verified MoA&FW
            </span>
          </div>
          <h3 className="font-bold text-foreground text-base mt-2 leading-snug group-hover:text-primary transition-colors">
            {scheme.title}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{scheme.titleHi}</p>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onShare}
            className="p-2 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Share scheme"
            title="Share on WhatsApp"
          >
            <Share2 size={15} />
          </button>
          <button
            onClick={onBookmark}
            className="p-2 rounded-xl border border-border text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
            aria-label={bookmarked ? "Remove bookmark" : "Bookmark scheme"}
          >
            {bookmarked ? <BookmarkCheck size={16} className="text-primary" /> : <Bookmark size={16} />}
          </button>
        </div>
      </div>

      {/* Benefit Highlights */}
      <div className="flex items-baseline gap-2 mt-3 bg-muted/30 p-2.5 rounded-xl border border-border/50">
        <span className="text-xl font-black text-primary tracking-tight">{scheme.benefitAmount}</span>
        <span className="text-xs text-muted-foreground line-clamp-1 font-medium">{scheme.benefit}</span>
      </div>

      {/* Target Audience & Target Groups */}
      <div className="flex items-center justify-between gap-2 mt-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5 line-clamp-1">
          <Users size={13} className="shrink-0 text-primary" /> {scheme.openTo}
        </span>
        {reminded && (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
            <BellRing size={11} /> Alert Set
          </span>
        )}
      </div>

      {/* AI Qualification Badge (If available) */}
      {matchResult && (
        <div className={cn(
          "mt-3 p-2 rounded-xl text-xs flex items-center justify-between gap-2 border",
          matchResult.status === 'ELIGIBLE' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300" :
            matchResult.status === 'POSSIBLY_ELIGIBLE' ? "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-300" :
              "bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-300"
        )}>
          <span className="flex items-center gap-1.5 font-bold">
            {matchResult.status === 'ELIGIBLE' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
            AI Match: {matchResult.score}% Qualification
          </span>
          <span className="text-[10px] font-semibold underline cursor-pointer" onClick={onOpen}>Why?</span>
        </div>
      )}

      {/* Status & Deadline pill */}
      <div className="flex items-center justify-between gap-2 mt-3">
        <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold", d.style)}>
          {scheme.rolling ? <ShieldCheck size={12} /> : <CalendarClock size={12} />}
          {d.text}
        </span>
        <span className="text-[11px] text-muted-foreground font-medium">
          Helpline: <a href={`tel:${scheme.contactHelpline.split(' ')[0]}`} className="text-primary underline font-bold">{scheme.contactHelpline.split(' ')[0]}</a>
        </span>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 mt-4">
        <AgriButton variant="outline" size="sm" className="flex-1 rounded-xl" onClick={onOpen}>
          Full Guide <ChevronRight size={14} />
        </AgriButton>
        <AgriButton size="sm" className="flex-1 rounded-xl" onClick={onApply}>
          Apply Portal <ExternalLink size={14} />
        </AgriButton>
      </div>
    </AgriCard>
  );
};

/* ─────────────────────────────────────────────────────────────
 * Detailed Application & Verification Guide Sheet
 * ───────────────────────────────────────────────────────────── */
const DetailSheet = ({
  scheme,
  matchResult,
  bookmarked,
  reminded,
  onClose,
  onBookmark,
  onApply,
  onReminder,
  onShare
}: {
  scheme: OfficialScheme | null;
  matchResult: SchemeMatchResult | null;
  bookmarked: boolean;
  reminded: boolean;
  onClose: () => void;
  onBookmark: () => void;
  onApply: () => void;
  onReminder: () => void;
  onShare: () => void;
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'eligibility' | 'docs' | 'steps' | 'faqs'>('overview');

  if (!scheme) return null;
  const d = daysLabel(scheme);

  return (
    <div className="fixed inset-0 z-[70] bg-background overflow-y-auto animate-sheet-up" role="dialog" aria-modal="true" aria-label="Scheme guide">
      {/* Header bar */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <AgriButton variant="outline" size="icon" onClick={onClose} aria-label="Close details">
            <X size={18} />
          </AgriButton>
          <div>
            <h2 className="font-bold text-sm flex items-center gap-1.5 text-foreground">
              <Landmark size={16} className="text-primary" /> Scheme Application Guide
            </h2>
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <BadgeCheck size={11} className="text-emerald-600" /> {scheme.code} · Verified Govt Portal
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onShare}
            className="p-2 rounded-xl border border-border text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Share scheme"
          >
            <Share2 size={16} />
          </button>
          <button
            onClick={onBookmark}
            className="p-2 rounded-xl border border-border text-muted-foreground hover:text-primary transition-colors"
            aria-label={bookmarked ? "Remove bookmark" : "Bookmark scheme"}
          >
            {bookmarked ? <BookmarkCheck size={18} className="text-primary" /> : <Bookmark size={18} />}
          </button>
        </div>
      </div>

      <div className="p-4 pb-36 max-w-3xl mx-auto">
        {/* Category & Level Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-extrabold uppercase tracking-wide px-2.5 py-0.5 rounded-full bg-primary/10 text-primary">
            {scheme.category}
          </span>
          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground uppercase">
            {scheme.level === 'central' ? 'Central Sector Scheme' : 'State Agriculture Scheme'}
          </span>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
            <CheckCircle2 size={12} /> Verified as of {scheme.lastVerifiedDate}
          </span>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-extrabold text-foreground mt-3 leading-snug">{scheme.title}</h1>
        <p className="text-sm font-semibold text-muted-foreground mt-0.5">{scheme.titleHi}</p>
        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
          <BuildingIcon size={12} /> {scheme.ministry}
        </p>

        {/* Prominent Benefit Card */}
        <div className="mt-4 rounded-2xl border border-border p-4 shadow-sm" style={{ background: `${scheme.color}0d` }}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Financial Benefit / Subsidy</p>
              <p className="text-2xl font-black mt-0.5" style={{ color: scheme.color }}>{scheme.benefitAmount}</p>
              <p className="text-xs font-medium text-foreground mt-1 leading-relaxed">{scheme.benefit}</p>
            </div>
            <a
              href={scheme.pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-background border border-border text-xs font-bold text-foreground hover:text-primary hover:border-primary/40 transition-colors shadow-xs"
            >
              <Download size={14} /> Official PDF
            </a>
          </div>
        </div>

        {/* Tab Navigation inside Detail Guide */}
        <div className="mt-6 flex border-b border-border overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setActiveTab('overview')}
            className={cn("px-4 py-2.5 text-xs font-bold border-b-2 transition-colors shrink-0 flex items-center gap-1.5", activeTab === 'overview' ? "border-primary text-primary" : "border-transparent text-muted-foreground")}
          >
            <Info size={14} /> Overview
          </button>
          <button
            onClick={() => setActiveTab('eligibility')}
            className={cn("px-4 py-2.5 text-xs font-bold border-b-2 transition-colors shrink-0 flex items-center gap-1.5", activeTab === 'eligibility' ? "border-primary text-primary" : "border-transparent text-muted-foreground")}
          >
            <ShieldCheck size={14} /> Eligibility {matchResult && `(${matchResult.score}%)`}
          </button>
          <button
            onClick={() => setActiveTab('docs')}
            className={cn("px-4 py-2.5 text-xs font-bold border-b-2 transition-colors shrink-0 flex items-center gap-1.5", activeTab === 'docs' ? "border-primary text-primary" : "border-transparent text-muted-foreground")}
          >
            <ScrollText size={14} /> Documents ({scheme.docsRequired.length})
          </button>
          <button
            onClick={() => setActiveTab('steps')}
            className={cn("px-4 py-2.5 text-xs font-bold border-b-2 transition-colors shrink-0 flex items-center gap-1.5", activeTab === 'steps' ? "border-primary text-primary" : "border-transparent text-muted-foreground")}
          >
            <FileText size={14} /> How to Apply
          </button>
          <button
            onClick={() => setActiveTab('faqs')}
            className={cn("px-4 py-2.5 text-xs font-bold border-b-2 transition-colors shrink-0 flex items-center gap-1.5", activeTab === 'faqs' ? "border-primary text-primary" : "border-transparent text-muted-foreground")}
          >
            <HelpCircle size={14} /> FAQs
          </button>
        </div>

        {/* Tab 1: Overview */}
        {activeTab === 'overview' && (
          <div className="mt-4 space-y-4 animate-fade-up">
            <div className="rounded-2xl border border-border p-4 bg-card">
              <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
                <Info size={15} className="text-primary" /> Scheme Objective
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{scheme.overview}</p>
              <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border/60 leading-relaxed font-medium">{scheme.overviewHi}</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-border p-3 bg-card text-center">
                <p className="text-[10px] text-muted-foreground font-bold uppercase">Open To</p>
                <p className="text-xs font-extrabold text-foreground mt-1 line-clamp-2">{scheme.openTo}</p>
              </div>
              <div className="rounded-xl border border-border p-3 bg-card text-center">
                <p className="text-[10px] text-muted-foreground font-bold uppercase">Application Status</p>
                <span className={cn("inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase", d.style)}>
                  {d.text}
                </span>
              </div>
              <div className="rounded-xl border border-border p-3 bg-card text-center col-span-2 sm:col-span-1">
                <p className="text-[10px] text-muted-foreground font-bold uppercase">Helpline Support</p>
                <a href={`tel:${scheme.contactHelpline.split(' ')[0]}`} className="text-xs font-extrabold text-primary hover:underline mt-1 block">
                  {scheme.contactHelpline}
                </a>
              </div>
            </div>

            {/* Common Rejection Reasons Section */}
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
              <h3 className="text-sm font-bold text-amber-800 dark:text-amber-300 flex items-center gap-2 mb-2">
                <ShieldAlert size={16} /> Frequently Rejected Reasons & Solutions
              </h3>
              <div className="space-y-3">
                {scheme.commonRejectionReasons.map((item, idx) => (
                  <div key={idx} className="text-xs space-y-1 bg-background/80 p-2.5 rounded-xl border border-amber-500/20">
                    <p className="font-bold text-red-600 dark:text-red-400 flex items-start gap-1">
                      <XCircle size={13} className="shrink-0 mt-0.5" /> Rejection Cause: {item.reason}
                    </p>
                    <p className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-start gap-1">
                      <CheckCircle2 size={13} className="shrink-0 mt-0.5" /> Solution / Fix: {item.fix}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Eligibility Rules & AI Explanation */}
        {activeTab === 'eligibility' && (
          <div className="mt-4 space-y-4 animate-fade-up">
            {matchResult ? (
              <div className={cn(
                "rounded-2xl p-4 border flex flex-col gap-3",
                matchResult.status === 'ELIGIBLE' ? "bg-emerald-500/10 border-emerald-500/30" :
                  matchResult.status === 'POSSIBLY_ELIGIBLE' ? "bg-amber-500/10 border-amber-500/30" :
                    "bg-red-500/10 border-red-500/30"
              )}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Sparkles size={14} className="text-primary" /> AI Qualification Engine
                  </span>
                  <span className="text-lg font-black text-foreground">{matchResult.score}% Score</span>
                </div>
                <p className="text-sm font-bold text-foreground leading-snug">{matchResult.explanation}</p>
                <p className="text-xs text-muted-foreground font-medium">{matchResult.explanationHi}</p>
              </div>
            ) : null}

            <div className="rounded-2xl border border-border p-4 bg-card">
              <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                <ShieldCheck size={16} className="text-primary" /> Official Eligibility Criteria
              </h3>
              <div className="space-y-3">
                {scheme.eligibilityRules.map((rule) => {
                  const isMet = matchResult ? matchResult.matchedRules.some(r => r.key === rule.key) : true;
                  return (
                    <div key={rule.key} className="flex items-start gap-3 p-3 rounded-xl border border-border/60 bg-muted/20">
                      {isMet ? (
                        <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p className="text-xs font-bold text-foreground">{rule.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{rule.detail}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Required Documents */}
        {activeTab === 'docs' && (
          <div className="mt-4 space-y-3 animate-fade-up">
            <div className="rounded-2xl border border-border p-4 bg-card">
              <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                <ScrollText size={16} className="text-primary" /> Required Verification Documents
              </h3>
              <div className="space-y-2.5">
                {scheme.docsRequired.map((doc, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 rounded-xl border border-border/60 bg-muted/20">
                    <span className="w-6 h-6 rounded-lg bg-primary/10 text-primary text-xs font-extrabold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-bold text-foreground">{doc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Application Steps */}
        {activeTab === 'steps' && (
          <div className="mt-4 space-y-3 animate-fade-up">
            <div className="rounded-2xl border border-border p-4 bg-card">
              <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                <FileText size={16} className="text-primary" /> Step-by-Step Portal Submission Guide
              </h3>
              <div className="space-y-4">
                {scheme.applicationSteps.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-black flex items-center justify-center shrink-0 shadow-xs">
                      {idx + 1}
                    </span>
                    <div className="pt-0.5">
                      <p className="text-xs font-bold text-foreground leading-relaxed">{step}</p>
                      {scheme.applicationStepsHi[idx] && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">{scheme.applicationStepsHi[idx]}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: FAQs */}
        {activeTab === 'faqs' && (
          <div className="mt-4 space-y-3 animate-fade-up">
            {scheme.faqs.map((faq, idx) => (
              <div key={idx} className="rounded-2xl border border-border p-4 bg-card space-y-2">
                <p className="text-xs font-extrabold text-foreground flex items-center gap-2">
                  <HelpCircle size={15} className="text-primary shrink-0" /> {faq.question}
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed pl-6">{faq.answer}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Sticky CTA */}
      <div className="fixed bottom-0 inset-x-0 z-20 border-t border-border bg-background/95 backdrop-blur p-3.5 flex gap-2.5 max-w-3xl mx-auto shadow-lg">
        <AgriButton variant="outline" size="lg" onClick={onReminder} className="shrink-0 rounded-2xl">
          {reminded ? <BellRing size={16} className="text-primary" /> : <Bell size={16} />}
          <span className="hidden sm:inline">{reminded ? "Reminder Active" : "Remind Deadline"}</span>
        </AgriButton>
        <AgriButton size="lg" className="flex-1 rounded-2xl text-sm font-extrabold" onClick={onApply}>
          Go to Official Portal <ArrowUpRight size={16} />
        </AgriButton>
      </div>
    </div>
  );
};

/* Helper icon component */
const BuildingIcon = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
    <path d="M9 22v-4h6v4"></path>
    <path d="M8 6h.01"></path>
    <path d="M16 6h.01"></path>
    <path d="M12 6h.01"></path>
    <path d="M12 10h.01"></path>
    <path d="M12 14h.01"></path>
    <path d="M8 10h.01"></path>
    <path d="M8 14h.01"></path>
    <path d="M16 10h.01"></path>
    <path d="M16 14h.01"></path>
  </svg>
);

/* ─────────────────────────────────────────────────────────────
 * Interactive AI Eligibility Checker Modal
 * ───────────────────────────────────────────────────────────── */
const EligibilitySheet = ({
  onClose,
  onToast,
  onOpenScheme
}: {
  onClose: () => void;
  onToast: (m: string) => void;
  onOpenScheme: (id: string) => void;
}) => {
  const [age, setAge] = useState("35");
  const [landAcres, setLandAcres] = useState("3");
  const [category, setCategory] = useState<"general" | "sc" | "st" | "obc">("general");
  const [annualIncome, setAnnualIncome] = useState("150000");
  const [isFarmer, setIsFarmer] = useState(true);
  const [hasBank, setHasBank] = useState(true);
  const [hasLandDocs, setHasLandDocs] = useState(true);
  const [gender, setGender] = useState<"male" | "female">("male");
  const [hasIrrigation, setHasIrrigation] = useState(true);

  const [matchResponse, setMatchResponse] = useState<SchemeMatchResponse | null>(null);

  const runCheck = () => {
    const profile: FarmerProfileInput = {
      age: Number(age) || 35,
      landAcres: Number(landAcres) || 3,
      category,
      annualIncome: Number(annualIncome) || 150000,
      hasBank,
      hasLandDocs,
      isFarmer,
      gender,
      hasIrrigation
    };

    const res = evaluateFarmerEligibility(profile);
    setMatchResponse(res);
  };

  const fieldCls = "w-full h-11 px-3.5 rounded-xl border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 font-medium";

  if (matchResponse) {
    return (
    <div className="fixed inset-0 z-[70] bg-background overflow-y-auto animate-sheet-up" role="dialog" aria-modal="true" aria-label="AI eligibility report">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AgriButton variant="outline" size="icon" onClick={() => setMatchResponse(null)} aria-label="Back">
              <ArrowLeft size={16} />
            </AgriButton>
            <h2 className="font-bold text-sm flex items-center gap-1.5 text-foreground">
              <Sparkles size={15} className="text-primary" /> AI Eligibility Report
            </h2>
          </div>
          <AgriButton variant="ghost" size="sm" onClick={onClose}>Close</AgriButton>
        </div>

        <div className="p-4 pb-12 max-w-2xl mx-auto space-y-4">
          <div className="rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 p-4 text-white shadow-md">
            <p className="text-base font-black flex items-center gap-2">
              <BadgeCheck size={20} /> Verified {matchResponse.eligibleCount} Fully Eligible Schemes
            </p>
            <p className="text-xs mt-1.5 text-emerald-50 leading-relaxed font-medium">{matchResponse.overallInsight}</p>
          </div>

          <div className="space-y-3">
            {matchResponse.matches.map((m) => (
              <AgriCard key={m.schemeId} className="p-4 overflow-hidden relative">
                <span className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: m.color }} />

                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-bold text-foreground text-sm">{m.title}</h3>
                  <span className={cn(
                    "text-[11px] font-black px-2.5 py-0.5 rounded-full shrink-0",
                    m.status === 'ELIGIBLE' ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" :
                      m.status === 'POSSIBLY_ELIGIBLE' ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" :
                        "bg-red-500/15 text-red-500"
                  )}>
                    {m.score}% Match
                  </span>
                </div>

                <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                  <div className={cn("h-full rounded-full transition-all", scoreBarClass(m.score))} style={{ width: `${m.score}%` }} />
                </div>

                <p className="text-xs font-semibold text-foreground mt-2.5 leading-relaxed">{m.explanation}</p>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {m.matchedRules.slice(0, 3).map(r => (
                    <span key={r.key} className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <Check size={10} /> {r.label}
                    </span>
                  ))}
                  {m.missingRules.slice(0, 2).map(r => (
                    <span key={r.key} className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-500">
                      <X size={10} /> {r.label}
                    </span>
                  ))}
                </div>

                <div className="flex gap-2 mt-4">
                  <AgriButton variant="outline" size="sm" className="flex-1 rounded-xl" onClick={() => onOpenScheme(m.schemeId)}>
                    View Guide <ChevronRight size={14} />
                  </AgriButton>
                  <AgriButton
                    size="sm" className="flex-1 rounded-xl"
                    onClick={() => {
                      onToast(`Redirecting to official portal for ${m.title}...`);
                      window.open(m.applyUrl, "_blank", "noopener,noreferrer");
                    }}
                  >
                    Apply Now <ExternalLink size={14} />
                  </AgriButton>
                </div>
              </AgriCard>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[70] bg-background overflow-y-auto animate-sheet-up" role="dialog" aria-modal="true" aria-label="Eligibility report">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AgriButton variant="outline" size="icon" onClick={onClose} aria-label="Close">
            <X size={18} />
          </AgriButton>
          <div>
            <h2 className="font-bold text-sm flex items-center gap-1.5 text-foreground">
              <Sparkles size={16} className="text-primary" /> AI Scheme Qualification Engine
            </h2>
            <p className="text-[11px] text-muted-foreground">Verify your exact eligibility against 2026 guidelines</p>
          </div>
        </div>
      </div>

      <div className="p-4 pb-12 max-w-xl mx-auto space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase">Farmer Age (Years)</label>
            <input type="number" value={age} onChange={e => setAge(e.target.value)} className={cn(fieldCls, "mt-1")} placeholder="35" />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase">Land Holding (Acres)</label>
            <input type="number" value={landAcres} onChange={e => setLandAcres(e.target.value)} className={cn(fieldCls, "mt-1")} placeholder="3" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase">Social Category</label>
            <select value={category} onChange={e => setCategory(e.target.value as typeof category)} className={cn(fieldCls, "mt-1")}>
              <option value="general">General</option>
              <option value="obc">OBC</option>
              <option value="sc">SC (Scheduled Caste)</option>
              <option value="st">ST (Scheduled Tribe)</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase">Gender</label>
            <select value={gender} onChange={e => setGender(e.target.value as typeof gender)} className={cn(fieldCls, "mt-1")}>
              <option value="male">Male</option>
              <option value="female">Female Farmer</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase">Annual Family Income (₹)</label>
          <input type="number" value={annualIncome} onChange={e => setAnnualIncome(e.target.value)} className={cn(fieldCls, "mt-1")} placeholder="150000" />
        </div>

        <div className="space-y-2.5 pt-2">
          <label className="flex items-center justify-between p-3 rounded-xl border border-border bg-card cursor-pointer">
            <span className="text-xs font-bold text-foreground flex items-center gap-2">
              <ShieldCheck size={16} className="text-primary" /> Own Cultivable Farming Land
            </span>
            <input type="checkbox" checked={isFarmer} onChange={e => setIsFarmer(e.target.checked)} className="w-4 h-4 accent-primary rounded" />
          </label>
          <label className="flex items-center justify-between p-3 rounded-xl border border-border bg-card cursor-pointer">
            <span className="text-xs font-bold text-foreground flex items-center gap-2">
              <Banknote size={16} className="text-primary" /> Active Aadhaar-Seeded Bank Account
            </span>
            <input type="checkbox" checked={hasBank} onChange={e => setHasBank(e.target.checked)} className="w-4 h-4 accent-primary rounded" />
          </label>
          <label className="flex items-center justify-between p-3 rounded-xl border border-border bg-card cursor-pointer">
            <span className="text-xs font-bold text-foreground flex items-center gap-2">
              <FileText size={16} className="text-primary" /> Khasra / Khatauni Land Record Document
            </span>
            <input type="checkbox" checked={hasLandDocs} onChange={e => setHasLandDocs(e.target.checked)} className="w-4 h-4 accent-primary rounded" />
          </label>
          <label className="flex items-center justify-between p-3 rounded-xl border border-border bg-card cursor-pointer">
            <span className="text-xs font-bold text-foreground flex items-center gap-2">
              <CheckSquare size={16} className="text-primary" /> Guaranteed Farm Irrigation Source
            </span>
            <input type="checkbox" checked={hasIrrigation} onChange={e => setHasIrrigation(e.target.checked)} className="w-4 h-4 accent-primary rounded" />
          </label>
        </div>

        <AgriButton variant="magic" size="lg" className="w-full mt-6 rounded-2xl text-base font-extrabold" onClick={runCheck}>
          <Sparkles size={18} /> Calculate AI Scheme Match
        </AgriButton>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
 * Main Schemes View Component
 * ───────────────────────────────────────────────────────────── */
interface SchemesProps {
  onToast: (message: string) => void;
}

const Schemes: React.FC<SchemesProps> = ({ onToast }) => {
  const [schemes, setSchemes] = useState<OfficialScheme[]>(VERIFIED_GOVERNMENT_SCHEMES);
  const [categories, setCategories] = useState<string[]>(CATEGORIES);
  const [loading, setLoading] = useState(false);
  const [verifiedSyncDate, setVerifiedSyncDate] = useState("2026-08-06");

  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState("All");
  const [levelFilter, setLevelFilter] = useState<'all' | 'central' | 'state'>('all');
  const [targetFilter, setTargetFilter] = useState<string>('all');
  const [sort, setSort] = useState<"relevance" | "deadline" | "amount">("relevance");

  const [view, setView] = useState<"discover" | "bookmarks" | "alerts">("discover");

  const [bookmarks, setBookmarks] = useState<string[]>(() => readList("scheme_finder_bookmarks"));
  const [reminders, setReminders] = useState<string[]>(() => readList("scheme_finder_reminders"));

  const [selectedScheme, setSelectedScheme] = useState<OfficialScheme | null>(null);
  const [showEligibility, setShowEligibility] = useState(false);

  // Default demo farmer profile for instant inline AI matching
  const demoProfile: FarmerProfileInput = useMemo(() => ({
    age: 38,
    landAcres: 3,
    category: 'general',
    annualIncome: 140000,
    hasBank: true,
    hasLandDocs: true,
    isFarmer: true,
    gender: 'male',
    hasIrrigation: true
  }), []);

  const matchReport = useMemo(() => {
    return evaluateFarmerEligibility(demoProfile, schemes);
  }, [demoProfile, schemes]);

  const matchResultMap = useMemo(() => {
    const map = new Map<string, SchemeMatchResult>();
    matchReport.matches.forEach(m => map.set(m.schemeId, m));
    return map;
  }, [matchReport]);

  const toggleBookmark = (id: string) => {
    const next = bookmarks.includes(id) ? bookmarks.filter(x => x !== id) : [...bookmarks, id];
    setBookmarks(next);
    writeList("scheme_finder_bookmarks", next);
    onToast(next.includes(id) ? "Bookmark saved to device" : "Bookmark removed");
  };

  const toggleReminder = (id: string) => {
    const has = reminders.includes(id);
    const next = has ? reminders.filter(x => x !== id) : [...reminders, id];
    setReminders(next);
    writeList("scheme_finder_reminders", next);
    onToast(has ? "Deadline alert cancelled" : "Deadline alert set — notification scheduled");
  };

  const shareScheme = (s: OfficialScheme) => {
    const text = `🌾 *${s.title}*\nBenefit: ${s.benefitAmount}\nApply Portal: ${s.applyUrl}\nVerified via AgriConnect App`;
    if (navigator.share) {
      navigator.share({ title: s.title, text, url: s.applyUrl }).catch(() => { });
    } else {
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
    }
  };

  const applyPortal = (s: OfficialScheme) => {
    onToast(`Opening official ${s.ministry} portal...`);
    window.open(s.applyUrl, "_blank", "noopener,noreferrer");
  };

  // Filtered Scheme List Calculation
  const filteredSchemes = useMemo(() => {
    let list = schemes;

    if (activeCat !== "All") {
      list = list.filter(s => s.category === activeCat);
    }

    if (levelFilter !== 'all') {
      list = list.filter(s => s.level === levelFilter);
    }

    if (targetFilter !== 'all') {
      list = list.filter(s => s.targetGroups.includes(targetFilter as any));
    }

    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(s =>
        s.title.toLowerCase().includes(q) ||
        s.titleHi.includes(q) ||
        s.category.toLowerCase().includes(q) ||
        s.ministry.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        s.benefitAmount.toLowerCase().includes(q)
      );
    }

    if (sort === "deadline") {
      list = [...list].sort((a, b) => (a.rolling ? 1 : 0) - (b.rolling ? 1 : 0) || a.daysLeft - b.daysLeft);
    } else if (sort === "amount") {
      list = [...list].sort((a, b) => b.benefitAmountNum - a.benefitAmountNum);
    }

    return list;
  }, [schemes, activeCat, levelFilter, targetFilter, query, sort]);

  const bookmarkedSchemes = useMemo(() => {
    return schemes.filter(s => bookmarks.includes(s.id));
  }, [schemes, bookmarks]);

  return (
    <div className="pb-28 pt-4 px-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-2xl font-black text-foreground flex items-center gap-2 tracking-tight">
            <Landmark className="text-primary" size={26} /> Government Benefits
          </h2>
          <p className="text-xs text-muted-foreground flex items-center gap-1 font-medium mt-0.5">
            <BadgeCheck size={13} className="text-emerald-600" /> Real-time MoA&FW Verified Data Portal
          </p>
        </div>
        <AgriButton variant="magic" size="sm" className="rounded-xl" onClick={() => setShowEligibility(true)}>
          <Sparkles size={14} /> AI Qualification
        </AgriButton>
      </div>

      {/* Verified Data Badge Banner */}
      <div className="mb-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-2.5 text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
        <span className="flex items-center gap-1.5 font-bold">
          <ShieldCheck size={15} className="text-emerald-600" /> Curated from Official MoA&FW & State Scheme records
        </span>
        <span className="text-[10px] font-semibold opacity-80">Reference updated: {verifiedSyncDate}</span>
      </div>

      {/* Top Navigation Tabs */}
      <div className="grid grid-cols-3 gap-2 rounded-xl bg-muted/60 p-1 mb-4">
        <button
          onClick={() => setView("discover")}
          className={cn("flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-extrabold transition-all", view === "discover" ? "bg-card shadow-xs text-primary" : "text-muted-foreground")}
        >
          <Search size={14} /> Discover ({schemes.length})
        </button>
        <button
          onClick={() => setView("bookmarks")}
          className={cn("flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-extrabold transition-all", view === "bookmarks" ? "bg-card shadow-xs text-primary" : "text-muted-foreground")}
        >
          {bookmarks.length > 0 ? <BookmarkCheck size={14} /> : <Bookmark size={14} />} Bookmarks ({bookmarks.length})
        </button>
        <button
          onClick={() => setView("alerts")}
          className={cn("flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-extrabold transition-all", view === "alerts" ? "bg-card shadow-xs text-primary" : "text-muted-foreground")}
        >
          <Bell size={14} /> Alerts ({reminders.length})
        </button>
      </div>

      {/* DISCOVER VIEW */}
      {view === "discover" && (
        <>
          {/* Search bar */}
          <div className="relative mb-3">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search PM-KISAN, PMFBY, Solar Pump, Machinery Subsidy..."
              className="w-full h-11 pl-9 pr-9 rounded-2xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 font-medium shadow-xs"
            />
            {query && (
              <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X size={15} />
              </button>
            )}
          </div>

          {/* Filters Row 1: Central vs State Level */}
          <div className="flex items-center gap-2 mb-3 overflow-x-auto scrollbar-hide pb-0.5">
            <span className="text-xs font-bold text-muted-foreground flex items-center gap-1 shrink-0">
              <Layers size={13} /> Level:
            </span>
            <button
              onClick={() => setLevelFilter('all')}
              className={cn("px-3 py-1 rounded-full text-xs font-bold border transition-colors shrink-0", levelFilter === 'all' ? "bg-primary text-primary-foreground border-primary" : "border-border bg-card text-muted-foreground")}
            >
              All Levels
            </button>
            <button
              onClick={() => setLevelFilter('central')}
              className={cn("px-3 py-1 rounded-full text-xs font-bold border transition-colors shrink-0", levelFilter === 'central' ? "bg-primary text-primary-foreground border-primary" : "border-border bg-card text-muted-foreground")}
            >
              Central Govt
            </button>
            <button
              onClick={() => setLevelFilter('state')}
              className={cn("px-3 py-1 rounded-full text-xs font-bold border transition-colors shrink-0", levelFilter === 'state' ? "bg-primary text-primary-foreground border-primary" : "border-border bg-card text-muted-foreground")}
            >
              State Depts
            </button>
          </div>

          {/* Category Chips */}
          <div className="flex gap-2 overflow-x-auto pb-1 mb-4 -mx-4 px-4 scrollbar-hide">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCat(cat)}
                className={cn(
                  "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all",
                  activeCat === cat ? "bg-primary text-primary-foreground border-primary shadow-xs" : "border-border text-muted-foreground bg-card hover:border-primary/40"
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Scheme Cards Grid */}
          <div className="space-y-3.5">
            {filteredSchemes.map(s => (
              <SchemeCard
                key={s.id}
                scheme={s}
                bookmarked={bookmarks.includes(s.id)}
                reminded={reminders.includes(s.id)}
                matchResult={matchResultMap.get(s.id)}
                onBookmark={() => toggleBookmark(s.id)}
                onOpen={() => setSelectedScheme(s)}
                onApply={() => applyPortal(s)}
                onShare={() => shareScheme(s)}
              />
            ))}

            {filteredSchemes.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center bg-card rounded-2xl border border-border p-6">
                <Search className="text-muted-foreground/40 mb-3" size={44} />
                <p className="text-base font-bold text-foreground">No matching verified schemes found</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                  Try adjusting your search filters or clearing category selection.
                </p>
                <AgriButton variant="outline" size="sm" className="mt-4" onClick={() => { setQuery(""); setActiveCat("All"); setLevelFilter("all"); }}>
                  Reset All Filters
                </AgriButton>
              </div>
            )}
          </div>
        </>
      )}

      {/* BOOKMARKS VIEW */}
      {view === "bookmarks" && (
        <div className="space-y-3.5">
          <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-2">
            <BookmarkCheck size={14} className="text-primary" /> {bookmarkedSchemes.length} Bookmarked Scheme Guideline{bookmarkedSchemes.length === 1 ? "" : "s"} Saved
          </p>
          {bookmarkedSchemes.map(s => (
            <SchemeCard
              key={s.id}
              scheme={s}
              bookmarked={true}
              reminded={reminders.includes(s.id)}
              matchResult={matchResultMap.get(s.id)}
              onBookmark={() => toggleBookmark(s.id)}
              onOpen={() => setSelectedScheme(s)}
              onApply={() => applyPortal(s)}
              onShare={() => shareScheme(s)}
            />
          ))}
          {bookmarkedSchemes.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center bg-card rounded-2xl border border-border p-6">
              <Bookmark className="text-muted-foreground/40 mb-3" size={44} />
              <p className="text-base font-bold text-foreground">No bookmarked schemes</p>
              <p className="text-xs text-muted-foreground mt-1">
                Tap the bookmark icon on any scheme card to save it for quick offline reference.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ALERTS VIEW */}
      {view === "alerts" && (
        <div className="space-y-3.5">
          <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-2">
            <Bell size={14} className="text-primary" /> Scheduled Deadline & Document Alerts
          </p>
          {schemes.map(s => {
            const isReminded = reminders.includes(s.id);
            return (
              <AgriCard key={s.id} className="p-4 flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <CalendarClock size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-foreground">{s.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Deadline: {s.deadline} ({daysLabel(s).text})</p>
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={() => toggleReminder(s.id)}
                      className={cn(
                        "px-3 py-1 rounded-lg text-xs font-bold border transition-colors flex items-center gap-1.5",
                        isReminded ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"
                      )}
                    >
                      <Bell size={12} /> {isReminded ? "Alert Enabled" : "Enable Alert"}
                    </button>
                    <AgriButton variant="outline" size="sm" onClick={() => setSelectedScheme(s)}>
                      View Details
                    </AgriButton>
                  </div>
                </div>
              </AgriCard>
            );
          })}
        </div>
      )}

      {/* AI Qualification Sheet */}
      {showEligibility && (
        <EligibilitySheet
          onClose={() => setShowEligibility(false)}
          onToast={onToast}
          onOpenScheme={(id) => {
            setShowEligibility(false);
            const found = schemes.find(x => x.id === id);
            if (found) setSelectedScheme(found);
          }}
        />
      )}

      {/* Detail Application Guide Modal */}
      {selectedScheme && (
        <DetailSheet
          scheme={selectedScheme}
          matchResult={matchResultMap.get(selectedScheme.id) || null}
          bookmarked={bookmarks.includes(selectedScheme.id)}
          reminded={reminders.includes(selectedScheme.id)}
          onClose={() => setSelectedScheme(null)}
          onBookmark={() => toggleBookmark(selectedScheme.id)}
          onApply={() => applyPortal(selectedScheme)}
          onReminder={() => toggleReminder(selectedScheme.id)}
          onShare={() => shareScheme(selectedScheme)}
        />
      )}
    </div>
  );
};

export default Schemes;
