import React, { useEffect, useRef, useState } from "react";
import { getCropImage } from "@/lib/crop-images";
import { searchVerifiedCropImage } from "@/lib/cropImageService";
import { cn } from "@/lib/utils";

export interface CommodityImageProps {
  commodityName: string;
  commodityHi?: string;
  src?: string | null;
  category?: string;
  alt?: string;
  className?: string;
  aspectRatio?: "square" | "video" | "wide" | "auto";
  loading?: "lazy" | "eager";
  containerClassName?: string;
}

/**
 * Mandi crop image that renders only a verified real photograph.
 *
 * Resolution order:
 *  1. Synchronous verified registry (CROP_IMAGE_MAP — fail-closed for unknown crops).
 *  2. On-demand async Pexels search with relevance validation + localStorage TTL cache.
 *  3. Clean, honest "image unavailable" placeholder (never an icon, emoji, or SVG).
 *
 * Supports a live fallback: if the curated image is missing, a single background search
 * is performed for that crop name. Duplicate in-flight searches are de-duplicated.
 */
export const CommodityImage: React.FC<CommodityImageProps> = ({
  commodityName,
  commodityHi,
  src,
  category,
  alt,
  className = "w-full h-full object-cover",
  loading = "lazy",
  containerClassName,
}) => {
  const rawName = (commodityName || "").trim();
  const cleanName = (rawName || "")
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim() || rawName;

  const curated = ((): string | undefined => {
    if (typeof src === "string" && src.startsWith("http")) return src;
    return getCropImage(rawName) || getCropImage(cleanName) || undefined;
  })();

  const [liveUrl, setLiveUrl] = useState<string | undefined>(undefined);
  const [searchPhase, setSearchPhase] = useState<"idle" | "searching" | "done" | "failed">(
    curated ? "done" : "idle",
  );
  const [imgLoadFailed, setImgLoadFailed] = useState(false);
  const lastKeyRef = useRef<string | null>(null);

  useEffect(() => {
    setLiveUrl(undefined);
    setImgLoadFailed(false);
    const key = rawName || cleanName || null;
    if (curated) {
      setSearchPhase("done");
      lastKeyRef.current = key;
      return;
    }
    if (!key || lastKeyRef.current === key) return;
    lastKeyRef.current = key;
    setSearchPhase("searching");
    let cancelled = false;
    searchVerifiedCropImage(key)
      .then((url) => {
        if (cancelled) return;
        setLiveUrl(url);
        setSearchPhase(url ? "done" : "failed");
      })
      .catch(() => {
        if (!cancelled) setSearchPhase("failed");
      });
    return () => { cancelled = true; };
  }, [rawName, cleanName, curated]);

  const effectiveUrl = curated || liveUrl;
  const unavailable = !effectiveUrl || imgLoadFailed;
  const descriptiveAlt =
    alt || `${cleanName}${commodityHi ? ` (${commodityHi})` : ""} - Real mandi crop produce`;

  return (
    <div className={cn("relative overflow-hidden bg-muted/20", containerClassName || className)}>
      {unavailable ? (
        <div
          className="flex items-center justify-center w-full h-full bg-slate-100 dark:bg-slate-800"
          aria-label={descriptiveAlt}
          role="img"
        >
          <div className="text-center px-3 select-none">
            <p className="text-[11px] font-semibold text-muted-foreground/80 leading-tight">{cleanName}</p>
            <p className="text-[9px] text-muted-foreground/50 leading-tight">Image unavailable</p>
          </div>
        </div>
      ) : (
        <img
          src={effectiveUrl}
          alt={descriptiveAlt}
          loading={loading}
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setImgLoadFailed(true)}
          className={cn("w-full h-full object-cover", className)}
        />
      )}
    </div>
  );
};

export default CommodityImage;
