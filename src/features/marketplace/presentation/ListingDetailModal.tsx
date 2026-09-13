import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  MapPin,
  BadgeCheck,
  Star,
  Phone,
  MessageCircle,
  Calendar,
  Eye,
  Flag,
  Share2,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import {
  MarketplaceListing,
  MARKETPLACE_CATEGORIES,
  formatPriceWithUnit,
} from '../domain/marketplaceTypes';

interface ListingDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listing: MarketplaceListing | null;
  onBook: (listing: MarketplaceListing) => void;
  onReport: (listing: MarketplaceListing) => void;
  onToast?: (msg: string) => void;
}

export const ListingDetailModal: React.FC<ListingDetailModalProps> = ({
  open,
  onOpenChange,
  listing,
  onBook,
  onReport,
  onToast,
}) => {
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  if (!listing) return null;

  const categoryMeta = MARKETPLACE_CATEGORIES.find((c) => c.id === listing.category);
  const images = listing.images && listing.images.length > 0
    ? listing.images
    : ['https://images.pexels.com/photos/11688197/pexels-photo-11688197.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=627&w=940'];

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: listing.title,
          text: `Check out ${listing.title} on AgriConnect Marketplace for ${formatPriceWithUnit(listing.price, listing.price_unit)}`,
          url: window.location.href,
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      onToast?.('Listing link copied to clipboard!');
    }
  };

  const handleCall = () => {
    window.open(`tel:${listing.owner.phone}`, '_self');
  };

  const handleWhatsApp = () => {
    const text = encodeURIComponent(
      `Hello ${listing.owner.name}, I found your listing "${listing.title}" on AgriConnect (${formatPriceWithUnit(listing.price, listing.price_unit)}). Is this currently available?`
    );
    window.open(`https://wa.me/91${listing.owner.phone}?text=${text}`, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto p-0 rounded-3xl border-border bg-card">
        {/* Top Image Gallery */}
        <div className="relative aspect-video sm:aspect-[21/9] w-full bg-muted overflow-hidden">
          <img
            src={images[activeImageIdx] || images[0]}
            alt={listing.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

          {/* Navigation arrows if multiple images */}
          {images.length > 1 && (
            <div className="absolute inset-y-0 inset-x-3 flex items-center justify-between pointer-events-none">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveImageIdx((prev) => (prev > 0 ? prev - 1 : images.length - 1));
                }}
                className="w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center pointer-events-auto hover:bg-black/90 backdrop-blur-sm"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveImageIdx((prev) => (prev < images.length - 1 ? prev + 1 : 0));
                }}
                className="w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center pointer-events-auto hover:bg-black/90 backdrop-blur-sm"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Category Pill & Verification Badge */}
          <div className="absolute top-4 left-4 flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-600/90 text-white backdrop-blur-md shadow-sm">
              {categoryMeta?.nameEn || listing.category}
            </span>
            {listing.owner.is_verified && (
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-600/90 text-white backdrop-blur-md inline-flex items-center gap-1">
                <BadgeCheck className="w-3.5 h-3.5" />
                Verified Listing
              </span>
            )}
            <span
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase backdrop-blur-md ${
                listing.availability === 'available'
                  ? 'bg-emerald-500/90 text-white'
                  : 'bg-amber-500/90 text-white'
              }`}
            >
              {listing.availability}
            </span>
          </div>

          {/* Price & Views Badge */}
          <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between text-white">
            <div>
              <div className="text-2xl sm:text-3xl font-black tracking-tight drop-shadow-md">
                {formatPriceWithUnit(listing.price, listing.price_unit)}
              </div>
              <div className="text-xs text-white/80 font-medium flex items-center gap-1.5 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>
                  {listing.location.village ? `${listing.location.village}, ` : ''}
                  {listing.location.district}, {listing.location.state}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleShare}
                className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md flex items-center justify-center text-white"
                title="Share Listing"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => onReport(listing)}
                className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md flex items-center justify-center text-white"
                title="Report Listing"
              >
                <Flag className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {/* Title & Description */}
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight leading-snug">
              {listing.title}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
              {listing.description || 'No detailed description provided by the seller.'}
            </p>
          </div>

          {/* Specifications Table */}
          {listing.specifications && Object.keys(listing.specifications).length > 0 && (
            <div className="rounded-2xl border border-border p-4 bg-muted/20">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground mb-3">
                Key Specifications & Details
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.entries(listing.specifications).map(([key, val]) => (
                  <div key={key} className="p-2.5 rounded-xl bg-card border border-border/70">
                    <div className="text-[10px] uppercase font-bold text-muted-foreground truncate">
                      {key.replace(/([A-Z])/g, ' $1')}
                    </div>
                    <div className="text-xs font-extrabold text-foreground mt-0.5 truncate">
                      {String(val)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Owner & Provider Card */}
          <div className="p-4 rounded-2xl border border-border bg-emerald-50/40 dark:bg-emerald-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white font-black text-lg flex items-center justify-center shadow-md">
                {listing.owner.name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-1.5 font-bold text-foreground text-sm">
                  <span>{listing.owner.name}</span>
                  {listing.owner.is_verified && (
                    <BadgeCheck className="w-4 h-4 text-emerald-600 fill-emerald-100 dark:fill-emerald-900 shrink-0" />
                  )}
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                  <span className="flex items-center gap-0.5 font-bold text-amber-500">
                    <Star className="w-3.5 h-3.5 fill-amber-500" />
                    {listing.owner.rating || 4.8}
                  </span>
                  <span>·</span>
                  <span>{listing.owner.reviews_count || 12} Verified Reviews</span>
                </div>
              </div>
            </div>

            {/* Direct Connect Buttons */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {(listing.contact_method === 'call' || listing.contact_method === 'both') && (
                <button
                  onClick={handleCall}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-bold text-xs bg-card border border-border hover:bg-muted text-foreground flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Phone className="w-4 h-4 text-emerald-600" />
                  <span>Call Provider</span>
                </button>
              )}
              {(listing.contact_method === 'both' || listing.contact_method === 'in_app') && (
                <button
                  onClick={handleWhatsApp}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>WhatsApp</span>
                </button>
              )}
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border">
            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>AgriConnect Protection: Zero Middleman Commission</span>
            </div>

            <button
              onClick={() => {
                onOpenChange(false);
                onBook(listing);
              }}
              disabled={listing.availability !== 'available'}
              className="w-full sm:w-auto px-6 py-3 rounded-xl font-extrabold text-xs text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2 shadow-md transition-all"
            >
              <Calendar className="w-4 h-4" />
              <span>Request / Book Now</span>
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
