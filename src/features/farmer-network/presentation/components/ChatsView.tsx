import React, { useState } from 'react';
import { ArrowLeft, Camera, MapPin, Mic, Send } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { interpolate } from '@/i18n/journey';
import { cn } from '@/lib/utils';
import { Avatar } from './Avatar';
import type { ChatMessage, ChatThread } from '../../domain/networkTypes';

interface ChatsViewProps {
  threads: ChatThread[];
  onStart: (input: { participantId: string; participantName: string; participantType: 'farmer' | 'provider' | 'buyer'; firstMessage: string }) => void;
  onSend: (threadId: string, text: string, type: ChatMessage['type']) => void;
  onRead: (threadId: string) => void;
  onToast?: (message: string) => void;
}

const QUICK_ACTIONS: Array<{ type: ChatMessage['type']; icon: React.ComponentType<{ size?: number; className?: string }>; labelKey: string }> = [
  { type: 'image', icon: Camera, labelKey: 'fnet.chat.photo' },
  { type: 'voice', icon: Mic, labelKey: 'fnet.chat.voice' },
  { type: 'location', icon: MapPin, labelKey: 'fnet.chat.location' },
];

export const ChatsView: React.FC<ChatsViewProps> = ({ threads, onStart, onSend, onRead, onToast }) => {
  const { t } = useLanguage();
  const [active, setActive] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  const thread = threads.find((x) => x.id === active) ?? null;

  const send = () => {
    if (!draft.trim() || !thread) return;
    onSend(thread.id, draft.trim(), 'text');
    setDraft('');
  };

  const quick = (type: ChatMessage['type']) => {
    if (!thread) return;
    const msg =
      type === 'image' ? t('fnet.chat.imageMsg')
        : type === 'voice' ? t('fnet.chat.voiceMsg')
          : t('fnet.chat.locationMsg');
    onSend(thread.id, msg, type);
    onToast?.(t('fnet.toast.messageSent'));
  };

  /* Conversation view */
  if (thread) {
    return (
      <div className="mt-4">
        <div className="rounded-2xl border border-border bg-card shadow-card">
          <div className="flex items-center gap-2.5 border-b border-border p-3">
            <button
              onClick={() => { onRead(thread.id); setActive(null); }}
              className="rounded-full p-1.5 text-muted-foreground hover:text-foreground"
              aria-label={t('common.back')}
            >
              <ArrowLeft size={15} />
            </button>
            <Avatar
              user={{ initials: thread.participantName.slice(0, 2).toUpperCase(), name: thread.participantName, type: thread.participantType, verified: false }}
            />
            <div>
              <p className="text-xs font-black text-foreground">{thread.participantName}</p>
              <p className="text-[10px] font-semibold text-muted-foreground">{t(`fnet.type.${thread.participantType}`)}</p>
            </div>
          </div>

          <div className="h-[46vh] space-y-2 overflow-y-auto p-3">
            {thread.messages.length === 0 && (
              <p className="py-10 text-center text-xs font-semibold text-muted-foreground">{t('fnet.chat.empty')}</p>
            )}
            {thread.messages.map((m) => (
              <div key={m.id} className={cn('flex', m.senderId === 'me' ? 'justify-end' : 'justify-start')}>
                <div
                  className={cn(
                    'max-w-[80%] rounded-2xl px-3 py-2 text-xs font-semibold leading-relaxed',
                    m.senderId === 'me'
                      ? 'rounded-br-md bg-forest text-primary-foreground dark:bg-emerald-600'
                      : 'rounded-bl-md bg-muted text-foreground',
                  )}
                >
                  {m.type !== 'text' && (
                    <span className="mr-1.5" aria-hidden>
                      {m.type === 'image' ? '📷' : m.type === 'voice' ? '🎙️' : m.type === 'location' ? '📍' : m.type === 'booking' ? '📅' : '🧾'}
                    </span>
                  )}
                  {m.text}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-border p-3">
            <div className="mb-2 flex gap-2">
              {QUICK_ACTIONS.map(({ type, icon: Icon, labelKey }) => (
                <button
                  key={type}
                  onClick={() => quick(type)}
                  className="flex items-center gap-1 rounded-full border border-border bg-background/60 px-3 py-1.5 text-[10px] font-bold text-muted-foreground hover:text-forest"
                >
                  <Icon size={12} />
                  {t(labelKey)}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send()}
                placeholder={t('fnet.chat.placeholder')}
                className="flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-xs font-semibold text-foreground outline-none placeholder:text-muted-foreground focus:border-forest"
              />
              <button
                onClick={send}
                disabled={!draft.trim()}
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-primary-foreground shadow-sm',
                  draft.trim() ? 'bg-forest hover:brightness-110 dark:bg-emerald-600' : 'cursor-not-allowed bg-muted text-muted-foreground',
                )}
                aria-label={t('fnet.req.submit')}
              >
                <Send size={15} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* Thread list */
  return (
    <div className="mt-4 space-y-3">
      {threads.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-border py-14 text-center">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-xl" aria-hidden>💬</div>
          <p className="text-sm font-bold text-foreground">{t('fnet.chat.none.title')}</p>
          <p className="mt-1 max-w-xs text-xs text-muted-foreground">{t('fnet.chat.none.body')}</p>
        </div>
      ) : (
        threads.map((th) => {
          const last = th.messages[th.messages.length - 1];
          return (
            <button
              key={th.id}
              onClick={() => { onRead(th.id); setActive(th.id); }}
              className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3.5 text-left shadow-card"
            >
              <Avatar
                user={{ initials: th.participantName.slice(0, 2).toUpperCase(), name: th.participantName, type: th.participantType, verified: false }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="truncate text-xs font-black text-foreground">{th.participantName}</p>
                  <span className="text-[10px] font-semibold text-muted-foreground">{timeAgo(t, th.updatedAt)}</span>
                </div>
                <p className={cn('mt-0.5 truncate text-[11px] font-semibold', th.unread > 0 ? 'text-foreground' : 'text-muted-foreground')}>
                  {last?.text ?? t('fnet.chat.empty')}
                </p>
              </div>
              {th.unread > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-forest px-1.5 text-[10px] font-black text-primary-foreground">
                  {th.unread}
                </span>
              )}
            </button>
          );
        })
      )}
    </div>
  );
};

const timeAgo = (t: (k: string) => string, iso: string): string => {
  const diffH = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);
  if (diffH < 1) return t('fnet.time.now');
  if (diffH < 24) return interpolate(t('fnet.time.hours'), { n: diffH });
  return interpolate(t('fnet.time.days'), { n: Math.floor(diffH / 24) });
};
