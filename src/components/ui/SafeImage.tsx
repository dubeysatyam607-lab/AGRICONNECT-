import React, { useState, useEffect, useRef } from "react";
import { resolveImageUrl, OFFLINE_AGRI_SVG } from "@/lib/image-resolver";
import { cn } from "@/lib/utils";

export interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  /** The source URL or object containing the URL */
  src?: unknown;
  /** Category context for fallback resolution (e.g. 'crop', 'tractor', 'fertilizer') */
  category?: string;
  /** Specific entity name for better matching (e.g. 'Wheat', 'Mahindra 575') */
  entityName?: string;
  /** Type of image for the resolver */
  resolveType?: "crop" | "product" | "category" | "tractor" | "harvester" | "equipment" | "machinery" | "scheme" | "general";
  /** Fallback component to render if image fails and no resolved fallback works */
  fallbackIcon?: React.ReactNode;
  /** Keep aspect ratio using object-cover? Defaults to true */
  cover?: boolean;
}

/**
 * Reusable Production SafeImage component.
 * Features:
 * - Shimmer skeleton while loading
 * - Automatic resolution of verified high-res photo matching exact crop/machine/product
 * - Graceful fallback hierarchy (exact match -> category match -> offline SVG)
 * - Infinite loop prevention
 * - Zero layout shift with object-cover
 */
export function SafeImage({
  src,
  alt,
  className,
  category,
  entityName,
  resolveType = "general",
  fallbackIcon,
  cover = true,
  loading: nativeLoading = "lazy",
  ...props
}: SafeImageProps) {
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const retryCount = useRef(0);

  useEffect(() => {
    retryCount.current = 0;
    const resolved = resolveImageUrl(src, resolveType, entityName || category);
    setImgSrc(resolved || OFFLINE_AGRI_SVG);
    setLoading(true);
    setHasError(false);
  }, [src, resolveType, entityName, category]);

  const handleError = () => {
    if (retryCount.current === 0) {
      retryCount.current += 1;
      // Try resolving via category/type fallback
      const catFallback = resolveImageUrl(undefined, resolveType, category);
      if (catFallback && catFallback !== imgSrc) {
        setImgSrc(catFallback);
        return;
      }
    }
    
    if (retryCount.current === 1) {
      retryCount.current += 1;
      // Final guaranteed fallback: offline SVG
      setImgSrc(OFFLINE_AGRI_SVG);
      setLoading(false);
      return;
    }

    setHasError(true);
    setLoading(false);
  };

  const handleLoad = () => {
    setLoading(false);
    setHasError(false);
  };

  if (hasError && fallbackIcon) {
    return (
      <div 
        className={cn(
          "bg-muted/30 flex items-center justify-center overflow-hidden",
          className
        )}
        aria-label={alt || entityName || "Agricultural Produce"}
      >
        {fallbackIcon}
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden bg-muted/20", className)}>
      {imgSrc && (
        <img
          src={imgSrc}
          alt={alt || entityName || "AgriConnect verified image"}
          onError={handleError}
          onLoad={handleLoad}
          loading={nativeLoading}
          decoding="async"
          className={cn(
            "w-full h-full transition-all duration-300",
            cover ? "object-cover" : "object-contain",
            loading ? "opacity-0 scale-95" : "opacity-100 scale-100"
          )}
          {...props}
        />
      )}
      {loading && (
        <div className="absolute inset-0 bg-gradient-to-r from-muted/30 via-muted/50 to-muted/30 animate-pulse" />
      )}
    </div>
  );
}

export default SafeImage;
