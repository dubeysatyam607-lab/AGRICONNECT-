import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, act } from "@testing-library/react";
import React from "react";
import FarmerHome from "@/components/agri/FarmerHome";
import { initializeDIContainer } from "@/core/di/init";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { RoleProvider } from "@/contexts/RoleContext";

beforeEach(() => {
  initializeDIContainer();
  localStorage.clear();
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false, media: query, onchange: null, addListener: vi.fn(), removeListener: vi.fn(),
      addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
    })),
  });
  vi.stubGlobal("navigator", { ...navigator, geolocation: undefined });
});

describe("FarmerHome location dependency", () => {
  it("throws when LocationProvider is missing (regression repro)", async () => {
    let threw = false;
    try {
      await act(async () => {
        render(
          <LanguageProvider>
            <RoleProvider>
              <FarmerHome onNavigate={() => {}} onBookTractor={() => {}} />
            </RoleProvider>
          </LanguageProvider>,
        );
      });
    } catch (e: any) {
      threw = true;
      console.log("THREW:", e.message);
    }
    expect(threw).toBe(true);
  });
});
