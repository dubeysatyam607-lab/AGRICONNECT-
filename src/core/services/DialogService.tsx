import React, { useState, useEffect } from 'react';

/**
 * Enterprise Dialog & Bottom Sheet Service.
 * Allows imperative popup and confirmation dialog triggers from ViewModels and interceptors.
 */

export interface IDialogConfig {
  id: string;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'danger' | 'success';
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
}

type DialogListener = (dialogs: IDialogConfig[]) => void;

class DialogServiceManager {
  private queue: IDialogConfig[] = [];
  private listeners = new Set<DialogListener>();

  public confirm(config: Omit<IDialogConfig, 'id'>): Promise<boolean> {
    return new Promise(resolve => {
      const id = Math.random().toString(36).substring(2, 9);
      const item: IDialogConfig = {
        ...config,
        id,
        onConfirm: async () => {
          if (config.onConfirm) await config.onConfirm();
          this.dismiss(id);
          resolve(true);
        },
        onCancel: () => {
          if (config.onCancel) config.onCancel();
          this.dismiss(id);
          resolve(false);
        },
      };

      this.queue.push(item);
      this.notify();
    });
  }

  public alert(title: string, description: string): Promise<void> {
    return new Promise(resolve => {
      const id = Math.random().toString(36).substring(2, 9);
      this.queue.push({
        id,
        title,
        description,
        confirmText: 'OK',
        onConfirm: () => {
          this.dismiss(id);
          resolve();
        },
      });
      this.notify();
    });
  }

  public dismiss(id: string): void {
    this.queue = this.queue.filter(item => item.id !== id);
    this.notify();
  }

  public subscribe(listener: DialogListener): () => void {
    this.listeners.add(listener);
    listener(this.queue);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach(listener => listener([...this.queue]));
  }
}

export const dialogService = new DialogServiceManager();

/**
 * Material 3 Dialog UI Provider Container
 */
export const DialogContainer: React.FC = () => {
  const [dialogs, setDialogs] = useState<IDialogConfig[]>([]);

  useEffect(() => {
    return dialogService.subscribe(setDialogs);
  }, []);

  if (dialogs.length === 0) return null;

  const activeDialog = dialogs[dialogs.length - 1];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-scale-in">
        <div className="space-y-1">
          <h3 className="font-extrabold text-lg text-foreground tracking-tight">{activeDialog.title}</h3>
          {activeDialog.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">{activeDialog.description}</p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          {activeDialog.cancelText !== null && (
            <button
              onClick={() => activeDialog.onCancel?.()}
              className="px-4 py-2 rounded-2xl text-xs font-bold text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {activeDialog.cancelText || 'Cancel'}
            </button>
          )}
          <button
            onClick={() => activeDialog.onConfirm?.()}
            className={`px-5 py-2.5 rounded-2xl text-xs font-extrabold shadow-md transition-all active:scale-95 ${
              activeDialog.variant === 'danger'
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
            }`}
          >
            {activeDialog.confirmText || 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
};
