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
  useAuth: () => ({ user: { id: "user-test-10-scans" } }),
  useOptionalAuth: () => ({ user: { id: "user-test-10-scans" } }),
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
    uploadScanImage: vi.fn().mockResolvedValue({ ok: true, storagePath: "user-test-10-scans/leaf.jpg" }),
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

async function uploadImage(filename = "leaf.jpg") {
  const file = new File([new Uint8Array([1, 2, 3])], filename, { type: "image/jpeg" });
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(input, { target: { files: [file] } });
  await waitFor(() =>
    (screen.getByRole("button", { name: /Scan & Diagnose|Diagnose/i }) as HTMLButtonElement).disabled === false
  );
}

function disableAutoSpeak() {
  const btn = screen.getByTitle("Auto voice enabled");
  if (btn) fireEvent.click(btn);
}

describe("CropDoctor — 10 Consecutive Production Scans Test Suite", () => {
  beforeEach(() => {
    mockCompress.mockClear();
    mockUpload.mockClear();
    mockInvoke.mockClear();
  });

  it("Test Scan #1: Healthy Soybean Crop Scan", async () => {
    mockInvoke.mockResolvedValueOnce({
      data: {
        result: {
          crop: "Soybean",
          plant_part: "Leaf",
          health_status: "healthy",
          possible_issue: "Crop leaves appear healthy and dark green with no visible disease spots.",
          confidence: 94,
          symptoms: ["Healthy green foliage"],
          immediate_actions: ["Maintain regular irrigation schedule"],
          prevention: ["Inspect field weekly"],
          urgency: "low",
        },
      },
      error: null,
      code: null,
      timedOut: false,
    });

    renderDoctor();
    await uploadImage("soybean_healthy.jpg");
    disableAutoSpeak();
    fireEvent.click(screen.getByRole("button", { name: /Scan & Diagnose|Diagnose/i }));

    expect(await screen.findByText(/Healthy green foliage/)).toBeTruthy();
    expect(screen.getByText("Soybean")).toBeTruthy();
    expect(screen.getByText(/94%/)).toBeTruthy();
  });

  it("Test Scan #2: Tomato Early Blight Fungal Infection", async () => {
    mockInvoke.mockResolvedValueOnce({
      data: {
        result: {
          crop: "Tomato",
          plant_part: "Leaf",
          health_status: "possible disease",
          possible_issue: "Likely early blight (Alternaria solani) concentric spots on lower leaves.",
          confidence: 82,
          symptoms: ["Concentric brown spots", "Yellowing outer margins"],
          immediate_actions: ["Remove lower infected leaves", "Avoid overhead sprinkler irrigation"],
          prevention: ["Ensure crop spacing for ventilation"],
          urgency: "medium",
        },
      },
      error: null,
      code: null,
      timedOut: false,
    });

    renderDoctor();
    await uploadImage("tomato_blight.jpg");
    disableAutoSpeak();
    fireEvent.click(screen.getByRole("button", { name: /Scan & Diagnose|Diagnose/i }));

    expect(await screen.findByText(/Likely early blight/)).toBeTruthy();
    expect(screen.getByText("Tomato")).toBeTruthy();
    expect(screen.getByText(/82%/)).toBeTruthy();
  });

  it("Test Scan #3: Wheat Yellow Rust Spot Analysis", async () => {
    mockInvoke.mockResolvedValueOnce({
      data: {
        result: {
          crop: "Wheat",
          plant_part: "Leaf",
          health_status: "possible disease",
          possible_issue: "Likely stripe/yellow rust symptoms (Puccinia striiformis).",
          confidence: 88,
          symptoms: ["Yellow pustules arranged in linear stripes"],
          immediate_actions: ["Isolate infected patch", "Consult local KVK for approved fungicide options"],
          prevention: ["Plant resistant wheat cultivars next season"],
          urgency: "high",
        },
      },
      error: null,
      code: null,
      timedOut: false,
    });

    renderDoctor();
    await uploadImage("wheat_rust.jpg");
    disableAutoSpeak();
    fireEvent.click(screen.getByRole("button", { name: /Scan & Diagnose|Diagnose/i }));

    expect(await screen.findByText(/Likely stripe\/yellow rust/)).toBeTruthy();
    expect(screen.getByText("Wheat")).toBeTruthy();
    expect(screen.getByText(/88%/)).toBeTruthy();
  });

  it("Test Scan #4: Cotton Aphid Pest Infestation", async () => {
    mockInvoke.mockResolvedValueOnce({
      data: {
        result: {
          crop: "Cotton",
          plant_part: "Leaf",
          health_status: "possible pest",
          possible_issue: "Likely aphid colony curling leaf undersides and depositing honeydew.",
          confidence: 78,
          symptoms: ["Curling leaf margins", "Sticky honeydew residue", "Tiny green insects"],
          immediate_actions: ["Spray neem seed kernel extract (5%)", "Conserve ladybird beetles"],
          prevention: ["Avoid excessive nitrogenous fertilizer application"],
          urgency: "medium",
        },
      },
      error: null,
      code: null,
      timedOut: false,
    });

    renderDoctor();
    await uploadImage("cotton_aphids.jpg");
    disableAutoSpeak();
    fireEvent.click(screen.getByRole("button", { name: /Scan & Diagnose|Diagnose/i }));

    expect(await screen.findByText(/Likely aphid colony/)).toBeTruthy();
    expect(screen.getByText("Cotton")).toBeTruthy();
  });

  it("Test Scan #5: Rice Nitrogen Deficiency Yellowing", async () => {
    mockInvoke.mockResolvedValueOnce({
      data: {
        result: {
          crop: "Rice",
          plant_part: "Whole Plant",
          health_status: "possible deficiency",
          possible_issue: "Uniform yellowing starting from older lower leaves suggesting Nitrogen deficiency.",
          confidence: 85,
          symptoms: ["Lower leaf pale yellowing", "Stunted tillering"],
          immediate_actions: ["Apply split dose of nitrogenous fertilizer as per soil test"],
          prevention: ["Perform soil testing prior to transplanting"],
          urgency: "low",
        },
      },
      error: null,
      code: null,
      timedOut: false,
    });

    renderDoctor();
    await uploadImage("rice_nitrogen.jpg");
    disableAutoSpeak();
    fireEvent.click(screen.getByRole("button", { name: /Scan & Diagnose|Diagnose/i }));

    expect(await screen.findByText(/Uniform yellowing starting from older lower leaves/)).toBeTruthy();
    expect(screen.getByText("Rice")).toBeTruthy();
  });

  it("Test Scan #6: Blurry Image Requesting Clearer Photo", async () => {
    mockInvoke.mockResolvedValueOnce({
      data: {
        result: {
          crop: "Corn",
          plant_part: "Leaf",
          health_status: "unclear",
          possible_issue: "Photo is blurred; unable to distinguish fungal spots from dust.",
          confidence: 30,
          needs_clearer_image: true,
          symptoms: [],
          immediate_actions: ["Take a closer photo in daylight"],
          urgency: "low",
        },
      },
      error: null,
      code: null,
      timedOut: false,
    });

    renderDoctor();
    await uploadImage("blurry_leaf.jpg");
    disableAutoSpeak();
    fireEvent.click(screen.getByRole("button", { name: /Scan & Diagnose|Diagnose/i }));

    expect(await screen.findByText(/Photo is not clear enough for a reliable analysis/)).toBeTruthy();
  });

  it("Test Scan #7: Multi-Image Scan (2 Photos Attached)", async () => {
    mockInvoke.mockResolvedValueOnce({
      data: {
        result: {
          crop: "Chilli",
          plant_part: "Leaf & Fruit",
          health_status: "possible disease",
          possible_issue: "Chilli anthracnose fruit rot and leaf spot.",
          confidence: 91,
          symptoms: ["Sunken circular lesions on chilli fruit", "Brown spots on leaves"],
          immediate_actions: ["Destroy infected fruits", "Spray Trichoderma viride bio-agent"],
          prevention: ["Use disease-free seed material"],
          urgency: "high",
        },
      },
      error: null,
      code: null,
      timedOut: false,
    });

    renderDoctor();
    await uploadImage("chilli_plant.jpg");
    await uploadImage("chilli_fruit.jpg");
    disableAutoSpeak();
    fireEvent.click(screen.getByRole("button", { name: /Scan & Diagnose|Diagnose/i }));

    expect(await screen.findByText(/Chilli anthracnose fruit rot/)).toBeTruthy();
    expect(screen.getByText("Chilli")).toBeTruthy();
  });

  it("Test Scan #8: Server Timeout Handling", async () => {
    mockInvoke.mockResolvedValueOnce({
      data: null,
      error: "The request took too long. Please check your connection and try again.",
      code: "timeout",
      timedOut: true,
    });

    renderDoctor();
    await uploadImage("timeout_leaf.jpg");
    fireEvent.click(screen.getByRole("button", { name: /Scan & Diagnose|Diagnose/i }));

    expect(await screen.findByText(/AI analysis took too long/)).toBeTruthy();
  });

  it("Test Scan #9: Rate Limit Error Response", async () => {
    mockInvoke.mockResolvedValueOnce({
      data: null,
      error: "Too many requests. Please wait a moment and try again.",
      code: "rate_limit",
      timedOut: false,
    });

    renderDoctor();
    await uploadImage("rate_limit.jpg");
    fireEvent.click(screen.getByRole("button", { name: /Scan & Diagnose|Diagnose/i }));

    expect(await screen.findByText(/Too many requests/)).toBeTruthy();
  });

  it("Test Scan #10: Sugarcane Red Rot Disease Detection & KVK Recommendation", async () => {
    mockInvoke.mockResolvedValueOnce({
      data: {
        result: {
          crop: "Sugarcane",
          plant_part: "Stem",
          health_status: "possible disease",
          possible_issue: "Likely Red Rot (Colletotrichum falcatum) internal reddening.",
          confidence: 89,
          symptoms: ["Reddening of internal stem tissues with white cross bands"],
          immediate_actions: ["Uproot and burn infected clumps", "Do not use infected stalks as setts"],
          prevention: ["Heat treatment of seed setts before planting"],
          expert_confirm: "Contact local KVK scientist or sugarcane officer immediately.",
          urgency: "urgent",
        },
      },
      error: null,
      code: null,
      timedOut: false,
    });

    renderDoctor();
    await uploadImage("sugarcane_redrot.jpg");
    disableAutoSpeak();
    fireEvent.click(screen.getByRole("button", { name: /Scan & Diagnose|Diagnose/i }));

    expect(await screen.findByText(/Likely Red Rot/)).toBeTruthy();
    expect(screen.getByText("Sugarcane")).toBeTruthy();
    expect(screen.getByText(/Contact local KVK scientist/)).toBeTruthy();
  });
});
