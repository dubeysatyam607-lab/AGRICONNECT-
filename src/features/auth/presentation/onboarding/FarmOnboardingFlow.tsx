import React, { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { profileRepositoryImpl } from '@/features/profile/data/repositories/ProfileRepositoryImpl';
import { supabase } from '@/integrations/supabase/client';
import {
  buildFarmerProfile,
  defaultOnboardingData,
  loadOnboardingData,
  saveOnboardingData,
  type IOnboardingData,
} from './onboardingData';
import { WelcomeStep } from './steps/WelcomeStep';
import { LanguageStep } from './steps/LanguageStep';
import { BasicInfoStep } from './steps/BasicInfoStep';
import { FarmDetailsStep } from './steps/FarmDetailsStep';
import { ResourcesStep } from './steps/ResourcesStep';
import { InterestsStep } from './steps/InterestsStep';
import { PermissionsStep } from './steps/PermissionsStep';
import { AiSetupStep } from './steps/AiSetupStep';

/**
 * Personalized Farm Onboarding — an 8-step journey where every answer
 * trains the AI, ending in a dashboard that already knows the farmer.
 *
 * Welcome → Language → Basic Info → Farm Details → Resources →
 * Interests → Permissions → AI Setup.
 */
export const FarmOnboardingFlow: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const { language, t } = useLanguage();
  const [data, setData] = useState<IOnboardingData>(() => loadOnboardingData(language));
  // Restore the furthest step reached — farmers often lose connectivity mid-way.
  const [step, setStep] = useState(() => Math.min(Math.max(data.lastStep ?? 0, 0), 7));

  // Auto-save every answer and the current step so the journey is resumable.
  useEffect(() => {
    saveOnboardingData({ ...data, lastStep: step });
  }, [data, step]);

  // Safety net for flaky connectivity — save before the app is backgrounded/closed.
  useEffect(() => {
    const saveNow = () => {
      if (document.visibilityState === 'hidden') {
        saveOnboardingData({ ...data, lastStep: step });
      }
    };
    document.addEventListener('visibilitychange', saveNow);
    return () => document.removeEventListener('visibilitychange', saveNow);
  }, [data, step]);

  const set = (patch: Partial<IOnboardingData>) => setData((d) => ({ ...d, ...patch }));

  const finish = async () => {
    const completed = { ...data, completedAt: new Date().toISOString() };
    setData(completed);
    saveOnboardingData(completed);
    localStorage.setItem('agri_onboarding_seen', 'true');
    localStorage.setItem('agri_profile_complete', 'true');

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      const userId = session?.user?.id || 'demo-farmer-id';
      await profileRepositoryImpl.updateProfile(buildFarmerProfile(completed, userId));
      // Keep the dashboard greeting personal even right after sign-in.
      if (session) {
        await supabase.auth.updateUser({
          data: {
            full_name: completed.fullName,
            village: completed.village,
            district: completed.district,
            state: completed.state,
          },
        });
      }
    } catch (e) {
      console.warn('[FarmOnboardingFlow] Profile saved locally only:', e);
    }
    onComplete();
  };

  const goBack = () => setStep((s) => Math.max(0, s - 1));
  const goNext = () => setStep((s) => Math.min(s + 1, 7));

  const steps: { label: string; render: React.ReactNode }[] = [
    { label: 'Welcome', render: <WelcomeStep onNext={goNext} /> },
    {
      label: 'Language',
      render: <LanguageStep selected={data.language} onSelect={(l) => set({ language: l })} onNext={goNext} />,
    },
    {
      label: 'About you',
      render: <BasicInfoStep data={data} set={set} onNext={goNext} />,
    },
    {
      label: 'Your farm',
      render: <FarmDetailsStep data={data} set={set} onNext={goNext} />,
    },
    {
      label: 'Resources',
      render: <ResourcesStep data={data} set={set} onNext={goNext} />,
    },
    {
      label: 'Interests',
      render: <InterestsStep data={data} set={set} onNext={goNext} />,
    },
    {
      label: 'Permissions',
      render: <PermissionsStep data={data} set={set} onNext={goNext} />,
    },
    {
      label: 'AI Setup',
      render: <AiSetupStep data={data} onComplete={finish} />,
    },
  ];

  const total = steps.length;
  const current = steps[step];

  return (
    <div className="min-h-screen w-full bg-background relative overflow-hidden">
      {/* Ambient wash */}
      <div className="pointer-events-none absolute -top-32 -right-24 h-96 w-96 rounded-full bg-emerald-500/10 blur-[110px]" />
      <div className="pointer-events-none absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-amber-500/10 blur-[110px]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col px-6 py-7">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={goBack}
            disabled={step === 0}
            className="rounded-xl px-3 py-1.5 text-xs font-bold text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30 disabled:pointer-events-none"
          >
            {t('common.back')}
          </button>
          <div className="flex items-center gap-2">
            <span className="text-lg">🌱</span>
            <span className="text-sm font-extrabold tracking-tight text-emerald-700">AgriConnect</span>
          </div>
          <span className="text-[11px] font-bold text-slate-300">{step + 1}/{total}</span>
        </div>

        {/* Progress bar */}
        <div className="mt-4 flex gap-1">
          {steps.map((s, i) => (
            <span
              key={s.label}
              className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                i <= step ? 'bg-gradient-to-r from-emerald-500 to-lime-400' : 'bg-slate-200'
              }`}
            />
          ))}
        </div>

        {/* Step content */}
        <div key={step} className="mt-6 flex-1 animate-fade-in fill-mode-both">
          {current.render}
        </div>

        <p className="mt-6 pb-1 text-center text-[10px] font-medium text-slate-300">
          {t('onb.footer')}
        </p>
      </div>
    </div>
  );
};
