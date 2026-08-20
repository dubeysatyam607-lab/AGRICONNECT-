import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

const FALLBACK_SRC = 'https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&q=80&w=400';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc?: string;
  showSkeleton?: boolean;
}

export function OptimizedImage({
  src,
  alt,
  className,
  fallbackSrc = FALLBACK_SRC,
  showSkeleton = true,
  ...props
}: OptimizedImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setLoaded(false);
    setError(false);
  }, [src]);

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {showSkeleton && !loaded && !error && (
        <div className="absolute inset-0 animate-pulse bg-muted rounded-inherit" />
      )}
      <img
        ref={imgRef}
        src={error ? fallbackSrc : src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => {
          if (!error) {
            setError(true);
          } else {
            setLoaded(true);
          }
        }}
        className={cn(
          'w-full h-full object-cover transition-opacity duration-300',
          loaded ? 'opacity-100' : 'opacity-0',
          className
        )}
        {...props}
      />
    </div>
  );
}
