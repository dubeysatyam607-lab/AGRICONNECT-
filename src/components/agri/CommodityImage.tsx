import React, { useState } from "react";
import { AgriImage } from "@/components/ui/agri-image";
import { getCropImage, getCropCategory } from "@/lib/crop-images";
import { OFFLINE_AGRI_SVG } from "@/lib/image-resolver";
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
}

/**
 * Reusable Commodity Image component for Mandi Bhav and Crop Marketplaces.
 * Prioritizes:
 * 1. Valid API/Database image URL (if valid)
 * 2. High-resolution crop-specific verified Pexels photograph
 * 3. Agricultural category fallback
 * 4. Guaranteed offline SVG placeholder
 * Never shows broken image icons, null/undefined text, or blank white boxes.
 */
export const CommodityImage: React.FC<CommodityImageProps> = ({
  commodityName,
  commodityHi,
  src,
  category,
  alt,
  className = "w-full h-full object-cover",
  aspectRatio = "auto",
  loading = "lazy",
}) => {
  const [loadError, setLoadError] = useState(false);

  const cleanName = (commodityName || "").trim();
  const detectedCategory = category || getCropCategory(cleanName);
  const fallbackUrl = getCropImage(cleanName);
  const effectiveSrc = !loadError && src && src.trim() && src.startsWith("http") ? src : fallbackUrl;
  const descriptiveAlt = alt || `${cleanName}${commodityHi ? ` (${commodityHi})` : ""} - Real mandi crop produce`;

  return (
    <AgriImage
      src={effectiveSrc}
      type="crop"
      contextName={cleanName}
      seedKey={cleanName.toLowerCase()}
      category={detectedCategory.toLowerCase() as any}
      alt={descriptiveAlt}
      className={className}
      aspectRatio={aspectRatio}
      loading={loading}
      fallbackSrc={fallbackUrl || OFFLINE_AGRI_SVG}
      onError={() => {
        if (!loadError) {
          setLoadError(true);
        }
      }}
    />
  );
};
