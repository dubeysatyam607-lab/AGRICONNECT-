/**
 * Enterprise Internet Connectivity & Offline Detection Service.
 * Essential for remote rural farm fields with fluctuating 2G/3G/4G coverage.
 */

export type ConnectionStatus = 'online' | 'offline';
export type EffectiveSpeed = 'slow-2g' | '2g' | '3g' | '4g' | 'unknown';

export interface IConnectivityListener {
  (status: ConnectionStatus, speed?: EffectiveSpeed): void;
}

export class ConnectivityMonitor {
  private status: ConnectionStatus = 'online';
  private speed: EffectiveSpeed = 'unknown';
  private listeners = new Set<IConnectivityListener>();

  constructor() {
    this.init();
  }

  private init(): void {
    if (typeof window !== 'undefined') {
      this.status = window.navigator.onLine ? 'online' : 'offline';
      this.updateSpeed();

      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);

      const conn = (window.navigator as any).connection || (window.navigator as any).mozConnection || (window.navigator as any).webkitConnection;
      if (conn) {
        conn.addEventListener('change', this.updateSpeed);
      }
    }
  }

  private handleOnline = (): void => {
    this.status = 'online';
    this.updateSpeed();
    this.notifyListeners();
  };

  private handleOffline = (): void => {
    this.status = 'offline';
    this.notifyListeners();
  };

  private updateSpeed = (): void => {
    if (typeof window !== 'undefined') {
      const conn = (window.navigator as any).connection || (window.navigator as any).mozConnection || (window.navigator as any).webkitConnection;
      if (conn && conn.effectiveType) {
        this.speed = conn.effectiveType;
      }
    }
  };

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.status, this.speed);
      } catch (e) {
        console.error('[ConnectivityMonitor] Listener execution failed', e);
      }
    });
  }

  public getStatus(): ConnectionStatus {
    return this.status;
  }

  public isOnline(): boolean {
    return this.status === 'online';
  }

  public getSpeed(): EffectiveSpeed {
    return this.speed;
  }

  public addListener(listener: IConnectivityListener): () => void {
    this.listeners.add(listener);
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  public async waitForOnline(): Promise<void> {
    if (this.isOnline()) return;
    return new Promise(resolve => {
      const unsub = this.addListener(status => {
        if (status === 'online') {
          unsub();
          resolve();
        }
      });
    });
  }
}

export const connectivityMonitor = new ConnectivityMonitor();
