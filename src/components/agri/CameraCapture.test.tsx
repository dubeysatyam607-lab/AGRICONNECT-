import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { CameraCapture } from "@/components/agri/CameraCapture";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: null }),
  useOptionalAuth: () => ({ user: null }),
}));

const playStub = vi.fn(() => Promise.resolve());

function stubMediaDevices(getUserMedia: () => Promise<MediaStream>) {
  Object.defineProperty(window.navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia: vi.fn(getUserMedia) },
  });
  Object.defineProperty(HTMLMediaElement.prototype, "play", {
    configurable: true,
    value: playStub,
  });
}

function renderCamera() {
  return render(
    <LanguageProvider>
      <CameraCapture open onClose={vi.fn()} onCapture={vi.fn()} />
    </LanguageProvider>
  );
}

describe("CameraCapture — Phase 6 honest camera errors", () => {
  beforeEach(() => {
    playStub.mockClear();
  });

  it("shows a clear permission-denied message instead of silently failing", async () => {
    stubMediaDevices(() =>
      Promise.reject(Object.assign(new Error("permission"), { name: "NotAllowedError" })),
    );
    renderCamera();
    expect(await screen.findByText(/Camera permission denied/)).toBeTruthy();
    expect(screen.getByText(/or upload a photo instead/)).toBeTruthy();
  });

  it("shows an availability message when no camera exists on device", async () => {
    stubMediaDevices(() =>
      Promise.reject(Object.assign(new Error("no device"), { name: "NotFoundError" })),
    );
    renderCamera();
    expect(await screen.findByText(/Camera is not available on this device/)).toBeTruthy();
  });

  it("starts the stream successfully and enables the Capture button", async () => {
    stubMediaDevices(() =>
      Promise.resolve({
        getTracks: () => [{ stop: vi.fn() }] as unknown as MediaStreamTrack[],
        getVideoTracks: () => [] as MediaStreamTrack[],
      } as unknown as MediaStream),
    );
    renderCamera();
    const capture = await screen.findByRole("button", { name: /Capture/ });
    expect((capture as HTMLButtonElement).disabled).toBe(false);
    expect(playStub).toHaveBeenCalled();
  });
});