import React from 'react';
import { SafeImage, SafeImageProps } from './SafeImage';

export interface OptimizedImageProps extends SafeImageProps {
  fallbackSrc?: string;
  showSkeleton?: boolean;
}

/**
 * Backward-compatible OptimizedImage component built directly on top of SafeImage.
 */
export function OptimizedImage({
  src,
  alt,
  className,
  fallbackSrc,
  showSkeleton = true,
  entityName,
  category,
  resolveType = 'general',
  ...props
}: OptimizedImageProps) {
  return (
    <SafeImage
      src={src}
      alt={alt}
      entityName={entityName || (typeof alt === 'string' ? alt : undefined)}
      category={category}
      resolveType={resolveType}
      className={className}
      cover={true}
      {...props}
    />
  );
}

export default OptimizedImage;
