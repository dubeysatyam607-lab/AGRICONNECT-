import { describe, it, expect } from "vitest";
import { IOT_MOCK_MODE_ENABLED, IOT_MOCK_MODE_LABEL } from "./iot-mock-mode";

describe("iot mock-mode gate", () => {
  it("is DISABLED unless VITE_IOT_MOCK_MODE is exactly 'true'", () => {
    expect(IOT_MOCK_MODE_ENABLED).toBe(false);
  });

  it("labels demo surfaces clearly", () => {
    expect(IOT_MOCK_MODE_LABEL).toBe("Demo Data");
  });
});