import React, { useState } from 'react';
import { AGRI_IMAGE_MAP } from '@/lib/image-map';

interface AgriImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  assetName?: string;
  fallbackType?: 'default' | 'crop' | 'vehicle' | 'fertilizer';
  containerClassName?: string;
}

export const AgriImage: React.FC<AgriImageProps> = ({ 
  src, 
  alt, 
  assetName,
  fallbackType = 'default',
  containerClassName = '',
  className = '',
  ...props 
}) => {
  const [imgError, setImgError] = useState(false);

  // Determine the best source URL to use initially
  let initialSrc = src;
  
  if (!initialSrc || imgError) {
    // If no src provided, or if the provided src failed, use the mapping or default fallback
    if (assetName && AGRI_IMAGE_MAP[assetName]) {
      initialSrc = AGRI_IMAGE_MAP[assetName];
    } else {
      initialSrc = AGRI_IMAGE_MAP['default'];
    }
  }

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (!imgError) {
      setImgError(true);
      // Fallback explicitly to the safety image if even the mapped one fails
      e.currentTarget.src = AGRI_IMAGE_MAP['default'];
    }
  };

  return (
    <div className={`overflow-hidden relative bg-muted flex items-center justify-center ${containerClassName}`}>
      <img
        src={initialSrc}
        alt={alt || assetName || 'Agricultural Image'}
        onError={handleError}
        className={`w-full h-full object-cover absolute inset-0 ${className}`}
        {...props}
      />
    </div>
  );
};
