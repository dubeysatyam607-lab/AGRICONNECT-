import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Scan, Sparkles, Loader, X, Camera, Info, Upload, Volume2, VolumeX,
  History, AlertTriangle, Plus, Trash2, MessageSquare, CheckCircle, ShieldAlert,
} from "lucide-react";
import { AgriButton } from "@/components/ui/agri-button";
import { SafeImage } from "@/components/ui/SafeImage";
import { useToast } from "@/hooks/use-toast";
import { invokeEdgeWithTimeout } from "@/lib/invoke-edge";
import {
  compressImageFile,
  uploadScanImage,
  classifyEdgeError,
  SCAN_ERROR_KEYS,
  checkImageQuality,
  analyzeCropClientSide,
  type ScanErrorCode,
  type ImageQualityResult,
} from "@/lib/crop-scan";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { useFarm } from "@/contexts/FarmContext";
import { fetchScanHistory, deleteScan, type StoredScan } from "@/lib/ai-persistence";
import { speakText, stopSpeaking, textForSpeech, detectLanguageOf } from "@/core/voice";

export interface CropScanResult {
  crop?: string | null;
  plant_part?: string | null;
  health_status?: string | null;
  possible_issue?: string | null;
  confidence?: number | null;
  symptoms?: string[];
  possible_causes?: string[];
  immediate_actions?: string[];
  prevention?: string[];
  questions?: string[];
  recommendations?: string[];
  urgency?: string | null;
  needs_clearer_image?: boolean;
  next_steps_for_farmer?: string[];
  expert_confirm?: string | null;
}

interface SelectedImageItem {
  id: string;
  previewUrl: string;
  base64Data: string;
  blob: Blob;
  role: string; // "Whole plant" | "Leaf" | "Fruit/Stem" | "Close-up"
  qualityResult?: ImageQualityResult;
}

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_MB = 8;
const MAX_IMAGES = 4;
const IMAGE_ROLES = ["Whole Plant", "Affected Leaf", "Stem/Fruit", "Close-up"];

const HEALTH_LABELS: Record<string, string> = {
  "possible disease": "Possible Disease",
  "possible pest": "Possible Pest",
  "possible deficiency": "Possible Deficiency",
  "possible water stress": "Possible Water Stress",
  "possible environmental stress": "Possible Environmental Stress",
  healthy: "Healthy",
  unclear: "Needs a clearer photo",
};

const URGENCY_STYLES: Record<string, string> = {
  low: "bg-primary/10 text-primary border-primary/20",
  medium: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25",
  high: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  urgent: "bg-destructive/10 text-destructive border-destructive/25",
};

interface CropDoctorProps {
  onAskKisan?: (scanResult: CropScanResult) => void;
}

const CropDoctor: React.FC<CropDoctorProps> = ({ onAskKisan }) => {
  const [input, setInput] = useState("");
  const [images, setImages] = useState<SelectedImageItem[]>([]);
  const [result, setResult] = useState<CropScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [qualityWarning, setQualityWarning] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<StoredScan[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const { profile } = useFarm();
  const { languageName, t } = useLanguage();

  const speakResultText = useCallback(() => {
    if (!result) return;
    const parts = [
      result.possible_issue,
      result.symptoms?.length ? `Symptoms: ${result.symptoms.join(". ")}` : "",
      result.immediate_actions?.length ? `Actions: ${result.immediate_actions.join(". ")}` : "",
      result.recommendations?.length ? result.recommendations.join(". ") : "",
    ].filter(Boolean);
    const text = parts.join(". ");
    if (!text) return;
    setIsSpeaking(true);
    const lang = detectLanguageOf(text).lang;
    const controller = speakText(textForSpeech(text, lang), `${lang}-IN`, {
      onEnd: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
    return () => controller.stop();
  }, [result]);

  const handleSpeakResponse = useCallback(() => {
    if (isSpeaking) {
      stopSpeaking();
      setIsSpeaking(false);
    } else {
      speakResultText();
    }
  }, [isSpeaking, speakResultText]);

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const checkSpeaking = setInterval(() => setIsSpeaking(window.speechSynthesis.speaking), 100);
    return () => {
      clearInterval(checkSpeaking);
      stopSpeaking();
    };
  }, []);

  const loadHistory = useCallback(async () => {
    if (!user) return;
    setHistoryLoading(true);
    try {
      const scans = await fetchScanHistory(20);
      setHistory(scans);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [user]);

  const toggleHistory = () => {
    setShowHistory((v) => !v);
    if (!showHistory) loadHistory();
  };

  const processFile = async (file: File) => {
    if (images.length >= MAX_IMAGES) {
      toast({
        title: "Maximum photos reached",
        description: `You can upload up to ${MAX_IMAGES} crop photos per scan.`,
        variant: "destructive",
      });
      return;
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast({
        title: t("doctor.error.invalidTypeTitle") || "Invalid file type",
        description: t("doctor.error.invalidType") || "Please upload a valid JPG, PNG, or WebP image.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      toast({
        title: t("doctor.error.tooLargeTitle") || "File too large",
        description: t("doctor.error.tooLarge") || `Image size must be less than ${MAX_FILE_MB}MB.`,
        variant: "destructive",
      });
      return;
    }

    try {
      const compressed = await compressImageFile(file);
      
      let qResult: ImageQualityResult = { isUsable: true };
      try {
        if (compressed.canvas) {
          qResult = checkImageQuality(compressed.canvas);
        }
      } catch {
        // fallback for environments without canvas 2d context
      }

      if (!qResult.isUsable) {
        setQualityWarning(qResult.warningEn || "Photo is not clear enough. Please take a closer photo in good light.");
      } else {
        setQualityWarning(null);
      }

      const role = IMAGE_ROLES[images.length] || "Crop Photo";
      const newItem: SelectedImageItem = {
        id: Math.random().toString(36).substring(2, 9),
        previewUrl: compressed.dataUrl,
        base64Data: compressed.dataUrl,
        blob: compressed.blob,
        role,
        qualityResult: qResult,
      };

      setImages((prev) => [...prev, newItem]);
      setError(null);
    } catch (err: any) {
      toast({
        title: t("doctor.error.uploadFailedTitle") || "Upload failed",
        description: err?.message || t("doctor.error.compress") || "Failed to process image.",
        variant: "destructive",
      });
    }
  };

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    for (let i = 0; i < Math.min(files.length, MAX_IMAGES - images.length); i++) {
      await processFile(files[i]);
    }
    if (e.target) e.target.value = "";
  };

  const removeImage = (id: string) => {
    setImages((prev) => prev.filter((item) => item.id !== id));
  };

  const handleDiagnosis = async () => {
    if (images.length === 0) {
      setError("Please attach at least one crop photo to analyze.");
      toast({ title: "Photo required", description: "Crop scanning requires a crop photo.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    console.log("[CropScan] scan started");
    console.log(`[CropScan] attached images count = ${images.length}`);
    images.forEach((img, idx) => {
      console.log(`[CropScan] image #${idx + 1} type = ${img.blob.type || "image/jpeg"}, size = ${(img.blob.size / 1024).toFixed(1)} KB`);
    });

    // Best-effort background upload of primary image to private bucket (non-blocking)
    if (images[0]?.blob && user?.id) {
      uploadScanImage(user.id, images[0].blob).catch((uploadErr) => {
        console.warn("[CropScan] non-blocking background image upload failed:", uploadErr);
      });
    }

    try {
      const payloadImages = images.map((img) => img.base64Data);
      const farmCtx = {
        crop: profile.crop,
        variety: profile.variety,
        stage: profile.stage,
        area: profile.farmArea,
        soil: profile.soilType,
      };

      console.log("[CropScan] API request started (calling edge function crop-doctor)");
      const { data, error: err, code, timedOut } = await invokeEdgeWithTimeout<{ result: CropScanResult; error?: string }>(
        "crop-doctor",
        {
          description: input,
          imagesBase64: payloadImages,
          imageBase64: payloadImages[0],
          language: languageName,
          farmContext: farmCtx,
        },
        20000,
      );

      if (err) {
        console.warn(`[CropScan] edge call returned error code = ${code || "none"}:`, err);
        const edgeCode: ScanErrorCode = (code as ScanErrorCode) || classifyEdgeError(err, timedOut, navigator.onLine);
        
        // Attempt direct client-side AI fallback only when the edge service itself is
        // unavailable (unconfigured / not deployed / session). A genuine server error
        // (api / unknown) must surface the honest error rather than silently retry.
        if (edgeCode === "config" || edgeCode === "deploy" || edgeCode === "session") {
          console.log("[CropScan] attempting client-side Gemini fallback");
          const fallbackResult = await analyzeCropClientSide(payloadImages, input, languageName, farmCtx);
          if (fallbackResult) {
            console.log("[CropScan] client-side Gemini fallback succeeded");
            setIsLoading(false);
            setResult(fallbackResult as CropScanResult);
            if (fallbackResult.needs_clearer_image) {
              setError("Photo is not clear enough for a reliable analysis. Please take a closer photo of the affected part.");
            }
            if (autoSpeak && (fallbackResult.possible_issue || fallbackResult.health_status)) {
              setTimeout(speakResultText, 500);
            }
            loadHistory().catch(() => {});
            return;
          }
        }

        const key = SCAN_ERROR_KEYS[edgeCode];
        const localized = key ? t(key) : null;
        // Show validation error verbatim; use localized message for network/timeout/config/quota, or err as fallback
        const message = edgeCode === "validation" ? err : (localized || err || "Analysis service unavailable. Please check internet connection or retry.");
        setIsLoading(false);
        setError(message);
        loadHistory().catch(() => {});
        return;
      }

      if (!data?.result) {
        console.warn("[CropScan] empty result from edge function, attempting fallback");
        const fallbackResult = await analyzeCropClientSide(payloadImages, input, languageName, farmCtx);
        if (fallbackResult) {
          console.log("[CropScan] client-side fallback succeeded after empty edge payload");
          setIsLoading(false);
          setResult(fallbackResult as CropScanResult);
          loadHistory().catch(() => {});
          return;
        }

        setIsLoading(false);
        setError(t("doctor.error.api") || "The AI returned an empty result. Please try again.");
        loadHistory().catch(() => {});
        return;
      }

      console.log("[CropScan] AI response parsed successfully");
      setIsLoading(false);
      setResult(data.result);

      if (data.result.needs_clearer_image) {
        setError("Photo is not clear enough for a reliable analysis. Please take a closer photo of the affected leaf/fruit/stem.");
      }

      if (autoSpeak && (data.result.possible_issue || data.result.health_status)) {
        setTimeout(speakResultText, 500);
      }

      loadHistory().catch(() => {});
      console.log("[CropScan] complete");
    } catch (err: any) {
      console.error("[CropScan] exception caught during diagnosis:", err?.message || err);
      setIsLoading(false);
      setError(err?.message || "Something went wrong with the analysis. Please try again in a moment.");
    }
  };

  const handleReset = () => {
    stopSpeaking();
    setResult(null);
    setError(null);
    setQualityWarning(null);
    setInput("");
    setImages([]);
    if (galleryInputRef.current) galleryInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const handleDeleteScan = async (scanId: string) => {
    const ok = await deleteScan(scanId);
    if (ok) setHistory((h) => h.filter((s) => s.id !== scanId));
  };

  const handleAskKisanAssistant = () => {
    if (result && onAskKisan) {
      onAskKisan(result);
    }
  };

  const renderResultCard = () => {
    if (!result) return null;
    const confidence = result.confidence ?? null;
    const clarityWarning = result.needs_clearer_image;

    return (
      <div className="flex-1 bg-card rounded-xl border border-border p-5 overflow-y-auto mb-6">
        <div className="flex justify-between items-start mb-4 border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <Scan className="text-primary" size={20} aria-hidden="true" />
            <h3 className="type-h2">{t('agr194') || 'Scan result'}</h3>
          </div>
          <div className="flex gap-1">
            <button
              onClick={handleSpeakResponse}
              className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${isSpeaking ? "bg-primary/10 text-primary" : "hover:bg-muted text-muted-foreground"}`}
              title={isSpeaking ? "Stop speaking" : "Listen"}
              aria-label={isSpeaking ? "Stop speaking" : "Listen to result"}
            >
              {isSpeaking ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <button onClick={handleReset} className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-muted transition-colors" aria-label="Close result">
              <X size={18} className="text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Display photos gallery */}
        {images.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            {images.map((img) => (
              <div key={img.id} className="relative rounded-lg overflow-hidden border border-border h-24 bg-muted">
                <SafeImage
                  src={img.previewUrl}
                  alt={img.role}
                  resolveType="crop"
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-1 left-1 right-1 bg-black/60 text-white text-xs font-semibold px-1.5 py-0.5 rounded text-center truncate">
                  {img.role}
                </span>
              </div>
            ))}
          </div>
        )}

        {clarityWarning && (
          <div className="flex items-start gap-2 mb-4 p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-800 dark:text-amber-300 text-xs">
            <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-600" aria-hidden="true" />
            <p>Photo is not clear enough for a reliable analysis. Please take a closer photo of the affected leaf, fruit or stem.</p>
          </div>
        )}

        {/* Crop + Plant part overview */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-muted/50 border border-border rounded-lg p-3">
            <p className="type-label text-muted-foreground">Crop identified</p>
            <p className="type-h3 mt-0.5">{result.crop || profile.crop || "Crop"}</p>
          </div>
          <div className="bg-muted/50 border border-border rounded-lg p-3">
            <p className="type-label text-muted-foreground">Plant part</p>
            <p className="type-h3 mt-0.5">{result.plant_part || "Leaf / plant"}</p>
          </div>
        </div>

        {/* Health status + confidence */}
        <div className="flex items-center justify-between gap-2 mb-4 flex-wrap bg-muted/50 p-3 rounded-lg border border-border">
          <div className="flex items-center gap-2">
            <span className="type-small text-muted-foreground">Status</span>
            <span className={`type-label px-2 py-1 rounded border ${URGENCY_STYLES[result.urgency ?? "low"]}`}>
              {HEALTH_LABELS[result.health_status ?? ""] ?? result.health_status ?? "Observed"}
            </span>
          </div>
          {confidence != null ? (
            <div className="type-small text-muted-foreground">
              AI confidence: <span className="text-foreground font-semibold type-num">{confidence}%</span>
            </div>
          ) : (
            <span className="type-small font-semibold text-amber-600 dark:text-amber-400">Low confidence</span>
          )}
        </div>

        {confidence == null && (
          <div className="mb-4 p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-800 dark:text-amber-300 text-xs space-y-1">
            <p className="font-semibold">AI is not confident in this assessment.</p>
            <p>No confidence score was returned. Not clearly identified — the crop or issue could not be determined.</p>
          </div>
        )}

        {/* Observed Issue */}
        {result.possible_issue && (
          <div className="mb-4 bg-card p-4 rounded-lg border border-border">
            <h4 className="type-label text-muted-foreground mb-1">Observed issue / likely finding</h4>
            <p className="type-body font-semibold text-foreground">{result.possible_issue}</p>
          </div>
        )}

        {/* Observed Symptoms */}
        {!!result.symptoms?.length && (
          <div className="mb-4">
            <h4 className="type-label text-muted-foreground mb-2">Visible symptoms</h4>
            <ul className="space-y-1 type-small text-foreground">
              {result.symptoms.map((s, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-muted-foreground" aria-hidden="true">•</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Possible Causes */}
        {!!result.possible_causes?.length && (
          <div className="mb-4">
            <h4 className="type-label text-muted-foreground mb-2">What this may indicate</h4>
            <ul className="space-y-1 type-small text-foreground">
              {result.possible_causes.map((c, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-muted-foreground" aria-hidden="true">•</span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Immediate Cultural & Agronomic Actions */}
        {(!!result.immediate_actions?.length || !!result.recommendations?.length) && (
          <div className="mb-4 bg-primary/5 border border-primary/20 p-4 rounded-lg">
            <h4 className="type-label text-primary mb-2 flex items-center gap-1.5">
              <CheckCircle size={15} aria-hidden="true" /> Immediate recommended steps
            </h4>
            <ul className="space-y-1.5 type-small text-foreground">
              {(result.immediate_actions?.length ? result.immediate_actions : result.recommendations!).map((act, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="font-semibold text-foreground type-num">{i + 1}.</span>
                  <span>{act}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Prevention Guidance */}
        {!!result.prevention?.length && (
          <div className="mb-4">
            <h4 className="type-label text-muted-foreground mb-2">Prevention and care</h4>
            <ul className="space-y-1 type-small text-foreground">
              {result.prevention.map((p, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-muted-foreground" aria-hidden="true">•</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Follow-up Clarifying Questions */}
        {!!result.questions?.length && (
          <div className="mb-4 p-3.5 rounded-lg bg-muted/50 border border-border">
            <h4 className="type-label text-muted-foreground mb-1.5">Follow-up questions</h4>
            <ul className="space-y-1 type-small text-foreground">
              {result.questions.map((q, i) => (
                <li key={i}>— {q}</li>
              ))}
            </ul>
          </div>
        )}

        {/* When to Seek Expert Help */}
        {result.expert_confirm && (
          <div className="mb-4 bg-muted/50 border border-border rounded-lg p-3.5 type-small text-foreground">
            <span className="type-label text-muted-foreground block mb-1">When to seek expert help</span>
            {result.expert_confirm}
          </div>
        )}

        {/* Honesty Banner — AI assessment statement */}
        <div className="mb-3 p-3 rounded-lg bg-muted/50 border border-border text-muted-foreground type-meta flex items-start gap-2">
          <Info size={14} className="shrink-0 mt-0.5" aria-hidden="true" />
          <p>
            <strong className="text-foreground">{t('doctor.notDiagnosis') || 'AI assessment — not a definitive diagnosis.'}</strong>
          </p>
        </div>

        {/* Chemical Safety & Pesticide Label Disclaimer */}
        <div className="mb-4 p-3.5 rounded-lg bg-destructive/5 border border-destructive/20 text-destructive text-xs leading-relaxed flex items-start gap-2">
          <ShieldAlert size={16} className="shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="font-semibold">Pesticide and chemical safety notice</p>
            <p className="mt-0.5">
              Confirm the diagnosis and read the local product label before applying any pesticide or fungicide. Chemical choices and application rates should always be verified with your local Krishi Vigyan Kendra (KVK) or Kisan Call Centre (1800-180-1551).
            </p>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="pt-4 border-t border-border flex flex-col sm:flex-row gap-3">
          {onAskKisan && (
            <AgriButton
              variant="primary"
              onClick={handleAskKisanAssistant}
              className="flex-1 py-3 font-semibold flex items-center justify-center gap-2"
            >
              <MessageSquare size={18} /> Ask Kisan Sahayak about this scan
            </AgriButton>
          )}
          <AgriButton variant="outline" onClick={handleReset} className="py-3 font-semibold">
            <Scan size={16} /> Scan another crop
          </AgriButton>
        </div>
      </div>
    );
  };

  return (
    <div className="pb-28 pt-5 px-4 min-h-screen flex flex-col max-w-3xl mx-auto">
      {/* Hidden inputs for gallery & camera */}
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={handleFilesSelected}
        ref={galleryInputRef}
        className="hidden"
      />
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        onChange={handleFilesSelected}
        ref={cameraInputRef}
        className="hidden"
      />

      <div className="mb-6 flex justify-between items-start gap-3">
        <div>
          <h2 className="type-h1 flex items-center gap-2">
            <Scan className="text-primary" size={22} aria-hidden="true" /> {t('svc.cropDoctor') || 'Crop Doctor'}
          </h2>
          <p className="type-small text-muted-foreground mt-0.5">
            {t('svc.cropDoctorSub') || 'Scan your crop for pests and diseases'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={toggleHistory}
            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${showHistory ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}
            title="Scan history"
            aria-label="Scan history"
          >
            <History size={20} />
          </button>
          <button
            onClick={() => setAutoSpeak(!autoSpeak)}
            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${autoSpeak ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}
            title={autoSpeak ? "Auto voice enabled" : "Auto voice disabled"}
            aria-label={autoSpeak ? "Disable auto voice" : "Enable auto voice"}
          >
            {autoSpeak ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
        </div>
      </div>

      {/* History drawer panel */}
      {showHistory && (
        <div className="bg-card rounded-xl border border-border p-4 mb-6 max-h-72 overflow-y-auto">
          <div className="flex items-center justify-between mb-3 border-b border-border pb-2">
            <h3 className="type-h3 flex items-center gap-2"><History size={16} aria-hidden="true" /> Scan history</h3>
            <button onClick={() => setShowHistory(false)} className="text-muted-foreground hover:text-foreground p-1" aria-label="Close history"><X size={16} /></button>
          </div>
          {!user ? (
            <p className="text-xs text-muted-foreground">Sign in to sync scan history across your devices.</p>
          ) : historyLoading ? (
            <p className="text-xs text-muted-foreground flex items-center gap-2"><Loader className="animate-spin" size={14} /> Loading scan history...</p>
          ) : history.length === 0 ? (
            <p className="text-xs text-muted-foreground">No scan history saved yet.</p>
          ) : (
            <div className="space-y-2">
              {history.map((scan) => (
                <div key={scan.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border">
                  <div className="min-w-0">
                    <p className="type-small font-semibold text-foreground truncate">
                      {scan.crop || "Crop"} {scan.possible_issue ? `— ${scan.possible_issue}` : ""}
                    </p>
                    <p className="type-meta">
                      {new Date(scan.created_at).toLocaleDateString()} · {(HEALTH_LABELS[scan.health_status ?? ""] ?? scan.health_status ?? "Scanned")}
                      {scan.confidence != null ? ` · ${scan.confidence}%` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleDeleteScan(scan.id)}
                      className="text-muted-foreground hover:text-destructive p-1.5 rounded-md"
                      title="Delete scan"
                      aria-label="Delete scan"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!result ? (
        <div className="flex-1 flex flex-col bg-card rounded-xl border border-border p-5 mb-6">
          {/* Header prompt */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
              <Camera size={20} aria-hidden="true" />
            </div>
            <div>
              <p className="type-h3">Upload 1–4 photos of the affected crop</p>
              <p className="type-small text-muted-foreground">Whole plant, affected leaf, stem or fruit, and a close-up</p>
            </div>
          </div>

          {/* Quality warning banner */}
          {qualityWarning && (
            <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2 font-medium">
              <AlertTriangle size={15} className="shrink-0 mt-0.5 text-amber-600" />
              <span>{qualityWarning}</span>
            </div>
          )}

          {/* Image Upload Gallery / Previews */}
          <div className="mb-4">
            {images.length > 0 ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {images.map((img) => (
                    <div key={img.id} className="relative rounded-lg overflow-hidden border border-border h-32 bg-muted">
                      <SafeImage
                        src={img.previewUrl}
                        alt={img.role}
                        resolveType="crop"
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute top-2 left-2 bg-black/70 text-white text-xs font-semibold px-2 py-0.5 rounded">
                        {img.role}
                      </span>
                      <button
                        onClick={() => removeImage(img.id)}
                        className="absolute top-2 right-2 bg-background/80 hover:bg-destructive hover:text-destructive-foreground text-muted-foreground p-1.5 rounded-md transition-colors"
                        aria-label={`Remove ${img.role} photo`}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  {images.length < MAX_IMAGES && (
                    <button
                      onClick={() => galleryInputRef.current?.click()}
                      className="h-32 border border-border rounded-lg flex flex-col items-center justify-center gap-1.5 text-muted-foreground hover:border-primary hover:text-primary transition-colors bg-muted/30"
                    >
                      <Plus size={20} />
                      <span className="type-small font-semibold">Add photo ({images.length}/{MAX_IMAGES})</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="h-36 rounded-xl border border-border bg-muted/30 flex flex-col items-center justify-center gap-2 text-foreground hover:border-primary hover:bg-primary/5 transition-colors"
                >
                  <Camera size={28} className="text-primary" aria-hidden="true" />
                  <span className="type-h3">Take a photo</span>
                  <span className="type-meta">Use your mobile camera</span>
                </button>

                <button
                  onClick={() => galleryInputRef.current?.click()}
                  className="h-36 rounded-xl border border-border bg-muted/30 flex flex-col items-center justify-center gap-2 text-foreground hover:border-primary hover:bg-primary/5 transition-colors"
                >
                  <Upload size={28} className="text-muted-foreground" aria-hidden="true" />
                  <span className="type-h3">Choose from gallery</span>
                  <span className="type-meta">JPG, PNG or WebP · up to {MAX_FILE_MB}MB</span>
                </button>
              </div>
            )}
          </div>

          {/* Description input */}
          <textarea
            className="w-full p-3 rounded-lg border border-border bg-background outline-none text-sm mb-4 min-h-[90px] text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            placeholder={t('doctor.placeholder') || "Describe symptoms (e.g., yellowing spots on soybean leaf, wilted stems...)"}
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />

          {error && (
            <div className="mb-4 p-3.5 rounded-lg bg-destructive/5 border border-destructive/25 text-destructive text-xs flex items-center justify-between gap-2 font-semibold">
              <div className="flex items-start gap-2">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" aria-hidden="true" />
                <span>{error}</span>
              </div>
              {images.length > 0 && !isLoading && (
                <button
                  type="button"
                  onClick={handleDiagnosis}
                  className="shrink-0 px-3 py-1.5 bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold rounded-md text-xs transition-colors"
                >
                  Retry
                </button>
              )}
            </div>
          )}

          {/* Scan button */}
          <AgriButton
            variant="primary"
            onClick={handleDiagnosis}
            disabled={isLoading || images.length === 0}
            className="w-full py-3.5 font-semibold text-base"
          >
            {isLoading ? (
              <>
                <Loader className="animate-spin" size={20} />
                Analyzing crop photos…
              </>
            ) : (
              <>
                <Scan size={20} /> Scan &amp; Diagnose
              </>
            )}
          </AgriButton>
        </div>
      ) : (
        renderResultCard()
      )}

      {/* Practical Tips */}
      <div className="bg-card p-4 rounded-xl flex items-start gap-3 border border-border">
        <Info className="text-muted-foreground shrink-0 mt-0.5" size={18} aria-hidden="true" />
        <div>
          <h4 className="type-h3">Tips for an accurate scan</h4>
          <ul className="type-small text-muted-foreground mt-1 space-y-1">
            <li>• Take a clear close-up of the affected leaf or fruit in good daylight.</li>
            <li>• Avoid direct sun reflection, glare, or motion blur.</li>
            <li>• Add a whole-plant photo and the underside of leaves when possible.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CropDoctor;