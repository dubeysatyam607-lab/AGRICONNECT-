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
  low: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  medium: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  high: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30",
  urgent: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30",
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
        const canvas = document.createElement("canvas");
        canvas.width = compressed.width;
        canvas.height = compressed.height;
        qResult = checkImageQuality(canvas);
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

    // Upload first primary image to private bucket
    if (images[0]?.blob) {
      await uploadScanImage(user?.id, images[0].blob);
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
        const edgeCode: ScanErrorCode = (code as ScanErrorCode) || classifyEdgeError(err, timedOut, navigator.onLine);
        const key = SCAN_ERROR_KEYS[edgeCode] || "doctor.error.api";
        const message = edgeCode === "validation" ? err : t(key) || err;
        setIsLoading(false);
        setError(message);
        loadHistory();
        return;
      }

      if (!data?.result) {
        setIsLoading(false);
        setError(t("doctor.error.api") || "The AI returned an empty result. Please try again.");
        loadHistory();
        return;
      }

      setIsLoading(false);
      setResult(data.result);

      if (data.result.needs_clearer_image) {
        setError("Photo is not clear enough for a reliable analysis. Please take a closer photo of the affected leaf/fruit/stem.");
      }

      if (autoSpeak && (data.result.possible_issue || data.result.health_status)) {
        setTimeout(speakResultText, 500);
      }

      loadHistory();
    } catch (err: any) {
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
      <div className="flex-1 bg-card rounded-2xl border border-emerald-500/20 shadow-lg p-6 overflow-y-auto mb-6">
        <div className="flex justify-between items-start mb-4 border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="text-emerald-600 dark:text-emerald-400" size={22} />
            <h3 className="font-extrabold text-foreground text-lg">{t('agr194') || 'AI Crop Analysis Result'}</h3>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSpeakResponse}
              className={`p-2 rounded-full transition-colors ${isSpeaking ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "hover:bg-muted text-muted-foreground"}`}
              title={isSpeaking ? "Stop speaking" : "Listen"}
            >
              {isSpeaking ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <button onClick={handleReset} className="p-1.5 hover:bg-muted rounded-full transition-colors">
              <X size={18} className="text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Display photos gallery */}
        {images.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            {images.map((img) => (
              <div key={img.id} className="relative rounded-xl overflow-hidden border border-border h-24 bg-muted">
                <SafeImage
                  src={img.previewUrl}
                  alt={img.role}
                  resolveType="crop"
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-1 left-1 right-1 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded text-center truncate">
                  {img.role}
                </span>
              </div>
            ))}
          </div>
        )}

        {clarityWarning && (
          <div className="flex items-start gap-2 mb-4 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs">
            <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-600" />
            <p>Photo is not clear enough for a reliable analysis. Please take a closer photo of the affected leaf/fruit/stem.</p>
          </div>
        )}

        {/* Crop + Plant part overview */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-500/20 rounded-xl p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">Crop Identified</p>
            <p className="font-extrabold text-foreground text-base mt-0.5">{result.crop || profile.crop || "Crop"}</p>
          </div>
          <div className="bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-500/20 rounded-xl p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">Plant Part</p>
            <p className="font-extrabold text-foreground text-base mt-0.5">{result.plant_part || "Leaf / Plant"}</p>
          </div>
        </div>

        {/* Health status + confidence */}
        <div className="flex items-center justify-between gap-2 mb-4 flex-wrap bg-muted/60 p-3 rounded-xl border border-border">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">Status:</span>
            <span className={`text-xs font-extrabold px-3 py-1 rounded-full border ${URGENCY_STYLES[result.urgency ?? "low"]}`}>
              {(HEALTH_LABELS[result.health_status ?? ""] ?? result.health_status ?? "Observed").toUpperCase()}
            </span>
          </div>
          {confidence != null ? (
            <div className="text-xs font-bold text-muted-foreground">
              AI Confidence: <span className="text-emerald-700 dark:text-emerald-400 font-extrabold">{confidence}%</span>
            </div>
          ) : (
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400">Moderate / Low Confidence</span>
          )}
        </div>

        {confidence == null && (
          <div className="mb-4 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-800 dark:text-amber-300 text-xs space-y-1">
            <p className="font-bold">AI is not confident in this assessment.</p>
            <p>No confidence score available.</p>
            <p>Not clearly identified — the crop or issue could not be determined.</p>
          </div>
        )}

        {/* Observed Issue */}
        {result.possible_issue && (
          <div className="mb-4 bg-card p-4 rounded-xl border border-emerald-500/20">
            <h4 className="text-xs font-extrabold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider mb-1">Observed Issue / Likely Finding</h4>
            <p className="text-base font-bold text-foreground leading-relaxed">{result.possible_issue}</p>
          </div>
        )}

        {/* Observed Symptoms */}
        {!!result.symptoms?.length && (
          <div className="mb-4">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Visible Observed Symptoms</h4>
            <ul className="space-y-1 text-sm text-foreground">
              {result.symptoms.map((s, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold">•</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Possible Causes */}
        {!!result.possible_causes?.length && (
          <div className="mb-4">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">What This May Indicate</h4>
            <ul className="space-y-1 text-sm text-foreground">
              {result.possible_causes.map((c, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-amber-600 font-bold">•</span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Immediate Cultural & Agronomic Actions */}
        {(!!result.immediate_actions?.length || !!result.recommendations?.length) && (
          <div className="mb-4 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-500/20 p-4 rounded-xl">
            <h4 className="text-xs font-extrabold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <CheckCircle size={15} /> Immediate Recommended Steps
            </h4>
            <ul className="space-y-1.5 text-sm text-foreground">
              {(result.immediate_actions?.length ? result.immediate_actions : result.recommendations!).map((act, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">{i + 1}.</span>
                  <span>{act}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Prevention Guidance */}
        {!!result.prevention?.length && (
          <div className="mb-4">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Prevention & Care</h4>
            <ul className="space-y-1 text-sm text-foreground">
              {result.prevention.map((p, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Follow-up Clarifying Questions */}
        {!!result.questions?.length && (
          <div className="mb-4 p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <h4 className="text-xs font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider mb-1.5">Follow-up Questions</h4>
            <ul className="space-y-1 text-xs text-foreground font-medium">
              {result.questions.map((q, i) => (
                <li key={i}>❓ {q}</li>
              ))}
            </ul>
          </div>
        )}

        {/* When to Seek Expert Help */}
        {result.expert_confirm && (
          <div className="mb-4 bg-purple-500/10 border border-purple-500/20 rounded-xl p-3.5 text-xs text-foreground">
            <span className="font-extrabold text-purple-700 dark:text-purple-300 block mb-1">When to Seek Expert Help:</span>
            {result.expert_confirm}
          </div>
        )}

        {/* Honesty Banner — AI assessment statement */}
        <div className="mb-3 p-3 rounded-xl bg-primary/10 border border-primary/25 text-primary text-[11px] leading-relaxed flex items-start gap-2">
          <Info size={14} className="shrink-0 mt-0.5" />
          <p>
            <strong>{t('doctor.notDiagnosis') || 'AI assessment — not a definitive diagnosis.'}</strong>
          </p>
        </div>

        {/* Chemical Safety & Pesticide Label Disclaimer */}
        <div className="mb-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-800 dark:text-rose-300 text-[11px] leading-relaxed flex items-start gap-2">
          <ShieldAlert size={16} className="shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
          <div>
            <p className="font-extrabold">Pesticide & Chemical Safety Notice:</p>
            <p className="mt-0.5">
              Confirm diagnosis and local product label before applying any pesticide or fungicide. Chemical choices and application rates should always be verified with your local Krishi Vigyan Kendra (KVK) or Kisan Call Centre (1800-180-1551).
            </p>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="pt-4 border-t border-border flex flex-col sm:flex-row gap-3">
          {onAskKisan && (
            <AgriButton
              variant="magic"
              onClick={handleAskKisanAssistant}
              className="flex-1 py-3 font-bold flex items-center justify-center gap-2"
            >
              <MessageSquare size={18} /> Ask Kisan Sahayak about this scan
            </AgriButton>
          )}
          <AgriButton variant="outline" onClick={handleReset} className="py-3 font-bold">
            <Scan size={16} /> Analyze Another Crop
          </AgriButton>
        </div>
      </div>
    );
  };

  return (
    <div className="pb-24 pt-4 px-4 min-h-screen flex flex-col">
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

      <div className="mb-6 flex justify-between items-start">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Scan className="text-emerald-600 dark:text-emerald-400" /> {t('svc.cropDoctor') || 'Smart Crop Doctor'}
            <Sparkles size={18} className="text-amber-500" />
          </h2>
          <p className="text-muted-foreground text-sm">
            {t('svc.cropDoctorSub') || 'AI-powered crop disease scan • Take or upload photos for instant analysis'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={toggleHistory}
            className={`p-2 rounded-full transition-colors ${showHistory ? "bg-emerald-500/15 text-emerald-600" : "text-muted-foreground hover:bg-muted"}`}
            title="Scan history"
          >
            <History size={20} />
          </button>
          <button
            onClick={() => setAutoSpeak(!autoSpeak)}
            className={`p-2 rounded-full transition-colors ${autoSpeak ? "bg-emerald-500/15 text-emerald-600" : "text-muted-foreground hover:bg-muted"}`}
            title={autoSpeak ? "Auto voice enabled" : "Auto voice disabled"}
          >
            {autoSpeak ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
        </div>
      </div>

      {/* History drawer panel */}
      {showHistory && (
        <div className="bg-card rounded-2xl border border-border shadow-md p-4 mb-6 max-h-72 overflow-y-auto">
          <div className="flex items-center justify-between mb-3 border-b border-border pb-2">
            <h3 className="font-bold text-foreground text-sm flex items-center gap-2"><History size={16} /> Scan History</h3>
            <button onClick={() => setShowHistory(false)} className="text-muted-foreground hover:text-foreground p-1"><X size={16} /></button>
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
                <div key={scan.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/70 hover:bg-muted">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">
                      {scan.crop || "Crop"} {scan.possible_issue ? `— ${scan.possible_issue}` : ""}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(scan.created_at).toLocaleDateString()} · {(HEALTH_LABELS[scan.health_status ?? ""] ?? scan.health_status ?? "Scanned")}
                      {scan.confidence != null ? ` · ${scan.confidence}%` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleDeleteScan(scan.id)}
                      className="text-muted-foreground hover:text-rose-500 p-1.5 rounded-lg"
                      title="Delete scan"
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
        <div className="flex-1 flex flex-col bg-card rounded-2xl border border-border p-6 mb-6 shadow-md">
          {/* Header prompt */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-emerald-500/15 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Sparkles size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Upload 1 to 4 photos of affected crop</p>
              <p className="text-xs text-muted-foreground">Whole plant, affected leaf, stem/fruit, or close-up</p>
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
                    <div key={img.id} className="relative rounded-xl overflow-hidden border border-border h-32 group bg-muted">
                      <SafeImage
                        src={img.previewUrl}
                        alt={img.role}
                        resolveType="crop"
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute top-2 left-2 bg-black/70 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
                        {img.role}
                      </span>
                      <button
                        onClick={() => removeImage(img.id)}
                        className="absolute top-2 right-2 bg-background/80 hover:bg-rose-600 hover:text-white text-muted-foreground p-1.5 rounded-full transition-colors shadow-sm"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  {images.length < MAX_IMAGES && (
                    <button
                      onClick={() => galleryInputRef.current?.click()}
                      className="h-32 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-1.5 text-muted-foreground hover:border-emerald-500 hover:text-emerald-600 transition-colors bg-muted/30"
                    >
                      <Plus size={20} />
                      <span className="text-xs font-bold">Add Photo ({images.length}/{MAX_IMAGES})</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="h-32 border-2 border-dashed border-emerald-500/40 rounded-xl flex flex-col items-center justify-center gap-2 text-emerald-800 dark:text-emerald-300 bg-emerald-50/40 dark:bg-emerald-950/20 hover:border-emerald-600 transition-all"
                >
                  <Camera size={28} className="text-emerald-600 dark:text-emerald-400" />
                  <span className="text-sm font-extrabold">Take Crop Photo</span>
                  <span className="text-[10px] opacity-75">Use mobile camera</span>
                </button>

                <button
                  onClick={() => galleryInputRef.current?.click()}
                  className="h-32 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-emerald-500 hover:text-emerald-600 transition-all bg-muted/20"
                >
                  <Upload size={28} />
                  <span className="text-sm font-bold">Choose from Gallery</span>
                  <span className="text-[10px] opacity-60">JPG, PNG, WebP (up to {MAX_FILE_MB}MB)</span>
                </button>
              </div>
            )}
          </div>

          {/* Description input */}
          <textarea
            className="w-full p-3 rounded-xl border border-border bg-muted focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-sm mb-4 min-h-[90px] text-foreground placeholder:text-muted-foreground font-medium"
            placeholder={t('doctor.placeholder') || "Describe symptoms (e.g., yellowing spots on soybean leaf, wilted stems...)"}
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />

          {error && (
            <div className="mb-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-700 dark:text-rose-400 text-xs flex items-start gap-2 font-bold">
              <AlertTriangle size={15} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Scan button */}
          <AgriButton
            variant="magic"
            onClick={handleDiagnosis}
            disabled={isLoading || images.length === 0}
            className="w-full py-3.5 font-extrabold text-base"
          >
            {isLoading ? (
              <>
                <Loader className="animate-spin" size={20} />
                Analyzing crop images with AI...
              </>
            ) : (
              <>
                <Scan size={20} /> Scan & Diagnose Crop ✨
              </>
            )}
          </AgriButton>
        </div>
      ) : (
        renderResultCard()
      )}

      {/* Practical Tips */}
      <div className="bg-emerald-50/70 dark:bg-emerald-950/30 p-4 rounded-xl flex items-start gap-3 border border-emerald-500/20 shadow-xs">
        <Info className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" size={20} />
        <div>
          <h4 className="font-bold text-emerald-900 dark:text-emerald-300 text-sm">Tips for Accurate Crop Scanning</h4>
          <ul className="text-xs text-foreground mt-1 space-y-1">
            <li>• Take a clear, close-up photo of affected leaf or fruit in good daylight.</li>
            <li>• Avoid direct sun reflection or blurry motion.</li>
            <li>• Upload multiple photos showing the whole plant and leaf undersides.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CropDoctor;