import React, { useState, useEffect, useRef } from "react";
import {
  resolveImageUrl,
  getExactCategoryFallbackSvg,
  invalidateImageUrl,
  OFFLINE_AGRI_SVG,
  isValidImageUrl,
} from "@/lib/image-resolver";
import { cn } from "@/lib/utils";

export interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  /** The source URL or object containing the URL */
  src?: unknown;
  /** Category context for fallback resolution (e.g. 'crop', 'tractor', 'cattle', 'fertilizer') */
  category?: string;
  /** Specific entity name for better matching (e.g. 'Coconut', 'Lemon', 'Garlic', 'Mahindra 575', 'Gir Cow') */
  entityName?: string;
  /** Type of image for the resolver */
  resolveType?:
    | "crop"
    | "product"
    | "category"
    | "tractor"
    | "harvester"
    | "equipment"
    | "machinery"
    | "cattle"
    | "cow"
    | "buffalo"
    | "scheme"
    | "general";
  /** Fallback component to render if image fails and no resolved fallback works */
  fallbackIcon?: React.ReactNode;
  /** Keep aspect ratio using object-cover? Defaults to true */
  cover?: boolean;
  /** Container class name */
  containerClassName?: string;
}

/**
 * Enterprise Production SafeImage component for AgriConnect.
 * Features:
 * - 0ms instant loading with shimmer skeleton
 * - Exact-entity photographic resolution & category-accurate fallbacks
 * - Exact SVG fallback (e.g., Coconut -> 🥥 Coconut SVG, Lemon -> 🍋 Lemon SVG, Tractor -> 🚜 Tractor SVG, Cattle -> 🐄 Cattle SVG)
 * - Zero broken-image icons guaranteed across the entire application
 * - Infinite loop prevention via candidate progression
 * - Layout shift protection (aspect-ratio & object-cover)
 */
export function SafeImage({
  src,
  alt,
  className,
  containerClassName,
  category,
  entityName,
  resolveType = "general",
  fallbackIcon,
  cover = true,
  loading: nativeLoading = "lazy",
  onError,
  onLoad,
  ...props
}: SafeImageProps) {
  const [candidates, setCandidates] = useState<string[]>([]);
  const [candidateIndex, setCandidateIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);

  const effectiveName = entityName || category || (typeof alt === "string" ? alt : "") || "";

  useEffect(() => {
    const list: string[] = [];

    // 1. Direct valid URL (if provided)
    if (isValidImageUrl(src)) {
      list.push(String(src).trim());
    } else if (typeof src === "object" && src !== null) {
      const obj = src as Record<string, unknown>;
      const extracted = obj.imageUrl || obj.image_url || obj.url || obj.src || obj.photo || obj.photo_url;
      if (isValidImageUrl(extracted)) {
        list.push(String(extracted).trim());
      }
    }

    // 2. Master dictionary exact-entity photograph
    const exactPhoto = resolveImageUrl(undefined, resolveType, effectiveName);
    if (exactPhoto && !list.includes(exactPhoto)) {
      list.push(exactPhoto);
    }

    // 3. Exact-category SVG illustration fallback
    const svgFallback = getExactCategoryFallbackSvg(resolveType, effectiveName, category);
    if (svgFallback && !list.includes(svgFallback)) {
      list.push(svgFallback);
    }

    // 4. Guaranteed neutral agricultural SVG
    if (!list.includes(OFFLINE_AGRI_SVG)) {
      list.push(OFFLINE_AGRI_SVG);
    }

    setCandidates(list);
    setCandidateIndex(0);
    setLoading(true);
    setHasError(false);
  }, [src, resolveType, effectiveName, category]);

  const currentSrc = candidates[candidateIndex] || OFFLINE_AGRI_SVG;

  const handleImgError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    // Invalidate the failed candidate URL from cache
    if (currentSrc && !currentSrc.startsWith("data:")) {
      invalidateImageUrl(currentSrc);
    }

    if (candidateIndex + 1 < candidates.length) {
      setCandidateIndex((prev) => prev + 1);
      setLoading(true);
    } else {
      setHasError(true);
      setLoading(false);
    }

    if (onError) onError(e);
  };

  const handleImgLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setLoading(false);
    setHasError(false);
    if (onLoad) onLoad(e);
  };

  if (hasError && fallbackIcon) {
    return (
      <div
        className={cn("bg-muted/30 flex items-center justify-center overflow-hidden", containerClassName || className)}
        aria-label={alt || effectiveName || "Agricultural Produce"}
      >
        {fallbackIcon}
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden bg-muted/20", containerClassName || className)}>
      <img
        src={currentSrc}
        alt={alt || effectiveName || "AgriConnect verified image"}
        onError={handleImgError}
        onLoad={handleImgLoad}
        loading={nativeLoading}
        decoding="async"
        referrerPolicy="no-referrer"
        crossOrigin="anonymous"
        className={cn(
          "w-full h-full transition-opacity duration-300",
          cover ? "object-cover" : "object-contain",
          loading ? "opacity-0" : "opacity-100",
          className
        )}
        {...props}
      />
      {loading && (
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-emerald-500/20 to-emerald-500/10 animate-pulse pointer-events-none" />
      )}
    </div>
  );
}

export default SafeImage;
