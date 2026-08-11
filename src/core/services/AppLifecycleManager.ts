/**
 * Enterprise App Lifecycle & Visibility Manager.
 * Optimizes mobile battery and data usage by suspending background polling when the application is backgrounded.
 */

export type AppState = 'active' | 'background';

export interface ILifecycleListener {
  (state: AppState): void;
}

export class AppLifecycleManager {
  private currentState: AppState = 'active';
  private listeners = new Set<ILifecycleListener>();

  constructor() {
    this.init();
  }

  private init(): void {
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      this.currentState = document.hidden ? 'background' : 'active';
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
      window.addEventListener('focus', this.handleFocus);
      window.addEventListener('blur', this.handleBlur);
    }
  }

  private handleVisibilityChange = (): void => {
    const newState: AppState = document.hidden ? 'background' : 'active';
    this.setState(newState);
  };

  private handleFocus = (): void => {
    if (!document.hidden && this.currentState !== 'active') {
      this.setState('active');
    }
  };

  private handleBlur = (): void => {
    // Note: window blur doesn't always mean background on multi-window desktop, but in mobile PWA it signals inactivity
    if (document.hidden && this.currentState !== 'background') {
      this.setState('background');
    }
  };

  private setState(newState: AppState): void {
    if (this.currentState !== newState) {
      this.currentState = newState;
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[AppLifecycleManager] App transitioned to: ${newState}`);
      }
      this.notifyListeners();
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.currentState);
      } catch (e) {
        console.error('[AppLifecycleManager] Listener execution error', e);
      }
    });
  }

  public getState(): AppState {
    return this.currentState;
  }

  public isActive(): boolean {
    return this.currentState === 'active';
  }

  public addListener(listener: ILifecycleListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

export const appLifecycleManager = new AppLifecycleManager();
