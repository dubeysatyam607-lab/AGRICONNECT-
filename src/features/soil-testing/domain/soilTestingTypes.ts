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
