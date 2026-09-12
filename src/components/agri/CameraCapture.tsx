import React, { useEffect, useRef, useState } from "react";
import { Camera, X, Aperture, RefreshCw, Check, Loader } from "lucide-react";
import { AgriButton } from "@/components/ui/agri-button";
import { useLanguage } from "@/contexts/LanguageContext";
import { blobToDataUrl } from "@/lib/crop-scan";

type CameraStatus = "starting" | "active" | "error";

interface CameraCaptureProps {
  open: boolean;
  onClose: () => void;
  onCapture: (blob: Blob) => void;
}

/**
 * In-app camera capture with honest permission/cancellation/availability
 * handling. Uses getUserMedia so a denied camera permission surfaces a clear
 * message instead of silently doing nothing.
 */
export const CameraCapture: React.FC<CameraCaptureProps> = ({ open, onClose, onCapture }) => {
  const { t } = useLanguage();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraStatus>("starting");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [captured, setCaptured] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const start = async () => {
    stopStream();
    setCaptured(null);
    setCapturedBlob(null);
    setErrorMsg("");

    const md = (navigator as Navigator).mediaDevices;
    if (!md || typeof md.getUserMedia !== "function") {
      setErrorMsg(t("doctor.camera.unavailable"));
      setStatus("error");
      return;
    }

    setStatus("starting");
    try {
      const stream = await md.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play().catch(() => undefined);
      }
      setStatus("active");
    } catch (err) {
      const name = (err as { name?: string })?.name || "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError" || name === "SecurityError") {
        setErrorMsg(t("doctor.camera.permission"));
      } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        setErrorMsg(t("doctor.camera.unavailable"));
      } else if (name === "OverconstrainedError" || name === "ConstraintNotSatisfiedError") {
        setErrorMsg(t("doctor.camera.unavailable"));
      } else {
        setErrorMsg(t("doctor.camera.startError"));
      }
      stopStream();
      setStatus("error");
    }
  };

  useEffect(() => {
    if (open) {
      start();
    } else {
      stopStream();
      setCaptured(null);
      setCapturedBlob(null);
    }
    return () => stopStream();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const capture = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || captured) return;

    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 1280 / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setErrorMsg(t("doctor.camera.captureError"));
      return;
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(async (blob) => {
      if (!blob) {
        setErrorMsg(t("doctor.camera.captureError"));
        return;
      }
      setCapturedBlob(blob);
      setCaptured(await blobToDataUrl(blob).catch(() => null));
      video.pause();
    }, "image/jpeg", 0.85);
  };

  const retake = () => {
    setCaptured(null);
    setCapturedBlob(null);
    videoRef.current?.play().catch(() => undefined);
  };

  const usePhoto = () => {
    if (capturedBlob) onCapture(capturedBlob);
  };

  const close = () => {
    stopStream();
    setCaptured(null);
    setCapturedBlob(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black/80 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md bg-card rounded-2xl border border-border shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
            <Camera size={16} className="text-primary" /> {t("doctor.camera.title")}
          </h3>
          <button onClick={close} className="text-muted-foreground hover:text-foreground p-1" aria-label="Close camera">
            <X size={18} />
          </button>
        </div>

        <div className="relative bg-black aspect-[4/3]">
          {captured ? (
            <img src={captured} alt="Captured crop" className="w-full h-full object-cover" />
          ) : (
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className="w-full h-full object-cover"
              aria-label="Camera preview"
            />
          )}
          {status === "starting" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/90">
              <Loader className="animate-spin" size={24} />
              <p className="text-xs">Starting camera…</p>
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-3 py-2 text-[10px] text-white/90">
            {status === "active" && !captured ? "Hold the crop steady and well-lit, close to the camera" : ""}
          </div>
        </div>

        <div className="p-4">
          {status === "error" ? (
            <div className="flex flex-col items-center gap-3">
              <p className="text-xs text-rose-400 text-center font-semibold">{errorMsg}</p>
              <div className="flex gap-2 w-full">
                <AgriButton variant="outline" onClick={start} className="flex-1">
                  <RefreshCw size={14} /> {t("doctor.error.retry") || "Retry"}
                </AgriButton>
                <AgriButton variant="outline" onClick={close} className="flex-1">
                  <X size={14} /> {t("doctor.camera.close")}
                </AgriButton>
              </div>
            </div>
          ) : captured ? (
            <div className="flex gap-2">
              <AgriButton variant="outline" onClick={retake} className="flex-1">
                <RefreshCw size={14} /> {t("doctor.camera.retake")}
              </AgriButton>
              <AgriButton variant="magic" onClick={usePhoto} className="flex-1">
                <Check size={14} /> {t("doctor.camera.use")}
              </AgriButton>
            </div>
          ) : (
            <div className="flex gap-2">
              <AgriButton variant="outline" onClick={close} className="flex-1">
                <X size={14} /> {t("doctor.camera.close")}
              </AgriButton>
              <AgriButton
                variant="magic"
                onClick={capture}
                className="flex-1"
                disabled={status !== "active"}
              >
                <Aperture size={14} /> {t("doctor.camera.capture")}
              </AgriButton>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CameraCapture;