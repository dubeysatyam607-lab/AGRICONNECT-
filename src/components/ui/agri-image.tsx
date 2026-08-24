import React, { useState, useEffect, useRef } from "react";
import {
  fetchPexelsPhoto,
  PEXELS_CURATED_PHOTOS,
  PEXELS_PHOTO_LIBRARY,
  normalizeNameForPexels,
  getStableIndex,
  getAgricultureImage,
} from "@/lib/pexels-api";
import { resolveImageUrl, isValidImageUrl } from "@/lib/image-resolver";
import { MACHINE_IMG } from "@/lib/machine-images";
import { getCropImage } from "@/lib/crop-images";
import { cn } from "@/lib/utils";

export interface AgriImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string | null;
  alt?: string;
  category?: string;
  query?: string;
  crop?: string;
  type?:
    | "crop"
    | "product"
    | "category"
    | "tractor"
    | "harvester"
    | "farmer"
    | "agristore"
    | "seeds"
    | "fertilizer"
    | "equipment"
    | "mandi"
    | "scheme"
    | "general";
  contextName?: string;
  fallbackSrc?: string;
  containerClassName?: string;
  aspectRatio?: string;
  showSkeleton?: boolean;
  showAttribution?: boolean;
  seedKey?: string;
}

/**
 * Enterprise Agriculture Image Component for AgriConnect.
 * Dynamically resolves and renders genuine, authentic Pexels agricultural photographs
 * with loading skeletons, error fallback chains, and responsive scaling.
 */
export const AgriImage: React.FC<AgriImageProps> = ({
  src,
  alt = "AgriConnect Agricultural Photo",
  category,
  query,
  crop,
  type = "general",
  contextName,
  fallbackSrc,
  containerClassName,
  className,
  aspectRatio,
  loading = "lazy",
  showSkeleton = true,
  showAttribution = false,
  seedKey,
  onLoad,
  onError,
  ...props
}) => {
  const targetName = query || category || crop || contextName || alt || "";
  const stableId = seedKey || targetName;

  // Immediate deterministic photo lookup for instant 0ms render
  const initialResolved = (() => {
    if (src && isValidImageUrl(src)) return src;
    if (type === "tractor" && MACHINE_IMG[targetName]) return MACHINE_IMG[targetName];
    if (type === "crop" && targetName) return getCropImage(targetName);
    
    const norm = normalizeNameForPexels(targetName).toLowerCase();
    const stem = norm.split(/\s+/)[0];
    if (PEXELS_CURATED_PHOTOS[stem]) return PEXELS_CURATED_PHOTOS[stem];
    if (PEXELS_CURATED_PHOTOS[norm]) return PEXELS_CURATED_PHOTOS[norm];
    if (PEXELS_PHOTO_LIBRARY[type]) {
      const idx = getStableIndex(stableId, PEXELS_PHOTO_LIBRARY[type].length);
      return PEXELS_PHOTO_LIBRARY[type][idx].src.large;
    }
    return resolveImageUrl(src, type as any, targetName);
  })();

  const [currentSrc, setCurrentSrc] = useState<string>(initialResolved);
  const [altText, setAltText] = useState<string>(alt || `${targetName} agriculture photograph`);
  const [photographer, setPhotographer] = useState<string>("");
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [allFailed, setAllFailed] = useState<boolean>(false);

  const candidateUrls = useRef<string[]>([initialResolved]);
  const candidateIdx = useRef<number>(0);

  useEffect(() => {
    let isMounted = true;

    // Build targeted candidate chain without universal cross-category bleeds
    const norm = normalizeNameForPexels(targetName).toLowerCase();
    const stem = norm.split(/\s+/)[0];
    const curatedPhotos = PEXELS_PHOTO_LIBRARY[stem] || PEXELS_PHOTO_LIBRARY[type];

    const list: string[] = [];
    if (src && isValidImageUrl(src)) list.push(src);
    if (type === "tractor" && MACHINE_IMG[targetName]) list.push(MACHINE_IMG[targetName]);
    if (type === "crop" && targetName) list.push(getCropImage(targetName));
    if (curatedPhotos) {
      curatedPhotos.forEach((p) => list.push(p.src.large, p.src.medium));
    }
    if (fallbackSrc && isValidImageUrl(fallbackSrc)) list.push(fallbackSrc);

    candidateUrls.current = Array.from(new Set(list.filter(isValidImageUrl)));
    candidateIdx.current = 0;

    // Set initial display
    const firstUrl = candidateUrls.current[0] || initialResolved;
    setCurrentSrc(firstUrl);
    setIsLoaded(false);
    setAllFailed(false);

    // If entity has a deterministic verified photo, preserve it; otherwise fetch from service
    const hasExactMatch = 
      (type === "tractor" && MACHINE_IMG[targetName]) ||
      (type === "crop" && targetName && getCropImage(targetName)) ||
      (src && isValidImageUrl(src));

    if (!hasExactMatch) {
      getAgricultureImage({
        type: type as any,
        name: targetName,
        category,
      }).then((res) => {
        if (!isMounted || !res?.imageUrl) return;
        if (res.entityName) setAltText(`${res.entityName} agriculture photograph`);
        if (res.photographer) setPhotographer(res.photographer);

        if (!candidateUrls.current.includes(res.imageUrl)) {
          candidateUrls.current = [res.imageUrl, ...candidateUrls.current];
        }
        setCurrentSrc(res.imageUrl);
      }).catch(() => {
        // Retain candidates
      });
    }

    return () => {
      isMounted = false;
    };
  }, [src, targetName, type, category, fallbackSrc, stableId]);

  const handleImgLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setIsLoaded(true);
    if (onLoad) onLoad(e);
  };

  const handleImgError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    candidateIdx.current += 1;
    if (candidateIdx.current < candidateUrls.current.length) {
      setCurrentSrc(candidateUrls.current[candidateIdx.current]);
      setIsLoaded(false);
    } else {
      setAllFailed(true);
    }
    if (onError) onError(e);
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-slate-900/60 group",
        aspectRatio,
        containerClassName
      )}
    >
      {/* Loading Shimmer Skeleton */}
      {showSkeleton && !isLoaded && !allFailed && (
        <div
          className="absolute inset-0 bg-slate-800/90 animate-pulse flex items-center justify-center z-[1]"
          aria-hidden="true"
        >
          <div className="w-7 h-7 rounded-full border-2 border-emerald-500/30 border-t-emerald-500 animate-spin" />
        </div>
      )}

      {/* Main Real Pexels Photo */}
      {!allFailed ? (
        <>
          <img
            src={currentSrc}
            alt={altText}
            loading={loading}
            referrerPolicy="no-referrer"
            crossOrigin="anonymous"
            onLoad={handleImgLoad}
            onError={handleImgError}
            className={cn(
              "w-full h-full object-cover transition-opacity duration-300 ease-in-out",
              isLoaded ? "opacity-100" : "opacity-0",
              className
            )}
            {...props}
          />
          {showAttribution && photographer && isLoaded && (
            <div className="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-[9px] font-medium text-white/80 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[2]">
              Photo: {photographer} / Pexels
            </div>
          )}
        </>
      ) : (
        /* Guaranteed graceful fallback */
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950 flex flex-col items-center justify-center p-3 text-center">
          <span className="text-2xl mb-1">🌾</span>
          <span className="text-xs font-bold text-white/90 line-clamp-1">{targetName || alt}</span>
          <span className="text-[9px] font-semibold text-emerald-400/80 uppercase tracking-wider mt-0.5">
            AgriConnect Real Photo
          </span>
        </div>
      )}
    </div>
  );
};

export const AgricultureImage = AgriImage;
export default AgriImage;
