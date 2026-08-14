import React, { useState, useRef, useEffect, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  placeholderColor?: string;
  className?: string;
  fallback?: ReactNode;
}

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  placeholderColor = 'bg-muted',
  className,
  fallback,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const { t } = useLanguage();
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '100px',
        threshold: 0.01,
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={imgRef} className={cn('relative overflow-hidden', className)}>
      {/* Blur placeholder */}
      <div
        className={cn(
          'absolute inset-0 transition-opacity duration-500',
          placeholderColor,
          isLoaded ? 'opacity-0' : 'opacity-100'
        )}
      >
        <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-foreground/5 to-transparent" />
      </div>

      {/* Actual image */}
      {isInView && !hasError && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          className={cn(
            'w-full h-full object-cover transition-opacity duration-500',
            isLoaded ? 'opacity-100' : 'opacity-0'
          )}
          {...props}
        />
      )}

      {/* Error state - use custom fallback or default */}
      {hasError && (
        fallback ? (
          <div className="absolute inset-0">{fallback}</div>
        ) : (
          <div className={cn('absolute inset-0 flex items-center justify-center', placeholderColor)}>
            <span className="text-muted-foreground text-sm">{t('ui.lazyImage.failed')}</span>
          </div>
        )
      )}
    </div>
  );
};

export default LazyImage;
