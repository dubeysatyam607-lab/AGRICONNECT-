import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, act, screen } from "@testing-library/react";
import App from "@/App";
import { initializeDIContainer } from "@/core/di/init";

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
  vi.stubGlobal("ResizeObserver", class {
    observe() {}
    unobserve() {}
    disconnect() {}
  });
  vi.stubGlobal("navigator", { ...navigator, geolocation: undefined });
});

describe("real App provider tree", () => {
  it("Dashboard renders without crashing (LocationProvider mounted)", async () => {
    await act(async () => {
      render(<App />);
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 200));
    });
    const body = document.body.innerHTML.slice(0, 300);
    console.log("RENDERED:", body.replace(/\n/g, " "));
    const boundary = screen.queryByText(/This section couldn't load/i);
    expect(boundary).toBeNull();
  });
});
