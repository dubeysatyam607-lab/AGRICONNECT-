import React, { useState } from 'react';
import {
  CalendarCheck, Clock, IndianRupee, MapPin, MessageCircle, Phone, Send,
  ShieldCheck, Sparkles, Star, Wrench,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { interpolate } from '@/i18n/journey';
import { cn } from '@/lib/utils';
import { Avatar, BadgeChip } from './Avatar';
import { StarRating } from './StarRating';
import type { Availability, Buyer, FarmerProfile, ServiceProvider } from '../../domain/networkTypes';
import { getProviderReviews } from '../../domain/networkStore';

interface EntityCardProps {
  entity: ServiceProvider | FarmerProfile | Buyer;
  footerNote?: string;
  onToast?: (message: string) => void;
  onBook?: (provider: ServiceProvider, date: string) => void;
}

export const EntityCard: React.FC<EntityCardProps> = ({ entity, footerNote, onToast, onBook }) => {
  const { t } = useLanguage();
  const [showReviews, setShowReviews] = useState(false);
  const [booking, setBooking] = useState<ServiceProvider | null>(null);

  const reviews = entity.type === 'provider' ? getProviderReviews(entity.id) : [];

  const chatLabel = entity.type === 'provider' ? t('fnet.btn.chat') : t('fnet.btn.enquire');
  const callLabel = t('fnet.btn.call');

  const handleToast = (msg: string) => onToast?.(msg);

  return (
    <article className="rounded-2xl border border-border bg-card p-4 shadow-card">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Avatar user={entity} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate text-sm font-black text-foreground">{entity.name}</h3>
            {entity.verified && <ShieldCheck size={14} className="shrink-0 text-sky-500" aria-label={t('fnet.verified')} />}
          </div>
          <p className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
            <MapPin size={11} className="text-forest" />
            {entity.village}, {entity.district}
            <span className="text-muted-foreground/50">·</span>
            {entity.distanceKm > 0 ? `${entity.distanceKm.toFixed(1)} km` : t('fnet.nearYou')}
          </p>
          <div className="mt-1.5">
            <StarRating rating={entity.rating} reviews={entity.reviews} />
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-1">
          {entity.badges.map((b) => (
            <BadgeChip key={b} badge={b} label={t(`fnet.badge.${b}`)} />
          ))}
        </div>
      </div>

      {/* Type-specific meta */}
      {entity.type === 'provider' && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          <MetaTile icon={IndianRupee} label={entity.pricing} sub={t('fnet.meta.price')} />
          <MetaTile
            icon={Clock}
            label={t(`fnet.avail.${(entity as ServiceProvider).availability}`)}
            sub={t('fnet.meta.availability')}
          />
          <MetaTile icon={Wrench} label={String((entity as ServiceProvider).trustScore)} sub={t('fnet.meta.trust')} />
        </div>
      )}
      {entity.type === 'buyer' && (
        <div className="mt-3 rounded-xl bg-violet-500/8 px-3 py-2">
          <p className="text-[11px] font-black uppercase tracking-wider text-violet-600 dark:text-violet-300">{t('fnet.meta.buys')}</p>
          <p className="text-xs font-bold text-foreground">{(entity as Buyer).lookingFor}</p>
          {(entity as Buyer).minQty && (
            <p className="mt-0.5 text-[11px] font-semibold text-muted-foreground">
              {t('fnet.meta.minQty')}: {(entity as Buyer).minQty}
            </p>
          )}
        </div>
      )}
      {entity.type === 'farmer' && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {(entity as FarmerProfile).produce.map((crop) => (
            <span key={crop} className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
              {crop}
            </span>
          ))}
        </div>
      )}

      {/* Skills / tags */}
      {entity.type === 'provider' && (entity as ServiceProvider).skills.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {(entity as ServiceProvider).skills.map((s) => (
            <span key={s} className="rounded-full border border-border bg-background/60 px-2.5 py-0.5 text-[10px] font-bold text-muted-foreground">
              {s}
            </span>
          ))}
        </div>
      )}

      {/* Reviews toggle */}
      {reviews.length > 0 && (
        <button
          onClick={() => setShowReviews((v) => !v)}
          className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-forest hover:underline"
        >
          <Star size={11} />
          {showReviews ? t('fnet.review.hide') : interpolate(t('fnet.review.show'), { count: reviews.length })}
        </button>
      )}
      {showReviews && reviews.length > 0 && (
        <ul className="mt-2 space-y-2 border-t border-border pt-2">
          {reviews.map((r) => (
            <li key={r.id} className="rounded-xl bg-background/60 px-3 py-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-foreground">{r.author}</span>
                <StarRating rating={r.rating} reviews={0} showCount={false} size={10} />
              </div>
              <p className="mt-1 text-xs leading-snug text-muted-foreground">{r.comment}</p>
            </li>
          ))}
        </ul>
      )}

      {/* Footer note (e.g. "sells wheat") */}
      {footerNote && <p className="mt-3 text-[11px] font-semibold text-muted-foreground/80">{footerNote}</p>}

      {/* Actions */}
      <div className="mt-3.5 flex gap-2">
        <button
          onClick={() => handleToast(interpolate(t('fnet.toast.calling'), { name: entity.name }))}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-background/60 px-3 py-2 text-xs font-bold text-muted-foreground hover:text-foreground"
        >
          <Phone size={13} />
          {callLabel}
        </button>
        <button
          onClick={() => handleToast(interpolate(t('fnet.toast.threadOpened'), { name: entity.name }))}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-background/60 px-3 py-2 text-xs font-bold text-muted-foreground hover:text-foreground"
        >
          <MessageCircle size={13} />
          {chatLabel}
        </button>
        {entity.type === 'provider' && (
          <button
            onClick={() => setBooking(entity as ServiceProvider)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-forest px-3 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:brightness-110 dark:bg-emerald-600"
          >
            <CalendarCheck size={13} />
            {t('fnet.btn.book')}
          </button>
        )}
      </div>

      {booking && (
        <BookingModal
          provider={booking}
          onClose={() => setBooking(null)}
          onToast={handleToast}
          onConfirm={(date) => onBook?.(booking, date)}
        />
      )}
    </article>
  );
};

const MetaTile: React.FC<{ icon: React.ComponentType<{ size?: number; className?: string }>; label: string; sub: string }> = ({
  icon: Icon,
  label,
  sub,
}) => (
  <div className="rounded-xl bg-background/60 px-2 py-2 text-center">
    <p className="flex items-center justify-center gap-1 text-xs font-black text-foreground">
      <Icon size={11} className="text-forest" />
      {label}
    </p>
    <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{sub}</p>
  </div>
);

const BookingModal: React.FC<{
  provider: ServiceProvider;
  onClose: () => void;
  onToast: (m: string) => void;
  onConfirm: (date: string) => void;
}> = ({ provider, onClose, onToast, onConfirm }) => {
  const { t } = useLanguage();
  const [date, setDate] = useState('');
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-0 sm:items-center" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-t-3xl border border-border bg-card p-5 shadow-soft sm:rounded-3xl">
        <div className="flex items-start justify-between">
          <div>
            <h4 className="text-sm font-black text-foreground">{t('fnet.booking.title')}</h4>
            <p className="mt-0.5 text-xs font-semibold text-muted-foreground">{provider.name} · {provider.pricing}</p>
          </div>
          <button onClick={onClose} className="rounded-full border border-border bg-background px-2.5 py-1 text-xs font-bold text-muted-foreground" aria-label={t('common.back')}>
            ✕
          </button>
        </div>
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">{t('fnet.booking.date')}</span>
            <input
              type="date"
              value={date}
              min={today}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-bold text-foreground outline-none focus:border-forest"
            />
          </label>
          <div className="flex items-center justify-between rounded-xl bg-forest/8 px-3 py-2.5">
            <span className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
              <IndianRupee size={13} className="text-forest" />
              {t('fnet.booking.amount')}
            </span>
            <span className="text-sm font-black text-foreground">{provider.pricing}</span>
          </div>
          <button
            disabled={!date}
            onClick={() => {
              onConfirm(date);
              onClose();
              onToast(interpolate(t('fnet.toast.bookingSent'), { name: provider.name }));
            }}
            className={cn(
              'flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-bold text-primary-foreground shadow-sm',
              date ? 'bg-forest hover:brightness-110 dark:bg-emerald-600' : 'cursor-not-allowed opacity-40',
            )}
          >
            <Send size={13} />
            {t('fnet.booking.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
};
