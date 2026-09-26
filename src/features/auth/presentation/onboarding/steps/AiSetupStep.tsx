import React, { useEffect, useMemo, useState } from 'react';
import { Sun, Wheat, Sprout } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { interpolate } from '@/i18n/journey';
import { generateRecommendations, type IOnboardingData } from '../onboardingData';
import { OnboardingCta } from './common';

/**
 * STEP 8 — AI Setup. Trains the assistant, then reveals the first
 * personalized dashboard: weather, mandi, schemes and suggested tasks.
 */
const LOADING_STEPS = ['onb.ai.load1', 'onb.ai.load2', 'onb.ai.load3', 'onb.ai.load4', 'onb.ai.load5'];

export const AiSetupStep: React.FC<{ data: IOnboardingData; onComplete: () => void }> = ({ data, onComplete }) => {
 const { t } = useLanguage();
 const [phase, setPhase] = useState<'loading' | 'ready'>('loading');
 const [loadingIndex, setLoadingIndex] = useState(0);
 const recommendations = useMemo(() => generateRecommendations(data, t), [data, t]);
 const firstName = data.fullName.trim().split(' ')[0] || t('onb.ai.farmer');

 useEffect(() => {
 if (phase !== 'loading') return;
 const stepTimer = setInterval(() => setLoadingIndex((i) => Math.min(i + 1, LOADING_STEPS.length - 1)), 640);
 const done = setTimeout(() => setPhase('ready'), 2900);
 return () => {
 clearInterval(stepTimer);
 clearTimeout(done);
 };
 }, [phase]);

 if (phase === 'loading') {
 return (
 <div className="flex min-h-full flex-col items-center justify-center py-10 text-center">
 <div className="relative flex h-20 w-20 items-center justify-center">
 <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-emerald-700">
 <svg viewBox="0 0 24 24" className="h-10 w-10 text-white" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
 <circle cx="12" cy="12" r="3.2" />
 <path d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4M5.3 5.3l2.8 2.8M15.9 15.9l2.8 2.8M18.7 5.3l-2.8 2.8M8.1 15.9l-2.8 2.8" />
 </svg>
 </div>
 </div>
 <h2 className="mt-6 type-h1">{t('onb.ai.preparing')}</h2>
 <p className="mt-2 type-small text-muted-foreground">{t(LOADING_STEPS[loadingIndex])}</p>
 <div className="mt-5 h-1.5 w-48 overflow-hidden rounded-full bg-muted">
 <div
 className="h-full rounded-full bg-emerald-700 transition-all duration-500"
 style={{ width: `${Math.round(((loadingIndex + 1) / LOADING_STEPS.length) * 100)}%` }}
 />
 </div>
 </div>
 );
 }

 return (
 <div className="pb-2">
 <div className="text-center">
 <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-widest text-emerald-700">
 {t('onb.ai.badge')}
 </span>
 <h2 className="mt-3 type-h1">
 {interpolate(t('onb.ai.ready'), { name: firstName })}
 </h2>
 <p className="mt-1 type-small text-muted-foreground">{t('onb.ai.readySub')}</p>
 </div>

 <div className="mt-5 space-y-3">
 {/* Weather */}
 <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
 <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Sun className="h-6 w-6" aria-hidden="true" /></span>
 <div className="min-w-0 flex-1">
 <p className="type-h3 leading-none">{recommendations.weather.temp}</p>
 <p className="mt-1 type-small font-semibold">{recommendations.weather.title}</p>
 <p className="mt-0.5 truncate type-meta text-muted-foreground">{recommendations.weather.detail}</p>
 </div>
 </div>

 {/* Mandi */}
 <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
 <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600"><Wheat className="h-6 w-6" aria-hidden="true" /></span>
 <div className="min-w-0 flex-1">
 <p className="type-label">{t('onb.ai.mandiToday')}</p>
 <p className="type-h3 leading-none">{recommendations.mandi.crop}</p>
 <p className="mt-0.5 type-meta text-muted-foreground">
 {interpolate(t('rec.mandi.line'), { price: recommendations.mandi.price, market: recommendations.mandi.market })}
 </p>
 </div>
 </div>

 {/* Schemes */}
 <div className="rounded-xl border border-border bg-card p-4">
 <p className="type-label">{t('onb.ai.schemes')}</p>
 <div className="mt-2.5 space-y-2">
 {recommendations.schemes.map((s) => (
 <div key={s.title} className="flex items-start gap-2.5">
 <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary"></span>
 <div>
 <p className="type-small font-semibold text-foreground">{s.title}</p>
 <p className="type-meta text-muted-foreground">{s.detail}</p>
 </div>
 </div>
 ))}
 </div>
 </div>

 {/* Suggested tasks */}
 <div className="rounded-xl border border-border bg-card p-4">
 <p className="type-label">{t('onb.ai.tasks')}</p>
 <ul className="mt-2.5 space-y-2">
 {recommendations.tasks.slice(0, 3).map((task) => (
 <li key={task} className="flex items-start gap-2.5">
 <span className="mt-0.5 text-primary"><Sprout className="h-4 w-4" aria-hidden="true" /></span>
 <span className="type-small font-medium leading-relaxed text-foreground">{task}</span>
 </li>
 ))}
 </ul>
 </div>
 </div>

 <div className="mt-6">
 <OnboardingCta label={t('onb.ai.open')} onClick={onComplete} />
 </div>
 </div>
 );
};
