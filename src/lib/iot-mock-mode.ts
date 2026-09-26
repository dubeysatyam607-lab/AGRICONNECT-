/**
 * IoT Mock / Demo Mode gate.
 *
 * Demo telemetry is only ever reachable when VITE_IOT_MOCK_MODE === "true".
 * In every other build (including production) demo controls, sample values and
 * "Post Test Payload" surfaces are hidden and the flag reads false.
 */

const RAW_FLAG =
  typeof import.meta !== "undefined" && import.meta.env
    ? String(import.meta.env.VITE_IOT_MOCK_MODE || "").trim()
    : "";

export const IOT_MOCK_MODE_ENABLED = RAW_FLAG === "true"; // strict on purpose

export const IOT_MOCK_MODE_LABEL = "Demo Data";
export const IOT_MOCK_MODE_HINT = "This panel is hidden in production. It only posts manually entered values to verify the live pipeline while developing.";