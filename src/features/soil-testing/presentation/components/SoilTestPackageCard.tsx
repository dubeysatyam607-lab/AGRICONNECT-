import React from 'react';
import { Check, Clock, Sparkles, ArrowRight } from 'lucide-react';
import { AgriCard } from '@/components/ui/agri-card';
import { AgriButton } from '@/components/ui/agri-button';
import { SoilTestPackage } from '../domain/soilTestingTypes';
import { useLanguage } from '@/contexts/LanguageContext';

interface SoilTestPackageCardProps {
  pkg: SoilTestPackage;
  onSelect: (pkg: SoilTestPackage) => void;
}

export const SoilTestPackageCard: React.FC<SoilTestPackageCardProps> = ({ pkg, onSelect }) => {
  const { t } = useLanguage();

  return (
    <AgriCard
      className={`relative flex flex-col justify-between p-6 rounded-2xl transition-all duration-300 hover:shadow-xl border ${
        pkg.popular
          ? 'border-emerald-500/50 dark:border-emerald-500/40 bg-gradient-to-b from-emerald-500/5 via-transparent to-transparent shadow-md'
          : 'border-border/60 hover:border-emerald-400/40'
      }`}
    >
      {pkg.popular && (
        <div className="absolute -top-3.5 right-6 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md flex items-center gap-1.5 tracking-wide">
          <Sparkles className="w-3.5 h-3.5" />
          {t('soil.badge.mostPopular') || 'Most Popular'}
        </div>
      )}

      <div>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <h3 className="text-xl font-bold text-foreground tracking-tight">
              {t(pkg.titleKey) || pkg.titleEn}
            </h3>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
              <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>
                {t('soil.processingTime') || 'Report in'}{' '}
                <strong className="text-foreground font-semibold">
                  {pkg.processingTimeDays} {t('soil.days') || 'Days'}
                </strong>
              </span>
            </div>
          </div>
        </div>

        <div className="my-4 pb-4 border-b border-border/50">
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-extrabold text-foreground tracking-tight">
              ₹{pkg.price.toFixed(0)}
            </span>
            <span className="text-xs text-muted-foreground font-medium">
              / {t('soil.perSample') || 'sample'}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed italic">
            "{pkg.recommendedFor}"
          </p>
        </div>

        {/* Parameters Tested */}
        <div className="mb-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
            {t('soil.parametersTested') || 'Parameters Tested'} ({pkg.parametersTested.length})
          </h4>
          <ul className="space-y-1.5 text-xs text-foreground/90">
            {pkg.parametersTested.map((param, idx) => (
              <li key={idx} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span>{param}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* What Farmer Receives */}
        <div className="mb-6 pt-3 border-t border-border/40">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
            {t('soil.whatYouReceive') || 'What You Receive'}
          </h4>
          <ul className="space-y-1.5 text-xs text-foreground/90">
            {pkg.farmerReceives.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <AgriButton
        onClick={() => onSelect(pkg)}
        variant={pkg.popular ? 'primary' : 'outline'}
        className="w-full font-bold flex items-center justify-center gap-2 py-3 rounded-xl shadow-sm"
      >
        <span>{t('soil.cta.bookThisTest') || 'Book This Test'}</span>
        <ArrowRight className="w-4 h-4" />
      </AgriButton>
    </AgriCard>
  );
};
