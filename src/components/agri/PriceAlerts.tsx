import React, { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Bell, Plus, Trash2, TrendingUp, TrendingDown, Zap, PauseCircle, PlayCircle } from 'lucide-react';
import { AgriCard } from '@/components/ui/agri-card';
import { AgriButton } from '@/components/ui/agri-button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface PriceAlert {
  id: string;
  commodity: string;
  target_price: number;
  alert_type: string;
  is_active: boolean;
  triggered_at: string | null;
}

const COMMODITIES = [
  'Wheat', 'Rice', 'Maize', 'Soybean', 'Cotton',
  'Sugarcane', 'Potato', 'Onion', 'Tomato', 'Mustard'
];

const roundTo50 = (n: number) => Math.round(n / 50) * 50;

const formatINR = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

interface PriceAlertsProps {
  onNavigateToAuth?: () => void;
  initialCommodity?: string;
  currentPrice?: number;
}

const PriceAlerts: React.FC<PriceAlertsProps> = ({ onNavigateToAuth, initialCommodity, currentPrice }) => {
  const { t } = useLanguage();
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [newAlert, setNewAlert] = useState({
    commodity: '',
    target_price: '',
    alert_type: 'above'
  });

  const { user } = useAuth();
  const { toast } = useToast();

  // Prefill commodity when arriving from a crop's detail sheet
  useEffect(() => {
    if (showDialog && initialCommodity && !newAlert.commodity) {
      setNewAlert(p => ({ ...p, commodity: initialCommodity }));
    }
  }, [showDialog, initialCommodity, newAlert.commodity]);

  useEffect(() => {
    if (user) {
      fetchAlerts();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchAlerts = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('price_alerts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setAlerts(data as PriceAlert[]);
    }
    setLoading(false);
  };

  const createAlert = async () => {
    if (!user) {
      onNavigateToAuth?.();
      return;
    }

    if (!newAlert.commodity || !newAlert.target_price) {
      toast({ title: 'Error', description: 'Please fill all fields', variant: 'destructive' });
      return;
    }

    const { error } = await supabase
      .from('price_alerts')
      .insert({
        user_id: user.id,
        commodity: newAlert.commodity,
        target_price: parseInt(newAlert.target_price),
        alert_type: newAlert.alert_type
      });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Alert Created', description: `You'll be notified when ${newAlert.commodity} goes ${newAlert.alert_type} ₹${newAlert.target_price}` });
      setShowDialog(false);
      setNewAlert({ commodity: '', target_price: '', alert_type: 'above' });
      fetchAlerts();
    }
  };

  const deleteAlert = async (id: string) => {
    // Defense-in-depth: filter by user_id even though RLS enforces it
    const { error } = await supabase
      .from('price_alerts')
      .delete()
      .eq('id', id)
      .eq('user_id', user?.id ?? '');

    if (!error) {
      toast({ title: 'Deleted', description: 'Alert removed' });
      fetchAlerts();
    }
  };

  const toggleAlert = async (id: string, isActive: boolean) => {
    // Defense-in-depth: filter by user_id even though RLS enforces it
    const { error } = await supabase
      .from('price_alerts')
      .update({ is_active: !isActive })
      .eq('id', id)
      .eq('user_id', user?.id ?? '');

    if (!error) {
      fetchAlerts();
    }
  };

  // Smart quick-pick targets based on the current price
  const suggestions = useMemo(() => {
    if (!currentPrice) return [];
    const mults = newAlert.alert_type === 'above' ? [1.05, 1.1, 1.2] : [0.95, 0.9, 0.85];
    return mults.map(m => roundTo50(currentPrice * m));
  }, [currentPrice, newAlert.alert_type]);

  const showCurrentPrice = initialCommodity && currentPrice && newAlert.commodity === initialCommodity;

  if (!user) {
    return (
      <AgriCard className="p-4">
        <div className="text-center py-6">
          <Bell className="mx-auto text-muted-foreground mb-2" size={32} />
          <p className="text-muted-foreground mb-3">{t('agr149')}</p>
          <AgriButton onClick={onNavigateToAuth}>{t('agr150')}</AgriButton>
        </div>
      </AgriCard>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Bell className="text-primary" /> Price Alerts
          </h3>
          <p className="text-sm text-muted-foreground">{t('agr151')}</p>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <AgriButton size="sm">
              <Plus size={14} /> Add Alert
            </AgriButton>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('agr152')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              {showCurrentPrice && (
                <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/8 px-3.5 py-2.5 text-sm">
                  <Zap size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="text-muted-foreground">
                    {newAlert.commodity} is at{' '}
                    <b className="text-foreground">{formatINR(currentPrice)}</b>{t('mandi.hub.perQuintal') || '/qt'} right now
                  </span>
                </div>
              )}

              <div>
                <label className="text-sm text-muted-foreground mb-1 block">{t('agr153')}</label>
                <Select value={newAlert.commodity} onValueChange={(v) => setNewAlert(p => ({ ...p, commodity: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('agr153') || "Select commodity"} />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMODITIES.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-1 block">{t('agr154')}</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewAlert(p => ({ ...p, alert_type: 'above' }))}
                    className={cn(
                      "flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-bold transition-colors",
                      newAlert.alert_type === 'above'
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "border-border bg-card text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <TrendingUp size={14} /> Above
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewAlert(p => ({ ...p, alert_type: 'below' }))}
                    className={cn(
                      "flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-bold transition-colors",
                      newAlert.alert_type === 'below'
                        ? "border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400"
                        : "border-border bg-card text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <TrendingDown size={14} /> Below
                  </button>
                </div>
              </div>

              {suggestions.length > 0 && (
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">{t('agr155')}</label>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setNewAlert(p => ({ ...p, target_price: String(s) }))}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-xs font-bold transition-colors",
                          newAlert.target_price === String(s)
                            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "border-border bg-card text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {formatINR(s)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm text-muted-foreground mb-1 block">{t('agr156')}</label>
                <Input
                  type="number"
                  placeholder="2500"
                  value={newAlert.target_price}
                  onChange={(e) => setNewAlert(p => ({ ...p, target_price: e.target.value }))}
                />
              </div>

              <AgriButton className="w-full" onClick={createAlert}>
                Create Alert
              </AgriButton>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">{t('agr157')}</div>
      ) : alerts.length === 0 ? (
        <AgriCard className="p-6 text-center">
          <Bell className="mx-auto text-muted-foreground mb-2" size={40} />
          <p className="text-muted-foreground">{t('agr158')}</p>
          <p className="text-sm text-muted-foreground">{t('agr159')}</p>
        </AgriCard>
      ) : (
        <div className="space-y-3">
          {alerts.map(alert => {
            const isAbove = alert.alert_type === 'above';
            const showGap = initialCommodity === alert.commodity && typeof currentPrice === 'number';
            const gap = showGap
              ? (isAbove ? alert.target_price - currentPrice! : currentPrice! - alert.target_price)
              : null;
            return (
              <AgriCard
                key={alert.id}
                className={cn("p-4 transition-opacity", !alert.is_active && "opacity-55")}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                      "w-11 h-11 rounded-2xl flex items-center justify-center shrink-0",
                      isAbove ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                    )}>
                      {isAbove ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-foreground">{alert.commodity}</p>
                      <p className="text-xs text-muted-foreground">
                        {isAbove ? 'Above' : 'Below'} <b className="text-foreground">{formatINR(alert.target_price)}</b>/qt
                      </p>
                    </div>
                  </div>
                  <span className={cn(
                    "shrink-0 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black",
                    alert.is_active
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "bg-muted text-muted-foreground"
                  )}>
                    <span className={cn("h-1.5 w-1.5 rounded-full", alert.is_active ? "bg-emerald-500 animate-live-pulse" : "bg-muted-foreground")} />
                    {alert.is_active ? 'Active' : 'Paused'}
                  </span>
                </div>

                {showGap && gap !== null && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground mb-1">
                      <span>Current: {formatINR(currentPrice!)}</span>
                      <span className={cn("font-black", gap >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                        {gap >= 0 ? `₹${gap.toLocaleString('en-IN')} to go` : `₹${Math.abs(gap).toLocaleString('en-IN')} past target`}
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
                        style={{ width: `${Math.min(100, Math.max(4, (alert.target_price / (currentPrice! * 1.3)) * 100))}%` }}
                      />
                    </div>
                  </div>
                )}

                {alert.triggered_at && (
                  <p className="text-xs text-primary mt-2">
                    Triggered: {new Date(alert.triggered_at).toLocaleString()}
                  </p>
                )}

                <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                  <button
                    onClick={() => toggleAlert(alert.id, alert.is_active)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {alert.is_active ? <PauseCircle size={14} /> : <PlayCircle size={14} />}
                    {alert.is_active ? 'Pause' : 'Resume'}
                  </button>
                  <button
                    onClick={() => deleteAlert(alert.id)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-500 hover:text-rose-600 transition-colors"
                  >
                    <Trash2 size={14} /> Remove
                  </button>
                </div>
              </AgriCard>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PriceAlerts;
