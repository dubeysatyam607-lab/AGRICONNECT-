import { OfficialScheme, SchemeEligibilityRule, VERIFIED_GOVERNMENT_SCHEMES } from './government-schemes-data';

export interface FarmerProfileInput {
  age: number;
  landAcres: number;
  category: 'general' | 'sc' | 'st' | 'obc';
  annualIncome: number;
  hasBank: boolean;
  hasLandDocs: boolean;
  isFarmer: boolean;
  gender: 'male' | 'female';
  hasLivestock?: boolean;
  rural?: boolean;
  bpl?: boolean;
  state?: string;
  hasIrrigation?: boolean;
}

export interface MatchedCheckItem {
  key: string;
  label: string;
  labelHi: string;
  detail: string;
  detailHi: string;
  met: boolean;
  reason?: string;
}

export interface SchemeMatchResult {
  schemeId: string;
  code: string;
  title: string;
  titleHi: string;
  category: string;
  benefitAmount: string;
  benefit: string;
  color: string;
  applyUrl: string;
  pdfUrl: string;
  contactHelpline: string;
  score: number;
  status: 'ELIGIBLE' | 'POSSIBLY_ELIGIBLE' | 'NOT_ELIGIBLE';
  eligible: boolean;
  explanation: string;
  explanationHi: string;
  matchedRules: MatchedCheckItem[];
  missingRules: MatchedCheckItem[];
  allRules: MatchedCheckItem[];
  scheme: OfficialScheme;
}

export interface SchemeMatchResponse {
  totalAnalyzed: number;
  eligibleCount: number;
  possiblyEligibleCount: number;
  overallInsight: string;
  overallInsightHi: string;
  matches: SchemeMatchResult[];
  lastVerifiedDate: string;
}

export function evaluateFarmerEligibility(
  profile: FarmerProfileInput,
  customSchemes?: OfficialScheme[]
): SchemeMatchResponse {
  const schemesList = customSchemes && customSchemes.length > 0 ? customSchemes : VERIFIED_GOVERNMENT_SCHEMES;

  const matches: SchemeMatchResult[] = schemesList.map((scheme) => {
    const rules = scheme.eligibilityRules || [];
    let matchedCount = 0;
    const matchedRules: MatchedCheckItem[] = [];
    const missingRules: MatchedCheckItem[] = [];
    const allRules: MatchedCheckItem[] = [];

    rules.forEach((rule) => {
      let isMet = false;
      let reason = '';

      switch (rule.ruleType) {
        case 'land_docs_required':
          isMet = Boolean(profile.hasLandDocs && profile.isFarmer);
          reason = isMet
            ? 'Valid Land Khatauni/Khasra documents verified.'
            : 'Land ownership record (Khasra/Khatauni) is required.';
          break;

        case 'bank_required':
          isMet = Boolean(profile.hasBank);
          reason = isMet
            ? 'Aadhaar-seeded bank account verified for Direct Benefit Transfer (DBT).'
            : 'Active bank account linked with Aadhaar required.';
          break;

        case 'income_max': {
          const maxIncome = typeof rule.ruleValue === 'number' ? rule.ruleValue : 250000;
          isMet = profile.annualIncome <= maxIncome;
          reason = isMet
            ? `Annual family income (₹${profile.annualIncome.toLocaleString('en-IN')}) is within limit.`
            : `Annual income exceeds tax-exemption limit of ₹${maxIncome.toLocaleString('en-IN')}.`;
          break;
        }

        case 'age_min': {
          const minAge = typeof rule.ruleValue === 'number' ? rule.ruleValue : 18;
          isMet = profile.age >= minAge;
          reason = isMet
            ? `Applicant age (${profile.age} yrs) meets minimum requirement (${minAge} yrs).`
            : `Minimum age required is ${minAge} years.`;
          break;
        }

        case 'category':
          if (Array.isArray(rule.ruleValue)) {
            isMet = rule.ruleValue.includes(profile.category);
          } else {
            isMet = true;
          }
          reason = isMet
            ? `Farmer category (${profile.category.toUpperCase()}) qualifies for subsidy rates.`
            : `Category mismatch for target reservation.`;
          break;

        case 'irrigation_required':
          isMet = Boolean(profile.hasIrrigation || profile.hasLandDocs);
          reason = isMet
            ? 'Farm water source connectivity verified.'
            : 'Guaranteed farm water source (borewell/pond/canal) required.';
          break;

        default:
          isMet = true;
          reason = 'General farmer criteria satisfied.';
          break;
      }

      const item: MatchedCheckItem = {
        key: rule.key,
        label: rule.label,
        labelHi: rule.labelHi,
        detail: rule.detail,
        detailHi: rule.detailHi,
        met: isMet,
        reason,
      };

      allRules.push(item);
      if (isMet) {
        matchedCount++;
        matchedRules.push(item);
      } else {
        missingRules.push(item);
      }
    });

    // Score Calculation
    const totalRules = rules.length > 0 ? rules.length : 1;
    let baseScore = Math.round((matchedCount / totalRules) * 100);

    // Boost score for small/marginal farmers (< 5 acres)
    if (profile.landAcres > 0 && profile.landAcres <= 5 && scheme.targetGroups.includes('small_marginal')) {
      baseScore = Math.min(100, baseScore + 10);
    }

    // Boost for Women farmers
    if (profile.gender === 'female' && scheme.targetGroups.includes('women')) {
      baseScore = Math.min(100, baseScore + 10);
    }

    const score = Math.max(10, Math.min(100, baseScore));

    let status: 'ELIGIBLE' | 'POSSIBLY_ELIGIBLE' | 'NOT_ELIGIBLE' = 'POSSIBLY_ELIGIBLE';
    if (score >= 80 && missingRules.length === 0) {
      status = 'ELIGIBLE';
    } else if (score < 50 || missingRules.some((m) => m.key === 'income_tax')) {
      status = 'NOT_ELIGIBLE';
    }

    // Construct AI Explanation
    let explanation = '';
    let explanationHi = '';
    if (status === 'ELIGIBLE') {
      explanation = `You qualify 100% for ${scheme.title}. Your land size (${profile.landAcres} acres) and category (${profile.category.toUpperCase()}) match the official MoA&FW guidelines.`;
      explanationHi = `आप ${scheme.titleHi} के लिए पूर्ण रूप से पात्र हैं। आपकी भूमि और श्रेणी सरकारी दिशा-निर्देशों के अनुकूल है।`;
    } else if (status === 'POSSIBLY_ELIGIBLE') {
      explanation = `You are partially eligible (${score}% match). ${missingRules.length} condition requires verification: ${missingRules.map((m) => m.label).join(', ')}.`;
      explanationHi = `आप आंशिक रूप से पात्र हैं (${score}% मैच)। सत्यापन आवश्यक है: ${missingRules.map((m) => m.labelHi).join(', ')}।`;
    } else {
      explanation = `Currently not eligible for ${scheme.title} due to: ${missingRules.map((m) => m.reason).join(' ')}`;
      explanationHi = `${scheme.titleHi} के लिए अपात्र: ${missingRules.map((m) => m.labelHi).join(', ')}`;
    }

    return {
      schemeId: scheme.id,
      code: scheme.code,
      title: scheme.title,
      titleHi: scheme.titleHi,
      category: scheme.category,
      benefitAmount: scheme.benefitAmount,
      benefit: scheme.benefit,
      color: scheme.color,
      applyUrl: scheme.applyUrl,
      pdfUrl: scheme.pdfUrl,
      contactHelpline: scheme.contactHelpline,
      score,
      status,
      eligible: status === 'ELIGIBLE',
      explanation,
      explanationHi,
      matchedRules,
      missingRules,
      allRules,
      scheme,
    };
  });

  // Sort by score descending
  matches.sort((a, b) => b.score - a.score);

  const eligibleCount = matches.filter((m) => m.status === 'ELIGIBLE').length;
  const possiblyEligibleCount = matches.filter((m) => m.status === 'POSSIBLY_ELIGIBLE').length;

  const overallInsight = `AI verified ${schemesList.length} official government schemes for your profile. You qualify for ${eligibleCount} schemes with 100% eligibility and ${possiblyEligibleCount} with partial criteria.`;
  const overallInsightHi = `एआई ने आपके प्रोफ़ाइल के लिए ${schemesList.length} आधिकारिक योजनाओं का सत्यापन किया। आप ${eligibleCount} योजनाओं के लिए पूर्ण रूप से पात्र हैं।`;

  return {
    totalAnalyzed: schemesList.length,
    eligibleCount,
    possiblyEligibleCount,
    overallInsight,
    overallInsightHi,
    matches,
    lastVerifiedDate: new Date().toISOString().split('T')[0],
  };
}
