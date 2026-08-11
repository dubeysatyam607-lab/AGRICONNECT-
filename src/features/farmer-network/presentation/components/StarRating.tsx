import React from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  rating: number;
  reviews: number;
  showCount?: boolean;
  size?: number;
}

export const StarRating: React.FC<StarRatingProps> = ({ rating, reviews, showCount = true, size = 12 }) => (
  <span className="inline-flex items-center gap-1">
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          className={i <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}
        />
      ))}
    </span>
    <span className="text-xs font-bold text-foreground">{rating.toFixed(1)}</span>
    {showCount && <span className="text-[10px] font-semibold text-muted-foreground">({reviews})</span>}
  </span>
);
