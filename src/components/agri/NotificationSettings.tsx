import React, { useEffect, useState } from "react";
import { Bell, BellOff, TrendingUp, Cloud, Check } from "lucide-react";
import { AgriCard } from "@/components/ui/agri-card";
import { AgriButton } from "@/components/ui/agri-button";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";

interface NotificationSettingsProps {
  onToast: (message: string) => void;
}

const PREFS_KEY = "agri_notif_prefs";

const readPrefs = (): { priceAlerts: boolean; weatherAlerts: boolean } => {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return { priceAlerts: true, weatherAlerts: true };
    const parsed = JSON.parse(raw);
    return {
      priceAlerts: typeof parsed.priceAlerts === "boolean" ? parsed.priceAlerts : true,
      weatherAlerts: typeof parsed.weatherAlerts === "boolean" ? parsed.weatherAlerts : true,
    };
  } catch {
    return { priceAlerts: true, weatherAlerts: true };
  }
};

const NotificationSettings: React.FC<NotificationSettingsProps> = ({ onToast }) => {
  const [priceAlerts, setPriceAlerts] = useState<boolean>(() => readPrefs().priceAlerts);
  const [weatherAlerts, setWeatherAlerts] = useState<boolean>(() => readPrefs().weatherAlerts);
  const { toast } = useToast();
  const {
    isSupported,
    isSubscribed,
    permission,
    subscribe,
    unsubscribe,
    showNotification
  } = usePushNotifications();

  useEffect(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify({ priceAlerts, weatherAlerts }));
    } catch { /* storage unavailable */ }
  }, [priceAlerts, weatherAlerts]);

  const handleSubscribe = async () => {
    const success = await subscribe(priceAlerts, weatherAlerts);
    if (success) {
      toast({ title: 'Notifications Enabled', description: 'You will receive price and weather alerts.' });
      // Show a test notification
      setTimeout(() => {
        showNotification('🌾 AgriConnect', 'Notifications are now active! You\'ll receive important alerts.');
      }, 1000);
    } else {
      toast({ title: 'Permission Denied', description: 'Please allow notifications in your browser settings.', variant: 'destructive' });
    }
  };

  const handleUnsubscribe = async () => {
    const success = await unsubscribe();
    if (success) {
      toast({ title: 'Notifications Disabled', description: 'You will no longer receive push notifications.' });
    }
  };

  const testPriceAlert = () => {
    showNotification(
      '📈 Price Alert: Wheat',
      'Wheat prices have risen above ₹2,400/quintal at Azadpur Mandi!',
      { type: 'price_alert', commodity: 'wheat' }
    );
    onToast('Test price alert sent!');
  };

  const testWeatherAlert = () => {
    showNotification(
      '⛈️ Weather Warning',
      'Heavy rainfall expected in your area in the next 3 hours. Protect your crops!',
      { type: 'weather_alert' }
    );
    onToast('Test weather alert sent!');
  };

  if (!isSupported) {
    return (
      <AgriCard className="p-4">
        <div className="text-center text-muted-foreground">
          <BellOff size={32} className="mx-auto mb-2 opacity-50" />
          <p>Push notifications are not supported in this browser.</p>
        </div>
      </AgriCard>
    );
  }

  return (
    <div className="space-y-4">
      <AgriCard className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isSubscribed ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
              {isSubscribed ? <Check size={20} /> : <Bell size={20} />}
            </div>
            <div>
              <h3 className="font-bold text-foreground">Push Notifications</h3>
              <p className="text-xs text-muted-foreground">
                {isSubscribed ? 'Notifications are enabled' : 'Enable to receive alerts'}
              </p>
            </div>
          </div>
          <AgriButton
            size="sm"
            variant={isSubscribed ? 'outline' : 'primary'}
            onClick={isSubscribed ? handleUnsubscribe : handleSubscribe}
          >
            {isSubscribed ? 'Disable' : 'Enable'}
          </AgriButton>
        </div>

        {!isSubscribed && permission === 'denied' && (
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">
            Notifications are blocked. Please enable them in your browser settings.
          </div>
        )}
      </AgriCard>

      {isSubscribed && (
        <>
          <AgriCard className="p-4">
            <h4 className="font-bold text-foreground mb-3">Alert Types</h4>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <TrendingUp size={18} className="text-primary" />
                  <div>
                    <p className="font-medium text-foreground">Price Alerts</p>
                    <p className="text-xs text-muted-foreground">Get notified when commodity prices change</p>
                  </div>
                </div>
                <Switch checked={priceAlerts} onCheckedChange={setPriceAlerts} />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Cloud size={18} className="text-cyan-500" />
                  <div>
                    <p className="font-medium text-foreground">Weather Warnings</p>
                    <p className="text-xs text-muted-foreground">Alerts for rain, storms, and extreme weather</p>
                  </div>
                </div>
                <Switch checked={weatherAlerts} onCheckedChange={setWeatherAlerts} />
              </div>
            </div>
          </AgriCard>

          <AgriCard className="p-4">
            <h4 className="font-bold text-foreground mb-3">Test Notifications</h4>
            <div className="flex gap-2">
              <AgriButton size="sm" variant="outline" onClick={testPriceAlert} className="flex-1">
                <TrendingUp size={14} /> Test Price
              </AgriButton>
              <AgriButton size="sm" variant="outline" onClick={testWeatherAlert} className="flex-1">
                <Cloud size={14} /> Test Weather
              </AgriButton>
            </div>
          </AgriCard>
        </>
      )}
    </div>
  );
};

export default NotificationSettings;
