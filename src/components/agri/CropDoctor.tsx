import React, { useState, useRef, useEffect, useCallback } from "react";
import { Scan, Sparkles, Loader, X, Camera, Info, Upload, Volume2, VolumeX, History, RotateCcw, AlertTriangle } from "lucide-react";
import { AgriButton } from "@/components/ui/agri-button";
import { useToast } from "@/hooks/use-toast";
import { invokeEdgeWithTimeout } from "@/lib/invoke-edge";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { fetchScanHistory, deleteScan, type StoredScan } from "@/lib/ai-persistence";
import { speakText, stopSpeaking, textForSpeech, detectLanguageOf } from "@/core/voice";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_RAW_IMAGE_MB,
  MAX_PAYLOAD_IMAGE_MB,
  compressImageFile,
  classifyEdgeError,
  SCAN_ERROR_KEYS,
  type ScanErrorCode,
  uploadScanImage,
} from "@/lib/crop-scan";
import { CameraCapture } from "./CameraCapture";

// Structured crop scan result (spec §15).
interface CropScanResult {
  crop?: string | null;
  plant_part?: string | null;
  health_status?: string | null;
  possible_issue?: string | null;
  confidence?: number | null;
  symptoms?: string[];
  recommendations?: string[];
  urgency?: string | null;
  needs_clearer_image?: boolean;
  next_steps_for_farmer?: string[];
  expert_confirm?: string | null;
}

const HEALTH_LABELS: Record<string, string> = {
  "possible disease": "Possible Disease",
  "possible pest": "Possible Pest",
  "possible deficiency": "Possible Deficiency",
  "possible water stress": "Possible Water Stress",
  "possible environmental stress": "Possible Environmental Stress",
  healthy: "Healthy",
  unclear: "Needs a clearer photo",
  error: "Analysis incomplete",
};

const URGENCY_STYLES: Record<string, string> = {
  low: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  medium: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  high: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  urgent: "bg-rose-500/15 text-rose-400 border-rose-500/30",
};

const LOW_CONFIDENCE = 40;

const CropDoctor: React.FC = () => {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<CropScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<ScanErrorCode | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [previewFailed, setPreviewFailed] = useState(false);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);

  const speakResultText = useCallback(() => {
    if (!result) return;
    const parts = [
      result.possible_issue,
      result.symptoms?.join(". "),
      result.recommendations?.join(". "),
      result.next_steps_for_farmer?.join(". "),
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

  const [autoSpeak, setAutoSpeak] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<StoredScan[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const { languageName, t } = useLanguage();
  const isHindi = languageName.toLowerCase().includes("hindi");

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

  /**
   * Shared accept pipeline for both the file picker and the in-app camera.
   * Validates type + size, compresses/resizes, then stores preview + payload.
   * Never renders a broken preview: on load failure we show a neutral notice.
   */
  const acceptImage = async (file: File) => {
    const type = file.type || "";
    if (!ALLOWED_IMAGE_TYPES.includes(type)) {
      setError(t("doctor.error.invalidType"));
      toast({ title: t("doctor.error.invalidTypeTitle") || "Invalid file", description: t("doctor.error.invalidType"), variant: "destructive" });
      return;
    }

    if (file.size > MAX_RAW_IMAGE_MB * 1024 * 1024) {
      setError(t("doctor.error.tooLarge"));
      toast({ title: t("doctor.error.tooLargeTitle") || "File too large", description: t("doctor.error.tooLarge"), variant: "destructive" });
      return;
    }

    setIsUploading(true);
    setError(null);
    try {
      const compressed = await compressImageFile(file);
      if (compressed.blob.size > MAX_PAYLOAD_IMAGE_MB * 1024 * 1024) {
        setError(t("doctor.error.compressed"));
        toast({ title: t("doctor.error.tooLargeTitle") || "Image too large", description: t("doctor.error.compressed"), variant: "destructive" });
        return;
      }
      setImageDataUrl(compressed.dataUrl);
      setImageBlob(compressed.blob);
      setImagePreview(compressed.dataUrl);
      setPreviewFailed(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("doctor.error.compress");
      setError(msg);
      toast({ title: t("doctor.error.uploadFailedTitle") || "Upload failed", description: msg, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await acceptImage(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCameraCapture = async (blob: Blob) => {
    setCameraOpen(false);
    const file = new File([blob], "crop-camera.jpg", { type: "image/jpeg" });
    await acceptImage(file);
  };

  /**
   * Honest error mapping for the edge call. NEVER falls back to a fabricated
   * local "diagnosis" — keyword-matched disease names with fake pesticide doses
   * are dangerous and removed.
   */
  const handleDiagnosis = async () => {
    if (!imageDataUrl) {
      setError(t("doctor.error.photo"));
      toast({ title: t("svc.cropDoctor") || "Photo required", description: t("doctor.error.photo"), variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setError(null);
    setErrorCode(null);
    setResult(null);

    try {
      // Secure upload (best-effort): persist compressed photo to private bucket.
      const upload = await uploadScanImage(user?.id, imageBlob);

      const { data, error: err, code, timedOut } = await invokeEdgeWithTimeout<{ result: CropScanResult }>(
        "crop-doctor",
        {
          description: input,
          imageBase64: imageDataUrl,
          language: languageName,
          storagePath: upload.ok ? upload.storagePath : null,
          mimeType: imageBlob?.type || "image/jpeg",
        },
        30000,
      );

      if (err) {
        const resolvedCode = (code as ScanErrorCode | null) || classifyEdgeError(err, timedOut, navigator.onLine);
        setErrorCode(resolvedCode);
        if (resolvedCode === "validation") {
          setError(err);
        } else {
          setError(t(SCAN_ERROR_KEYS[resolvedCode]));
        }
        return;
      }

      if (!data?.result) {
        setErrorCode("api");
        setError(t("doctor.error.api"));
        return;
      }

      const diagnosticResult = data.result;
      setResult(diagnosticResult);

      if (diagnosticResult.needs_clearer_image) {
        setError(t("agr195"));
      }

      loadHistory();
      if (autoSpeak && (diagnosticResult.possible_issue || diagnosticResult.health_status)) {
        setTimeout(speakResultText, 500);
      }
    } catch {
      setErrorCode("api");
      setError(t("doctor.error.api"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    stopSpeaking();
    setResult(null);
    setError(null);
    setErrorCode(null);
    setInput("");
    setImagePreview(null);
    setImageDataUrl(null);
    setImageBlob(null);
    setPreviewFailed(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDeleteScan = async (scanId: string) => {
    const ok = await deleteScan(scanId);
    if (ok) setHistory((h) => h.filter((s) => s.id !== scanId));
  };

  // Inline preview for the user's own photo — unambiguous fallback on error.
  const renderLocalPreview = (className: string, alt: string) => {
    if (previewFailed || !imagePreview) {
      return (
        <div className={`${className} bg-muted flex flex-col items-center justify-center gap-1`}>
          <Info size={20} className="text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground font-semibold">{t("doctor.error.preview")}</span>
        </div>
      );
    }
    return (
      <img
        src={imagePreview}
        alt={alt}
        className="w-full h-full object-cover"
        onError={() => setPreviewFailed(true)}
      />
    );
  };

  const renderResultCard = () => {
    if (!result) return null;
    const confidence = result.confidence ?? null;
    const clarityWarning = result.needs_clearer_image;
    const lowConfidence = confidence != null && confidence < LOW_CONFIDENCE;

    return (
      <div className="flex-1 bg-card rounded-2xl border border-feature-ai/20 shadow-card p-6 overflow-y-auto mb-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="text-feature-ai" size={20} />
            <h3 className="font-bold text-foreground">{t('agr194')}</h3>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSpeakResponse}
              className={`p-2 rounded-full transition-colors ${isSpeaking ? "bg-primary/10 text-primary" : "hover:bg-muted text-muted-foreground hover:text-primary"}`}
              title={isSpeaking ? "Stop speaking" : "Listen"}
            >
              {isSpeaking ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <button onClick={handleReset} className="p-1 hover:bg-muted rounded-full transition-colors">
              <X size={18} className="text-muted-foreground" />
            </button>
          </div>
        </div>

        {imagePreview && (
          <div className="w-full h-32 rounded-lg mb-4 border border-border overflow-hidden">
            {renderLocalPreview("w-full h-full", "Analyzed crop")}
          </div>
        )}

        {/* Honesty banner — required spec copy */}
        <div className="flex items-start gap-2 mb-4 p-3 rounded-xl bg-sky-500/10 border border-sky-500/25 text-sky-700 dark:text-sky-300 text-[11px] leading-relaxed">
          <Info size={14} className="shrink-0 mt-0.5" />
          <p><strong>{t('doctor.notDiagnosis') || 'AI assessment — not a definitive diagnosis.'}</strong></p>
        </div>

        {clarityWarning && (
          <div className="flex items-start gap-2 mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-400 text-xs">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            <p>{t('agr195')}</p>
          </div>
        )}

        {(lowConfidence || (confidence == null && !clarityWarning)) && (
          <div className="flex items-start gap-2 mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-400 text-xs">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            <p>{t('doctor.lowConfidence')}</p>
          </div>
        )}

        {/* Crop + plant part */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-muted rounded-xl p-3">
            <p className="text-[10px] uppercase text-muted-foreground">{t('agr196')}</p>
            <p className="font-bold text-foreground text-sm">{result.crop || t('doctor.entityUnknown')}</p>
          </div>
          <div className="bg-muted rounded-xl p-3">
            <p className="text-[10px] uppercase text-muted-foreground">{t('agr197')}</p>
            <p className="font-bold text-foreground text-sm">{result.plant_part || t('doctor.entityUnknown')}</p>
          </div>
        </div>

        {/* Health status + confidence */}
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <span className={`text-xs font-bold px-3 py-1.5 rounded-full border ${URGENCY_STYLES[result.urgency ?? "low"]}`}>
            {(HEALTH_LABELS[result.health_status ?? ""] ?? result.health_status ?? "Analyzing").toUpperCase()}
          </span>
          {confidence != null ? (
            <span className="text-xs font-bold text-muted-foreground">
              AI confidence: <span className="text-foreground">{confidence}%</span>
            </span>
          ) : (
            <span className="text-xs font-bold text-muted-foreground">{t('doctor.noConfidence')}</span>
          )}
        </div>

        {result.possible_issue && (
          <p className="text-sm font-semibold text-foreground mb-3 leading-relaxed">{result.possible_issue}</p>
        )}

        {!!result.symptoms?.length && (
          <div className="mb-4">
            <h4 className="text-xs font-bold text-muted-foreground uppercase mb-1.5">{t('agr198')}</h4>
            <ul className="list-disc pl-5 text-sm text-foreground space-y-0.5">
              {result.symptoms.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </div>
        )}

        {!!result.recommendations?.length && (
          <div className="mb-4">
            <h4 className="text-xs font-bold text-muted-foreground uppercase mb-1.5">{t('agr199')}</h4>
            <ul className="list-disc pl-5 text-sm text-foreground space-y-0.5">
              {result.recommendations.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </div>
        )}

        {!!result.next_steps_for_farmer?.length && (
          <div className="mb-4">
            <h4 className="text-xs font-bold text-muted-foreground uppercase mb-1.5">{t('agr200')}</h4>
            <ul className="list-disc pl-5 text-sm text-foreground space-y-0.5">
              {result.next_steps_for_farmer.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </div>
        )}

        {result.expert_confirm && (
          <div className="bg-feature-community/10 border border-feature-community/20 rounded-xl p-3 text-xs text-foreground">
            <span className="font-bold text-feature-community">{t('agr201')} </span>
            {result.expert_confirm}
          </div>
        )}

        {/* Trust & Transparency Disclaimer */}
        <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-800 dark:text-emerald-300 text-[11px] leading-relaxed flex items-start gap-2">
          <Info size={14} className="shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
          <p>
            <strong>{t('doctor.disclaimer.title') || 'AI-generated result'}:</strong> {t('doctor.disclaimer.desc') || 'This is a preliminary crop analysis. For confirmed chemical treatments or severe infestations, consult your local Krishi Vigyan Kendra (KVK) or block agriculture officer.'}
          </p>
        </div>

        <div className="mt-4 pt-4 border-t border-border">
          <AgriButton variant="outline" onClick={handleReset} className="w-full">
            <Scan size={16} /> {t('doctor.analyzeAnother') || 'Analyze Another Crop'}
          </AgriButton>
        </div>
      </div>
    );
  };

  return (
    <div className="pb-24 pt-4 px-4 min-h-screen flex flex-col">
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Scan className="text-primary" /> {t('svc.cropDoctor') || 'Smart Crop Doctor'}
            <Sparkles size={18} className="text-feature-ai" />
          </h2>
          <p className="text-muted-foreground text-sm">
            {t('svc.cropDoctorSub') || 'AI-powered disease detection • Upload photo for accurate results'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={toggleHistory}
            className={`p-2 rounded-full transition-colors ${showHistory ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}
            title="Scan history"
          >
            <History size={20} />
          </button>
          <button
            onClick={() => setAutoSpeak(!autoSpeak)}
            className={`p-2 rounded-full transition-colors ${autoSpeak ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}
            title={autoSpeak ? "Auto voice enabled" : "Auto voice disabled"}
          >
            {autoSpeak ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
        </div>
      </div>

      {/* Scan history panel */}
      {showHistory && (
        <div className="bg-card rounded-2xl border border-border shadow-card p-4 mb-6 max-h-72 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-foreground text-sm flex items-center gap-2"><History size={16} /> {t('doctor.scanHistory') || 'Scan History'}</h3>
            <button onClick={() => setShowHistory(false)} className="text-muted-foreground hover:text-foreground p-1"><X size={16} /></button>
          </div>
          {!user ? (
            <p className="text-xs text-muted-foreground">{t('agr202')}</p>
          ) : historyLoading ? (
            <p className="text-xs text-muted-foreground flex items-center gap-2"><Loader className="animate-spin" size={14} /> {t('common.loading') || 'Loading scans...'}</p>
          ) : history.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t('agr203')}</p>
          ) : (
            <div className="space-y-2">
              {history.map((scan) => (
                <div key={scan.id} className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-muted">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">
                      {scan.crop || "Crop"} {scan.possible_issue ? `— ${scan.possible_issue}` : ""}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(scan.created_at).toLocaleDateString()} · {(HEALTH_LABELS[scan.health_status ?? ""] ?? scan.health_status ?? "Scanned")}
                      {scan.confidence != null ? ` · ${scan.confidence}%` : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteScan(scan.id)}
                    className="text-muted-foreground hover:text-rose-400 p-1.5 shrink-0"
                    title="Delete scan"
                  >
                    <Trash2Icon />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!result ? (
        <div className="flex-1 flex flex-col bg-card rounded-2xl border border-border p-6 mb-6 shadow-card">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-feature-ai/15 rounded-full flex items-center justify-center text-feature-ai">
              <Sparkles size={20} />
            </div>
            <p className="text-sm font-semibold text-foreground">
              {t('doctor.promptTitle') || 'Describe your crop issue or upload a photo'}
            </p>
          </div>

          <div className="mb-4">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageUpload}
              ref={fileInputRef}
              className="hidden"
            />

            {imagePreview ? (
              <div className="relative">
                <div className="w-full h-40 rounded-xl border border-border overflow-hidden">
                  {renderLocalPreview("w-full h-full", "Crop preview")}
                </div>
                <button
                  onClick={() => { setImagePreview(null); setImageDataUrl(null); setImageBlob(null); setPreviewFailed(false); }}
                  className="absolute top-2 right-2 bg-background/80 p-2 rounded-full"
                  aria-label="Remove photo"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-32 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                disabled={isUploading}
              >
                {isUploading ? <Loader className="animate-spin" size={24} /> : <Upload size={24} />}
                <span className="text-sm font-bold">{t('agr204')}</span>
                <span className="text-xs opacity-60">{t('agr205')}</span>
              </button>
            )}
          </div>

          <textarea
            className="w-full p-3 rounded-xl border border-border bg-muted focus:border-primary focus:ring-1 focus:ring-primary outline-none text-base sm:text-sm mb-4 min-h-[100px] text-foreground placeholder:text-muted-foreground font-medium"
            placeholder={t('doctor.placeholder') || "E.g., My wheat leaves are turning yellow at the tips with brown spots..."}
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs flex items-start gap-2 font-bold">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <AgriButton
            variant="magic"
            onClick={handleDiagnosis}
            disabled={isLoading || isUploading || !imageDataUrl}
            className="w-full py-3 font-bold"
          >
            {isLoading ? (
              <>
                <Loader className="animate-spin" size={20} />
                {t('doctor.analyzing') || 'Analyzing...'}
              </>
            ) : (
              <>
                <Scan size={20} /> {t('doctor.diagnoseButton') || 'Diagnose with AI ✨'}
              </>
            )}
          </AgriButton>

          <div className="mt-6 pt-4 border-t border-border text-center">
            <p className="text-muted-foreground text-xs mb-3 font-semibold">
              {t('doctor.orCamera') || 'Or take a photo with camera'}
            </p>
            <button
              onClick={() => setCameraOpen(true)}
              className="mx-auto w-14 h-14 bg-card rounded-full shadow-soft flex items-center justify-center text-muted-foreground border border-border active:scale-95 transition-transform hover:border-primary hover:text-primary"
              aria-label="Open camera"
            >
              <Camera size={24} />
            </button>
          </div>
        </div>
      ) : (
        renderResultCard()
      )}

      <div className="bg-feature-community/10 p-4 rounded-xl flex items-start gap-3 border border-feature-community/20">
        <Info className="text-feature-community shrink-0 mt-0.5" size={20} />
        <div>
          <h4 className="font-bold text-feature-community text-sm">{t('agr206')}</h4>
          <ul className="text-xs text-foreground mt-1 space-y-1">
            <li>• {t('doctor.tip1') || 'Upload a clear, close-up photo of affected area'}</li>
            <li>• {t('doctor.tip2') || 'Mention crop name and growth stage'}</li>
            <li>• {t('doctor.tip3') || 'Describe color changes, spots, or insects'}</li>
          </ul>
        </div>
      </div>

      <CameraCapture
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={handleCameraCapture}
      />
    </div>
  );
};

const Trash2Icon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

export default CropDoctor;