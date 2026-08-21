import React, { useState, useEffect, useRef } from "react";
import { resolveImageUrl, getRealFallbackImage, isValidImageUrl, CATEGORY_FALLBACK_IMAGES } from "@/lib/image-resolver";
import { fetchPexelsImageForName, PEXELS_CURATED_PHOTOS, normalizeNameForPexels } from "@/lib/pexels-api";
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
  // Build ordered list of real candidate photo URLs
  const candidateUrls = useRef<string[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [allFailed, setAllFailed] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const name = contextName || alt || "";
    const norm = normalizeNameForPexels(name).toLowerCase();
    const stem = norm.split(/\s+/)[0];
    const pexelsCurated = PEXELS_CURATED_PHOTOS[stem] || PEXELS_CURATED_PHOTOS[norm];

    const primary = resolveImageUrl(src, type, contextName);
    const backup1 = fallbackSrc && isValidImageUrl(fallbackSrc) ? fallbackSrc : null;
    const backup2 = pexelsCurated && isValidImageUrl(pexelsCurated) ? pexelsCurated : null;
    const backup3 = getRealFallbackImage(type, contextName);
    const backup4 = CATEGORY_FALLBACK_IMAGES.default;

    const list = [primary, backup1, backup2, backup3, backup4].filter(
      (url): url is string => isValidImageUrl(url)
    );

    // Deduplicate while preserving order
    candidateUrls.current = Array.from(new Set(list));
    setCurrentIdx(0);
    setIsLoaded(false);
    setAllFailed(false);

    // Asynchronously search Pexels API for custom unmapped crops/products
    if (name && (!src || !isValidImageUrl(src))) {
      fetchPexelsImageForName(name, type).then((fetchedUrl) => {
        if (isMounted && fetchedUrl && isValidImageUrl(fetchedUrl)) {
          candidateUrls.current = Array.from(new Set([fetchedUrl, ...candidateUrls.current]));
          setCurrentIdx(0);
          setIsLoaded(false);
        }
      }).catch(() => {
        // keep curated candidate list
      });
    }

    return () => {
      isMounted = false;
    };
  }, [src, type, contextName, fallbackSrc, alt]);

  const currentSrc = candidateUrls.current[currentIdx] || resolveImageUrl(src, type, contextName);

  const handleImgLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setIsLoaded(true);
    if (onLoad) onLoad(e);
  };

  const handleImgError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const nextIdx = currentIdx + 1;
    if (nextIdx < candidateUrls.current.length) {
      setCurrentIdx(nextIdx);
      setIsLoaded(false);
    } else {
      setAllFailed(true);
    }
    if (onError) onError(e);
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-slate-900/60",
        aspectRatio,
        containerClassName
      )}
    >
      {/* Loading Skeleton */}
      {showSkeleton && !isLoaded && !allFailed && (
        <div
          className="absolute inset-0 bg-slate-800/80 animate-pulse flex items-center justify-center z-[1]"
          aria-hidden="true"
        >
          <div className="w-6 h-6 rounded-full border-2 border-emerald-500/30 border-t-emerald-500 animate-spin" />
        </div>
      )}

      {/* Main Image with no-referrer for reliable CDN loading */}
      {!allFailed ? (
        <img
          src={currentSrc}
          alt={alt}
          loading={loading}
          referrerPolicy="no-referrer"
          crossOrigin="anonymous"
          onLoad={handleImgLoad}
          onError={handleImgError}
          className={cn(
            "w-full h-full object-cover transition-opacity duration-300",
            isLoaded ? "opacity-100" : "opacity-0",
            className
          )}
          {...props}
        />
      ) : (
        /* Real agricultural card fallback when completely offline */
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950 flex flex-col items-center justify-center p-3 text-center">
          <span className="text-xl mb-1">🌾</span>
          <span className="text-xs font-bold text-white/90 line-clamp-1">{contextName || alt}</span>
          <span className="text-[9px] font-semibold text-emerald-400/80 uppercase tracking-wider mt-0.5">AgriConnect Real Asset</span>
        </div>
      )}
    </div>
  );
};

export default AgriImage;
