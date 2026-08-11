import React, { useState } from 'react';
import { Heart, MessageCircle, Send, Sparkles } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { interpolate } from '@/i18n/journey';
import { cn } from '@/lib/utils';
import type { CommunityKind, CommunityPost } from '../../domain/networkTypes';

const KIND_STYLE: Record<CommunityKind, string> = {
  question: 'bg-sky-500/10 text-sky-600 dark:text-sky-300',
  tip: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  photo: 'bg-amber-500/10 text-amber-600 dark:text-amber-300',
  video: 'bg-rose-500/10 text-rose-600 dark:text-rose-300',
  success: 'bg-violet-500/10 text-violet-600 dark:text-violet-300',
  gov: 'bg-slate-500/10 text-slate-600 dark:text-slate-300',
  ai: 'gradient-ai text-primary-foreground',
};

const KIND_ICON: Record<CommunityKind, string> = {
  question: '❓', tip: '💡', photo: '📷', video: '🎥', success: '🏆', gov: '🏛️', ai: '🤖',
};

interface CommunityViewProps {
  posts: CommunityPost[];
  onPost: (text: string, kind: 'question' | 'tip' | 'photo' | 'success') => void;
  onLike: (id: string) => void;
  onToast?: (message: string) => void;
}

const COMPOSE_KINDS: Array<CommunityKind> = ['question', 'tip', 'photo', 'success'];

export const CommunityView: React.FC<CommunityViewProps> = ({ posts, onPost, onLike, onToast }) => {
  const { t } = useLanguage();
  const [text, setText] = useState('');
  const [kind, setKind] = useState<CommunityKind>('question');
  const [filter, setFilter] = useState<CommunityKind | 'all'>('all');

  const list = filter === 'all' ? posts : posts.filter((p) => p.kind === filter);

  const submit = () => {
    if (!text.trim()) return;
    onPost(text.trim(), kind as 'question' | 'tip' | 'photo' | 'success');
    setText('');
    onToast?.(t('fnet.toast.posted'));
  };

  return (
    <div className="mt-4">
      {/* Compose */}
      <div className="rounded-2xl border border-border bg-card p-3.5 shadow-card">
        <div className="flex gap-1.5">
          {COMPOSE_KINDS.map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={cn(
                'inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-bold transition-colors',
                kind === k ? 'bg-forest text-primary-foreground' : 'border border-border text-muted-foreground',
              )}
            >
              <span aria-hidden>{KIND_ICON[k]}</span>
              {t(`fnet.kind.${k}`)}
            </button>
          ))}
        </div>
        <div className="mt-2.5 flex items-end gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            placeholder={t('fnet.compose')}
            className="flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-xs font-semibold text-foreground outline-none placeholder:text-muted-foreground focus:border-forest"
          />
          <button
            onClick={submit}
            disabled={!text.trim()}
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-primary-foreground shadow-sm',
              text.trim() ? 'bg-forest hover:brightness-110 dark:bg-emerald-600' : 'cursor-not-allowed bg-muted text-muted-foreground',
            )}
            aria-label={t('fnet.req.submit')}
          >
            <Send size={15} />
          </button>
        </div>
      </div>

      {/* Feed */}
      <div className="mt-3 space-y-3">
        {list.map((post) => {
          const ago = timeAgo(t, post.createdAt);
          return (
            <article key={post.id} className="rounded-2xl border border-border bg-card p-4 shadow-card">
              <div className="flex items-center gap-2.5">
                <span className={cn('flex h-9 w-9 items-center justify-center rounded-xl text-base', KIND_STYLE[post.kind])}>
                  <span aria-hidden>{KIND_ICON[post.kind]}</span>
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h3 className="truncate text-xs font-black text-foreground">{post.author}</h3>
                    {post.ai && <Sparkles size={12} className="shrink-0 text-violet-500" />}
                  </div>
                  <p className="text-[10px] font-semibold text-muted-foreground">
                    {t(`fnet.kind.${post.kind}`)} · {ago}
                  </p>
                </div>
              </div>
              <p className="mt-2.5 text-[13px] leading-relaxed text-foreground/90">{post.text}</p>
              <div className="mt-3 flex items-center gap-4 border-t border-border pt-2.5">
                <button
                  onClick={() => {
                    onLike(post.id);
                    onToast?.(t('fnet.toast.liked'));
                  }}
                  className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground hover:text-rose-500"
                >
                  <Heart size={13} />
                  {post.likes}
                </button>
                <button
                  onClick={() => onToast?.(t('fnet.toast.comment'))}
                  className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground hover:text-forest"
                >
                  <MessageCircle size={13} />
                  {post.comments}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
};

const timeAgo = (t: (k: string) => string, iso: string): string => {
  const diffH = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);
  if (diffH < 1) return t('fnet.time.now');
  if (diffH < 24) return interpolate(t('fnet.time.hours'), { n: diffH });
  return interpolate(t('fnet.time.days'), { n: Math.floor(diffH / 24) });
};
