import React from 'react';
import {
  MapPin,
  Star,
  BadgeCheck,
  Phone,
  MessageCircle,
  Calendar,
  Eye,
  MoreVertical,
  Edit2,
  Trash2,
} from 'lucide-react';
import {
  MarketplaceListing,
  MARKETPLACE_CATEGORIES,
  formatPriceWithUnit,
} from '../domain/marketplaceTypes';
import { SafeImage } from '@/components/ui/SafeImage';

interface ListingCardProps {
  listing: MarketplaceListing;
  isOwner?: boolean;
  onSelect: (listing: MarketplaceListing) => void;
  onEdit?: (listing: MarketplaceListing) => void;
  onDelete?: (listing: MarketplaceListing) => void;
  onBook?: (listing: MarketplaceListing) => void;
}

export const ListingCard: React.FC<ListingCardProps> = ({
  listing,
  isOwner,
  onSelect,
  onEdit,
  onDelete,
  onBook,
}) => {
  const categoryMeta = MARKETPLACE_CATEGORIES.find((c) => c.id === listing.category);
  const primaryImage =
    listing.images && listing.images.length > 0
      ? listing.images[0]
      : 'https://images.pexels.com/photos/11688197/pexels-photo-11688197.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=500&w=600';

  return (
    <div
      onClick={() => onSelect(listing)}
      className="group rounded-xl border border-border bg-card hover:border-emerald-500/50 hover:shadow-lg transition-all duration-200 overflow-hidden flex flex-col cursor-pointer"
    >
      {/* Thumbnail */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
        <SafeImage
          src={primaryImage}
          alt={listing.title}
          entityName={listing.title}
          category={listing.category}
          resolveType="general"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-black/30" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase bg-black/60 text-white ">
            {categoryMeta?.nameEn || listing.category}
          </span>

          <div className="flex items-center gap-1.5">
            {listing.owner.is_verified && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-600 text-white flex items-center gap-1 shadow-sm">
                <BadgeCheck className="w-3 h-3" />
                Verified
              </span>
            )}
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${
                listing.availability === 'available'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-amber-600 text-white'
              }`}
            >
              {listing.availability}
            </span>
          </div>
        </div>

        {/* Bottom Price in Thumbnail */}
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between text-white">
          <div>
            <div className="text-lg font-semibold tracking-tight ">
              {formatPriceWithUnit(listing.price, listing.price_unit)}
            </div>
          </div>
          <div className="text-xs text-white/80 font-medium flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded-full ">
            <Eye className="w-3 h-3" />
            <span>{listing.views_count || 1} views</span>
          </div>
        </div>
      </div>

      {/* Card Info */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground line-clamp-1 group-hover:text-emerald-600 transition-colors">
            {listing.title}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {listing.description || 'Verified agricultural listing.'}
          </p>
        </div>

        <div className="space-y-2 pt-2 border-t border-border/60">
          {/* Location & Owner */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1 truncate max-w-[65%]">
              <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="truncate">
                {listing.location.district}, {listing.location.state}
              </span>
            </div>
            <div className="flex items-center gap-1 font-semibold text-foreground">
              <span>{listing.owner.name.split(' ')[0]}</span>
              {listing.owner.rating && (
                <span className="flex items-center gap-0.5 text-amber-500 font-bold text-xs">
                  <Star className="w-3 h-3 fill-amber-500" />
                  {listing.owner.rating}
                </span>
              )}
            </div>
          </div>

          {/* Action Row */}
          <div className="pt-1 flex items-center justify-between gap-2">
            {isOwner ? (
              <div className="flex items-center gap-2 w-full">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit?.(listing);
                  }}
                  className="flex-1 py-1.5 px-3 rounded-xl border border-border text-xs font-bold text-foreground hover:bg-muted flex items-center justify-center gap-1"
                >
                  <Edit2 className="w-3 h-3 text-emerald-600" />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete?.(listing);
                  }}
                  className="py-1.5 px-3 rounded-xl border border-rose-200 dark:border-rose-900/50 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center justify-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Delete</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 w-full">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(listing);
                  }}
                  className="flex-1 py-1.5 px-3 rounded-xl border border-border text-xs font-bold text-foreground hover:bg-muted text-center"
                >
                  View Details
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onBook?.(listing);
                  }}
                  disabled={listing.availability !== 'available'}
                  className="py-1.5 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-1 shadow-sm"
                >
                  <Calendar className="w-3 h-3" />
                  <span>Book</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
