export type SoilTestType = 'standard' | 'micronutrient' | 'water';

export type SoilOrderStatus =
  | 'submitted'
  | 'payment_confirmed'
  | 'agent_pending'
  | 'pickup_scheduled'
  | 'sample_collected'
  | 'sample_received'
  | 'testing_in_progress'
  | 'report_ready'
  | 'report_delivered'
  | 'cancelled';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export type FarmSizeUnit = 'acre' | 'hectare' | 'bigha' | 'guntha';

export type NutrientRating = 'low' | 'optimal' | 'high' | 'critical';

export interface NutrientParameter {
  key: string;
  name: string;
  hindiName: string;
  value: number;
  unit: string;
  optimalRange: [number, number];
  rating: NutrientRating;
  interpretation: string;
  recommendation?: string;
}

export interface StructuredSoilResults {
  ph?: NutrientParameter;
  ec?: NutrientParameter;
  organicCarbon?: NutrientParameter;
  nitrogen?: NutrientParameter;
  phosphorus?: NutrientParameter;
  potassium?: NutrientParameter;
  sulphur?: NutrientParameter;
  zinc?: NutrientParameter;
  iron?: NutrientParameter;
  manganese?: NutrientParameter;
  copper?: NutrientParameter;
  boron?: NutrientParameter;
  overallHealthScore?: number; // 0 - 100
  overallVerdict?: string;
  cropSuitability?: string[];
  fertilizerRecommendations?: {
    fertilizer: string;
    dosagePerAcre: string;
    timing: string;
  }[];
  testedAt?: string;
  labTechnician?: string;
}

export interface SoilTestPackage {
  id: SoilTestType;
  title: string;
  titleKey: string;
  hindiTitle: string;
  subtitle: string;
  price: number;
  turnaroundDays: string;
  badge?: string;
  parameters: string[];
  whatYouGet: string[];
  recommendedFor: string;
  isPopular?: boolean;
}

export interface SoilTestOrder {
  id: string;
  order_number: string;
  user_id: string;
  farmer_name: string;
  mobile: string;
  email?: string | null;
  farm_name?: string | null;
  address: string;
  state: string;
  district: string;
  village?: string | null;
  pincode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  farm_size?: number | null;
  farm_size_unit: FarmSizeUnit;
  crop?: string | null;
  crop_stage?: string | null;
  test_type: SoilTestType;
  sample_quantity: string;
  pickup_required: boolean;
  pickup_fee: number;
  test_price: number;
  total_amount: number;
  payment_status: PaymentStatus;
  payment_method?: string | null;
  payment_id?: string | null;
  order_status: SoilOrderStatus;
  assigned_agent_id?: string | null;
  assigned_agent_name?: string | null;
  assigned_agent_phone?: string | null;
  preferred_pickup_date?: string | null;
  confirmed_pickup_date?: string | null;
  pickup_time_slot?: string | null;
  sample_collected_at?: string | null;
  sample_received_at?: string | null;
  lab_started_at?: string | null;
  report_generated_at?: string | null;
  report_url?: string | null;
  report_file_path?: string | null;
  lab_name?: string | null;
  structured_results?: StructuredSoilResults;
  internal_notes?: string | null;
  additional_notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SoilTestStatusHistory {
  id: string;
  soil_test_order_id: string;
  previous_status?: string | null;
  new_status: SoilOrderStatus;
  changed_by?: string | null;
  changed_by_name?: string | null;
  note?: string | null;
  created_at: string;
}

export interface SoilTestKpis {
  totalOrders: number;
  pendingPayment: number;
  agentPending: number;
  scheduledPickups: number;
  sampleCollected: number;
  inLab: number;
  testingInProgress: number;
  reportsReady: number;
  delivered: number;
  cancelled: number;
  totalRevenue: number;
}

export const SOIL_TEST_PACKAGES: SoilTestPackage[] = [
  {
    id: 'standard',
    title: 'Standard Soil Health Test',
    titleKey: 'soil.pkg.standard.title',
    hindiTitle: 'मानक मिट्टी स्वास्थ्य परीक्षण (12 पैरामीटर)',
    subtitle: 'Primary N-P-K, pH, Electrical Conductivity & Organic Carbon',
    price: 299,
    turnaroundDays: '3 - 5 Days',
    isPopular: true,
    badge: 'Most Popular',
    parameters: [
      'Soil Reaction (pH)',
      'Electrical Conductivity (EC / Salinity)',
      'Organic Carbon (OC %)',
      'Available Nitrogen (N)',
      'Available Phosphorus (P₂O₅)',
      'Available Potassium (K₂O)',
      'Basic Soil Texture',
    ],
    whatYouGet: [
      'Official Certified Soil Health Card (PDF)',
      'NPK & pH Level Assessment with color indicators',
      'Targeted Per-Acre Fertilizer Dosage Plan (Urea/DAP/MOP)',
      'Instant Kisan AI Interactive Consultation',
    ],
    recommendedFor: 'Pre-sowing preparation for Wheat, Paddy, Mustard, Cotton, Maize, and Sugarcane.',
  },
  {
    id: 'micronutrient',
    title: 'Comprehensive Micro-Nutrient Test',
    titleKey: 'soil.pkg.micronutrient.title',
    hindiTitle: 'सम्पूर्ण सूक्ष्म पोषक तत्व परीक्षण',
    subtitle: 'Standard 7 + Zinc, Iron, Boron, Manganese, Copper & Sulphur',
    price: 499,
    turnaroundDays: '5 - 7 Days',
    badge: 'Highest Accuracy',
    parameters: [
      'All 7 Standard Parameters',
      'Available Zinc (Zn)',
      'Available Iron (Fe)',
      'Available Boron (B)',
      'Available Manganese (Mn)',
      'Available Copper (Cu)',
      'Available Sulphur (S)',
    ],
    whatYouGet: [
      'Comprehensive 14-Parameter Certified Laboratory Report (PDF)',
      'Micro-nutrient Deficiency Diagnosis & correction spray advice',
      'Crop-specific soil health recommendations',
      'Direct WhatsApp Advisory with AgriConnect Agronomists',
    ],
    recommendedFor: 'Horticulture, Vegetables, Fruits, Cash Crops, and persistent low-yield fields.',
  },
  {
    id: 'water',
    title: 'Farm Irrigation Water Test',
    titleKey: 'soil.pkg.water.title',
    hindiTitle: 'कृषि सिंचाई जल परीक्षण',
    subtitle: 'Salinity, Hardness, pH, TDS & Sodium Absorption Ratio (SAR)',
    price: 399,
    turnaroundDays: '2 - 4 Days',
    parameters: [
      'Water pH & Acidity/Alkalinity',
      'Total Dissolved Solids (TDS)',
      'Electrical Conductivity (ECw)',
      'Sodium Adsorption Ratio (SAR)',
      'Total Hardness (Ca + Mg)',
      'Residual Sodium Carbonate (RSC)',
    ],
    whatYouGet: [
      'Irrigation Suitability Certificate (PDF)',
      'Borewell / Canal / Well Water Toxicity check',
      'Drip & Sprinkler Clogging Risk analysis',
      'Gypsum / Acid treatment recommendation if saline',
    ],
    recommendedFor: 'Tubewell / Borewell installations, saline areas, and drip irrigation setups.',
  },
];

export const STATUS_STEPS: { status: SoilOrderStatus; labelKey: string; defaultLabel: string; description: string }[] = [
  { status: 'submitted', labelKey: 'soil.status.submitted', defaultLabel: 'Request Submitted', description: 'Sample testing request received by AgriConnect' },
  { status: 'payment_confirmed', labelKey: 'soil.status.payment_confirmed', defaultLabel: 'Payment Confirmed', description: 'Payment received successfully' },
  { status: 'agent_pending', labelKey: 'soil.status.agent_pending', defaultLabel: 'Agent Assignment', description: 'Assigning nearest verified pickup technician' },
  { status: 'pickup_scheduled', labelKey: 'soil.status.pickup_scheduled', defaultLabel: 'Pickup Scheduled', description: 'Technician confirmed pickup slot' },
  { status: 'sample_collected', labelKey: 'soil.status.sample_collected', defaultLabel: 'Sample Collected', description: 'Sample safely collected & sealed with Order ID' },
  { status: 'sample_received', labelKey: 'soil.status.sample_received', defaultLabel: 'Received at Lab', description: 'Barcoded and checked in at Central Agri Lab' },
  { status: 'testing_in_progress', labelKey: 'soil.status.testing_in_progress', defaultLabel: 'Testing in Progress', description: 'Chemical spectrometry and nutrient titration' },
  { status: 'report_ready', labelKey: 'soil.status.report_ready', defaultLabel: 'Report Ready', description: 'Soil Health Card signed by certified agronomist' },
  { status: 'report_delivered', labelKey: 'soil.status.report_delivered', defaultLabel: 'Delivered & Completed', description: 'Report downloaded / shared with farmer' },
];
