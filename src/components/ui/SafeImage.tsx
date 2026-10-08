import React, { useState, useEffect } from "react";
import {
  getRealFallbackImage,
  getExactCategoryFallbackSvg,
  invalidateImageUrl,
  OFFLINE_AGRI_SVG,
  isValidImageUrl,
} from "@/lib/image-resolver";
import { getRelevantImage } from "@/lib/imageService";
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
    | "mandi"
    | "labour"
    | "news"
    | "weather"
    | "soil_testing"
    | "scheme"
    | "marketplace"
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
 * - Instant loading with shimmer skeleton
 * - Exact-entity photographic resolution & category-accurate fallbacks
 * - Guaranteed Data-URI SVG fallback that NEVER fails (100% network/offline proof)
 * - Zero broken-image icons guaranteed across the entire application
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

    // 2. Master dictionary & imageService exact-entity photograph
    const exactPhoto = getRelevantImage({
      entityType: resolveType as any,
      name: effectiveName,
      category,
      src,
    });
    if (exactPhoto && isValidImageUrl(exactPhoto) && !list.includes(exactPhoto)) {
      list.push(exactPhoto);
    }

    // 3. Category real photography fallback
    const realFallback = getRealFallbackImage(resolveType as any, effectiveName, category);
    if (realFallback && isValidImageUrl(realFallback) && !list.includes(realFallback)) {
      list.push(realFallback);
    }

    // 4. Guaranteed Master Real High-Resolution Agriculture Photography Fallback
    const masterPhotoFallback = "https://images.pexels.com/photos/11688197/pexels-photo-11688197.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=627&w=940";
    if (!list.includes(masterPhotoFallback)) {
      list.push(masterPhotoFallback);
    }

    // 5. Guaranteed Data-URI SVG Fallback (100% offline & network failure proof)
    const guaranteedSvg = getExactCategoryFallbackSvg(resolveType as any, effectiveName, category) || OFFLINE_AGRI_SVG;
    if (!list.includes(guaranteedSvg)) {
      list.push(guaranteedSvg);
    }

    setCandidates(list);
    setCandidateIndex(0);
    setLoading(true);
    setHasError(false);
  }, [src, resolveType, effectiveName, category]);

  const currentSrc = candidates[candidateIndex] || getExactCategoryFallbackSvg(resolveType as any, effectiveName, category) || OFFLINE_AGRI_SVG;

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
        className={cn(
          "w-full h-full transition-opacity duration-300",
          cover ? "object-cover" : "object-contain",
          loading ? "opacity-0" : "opacity-100",
          className
        )}
        {...props}
      />
      {loading && (
        <div className="absolute inset-0 bg-muted/60 dark:bg-slate-800/60 animate-pulse pointer-events-none" />
      )}
    </div>
  );
}

export default SafeImage;
