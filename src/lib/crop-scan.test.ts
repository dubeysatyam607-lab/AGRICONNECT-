// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  classifyEdgeError,
  dataUrlToBlob,
  SCAN_ERROR_KEYS,
  ALLOWED_IMAGE_TYPES,
  MAX_RAW_IMAGE_MB,
  MAX_PAYLOAD_IMAGE_MB,
} from "./crop-scan";

describe("Phase 6 — crop-scan helpers", () => {
  it("classifies every mandatory failure mode to a stable code", () => {
    expect(classifyEdgeError(null, true)).toBe("timeout");
    expect(classifyEdgeError("The request took too long", true)).toBe("timeout");
    expect(classifyEdgeError("Network Error", false, false)).toBe("network");
    expect(classifyEdgeError("This feature is not yet deployed", false)).toBe("deploy");
    expect(classifyEdgeError("AI is not configured", false)).toBe("config");
    expect(classifyEdgeError("Session expired", false)).toBe("session");
    expect(classifyEdgeError("AI credits exhausted", false)).toBe("quota");
    expect(classifyEdgeError("Too many requests", false)).toBe("rate_limit");
    expect(classifyEdgeError("Unsupported image format", false)).toBe("validation");
    expect(classifyEdgeError("Image data is corrupted", false)).toBe("validation");
    expect(classifyEdgeError("The image appears to be empty or too small to analyze", false)).toBe("validation");
    expect(classifyEdgeError("Network Error", false, true)).toBe("api");
    expect(classifyEdgeError("", false)).toBe("unknown");
  });

  it("maps every stable code to a localized key", () => {
    for (const code of ["timeout", "network", "deploy", "config", "session", "quota", "rate_limit", "validation", "api", "unknown"]) {
      expect(typeof SCAN_ERROR_KEYS[code as keyof typeof SCAN_ERROR_KEYS]).toBe("string");
      expect(SCAN_ERROR_KEYS[code as keyof typeof SCAN_ERROR_KEYS].length).toBeGreaterThan(0);
    }
  });

  it("validates the allowed image contract", () => {
    expect(ALLOWED_IMAGE_TYPES).toEqual(["image/jpeg", "image/png", "image/webp"]);
    expect(MAX_RAW_IMAGE_MB).toBeGreaterThan(MAX_PAYLOAD_IMAGE_MB);
  });

  it("converts data URLs back to blobs", () => {
    const blob = dataUrlToBlob("data:image/jpeg;base64," + btoa("hello"));
    expect(blob.type).toBe("image/jpeg");
    expect(blob.size).toBe(5);
  });

  it("guard-rails: CropDoctor no longer contains the fabricated local diagnosis engine", () => {
    const src = readFileSync(join(process.cwd(), "src/components/agri/CropDoctor.tsx"), "utf8");
    expect(src).not.toContain("getLocalCropScanDiagnosis");
    expect(src).not.toContain("ToLCV");
    expect(src).not.toContain("Puccinia");
    expect(src).not.toContain("Imidacloprid 17.8%");
    expect(src).not.toContain("Propiconazole 25% EC");
    expect(src).toContain("doctor.notDiagnosis");
  });

  it("client edge errors are never treated as a diagnosis (no fallback path)", () => {
    const src = readFileSync(join(process.cwd(), "src/components/agri/CropDoctor.tsx"), "utf8");
    // Every error path must surface an honest message — never synthesize a result.
    expect(src).not.toContain("diagnosticResult = getLocalCropScanDiagnosis");
  });
});