import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { interpolate } from '@/i18n/journey';
import { PERMISSION_OPTIONS, type IOnboardingData } from '../onboardingData';
import { OnboardingCta, StepTitle } from './common';

/**
 * STEP 7 — Permissions. Honest, human explanations for every permission we ask.
 */
export const PermissionsStep: React.FC<{
  data: IOnboardingData;
  set: (patch: Partial<IOnboardingData>) => void;
  onNext: () => void;
}> = ({ data, set, onNext }) => {
  const { t } = useLanguage();
  const [requesting, setRequesting] = useState<string | null>(null);

  const update = (id: keyof IOnboardingData['permissions'], value: boolean) =>
    set({ permissions: { ...data.permissions, [id]: value } });

  const tryRealRequest = async (id: keyof IOnboardingData['permissions']): Promise<void> => {
    try {
      if (id === 'location' && typeof navigator !== 'undefined' && 'geolocation' in navigator) {
        await new Promise<void>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            () => resolve(),
            () => resolve(),
            { timeout: 4000 },
          );
        });
      }
      if (id === 'notifications' && 'Notification' in window) {
        const result = await Notification.requestPermission();
        if (result === 'denied') return; // keep toggle off if the browser denied it
      }
      update(id, true);
    } catch {
      update(id, true);
    }
  };

  const handleToggle = async (id: keyof IOnboardingData['permissions']) => {
    if (data.permissions[id]) {
      update(id, false);
      return;
    }
    setRequesting(id);
    await tryRealRequest(id);
    setRequesting(null);
  };

  const grantAll = async () => {
    setRequesting('all');
    for (const p of PERMISSION_OPTIONS) {
      if (!data.permissions[p.id]) await tryRealRequest(p.id);
    }
    setRequesting(null);
    onNext();
  };

  return (
    <div>
      <StepTitle
        badge={t('onb.perm.badge')}
        title={t('onb.perm.title')}
        subtitle={t('onb.perm.subtitle')}
      />

      <div className="space-y-2.5">
        {PERMISSION_OPTIONS.map((perm, i) => {
          const active = data.permissions[perm.id];
          const whyKey = perm.id === 'location' ? 'onb.perm.locWhy' : perm.id === 'notifications' ? 'onb.perm.notifWhy' : perm.id === 'camera' ? 'onb.perm.camWhy' : 'onb.perm.galWhy';
          return (
            <div
              key={perm.id}
              className={`animate-slide-up fill-mode-both rounded-2xl border-2 bg-white p-4 transition-colors ${
                active ? 'border-emerald-500 bg-emerald-50/60' : 'border-slate-200'
              }`}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-100 to-lime-100 text-lg">
                  {perm.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-extrabold text-slate-800">{t(`opt:${perm.title}`)}</p>
                    <button
                      type="button"
                      aria-pressed={active}
                      onClick={() => handleToggle(perm.id)}
                      disabled={requesting !== null}
                      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-60 ${
                        active ? 'bg-emerald-500' : 'bg-slate-200'
                      }`}
                    >
                      <span
                        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${
                          active ? 'left-6' : 'left-1'
                        }`}
                      />
                    </button>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">{t(whyKey)}</p>
                  {requesting === perm.id && (
                    <p className="mt-1 text-[11px] font-bold text-emerald-600">{interpolate(t('onb.perm.asking'), { name: t(`opt:${perm.title}`) })}</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8">
        <OnboardingCta label={t('onb.perm.allowAll')} loading={requesting === 'all'} disabled={requesting !== null} onClick={grantAll} />
        <button
          type="button"
          onClick={onNext}
          className="mt-2 w-full py-2 text-center text-xs font-bold text-slate-400 transition-colors hover:text-slate-600"
        >
          {t('onb.perm.skip')}
        </button>
      </div>
    </div>
  );
};
