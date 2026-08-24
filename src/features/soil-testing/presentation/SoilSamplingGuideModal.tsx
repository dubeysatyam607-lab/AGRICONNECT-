import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Shuffle,
  ShieldCheck,
  PackageCheck,
  X,
} from 'lucide-react';
import { AgriButton } from '@/components/ui/agri-button';
import { useLanguage } from '@/contexts/LanguageContext';

interface SoilSamplingGuideModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SoilSamplingGuideModal: React.FC<SoilSamplingGuideModalProps> = ({
  open,
  onOpenChange,
}) => {
  const { t } = useLanguage();

  const STEPS = [
    {
      step: '01',
      title: t('soil.guide.step1.title') || 'Zig-Zag 5-Spot Sampling',
      desc: t('soil.guide.step1.desc') || 'Walk in a "W" or "Z" zig-zag pattern across your plot. Pick 5 to 8 different representative spots to ensure composite soil accuracy.',
      icon: Shuffle,
    },
    {
      step: '02',
      title: t('soil.guide.step2.title') || 'Dig 6-Inch "V" Shape Depth',
      desc: t('soil.guide.step2.desc') || 'Clear surface debris/weeds. Make a 6-inch (15 cm) deep "V" shaped pit with a spade. Take a uniform 1-inch thick slice from top to bottom.',
      icon: Layers,
    },
    {
      step: '03',
      title: t('soil.guide.step3.title') || 'Quartering & Thorough Mixing',
      desc: t('soil.guide.step3.desc') || 'Combine all 5 spot samples in a clean plastic bucket. Mix thoroughly, divide into quarters, and discard opposite quarters until ~500 grams remain.',
      icon: PackageCheck,
    },
    {
      step: '04',
      title: t('soil.guide.step4.title') || 'Pack & Label with Order ID',
      desc: t('soil.guide.step4.desc') || 'Shade-dry the sample (never dry in direct hot sun). Pack in a clean airtight plastic bag. Write your Order ID, Farmer Name, and Field Name clearly on the tag.',
      icon: ShieldCheck,
    },
  ];

  const DOS_AND_DONTS = [
    {
      type: 'do',
      text: t('soil.guide.do1') || 'Take separate samples for different soil types or elevated patches.',
    },
    {
      type: 'do',
      text: t('soil.guide.do2') || 'Use clean plastic buckets and stainless steel or iron khurpi/spade.',
    },
    {
      type: 'dont',
      text: t('soil.guide.dont1') || 'DO NOT collect from field bunds, fences, tree shades, or water channels.',
    },
    {
      type: 'dont',
      text: t('soil.guide.dont2') || 'DO NOT sample within 21 days of applying chemical fertilizers, urea, or lime.',
    },
    {
      type: 'dont',
      text: t('soil.guide.dont3') || 'DO NOT collect from manure/compost storage piles or burned trash areas.',
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6 rounded-2xl">
        <DialogHeader className="mb-4">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            {t('soil.guide.eyebrow') || 'Standard ICAR Scientific Protocol'}
          </div>
          <DialogTitle className="text-xl font-extrabold text-foreground">
            {t('soil.guide.title') || 'Visual Soil Sampling Guide (Mitti Namuna Vidhi)'}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {t('soil.guide.subtitle') || 'Accurate lab test results begin with a clean, composite soil sample. Follow these 4 easy steps:'}
          </DialogDescription>
        </DialogHeader>

        {/* Visual Zig-zag representation diagram */}
        <div className="bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 rounded-2xl p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
              {t('soil.guide.diagramTitle') || 'Field Pattern Illustration (Zig-Zag "W" Path)'}
            </span>
            <span className="text-[11px] bg-emerald-600 text-white font-semibold px-2 py-0.5 rounded-full">
              5 Spots · 15 cm Depth
            </span>
          </div>

          <div className="grid grid-cols-5 gap-2 text-center my-3">
            {[
              { label: 'Spot 1', sub: 'North-West' },
              { label: 'Spot 2', sub: 'Center-South' },
              { label: 'Spot 3', sub: 'Central Plot' },
              { label: 'Spot 4', sub: 'Center-North' },
              { label: 'Spot 5', sub: 'South-East' },
            ].map((spot, idx) => (
              <div
                key={idx}
                className="bg-white/80 dark:bg-card/80 border border-emerald-300/60 dark:border-emerald-700/60 rounded-xl p-2.5 shadow-sm flex flex-col items-center"
              >
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-extrabold flex items-center justify-center mb-1">
                  {idx + 1}
                </div>
                <div className="text-xs font-bold text-foreground">{spot.label}</div>
                <div className="text-[10px] text-muted-foreground">{spot.sub}</div>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-emerald-800 dark:text-emerald-300 text-center mt-2">
            Collect ~200g from each of the 5 spots, mix into 1 composite 500g sample.
          </p>
        </div>

        {/* 4 Step Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
          {STEPS.map((s, idx) => {
            const Icon = s.icon;
            return (
              <div
                key={idx}
                className="bg-card border border-border/70 rounded-xl p-4 flex items-start gap-3 shadow-sm hover:border-emerald-500/40 transition-colors"
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      STEP {s.step}
                    </span>
                    <h4 className="text-xs font-bold text-foreground">{s.title}</h4>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Do's and Don'ts */}
        <div className="bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 rounded-2xl p-4 mb-4">
          <h4 className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            {t('soil.guide.precautions') || 'Critical Precautions (Savdhaniya)'}
          </h4>
          <ul className="space-y-2 text-xs">
            {DOS_AND_DONTS.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2">
                {item.type === 'do' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                )}
                <span className={item.type === 'dont' ? 'text-red-900 dark:text-red-300 font-medium' : 'text-foreground'}>
                  {item.text}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex justify-end pt-2">
          <AgriButton onClick={() => onOpenChange(false)} variant="primary" className="font-bold px-6">
            {t('soil.guide.gotIt') || 'I Understand, Continue Booking'}
          </AgriButton>
        </div>
      </DialogContent>
    </Dialog>
  );
};
