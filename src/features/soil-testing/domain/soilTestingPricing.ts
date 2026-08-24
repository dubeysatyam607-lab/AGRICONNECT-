import { SoilTestPackage, SoilTestType } from './soilTestingTypes';

export const SOIL_PICKUP_FEE = 150.0;

export const SOIL_TEST_PACKAGES: SoilTestPackage[] = [
  {
    type: 'standard',
    titleKey: 'soil.package.standard.title',
    titleEn: 'Standard Soil Test',
    price: 299.0,
    processingTimeDays: 3,
    parametersTested: [
      'Soil pH & Acidity Level',
      'Electrical Conductivity (EC / Salinity)',
      'Primary Nitrogen (N)',
      'Available Phosphorus (P)',
      'Available Potassium (K)',
      'Organic Carbon (% OC)',
    ],
    farmerReceives: [
      'Official Certified Lab Health Card (PDF)',
      'Macronutrient N-P-K status (Low/Optimal/High)',
      'Customized Urea, DAP & MOP fertilizer recommendation',
      'Kisan AI soil advisory report breakdown',
    ],
    recommendedFor: 'Routine seasonal pre-sowing check for field crops (Wheat, Paddy, Cotton, Soybean, Sugarcane).',
    popular: true,
  },
  {
    type: 'micronutrient',
    titleKey: 'soil.package.micronutrient.title',
    titleEn: 'Micro-nutrient Test',
    price: 499.0,
    processingTimeDays: 4,
    parametersTested: [
      'All 6 Standard Parameters (pH, EC, N, P, K, OC)',
      'Zinc (Zn)',
      'Iron (Fe)',
      'Manganese (Mn)',
      'Copper (Cu)',
      'Sulphur (S)',
      'Boron (B)',
    ],
    farmerReceives: [
      'Complete 12-parameter Comprehensive Health Report',
      'Secondary & Micronutrient deficiency diagnosis',
      'Targeted chelated foliar spray & basal dose plan',
      'Kisan AI custom nutrient balance guidance',
    ],
    recommendedFor: 'Horticulture, cash crops, orchards (Vegetables, Fruits, Spices, Flowers) or problem soils.',
  },
  {
    type: 'water',
    titleKey: 'soil.package.water.title',
    titleEn: 'Agricultural Water Test',
    price: 199.0,
    processingTimeDays: 2,
    parametersTested: [
      'Water pH',
      'Total Dissolved Solids (TDS)',
      'Electrical Conductivity (EC)',
      'Sodium Adsorption Ratio (SAR)',
      'Residual Sodium Carbonate (RSC)',
      'Chloride & Boron toxicity check',
    ],
    farmerReceives: [
      'Irrigation Water Suitability Certificate',
      'Salinity & Alkalinity Hazard classification',
      'Drip irrigation compatibility & clogging risk check',
      'Water treatment & blending guidance',
    ],
    recommendedFor: 'Borewell, canal, or tube well water validation before sowing or setting up drip irrigation.',
  },
];

export function getPackageDetails(type: SoilTestType): SoilTestPackage {
  return SOIL_TEST_PACKAGES.find((p) => p.type === type) || SOIL_TEST_PACKAGES[0];
}

export function calculateSoilOrderTotal(testType: SoilTestType, pickupRequired: boolean) {
  const pkg = getPackageDetails(testType);
  const testPrice = pkg.price;
  const pickupFee = pickupRequired ? SOIL_PICKUP_FEE : 0.0;
  const totalAmount = testPrice + pickupFee;

  return {
    testPrice,
    pickupFee,
    totalAmount,
    testType,
    pickupRequired,
  };
}
