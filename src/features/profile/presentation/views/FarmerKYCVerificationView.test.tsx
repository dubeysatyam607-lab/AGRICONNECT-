import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FarmerKYCVerificationView } from './FarmerKYCVerificationView';

const mockProfile = {
  id: 'farmer-101',
  personal: {
    fullName: 'Ramesh Patel',
    mobileNumber: '+91 9876543210',
    isAadhaarVerified: false,
    aadhaarNumber: '',
  },
  location: {
    villageOrTehsil: 'Baramati',
    district: 'Pune',
    state: 'Maharashtra',
  },
  farmSpecs: {
    totalArea: 4.5,
    landUnit: 'Acres',
  },
};

const mockSaveProfile = vi.fn().mockResolvedValue(true);

vi.mock('../viewmodels/useProfileViewModel', () => ({
  useProfileViewModel: () => [
    { profile: mockProfile, isLoading: false },
    { saveProfile: (...args: unknown[]) => mockSaveProfile(...args) },
  ],
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    t: (key: string) => key,
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe('FarmerKYCVerificationView — Interactive Verification Workflow', () => {
  beforeEach(() => {
    mockSaveProfile.mockReset().mockResolvedValue(true);
  });

  afterEach(() => {
    cleanup();
  });

  it('renders dual tabs for Aadhaar and KCC verification', () => {
    render(<FarmerKYCVerificationView onBack={vi.fn()} />);

    expect(screen.getByText(/Aadhaar Card Verification/i)).toBeTruthy();
    expect(screen.getByText(/Kisan Credit Card \(KCC\)/i)).toBeTruthy();
    expect(screen.getByText(/UIDAI Aadhaar Verification/i)).toBeTruthy();
  });

  it('triggers simulated Aadhaar OTP and confirms verification upon entering 6-digit code', async () => {
    render(<FarmerKYCVerificationView onBack={vi.fn()} />);

    // Enter valid 12-digit Aadhaar
    const aadhaarInput = screen.getByPlaceholderText(/5432 1098 7654/i);
    fireEvent.change(aadhaarInput, { target: { value: '2345 6789 0124' } });

    const sendOtpBtn = screen.getByRole('button', { name: /Send Verification OTP/i });
    fireEvent.click(sendOtpBtn);

    // Advanced to OTP step
    await waitFor(() => {
      expect(screen.getByText(/Enter 6-Digit OTP/i)).toBeTruthy();
    });

    const otpInput = screen.getByPlaceholderText(/123456/i);
    fireEvent.change(otpInput, { target: { value: '123456' } });

    const verifyBtn = screen.getByRole('button', { name: /Confirm & Verify/i });
    fireEvent.click(verifyBtn);

    await waitFor(() => {
      expect(mockSaveProfile).toHaveBeenCalled();
    });
  });

  it('switches to KCC tab and completes Kisan Credit Card linkage verification', async () => {
    render(<FarmerKYCVerificationView onBack={vi.fn()} />);

    const kccTab = screen.getByRole('button', { name: /Kisan Credit Card \(KCC\)/i });
    fireEvent.click(kccTab);

    expect(screen.getByText(/Kisan Credit Card \(KCC\) Linkage/i)).toBeTruthy();

    const kccInput = screen.getByPlaceholderText(/4532 9876 1234 5678/i);
    fireEvent.change(kccInput, { target: { value: '4532 9876 1234 5678' } });

    const verifyKccBtn = screen.getByRole('button', { name: /Verify & Link KCC Card/i });
    fireEvent.click(verifyKccBtn);

    await waitFor(() => {
      expect(screen.getByText(/Kisan Credit Card Verified & Active/i)).toBeTruthy();
      expect(screen.getByText(/Sanctioned Credit Limit/i)).toBeTruthy();
    }, { timeout: 1500 });
  });
});
