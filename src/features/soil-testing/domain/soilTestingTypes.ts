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

export type SoilPaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export type FarmSizeUnit = 'acre' | 'hectare' | 'bigha' | 'guntha';

export interface SoilTestPackage {
  type: SoilTestType;
  titleKey: string;
  titleEn: string;
  price: number;
  processingTimeDays: number;
  parametersTested: string[];
  farmerReceives: string[];
  recommendedFor: string;
  popular?: boolean;
}

export interface SoilParameterResult {
  value: number | string;
  unit: string;
  status: 'low' | 'optimal' | 'high' | 'normal';
  benchmark: string;
  interpretation?: string;
  recommendation?: string;
}

export interface StructuredSoilReport {
  laboratoryName: string;
  sampleId?: string;
  testedDate?: string;
  summary?: string;
  parameters: {
    ph?: SoilParameterResult;
    ec?: SoilParameterResult;
    nitrogen?: SoilParameterResult;
    phosphorus?: SoilParameterResult;
    potassium?: SoilParameterResult;
    organicCarbon?: SoilParameterResult;
    sulphur?: SoilParameterResult;
    zinc?: SoilParameterResult;
    iron?: SoilParameterResult;
    manganese?: SoilParameterResult;
    copper?: SoilParameterResult;
    boron?: SoilParameterResult;
    [key: string]: SoilParameterResult | undefined;
  };
  recommendations?: {
    cropsRecommended?: string[];
    fertilizerPlan?: Array<{ item: string; dosePerAcre: string; timing: string }>;
    soilAmendments?: string[];
  };
}

export interface SoilTestOrder {
  id: string;
  order_number: string;
  user_id: string;
  farmer_name: string;
  mobile: string;
  email: string | null;
  farm_name: string | null;
  address: string;
  state: string;
  district: string;
  village: string | null;
  pincode: string | null;
  latitude: number | null;
  longitude: number | null;
  farm_size: number | null;
  farm_size_unit: FarmSizeUnit | null;
  crop: string | null;
  crop_stage: string | null;
  test_type: SoilTestType;
  sample_quantity: string | null;
  pickup_required: boolean;
  pickup_fee: number;
  test_price: number;
  total_amount: number;
  payment_status: SoilPaymentStatus;
  payment_method: string | null;
  payment_id: string | null;
  order_status: SoilOrderStatus;
  assigned_agent_id: string | null;
  assigned_agent_name: string | null;
  assigned_agent_phone: string | null;
  preferred_pickup_date: string | null;
  confirmed_pickup_date: string | null;
  pickup_time_slot: string | null;
  sample_collected_at: string | null;
  sample_received_at: string | null;
  lab_started_at: string | null;
  report_generated_at: string | null;
  report_url: string | null;
  report_file_path: string | null;
  lab_name: string | null;
  structured_results: StructuredSoilReport | null;
  internal_notes: string | null;
  additional_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SoilTestStatusHistory {
  id: string;
  soil_test_order_id: string;
  previous_status: SoilOrderStatus | null;
  new_status: SoilOrderStatus;
  changed_by: string | null;
  changed_by_name: string | null;
  note: string | null;
  created_at: string;
}

export interface CreateSoilTestOrderInput {
  farmer_name: string;
  mobile: string;
  email?: string;
  farm_name?: string;
  address: string;
  state: string;
  district: string;
  village?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
  farm_size?: number;
  farm_size_unit?: FarmSizeUnit;
  crop?: string;
  crop_stage?: string;
  test_type: SoilTestType;
  sample_quantity?: string;
  pickup_required: boolean;
  preferred_pickup_date?: string;
  pickup_time_slot?: string;
  additional_notes?: string;
}

export interface SoilTestingKPIs {
  totalRequests: number;
  pendingPickup: number;
  scheduledPickups: number;
  samplesCollected: number;
  samplesAtLab: number;
  testingInProgress: number;
  reportsReady: number;
  completedTests: number;
  failedOrCancelled: number;
  totalRevenue: number;
}

/**
 * 7 Canonical Tracked Workflow Statuses requested for Phase 13
 */
export type CanonicalSoilStatus =
  | 'Requested'
  | 'Agent Assigned'
  | 'Pickup Scheduled'
  | 'Sample Collected'
  | 'Testing'
  | 'Report Ready'
  | 'Completed';

export interface CanonicalStatusMeta {
  key: CanonicalSoilStatus;
  order: number;
  titleEn: string;
  titleHi: string;
  descriptionEn: string;
  descriptionHi: string;
}

export const CANONICAL_SOIL_STATUS_STEPS: CanonicalStatusMeta[] = [
  {
    key: 'Requested',
    order: 1,
    titleEn: 'Requested',
    titleHi: 'अनुरोध दर्ज (Requested)',
    descriptionEn: 'Soil test request created and logged into system.',
    descriptionHi: 'मिट्टी परीक्षण अनुरोध दर्ज किया गया।',
  },
  {
    key: 'Agent Assigned',
    order: 2,
    titleEn: 'Agent Assigned',
    titleHi: 'प्रतिनिधि नियुक्त (Agent Assigned)',
    descriptionEn: 'Field collection technician assigned (or pending assignment if none available).',
    descriptionHi: 'सैंपल संग्रह प्रतिनिधि नियुक्त (या आवंटन प्रतीक्षारत)।',
  },
  {
    key: 'Pickup Scheduled',
    order: 3,
    titleEn: 'Pickup Scheduled',
    titleHi: 'पिकअप निर्धारित (Pickup Scheduled)',
    descriptionEn: 'Pickup date and time window confirmed with farmer.',
    descriptionHi: 'पिकअप की तारीख और समय स्लॉट तय हो गया।',
  },
  {
    key: 'Sample Collected',
    order: 4,
    titleEn: 'Sample Collected',
    titleHi: 'सैंपल एकत्र (Sample Collected)',
    descriptionEn: 'Representative 500g composite sample collected and sealed with tracking barcode.',
    descriptionHi: 'खेत से 500 ग्राम मिट्टी का नमूना बारकोड के साथ एकत्र किया गया।',
  },
  {
    key: 'Testing',
    order: 5,
    titleEn: 'Testing',
    titleHi: 'प्रयोगशाला जांच (Testing)',
    descriptionEn: 'Sample accessioned at ICAR-compliant laboratory; NPK & chemical testing in progress.',
    descriptionHi: 'केंद्रीय प्रयोगशाला में NPK एवं सूक्ष्म पोषक तत्वों की जांच जारी।',
  },
  {
    key: 'Report Ready',
    order: 6,
    titleEn: 'Report Ready',
    titleHi: 'रिपोर्ट तैयार (Report Ready)',
    descriptionEn: 'Digital certified Soil Health Card generated with AI fertilizer recommendations.',
    descriptionHi: 'प्रमाणित डिजिटल मृदा स्वास्थ्य कार्ड और उर्वरक सलाह तैयार।',
  },
  {
    key: 'Completed',
    order: 7,
    titleEn: 'Completed',
    titleHi: 'पूर्ण (Completed)',
    descriptionEn: 'Report delivered in-app, SMS alert sent, and emailed to farmer.',
    descriptionHi: 'रिपोर्ट ऐप में उपलब्ध, किसान को अधिसूचना व ईमेल प्रेषित।',
  },
];

/**
 * Map database SoilOrderStatus to the 7 Canonical Phase 13 Statuses
 */
export function mapToCanonicalStatus(
  status: SoilOrderStatus,
  assignedAgentName?: string | null
): { canonicalStatus: CanonicalSoilStatus; displayLabel: string; isAgentPending: boolean } {
  switch (status) {
    case 'submitted':
    case 'payment_confirmed':
      return {
        canonicalStatus: 'Requested',
        displayLabel: 'Requested',
        isAgentPending: false,
      };

    case 'agent_pending':
      return {
        canonicalStatus: 'Agent Assigned',
        displayLabel: assignedAgentName ? 'Agent Assigned' : 'Pending Assignment',
        isAgentPending: !assignedAgentName,
      };

    case 'pickup_scheduled':
      return {
        canonicalStatus: 'Pickup Scheduled',
        displayLabel: 'Pickup Scheduled',
        isAgentPending: false,
      };

    case 'sample_collected':
      return {
        canonicalStatus: 'Sample Collected',
        displayLabel: 'Sample Collected',
        isAgentPending: false,
      };

    case 'sample_received':
    case 'testing_in_progress':
      return {
        canonicalStatus: 'Testing',
        displayLabel: 'Testing',
        isAgentPending: false,
      };

    case 'report_ready':
      return {
        canonicalStatus: 'Report Ready',
        displayLabel: 'Report Ready',
        isAgentPending: false,
      };

    case 'report_delivered':
      return {
        canonicalStatus: 'Completed',
        displayLabel: 'Completed',
        isAgentPending: false,
      };

    case 'cancelled':
    default:
      return {
        canonicalStatus: 'Requested',
        displayLabel: status === 'cancelled' ? 'Cancelled' : 'Requested',
        isAgentPending: false,
      };
  }
}
