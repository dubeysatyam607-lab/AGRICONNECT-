import React, { ReactNode } from 'react';
import './GlassCard.css';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, className }) => {
  return (
    <div className={`glass-card ${className ?? ''}`}>
      {children}
    </div>
  );
};
