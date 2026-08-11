import React from 'react';
import { Bell, CloudSun, TrendingUp, Landmark, CalendarCheck2, Sparkles, ArrowRight, Send } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Switch } from '@/components/ui/switch';
import type { UseDigitalProfileReturn } from '../types';

interface NotificationsSectionProps {
  data: UseDigitalProfileReturn;
  onNavigate: (tab: string) => void;
}

const GROUPS: { key: 'weather' | 'market' | 'scheme' | 'booking' | 'ai'; icon: React.ReactNode; title: string; desc: string }[] = [
  { key: 'weather', icon: <CloudSun size={18} />, title: 'prof.weatherAlerts', desc: 'prof.weatherAlertsDesc' },
  { key: 'market', icon: <TrendingUp size={18} />, title: 'prof.marketAlerts', desc: 'prof.marketAlertsDesc' },
  { key: 'scheme', icon: <Landmark size={18} />, title: 'prof.schemeAlerts', desc: 'prof.schemeAlertsDesc' },
  { key: 'booking', icon: <CalendarCheck2 size={18} />, title: 'prof.bookingAlerts', desc: 'prof.bookingAlertsDesc' },
  { key: 'ai', icon: <Sparkles size={18} />, title: 'prof.aiAlerts', desc: 'prof.aiAlertsDesc' },
];

const TONES: Record<string, string> = {
  weather: 'bg-feature-weather/12 text-feature-weather',
  market: 'bg-feature-mandi/12 text-feature-mandi',
  scheme: 'bg-feature-loans/12 text-feature-loans',
  booking: 'bg-blue-500/12 text-blue-600 dark:text-blue-400',
  ai: 'bg-feature-ai/12 text-feature-ai',
};

export const NotificationsSection: React.FC<NotificationsSectionProps> = ({ data, onNavigate }) => {
  const { t } = useLanguage();

  return (
    <div className="space-y-5 pb-24">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold text-foreground tracking-tight">{t('prof.notifications')}</h2>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-card divide-y divide-border/60">
        {GROUPS.map((g) => (
          <div key={g.key} className="flex items-center gap-4 p-4">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${TONES[g.key]}`}>
              {g.icon}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-extrabold text-foreground">{t(g.title)}</p>
              <p className="text-[11px] text-muted-foreground leading-snug">{t(g.desc)}</p>
            </div>
            <Switch
              checked={data.notifPrefs[g.key]}
              onCheckedChange={() => data.toggleNotif(g.key)}
              aria-label={t(g.title)}
            />
          </div>
        ))}
      </div>

      <button
        onClick={() => onNavigate('notification-settings')}
        className="w-full inline-flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-card hover:bg-muted/40 transition-colors"
      >
        <span className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/12 text-emerald-600 dark:text-emerald-400">
            <Send size={18} />
          </span>
          <span className="text-left">
            <span className="block text-sm font-extrabold text-foreground">{t('prof.managePush')}</span>
            <span className="block text-[11px] text-muted-foreground">{t('prof.pushDesc')}</span>
          </span>
        </span>
        <ArrowRight size={16} className="text-muted-foreground shrink-0" />
      </button>

      <div className="rounded-2xl border border-feature-ai/20 bg-feature-ai/5 p-4 flex items-start gap-3">
        <Bell size={18} className="mt-0.5 shrink-0 text-feature-ai" />
        <p className="text-xs text-muted-foreground leading-relaxed">{t('prof.notifInfo')}</p>
      </div>
    </div>
  );
};
