import React, { useEffect, useRef, useState } from "react";
import { getCropImage } from "@/lib/crop-images";
import { searchVerifiedCropImage } from "@/lib/cropImageService";
import { getRelevantImage } from "@/lib/imageService";
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
 * Mandi crop image component powered by AgriConnect Centralized Image System.
 * Renders verified real agricultural photography for every crop commodity.
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
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim() || rawName;

  const curated = getRelevantImage({
    entityType: "crop",
    name: cleanName,
    category,
    src,
  });

  const [liveUrl, setLiveUrl] = useState<string | undefined>(undefined);
  const [imgLoadFailed, setImgLoadFailed] = useState(false);

  useEffect(() => {
    setLiveUrl(undefined);
    setImgLoadFailed(false);
    const key = rawName || cleanName;
    if (!key) return;

    let cancelled = false;
    searchVerifiedCropImage(key)
      .then((url) => {
        if (!cancelled && url) setLiveUrl(url);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [rawName, cleanName]);

  const effectiveUrl = (!imgLoadFailed && liveUrl) || curated || getRelevantImage({ entityType: "crop", name: cleanName, category });
  const descriptiveAlt = alt || `${cleanName}${commodityHi ? ` (${commodityHi})` : ""} - Real crop produce`;

  return (
    <div className={cn("relative overflow-hidden bg-muted/20", containerClassName || className)}>
      <img
        src={effectiveUrl}
        alt={descriptiveAlt}
        loading={loading}
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setImgLoadFailed(true)}
        className={cn("w-full h-full object-cover transition-opacity duration-300", className)}
      />
    </div>
  );
};

export default CommodityImage;
