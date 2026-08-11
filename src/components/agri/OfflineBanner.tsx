import React, { useState, useEffect } from "react";
import { WifiOff, RefreshCw, X } from "lucide-react";

interface OfflineBannerProps {
  onRetry?: () => void;
}

const getInitialOnlineState = () => {
  if (typeof navigator !== "undefined" && "onLine" in navigator) {
    return navigator.onLine;
  }
  return true;
};

const OfflineBanner: React.FC<OfflineBannerProps> = ({ onRetry }) => {
  const [isOnline, setIsOnline] = useState(getInitialOnlineState);
  const [visible, setVisible] = useState(!getInitialOnlineState);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setVisible(false);
      setDismissed(false);
    };
    const handleOffline = () => {
      setIsOnline(false);
      setVisible(true);
      setDismissed(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!visible || dismissed) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 animate-slide-down">
      <div className="bg-destructive text-destructive-foreground px-4 py-3 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2">
          <WifiOff size={16} className="flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold">Network Error. Please try again.</p>
            <p className="text-xs opacity-80">Viewing saved data from cache</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onRetry && (
            <button
              onClick={onRetry}
              className="p-1.5 rounded-full hover:bg-white/20 transition-colors"
              aria-label="Retry"
            >
              <RefreshCw size={14} />
            </button>
          )}
          <button
            onClick={() => setDismissed(true)}
            className="p-1.5 rounded-full hover:bg-white/20 transition-colors"
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default OfflineBanner;
 