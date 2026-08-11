import React, { useState } from 'react';
import { useProfileViewModel } from '../viewmodels/useProfileViewModel';
import { AppButton } from '@/shared/widgets/AppButton';
import { AppCard } from '@/shared/widgets/AppCard';
import { FadeIn } from '@/shared/widgets/AppAnimations';
import { ProfileAvatarUploader } from '../components/ProfileAvatarUploader';
import { PersonalDetailsSection } from '../components/PersonalDetailsSection';
import { FarmLocationGpsSection } from '../components/FarmLocationGpsSection';
import { FarmAgriSpecsSection } from '../components/FarmAgriSpecsSection';
import { CropsAndMachinerySection } from '../components/CropsAndMachinerySection';
import { LivestockSection } from '../components/LivestockSection';
import { useLanguage, LANGUAGE_NAMES, Language } from '@/contexts/LanguageContext';

/**
 * Enterprise Edit Farmer Profile View.
 * Multi-tab accordion/stepper wizard dividing all 14 profile requirements into clean, digestible sections.
 */
interface IEditFarmerProfileViewProps {
  onSuccess: () => void;
  onCancel: () => void;
}

type ProfileTab = 'personal' | 'location' | 'agri-specs' | 'assets';

export const EditFarmerProfileView: React.FC<IEditFarmerProfileViewProps> = ({ onSuccess, onCancel }) => {
  const { t, language, setLanguage } = useLanguage() || {};
  const [activeTab, setActiveTab] = useState<ProfileTab>('personal');
  const [state, { saveProfile, updateProfileField, updateNestedField, captureGpsLocation, uploadAvatar, clearError }] = useProfileViewModel();

  if (state.isLoading || !state.profile) {
    return (
      <div className="w-full py-16 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('pdetail.loadingEdit')}</p>
      </div>
    );
  }

  const { personal, location, farmSpecs, crops, machineryOwned, livestock, preferredLanguage } = state.profile;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    if (!state.profile) return;
    const success = await saveProfile(state.profile);
    if (success) {
      onSuccess();
    }
  };

  const tabs: { id: ProfileTab; label: string; icon: string }[] = [
    { id: 'personal', label: t('pdetail.tabPersonal'), icon: '👤' },
    { id: 'location', label: t('pdetail.tabLocation'), icon: '📍' },
    { id: 'agri-specs', label: t('pdetail.tabSoil'), icon: '🌾' },
    { id: 'assets', label: t('pdetail.tabAssets'), icon: '🚜' },
  ];

  return (
    <FadeIn className="w-full space-y-6 pb-20">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-foreground hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            ←
          </button>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">{t('pdetail.editWizard')}</h1>
            <p className="text-xs text-muted-foreground">{t('pdetail.editWizardSub')}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <AppButton variant="secondary" size="sm" onClick={onCancel}>
            {t('prof.cancel')}
          </AppButton>
          <AppButton variant="primary" size="sm" onClick={handleSave} isLoading={state.isSaving}>
            💾 {t('prof.save')}
          </AppButton>
        </div>
      </div>

      {state.error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 dark:text-rose-400 text-xs font-medium animate-shake">
          ⚠️ {state.error}
        </div>
      )}

      {/* Profile Picture Uploader */}
      <ProfileAvatarUploader
        currentUrl={state.profile.profilePictureUrl}
        fullName={personal.fullName}
        onImageSelected={uploadAvatar}
      />

      {/* Language Preferences Bar */}
      <div className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">🗣️</span>
          <div>
            <h4 className="text-sm font-extrabold text-foreground">{t('pdetail.dashLang')}</h4>
            <p className="text-xs text-muted-foreground">{t('pdetail.dashLangSub')}</p>
          </div>
        </div>
        <select
          value={preferredLanguage}
          onChange={(e) => {
            const langCode = e.target.value as Language;
            updateProfileField('preferredLanguage', langCode);
            if (setLanguage) setLanguage(langCode);
          }}
          className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
        >
          {Object.entries(LANGUAGE_NAMES || { en: 'English', hi: 'Hindi', pa: 'Punjabi', mr: 'Marathi' }).map(([code, name]) => (
            <option key={code} value={code}>
              {name}
            </option>
          ))}
        </select>
      </div>

      {/* Multi-Tab Switcher Navigation */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                isActive
                  ? 'bg-white dark:bg-slate-900 text-foreground shadow-sm scale-[1.02]'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>{tab.icon}</span>
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      <form onSubmit={handleSave}>
        <AppCard variant="glass" padding="lg">
          {activeTab === 'personal' && (
            <PersonalDetailsSection
              personal={personal}
              onChange={(updated) => updateProfileField('personal', updated)}
            />
          )}

          {activeTab === 'location' && (
            <FarmLocationGpsSection
              location={location}
              isLocating={state.isGpsLocating}
              onLocationChange={(updated) => updateProfileField('location', updated)}
              onCaptureGps={captureGpsLocation}
            />
          )}

          {activeTab === 'agri-specs' && (
            <FarmAgriSpecsSection
              specs={farmSpecs}
              onChange={(updated) => updateProfileField('farmSpecs', updated)}
            />
          )}

          {activeTab === 'assets' && (
            <div className="space-y-8">
              <CropsAndMachinerySection
                crops={crops}
                machinery={machineryOwned}
                onCropsChange={(updated) => updateProfileField('crops', updated)}
                onMachineryChange={(updated) => updateProfileField('machineryOwned', updated)}
              />
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                <LivestockSection
                  livestock={livestock}
                  onChange={(updated) => updateProfileField('livestock', updated)}
                />
              </div>
            </div>
          )}

          {/* Stepper Footer Buttons */}
          <div className="pt-8 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              {activeTab !== 'personal' ? (
                <AppButton
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={() => {
                    const idx = tabs.findIndex((t) => t.id === activeTab);
                    if (idx > 0) setActiveTab(tabs[idx - 1].id);
                  }}
                >
                  ← {t('pdetail.prevSection')}
                </AppButton>
              ) : (
                <div />
              )}
            </div>

            <div>
              {activeTab !== 'assets' ? (
                <AppButton
                  type="button"
                  variant="primary"
                  size="md"
                  onClick={() => {
                    const idx = tabs.findIndex((t) => t.id === activeTab);
                    if (idx < tabs.length - 1) setActiveTab(tabs[idx + 1].id);
                  }}
                >
                  {t('pdetail.nextSection')} →
                </AppButton>
              ) : (
                <AppButton type="submit" variant="primary" size="lg" isLoading={state.isSaving}>
                  💾 {t('pdetail.saveComplete')}
                </AppButton>
              )}
            </div>
          </div>
        </AppCard>
      </form>
    </FadeIn>
  );
};
