import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import React from "react";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { RoleProvider } from "@/contexts/RoleContext";
import { AuthProvider } from "@/hooks/useAuth";
import { LocationProvider } from "@/features/location/LocationContext";
import { initializeDIContainer } from "@/core/di/init";

beforeEach(() => {
  initializeDIContainer();
  localStorage.clear();
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
  vi.stubGlobal("navigator", { ...navigator, geolocation: undefined });
});

import { MemoryRouter } from "react-router-dom";

const Providers = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter>
    <AuthProvider>
      <LanguageProvider>
        <RoleProvider>
          <LocationProvider>{children}</LocationProvider>
        </RoleProvider>
      </LanguageProvider>
    </AuthProvider>
  </MemoryRouter>
);

const tabs: Array<{ name: string; path: string; props?: Record<string, any> }> = [
  { name: "FarmerHome", path: "@/components/agri/FarmerHome", props: { onNavigate: () => {}, onBookTractor: () => {} } },
  { name: "TractorList", path: "@/components/agri/TractorMarket" },
  { name: "MandiPrices", path: "@/components/agri/LiveMandi", props: { onToast: () => {}, onNavigateToAuth: () => {} } },
  { name: "AgriStore", path: "@/components/agri/AgriStore", props: { onToast: () => {} } },
  { name: "Schemes", path: "@/components/agri/Schemes", props: { onToast: () => {} } },
  { name: "LoanCalculator", path: "@/components/agri/LoanCalculator" },
  { name: "LaborHire", path: "@/components/agri/LaborHire", props: { onToast: () => {} } },
  { name: "CattleMarket", path: "@/components/agri/CattleMarket" },
  { name: "Transport", path: "@/components/agri/Transport", props: { onToast: () => {} } },
  { name: "AgriNews", path: "@/components/agri/AgriNews" },
  { name: "SoilTest", path: "@/components/agri/SoilTest", props: { onToast: () => {} } },
  { name: "ColdStorage", path: "@/components/agri/ColdStorage" },
  { name: "FarmLedger", path: "@/components/agri/FarmLedger", props: { onToast: () => {} } },
  { name: "CropProfitCalculator", path: "@/components/agri/CropProfitCalculator" },
  { name: "ServicesHub", path: "@/components/agri/ServicesHub", props: { onNavigate: () => {} } },
];

describe("dashboard lazy chunks", () => {
  for (const tab of tabs) {
    it(`${tab.name} renders without crashing`, async () => {
      const mod = await import(tab.path);
      const Component = mod.default;
      render(
        React.createElement(
          Providers as any,
          null,
          React.createElement(Component, (tab.props || {}) as any),
        ),
      );
      expect(true).toBe(true);
    }, 30000);
  }
});
