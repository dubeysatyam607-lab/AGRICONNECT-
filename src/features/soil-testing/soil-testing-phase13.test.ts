import { describe, it, expect } from 'vitest';
import {
  SOIL_TEST_PACKAGES,
  SOIL_PICKUP_FEE,
  calculateSoilOrderTotal,
  getPackageDetails,
} from './domain/soilTestingPricing';
import { generateOrderNumber } from './domain/soilTestingService';
import {
  CANONICAL_SOIL_STATUS_STEPS,
  mapToCanonicalStatus,
  SoilTestOrder,
  StructuredSoilReport,
} from './domain/soilTestingTypes';
import { analyzeSoilReportWithAi, askKisanAiAboutReport } from './domain/soilAiAdvisor';
import { buildSoilEmailContent } from './domain/soilEmailNotifications';

describe('Phase 13: Soil Testing Packages & Pricing', () => {
  it('supports all 3 mandated test packages with correct parameters', () => {
    expect(SOIL_TEST_PACKAGES.length).toBe(3);

    // 1. Standard Soil Test
    const standard = getPackageDetails('standard');
    expect(standard.titleEn).toBe('Standard Soil Test');
    expect(standard.price).toBe(299.0);
    expect(standard.processingTimeDays).toBe(3);
    expect(standard.parametersTested).toContain('Soil pH & Acidity Level');
    expect(standard.parametersTested).toContain('Primary Nitrogen (N)');
    expect(standard.parametersTested).toContain('Available Phosphorus (P)');
    expect(standard.parametersTested).toContain('Available Potassium (K)');
    expect(standard.parametersTested).toContain('Organic Carbon (% OC)');

    // 2. Micro-nutrient Test
    const micro = getPackageDetails('micronutrient');
    expect(micro.titleEn).toBe('Micro-nutrient Test');
    expect(micro.price).toBe(499.0);
    expect(micro.parametersTested).toContain('Zinc (Zn)');
    expect(micro.parametersTested).toContain('Iron (Fe)');
    expect(micro.parametersTested).toContain('Boron (B)');
    expect(micro.parametersTested).toContain('Sulphur (S)');

    // 3. Water Test
    const water = getPackageDetails('water');
    expect(water.titleEn).toContain('Water Test');
    expect(water.price).toBe(199.0);
    expect(water.parametersTested).toContain('Total Dissolved Solids (TDS)');
    expect(water.parametersTested).toContain('Sodium Adsorption Ratio (SAR)');
  });

  it('calculates doorstep pickup fees transparently without hidden surcharges', () => {
    const standardWithPickup = calculateSoilOrderTotal('standard', true);
    expect(standardWithPickup.testPrice).toBe(299.0);
    expect(standardWithPickup.pickupFee).toBe(SOIL_PICKUP_FEE);
    expect(standardWithPickup.totalAmount).toBe(299.0 + SOIL_PICKUP_FEE);

    const standardSelfSubmit = calculateSoilOrderTotal('standard', false);
    expect(standardSelfSubmit.pickupFee).toBe(0.0);
    expect(standardSelfSubmit.totalAmount).toBe(299.0);
  });
});

describe('Phase 13: Order Number Generation', () => {
  it('generates non-sequential cryptographically secure order IDs format ST-YYYY-XXXXXXXX', () => {
    const year = new Date().getFullYear();
    const idA = generateOrderNumber();
    const idB = generateOrderNumber();

    expect(idA).toMatch(new RegExp(`^ST-${year}-[A-Z0-9]{8}$`));
    expect(idB).toMatch(new RegExp(`^ST-${year}-[A-Z0-9]{8}$`));
    expect(idA).not.toBe(idB);
  });
});

describe('Phase 13: 7 Canonical Tracked Workflow Statuses', () => {
  it('has all 7 canonical sequential workflow stages', () => {
    const stages = CANONICAL_SOIL_STATUS_STEPS.map((s) => s.key);
    expect(stages).toEqual([
      'Requested',
      'Agent Assigned',
      'Pickup Scheduled',
      'Sample Collected',
      'Testing',
      'Report Ready',
      'Completed',
    ]);
  });

  it('correctly maps database order statuses to the 7 canonical statuses', () => {
    // 1. Requested
    expect(mapToCanonicalStatus('submitted').canonicalStatus).toBe('Requested');
    expect(mapToCanonicalStatus('payment_confirmed').canonicalStatus).toBe('Requested');

    // 2. Agent Assigned
    const withAgent = mapToCanonicalStatus('agent_pending', 'Ramesh Sharma');
    expect(withAgent.canonicalStatus).toBe('Agent Assigned');
    expect(withAgent.displayLabel).toBe('Agent Assigned');
    expect(withAgent.isAgentPending).toBe(false);

    // 3. Pickup Scheduled
    expect(mapToCanonicalStatus('pickup_scheduled').canonicalStatus).toBe('Pickup Scheduled');

    // 4. Sample Collected
    expect(mapToCanonicalStatus('sample_collected').canonicalStatus).toBe('Sample Collected');

    // 5. Testing
    expect(mapToCanonicalStatus('sample_received').canonicalStatus).toBe('Testing');
    expect(mapToCanonicalStatus('testing_in_progress').canonicalStatus).toBe('Testing');

    // 6. Report Ready
    expect(mapToCanonicalStatus('report_ready').canonicalStatus).toBe('Report Ready');

    // 7. Completed
    expect(mapToCanonicalStatus('report_delivered').canonicalStatus).toBe('Completed');
  });

  it('honestly displays "Pending Assignment" when no agent is available without fabricating fake data', () => {
    const unassigned = mapToCanonicalStatus('agent_pending', null);
    expect(unassigned.canonicalStatus).toBe('Agent Assigned');
    expect(unassigned.displayLabel).toBe('Pending Assignment');
    expect(unassigned.isAgentPending).toBe(true);
  });
});

describe('Phase 13: AI Soil Report Analysis & Zero-Hallucination Guardrails', () => {
  const verifiedOrder: SoilTestOrder = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    order_number: 'ST-2026-REAL1234',
    user_id: 'user-patel',
    farmer_name: 'Satyam Dubey',
    mobile: '9876543210',
    email: 'satyam@agriconnect.in',
    farm_name: 'Shree Ram Krishi Farm',
    address: 'Village Rampura, Khasra No. 12',
    state: 'Madhya Pradesh',
    district: 'Shivpuri',
    village: 'Rampura',
    pincode: '473551',
    latitude: 25.4244,
    longitude: 77.6586,
    farm_size: 4.0,
    farm_size_unit: 'acre',
    crop: 'Soybean',
    crop_stage: 'Flowering / Pod setting',
    test_type: 'micronutrient',
    sample_quantity: '500g composite sample',
    pickup_required: true,
    pickup_fee: 150,
    test_price: 499,
    total_amount: 649,
    payment_status: 'paid',
    payment_method: 'upi',
    payment_id: 'upi_ref_12345',
    order_status: 'report_ready',
    assigned_agent_id: 'ag-01',
    assigned_agent_name: 'Anil Kumar',
    assigned_agent_phone: '9826012345',
    preferred_pickup_date: '2026-09-14',
    confirmed_pickup_date: '2026-09-14',
    pickup_time_slot: '09:00 AM - 01:00 PM',
    sample_collected_at: '2026-09-14T10:30:00Z',
    sample_received_at: '2026-09-14T16:00:00Z',
    lab_started_at: '2026-09-15T09:00:00Z',
    report_generated_at: '2026-09-16T14:00:00Z',
    report_url: 'https://storage.agriconnect.in/reports/ST-2026-REAL1234.pdf',
    report_file_path: 'reports/ST-2026-REAL1234.pdf',
    lab_name: 'AgriConnect Certified Central Soil Laboratory',
    structured_results: {
      laboratoryName: 'AgriConnect Central Laboratory',
      sampleId: 'SMP-2026-8891',
      testedDate: '2026-09-16',
      summary: 'Slightly alkaline soil with severe Nitrogen and Zinc deficiency; Phosphorus is adequate.',
      parameters: {
        ph: { value: 7.8, unit: 'pH', status: 'optimal', benchmark: '6.5 - 8.0', interpretation: 'Normal alkaline range for black cotton soil' },
        ec: { value: 0.42, unit: 'dS/m', status: 'optimal', benchmark: '< 1.0 dS/m', interpretation: 'Non-saline' },
        nitrogen: { value: 185, unit: 'kg/ha', status: 'low', benchmark: '280 - 560 kg/ha', interpretation: 'Low available nitrogen' },
        phosphorus: { value: 22.5, unit: 'kg/ha', status: 'optimal', benchmark: '11 - 25 kg/ha', interpretation: 'Sufficient available P' },
        potassium: { value: 290, unit: 'kg/ha', status: 'optimal', benchmark: '140 - 320 kg/ha', interpretation: 'Sufficient potassium' },
        organicCarbon: { value: 0.45, unit: '% OC', status: 'low', benchmark: '0.50 - 0.75 %', interpretation: 'Low organic carbon' },
        zinc: { value: 0.38, unit: 'ppm', status: 'low', benchmark: '> 0.60 ppm', interpretation: 'Zinc deficient' },
        iron: { value: 6.2, unit: 'ppm', status: 'optimal', benchmark: '> 4.5 ppm' },
        sulphur: { value: 8.5, unit: 'ppm', status: 'low', benchmark: '> 10 ppm' },
      },
      recommendations: {
        cropsRecommended: ['Soybean', 'Wheat', 'Mustard', 'Gram (Chana)'],
        fertilizerPlan: [
          { item: 'Zinc Sulphate (21%)', dosePerAcre: '10 kg/acre basal', timing: 'During field preparation or top dressing' },
          { item: 'Urea (46% N)', dosePerAcre: '30 kg/acre split', timing: 'Split into 2 doses at 25 and 45 days' },
          { item: 'Farm Yard Manure (FYM)', dosePerAcre: '2 to 3 tonnes/acre', timing: 'Before pre-sowing ploughing' },
        ],
        soilAmendments: ['Apply well-decomposed organic manure or vermicompost to improve Organic Carbon above 0.5%'],
      },
    },
    internal_notes: null,
    additional_notes: null,
    created_at: '2026-09-13T09:00:00Z',
    updated_at: '2026-09-16T14:00:00Z',
  };

  it('accurately diagnoses nutrient status without hallucinating unmeasured metrics', () => {
    const analysis = analyzeSoilReportWithAi(verifiedOrder);
    expect(analysis.hasStructuredData).toBe(true);
    expect(analysis.keyFindings.some((f) => f.includes('Nitrogen is Low'))).toBe(true);
    expect(analysis.keyFindings.some((f) => f.includes('Organic Carbon is Low'))).toBe(true);
    expect(analysis.keyFindings.some((f) => f.includes('pH is Optimal'))).toBe(true);
    expect(analysis.urgentAlerts.some((a) => a.includes('Zinc deficiency'))).toBe(true);
  });

  it('provides actionable answers to specific farmer inquiries based on lab report', () => {
    const nitrogenQ = askKisanAiAboutReport(verifiedOrder, 'How is the nitrogen and urea requirement?');
    expect(nitrogenQ).toContain('Nitrogen is low');
    expect(nitrogenQ).toContain('185');

    const phQ = askKisanAiAboutReport(verifiedOrder, 'What is the pH level?');
    expect(phQ).toContain('7.8');
    expect(phQ).toContain('OPTIMAL');

    const zincQ = askKisanAiAboutReport(verifiedOrder, 'Is there any micronutrient deficiency?');
    expect(zincQ).toContain('Zinc');
  });

  it('builds compliant email notification with real order information', () => {
    const email = buildSoilEmailContent(verifiedOrder, 'report_ready');
    expect(email.subject).toContain(verifiedOrder.order_number);
    expect(email.html).toContain('Satyam Dubey');
    expect(email.html).toContain(verifiedOrder.order_number);
    expect(email.html.toUpperCase()).toContain('REPORT READY');
  });
});
