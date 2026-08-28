import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { resolveAllowedOrigins, getCorsHeaders as sharedCorsHeaders } from "../_shared/cors.ts";
import { checkRateLimit, getRateLimitHeaders } from "../_shared/rate-limiter.ts";

const ALLOWED_ORIGINS = resolveAllowedOrigins();

function getCORSHeaders(origin: string | null): Record<string, string> {
  return sharedCorsHeaders(origin, 'GET, POST, OPTIONS');
}

const RATE_LIMIT_CONFIG = { maxRequests: 100, windowMs: 60 * 1000 };
const DAY_MS = 86400000;

// Recommended ordering: closing-soon first, then open, rolling (always open),
// and closed schemes last. Ties fall through to the daysLeft comparator.
function recommendedRank(s: { rolling: boolean; status: string }): number {
  if (s.rolling) return 3;
  if (s.status === "urgent") return 0;
  if (s.status === "soon") return 1;
  if (s.status === "open") return 2;
  return 4;
}

type CategoryValue =
  | "general"
  | "sc"
  | "st"
  | "obc"
  | "all";

interface Profile {
  age?: number;
  landAcres?: number;
  category?: CategoryValue;
  annualIncome?: number;
  monthlyIncome?: number;
  hasBank?: boolean;
  hasLandDocs?: boolean;
  isFarmer?: boolean;
  gender?: "male" | "female";
  hasLivestock?: boolean;
  rural?: boolean;
  bpl?: boolean;
  beekeeper?: boolean;
  fisher?: boolean;
}

interface Scheme {
  id: string;
  title: string;
  titleHi: string;
  category: string;
  ministry: string;
  summary: string;
  summaryHi: string;
  benefit: string;
  benefitAmount: string;
  color: string;
  applyUrl: string;
  deadline: string;
  rolling: boolean;
  docs: string[];
  timeline: string[];
  contact: string;
  beneficiaries: string;
  budget: string;
  weight: number;
  openTo: string;
  notificationCadence: "weekly" | "seasonal" | "event";
  criteria: Array<{
    label: string;
    labelHi: string;
    detail: string;
    test: (p: Profile) => boolean;
  }>;
}

const CATEGORIES = ["Income Support", "Subsidy", "Insurance", "Credit", "Market", "Employment", "Health", "Education", "Welfare"];

const add = (label: string, labelHi: string, detail: string, test: (p: Profile) => boolean) => ({
  label, labelHi, detail, test,
});

const SCHEMES: Scheme[] = [
  {
    id: "s-1", title: "PM Kisan Samman Nidhi", titleHi: "पीएम किसान सम्मान निधि",
    category: "Income Support", ministry: "Ministry of Agriculture",
    summary: "Direct income support of ₹6,000 per year for landholding farmer families, paid in three equal instalments of ₹2,000.",
    summaryHi: "भूमि धारण करने वाले किसान परिवारों के लिए प्रति वर्ष ₹6,000 की सीधी आय सहायता, तीन समान किश्तों में ₹2,000।",
    benefit: "₹6,000/year direct transfer", benefitAmount: "₹6,000/yr",
    color: "#16a34a", applyUrl: "https://pmkisan.gov.in/",
    deadline: "2026-12-31", rolling: true,
    docs: ["Aadhaar card", "Land records (khasra / khatauni)", "Bank passbook", "Ration card", "Passport size photo"],
    timeline: ["Check your name in the PM-KISAN beneficiary list", "Visit your nearest CSC or PM-KISAN portal", "Fill the farmer registration form with land details", "Upload Aadhaar-linked bank details", "Instalments credit automatically each quarter"],
    contact: "1800-115-526 / pmkisan-ict@gov.in", beneficiaries: "11.8 crore+ families", budget: "₹60,000+ crore / year",
    weight: 10, openTo: "Farmer families with up to 2 ha (≈5 acres) land",
    notificationCadence: "seasonal",
    criteria: [
      add("Farmer status", "किसान होना", "Must be a cultivator owning farmland", (p) => !!p.isFarmer),
      add("Land holding ≤ 2 ha (≈5 acres)", "भूमि ≤ 2 हेक्टेयर", "Small & marginal farmer families", (p) => (p.landAcres ?? 100) <= 5),
      add("Land records available", "भूमि अभिलेख उपलब्ध", "Khasra / khatauni required for registration", (p) => !!p.hasLandDocs),
    ],
  },
  {
    id: "s-2", title: "Pradhan Mantri Fasal Bima Yojana", titleHi: "प्रधानमंत्री फसल बीमा योजना",
    category: "Insurance", ministry: "Ministry of Agriculture",
    summary: "Crop insurance at a nominal premium — 2% of sum insured for Kharif, 1.5% for Rabi and 5% for commercial crops — with full claim on crop loss.",
    summaryHi: "नाममात्र प्रीमियम पर फसल बीमा — खरीफ के लिए 2%, रबी के लिए 1.5% और वाणिज्यिक फसलों के लिए 5% — फसल हानि पर पूर्ण दावा।",
    benefit: "Full claim on crop loss, nominal premium", benefitAmount: "Premium 2% / 1.5%",
    color: "#2563eb", applyUrl: "https://pmfby.gov.in/",
    deadline: "2026-09-30", rolling: false,
    docs: ["Aadhaar card", "Land records (khasra)", "Bank account (Aadhaar-linked)", "Crop & sowing details", "Photo identity"],
    timeline: ["Notify your bank/insurance company before the cut-off", "Submit loan details if cultivation is under a bank loan", "Pay the nominal premium (auto-debit for loanee farmers)", "Receive acknowledgement via SMS", "Claim settlements after crop assessment"],
    contact: "PMFBY helpline / pmfby@nic.in", beneficiaries: "5.5 crore+ applications / year", budget: "₹30,000+ crore / year",
    weight: 9, openTo: "All farmers including sharecroppers and tenant farmers",
    notificationCadence: "seasonal",
    criteria: [
      add("Farmer status", "किसान होना", "Cultivators, sharecroppers, tenant farmers covered", (p) => !!p.isFarmer),
      add("Bank account", "बैंक खाता", "Aadhaar-linked account for premium & claims", (p) => !!p.hasBank),
      add("Crop cultivated", "फसल उगाई हो", "Insurable notified crop must be sown", (p) => !!p.isFarmer),
    ],
  },
  {
    id: "s-3", title: "Pradhan Mantri Krishi Sinchai Yojana", titleHi: "प्रधानमंत्री कृषि सिंचाई योजना",
    category: "Subsidy", ministry: "Ministry of Jal Shakti",
    summary: "Subsidy on micro-irrigation (drip & sprinkler) — up to 55% for small & marginal farmers — and support for watershed development and solar pumping.",
    summaryHi: "सूक्ष्म सिंचाई (ड्रिप और स्प्रिंकलर) पर अनुदान — लघु और सीमांत किसानों के लिए 55% तक — साथ ही जलग्रहण विकास।",
    benefit: "Up to 55% subsidy on drip & sprinkler", benefitAmount: "55% subsidy",
    color: "#0891b2", applyUrl: "https://pmksy.gov.in/",
    deadline: "2026-08-15", rolling: false,
    docs: ["Aadhaar card", "Land records (khasra)", "Bank passbook", "Farmer's ID / KCC", "Quotation from approved vendor"],
    timeline: ["Contact your District Agriculture Office", "Submit land + Aadhaar + bank details", "Site inspection & cost estimation", "Get vendor quotation approved", "Installation done under supervision, subsidy credited"],
    contact: "District Agriculture Officer (PMKSY)", beneficiaries: "2.6 crore+ acres covered", budget: "₹60,000+ crore",
    weight: 8, openTo: "All farmers (higher subsidy for small/marginal)",
    notificationCadence: "event",
    criteria: [
      add("Farmer status", "किसान होना", "Land-owning cultivators eligible", (p) => !!p.isFarmer),
      add("Land records", "भूमि अभिलेख", "Khasra required for subsidy claim", (p) => !!p.hasLandDocs),
      add("Bank account", "बैंक खाता", "Subsidy credited to account", (p) => !!p.hasBank),
    ],
  },
  {
    id: "s-4", title: "Kisan Credit Card", titleHi: "किसान क्रेडिट कार्ड",
    category: "Credit", ministry: "Ministry of Agriculture",
    summary: "Short-term credit for crop cultivation at concessional rates — effective 4% interest after interest subvention, up to ₹3 lakh without collateral.",
    summaryHi: "फसल उगाने के लिए रियायती दर पर अल्पकालिक ऋण — ब्याज अनुदान के बाद प्रभावी 4% ब्याज, ₹3 लाख तक बिना गारंटी।",
    benefit: "Up to ₹3 lakh credit at 4% effective interest", benefitAmount: "₹3 lakh @ 4%",
    color: "#7c3aed", applyUrl: "https://pmkisan.gov.in/RegistrationFormKCC.aspx",
    deadline: "2026-12-31", rolling: true,
    docs: ["Aadhaar card", "Land records / tenancy proof", "Bank account", "Passport photo", "Crop details"],
    timeline: ["Apply at your bank or cooperative society", "Submit land records & KYC", "Bank does a field verification", "Limit sanctioned, card issued", "Draw credit anytime during season"],
    contact: "Your bank branch / NABARD", beneficiaries: "7 crore+ KCC holders", budget: "NABARD refinance support",
    weight: 7, openTo: "Farmers, tenant farmers, dairy & fishery farmers",
    notificationCadence: "weekly",
    criteria: [
      add("Farmer / producer status", "किसान/उत्पादक होना", "Cultivators, dairy, fisheries eligible", (p) => !!p.isFarmer || !!p.hasLivestock || !!p.fisher),
      add("Land or tenancy proof", "भूमि या काश्तकारी प्रमाण", "Documentation of cultivation", (p) => !!p.hasLandDocs),
      add("Bank account", "बैंक खाता", "KYC-compliant account", (p) => !!p.hasBank),
    ],
  },
  {
    id: "s-5", title: "PM-KUSUM Solar Pump Scheme", titleHi: "पीएम-कुसुम सोलर पंप योजना",
    category: "Subsidy", ministry: "Ministry of New & Renewable Energy",
    summary: "Up to 60% central subsidy on standalone solar agricultural pumps and solarisation of existing grid-connected pumps, plus income from surplus solar power.",
    summaryHi: "सौर कृषि पंपों पर 60% तक केंद्रीय अनुदान और अतिरिक्त सौर बिजली से आय।",
    benefit: "60% subsidy + income from surplus power", benefitAmount: "60% subsidy",
    color: "#d97706", applyUrl: "https://pmkusum.mnre.gov.in/",
    deadline: "2026-08-31", rolling: false,
    docs: ["Aadhaar card", "Land records (khasra)", "Bank account", "Cultivation proof", "State DISCOM connection details"],
    timeline: ["Register on the state DISCOM PM-KUSUM portal", "Submit land, Aadhaar & bank details", "Get technical feasibility approved", "Pay beneficiary share (subsidy adjusted)", "Installation by empanelled vendor & commissioning"],
    contact: "State DISCOM / MNRE helpline", beneficiaries: "30,000+ MW solar capacity target", budget: "₹34,000+ crore",
    weight: 7, openTo: "Farmers with irrigable land (≥ 0.5 acre)",
    notificationCadence: "event",
    criteria: [
      add("Farmer status", "किसान होना", "Cultivator owning irrigable land", (p) => !!p.isFarmer),
      add("Minimum land", "न्यूनतम भूमि", "At least 0.5 acre of irrigable land", (p) => (p.landAcres ?? 0) >= 0.5),
      add("Land records", "भूमि अभिलेख", "Khasra mandatory for registration", (p) => !!p.hasLandDocs),
    ],
  },
  {
    id: "s-6", title: "Soil Health Card Scheme", titleHi: "मृदा स्वास्थ्य कार्ड योजना",
    category: "Subsidy", ministry: "Ministry of Agriculture",
    summary: "Free soil testing every two years with a personalised Soil Health Card recommending nutrients, fertilisers and amendments for your farm.",
    summaryHi: "हर दो साल में निःशुल्क मृदा परीक्षण के साथ आपके खेत के लिए पोषक तत्व सिफारिश।",
    benefit: "Free soil test + nutrient advisory", benefitAmount: "Free",
    color: "#65a30d", applyUrl: "https://soilhealth.dac.gov.in/",
    deadline: "2026-12-31", rolling: true,
    docs: ["Aadhaar card", "Land records (khasra)", "Farmer's photo", "Bank account"],
    timeline: ["Request soil sample collection at your block/soil lab", "Provide plot location & land record", "Lab analyses NPK, micronutrients & pH", "Receive Soil Health Card with recommendations", "Apply fertiliser as per advisory"],
    contact: "District Soil Testing Lab", beneficiaries: "23 crore+ cards issued", budget: "Central + state funded",
    weight: 5, openTo: "All farmers",
    notificationCadence: "seasonal",
    criteria: [
      add("Farmer status", "किसान होना", "Any cultivator can request testing", (p) => !!p.isFarmer),
      add("Land records", "भूमि अभिलेख", "Plot identification needed", (p) => !!p.hasLandDocs),
    ],
  },
  {
    id: "s-7", title: "e-NAM National Agriculture Market", titleHi: "ई-नाम राष्ट्रीय कृषि बाजार",
    category: "Market", ministry: "Ministry of Agriculture",
    summary: "Online pan-India trading platform connecting APMC mandis — bid for better prices, sell produce across states and get transparent same-day payments.",
    summaryHi: "APMC मंडियों को जोड़ने वाला ऑनलाइन पैन-इंडिया व्यापार मंच — बेहतर मूल्य बोली और पारदर्शी भुगतान।",
    benefit: "Better prices across mandis + instant payment", benefitAmount: "Market access",
    color: "#ca8a04", applyUrl: "https://enam.gov.in/",
    deadline: "2026-12-31", rolling: true,
    docs: ["Aadhaar card", "Bank account", "Registration at APMC/e-NAM node", "Mobile number"],
    timeline: ["Register on the e-NAM portal or at a mandi node", "Get a trader/buyer identity (lot sampling)", "Lift your produce to the e-NAM mandi", "Bid online across the country", "Settle sale & payment same day"],
    contact: "e-NAM cell of your mandi", beneficiaries: "1.7 crore+ farmers registered", budget: "₹200 crore+ investment",
    weight: 5, openTo: "All farmers & traders of e-NAM mandis",
    notificationCadence: "weekly",
    criteria: [
      add("Farmer status", "किसान होना", "Produce sellers eligible", (p) => !!p.isFarmer),
      add("Bank account", "बैंक खाता", "Sale proceeds credited digitally", (p) => !!p.hasBank),
    ],
  },
  {
    id: "s-8", title: "Agriculture Infrastructure Fund", titleHi: "कृषि अवसंरचना कोष",
    category: "Credit", ministry: "Ministry of Agriculture",
    summary: "₹2 lakh crore fund offering loans at 3% interest subvention for setting up warehouses, cold storage, custom hiring centres and primary processing units.",
    summaryHi: "₹2 लाख करोड़ का कोष — गोदाम, कोल्ड स्टोरेज, कस्टम हायरिंग केंद्र के लिए 3% ब्याज अनुदान पर ऋण।",
    benefit: "3% interest subvention on infra loans", benefitAmount: "3% subvention",
    color: "#0891b2", applyUrl: "https://agriinfra.dac.gov.in/",
    deadline: "2026-11-30", rolling: false,
    docs: ["Project report", "Land documents", "FPO/group registration (if applicable)", "Bank account", "Aadhaar & PAN"],
    timeline: ["Prepare a project proposal", "Apply through a bank or online portal", "Project appraisal & sanction", "Disbursement in stages", "Interest subvention via DBT"],
    contact: "agriinfra.dac.gov.in / NABARD", beneficiaries: "30,000+ projects sanctioned", budget: "₹2,00,000 crore fund",
    weight: 6, openTo: "Farmers, FPOs, agri-entrepreneurs & start-ups",
    notificationCadence: "event",
    criteria: [
      add("Entrepreneur/group", "उद्यमी/समूह होना", "Farmers, FPOs, startups eligible", (p) => !!p.isFarmer || true),
      add("Project proposal", "परियोजना प्रस्ताव", "Bankable infra project needed", (p) => !!p.hasBank),
    ],
  },
  {
    id: "s-9", title: "Paramparagat Krishi Vikas Yojana", titleHi: "परंपरागत कृषि विकास योजना",
    category: "Subsidy", ministry: "Ministry of Agriculture",
    summary: "Support of ₹50,000 per hectare over three years for cluster-based organic farming with certification, training and market linkage.",
    summaryHi: "क्लस्टर-आधारित जैविक खेती के लिए तीन वर्षों में प्रति हेक्टेयर ₹50,000 सहायता।",
    benefit: "₹50,000/ha over 3 years for organic farming", benefitAmount: "₹50,000/ha",
    color: "#16a34a", applyUrl: "https://pgsindia-ncof.gov.in/",
    deadline: "2026-09-30", rolling: false,
    docs: ["Aadhaar card", "Land records", "Bank account", "Cluster/group declaration"],
    timeline: ["Form a farmer cluster (50 acre village cluster)", "Apply at district agriculture office", "Organic conversion plan approved", "Training & inputs support", "Certification & market linkage"],
    contact: "NCOF / District Agriculture Office", beneficiaries: "10 lakh+ farmers", budget: "₹3,800+ crore",
    weight: 6, openTo: "Farmers in organic clusters",
    notificationCadence: "seasonal",
    criteria: [
      add("Farmer status", "किसान होना", "Cluster-based organic farmers", (p) => !!p.isFarmer),
      add("Land records", "भूमि अभिलेख", "Plot in the declared cluster", (p) => !!p.hasLandDocs),
    ],
  },
  {
    id: "s-10", title: "Pradhan Mantri MUDRA Yojana", titleHi: "प्रधानमंत्री मुद्रा योजना",
    category: "Credit", ministry: "Ministry of Finance",
    summary: "Collateral-free loans up to ₹10 lakh for small entrepreneurs — Shishu (₹50k), Kishor (₹5 lakh) and Tarun (₹10 lakh) — from banks and NBFCs.",
    summaryHi: "छोटे उद्यमियों के लिए ₹10 लाख तक बिना गारंटी ऋण — शिशु, किशोर और तरुण श्रेणी।",
    benefit: "Collateral-free loans up to ₹10 lakh", benefitAmount: "₹10 lakh max",
    color: "#dc2626", applyUrl: "https://www.mudra.org.in/",
    deadline: "2026-12-31", rolling: true,
    docs: ["Aadhaar card", "PAN card", "Business/activity proof", "Bank account", "Photo"],
    timeline: ["Identify your income-generating activity", "Visit any bank or NBFC branch", "Apply for a MUDRA loan category", "Submit KYC & activity details", "Loan sanctioned within days"],
    contact: "1800-180-1111", beneficiaries: "50 crore+ loans sanctioned", budget: "₹4,50,000+ crore disbursed",
    weight: 6, openTo: "Micro & small entrepreneurs (women get 50%+ share)",
    notificationCadence: "weekly",
    criteria: [
      add("Income-generating activity", "आय-सृजन गतिविधि", "Micro enterprise idea needed", (p) => true),
      add("Bank account", "बैंक खाता", "KYC-compliant account", (p) => !!p.hasBank),
      add("Age 18+", "आयु 18+", "Adult entrepreneur", (p) => (p.age ?? 18) >= 18),
    ],
  },
  {
    id: "s-11", title: "Mahatma Gandhi NREGA", titleHi: "महात्मा गांधी नरेगा",
    category: "Employment", ministry: "Ministry of Rural Development",
    summary: "Guaranteed 100 days of wage employment per year to every rural household whose adult members volunteer for unskilled manual work.",
    summaryHi: "अकुशल श्रम के लिए स्वेच्छा रखने वाले प्रत्येक ग्रामीण परिवार को प्रति वर्ष 100 दिन का रोजगार।",
    benefit: "100 days of guaranteed wage work/year", benefitAmount: "100 days/yr",
    color: "#65a30d", applyUrl: "https://nrega.nic.in/",
    deadline: "2026-12-31", rolling: true,
    docs: ["Aadhaar card", "Ration card", "Job card registration", "Bank/post office account"],
    timeline: ["Register at your Gram Panchayat office", "Get a job card issued", "Submit work demand in writing", "Work allocated at the worksite", "Wages credited within 15 days"],
    contact: "Gram Panchayat / nrega@nic.in", beneficiaries: "14 crore+ active workers", budget: "₹1,00,000+ crore / year",
    weight: 5, openTo: "All rural households",
    notificationCadence: "weekly",
    criteria: [
      add("Rural household", "ग्रामीण परिवार", "Residence in a rural area", (p) => p.rural !== false),
      add("Adult members willing to work", "काम करने को तैयार वयस्क", "Voluntary manual work", (p) => true),
      add("Bank account", "बैंक खाता", "Wage payment account", (p) => !!p.hasBank),
    ],
  },
  {
    id: "s-12", title: "Ayushman Bharat PM-JAY", titleHi: "आयुष्मान भारत पीएम-जेएवाई",
    category: "Health", ministry: "Ministry of Health & Family Welfare",
    summary: "Free health insurance of ₹5 lakh per family per year for hospitalisation in empanelled public and private hospitals, for eligible (SECC) families.",
    summaryHi: "पात्र (SECC) परिवारों के लिए प्रति वर्ष प्रति परिवार ₹5 लाख का निःशुल्क अस्पताल बीमा।",
    benefit: "₹5 lakh free hospital cover/family/yr", benefitAmount: "₹5 lakh cover",
    color: "#16a34a", applyUrl: "https://pmjay.gov.in/",
    deadline: "2026-12-31", rolling: true,
    docs: ["Aadhaar card", "Ration card / SECC proof", "Photo identity", "Bank account"],
    timeline: ["Check eligibility on PM-JAY portal", "Verify family in SECC database", "Generate e-card at a kiosk/hospital", "Show card at an empanelled hospital", "Cashless treatment for covered procedures"],
    contact: "14555 / pmjay@gov.in", beneficiaries: "30 crore+ families covered", budget: "₹10,000+ crore / year",
    weight: 7, openTo: "SECC-listed (economically weaker) families",
    notificationCadence: "seasonal",
    criteria: [
      add("Ration/SECC beneficiary", "राशन/एसईसीसी लाभार्थी", "Family listed in SECC database", (p) => !!p.bpl),
      add("No prior cover", "पूर्व कवर न हो", "Not covered by state health scheme", (p) => true),
    ],
  },
  {
    id: "s-13", title: "PM Awas Yojana – Gramin", titleHi: "प्रधानमंत्री आवास योजना – ग्रामीण",
    category: "Welfare", ministry: "Ministry of Rural Development",
    summary: "Assistance of ₹1.2 lakh in plain areas (₹1.3 lakh in hilly/difficult areas) to eligible rural households for construction of a pucca house.",
    summaryHi: "पात्र ग्रामीण परिवारों को पक्का मकान निर्माण हेतु मैदानी क्षेत्रों में ₹1.2 लाख सहायता।",
    benefit: "₹1.2 lakh housing assistance + sanitation", benefitAmount: "₹1.2 lakh",
    color: "#7c3aed", applyUrl: "https://pmayg.nic.in/",
    deadline: "2026-12-31", rolling: true,
    docs: ["Aadhaar card", "Ration card / SECC proof", "Land ownership document", "Photo", "Bank account"],
    timeline: ["Check SECC/PMAY-G list at Gram Panchayat", "Verify no pucca house owned", "Apply with Aadhaar & land papers", "House sanctioned & geo-tagged", "Instalments released on construction stages"],
    contact: "Gram Panchayat / pmayg@nic.in", beneficiaries: "3 crore+ houses sanctioned", budget: "₹2,00,000+ crore",
    weight: 6, openTo: "Rural households without a pucca house (SECC-listed)",
    notificationCadence: "seasonal",
    criteria: [
      add("Rural & houseless", "ग्रामीण और बेघर", "No pucca house in family", (p) => p.rural !== false && p.bpl !== false),
      add("Land ownership", "भूमि स्वामित्व", "Land for construction", (p) => !!p.hasLandDocs),
    ],
  },
  {
    id: "s-14", title: "PM Shram Yogi Maandhan", titleHi: "प्रधानमंत्री श्रम योगी मानधन",
    category: "Welfare", ministry: "Ministry of Labour",
    summary: "Voluntary pension scheme — after contributing ₹55–200/month, receive ₹3,000 monthly pension after 60 years of age.",
    summaryHi: "स्वैच्छिक पेंशन योजना — ₹55–200/माह अंशदान के बाद 60 वर्ष की आयु पर ₹3,000 मासिक पेंशन।",
    benefit: "₹3,000/month pension after 60", benefitAmount: "₹3,000/mo",
    color: "#d97706", applyUrl: "https://maandhan.in/",
    deadline: "2026-12-31", rolling: true,
    docs: ["Aadhaar card", "Bank/post office account", "Mobile number", "Age proof"],
    timeline: ["Visit CSC or bank with Aadhaar", "Verify age (18–40) & income", "Start small monthly contribution", "Pension credited after age 60"],
    contact: "CSC / LIC helpline 1800-180-5129", beneficiaries: "50 lakh+ subscribers", budget: "Government co-contribution",
    weight: 5, openTo: "Unorganised workers aged 18–40, monthly income ≤ ₹15,000",
    notificationCadence: "weekly",
    criteria: [
      add("Age 18–40", "आयु 18–40", "Enrolment window", (p) => (p.age ?? 0) >= 18 && (p.age ?? 99) <= 40),
      add("Monthly income ≤ ₹15,000", "मासिक आय ≤ ₹15,000", "Unorganised sector worker", (p) => (p.monthlyIncome ?? 15000) <= 15000),
      add("Bank account", "बैंक खाता", "Contribution auto-debit", (p) => !!p.hasBank),
    ],
  },
  {
    id: "s-15", title: "PM Suraksha Bima Yojana", titleHi: "प्रधानमंत्री सुरक्षा बीमा योजना",
    category: "Insurance", ministry: "Ministry of Finance",
    summary: "Accidental death & disability insurance of ₹2 lakh for just ₹12 per year, auto-renewed from your bank account.",
    summaryHi: "मात्र ₹12 प्रति वर्ष पर ₹2 लाख का दुर्घटना मृत्यु और विकलांगता बीमा।",
    benefit: "₹2 lakh cover for ₹12/year", benefitAmount: "₹12/yr",
    color: "#2563eb", applyUrl: "https://jansuraksha.gov.in/",
    deadline: "2027-03-31", rolling: false,
    docs: ["Aadhaar card", "Bank account (Aadhaar-linked)", "Mobile number"],
    timeline: ["Visit your bank branch", "Opt in for PMSBY (auto-debit)", "₹12 premium debited yearly", "Cover active on the linked account"],
    contact: "Your bank branch", beneficiaries: "34 crore+ enrolled", budget: "₹1 per day-style pricing",
    weight: 5, openTo: "Bank account holders aged 18–70",
    notificationCadence: "seasonal",
    criteria: [
      add("Age 18–70", "आयु 18–70", "Enrolment window", (p) => (p.age ?? 0) >= 18 && (p.age ?? 99) <= 70),
      add("Bank account", "बैंक खाता", "Aadhaar-linked savings account", (p) => !!p.hasBank),
    ],
  },
  {
    id: "s-16", title: "Post-Matric Scholarship (SC)", titleHi: "पोस्ट मैट्रिक छात्रवृत्ति (अनुसूचित जाति)",
    category: "Education", ministry: "Ministry of Social Justice",
    summary: "Scholarship for SC students studying post-matric courses (classes 11–PhD) — covers maintenance, tuition and other fees for eligible families.",
    summaryHi: "पोस्ट मैट्रिक पाठ्यक्रमों (कक्षा 11–पीएचडी) के लिए अनुसूचित जाति के छात्रों की छात्रवृत्ति।",
    benefit: "Up to ₹45,000/yr + fee reimbursement", benefitAmount: "₹45,000/yr",
    color: "#dc2626", applyUrl: "https://scholarships.gov.in/",
    deadline: "2026-10-31", rolling: false,
    docs: ["Aadhaar card", "SC caste certificate", "Family income certificate", "Enrolment proof (institute)", "Bank account", "Previous marksheet"],
    timeline: ["Open an account on scholarships.gov.in", "Fill application with institute details", "Upload caste & income certificates", "Institute verifies enrolment", "Amount credited to DBT account"],
    contact: "Scholarships.gov.in / State nodal officer", beneficiaries: "Lakhs of SC students yearly", budget: "₹6,000+ crore / year",
    weight: 6, openTo: "SC students, family income ≤ ₹2.5 lakh/yr",
    notificationCadence: "event",
    criteria: [
      add("SC category", "अनुसूचित जाति", "Valid caste certificate", (p) => p.category === "sc"),
      add("Income ≤ ₹2.5 lakh", "आय ≤ ₹2.5 लाख", "Family annual income", (p) => (p.annualIncome ?? 250000) <= 250000),
      add("Post-matric student", "पोस्ट मैट्रिक छात्र", "Enrolled in 11th or higher", (p) => true),
    ],
  },
  {
    id: "s-17", title: "Livestock Insurance Scheme", titleHi: "पशुधन बीमा योजना",
    category: "Insurance", ministry: "Department of Animal Husbandry",
    summary: "Insurance cover for cattle, buffalo and other livestock at subsidised premium — up to 50% subsidy, higher for women & SHG members.",
    summaryHi: "पशुओं के लिए रियायती प्रीमियम पर बीमा — महिलाओं और समूह सदस्यों के लिए 50% तक अनुदान।",
    benefit: "50% premium subsidy on livestock cover", benefitAmount: "50% subsidy",
    color: "#ca8a04", applyUrl: "https://dadf.gov.in/",
    deadline: "2026-12-31", rolling: true,
    docs: ["Aadhaar card", "Bank account", "Veterinary ID of animal", "Passport photo", "Purchase/receipt proof"],
    timeline: ["Identify eligible livestock with ear tags", "Approach an insurance company/animal husbandry dept", "Get animal valued by a veterinarian", "Pay subsidised premium", "Claim on death/disability"],
    contact: "District Animal Husbandry Officer", beneficiaries: "Lakhs of animals covered", budget: "₹4,000+ crore",
    weight: 6, openTo: "Livestock owners (dairy, milch & draught)",
    notificationCadence: "seasonal",
    criteria: [
      add("Livestock owner", "पशु स्वामी", "Owns cattle/buffalo", (p) => !!p.hasLivestock),
      add("Bank account", "बैंक खाता", "Subsidy & claims via DBT", (p) => !!p.hasBank),
    ],
  },
  {
    id: "s-18", title: "PM Garib Kalyan Anna Yojana", titleHi: "प्रधानमंत्री गरीब कल्याण अन्न योजना",
    category: "Welfare", ministry: "Ministry of Food & Public Distribution",
    summary: "Free food grains — 5 kg per person per month — for ration-card (NFSA) beneficiary households under this anti-hunger programme.",
    summaryHi: "राशन कार्ड (एनएफएसए) लाभार्थी परिवारों के लिए प्रति व्यक्ति प्रति माह 5 किलो निःशुल्क खाद्यान्न।",
    benefit: "5 kg free grain/person/month", benefitAmount: "5 kg/person/mo",
    color: "#0891b2", applyUrl: "https://nfsa.gov.in/",
    deadline: "2026-12-31", rolling: true,
    docs: ["Ration card", "Aadhaar card", "Family member list"],
    timeline: ["Hold a valid NFSA ration card", "Verify family members on portal", "Visit PDS shop on due date", "Collect free grain entitlement"],
    contact: "State Food & Civil Supplies / 1967", beneficiaries: "80 crore+ beneficiaries", budget: "₹2,00,000+ crore",
    weight: 7, openTo: "NFSA ration-card households",
    notificationCadence: "weekly",
    criteria: [
      add("Ration card (NFSA)", "राशन कार्ड (एनएफएसए)", "Priority household beneficiary", (p) => !!p.bpl),
    ],
  },
  {
    id: "s-19", title: "Pradhan Mantri Matsya Sampada Yojana", titleHi: "प्रधानमंत्री मत्स्य संपदा योजना",
    category: "Subsidy", ministry: "Ministry of Fisheries",
    summary: "₹20,000 crore investment for fisheries — up to 40% subsidy on aquaculture, pond construction, cages, boats and cold chain for fisherfolk.",
    summaryHi: "मत्स्य पालन के लिए ₹20,000 करोड़ निवेश — जलकृषि, तालाब, पिंजरे, नाव पर 40% तक अनुदान।",
    benefit: "Up to 40% subsidy on fisheries assets", benefitAmount: "40% subsidy",
    color: "#0891b2", applyUrl: "https://pmmsy.dof.gov.in/",
    deadline: "2026-09-30", rolling: false,
    docs: ["Aadhaar card", "Bank account", "Fisher identity / SHG membership", "Water body ownership/lease", "Project proposal"],
    timeline: ["Apply at the State Fisheries Department", "Submit water-body & identity details", "Project appraisal by department", "Asset created with subsidy", "Subsidy reimbursed via DBT"],
    contact: "District Fisheries Officer", beneficiaries: "50 lakh+ fisherfolk", budget: "₹20,000 crore",
    weight: 6, openTo: "Fisherfolk, fish farmers & SHGs",
    notificationCadence: "event",
    criteria: [
      add("Fisher / fish farmer", "मछुआरा/मत्स्य किसान", "Fisherfolk, SHGs, farmers", (p) => !!p.fisher || !!p.isFarmer),
      add("Bank account", "बैंक खाता", "DBT subsidy credit", (p) => !!p.hasBank),
    ],
  },
  {
    id: "s-20", title: "National Beekeeping & Honey Mission", titleHi: "राष्ट्रीय मधुमक्खी पालन एवं शहद मिशन",
    category: "Subsidy", ministry: "Ministry of Agriculture",
    summary: "Subsidy of 25–50% on bee boxes, bee colonies and honey extraction units, plus training for farmers adopting beekeeping as a side income.",
    summaryHi: "मधुमक्खी बॉक्स, कॉलोनी और शहद निष्कर्षण इकाइयों पर 25–50% अनुदान और प्रशिक्षण।",
    benefit: "25–50% subsidy on bee boxes & units", benefitAmount: "50% subsidy",
    color: "#d97706", applyUrl: "https://nbb.gov.in/",
    deadline: "2027-01-31", rolling: false,
    docs: ["Aadhaar card", "Land records", "Bank account", "Training certificate", "Proposal"],
    timeline: ["Attend a 2-day beekeeping training", "Apply at KVK/NBBD with proposal", "Procure bee boxes from approved agency", "Install & maintain colonies", "Subsidy reimbursed on completion"],
    contact: "National Bee Board / KVK", beneficiaries: "2 lakh+ trained beekeepers", budget: "₹500 crore",
    weight: 4, openTo: "Farmers & beekeepers (all categories)",
    notificationCadence: "event",
    criteria: [
      add("Farmer / beekeeper", "किसान/मधुमक्खी पालक", "Willing to take up beekeeping", (p) => !!p.isFarmer || !!p.beekeeper),
      add("Land records", "भूमि अभिलेख", "Placement of colonies", (p) => !!p.hasLandDocs),
      add("Bank account", "बैंक खाता", "Subsidy via DBT", (p) => !!p.hasBank),
    ],
  },
];

const SUBSCRIPTIONS = new Map<string, Set<string>>();

function summarizeScheme(s: Scheme) {
  const daysLeft = Math.ceil((Date.parse(s.deadline) - Date.now()) / DAY_MS);
  return {
    id: s.id, title: s.title, titleHi: s.titleHi, category: s.category, ministry: s.ministry,
    benefit: s.benefit, benefitAmount: s.benefitAmount, color: s.color, applyUrl: s.applyUrl,
    deadline: s.deadline, rolling: s.rolling, openTo: s.openTo,
    daysLeft,
    status: s.rolling ? "open" : daysLeft < 0 ? "closed" : daysLeft <= 14 ? "urgent" : daysLeft <= 45 ? "soon" : "open",
  };
}

function checkScheme(s: Scheme, p: Profile) {
  const checks = s.criteria.map(c => ({ label: c.label, labelHi: c.labelHi, detail: c.detail, met: c.test(p) }));
  const met = checks.filter(c => c.met).length;
  const score = checks.length === 0 ? 100 : Math.round((met / checks.length) * 100);
  return {
    schemeId: s.id, title: s.title, score, eligible: score === 100,
    checks,
    missing: checks.filter(c => !c.met),
    matched: checks.filter(c => c.met),
  };
}

function profileFrom(body: Record<string, unknown>): Profile {
  return {
    age: typeof body.age === "number" ? body.age : undefined,
    landAcres: typeof body.landAcres === "number" ? body.landAcres : undefined,
    category: (["general", "sc", "st", "obc"] as CategoryValue[]).includes(body.category as CategoryValue) ? body.category as CategoryValue : undefined,
    annualIncome: typeof body.annualIncome === "number" ? body.annualIncome : undefined,
    monthlyIncome: typeof body.monthlyIncome === "number" ? body.monthlyIncome : undefined,
    hasBank: Boolean(body.hasBank),
    hasLandDocs: Boolean(body.hasLandDocs),
    isFarmer: Boolean(body.isFarmer),
    gender: body.gender === "female" ? "female" : body.gender === "male" ? "male" : undefined,
    hasLivestock: Boolean(body.hasLivestock),
    rural: Boolean(body.rural),
    bpl: Boolean(body.bpl),
    beekeeper: Boolean(body.beekeeper),
    fisher: Boolean(body.fisher),
  };
}

function buildNotifications(subscribedIds: string[]) {
  const now = Date.now();
  const out: Array<Record<string, unknown>> = [];
  for (const s of SCHEMES) {
    const daysLeft = Math.ceil((Date.parse(s.deadline) - now) / DAY_MS);
    const subscribed = subscribedIds.includes(s.id);
    if (!s.rolling && daysLeft > 0) {
      const severity = daysLeft <= 14 ? "urgent" : daysLeft <= 45 ? "soon" : "upcoming";
      out.push({
        id: `${s.id}-deadline`, schemeId: s.id, type: "deadline", severity,
        title: daysLeft <= 14 ? `${s.title} closing soon!` : `${s.title} application open`,
        message: daysLeft <= 14
          ? `${s.title} window closes in ${daysLeft} day${daysLeft === 1 ? "" : "s"} (${s.deadline}). Apply now.`
          : `${s.title} closes on ${s.deadline} (${daysLeft} days left).`,
        daysLeft, schemeTitle: s.title, schemeColor: s.color, subscribed,
      });
    }
    if (s.rolling && subscribed) {
      out.push({
        id: `${s.id}-reminder`, schemeId: s.id, type: "reminder", severity: "info",
        title: `${s.title} — reminder`,
        message: `Application is open round the year. ${s.docs.length} documents required — check the details sheet.`,
        daysLeft: -1, schemeTitle: s.title, schemeColor: s.color, subscribed: true,
      });
    }
  }
  const order: Record<string, number> = { urgent: 0, soon: 1, upcoming: 2, info: 3 };
  out.sort((a, b) => (order[String(a.severity)] ?? 4) - (order[String(b.severity)] ?? 4) || Number(a.daysLeft) - Number(b.daysLeft));
  return out;
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCORSHeaders(origin);

  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const forwarded = req.headers.get("x-forwarded-for");
  const clientIP = forwarded ? forwarded.split(",")[0].trim() : "unknown";
  const rateLimit = await checkRateLimit(clientIP, "scheme-finder", RATE_LIMIT_CONFIG);
  if (!rateLimit.allowed) {
    return new Response(
      JSON.stringify({ error: "Too many requests. Please try again later." }),
      { status: 429, headers: { ...corsHeaders, ...getRateLimitHeaders(rateLimit), "Content-Type": "application/json", "Retry-After": Math.ceil((rateLimit.resetAt.getTime() - Date.now()) / 1000).toString() } }
    );
  }

  const headers = { ...corsHeaders, ...getRateLimitHeaders(rateLimit), "Content-Type": "application/json" };
  const bad = (msg: string, status = 400) => new Response(JSON.stringify({ error: msg }), { status, headers });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }

  const action = body.action;
  if (typeof action !== "string") return bad("Missing action");

  try {
    switch (action) {
      case "schemes": {
        const search = typeof body.search === "string" ? body.search.trim().toLowerCase() : "";
        const category = typeof body.category === "string" ? body.category : "All";
        const sort = typeof body.sort === "string" ? body.sort : "relevance";

        let list = SCHEMES.map(s => summarizeScheme(s));
        if (category !== "All") list = list.filter(s => s.category === category);
        if (search) {
          list = list.filter(s =>
            s.title.toLowerCase().includes(search) ||
            s.titleHi.includes(body.search as string) ||
            s.category.toLowerCase().includes(search) ||
            s.ministry.toLowerCase().includes(search) ||
            s.openTo.toLowerCase().includes(search)
          );
        }

        if (sort === "deadline") list.sort((a, b) => (a.rolling ? 1 : 0) - (b.rolling ? 1 : 0) || a.daysLeft - b.daysLeft);
        else if (sort === "benefit") list.sort((a, b) => b.benefitAmount.length - a.benefitAmount.length);
        else list.sort((a, b) => recommendedRank(a) - recommendedRank(b) || a.daysLeft - b.daysLeft);

        const now = Date.now();
        const closingSoon = SCHEMES.filter(s => !s.rolling && Date.parse(s.deadline) - now > 0 && Date.parse(s.deadline) - now <= 45).length;

        return new Response(JSON.stringify({
          schemes: list,
          categories: CATEGORIES,
          stats: {
            total: SCHEMES.length,
            open: SCHEMES.filter(s => s.rolling || Date.parse(s.deadline) > now).length,
            closingSoon,
            categories: CATEGORIES.length,
          },
          featured: summarizeScheme(SCHEMES[0]),
        }), { headers });
      }

      case "details": {
        const s = SCHEMES.find(x => x.id === body.id);
        if (!s) return bad("Scheme not found", 404);
        let eligibility = null;
        if (body.profile && typeof body.profile === "object") {
          eligibility = checkScheme(s, profileFrom(body.profile as Record<string, unknown>));
        }
        const related = SCHEMES.filter(x => x.category === s.category && x.id !== s.id).slice(0, 3);
        return new Response(JSON.stringify({
          scheme: { ...summarizeScheme(s), summary: s.summary, summaryHi: s.summaryHi, docs: s.docs, timeline: s.timeline, contact: s.contact, beneficiaries: s.beneficiaries, budget: s.budget, criteria: s.criteria.map(c => ({ label: c.label, labelHi: c.labelHi, detail: c.detail })) },
          eligibility,
          related: related.map(r => summarizeScheme(r)),
        }), { headers });
      }

      case "eligibility": {
        const profile = profileFrom(body);
        const target = typeof body.schemeId === "string" ? body.schemeId : "";
        if (target) {
          const s = SCHEMES.find(x => x.id === target);
          if (!s) return bad("Scheme not found", 404);
          return new Response(JSON.stringify({ result: checkScheme(s, profile) }), { headers });
        }
        const results = SCHEMES.map(s => checkScheme(s, profile)).sort((a, b) => b.score - a.score);
        const eligibleCount = results.filter(r => r.eligible).length;
        const insight = `Based on your profile, you are eligible for ${eligibleCount} of ${SCHEMES.length} schemes. ${eligibleCount >= 10 ? "You match strongly with income support and insurance schemes." : eligibleCount >= 5 ? "Focus on the schemes below where you meet every condition." : "Check the missing conditions below — most schemes need Aadhaar, land records and a bank account."}`;
        return new Response(JSON.stringify({ results, eligibleCount, insight }), { headers });
      }

      case "recommend": {
        const profile = profileFrom(body);
        const results = SCHEMES
          .map(s => checkScheme(s, profile))
          .sort((a, b) => b.score - a.score || (SCHEMES.find(x => x.id === b.schemeId)?.weight ?? 0) - (SCHEMES.find(x => x.id === a.schemeId)?.weight ?? 0))
          .slice(0, 6);
        const all = SCHEMES.map(s => checkScheme(s, profile));
        const eligibleCount = all.filter(r => r.eligible).length;
        const top = results[0];
        const topScheme = SCHEMES.find(x => x.id === top?.schemeId);
        const insight = topScheme
          ? `You match best with ${topScheme.title} (${top?.score}% match). ${eligibleCount} of ${SCHEMES.length} schemes are fully eligible for your profile.`
          : `Based on your profile, ${eligibleCount} of ${SCHEMES.length} schemes are fully eligible.`;
        return new Response(JSON.stringify({
          recommendations: results.map(r => ({
            ...r,
            scheme: summarizeScheme(SCHEMES.find(x => x.id === r.schemeId) as Scheme),
            benefit: SCHEMES.find(x => x.id === r.schemeId)?.benefit,
          })),
          eligibleCount,
          insight,
        }), { headers });
      }

      case "notifications": {
        const subscribedIds = Array.isArray(body.subscribedIds) ? body.subscribedIds.map(String) : [];
        const notifications = buildNotifications(subscribedIds);
        const urgent = notifications.filter(n => n.severity === "urgent").length;
        return new Response(JSON.stringify({
          notifications,
          unread: notifications.length,
          urgent,
          subscribed: subscribedIds,
        }), { headers });
      }

      case "subscribe": {
        const deviceId = typeof body.deviceId === "string" ? body.deviceId : "";
        const schemeId = typeof body.schemeId === "string" ? body.schemeId : "";
        if (!deviceId || !schemeId || !SCHEMES.some(s => s.id === schemeId)) return bad("Invalid device or scheme");
        const set = SUBSCRIPTIONS.get(deviceId) ?? new Set<string>();
        set.add(schemeId);
        SUBSCRIPTIONS.set(deviceId, set);
        return new Response(JSON.stringify({ success: true, subscribed: Array.from(set) }), { headers });
      }

      case "unsubscribe": {
        const deviceId = typeof body.deviceId === "string" ? body.deviceId : "";
        const schemeId = typeof body.schemeId === "string" ? body.schemeId : "";
        const set = SUBSCRIPTIONS.get(deviceId);
        if (set) set.delete(schemeId);
        return new Response(JSON.stringify({ success: true, subscribed: set ? Array.from(set) : [] }), { headers });
      }

      case "ping":
        return new Response(JSON.stringify({ ok: true, schemes: SCHEMES.length, categories: CATEGORIES.length }), { headers });

      default:
        return bad("Unknown action");
    }
  } catch (error) {
    console.error("Scheme finder function error:", error);
    const msg = error instanceof Error ? error.message : "Internal error";
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers });
  }
});
