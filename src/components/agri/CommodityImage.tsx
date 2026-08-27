import React, { useState } from "react";
import { SafeImage } from "@/components/ui/SafeImage";
import { getCropImage, getCropCategory, getCropBackupImage } from "@/lib/crop-images";

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
 * 1. 100% Verified High-Resolution Real Photograph from Master Crop Registry
 * 2. Agricultural Category Fallback
 * 3. Never shows broken image icons, null/undefined text, or blank boxes.
 */
export const CommodityImage: React.FC<CommodityImageProps> = ({
  commodityName,
  commodityHi,
  src,
  category,
  alt,
  className = "w-full h-full object-cover",
  loading = "lazy",
}) => {
  const [loadError, setLoadError] = useState(false);

  const rawName = (commodityName || "").trim();
  const cleanName = rawName.replace(/\([^)]*\)/g, " ").replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim() || rawName;
  const detectedCategory = category || getCropCategory(cleanName);
  
  // Prioritize 100% verified crop image directly mapped to the commodity
  const verifiedUrl = getCropImage(rawName) || getCropImage(cleanName);
  const effectiveSrc = (!loadError && verifiedUrl) ? verifiedUrl : (src && src.startsWith("http") ? src : getCropBackupImage(cleanName));
  const descriptiveAlt = alt || `${cleanName}${commodityHi ? ` (${commodityHi})` : ""} - Real mandi crop produce`;

  return (
    <SafeImage
      src={effectiveSrc}
      resolveType="crop"
      entityName={cleanName}
      category={detectedCategory.toLowerCase()}
      alt={descriptiveAlt}
      className={className}
      loading={loading}
      fallbackIcon={<div className="text-4xl">🌾</div>}
      cover={true}
    />
  );
};
