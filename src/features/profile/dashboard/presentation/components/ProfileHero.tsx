import React from 'react';
import { MapPin, Pencil, RotateCcw, ShieldCheck, Sprout } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage, LANGUAGE_NAMES } from '@/contexts/LanguageContext';
import type { IFarmerProfile } from '@/features/profile/domain/models/FarmerProfile';

interface ProfileHeroProps {
  profile: IFarmerProfile | null;
  loading: boolean;
  memberSince: Date;
  completion: number;
  farmScore: number;
  aiReadiness: number;
  onEdit: () => void;
  onRefresh: () => void;
}

const ScoreTile: React.FC<{ value: number; label: string; sub: string; color: string }> = ({ value, label, sub, color }) => (
  <div className="rounded-2xl bg-white/80 dark:bg-white/5 border border-white/40 dark:border-white/10 backdrop-blur-xl p-3 text-center shadow-card">
    <p className="text-xl font-extrabold text-foreground tabular-nums" style={{ color }}>
      {value}
      <span className="text-xs font-bold text-muted-foreground">%</span>
    </p>
    <p className="text-[11px] font-bold text-foreground leading-tight mt-0.5">{label}</p>
    <p className="text-[10px] text-muted-foreground">{sub}</p>
  </div>
);

export const ProfileHero: React.FC<ProfileHeroProps> = ({
  profile,
  loading,
  memberSince,
  completion,
  farmScore,
  aiReadiness,
  onEdit,
  onRefresh,
}) => {
  const { t } = useLanguage();
  const memberSinceLabel = memberSince
    ? `${memberSince.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}`
    : '';

  if (loading || !profile) {
    return (
      <div className="space-y-4">
        <div className="rounded-[28px] bg-gradient-to-br from-emerald-900 via-slate-900 to-teal-950 p-6 sm:p-8 shadow-colorful">
          <div className="flex items-center gap-4">
            <Skeleton className="h-20 w-20 rounded-full bg-white/15" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-6 w-44 bg-white/20" />
              <Skeleton className="h-4 w-56 bg-white/15" />
              <Skeleton className="h-4 w-40 bg-white/15" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[92px] rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const { personal, location, preferredLanguage } = profile;
  const initials = (personal.fullName || 'Farmer').split(' ').slice(0, 2).map((s) => s[0]?.toUpperCase() ?? '').join('');
  const languageName = LANGUAGE_NAMES?.[preferredLanguage as keyof typeof LANGUAGE_NAMES] || 'English';

  return (
    <div className="space-y-4">
      {/* Hero identity card */}
      <div className="relative rounded-[28px] bg-gradient-to-br from-emerald-900 via-slate-900 to-teal-950 text-white shadow-colorful overflow-hidden border border-emerald-500/30">
        <div className="absolute -top-16 -right-16 h-56 w-56 rounded-full bg-emerald-500/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 h-40 w-40 rounded-full bg-marigold/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 p-6 sm:p-7">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-emerald-200">
                <ShieldCheck size={12} />
                {t('prof.verified')}
              </span>
              {profile.founding_farmer && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/25 border border-emerald-300/50 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-emerald-200 shadow-sm animate-pulse">
                  <Sprout size={13} className="text-emerald-300" />
                  🌱 FOUNDING FARMER {profile.founding_farmer_number ? `#${profile.founding_farmer_number}` : ''}
                </span>
              )}
            </div>
            <button
              onClick={onRefresh}
              aria-label="Refresh profile"
              className="rounded-full bg-white/10 hover:bg-white/20 active:scale-90 transition-all p-2"
            >
              <RotateCcw size={15} />
            </button>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row items-center sm:items-start gap-5">
            <div className="h-24 w-24 sm:h-28 sm:w-28 shrink-0 rounded-full border-4 border-white/20 shadow-xl overflow-hidden bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-3xl font-extrabold">
              {profile.profilePictureUrl ? (
                <img
                  src={profile.profilePictureUrl}
                  alt={personal.fullName}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                  className="h-full w-full object-cover"
                />
              ) : null}
              <span className="text-white select-none">{initials || '🌾'}</span>
            </div>

            <div className="flex-1 text-center sm:text-left space-y-2 min-w-0">
              <h2 className="text-2xl sm:text-[28px] font-extrabold tracking-tight leading-tight">
                {personal.fullName || t('prof.farmerGuest')}
              </h2>
              <p className="flex flex-wrap items-center justify-center sm:justify-start gap-x-2 gap-y-1 text-xs text-slate-200 font-medium">
                <span className="inline-flex items-center gap-1">
                  <MapPin size={13} className="text-emerald-300" />
                  {[location.villageOrTehsil, location.district, location.state].filter(Boolean).join(', ') || '—'}
                </span>
                <span className="text-slate-400">·</span>
                <span>🗣️ {languageName}</span>
              </p>
              <p className="text-[11px] text-slate-300/90">
                {t('prof.memberSince').replace('{date}', memberSinceLabel)}
              </p>
            </div>

            <button
              onClick={onEdit}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-white text-emerald-900 px-4 py-2 text-xs font-extrabold shadow-lg hover:bg-emerald-50 active:scale-95 transition-all"
            >
              <Pencil size={13} />
              {t('prof.editProfile')}
            </button>
          </div>
        </div>
      </div>

      {/* Score tiles */}
      <div className="grid grid-cols-3 gap-3">
        <ScoreTile value={farmScore} label={t('prof.farmScore')} sub={t('prof.farmScoreSub')} color="#15803d" />
        <ScoreTile value={aiReadiness} label={t('prof.aiReadiness')} sub={t('prof.aiReadinessSub')} color="#7c3aed" />
        <ScoreTile value={completion} label={t('prof.completion')} sub={t('prof.completionSub')} color="#d97706" />
      </div>

      {/* Completion progress bar */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-extrabold text-foreground flex items-center gap-1.5">
            <Sprout size={14} className="text-emerald-600" />
            {t('prof.completionTitle')}
          </p>
          <span className="text-xs font-bold text-muted-foreground tabular-nums">{completion}%</span>
        </div>
        <div className="h-2.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-lime-500 to-marigold transition-[width] duration-1000 ease-out"
            style={{ width: `${completion}%` }}
          />
        </div>
      </div>
    </div>
  );
};
