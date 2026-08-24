import { describe, it, expect } from 'vitest';
import {
  SOIL_TEST_PACKAGES,
  SOIL_PICKUP_FEE,
  calculateSoilOrderTotal,
  getPackageDetails,
} from './soilTestingPricing';
import { generateOrderNumber } from './soilTestingService';
import { analyzeSoilReportWithAi, askKisanAiAboutReport } from './soilAiAdvisor';
import { buildSoilEmailContent } from './soilEmailNotifications';
import { SoilTestOrder, StructuredSoilReport } from './soilTestingTypes';

describe('Soil Testing Pricing & Packages', () => {
  it('has valid test packages with ICAR parameters and processing times', () => {
    expect(SOIL_TEST_PACKAGES.length).toBe(3);
    const standard = getPackageDetails('standard');
    expect(standard.price).toBe(299.0);
    expect(standard.processingTimeDays).toBe(3);
    expect(standard.parametersTested).toContain('Soil pH & Acidity Level');

    const micro = getPackageDetails('micronutrient');
    expect(micro.price).toBe(499.0);
    expect(micro.parametersTested).toContain('Zinc (Zn)');

    const water = getPackageDetails('water');
    expect(water.price).toBe(199.0);
  });

  it('calculates order total with doorstep pickup fee correctly', () => {
    const withPickup = calculateSoilOrderTotal('standard', true);
    expect(withPickup.testPrice).toBe(299.0);
    expect(withPickup.pickupFee).toBe(SOIL_PICKUP_FEE);
    expect(withPickup.totalAmount).toBe(299.0 + SOIL_PICKUP_FEE);

    const selfSubmit = calculateSoilOrderTotal('standard', false);
    expect(selfSubmit.pickupFee).toBe(0);
    expect(selfSubmit.totalAmount).toBe(299.0);
  });
});

describe('Soil Test Order Number Generation', () => {
  it('generates unique non-sequential IDs matching format ST-YYYY-XXXXXXXX', () => {
    const year = new Date().getFullYear();
    const id1 = generateOrderNumber();
    const id2 = generateOrderNumber();

    expect(id1).toMatch(new RegExp(`^ST-${year}-[A-Z0-9]{8}$`));
    expect(id2).toMatch(new RegExp(`^ST-${year}-[A-Z0-9]{8}$`));
    expect(id1).not.toBe(id2);
  });
});

describe('Kisan AI Soil Report Advisor', () => {
  const sampleOrder: SoilTestOrder = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    order_number: 'ST-2026-TEST1234',
    user_id: 'user-123',
    farmer_name: 'Rajesh Patel',
    mobile: '9876543210',
    email: 'rajesh@example.com',
    farm_name: 'Plot 4 River Field',
    address: 'Village Rampura',
    state: 'Madhya Pradesh',
    district: 'Indore',
    village: 'Rampura',
    pincode: '452001',
    latitude: 22.7196,
    longitude: 75.8577,
    farm_size: 3.5,
    farm_size_unit: 'acre',
    crop: 'Wheat / Gehun',
    crop_stage: 'Pre-sowing',
    test_type: 'standard',
    sample_quantity: '500g composite sample',
    pickup_required: true,
    pickup_fee: 150,
    test_price: 299,
    total_amount: 449,
    payment_status: 'paid',
    payment_method: 'upi',
    payment_id: 'pay_123',
    order_status: 'report_ready',
    assigned_agent_id: 'agent-1',
    assigned_agent_name: 'Anil Sharma',
    assigned_agent_phone: '9876500000',
    preferred_pickup_date: '2026-08-25',
    confirmed_pickup_date: '2026-08-25',
    pickup_time_slot: '09:00 AM - 01:00 PM',
    sample_collected_at: '2026-08-25T10:00:00Z',
    sample_received_at: '2026-08-25T14:00:00Z',
    lab_started_at: '2026-08-25T15:00:00Z',
    report_generated_at: '2026-08-27T12:00:00Z',
    report_url: 'https://example.com/report.pdf',
    report_file_path: 'reports/sample.pdf',
    lab_name: 'AgriConnect Certified Central Laboratory',
    structured_results: {
      laboratoryName: 'AgriConnect Central Laboratory',
      parameters: {
        ph: { value: 7.2, unit: 'pH', status: 'optimal', benchmark: '6.5 - 7.5' },
        nitrogen: { value: 210, unit: 'kg/ha', status: 'low', benchmark: '280 - 560 kg/ha' },
        phosphorus: { value: 18, unit: 'kg/ha', status: 'optimal', benchmark: '11 - 25 kg/ha' },
        potassium: { value: 120, unit: 'kg/ha', status: 'low', benchmark: '140 - 280 kg/ha' },
        organicCarbon: { value: 0.65, unit: '% OC', status: 'optimal', benchmark: '0.50 - 0.75 %' },
        zinc: { value: 0.45, unit: 'ppm', status: 'low', benchmark: '> 0.6 ppm' },
      },
      recommendations: {
        cropsRecommended: ['Wheat', 'Mustard', 'Chana'],
      },
    },
    internal_notes: null,
    additional_notes: null,
    created_at: '2026-08-24T10:00:00Z',
    updated_at: '2026-08-27T12:00:00Z',
  };

  it('analyzes structured metrics without fabricating missing parameters', () => {
    const analysis = analyzeSoilReportWithAi(sampleOrder);
    expect(analysis.hasStructuredData).toBe(true);
    expect(analysis.keyFindings.some((f) => f.includes('Nitrogen is Low'))).toBe(true);
    expect(analysis.keyFindings.some((f) => f.includes('pH is Optimal'))).toBe(true);
    expect(analysis.urgentAlerts.some((a) => a.includes('Zinc deficiency'))).toBe(true);
  });

  it('answers specific farmer questions strictly based on actual lab parameters', () => {
    const phAnswer = askKisanAiAboutReport(sampleOrder, 'What is my soil pH?');
    expect(phAnswer).toContain('7.2');
    expect(phAnswer).toContain('OPTIMAL');

    const fertilizerAnswer = askKisanAiAboutReport(sampleOrder, 'How much urea or fertilizer to apply?');
    expect(fertilizerAnswer).toContain('Nitrogen is low');
    expect(fertilizerAnswer).toContain('Urea');

    const microAnswer = askKisanAiAboutReport(sampleOrder, 'Is there any zinc problem?');
    expect(microAnswer).toContain('Zinc');
  });

  it('gracefully handles missing structured data without inventing numbers', () => {
    const unparsedOrder: SoilTestOrder = {
      ...sampleOrder,
      structured_results: null,
    };

    const analysis = analyzeSoilReportWithAi(unparsedOrder);
    expect(analysis.hasStructuredData).toBe(false);
    expect(analysis.statusOverview).toContain('download the certified laboratory PDF');

    const chatAnswer = askKisanAiAboutReport(unparsedOrder, 'What is the exact nitrogen level?');
    expect(chatAnswer).toContain('ST-2026-TEST1234');
    expect(chatAnswer).toContain('download the PDF');
  });
});

describe('Soil Test Email Generator', () => {
  const sampleOrder: SoilTestOrder = {
    id: '123',
    order_number: 'ST-2026-SAMPLE99',
    user_id: 'user-1',
    farmer_name: 'Kailash Choudhary',
    mobile: '9876543210',
    email: 'kailash@example.com',
    farm_name: 'Green Acre',
    address: 'Plot 10',
    state: 'Rajasthan',
    district: 'Jaipur',
    village: 'Amer',
    pincode: '302001',
    latitude: null,
    longitude: null,
    farm_size: 5,
    farm_size_unit: 'acre',
    crop: 'Mustard',
    crop_stage: null,
    test_type: 'standard',
    sample_quantity: null,
    pickup_required: true,
    pickup_fee: 150,
    test_price: 299,
    total_amount: 449,
    payment_status: 'paid',
    payment_method: 'upi',
    payment_id: 'pay_1',
    order_status: 'pickup_scheduled',
    assigned_agent_id: 'agent-1',
    assigned_agent_name: 'Sunil Kumar',
    assigned_agent_phone: '9988776655',
    preferred_pickup_date: '2026-08-26',
    confirmed_pickup_date: '2026-08-26',
    pickup_time_slot: '09:00 AM - 01:00 PM',
    sample_collected_at: null,
    sample_received_at: null,
    lab_started_at: null,
    report_generated_at: null,
    report_url: null,
    report_file_path: null,
    lab_name: null,
    structured_results: null,
    internal_notes: null,
    additional_notes: null,
    created_at: '2026-08-24T10:00:00Z',
    updated_at: '2026-08-24T10:00:00Z',
  };

  it('builds clean transactional email with order details and technician info', () => {
    const email = buildSoilEmailContent(sampleOrder, 'pickup_scheduled');
    expect(email.subject).toContain('Soil Sample Pickup Scheduled — ST-2026-SAMPLE99');
    expect(email.html).toContain('Kailash Choudhary');
    expect(email.html).toContain('Sunil Kumar');
    expect(email.html).toContain('ST-2026-SAMPLE99');
  });
});
