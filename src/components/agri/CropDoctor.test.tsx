import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LanguageProvider } from "@/contexts/LanguageContext";
import CropDoctor from "@/components/agri/CropDoctor";
import { compressImageFile, uploadScanImage } from "@/lib/crop-scan";
import { invokeEdgeWithTimeout } from "@/lib/invoke-edge";

vi.mock("@/hooks/useToast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
  useOptionalAuth: () => ({ user: null }),
}));

vi.mock("@/core/voice", () => ({
  speakText: vi.fn(() => ({ stop: vi.fn() })),
  stopSpeaking: vi.fn(),
  textForSpeech: vi.fn((t: string) => t),
  detectLanguageOf: vi.fn(() => ({ lang: "en" })),
}));

vi.mock("@/lib/ai-persistence", () => ({
  fetchScanHistory: vi.fn(() => Promise.resolve([])),
  deleteScan: vi.fn(() => Promise.resolve(true)),
}));

vi.mock("@/lib/invoke-edge", () => ({
  invokeEdgeWithTimeout: vi.fn(),
}));

vi.mock("@/lib/crop-scan", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    compressImageFile: vi.fn().mockResolvedValue({
      dataUrl: "data:image/jpeg;base64,eA==",
      blob: new Blob(["x"], { type: "image/jpeg" }),
    }),
    uploadScanImage: vi.fn().mockResolvedValue({ ok: true, storagePath: "user-1/leaf.jpg" }),
  };
});

const mockCompress = vi.mocked(compressImageFile);
const mockUpload = vi.mocked(uploadScanImage);
const mockInvoke = vi.mocked(invokeEdgeWithTimeout);

function renderDoctor() {
  return render(
    <LanguageProvider>
      <CropDoctor />
    </LanguageProvider>
  );
}

async function uploadImage() {
  const file = new File([new Uint8Array([1, 2, 3])], "leaf.jpg", { type: "image/jpeg" });
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(input, { target: { files: [file] } });
  await waitFor(() =>
    (screen.getByRole("button", { name: /Scan & Diagnose|Diagnose|Analyze Crop/i }) as HTMLButtonElement).disabled === false
  );
}

function disableAutoSpeak() {
  fireEvent.click(screen.getByTitle("Auto voice enabled"));
}

describe("CropDoctor — Phase 6 honest AI error handling", () => {
  beforeEach(() => {
    mockCompress.mockClear();
    mockUpload.mockClear();
    mockInvoke.mockClear();
  });

  it("never fabricates a diagnosis when the AI call fails — shows honest error instead", async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: "Something went wrong with the analysis. Please retry.",
      code: "api",
      timedOut: false,
    });

    renderDoctor();
    await uploadImage();
    fireEvent.click(screen.getByRole("button", { name: /Scan & Diagnose|Diagnose|Analyze Crop/i }));

    expect(await screen.findByText(/Something went wrong with the analysis/)).toBeTruthy();
    expect(screen.queryByText(/Crop Scan Result/)).toBeNull();
    expect(mockCompress).toHaveBeenCalled();
    expect(mockUpload).toHaveBeenCalled();
  });

  it("surfaces a clear message for offline/network failures", async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: "Network Error",
      code: "network",
      timedOut: false,
    });

    renderDoctor();
    await uploadImage();
    fireEvent.click(screen.getByRole("button", { name: /Scan & Diagnose|Diagnose|Analyze Crop/i }));

    expect(await screen.findByText(/Unable to connect|You appear to be offline/i)).toBeTruthy();
  });

  it("shows the server validation message verbatim for invalid images", async () => {
    const msg = "Unsupported image format. Please upload a JPG, PNG or WEBP image.";
    mockInvoke.mockResolvedValue({
      data: null,
      error: msg,
      code: "validation",
      timedOut: false,
    });

    renderDoctor();
    await uploadImage();
    fireEvent.click(screen.getByRole("button", { name: /Scan & Diagnose|Diagnose|Analyze Crop/i }));

    expect(await screen.findByText(msg)).toBeTruthy();
  });

  it("renders a result with the mandatory honesty banner — never a definitive claim", async () => {
    mockInvoke.mockResolvedValue({
      data: {
        result: {
          crop: "Tomato",
          plant_part: "Leaf",
          health_status: "possible disease",
          possible_issue: "Possible early fungal spot — not confirmed.",
          confidence: 75,
          symptoms: ["Brown spots on leaves"],
          recommendations: ["Improve airflow", "Consult your local KVK before any spray"],
          next_steps_for_farmer: ["Monitor over the next 3 days"],
          urgency: "medium",
          expert_confirm: "Please confirm with an agriculture officer before applying any product.",
        },
      },
      error: null,
      code: null,
      timedOut: false,
    });

    renderDoctor();
    await uploadImage();
    disableAutoSpeak();
    fireEvent.click(screen.getByRole("button", { name: /Scan & Diagnose|Diagnose|Analyze Crop/i }));

    expect(await screen.findByText(/AI assessment — not a definitive diagnosis\./)).toBeTruthy();
    expect(screen.getByText(/Possible early fungal spot/)).toBeTruthy();
    expect(screen.getByText(/75%/)).toBeTruthy();
    expect(screen.getByText("Tomato")).toBeTruthy();
  });

  it("warns when AI confidence is low instead of overclaiming", async () => {
    mockInvoke.mockResolvedValue({
      data: {
        result: {
          crop: null,
          confidence: null,
          needs_clearer_image: false,
          health_status: "unclear",
        } as Record<string, unknown>,
      },
      error: null,
      code: null,
      timedOut: false,
    });

    renderDoctor();
    await uploadImage();
    disableAutoSpeak();
    fireEvent.click(screen.getByRole("button", { name: /Scan & Diagnose|Diagnose|Analyze Crop/i }));

    expect(await screen.findByText(/No confidence score/)).toBeTruthy();
    expect(screen.getByText(/AI is not confident in this assessment/)).toBeTruthy();
    expect(screen.getAllByText(/Not clearly identified/).length).toBeGreaterThan(0);
  });

  it("maps edge failure codes to localized copy via classifyEdgeError", async () => {
    const { classifyEdgeError } = await import("@/lib/crop-scan");
    expect(classifyEdgeError("Too many requests", false)).toBe("rate_limit");
    expect(classifyEdgeError("", false)).toBe("unknown");
  });
});