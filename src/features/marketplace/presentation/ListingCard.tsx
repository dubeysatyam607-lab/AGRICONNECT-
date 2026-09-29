import React from 'react';
import {
  MapPin,
  BadgeCheck,
  Calendar,
  Eye,
  Edit2,
  Trash2,
  Tractor,
  Users,
  Wrench,
  Clock,
  ShieldCheck,
  ImageIcon,
} from 'lucide-react';
import {
  MarketplaceListing,
  formatPriceWithUnit,
} from '../domain/marketplaceTypes';

interface ListingCardProps {
  listing: MarketplaceListing;
  isOwner?: boolean;
  onSelect: (listing: MarketplaceListing) => void;
  onEdit?: (listing: MarketplaceListing) => void;
  onDelete?: (listing: MarketplaceListing) => void;
  onBook?: (listing: MarketplaceListing) => void;
  onStatusChange?: (listing: MarketplaceListing, status: any) => void;
}

export const ListingCard: React.FC<ListingCardProps> = ({
  listing,
  isOwner,
  onSelect,
  onEdit,
  onDelete,
  onBook,
}) => {
  const hasImage = listing.images && listing.images.length > 0 && Boolean(listing.images[0]);
  const coverImage = hasImage ? listing.images[0] : null;

  const formatDate = (isoStr?: string) => {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) {
      return '';
    }
  };

  const renderCategoryIcon = () => {
    switch (listing.listing_type) {
      case 'machinery':
        return <Tractor className="w-3.5 h-3.5 text-emerald-600" />;
      case 'cattle':
        return <span className="text-xs">🐄</span>;
      case 'labour':
        return <Users className="w-3.5 h-3.5 text-sky-600" />;
      case 'service':
      default:
        return <Wrench className="w-3.5 h-3.5 text-purple-600" />;
    }
  };

  const getAvailabilityBadgeClass = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-emerald-600 text-white';
      case 'rented':
        return 'bg-amber-600 text-white';
      case 'sold':
        return 'bg-blue-600 text-white';
      case 'paused':
      case 'unavailable':
      default:
        return 'bg-slate-600 text-white';
    }
  };

  return (
    <div
      onClick={() => onSelect(listing)}
      className="group rounded-2xl border border-border bg-card hover:border-emerald-500/50 hover:shadow-xl transition-all duration-200 overflow-hidden flex flex-col cursor-pointer"
    >
      {/* Cover Image / Placeholder */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
        {coverImage ? (
          <img
            src={coverImage}
            alt={listing.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-muted-foreground gap-1.5 p-4 text-center">
            <ImageIcon className="w-8 h-8 opacity-40" />
            <span className="text-xs font-semibold text-slate-500">No image provided</span>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-black/30 pointer-events-none" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase bg-black/70 backdrop-blur-sm text-white flex items-center gap-1 shadow-sm">
            {renderCategoryIcon()}
            <span>{listing.category}</span>
          </span>

          <div className="flex items-center gap-1.5">
            {listing.owner.is_verified && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-600 text-white flex items-center gap-1 shadow-sm">
                <BadgeCheck className="w-3 h-3" />
                Verified
              </span>
            )}
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase shadow-sm ${getAvailabilityBadgeClass(listing.availability)}`}>
              {listing.availability}
            </span>
          </div>
        </div>

        {/* Bottom Price in Thumbnail */}
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between text-white">
          <div>
            <div className="text-lg font-black tracking-tight drop-shadow-md">
              {formatPriceWithUnit(listing.price, listing.price_unit)}
            </div>
          </div>
          {listing.views_count !== undefined && listing.views_count > 0 && (
            <div className="text-[10px] text-white/90 font-bold flex items-center gap-1 bg-black/50 px-2 py-0.5 rounded-full backdrop-blur-sm">
              <Eye className="w-3 h-3" />
              <span>{listing.views_count} views</span>
            </div>
          )}
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          <h3 className="text-sm font-bold text-foreground line-clamp-1 group-hover:text-emerald-600 transition-colors">
            {listing.title}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {listing.description || 'Verified agricultural listing.'}
          </p>

          {/* Category Attributes Pill Row */}
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {listing.machinery_details && (
              <>
                {listing.machinery_details.horsepower && (
                  <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 rounded-md text-[10px] font-bold border border-emerald-500/20">
                    ⚡ {listing.machinery_details.horsepower} HP
                  </span>
                )}
                {listing.machinery_details.operator_included && (
                  <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 rounded-md text-[10px] font-bold border border-blue-500/20">
                    👨‍🌾 Operator Inc.
                  </span>
                )}
                {listing.machinery_details.delivery_available && (
                  <span className="px-2 py-0.5 bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 rounded-md text-[10px] font-bold border border-purple-500/20">
                    🚚 Delivery Avail.
                  </span>
                )}
              </>
            )}

            {listing.cattle_details && (
              <>
                {listing.cattle_details.breed && (
                  <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 rounded-md text-[10px] font-bold border border-amber-500/20">
                    🐄 Breed: {listing.cattle_details.breed}
                  </span>
                )}
                {listing.cattle_details.milk_production_daily_litres && (
                  <span className="px-2 py-0.5 bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 rounded-md text-[10px] font-bold border border-sky-500/20">
                    🥛 {listing.cattle_details.milk_production_daily_litres} L/Day
                  </span>
                )}
              </>
            )}

            {listing.labour_details && (
              <>
                {listing.labour_details.team_size && (
                  <span className="px-2 py-0.5 bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 rounded-md text-[10px] font-bold border border-sky-500/20">
                    👥 Team of {listing.labour_details.team_size}
                  </span>
                )}
                {listing.labour_details.experience_years && (
                  <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 rounded-md text-[10px] font-bold border border-emerald-500/20">
                    ⭐ {listing.labour_details.experience_years} yrs Exp.
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        {/* Location & Timestamps */}
        <div className="space-y-2 pt-2 border-t border-border/60">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1 truncate max-w-[60%]">
              <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="truncate font-medium">
                {listing.location.village ? `${listing.location.village}, ` : ''}
                {listing.location.district}, {listing.location.state}
              </span>
            </div>

            <div className="flex items-center gap-1 font-semibold text-foreground text-[11px]">
              <Clock className="w-3 h-3 text-slate-400" />
              <span>{formatDate(listing.created_at)}</span>
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
                  className="flex-1 py-2 px-3 rounded-xl border border-border text-xs font-bold text-foreground hover:bg-muted flex items-center justify-center gap-1 shadow-sm"
                >
                  <Edit2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete?.(listing);
                  }}
                  className="py-2 px-3 rounded-xl border border-rose-200 dark:border-rose-900/50 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center justify-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
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
                  className="flex-1 py-2 px-3 rounded-xl border border-border text-xs font-bold text-foreground hover:bg-muted text-center"
                >
                  View Details
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (listing.availability === 'available') {
                      onBook?.(listing);
                    }
                  }}
                  disabled={listing.availability !== 'available'}
                  className={`py-2 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-1 shadow-sm ${
                    listing.availability === 'available'
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-500 cursor-not-allowed border border-border'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>
                    {listing.availability !== 'available'
                      ? 'Currently Unavailable'
                      : listing.listing_type === 'labour'
                      ? 'Hire Worker'
                      : listing.listing_type === 'service'
                      ? 'Request Service'
                      : listing.listing_type === 'cattle'
                      ? 'Book Now'
                      : 'Request Rental'}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
