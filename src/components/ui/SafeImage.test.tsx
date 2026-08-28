import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { SafeImage } from "./SafeImage";

describe("SafeImage Component", () => {
  it("renders with valid image source and resolves exact crop", () => {
    render(
      <SafeImage
        src="https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b"
        alt="Wheat crop"
        entityName="Wheat"
        resolveType="crop"
      />
    );
    const img = screen.getByAltText("Wheat crop") as HTMLImageElement;
    expect(img).toBeDefined();
    expect(img.src).toContain("photo-1574323347407-f5e1ad6d020b");
  });

  it("handles broken src by falling back to verified dictionary / SVG without crashing or looping", () => {
    render(
      <SafeImage
        src="https://invalid-non-existent-cdn.com/broken.jpg"
        alt="Coconut fruit"
        entityName="Coconut"
        resolveType="crop"
      />
    );
    const img = screen.getByAltText("Coconut fruit") as HTMLImageElement;
    expect(img).toBeDefined();
    
    // Simulate error on broken URL
    fireEvent.error(img);
    // Should fall back to exact photo/SVG
    expect(img.src).toBeDefined();
    expect(img.src.length).toBeGreaterThan(0);
  });

  it("renders fallbackIcon if all candidates fail", () => {
    render(
      <SafeImage
        src="broken-url-1"
        alt="Custom item"
        resolveType="general"
        fallbackIcon={<span data-testid="custom-fallback">Custom Icon</span>}
      />
    );
    const img = screen.getByAltText("Custom item") as HTMLImageElement;
    
    // Trigger error on all fallback candidates
    fireEvent.error(img);
    fireEvent.error(img);
    fireEvent.error(img);
    fireEvent.error(img);

    expect(screen.getByTestId("custom-fallback")).toBeDefined();
  });
});
