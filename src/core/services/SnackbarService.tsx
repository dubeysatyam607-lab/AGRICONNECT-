import React, { useState, useEffect } from 'react';

/**
 * Enterprise Reusable Snackbar Notification Service & Container.
 * Allows imperative notification dispatch from ViewModels, Use Cases, or HTTP Interceptors.
 */

export type SnackbarVariant = 'default' | 'success' | 'error' | 'warning';

export interface ISnackbarMessage {
  id: string;
  title?: string;
  message: string;
  variant: SnackbarVariant;
  duration?: number;
  actionText?: string;
  onAction?: () => void;
}

type SnackbarListener = (queue: ISnackbarMessage[]) => void;

class SnackbarServiceManager {
  private queue: ISnackbarMessage[] = [];
  private listeners = new Set<SnackbarListener>();

  public show(message: string, options: Omit<Partial<ISnackbarMessage>, 'message'> = {}): void {
    const item: ISnackbarMessage = {
      id: Math.random().toString(36).substring(2, 9),
      message,
      variant: options.variant || 'default',
      duration: options.duration || 4000,
      title: options.title,
      actionText: options.actionText,
      onAction: options.onAction,
    };

    this.queue.push(item);
    this.notify();
  }

  public success(message: string, title?: string): void {
    this.show(message, { variant: 'success', title });
  }

  public error(message: string, title?: string): void {
    this.show(message, { variant: 'error', title: title || 'Error' });
  }

  public warning(message: string, title?: string): void {
    this.show(message, { variant: 'warning', title });
  }

  public info(message: string, title?: string): void {
    this.show(message, { variant: 'default', title });
  }

  public dismiss(id: string): void {
    this.queue = this.queue.filter(item => item.id !== id);
    this.notify();
  }

  public subscribe(listener: SnackbarListener): () => void {
    this.listeners.add(listener);
    listener(this.queue);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach(listener => listener([...this.queue]));
  }
}

export const snackbarService = new SnackbarServiceManager();

/**
 * Material 3 Reusable Snackbar UI Provider Container
 */
export const SnackbarContainer: React.FC = () => {
  const [messages, setMessages] = useState<ISnackbarMessage[]>([]);

  useEffect(() => {
    return snackbarService.subscribe(setMessages);
  }, []);

  if (messages.length === 0) return null;

  return (
    <div className="fixed bottom-20 sm:bottom-6 right-4 left-4 sm:left-auto sm:max-w-md z-50 flex flex-col gap-2 pointer-events-none">
      {messages.map((item) => (
        <SnackbarItem key={item.id} item={item} onDismiss={() => snackbarService.dismiss(item.id)} />
      ))}
    </div>
  );
};

const SnackbarItem: React.FC<{ item: ISnackbarMessage; onDismiss: () => void }> = ({ item, onDismiss }) => {
  useEffect(() => {
    if (item.duration && item.duration > 0) {
      const timer = setTimeout(onDismiss, item.duration);
      return () => clearTimeout(timer);
    }
  }, [item.duration, onDismiss]);

  const bgClasses: Record<SnackbarVariant, string> = {
    default: 'bg-slate-900 text-white dark:bg-slate-800 border-slate-700',
    success: 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-500/20',
    error: 'bg-rose-600 text-white border-rose-500 shadow-rose-500/20',
    warning: 'bg-amber-600 text-white border-amber-500 shadow-amber-500/20',
  };

  return (
    <div
      className={`pointer-events-auto flex items-center justify-between gap-3 p-4 rounded-2xl shadow-xl border backdrop-blur-md animate-slide-up transition-all duration-300 ${bgClasses[item.variant]}`}
    >
      <div className="flex-1 text-sm">
        {item.title && <p className="font-bold tracking-tight text-xs uppercase mb-0.5 opacity-90">{item.title}</p>}
        <p className="font-medium leading-tight">{item.message}</p>
      </div>
      {item.actionText && (
        <button
          onClick={() => {
            item.onAction?.();
            onDismiss();
          }}
          className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors"
        >
          {item.actionText}
        </button>
      )}
      <button onClick={onDismiss} className="text-white/70 hover:text-white text-lg font-bold px-1">
        ×
      </button>
    </div>
  );
};
