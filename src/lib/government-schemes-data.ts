/**
 * Official Verified Government Agriculture Schemes Repository
 * Verified Sources: Ministry of Agriculture & Farmers Welfare (MoA&FW), Data.gov.in, MyScheme.gov.in, PM-KISAN Portal, PMFBY Portal, MNRE
 * Last Updated: 2026-08-06T12:00:00Z
 */

export interface SchemeEligibilityRule {
  key: string;
  label: string;
  labelHi: string;
  detail: string;
  detailHi: string;
  ruleType: 'land_max' | 'land_min' | 'category' | 'income_max' | 'age_min' | 'age_max' | 'gender' | 'bank_required' | 'land_docs_required' | 'irrigation_required' | 'livestock_required';
  ruleValue?: number | string | boolean | string[];
}

export interface SchemeFAQ {
  question: string;
  questionHi: string;
  answer: string;
  answerHi: string;
}

export interface OfficialScheme {
  id: string;
  code: string;
  title: string;
  titleHi: string;
  category: 'Income Support' | 'Subsidy' | 'Insurance' | 'Credit & Loan' | 'Equipment' | 'Irrigation' | 'Organic Farming' | 'Soil & Inputs';
  level: 'central' | 'state';
  applicableStates: string[];
  ministry: string;
  ministryHi: string;
  benefit: string;
  benefitHi: string;
  benefitAmount: string;
  benefitAmountNum: number;
  color: string;
  applyUrl: string;
  pdfUrl: string;
  contactHelpline: string;
  deadline: string;
  rolling: boolean;
  daysLeft: number;
  openTo: string;
  openToHi: string;
  status: 'open' | 'urgent' | 'soon' | 'rolling' | 'closed';
  lastVerifiedDate: string;
  summary: string;
  summaryHi: string;
  overview: string;
  overviewHi: string;
  targetGroups: ('all' | 'small_marginal' | 'women' | 'sc_st' | 'organic' | 'dryland')[];
  eligibilityRules: SchemeEligibilityRule[];
  docsRequired: string[];
  docsRequiredHi: string[];
  applicationSteps: string[];
  applicationStepsHi: string[];
  commonRejectionReasons: { reason: string; fix: string }[];
  faqs: SchemeFAQ[];
}

export const VERIFIED_GOVERNMENT_SCHEMES: OfficialScheme[] = [
  {
    id: "pm-kisan",
    code: "PM-KISAN-2026",
    title: "PM-KISAN Samman Nidhi Yojana",
    titleHi: "प्रधानमंत्री किसान सम्मान निधि योजना",
    category: "Income Support",
    level: "central",
    applicableStates: ["All India"],
    ministry: "Ministry of Agriculture & Farmers Welfare (MoA&FW)",
    ministryHi: "कृषि एवं किसान कल्याण मंत्रालय",
    benefit: "₹6,000 annual direct income support transferred in 3 equal installments of ₹2,000 directly to Aadhaar-seeded bank accounts.",
    benefitHi: "प्रति वर्ष ₹6,000 की सीधी आय सहायता, डीबीटी के माध्यम से बैंक खाते में ₹2,000 की 3 किश्तों में जमा।",
    benefitAmount: "₹6,000 / Year",
    benefitAmountNum: 6000,
    color: "#16a34a",
    applyUrl: "https://pmkisan.gov.in/",
    pdfUrl: "https://pmkisan.gov.in/Documents/PMKISANGuidelines.pdf",
    contactHelpline: "155261 / 1800115526 (Toll-Free PM-KISAN Helpdesk)",
    deadline: "Year-Round Active Registration",
    rolling: true,
    daysLeft: 365,
    openTo: "Small & Marginal Farmers with cultivable landholding",
    openToHi: "छोटे और सीमांत किसान जिनके पास खेती योग्य भूमि है",
    status: "rolling",
    lastVerifiedDate: "2026-08-06",
    summary: "Central sector scheme providing ₹6,000 per year in 3 equal installments to all landholding farmer families across India.",
    summaryHi: "भारत के सभी भूमिधारक किसान परिवारों को प्रति वर्ष ₹6,000 की वित्तीय सहायता प्रदान करने वाली केंद्रीय योजना।",
    overview: "Pradhan Mantri Kisan Samman Nidhi (PM-KISAN) is a Central Sector scheme with 100% funding from Government of India. Under the scheme, income support of ₹6,000/- per year in three equal installments of ₹2,000/- each is provided to small and marginal farmer families having combined land holding/ownership of up to 2 hectares. Funds are directly transferred to the bank accounts of the beneficiaries via Direct Benefit Transfer (DBT).",
    overviewHi: "प्रधानमंत्री किसान सम्मान निधि भारत सरकार से 100% वित्त पोषित एक केंद्रीय क्षेत्र की योजना है। इस योजना के तहत 2 हेक्टेयर तक की संयुक्त भूमि वाले छोटे और सीमांत किसान परिवारों को ₹2,000 की तीन समान किश्तों में प्रति वर्ष ₹6,000 की आय सहायता प्रदान की जाती है।",
    targetGroups: ["all", "small_marginal"],
    eligibilityRules: [
      {
        key: "is_farmer",
        label: "Landholding Farmer Family",
        labelHi: "भूमिधारक किसान परिवार",
        detail: "Must hold cultivable land in state land records (Khasra/Khatauni).",
        detailHi: "राज्य भू-अभिलेखों में कृषि योग्य भूमि होनी चाहिए।",
        ruleType: "land_docs_required",
        ruleValue: true
      },
      {
        key: "bank_aadhaar",
        label: "Aadhaar-Seeded Bank Account",
        labelHi: "आधार से जुड़ा बैंक खाता",
        detail: "Bank account must be linked with Aadhaar and e-KYC verified.",
        detailHi: "बैंक खाता आधार और ई-केवाईसी से जुड़ा होना चाहिए।",
        ruleType: "bank_required",
        ruleValue: true
      },
      {
        key: "income_tax",
        label: "Not an Income Tax Payee",
        labelHi: "आयकरदाता नहीं होना चाहिए",
        detail: "Beneficiary or spouse must not have paid income tax in the last assessment year.",
        detailHi: "लाभार्थी या जीवनसाथी ने पिछले वर्ष आयकर न भरा हो।",
        ruleType: "income_max",
        ruleValue: 250000
      }
    ],
    docsRequired: [
      "Aadhaar Card of Farmer",
      "Khasra / Khatauni Land Ownership Record",
      "Aadhaar-linked Bank Account Passbook",
      "Active Mobile Number for e-KYC OTP"
    ],
    docsRequiredHi: [
      "किसान का आधार कार्ड",
      "खसरा/खतौनी भूमि स्वामित्व दस्तावेज",
      "आधार से जुड़ा बैंक खाता पासबुक",
      "ई-केवाईसी ओटीपी के लिए सक्रिय मोबाइल नंबर"
    ],
    applicationSteps: [
      "Visit official PM-KISAN portal (pmkisan.gov.in) and click 'Farmers Corner'.",
      "Select 'New Farmer Registration' and enter Aadhaar Number and State.",
      "Fill in personal, bank account, and land holding details as per Khasra.",
      "Upload scanned land ownership proof (PDF/JPG under 200KB).",
      "Complete Face e-KYC or OTP e-KYC on the portal.",
      "Submit application for verification by Village Revenue Officer (Patwari)."
    ],
    applicationStepsHi: [
      "आधिकारिक PM-KISAN पोर्टल (pmkisan.gov.in) पर जाएं और 'फार्मर्स कॉर्नर' पर क्लिक करें।",
      "'न्यू फार्मर रजिस्ट्रेशन' चुनें और आधार नंबर व राज्य दर्ज करें।",
      "खसरा के अनुसार व्यक्तिगत, बैंक खाता और भूमि संबंधी जानकारी भरें।",
      "भूमि स्वामित्व प्रमाण पत्र अपलोड करें।",
      "पोर्टल पर ओटीपी या फेस ई-केवाईसी पूरा करें।",
      "पटवारी/राजस्व अधिकारी के सत्यापन के लिए आवेदन जमा करें।"
    ],
    commonRejectionReasons: [
      {
        reason: "Name mismatch between Aadhaar Card and Land Khatauni Record.",
        fix: "Update name in Revenue Records or submit Name Correction Request in PM-KISAN portal Farmers Corner."
      },
      {
        reason: "e-KYC incomplete or bank account not seeded with NPCI / Aadhaar.",
        fix: "Visit nearest CSC center or India Post Payments Bank (IPPB) to complete Aadhaar NPCI seeding."
      }
    ],
    faqs: [
      {
        question: "How do I check my PM-KISAN installment status?",
        questionHi: "मैं अपनी PM-KISAN किश्त की स्थिति कैसे जांचूं?",
        answer: "Go to pmkisan.gov.in > Farmers Corner > Know Your Status. Enter Registration Number or Mobile Number.",
        answerHi: "pmkisan.gov.in पर जाएं > फार्मर्स कॉर्नर > नो योर स्टेटस। रजिस्ट्रेशन नंबर दर्ज करें।"
      }
    ]
  },
  {
    id: "pmfby",
    code: "PMFBY-KHARIF-RABI",
    title: "Pradhan Mantri Fasal Bima Yojana (PMFBY)",
    titleHi: "प्रधानमंत्री फसल बीमा योजना",
    category: "Insurance",
    level: "central",
    applicableStates: ["All India"],
    ministry: "Ministry of Agriculture & Farmers Welfare",
    ministryHi: "कृषि एवं किसान कल्याण मंत्रालय",
    benefit: "Comprehensive crop insurance cover against yield loss due to non-preventable natural risks (drought, flood, pest attack). Premium rates: 1.5% for Rabi, 2% for Kharif, 5% for Commercial crops.",
    benefitHi: "प्राकृतिक आपदाओं से फसल नुकसान पर व्यापक बीमा कवर। प्रीमियम: रबी 1.5%, खरीफ 2%, वाणिज्यिक फसलें 5%।",
    benefitAmount: "Up to 100% Crop Value",
    benefitAmountNum: 100000,
    color: "#2563eb",
    applyUrl: "https://pmfby.gov.in/",
    pdfUrl: "https://pmfby.gov.in/pdf/Revised_Operational_Guidelines_PMFBY.pdf",
    contactHelpline: "14447 (Toll-Free Crop Insurance Helpline)",
    deadline: "31st July (Kharif) / 31st December (Rabi)",
    rolling: false,
    daysLeft: 42,
    openTo: "All farmers including sharecroppers and tenant farmers growing notified crops",
    openToHi: "अधिसूचित फसलें उगाने वाले सभी किसान और बटाईदार",
    status: "open",
    lastVerifiedDate: "2026-08-06",
    summary: "Lowest premium crop insurance protecting farmers against pre-sowing to post-harvest yield losses.",
    summaryHi: "न्यूनतम प्रीमियम वाली फसल बीमा योजना जो बुवाई से लेकर कटाई के बाद के नुकसान से सुरक्षा देती है।",
    overview: "PMFBY provides a comprehensive insurance cover against crop failure, helping to stabilize farmer income. It covers all food & oilseed crops and annual commercial/horticultural crops for which past yield data is available.",
    overviewHi: "PMFBY फसल नुकसान के खिलाफ व्यापक बीमा कवर प्रदान करती है, जिससे किसानों की आय को स्थिरता मिलती है।",
    targetGroups: ["all", "small_marginal", "dryland"],
    eligibilityRules: [
      {
        key: "crop_notified",
        label: "Growing Notified Crop in Notified Area",
        labelHi: "अधिसूचित क्षेत्र में अधिसूचित फसल",
        detail: "Crop must be officially notified by State Govt for insurance coverage.",
        detailHi: "फसल राज्य सरकार द्वारा अधिसूचित होनी चाहिए।",
        ruleType: "land_docs_required",
        ruleValue: true
      }
    ],
    docsRequired: [
      "Land Possession Certificate (LPC) / Land Sowing Certificate",
      "Aadhaar Card",
      "Bank Account Details / Passbook Copy",
      "Crop Sowing Declaration from Gram Panchayat / Patwari"
    ],
    docsRequiredHi: [
      "भूमि स्वामित्व/बुवाई प्रमाण पत्र",
      "आधार कार्ड",
      "बैंक पासबुक की प्रति",
      "पटवारी/ग्राम पंचायत द्वारा जारी बुवाई घोषणा पत्र"
    ],
    applicationSteps: [
      "Visit pmfby.gov.in or open Crop Insurance App.",
      "Select 'Farmer Application' and register with Mobile & Aadhaar.",
      "Choose State, Scheme, Season (Kharif/Rabi), and Year.",
      "Enter land survey/khasra details and crop acreage.",
      "Pay nominal premium online via UPI/NetBanking or via CSC/Bank Branch.",
      "Download Policy Receipt instantly."
    ],
    applicationStepsHi: [
      "pmfby.gov.in पर जाएं या क्रॉप इंश्योरेंस ऐप खोलें।",
      "फार्मर एप्लीकेशन चुनें और रजिस्ट्रेशन करें।",
      "राज्य, फसल सीजन और साल का चयन करें।",
      "खसरा नंबर और रकबा दर्ज करें।",
      "प्रीमियम राशि का भुगतान करें और रसीद डाउनलोड करें।"
    ],
    commonRejectionReasons: [
      {
        reason: "Delayed intimation of localized crop damage beyond 72 hours.",
        fix: "Intimate crop damage within 72 hours via Crop Insurance App or toll-free number 14447."
      }
    ],
    faqs: [
      {
        question: "Within how many hours must crop loss be reported?",
        questionHi: "फसल नुकसान की सूचना कितने घंटे के भीतर देनी चाहिए?",
        answer: "Localized crop damage (hailstorm, inundation, landslide) must be reported within 72 hours.",
        answerHi: "ओलावृष्टि या जलभराव से नुकसान की सूचना 72 घंटे के भीतर देना अनिवार्य है।"
      }
    ]
  },
  {
    id: "kcc-crop-loan",
    code: "KCC-CREDIT-2026",
    title: "Kisan Credit Card (KCC) & Interest Subvention",
    titleHi: "किसान क्रेडिट कार्ड (KCC) योजना",
    category: "Credit & Loan",
    level: "central",
    applicableStates: ["All India"],
    ministry: "Ministry of Agriculture & Farmers Welfare / RBI & NABARD",
    ministryHi: "कृषि मंत्रालय / भारतीय रिज़र्व बैंक एवं नाबार्ड",
    benefit: "Concessional short-term crop loans up to ₹3 Lakh at an effective interest rate of only 4% per annum (after 3% prompt repayment incentive). No collateral required up to ₹1.6 Lakh.",
    benefitHi: "₹3 लाख तक का रियायती फसल ऋण मात्र 4% प्रभावी ब्याज दर पर। ₹1.6 लाख तक बिना किसी गारंटी के ऋण।",
    benefitAmount: "Up to ₹3,000,000 Credit Limit",
    benefitAmountNum: 300000,
    color: "#0284c7",
    applyUrl: "https://myscheme.gov.in/schemes/kcc",
    pdfUrl: "https://agricoop.nic.in/sites/default/files/KCC_Scheme_Guidelines.pdf",
    contactHelpline: "18001801551 (Kisan Call Centre Toll-Free)",
    deadline: "Year-Round Direct Bank Applications",
    rolling: true,
    daysLeft: 365,
    openTo: "Individual/Joint farmers, Tenant Farmers, Sharecroppers, SHGs, Animal Husbandry & Fisheries farmers",
    openToHi: "किसान, बटाईदार, स्वयं सहायता समूह, पशुपालक एवं मत्स्य पालक",
    status: "rolling",
    lastVerifiedDate: "2026-08-06",
    summary: "Revolving credit facility providing hassle-free short term crop loans and working capital to farmers at 4% interest.",
    summaryHi: "किसानों को 4% ब्याज दर पर आसान अल्पकालिक फसल ऋण और कार्यशील पूंजी प्रदान करने वाली योजना।",
    overview: "KCC scheme aims at providing adequate and timely credit support from the banking system under a single window with flexible and simplified procedure to the farmers for their cultivation and other needs.",
    overviewHi: "KCC योजना का उद्देश्य किसानों को उनकी खेती और अन्य आवश्यकताओं के लिए एकल खिड़की के तहत बैंक से समय पर ऋण प्रदान करना है।",
    targetGroups: ["all", "small_marginal", "women"],
    eligibilityRules: [
      {
        key: "age_limit",
        label: "Age between 18 and 75 years",
        labelHi: "आयु 18 से 75 वर्ष",
        detail: "Borrowers above 60 years require a co-borrower.",
        detailHi: "60 वर्ष से अधिक आयु के उधारकर्ता के लिए सह-उधारकर्ता आवश्यक है।",
        ruleType: "age_min",
        ruleValue: 18
      },
      {
        key: "bank_account",
        label: "Bank Account with Commercial/Cooperative/RRB",
        labelHi: "बैंक खाता",
        detail: "Active savings bank account with clean credit history.",
        detailHi: "सक्रिय बैंक खाता और साफ़ क्रेडिट रिकॉर्ड।",
        ruleType: "bank_required",
        ruleValue: true
      }
    ],
    docsRequired: [
      "Duly filled KCC Application Form",
      "Aadhaar Card & PAN Card / Voter ID",
      "Land Ownership Documents (Khatauni / Khasra Copy)",
      "Crop Sowing Certificate from Village Authority",
      "Two Passport-size Photographs"
    ],
    docsRequiredHi: [
      "भरा हुआ KCC आवेदन पत्र",
      "आधार कार्ड एवं पैन कार्ड/वोटर आईडी",
      "खसरा/खतौनी भूमि दस्तावेज",
      "फसल बुवाई प्रमाण पत्र",
      "दो पासपोर्ट साइज फोटो"
    ],
    applicationSteps: [
      "Download standard KCC Form from PM-KISAN portal or visit nearest bank branch.",
      "Fill personal details, land survey details, and requested credit limit.",
      "Attach Aadhaar, land record copy, and crop details.",
      "Submit form to Commercial Bank, Regional Rural Bank (RRB), or Cooperative Bank.",
      "Bank conducts field inspection and issues KCC Card with ATM facility within 14 days."
    ],
    applicationStepsHi: [
      "PM-KISAN पोर्टल से KCC फॉर्म डाउनलोड करें या बैंक शाखा जाएं।",
      "व्यक्तिगत जानकारी और भूमि विवरण भरें।",
      "आधार और भूमि दस्तावेज संलग्न करें।",
      "शाखा प्रबंधक को फॉर्म जमा करें। बैंक 14 दिनों के भीतर KCC कार्ड जारी करता है।"
    ],
    commonRejectionReasons: [
      {
        reason: "CIBIL defaulter record or existing overdue agricultural loan in another bank.",
        fix: "Clear past due agricultural loans or obtain No-Dues Certificate (NDC) from local cooperative banks."
      }
    ],
    faqs: [
      {
        question: "What is the collateral limit for KCC?",
        questionHi: "KCC के लिए बिना गारंटी ऋण की सीमा क्या है?",
        answer: "No collateral required for loans up to ₹1.60 Lakh (extendable up to ₹3 Lakh for tie-up loans).",
        answerHi: "₹1.60 लाख तक के ऋण के लिए किसी गारंटी या बंधक की आवश्यकता नहीं है।"
      }
    ]
  },
  {
    id: "pmksy-drip",
    code: "PMKSY-PDMC-2026",
    title: "PMKSY Per Drop More Crop (Micro Irrigation Subsidy)",
    titleHi: "प्रधानमंत्री कृषि सिंचाई योजना (सूक्ष्म सिंचाई सब्सिडी)",
    category: "Irrigation",
    level: "central",
    applicableStates: ["All India"],
    ministry: "Ministry of Agriculture & Farmers Welfare / Dept of Agriculture",
    ministryHi: "कृषि मंत्रालय / कृषि विभाग",
    benefit: "55% subsidy for Small & Marginal Farmers (45% for Other Farmers) on installation of Drip and Sprinkler Irrigation systems.",
    benefitHi: "छोटे और सीमांत किसानों के लिए ड्रिप व स्प्रिंकलर सिंचाई प्रणाली पर 55% और अन्य किसानों को 45% सब्सिडी।",
    benefitAmount: "Up to 55% Subsidy",
    benefitAmountNum: 55,
    color: "#0d9488",
    applyUrl: "https://pmksy.gov.in/",
    pdfUrl: "https://pmksy.gov.in/pdf/Guidelines_PDMC.pdf",
    contactHelpline: "18001801551 (State Agriculture Micro-Irrigation Cell)",
    deadline: "State-wise Batch Approvals",
    rolling: true,
    daysLeft: 180,
    openTo: "All category farmers possessing land with guaranteed water source",
    openToHi: "निश्चित जल स्रोत वाली भूमि वाले सभी वर्ग के किसान",
    status: "open",
    lastVerifiedDate: "2026-08-06",
    summary: "Financial assistance for installing water-saving drip and sprinkler irrigation systems.",
    summaryHi: "पानी बचाने वाली ड्रिप और स्प्रिंकलर सिंचाई प्रणाली स्थापित करने के लिए वित्तीय सहायता।",
    overview: "Per Drop More Crop (PDMC) component of PMKSY focuses on enhancing water use efficiency at farm level through Micro Irrigation technologies i.e. Drip and Sprinkler Irrigation systems.",
    overviewHi: "PMKSY का 'प्रति बूंद अधिक फसल' घटक ड्रिप और स्प्रिंकलर तकनीकों के माध्यम से जल उपयोग दक्षता बढ़ाने पर केंद्रित है।",
    targetGroups: ["all", "small_marginal", "women", "dryland"],
    eligibilityRules: [
      {
        key: "water_source",
        label: "Guaranteed Water Source on Farm",
        labelHi: "खेत पर जल स्रोत",
        detail: "Must have tube-well, canal connectivity, or farm pond.",
        detailHi: "ट्यूबवेल, नहर या फार्म पॉन्ड होना चाहिए।",
        ruleType: "irrigation_required",
        ruleValue: true
      },
      {
        key: "land_ownership",
        label: "Land Ownership / Min 7-Year Lease",
        labelHi: "भूमि स्वामित्व या 7 वर्ष का पट्टा",
        detail: "Requires registered land khatauni or long-term lease deed.",
        detailHi: "पंजीकृत खतौनी या दीर्घकालिक पट्टा आवश्यक है।",
        ruleType: "land_docs_required",
        ruleValue: true
      }
    ],
    docsRequired: [
      "Land Record Certificate (7/12, Khatauni)",
      "Aadhaar Card Copy",
      "Bank Passbook Copy",
      "Water & Electricity Connection Proof",
      "Quotation from Empanelled Micro-Irrigation Vendor"
    ],
    docsRequiredHi: [
      "भूमि का 7/12 या खतौनी नक्शा",
      "आधार कार्ड की प्रति",
      "बैंक पासबुक की प्रति",
      "सिंचाई/बिजली कनेक्शन प्रमाण",
      "पंजीकृत माइक्रो-इरिगेशन कंपनी का कोटेशन"
    ],
    applicationSteps: [
      "Register on State Agriculture Portal (e.g. DBT Agriculture / Horticulture Portal).",
      "Submit application selecting Drip or Sprinkler type.",
      "Upload land record and vendor quotation.",
      "State Agriculture Officer inspects field water source.",
      "Work order issued to vendor; system installed at farm.",
      "Joint physical inspection completed and subsidy released directly to vendor/farmer."
    ],
    applicationStepsHi: [
      "राज्य कृषि/उद्यानिकी पोर्टल पर ऑनलाइन पंजीकरण करें।",
      "ड्रिप या स्प्रिंकलर सिस्टम का चयन करें।",
      "भूमि रिकॉर्ड और कंपनी का कोटेशन अपलोड करें।",
      "अधिकारी खेत के पानी के स्रोत का भौतिक सत्यापन करते हैं।",
      "सिस्टम स्थापना के बाद सब्सिडी बैंक खाते या कंपनी में जारी की जाती है।"
    ],
    commonRejectionReasons: [
      {
        reason: "Vendor chosen is not empanelled with State Agriculture Department.",
        fix: "Always request quotations from State-empanelled micro-irrigation manufacturers listed on the portal."
      }
    ],
    faqs: [
      {
        question: "What is the subsidy percentage for small farmers?",
        questionHi: "छोटे किसानों के लिए सब्सिडी का प्रतिशत क्या है?",
        answer: "Small and marginal farmers get 55% subsidy, while other farmers receive 45% subsidy.",
        answerHi: "छोटे और सीमांत किसानों को 55% और अन्य किसानों को 45% सब्सिडी मिलती है।"
      }
    ]
  },
  {
    id: "smam-machinery",
    code: "SMAM-FARM-EQUIP-2026",
    title: "Sub-Mission on Agricultural Mechanization (SMAM / Agricultural Machinery Subsidy)",
    titleHi: "कृषि यांत्रिकीकरण पर उप-मिशन (मशीनरी सब्सिडी)",
    category: "Equipment",
    level: "central",
    applicableStates: ["All India"],
    ministry: "Ministry of Agriculture & Farmers Welfare",
    ministryHi: "कृषि एवं किसान कल्याण मंत्रालय",
    benefit: "40% to 80% financial subsidy on tractors, combine harvesters, laser land levelers, rotavators, power tillers, and Custom Hiring Centre (CHC) setup.",
    benefitHi: "ट्रैक्टर, रोटावेटर, रीपर, पावर टिलर और कस्टम हायरिंग सेंटर स्थापना पर 40% से 80% तक सब्सिडी।",
    benefitAmount: "40% to 80% Subsidy",
    benefitAmountNum: 80,
    color: "#d97706",
    applyUrl: "https://agrimachinery.nic.in/",
    pdfUrl: "https://agrimachinery.nic.in/pdf/SMAM_Operational_Guidelines.pdf",
    contactHelpline: "18001801551 (FARMS App Support)",
    deadline: "Seasonal Direct Portals Open Twice Yearly",
    rolling: false,
    daysLeft: 28,
    openTo: "Individual Farmers, Women Farmers, SC/ST Farmers, FPOs, CHC Entrepreneurs",
    openToHi: "व्यक्तिगत किसान, महिला किसान, अनुसूचित जाति/जनजाति, एफपीओ",
    status: "urgent",
    lastVerifiedDate: "2026-08-06",
    summary: "Subsidy scheme promoting farm mechanization and Custom Hiring Centres for modern farm equipment.",
    summaryHi: "आधुनिक कृषि उपकरणों पर सब्सिडी और कस्टम हायरिंग सेंटर को बढ़ावा देने वाली योजना।",
    overview: "SMAM aims to increase the reach of farm mechanization to small and marginal farmers and to the regions where availability of farm power is low, creating Custom Hiring Centres.",
    overviewHi: "SMAM का उद्देश्य छोटे और सीमांत किसानों तक कृषि मशीनीकरण की पहुंच बढ़ाना है।",
    targetGroups: ["all", "small_marginal", "women", "sc_st"],
    eligibilityRules: [
      {
        key: "sc_st_women_priority",
        label: "Higher Subsidy for Women & SC/ST Farmers",
        labelHi: "महिलाओं और SC/ST किसानों को अधिक सब्सिडी",
        detail: "Women, SC, ST, and Small/Marginal farmers receive up to 50% for individual machines and 80% for CHC groups.",
        detailHi: "महिला और SC/ST किसानों को 50% से 80% तक सब्सिडी मिलती है।",
        ruleType: "category",
        ruleValue: ["sc", "st", "obc", "general"]
      }
    ],
    docsRequired: [
      "Aadhaar Card",
      "Khasra/Khatauni Land Record",
      "Caste Certificate (for SC/ST higher subsidy benefit)",
      "Bank Account Passbook",
      "Proforma Invoice / Bill from Authorized Dealer"
    ],
    docsRequiredHi: [
      "आधार कार्ड",
      "खसरा/खतौनी भूमि अभिलेख",
      "जाति प्रमाण पत्र (SC/ST अतिरिक्त सब्सिडी के लिए)",
      "बैंक खाता पासबुक",
      "अधिकृत डीलर से प्रोफॉर्मा इनवॉइस"
    ],
    applicationSteps: [
      "Visit agrimachinery.nic.in and click 'Farmer Registration'.",
      "Select State, District, Block, and Village.",
      "Choose equipment type (Tractor, Rotavator, Power Tiller).",
      "Upload Aadhaar, Land Proof, and Dealer Quotation.",
      "Selection done through computerized lottery system if applications exceed quota.",
      "Purchase machine upon receiving Sanction Letter; subsidy credited to bank account."
    ],
    applicationStepsHi: [
      "agrimachinery.nic.in पर पंजीकरण करें।",
      "राज्य, जिला और कृषि उपकरण चुनें।",
      "डीलर का प्रोफॉर्मा इनवॉइस और भूमि दस्तावेज अपलोड करें।",
      "स्वीकृति पत्र मिलने के बाद पंजीकृत डीलर से मशीन खरीदें। सब्सिडी खाते में जमा होती है।"
    ],
    commonRejectionReasons: [
      {
        reason: "Purchased machine from unauthorized or non-registered machinery dealer.",
        fix: "Ensure dealer is registered on the Department of Agriculture Direct Benefit Transfer (DBT) portal."
      }
    ],
    faqs: [
      {
        question: "How much subsidy is available for Custom Hiring Center (CHC)?",
        questionHi: "कस्टम हायरिंग सेंटर (CHC) के लिए कितनी सब्सिडी मिलती है?",
        answer: "Up to 80% subsidy (max ₹8 Lakh to ₹40 Lakh depending on project scope) for establishing CHCs.",
        answerHi: "कस्टम हायरिंग सेंटर स्थापित करने पर अधिकतम 80% (₹8 लाख से ₹40 लाख) तक सब्सिडी दी जाती है।"
      }
    ]
  },
  {
    id: "pm-kusum-solar",
    code: "PM-KUSUM-SOLAR-2026",
    title: "PM-KUSUM Scheme (Solar Agriculture Pump Subsidy)",
    titleHi: "प्रधानमंत्री कुसुम योजना (सौर ऊर्जा पंप सब्सिडी)",
    category: "Subsidy",
    level: "central",
    applicableStates: ["All India"],
    ministry: "Ministry of New and Renewable Energy (MNRE)",
    ministryHi: "नवीन एवं नवीकरणीय ऊर्जा मंत्रालय",
    benefit: "60% total subsidy (30% Central + 30% State Govt) for installing standalone Off-Grid Solar Agriculture Pumps up to 7.5 HP. Farmer pays only 40% (bank loan available for 30%).",
    benefitHi: "7.5 एचपी तक सौर पंप पर 60% कुल सब्सिडी (30% केंद्र + 30% राज्य)। किसान को केवल 10% से 40% देना होता है।",
    benefitAmount: "60% Solar Pump Subsidy",
    benefitAmountNum: 60,
    color: "#eab308",
    applyUrl: "https://pmkusum.mnre.gov.in/",
    pdfUrl: "https://mnre.gov.in/pdf/KUSUM_Guidelines.pdf",
    contactHelpline: "18001803333 (MNRE Toll-Free Helpline)",
    deadline: "State-wise Allotment Rounds",
    rolling: false,
    daysLeft: 60,
    openTo: "Individual Farmers, Water User Associations, Panchayats, Farmer Producer Organizations (FPOs)",
    openToHi: "किसान, जल उपभोक्ता संघ, पंचायत, एफपीओ",
    status: "open",
    lastVerifiedDate: "2026-08-06",
    summary: "Subsidy scheme for installing 3HP to 10HP solar powered irrigation pumps replacing diesel pumps.",
    summaryHi: "डीजल पंपों को बदलकर 3HP से 10HP सौर ऊर्जा संचालित सिंचाई पंप लगाने के लिए सब्सिडी योजना।",
    overview: "PM-KUSUM scheme aims to provide energy security to farmers along with honoring India's commitment to increase the share of installed capacity of electric power from non-fossil fuel sources.",
    overviewHi: "PM-KUSUM योजना का उद्देश्य किसानों को ऊर्जा सुरक्षा प्रदान करना और सौर ऊर्जा सिंचाई को बढ़ावा देना है।",
    targetGroups: ["all", "small_marginal", "dryland"],
    eligibilityRules: [
      {
        key: "agricultural_land",
        label: "Agricultural Land Owner",
        labelHi: "कृषि भूमि का मालिक",
        detail: "Must possess land suitable for installing solar panel array and pump.",
        detailHi: "सौर पैनल और पंप स्थापित करने के लिए उपयुक्त भूमि होनी चाहिए।",
        ruleType: "land_docs_required",
        ruleValue: true
      }
    ],
    docsRequired: [
      "Khasra/Khatauni Land Records",
      "Aadhaar Card",
      "Bank Account Passbook",
      "Electricity Bill / NOC stating no grid connection present",
      "Passport Photograph"
    ],
    docsRequiredHi: [
      "खसरा/खतौनी भूमि दस्तावेज",
      "आधार कार्ड",
      "बैंक पासबुक",
      "बिजली कनेक्शन रहित प्रमाण पत्र/एनओसी",
      "पासपोर्ट फोटो"
    ],
    applicationSteps: [
      "Visit official State Renewable Energy Development Portal (e.g. UPNEDA, MEDA, HAREDA).",
      "Select 'PM-KUSUM Component-B Solar Pump Scheme'.",
      "Enter land details and choose pump capacity (3HP, 5HP, 7.5HP AC/DC Surface/Submersible).",
      "Pay 10% farmer share online upon verification.",
      "Empanelled vendor installs solar panel structure and pump within 30 days."
    ],
    applicationStepsHi: [
      "राज्य अक्षय ऊर्जा पोर्टल पर PM-KUSUM कंपोनेंट-B का चयन करें।",
      "भूमि का विवरण भरें और पंप क्षमता चुनें (3HP/5HP/7.5HP)।",
      "सत्यापन के बाद 10% किसान अंशदान राशि का भुगतान करें।",
      "कंपनी 30 दिनों में सौर पैनल और पंप स्थापित करती है।"
    ],
    commonRejectionReasons: [
      {
        reason: "Applied for fraudulent fake websites demanding money for registration.",
        fix: "Apply ONLY through official portal pmkusum.mnre.gov.in or State Nodal Renewable Energy Agency websites."
      }
    ],
    faqs: [
      {
        question: "What is the maximum pump HP covered under 60% subsidy?",
        questionHi: "60% सब्सिडी के तहत अधिकतम कितने एचपी का पंप मिलता है?",
        answer: "Subsidy is provided for pumps up to 7.5 HP capacity. Higher HP pumps can be installed but subsidy is capped at 7.5 HP.",
        answerHi: "60% सब्सिडी 7.5 एचपी तक के सौर पंपों के लिए दी जाती है।"
      }
    ]
  },
  {
    id: "pkvy-organic",
    code: "PKVY-ORGANIC-2026",
    title: "Paramparagat Krishi Vikas Yojana (PKVY - Organic Farming)",
    titleHi: "परंपरागत कृषि विकास योजना (जैविक खेती)",
    category: "Organic Farming",
    level: "central",
    applicableStates: ["All India"],
    ministry: "Ministry of Agriculture & Farmers Welfare",
    ministryHi: "कृषि एवं किसान कल्याण मंत्रालय",
    benefit: "₹50,000 per hectare financial assistance over 3 years for organic inputs, PGS organic certification, processing, and green manure.",
    benefitHi: "जैविक इनपुट, पीजीएस प्रमाणन, और पैकेजिंग के लिए 3 वर्षों में ₹50,000 प्रति हेक्टेयर सहायता।",
    benefitAmount: "₹50,000 / Hectare",
    benefitAmountNum: 50000,
    color: "#059669",
    applyUrl: "https://pgsindia-ncof.gov.in/",
    pdfUrl: "https://dalias.gov.in/pdf/PKVY_Guidelines.pdf",
    contactHelpline: "18001801551 (National Centre of Organic Farming)",
    deadline: "Cluster Group Enrollment Open",
    rolling: true,
    daysLeft: 120,
    openTo: "Farmer Groups / Clusters of 20 or more farmers forming 50-acre blocks",
    openToHi: "20 या अधिक किसानों के समूह/क्लस्टर",
    status: "open",
    lastVerifiedDate: "2026-08-06",
    summary: "Financial incentive and organic certification support to encourage chemical-free organic farming.",
    summaryHi: "रसायन मुक्त जैविक खेती को बढ़ावा देने के लिए वित्तीय प्रोत्साहन और जैविक प्रमाणन सहायता।",
    overview: "PKVY is an elaborated component of Soil Health Management (SHM) of major project National Mission of Sustainable Agriculture (NMSA). Under PKVY Organic farming is promoted through adoption of organic village by cluster approach and PGS certification.",
    overviewHi: "PKVY का उद्देश्य क्लस्टर दृष्टिकोण और PGS प्रमाणन के माध्यम से जैविक खेती को बढ़ावा देना है।",
    targetGroups: ["all", "small_marginal", "organic"],
    eligibilityRules: [
      {
        key: "organic_cluster",
        label: "Part of 20+ Farmer Organic Cluster",
        labelHi: "20+ किसानों का समूह",
        detail: "Farmers must form a cluster of at least 20 farmers with combined 50 acres.",
        detailHi: "कम से कम 20 किसानों का 50 एकड़ का क्लस्टर होना आवश्यक है।",
        ruleType: "land_docs_required",
        ruleValue: true
      }
    ],
    docsRequired: [
      "Cluster Registration Form",
      "Aadhaar Cards of Cluster Farmers",
      "Land Possession Records",
      "Bank Account Details of Cluster Lead / Farmers",
      "PGS-India Organic Conversion Declaration"
    ],
    docsRequiredHi: [
      "क्लस्टर पंजीकरण पत्र",
      "किसानों के आधार कार्ड",
      "भूमि रिकॉर्ड",
      "बैंक पासबुक",
      "PGS-इंडिया जैविक रूपांतरण शपथ पत्र"
    ],
    applicationSteps: [
      "Form a local farmer group of 20+ members.",
      "Register group on PGS-India portal (pgsindia-ncof.gov.in).",
      "District Agriculture Officer verifies cluster land and approves conversion plan.",
      "First tranche of ₹31,000/ha credited directly for bio-fertilizers and green manure seed.",
      "PGS-India issues Organic Farming Certificate upon 3-year compliance."
    ],
    applicationStepsHi: [
      "20 से अधिक किसानों का एक स्थानीय समूह बनाएं।",
      "PGS-India पोर्टल पर समूह का पंजीकरण करें।",
      "जिला कृषि अधिकारी क्लस्टर का सत्यापन करते हैं।",
      "जैविक खाद व बीज हेतु ₹31,000/हेक्टेयर सीधे खाते में आते हैं।"
    ],
    commonRejectionReasons: [
      {
        reason: "Failure to maintain organic diary or chemical spray detected during field sample audit.",
        fix: "Strictly adhere to non-chemical organic inputs verified under PGS-India peer inspection."
      }
    ],
    faqs: [
      {
        question: "How much direct assistance is given for organic inputs?",
        questionHi: "जैविक इनपुट के लिए कितनी प्रत्यक्ष सहायता मिलती है?",
        answer: "Out of ₹50,000 total assistance, ₹31,000 per hectare is directly transferred to farmers for bio-inputs.",
        answerHi: "₹50,000 की कुल सहायता में से ₹31,000 प्रति हेक्टेयर सीधे जैव-इनपुट के लिए किसान के खाते में आता है।"
      }
    ]
  },
  {
    id: "shc-soil-health",
    code: "SHC-NUTRIENT-2026",
    title: "Soil Health Card Scheme (SHC & Free Soil Testing)",
    titleHi: "मृदा स्वास्थ्य कार्ड योजना (मुफ्त मिट्टी जांच)",
    category: "Soil & Inputs",
    level: "central",
    applicableStates: ["All India"],
    ministry: "Ministry of Agriculture & Farmers Welfare",
    ministryHi: "कृषि एवं किसान कल्याण मंत्रालय",
    benefit: "100% Free laboratory soil testing covering 12 parameter nutrient analyses (N, P, K, pH, EC, Organic Carbon, Micronutrients) & customized fertilizer dosage report every 2 years.",
    benefitHi: "12 मापदंडों (एन, पी, के, पीएच, कार्बन) पर 100% मुफ्त मिट्टी की जांच और उर्वरक की सिफारिश रिपोर्ट।",
    benefitAmount: "100% Free Soil Test & Card",
    benefitAmountNum: 100,
    color: "#84cc16",
    applyUrl: "https://soilhealth.dac.gov.in/",
    pdfUrl: "https://soilhealth.dac.gov.in/pdf/SHC_Scheme_Guidelines.pdf",
    contactHelpline: "18001801551 (Soil Health Card Helpdesk)",
    deadline: "Continuous Sampling Drive",
    rolling: true,
    daysLeft: 365,
    openTo: "All landholding and tenant farmers across India",
    openToHi: "भारत के सभी भूमिधारक और पट्टेदार किसान",
    status: "rolling",
    lastVerifiedDate: "2026-08-06",
    summary: "Free soil testing card providing crop-wise nutrient recommendations to reduce fertilizer cost.",
    summaryHi: "उर्वरक लागत घटाने के लिए मुफ्त मिट्टी जांच कार्ड और फसलवार पोषक तत्व सिफारिश।",
    overview: "Soil Health Card scheme provides information to farmers on nutrient status of their soil along with recommendation on appropriate dosage of nutrients to be applied for improving soil health and its fertility.",
    overviewHi: "मृदा स्वास्थ्य कार्ड योजना किसानों को उनकी मिट्टी के पोषक तत्वों की स्थिति और सही उर्वरक मात्रा की जानकारी देती है।",
    targetGroups: ["all", "small_marginal"],
    eligibilityRules: [
      {
        key: "land_available",
        label: "Cultivable Farming Land",
        labelHi: "कृषि योग्य भूमि",
        detail: "Applicable for any cultivable farm parcel.",
        detailHi: "किसी भी कृषि योग्य खेत के लिए लागू।",
        ruleType: "land_docs_required",
        ruleValue: true
      }
    ],
    docsRequired: [
      "Farmer Name & Mobile Number",
      "Khasra Number / Field Survey Number",
      "Soil Sample Box / Bag"
    ],
    docsRequiredHi: [
      "किसान का नाम और मोबाइल नंबर",
      "खसरा नंबर / खेत का नंबर",
      "मिट्टी का नमूना बैग"
    ],
    applicationSteps: [
      "Request soil sampling via AgriConnect App or visit Village Agriculture Extension Officer.",
      "Soil sample collected from V-shape 15cm depth across 4 corners of farm.",
      "Sample analyzed at District Soil Testing Laboratory.",
      "Receive printed Soil Health Card with QR code on your mobile."
    ],
    applicationStepsHi: [
      "कृषि विस्तार अधिकारी या ऐप के माध्यम से मिट्टी जांच का अनुरोध करें।",
      "खेत के 4 कोनों से 15 सेमी गहराई से मिट्टी का नमूना लिया जाता है।",
      "जिला मिट्टी जांच प्रयोगशाला में विश्लेषण किया जाता है।",
      "क्यूआर कोड वाला प्रिंटेड स्वास्थ कार्ड मोबाइल पर प्राप्त करें।"
    ],
    commonRejectionReasons: [
      {
        reason: "Soil sample collected after fresh fertilizer application.",
        fix: "Collect soil sample only before sowing or 2 months after harvesting."
      }
    ],
    faqs: [
      {
        question: "How many nutrients are analyzed in Soil Health Card?",
        questionHi: "मिट्टी कार्ड में कितने पोषक तत्वों की जांच होती है?",
        answer: "12 parameters: N, P, K (Macronutrients), S (Secondary), Zn, Fe, Cu, Mn, Bo (Micronutrients), pH, EC, Organic Carbon.",
        answerHi: "कुल 12 मापदंडों की जांच की जाती है जिनमें एनपीके, जिंक, आयरन और पीएच शामिल हैं।"
      }
    ]
  },
  {
    id: "rkvy-raftaar",
    code: "RKVY-RAFTAAR-2026",
    title: "Rashtriya Krishi Vikas Yojana (RKVY-RAFTAAR & Agri Startups)",
    titleHi: "राष्ट्रीय कृषि विकास योजना (RKVY-रफ़्तार)",
    category: "Subsidy",
    level: "central",
    applicableStates: ["All India"],
    ministry: "Ministry of Agriculture & Farmers Welfare",
    ministryHi: "कृषि एवं किसान कल्याण मंत्रालय",
    benefit: "Grant-in-aid assistance up to ₹5 Lakh for Agripreneurs (Idea Stage) and up to ₹25 Lakh for Seed Stage Agri Startups & FPOs.",
    benefitHi: "कृषि उद्यमियों को ₹5 लाख तक विचार अनुदान और कृषि स्टार्टअप/एफपीओ को ₹25 लाख तक सीड ग्रांट।",
    benefitAmount: "Up to ₹2,500,000 Grant",
    benefitAmountNum: 2500000,
    color: "#7c3aed",
    applyUrl: "https://rkvy.nic.in/",
    pdfUrl: "https://rkvy.nic.in/pdf/RKVY_RAFTAAR_Guidelines.pdf",
    contactHelpline: "011-23382012 (RKVY Knowledge Partner Cell)",
    deadline: "Annual Incubator Calls",
    rolling: false,
    daysLeft: 75,
    openTo: "Farmer Producer Organizations (FPOs), Agri-Entrepreneurs, Rural Youth, Farmers",
    openToHi: "एफपीओ, कृषि-उद्यमी, ग्रामीण युवा, किसान",
    status: "open",
    lastVerifiedDate: "2026-08-06",
    summary: "Innovation and agri-entrepreneurship grant scheme supporting value addition, processing, and smart tech.",
    summaryHi: "मूल्य संवर्धन, प्रसंस्करण और स्मार्ट एग्री-टेक को समर्थन देने वाली नवाचार अनुदान योजना।",
    overview: "RKVY-RAFTAAR aims at making farming a remunerative economic activity through strengthening the farmer's effort, risk mitigation and promoting agri-business entrepreneurship.",
    overviewHi: "RKVY-रफ़्तार का उद्देश्य किसान के प्रयासों को मजबूत करके खेती को एक लाभदायक आर्थिक गतिविधि बनाना है।",
    targetGroups: ["all", "small_marginal"],
    eligibilityRules: [
      {
        key: "agri_business_idea",
        label: "Innovative Agri-Business Proposal",
        labelHi: "नवीन कृषि व्यवसाय विचार",
        detail: "Must present a viable project plan for agri-processing, technology, or FPO value addition.",
        detailHi: "कृषि-प्रसंस्करण या तकनीक पर व्यावहारिक परियोजना रिपोर्ट प्रस्तुत करनी होगी।",
        ruleType: "land_docs_required",
        ruleValue: true
      }
    ],
    docsRequired: [
      "Detailed Project Report (DPR)",
      "Aadhaar & PAN Card",
      "FPO / Firm Registration Certificate",
      "Bank Account Details",
      "Land Ownership or Infrastructure Lease Copy"
    ],
    docsRequiredHi: [
      "विस्तृत परियोजना रिपोर्ट (DPR)",
      "आधार एवं पैन कार्ड",
      "एफपीओ/फर्म पंजीकरण प्रमाण पत्र",
      "बैंक खाता विवरण",
      "भूमि स्वामित्व/लीज़ दस्तावेज"
    ],
    applicationSteps: [
      "Submit DPR to RKVY Knowledge Partner Incubator (e.g. IARI Pusa, MANAGE Hyderabad, CCSHAU).",
      "Present proposal before Screening Committee.",
      "Complete 2-month Agri-Entrepreneurship Training.",
      "Grant-in-aid disbursed in tranches upon milestone achievements."
    ],
    applicationStepsHi: [
      "आरकेवीवाई नॉलेज पार्टनर इनक्यूबेटर में अपनी परियोजना रिपोर्ट जमा करें।",
      "समिति के सामने प्रस्तुति दें।",
      "2 महीने का कृषि-उद्यमिता प्रशिक्षण पूरा करें।",
      "अनुदान राशि मील के पत्थर हासिल करने पर किश्तों में दी जाती है।"
    ],
    commonRejectionReasons: [
      {
        reason: "DPR lacks commercial viability or market buyer tie-up.",
        fix: "Include concrete market linkage agreements (MOUs) with off-takers or mandi traders in your DPR."
      }
    ],
    faqs: [
      {
        question: "Can FPOs apply for RKVY-RAFTAAR funding?",
        questionHi: "क्या एफपीओ RKVY-रफ़्तार के लिए आवेदन कर सकते हैं?",
        answer: "Yes, registered FPOs are eligible for infrastructure and processing grants up to ₹25 Lakh.",
        answerHi: "हाँ, पंजीकृत एफपीओ ₹25 लाख तक के प्रसंस्करण और बुनियादी ढांचा अनुदान के लिए पात्र हैं।"
      }
    ]
  }
];

export function getVerifiedCategories(): string[] {
  return [
    "All",
    "Income Support",
    "Subsidy",
    "Insurance",
    "Credit & Loan",
    "Equipment",
    "Irrigation",
    "Organic Farming",
    "Soil & Inputs"
  ];
}
