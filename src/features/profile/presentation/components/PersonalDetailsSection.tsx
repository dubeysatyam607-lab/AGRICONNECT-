import React, { useState } from 'react';
import { IFarmerPersonalDetails, GenderType } from '../../domain/models/FarmerProfile';
import { maskAadhaar } from '../../domain/models/ProfileValidations';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * Enterprise Personal Details & Aadhaar Section.
 * Includes privacy masking for optional Aadhaar number and verified status indicators.
 */
interface IPersonalDetailsSectionProps {
  personal: IFarmerPersonalDetails;
  onChange: (updated: IFarmerPersonalDetails) => void;
}

export const PersonalDetailsSection: React.FC<IPersonalDetailsSectionProps> = ({ personal, onChange }) => {
  const { t } = useLanguage();
  const [showAadhaar, setShowAadhaar] = useState(false);

  const handleFieldChange = (field: keyof IFarmerPersonalDetails, value: any) => {
    onChange({
      ...personal,
      [field]: value,
    });
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-2">
        <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
          <span>👤</span> {t('pdetail.personalIdentity')}
        </h3>
        <p className="text-xs text-muted-foreground">{t('pdetail.personalIdentitySub')}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Full Name */}
        <div className="space-y-1">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {t('pdetail.fullName')}
          </label>
          <input
            type="text"
            required
            value={personal.fullName}
            onChange={(e) => handleFieldChange('fullName', e.target.value)}
            placeholder="e.g., Rajesh Kumar Singh"
            className="w-full px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium transition-all"
          />
        </div>

        {/* Mobile Number */}
        <div className="space-y-1">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
            <span>{t('pdetail.mobileNumber')}</span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">{t('pdetail.verifiedMobile')}</span>
          </label>
          <input
            type="tel"
            required
            value={personal.mobileNumber}
            onChange={(e) => handleFieldChange('mobileNumber', e.target.value)}
            placeholder="+91 9876543210"
            className="w-full px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium transition-all"
          />
        </div>

        {/* Email Address */}
        <div className="space-y-1">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {t('pdetail.email')}
          </label>
          <input
            type="email"
            value={personal.emailAddress || ''}
            onChange={(e) => handleFieldChange('emailAddress', e.target.value)}
            placeholder="farmer@krishi.in"
            className="w-full px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium transition-all"
          />
        </div>

        {/* Gender Selector */}
        <div className="space-y-1">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('pdetail.gender')}</label>
          <select
            value={personal.gender}
            onChange={(e) => handleFieldChange('gender', e.target.value as GenderType)}
            className="w-full px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium transition-all"
          >
            <option value="Male">{t('pdetail.genderMale')}</option>
            <option value="Female">{t('pdetail.genderFemale')}</option>
            <option value="Other">{t('pdetail.genderOther')}</option>
            <option value="Prefer not to say">{t('pdetail.genderPreferNot')}</option>
          </select>
        </div>

        {/* Date of Birth */}
        <div className="space-y-1">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('pdetail.dob')}</label>
          <input
            type="date"
            value={personal.dateOfBirth || ''}
            onChange={(e) => handleFieldChange('dateOfBirth', e.target.value)}
            className="w-full px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium transition-all"
          />
        </div>

        {/* Optional Aadhaar Number with Privacy Masking */}
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <span>{t('pdetail.aadhaarCard')}</span>
              {personal.isAadhaarVerified && (
                <span className="px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-extrabold border border-emerald-500/20">
                  {t('pdetail.verifiedBadge')}
                </span>
              )}
            </label>
            {personal.aadhaarNumber && (
              <button
                type="button"
                onClick={() => setShowAadhaar(!showAadhaar)}
                className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                {showAadhaar ? t('pdetail.hide') : t('pdetail.reveal')}
              </button>
            )}
          </div>
          <input
            type="text"
            maxLength={14}
            value={showAadhaar ? personal.aadhaarNumber || '' : maskAadhaar(personal.aadhaarNumber)}
            onChange={(e) => {
              const raw = e.target.value.replace(/\D/g, '').slice(0, 12);
              handleFieldChange('aadhaarNumber', raw);
              handleFieldChange('isAadhaarVerified', raw.length === 12);
            }}
            placeholder={t('pdetail.aadhaarPlaceholder')}
            className="w-full px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium transition-all font-mono tracking-wider"
          />
          <p className="text-[10px] text-muted-foreground pt-0.5">
            {t('pdetail.aadhaarPrivacy')}
          </p>
        </div>
      </div>
    </div>
  );
};
