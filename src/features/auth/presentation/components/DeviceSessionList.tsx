import React, { useEffect } from 'react';
import { useAuthViewModel } from '../viewmodels/useAuthViewModel';
import { AppButton } from '@/shared/widgets/AppButton';

/**
 * Enterprise Device Tracking & Active Session List Component.
 * Displays logged-in hardware/OS sessions and provides "Logout from all devices" capability.
 */
export const DeviceSessionList: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const [state, { fetchActiveSessions, signOutFromAllDevices }] = useAuthViewModel();

  useEffect(() => {
    fetchActiveSessions();
  }, [fetchActiveSessions]);

  const handleLogoutAll = async () => {
    await signOutFromAllDevices();
    if (onClose) onClose();
  };

  return (
    <div className="space-y-4 animate-fade-in p-1">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
        <div>
          <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
            <span>🛡️</span> Active Device Sessions
          </h3>
          <p className="text-xs text-muted-foreground">
            You are logged into AgriConnect on these devices.
          </p>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-500/20">
          {state.activeSessions.length} {state.activeSessions.length === 1 ? 'Device' : 'Devices'}
        </span>
      </div>

      <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
        {state.activeSessions.length === 0 ? (
          <div className="text-center py-6 text-xs text-muted-foreground">
            No active sessions found.
          </div>
        ) : (
          state.activeSessions.map((sess) => (
            <div
              key={sess.id}
              className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                sess.isCurrentDevice
                  ? 'bg-emerald-500/5 border-emerald-500/30 dark:bg-emerald-950/20'
                  : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-lg shadow-sm">
                  {sess.deviceName.includes('Mobile') || sess.deviceName.includes('iPhone') ? '📱' : '💻'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-foreground">{sess.deviceName}</span>
                    {sess.isCurrentDevice && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-white text-[9px] font-extrabold uppercase tracking-wider">
                        This Device
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                    <span>IP: {sess.ipAddress || 'Unknown'}</span>
                    <span>•</span>
                    <span>
                      {sess.isCurrentDevice ? 'Active Now' : `Last active ${new Date(sess.lastActive).toLocaleDateString()}`}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <p className="text-[11px] text-rose-500 font-medium">
          Recognize an unfamiliar device? Sign out everywhere immediately.
        </p>
        <AppButton
          variant="danger"
          size="sm"
          onClick={handleLogoutAll}
          isLoading={state.isLoading}
          className="text-xs font-bold"
        >
          Logout All Devices
        </AppButton>
      </div>
    </div>
  );
};
