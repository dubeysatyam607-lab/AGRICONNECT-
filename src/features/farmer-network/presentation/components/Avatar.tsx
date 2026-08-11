import React from 'react';
import { BadgeCheck, Leaf } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Availability, NetworkUser, VerificationBadge } from '../../domain/networkTypes';

const TINTS: Record<NetworkUser['type'], string> = {
  farmer: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  provider: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  buyer: 'bg-violet-500/15 text-violet-700 dark:text-violet-300',
};

const AVAIL_DOT: Record<Availability, string> = {
  today: 'bg-emerald-500',
  tomorrow: 'bg-amber-400',
  week: 'bg-sky-500',
  busy: 'bg-rose-500',
};

interface AvatarProps {
  user: Pick<NetworkUser, 'initials' | 'name' | 'type' | 'verified'> & { availability?: Availability };
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ user, size = 'md', className }) => {
  const box = size === 'lg' ? 'h-12 w-12 text-sm' : size === 'sm' ? 'h-8 w-8 text-[10px]' : 'h-10 w-10 text-xs';
  return (
    <div className={cn('relative shrink-0', className)}>
      <div
        className={cn(
          'flex items-center justify-center rounded-2xl font-black tracking-tight',
          box,
          TINTS[user.type],
        )}
        aria-hidden
      >
        {user.initials}
      </div>
      {user.verified && (
        <BadgeCheck
          size={size === 'sm' ? 11 : 14}
          className="absolute -bottom-0.5 -right-0.5 rounded-full bg-background text-sky-500"
          aria-label="Verified"
        />
      )}
      {user.availability && user.availability !== 'busy' && (
        <span
          className={cn(
            'absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-background',
            AVAIL_DOT[user.availability],
          )}
          aria-hidden
        />
      )}
    </div>
  );
};

interface BadgeChipProps {
  badge: VerificationBadge;
  label: string;
}

export const BadgeChip: React.FC<BadgeChipProps> = ({ badge, label }) => (
  <span
    className={cn(
      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold',
      badge === 'farmer' && 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
      badge === 'provider' && 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
      badge === 'dealer' && 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
      badge === 'buyer' && 'bg-violet-500/10 text-violet-700 dark:text-violet-300',
    )}
  >
    <Leaf size={10} />
    {label}
  </span>
);
