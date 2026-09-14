import React, { useEffect, useState } from "react";
import { SafeImage } from "@/components/ui/SafeImage";
import { getRelevantImage } from "@/lib/imageService";
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
 * Mandi crop image component powered by AgriConnect Centralized Image System & SafeImage Engine.
 * Guarantees high-resolution real agricultural photography for every crop commodity,
 * with multi-tiered fallback to category photos and vector SVGs. Zero broken boxes.
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

  useEffect(() => {
    setLiveUrl(undefined);
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

  const descriptiveAlt = alt || `${cleanName}${commodityHi ? ` (${commodityHi})` : ""} - Real crop produce`;
  const initialSrc = liveUrl || curated || src || cleanName;

  return (
    <SafeImage
      src={initialSrc}
      alt={descriptiveAlt}
      entityName={cleanName}
      category={category}
      resolveType="crop"
      loading={loading}
      containerClassName={cn("w-full h-full", containerClassName)}
      className={className}
    />
  );
};

export default CommodityImage;

