import React from 'react';
import { ScanLine, Bot, CloudSun, Bookmark, Landmark, Newspaper } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { EmptyState } from '@/components/ui/error-state';
import type { UseDigitalProfileReturn } from '../types';

interface ActivitiesSectionProps {
  data: UseDigitalProfileReturn;
}

export const ActivitiesSection: React.FC<ActivitiesSectionProps> = ({ data }) => {
  const { t } = useLanguage();

  const counts = {
    scan: data.activities.filter((a) => a.kind === 'scan').length,
    chat: data.chatCount,
    weather: data.activities.filter((a) => a.kind === 'weather').length,
    article: data.activities.filter((a) => a.kind === 'article').length,
    scheme: data.activities.filter((a) => a.kind === 'scheme').length,
    bookmark: data.favCount + data.activities.filter((a) => a.kind === 'bookmark').length,
  };

  const tiles = [
    { key: 'scan', icon: ScanLine, label: t('prof.cropScans'), value: counts.scan, tone: 'bg-feature-doctor/12 text-feature-doctor' },
    { key: 'chat', icon: Bot, label: t('prof.aiChats'), value: counts.chat, tone: 'bg-feature-ai/12 text-feature-ai' },
    { key: 'weather', icon: CloudSun, label: t('prof.weatherHistory'), value: counts.weather, tone: 'bg-feature-weather/12 text-feature-weather' },
    { key: 'article', icon: Newspaper, label: t('prof.savedArticles'), value: counts.article, tone: 'bg-feature-news/12 text-feature-news' },
    { key: 'scheme', icon: Landmark, label: t('prof.savedSchemes'), value: counts.scheme, tone: 'bg-feature-loans/12 text-feature-loans' },
    { key: 'bookmark', icon: Bookmark, label: t('prof.bookmarks'), value: counts.bookmark, tone: 'bg-feature-mandi/12 text-feature-mandi' },
  ];

  return (
    <div className="space-y-5 pb-24">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold text-foreground tracking-tight">{t('prof.activities')}</h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {tiles.map((tile) => {
          const Icon = tile.icon;
          return (
            <div key={tile.key} className="rounded-2xl border border-border bg-card p-4 shadow-card text-center transition-all hover:-translate-y-0.5 hover:shadow-soft">
              <span className={`mx-auto inline-flex h-10 w-10 items-center justify-center rounded-2xl ${tile.tone}`}>
                <Icon size={19} />
              </span>
              <p className="mt-2 text-xl font-extrabold text-foreground tabular-nums">{tile.value}</p>
              <p className="text-[11px] font-bold text-muted-foreground">{tile.label}</p>
            </div>
          );
        })}
      </div>

      <section>
        <h3 className="mb-2.5 text-sm font-extrabold text-foreground">{t('prof.recentActivity')}</h3>
        {data.activities.length === 0 ? (
          <EmptyState compact emoji="🕘" title={t('prof.noActivity')} description={t('prof.noActivityHint')} />
        ) : (
          <div className="rounded-2xl border border-border bg-card shadow-card divide-y divide-border/60">
            {data.activities.slice(0, 8).map((a) => (
              <div key={a.id} className="flex items-center gap-3 p-3.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground text-lg">
                  {a.kind === 'scan' ? '🔍' : a.kind === 'chat' ? '🤖' : a.kind === 'weather' ? '⛅' : a.kind === 'article' ? '📰' : a.kind === 'scheme' ? '🏛️' : '🔖'}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-foreground truncate">{a.title}</p>
                  {a.meta && <p className="text-[11px] text-muted-foreground">{a.meta}</p>}
                </div>
                <span className="shrink-0 text-[10px] font-bold text-muted-foreground">{a.date}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
