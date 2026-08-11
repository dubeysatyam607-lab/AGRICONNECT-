import React from 'react';

/**
 * Enterprise Reusable Loaders.
 * Features an Agriculture Seed-to-Plant animated loader for full screens, and circular spinners for components.
 */

export const AppLoader: React.FC<{ size?: 'sm' | 'md' | 'lg'; text?: string }> = ({ size = 'md', text }) => {
  const sizeMap = {
    sm: 'w-6 h-6 border-2',
    md: 'w-10 h-10 border-3',
    lg: 'w-16 h-16 border-4',
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3 p-4">
      <div className={`${sizeMap[size]} border-emerald-600 border-t-transparent rounded-full animate-spin`} />
      {text && <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground animate-pulse">{text}</p>}
    </div>
  );
};

export const SeedGrowingLoader: React.FC<{ message?: string }> = ({ message = 'Nurturing AgriConnect...' }) => {
  return (
    <div className="min-h-[300px] w-full flex flex-col items-center justify-center p-8 bg-gradient-to-b from-emerald-950/20 via-transparent to-transparent rounded-3xl">
      <div className="relative w-24 h-24 flex items-center justify-center mb-6">
        {/* Pulsing soil glow */}
        <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl animate-pulse" />
        
        {/* Animated Sprout / Leaf icon */}
        <div className="relative text-5xl animate-bounce">
          🌱
        </div>
      </div>
      <p className="font-extrabold text-base tracking-tight text-foreground text-center mb-1">{message}</p>
      <p className="text-xs text-muted-foreground text-center max-w-xs">Connecting Indian farmers to Mandis, AI Crop Doctor, and Farm Equipment.</p>
    </div>
  );
};
