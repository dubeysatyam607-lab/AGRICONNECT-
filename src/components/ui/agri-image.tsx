import React from "react";
import { SafeImage, SafeImageProps } from "./SafeImage";
import { cn } from "@/lib/utils";

export interface AgriImageProps extends Omit<SafeImageProps, "resolveType"> {
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
    | "machinery"
    | "cattle"
    | "cow"
    | "buffalo"
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
 * Backward-compatible AgriImage component wrapped over the unified SafeImage engine.
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
  cover = true,
  loading = "lazy",
  onError,
  onLoad,
  ...props
}) => {
  const targetName = query || crop || contextName || category || alt || "";
  
  // Normalize type for SafeImage resolver
  const resolveType = (() => {
    if (type === "mandi" || type === "crop") return "crop";
    if (type === "tractor" || type === "harvester" || type === "equipment" || type === "machinery") return "tractor";
    if (type === "cattle" || type === "cow" || type === "buffalo") return "cattle";
    if (type === "product" || type === "seeds" || type === "fertilizer" || type === "agristore") return "product";
    if (type === "scheme") return "scheme";
    return "general";
  })();

  return (
    <SafeImage
      src={src}
      alt={alt}
      entityName={targetName}
      category={category}
      resolveType={resolveType}
      cover={cover}
      loading={loading}
      containerClassName={cn(aspectRatio, containerClassName)}
      className={className}
      onError={onError}
      onLoad={onLoad}
      {...props}
    />
  );
};

export const AgricultureImage = AgriImage;
export default AgriImage;
