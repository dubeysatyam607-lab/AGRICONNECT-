// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LiveMandi from "./LiveMandi";
import { LanguageProvider } from "@/contexts/LanguageContext";

vi.mock("@/lib/invoke-edge", () => ({
  invokeEdgeWithTimeout: vi.fn(),
}));

import { invokeEdgeWithTimeout } from "@/lib/invoke-edge";

const mockedInvoke = vi.mocked(invokeEdgeWithTimeout);

const mockRawEdgePrices = [
  {
    commodity: "Wheat",
    variety: "Sharbati",
    market: "Jaipur Mandi",
    district: "Jaipur",
    state: "Rajasthan",
    modal_price: "2450",
    min_price: "2350",
    max_price: "2550",
    arrival_date: "2026-08-28",
  },
  {
    commodity: "Wheat",
    variety: "Lokwan",
    market: "Kota Mandi",
    district: "Kota",
    state: "Rajasthan",
    modal_price: "2520",
    min_price: "2400",
    max_price: "2600",
    arrival_date: "2026-08-28",
  },
  {
    commodity: "Mustard",
    variety: "Mustard Bold",
    market: "Alwar Mandi",
    district: "Alwar",
    state: "Rajasthan",
    modal_price: "5650",
    min_price: "5400",
    max_price: "5800",
    arrival_date: "2026-08-28",
  },
];

describe("AgriConnect Phase 4 — Market Intelligence & Live Mandi Component", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    mockedInvoke.mockResolvedValue({
      data: { prices: mockRawEdgePrices },
      error: null,
    } as any);
  });

  const renderComponent = () =>
    render(
      <LanguageProvider>
        <LiveMandi />
      </LanguageProvider>
    );

  it("renders official AGMARKNET source attribution and price discovery header", async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getAllByText(/AGMARKNET/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Market Intelligence/i).length).toBeGreaterThan(0);
    });
  });

  it("displays available crops with verified modal rates, min-max range, and MSP comparison", async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getAllByText(/Jaipur Mandi/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Kota Mandi/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Alwar Mandi/i).length).toBeGreaterThan(0);
    });

    // Check MSP comparison badge (+₹175 Above MSP for Wheat: 2450 - 2275 = 175)
    expect(screen.getAllByText(/\+₹175 Above MSP/i).length).toBeGreaterThan(0);
  });

  it("filters crops in real-time when user searches", async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getAllByText(/Alwar Mandi/i).length).toBeGreaterThan(0);
    });

    const searchInput = screen.getByPlaceholderText(/Search crop, mandi/i);
    fireEvent.change(searchInput, { target: { value: "Mustard" } });

    await waitFor(() => {
      expect(screen.getAllByText(/Alwar Mandi/i).length).toBeGreaterThan(0);
      // Jaipur Mandi card should not be visible in price cards
      expect(screen.queryByText(/Jaipur Mandi, Jaipur/i)).toBeNull();
    });
  });

  it("filters crops by category chips (e.g. Oilseeds)", async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getAllByText(/Jaipur Mandi/i).length).toBeGreaterThan(0);
    });

    const oilseedsBtn = screen.getByRole("button", { name: "Oilseeds" });
    fireEvent.click(oilseedsBtn);

    await waitFor(() => {
      expect(screen.getAllByText(/Alwar Mandi/i).length).toBeGreaterThan(0);
      expect(screen.queryByText(/Jaipur Mandi, Jaipur/i)).toBeNull();
    });
  });

  it("renders Market Comparison tab with highest paying mandi and extra profit calculation", async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getAllByText(/Jaipur Mandi/i).length).toBeGreaterThan(0);
    });

    const compareTab = screen.getByRole("button", { name: /Market Comparison/i });
    fireEvent.click(compareTab);

    await waitFor(() => {
      expect(screen.getAllByText(/Compare Crop Prices Across Mandis/i).length).toBeGreaterThan(0);
    });

    // Select Wheat (which has Jaipur & Kota mandis)
    const cropSelect = screen.getByLabelText(/Select crop to compare/i);
    fireEvent.change(cropSelect, { target: { value: "Wheat" } });

    await waitFor(() => {
      expect(screen.getAllByText(/Smart Farmer Selling Decision/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Kota Mandi/i).length).toBeGreaterThan(0);
    });
  });

  it("renders honest empty state when no crops match filters", async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getAllByText(/Jaipur Mandi/i).length).toBeGreaterThan(0);
    });

    const searchInput = screen.getByPlaceholderText(/Search crop, mandi/i);
    fireEvent.change(searchInput, { target: { value: "NonExistentCrop123" } });

    await waitFor(() => {
      expect(screen.getByText(/No Government mandi records found for this selection/i)).toBeTruthy();
      expect(screen.getByRole("button", { name: /Clear All Filters/i })).toBeTruthy();
    });
  });
});
