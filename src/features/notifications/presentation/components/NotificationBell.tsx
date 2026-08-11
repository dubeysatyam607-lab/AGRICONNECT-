import React from 'react';
import { Bell } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { interpolate } from '@/i18n/journey';
import { useNotifications } from '../hooks/useNotifications';

interface NotificationBellProps {
  onNavigate: (tab: string) => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ onNavigate }) => {
  const { t } = useLanguage();
  const { unread } = useNotifications();

  return (
    <button
      onClick={() => onNavigate('notifications')}
      className="relative p-2.5 rounded-xl border border-border bg-background/60 text-muted-foreground hover:text-foreground transition-colors"
      aria-label={unread > 0 ? interpolate(t('notif.bell.unread'), { count: unread }) : t('notif.bell.label')}
    >
      <Bell size={17} />
      {unread > 0 && (
        <span className="absolute -top-1 -right-1 h-4 min-w-4 px-0.5 rounded-full bg-rose-600 text-white text-[9px] font-black flex items-center justify-center">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </button>
  );
};
