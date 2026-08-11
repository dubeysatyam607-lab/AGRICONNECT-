import React from 'react';

/**
 * Enterprise Reusable Animation Wrappers.
 * Provides hardware-accelerated transitions (FadeIn, SlideUp, ScaleIn, StaggerContainer).
 */

export const FadeIn: React.FC<{ children: React.ReactNode; delayMs?: number; className?: string }> = ({
  children,
  delayMs = 0,
  className = '',
}) => {
  return (
    <div
      style={{ animationDelay: `${delayMs}ms` }}
      className={`animate-fade-in fill-mode-both ${className}`}
    >
      {children}
    </div>
  );
};

export const SlideUp: React.FC<{ children: React.ReactNode; delayMs?: number; className?: string }> = ({
  children,
  delayMs = 0,
  className = '',
}) => {
  return (
    <div
      style={{ animationDelay: `${delayMs}ms` }}
      className={`animate-slide-up fill-mode-both ${className}`}
    >
      {children}
    </div>
  );
};

export const ScaleIn: React.FC<{ children: React.ReactNode; delayMs?: number; className?: string }> = ({
  children,
  delayMs = 0,
  className = '',
}) => {
  return (
    <div
      style={{ animationDelay: `${delayMs}ms` }}
      className={`animate-scale-in fill-mode-both ${className}`}
    >
      {children}
    </div>
  );
};

export const StaggerContainer: React.FC<{ children: React.ReactNode[]; staggerMs?: number; className?: string }> = ({
  children,
  staggerMs = 80,
  className = '',
}) => {
  return (
    <div className={className}>
      {React.Children.map(children, (child, index) => (
        <div style={{ animationDelay: `${index * staggerMs}ms` }} className="animate-slide-up fill-mode-both">
          {child}
        </div>
      ))}
    </div>
  );
};
