import React, { useState, useEffect } from 'react';
import { connectivityMonitor, ConnectionStatus } from '@/core/services/ConnectivityMonitor';

/**
 * Enterprise Offline Detection Banner & View.
 * Automatically displays when connection is lost and auto-dismisses upon reconnection.
 */

export const OfflineBanner: React.FC = () => {
  const [status, setStatus] = useState<ConnectionStatus>(() => connectivityMonitor.getStatus());
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    return connectivityMonitor.addListener((newStatus) => {
      setStatus(prev => {
        if (prev === 'offline' && newStatus === 'online') {
          setShowReconnected(true);
          setTimeout(() => setShowReconnected(false), 3000);
        }
        return newStatus;
      });
    });
  }, []);

  if (status === 'online' && !showReconnected) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 px-4 py-2 text-center text-xs font-bold uppercase tracking-wider transition-all duration-300 shadow-md ${
        status === 'offline'
          ? 'bg-amber-600 text-white animate-pulse'
          : 'bg-emerald-600 text-white'
      }`}
    >
      {status === 'offline' ? (
        <span>📡 Offline Mode — Showing Cached Farm Data. We will automatically sync when connection returns.</span>
      ) : (
        <span>✅ Back Online — All data synced!</span>
      )}
    </div>
  );
};
