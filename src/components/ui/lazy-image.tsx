import React, { ReactNode } from 'react';
import { SafeImage } from './SafeImage';

export interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  placeholderColor?: string;
  className?: string;
  fallback?: ReactNode;
  category?: string;
  entityName?: string;
}

/**
 * Backward-compatible LazyImage wrapper around the unified enterprise SafeImage engine.
 */
export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  className,
  fallback,
  category,
  entityName,
  ...props
}) => {
  return (
    <SafeImage
      src={src}
      alt={alt}
      entityName={entityName || alt}
      category={category}
      className={className}
      fallbackIcon={fallback}
      cover={true}
      {...props}
    />
  );
};

export default LazyImage;
