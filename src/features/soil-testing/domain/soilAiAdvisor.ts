import { SoilTestOrder, StructuredSoilReport } from './soilTestingTypes';

export interface SoilAiInsight {
  statusOverview: string;
  keyFindings: string[];
  fertilizerActionPlan: string[];
  cropSuitability: string[];
  urgentAlerts: string[];
  hasStructuredData: boolean;
}

/**
 * Analyzes structured soil test results strictly without inventing or fabricating numbers.
 */
export function analyzeSoilReportWithAi(order: SoilTestOrder): SoilAiInsight {
  const report = order.structured_results as StructuredSoilReport | null;

  if (!report || !report.parameters || Object.keys(report.parameters).length === 0) {
    return {
      statusOverview: "Structured lab metrics are being digitized. You can view or download the certified laboratory PDF report directly.",
      keyFindings: [
        `Test Type: ${order.test_type.toUpperCase()} Test`,
        `Laboratory: ${order.lab_name || 'AgriConnect Certified Laboratory'}`,
        `Farm: ${order.farm_name || order.district + ' Plot'} (${order.farm_size || ''} ${order.farm_size_unit || 'Acre'})`,
        `Primary Crop: ${order.crop || 'Seasonal Crops'}`,
      ],
      fertilizerActionPlan: [
        "Refer to the recommendations on the official laboratory PDF report.",
      ],
      cropSuitability: [],
      urgentAlerts: [],
      hasStructuredData: false,
    };
  }

  const p = report.parameters;
  const keyFindings: string[] = [];
  const fertilizerPlan: string[] = [];
  const urgentAlerts: string[] = [];
  const cropSuitability: string[] = report.recommendations?.cropsRecommended || [];

  // 1. Soil pH analysis
  if (p.ph) {
    const phVal = Number(p.ph.value);
    if (phVal < 6.0) {
      keyFindings.push(`Soil is Acidic (pH ${phVal}). Nutrient uptake may be restricted.`);
      fertilizerPlan.push("Apply Agricultural Lime or Dolomite (200-300 kg/acre) during pre-sowing tillage to neutralize acidity.");
      urgentAlerts.push("Acidic soil: Avoid excessive ammonium-based nitrogen fertilizers which increase acidity.");
    } else if (phVal > 8.0) {
      keyFindings.push(`Soil is Alkaline (pH ${phVal}). Micronutrient availability (Zinc/Iron) is reduced.`);
      fertilizerPlan.push("Apply Agricultural Gypsum (250-400 kg/acre) with abundant irrigation to reduce alkalinity.");
      urgentAlerts.push("Alkaline soil: High risk of Zinc and Iron chlorosis. Prefer foliar micronutrient sprays.");
    } else {
      keyFindings.push(`Soil pH is Optimal (${phVal}). Excellent for most field and vegetable crops.`);
    }
  }

  // 2. Nitrogen analysis
  if (p.nitrogen) {
    const nStatus = p.nitrogen.status;
    if (nStatus === 'low') {
      keyFindings.push(`Available Nitrogen is Low (${p.nitrogen.value} ${p.nitrogen.unit}).`);
      fertilizerPlan.push("Split application of Urea/Neem-coated Urea: 50% basal at sowing + 25% at tillering/active growth + 25% at pre-flowering.");
    } else if (nStatus === 'high') {
      keyFindings.push(`Available Nitrogen is High (${p.nitrogen.value} ${p.nitrogen.unit}).`);
      fertilizerPlan.push("Reduce synthetic nitrogen (Urea) dose by 20-30% to prevent excessive vegetative growth and pest susceptibility.");
    } else {
      keyFindings.push(`Available Nitrogen is in Optimal range (${p.nitrogen.value} ${p.nitrogen.unit}).`);
      fertilizerPlan.push("Maintain standard recommended Nitrogen dose as per crop guidelines.");
    }
  }

  // 3. Phosphorus analysis
  if (p.phosphorus) {
    const pStatus = p.phosphorus.status;
    if (pStatus === 'low') {
      keyFindings.push(`Available Phosphorus is Low (${p.phosphorus.value} ${p.phosphorus.unit}). Root development may be affected.`);
      fertilizerPlan.push("Apply DAP (Di-Ammonium Phosphate) or Single Super Phosphate (SSP) at root-zone depth during land preparation.");
    } else if (pStatus === 'high') {
      keyFindings.push(`Available Phosphorus is High (${p.phosphorus.value} ${p.phosphorus.unit}).`);
      fertilizerPlan.push("Skip additional phosphorus basal fertilizer for this season.");
    } else {
      keyFindings.push(`Phosphorus is in Optimal range (${p.phosphorus.value} ${p.phosphorus.unit}).`);
    }
  }

  // 4. Potassium analysis
  if (p.potassium) {
    const kStatus = p.potassium.status;
    if (kStatus === 'low') {
      keyFindings.push(`Available Potassium is Low (${p.potassium.value} ${p.potassium.unit}). Crop resilience and grain filling may be lowered.`);
      fertilizerPlan.push("Apply MOP (Muriate of Potash) @ 25-40 kg/acre as basal dose or split dose.");
    } else {
      keyFindings.push(`Potassium is Optimal (${p.potassium.value} ${p.potassium.unit}). Good disease tolerance and grain quality expected.`);
    }
  }

  // 5. Organic Carbon (% OC)
  if (p.organicCarbon) {
    const ocVal = Number(p.organicCarbon.value);
    if (ocVal < 0.5) {
      keyFindings.push(`Organic Carbon is Low (${ocVal}%). Soil biological activity and water retention need improvement.`);
      fertilizerPlan.push("Incorporate 2-3 tonnes/acre of well-rotted FYM (Farmyard Manure), Vermicompost, or sow green manure crops (Dhaincha/Sunhemp).");
    } else {
      keyFindings.push(`Organic Carbon is Good (${ocVal}%). Good microbial activity and moisture holding.`);
    }
  }

  // 6. Micronutrients
  if (p.zinc && p.zinc.status === 'low') {
    urgentAlerts.push("Zinc deficiency detected: Apply Zinc Sulphate (21% or 33%) @ 10-15 kg/acre or foliar Chelated Zinc spray (0.5%).");
  }
  if (p.iron && p.iron.status === 'low') {
    urgentAlerts.push("Iron deficiency: Spray Ferrous Sulphate (0.5%) with 0.2% citric acid at early vegetative stage.");
  }
  if (p.boron && p.boron.status === 'low') {
    urgentAlerts.push("Boron deficiency: Spray Solubor/Borax (0.15%) during pre-flowering for better fruit/flower setting.");
  }

  // Add custom plan from report recommendations if available
  if (report.recommendations?.fertilizerPlan && report.recommendations.fertilizerPlan.length > 0) {
    report.recommendations.fertilizerPlan.forEach((f) => {
      fertilizerPlan.push(`${f.item}: ${f.dosePerAcre} (${f.timing})`);
    });
  }

  const overview = `Soil test report analysis complete for ${order.crop || 'your field'}. Found ${urgentAlerts.length > 0 ? `${urgentAlerts.length} specific nutrient attention points` : 'balanced overall soil health'
    } with targeted fertilizer adjustments recommended.`;

  return {
    statusOverview: overview,
    keyFindings,
    fertilizerActionPlan: fertilizerPlan,
    cropSuitability,
    urgentAlerts,
    hasStructuredData: true,
  };
}

/**
 * Interactive Kisan AI Q&A strictly grounded in the verified report data.
 */
export function askKisanAiAboutReport(order: SoilTestOrder, question: string): string {
  const q = question.toLowerCase();
  const report = order.structured_results as StructuredSoilReport | null;

  if (!report || !report.parameters || Object.keys(report.parameters).length === 0) {
    return `Namaste! For order ${order.order_number}, we have your certified laboratory report file ready. Structured digital values are currently being digitized, so please download the PDF to view all specific laboratory values.`;
  }

  const p = report.parameters;

  if (q.includes('ph') || q.includes('acid') || q.includes('alkaline')) {
    if (!p.ph) return "This report does not contain a specific pH parameter measurement.";
    return `Your soil pH is ${p.ph.value} (${p.ph.status.toUpperCase()}). Benchmark range is ${p.ph.benchmark}. ${Number(p.ph.value) < 6.5
        ? "Soil is acidic. Liming is recommended."
        : Number(p.ph.value) > 7.8
          ? "Soil is alkaline. Adding gypsum and organic manure helps normalize pH."
          : "pH is in the ideal range for nutrient absorption."
      }`;
  }

  if (q.includes('urea') || q.includes('nitrogen') || q.includes('dap') || q.includes('fertilizer') || q.includes('khad')) {
    const n = p.nitrogen ? `Nitrogen is ${p.nitrogen.status} (${p.nitrogen.value} ${p.nitrogen.unit})` : '';
    const phos = p.phosphorus ? `Phosphorus is ${p.phosphorus.status} (${p.phosphorus.value} ${p.phosphorus.unit})` : '';
    const k = p.potassium ? `Potassium is ${p.potassium.status} (${p.potassium.value} ${p.potassium.unit})` : '';

    return `Based on your lab findings: ${[n, phos, k].filter(Boolean).join(', ')}. ${p.nitrogen?.status === 'low'
        ? "Apply Urea in 2-3 split doses instead of single application."
        : "Avoid over-applying nitrogen."
      } ${p.phosphorus?.status === 'low' ? "Apply DAP or SSP as a basal dose at root depth." : ""
      } ${p.potassium?.status === 'low' ? "Apply MOP (Muriate of Potash) @ 25 kg/acre." : ""
      }`;
  }

  if (q.includes('crop') || q.includes('fasal') || q.includes('sow') || q.includes('suitable')) {
    const crops = report.recommendations?.cropsRecommended;
    if (crops && crops.length > 0) {
      return `Recommended crops for your soil profile: ${crops.join(', ')}. Your soil condition is particularly suited for these with standard nutrient management.`;
    }
    return `Based on your pH (${p.ph?.value || 'measured'}) and NPK profile, your soil is suitable for ${order.crop || 'regional seasonal crops'} when supplemented with the recommended fertilizer plan.`;
  }

  if (q.includes('zinc') || q.includes('micronutrient') || q.includes('iron') || q.includes('boron')) {
    const microSummary = [
      p.zinc ? `Zinc: ${p.zinc.value} ${p.zinc.unit} (${p.zinc.status})` : null,
      p.iron ? `Iron: ${p.iron.value} ${p.iron.unit} (${p.iron.status})` : null,
      p.boron ? `Boron: ${p.boron.value} ${p.boron.unit} (${p.boron.status})` : null,
      p.sulphur ? `Sulphur: ${p.sulphur.value} ${p.sulphur.unit} (${p.sulphur.status})` : null,
    ].filter(Boolean);

    if (microSummary.length === 0) {
      return "This was a Standard Soil Test which covers macronutrients (NPK, pH, EC, OC). For detailed micronutrients (Zn, Fe, B, Cu, Mn), choose the Micronutrient Lab Package.";
    }

    return `Micronutrient status: ${microSummary.join('; ')}. ${p.zinc?.status === 'low' ? "Apply Zinc Sulphate 21% @ 10 kg/acre." : ""
      } ${p.iron?.status === 'low' ? "Apply Ferrous Sulphate foliar spray (0.5%)." : ""
      }`;
  }

  return `Your soil report for ${order.order_number} shows pH: ${p.ph?.value ?? 'N/A'}, Nitrogen: ${p.nitrogen?.status ?? 'N/A'}, Phosphorus: ${p.phosphorus?.status ?? 'N/A'}, and Potassium: ${p.potassium?.status ?? 'N/A'}. Let me know if you need advice on specific fertilizers, crop suitability, or dosage for ${order.crop || 'your field'}.`;
}
