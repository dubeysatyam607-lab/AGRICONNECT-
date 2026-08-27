import React from "react";
import { RefreshCw, CloudOff, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

export function friendlyError(err: unknown, fallback: string): string {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  const lowered = msg.toLowerCase();
  const genuinelyOffline = typeof navigator !== 'undefined' && navigator.onLine === false;

  if (genuinelyOffline) {
    return "You're offline. Showing the last saved data.";
  }
  if (/offline|no internet/i.test(msg)) {
    return "No internet connection detected. Please connect to Wi-Fi or mobile data.";
  }
  if (/fetch failed|failed to fetch|temporary failure|network/i.test(msg)) {
    return fallback || "Connecting to live service… Tap retry to refresh.";
  }
  if (/timeout|timed out|aborted/i.test(msg)) {
    return "This is taking too long. Please try again.";
  }
  if (/401|unauthorized|403|forbidden/i.test(msg)) {
    return "Your session expired. Please log in again.";
  }
  if (/429|too many|rate.?limit/i.test(msg)) {
    return "Too many requests. Please wait a moment and retry.";
  }
  if (/500|502|503|504|server/i.test(msg) && !/offline/.test(msg)) {
    return "Our server is busy right now. Please try again.";
  }
  if (/404|not found/i.test(msg) && !/offline/.test(msg)) {
    return "We couldn't find that right now. Try refreshing.";
  }
  if (lowered.includes("failed to load") || lowered.includes("failed to fetch")) {
    return fallback;
  }
  return msg || fallback;
}

export function ErrorState({
  message,
  onRetry,
  icon: Icon = CloudOff,
  compact = false,
}: {
  message: string;
  onRetry?: () => void;
  icon?: React.ComponentType<{ className?: string }>;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center py-6", compact ? "py-4" : "py-10")}>
      <span className={cn("flex items-center justify-center rounded-full bg-rose-500/10 text-rose-500", compact ? "h-10 w-10" : "h-14 w-14")}>
        <Icon className={compact ? "h-5 w-5" : "h-7 w-7"} />
      </span>
      <p className={cn("mt-3 font-bold text-foreground", compact ? "text-[13px]" : "text-[15px]")}>{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-forest text-primary-foreground px-4 py-2 text-[12px] font-bold shadow-card active:scale-95 transition-transform"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Retry
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  subtitle,
  description,
  actionLabel,
  onAction,
  emoji = "🌾",
  compact = false,
}: {
  title: string;
  subtitle?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  emoji?: string;
  compact?: boolean;
}) {
  const text = description ?? subtitle;
  return (
    <div className={cn("flex flex-col items-center justify-center text-center", compact ? "py-6" : "py-10")}>
      <span className={cn("flex items-center justify-center rounded-full bg-muted/60 text-2xl", compact ? "h-10 w-10" : "h-14 w-14")} aria-hidden="true">
        {emoji}
      </span>
      <p className={cn("mt-3 font-bold text-foreground", compact ? "text-[13px]" : "text-[15px]")}>{title}</p>
      {text && <p className={cn("mt-1 max-w-[260px] font-medium text-muted-foreground", compact ? "text-[11px]" : "text-[12px]")}>{text}</p>}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-forest text-primary-foreground px-4 py-2 text-[12px] font-bold shadow-card active:scale-95 transition-transform"
        >
          <Inbox className="h-3.5 w-3.5" /> {actionLabel}
        </button>
      )}
    </div>
  );
}
