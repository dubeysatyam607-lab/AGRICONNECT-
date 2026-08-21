import React, { useState, useEffect } from "react";
import { resolveImageUrl, OFFLINE_AGRI_SVG, isValidImageUrl } from "@/lib/image-resolver";
import { cn } from "@/lib/utils";

export interface AgriImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string | null;
  alt?: string;
  type?: "crop" | "product" | "category" | "tractor" | "scheme" | "general";
  contextName?: string;
  fallbackSrc?: string;
  containerClassName?: string;
  aspectRatio?: string;
  showSkeleton?: boolean;
}

export const AgriImage: React.FC<AgriImageProps> = ({
  src,
  alt = "AgriConnect Asset",
  type = "general",
  contextName,
  fallbackSrc,
  containerClassName,
  className,
  aspectRatio,
  loading = "lazy",
  showSkeleton = true,
  onLoad,
  onError,
  ...props
}) => {
  const [currentSrc, setCurrentSrc] = useState<string>(() =>
    resolveImageUrl(src, type, contextName)
  );
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Sync when src or contextName changes
  useEffect(() => {
    const resolved = resolveImageUrl(src, type, contextName);
    setCurrentSrc(resolved);
    setIsLoaded(false);
    setHasError(false);
  }, [src, type, contextName]);

  const handleImgLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setIsLoaded(true);
    if (onLoad) onLoad(e);
  };

  const handleImgError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.currentTarget;
    target.onerror = null; // Prevent any recursion / infinite loops

    if (!hasError) {
      setHasError(true);
      // First try fallbackSrc or context fallback
      const nextFallback =
        fallbackSrc && isValidImageUrl(fallbackSrc)
          ? fallbackSrc
          : resolveImageUrl(undefined, type, contextName);

      if (nextFallback && nextFallback !== currentSrc) {
        setCurrentSrc(nextFallback);
      } else {
        // Ultimate guaranteed offline fallback
        setCurrentSrc(OFFLINE_AGRI_SVG);
      }
    } else {
      // If even the fallback fails, set the offline SVG
      setCurrentSrc(OFFLINE_AGRI_SVG);
    }

    if (onError) onError(e);
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-muted/60",
        aspectRatio,
        containerClassName
      )}
    >
      {/* Loading Skeleton */}
      {showSkeleton && !isLoaded && (
        <div
          className="absolute inset-0 bg-muted/80 animate-pulse flex items-center justify-center z-[1]"
          aria-hidden="true"
        >
          <div className="w-6 h-6 rounded-full border-2 border-emerald-500/30 border-t-emerald-500 animate-spin" />
        </div>
      )}

      {/* Main Image */}
      <img
        src={currentSrc}
        alt={alt}
        loading={loading}
        onLoad={handleImgLoad}
        onError={handleImgError}
        className={cn(
          "w-full h-full object-cover transition-opacity duration-300",
          isLoaded ? "opacity-100" : "opacity-0",
          className
        )}
        {...props}
      />
    </div>
  );
};

export default AgriImage;
