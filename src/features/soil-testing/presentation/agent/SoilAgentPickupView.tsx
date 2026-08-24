import React, { useState, useEffect } from 'react';
import {
  Truck,
  CheckCircle,
  Clock,
  MapPin,
  Phone,
  Navigation,
  AlertTriangle,
  RefreshCw,
  Search,
  Package,
  Calendar,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { AgriCard } from '@/components/ui/agri-card';
import { AgriButton } from '@/components/ui/agri-button';
import { SoilTestOrder } from '../../domain/soilTestingTypes';
import { soilTestingService } from '../../domain/soilTestingService';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';

export const SoilAgentPickupView: React.FC = () => {
  const { user } = useAuth();
  const { t, formatDate } = useLanguage();

  const [orders, setOrders] = useState<SoilTestOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
  const [search, setSearch] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const loadAgentOrders = async (isRefresh = false) => {
    if (!user) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const res = await soilTestingService.getAssignedAgentOrders(user.id);
    setOrders(res.data);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    loadAgentOrders();
  }, [user?.id]);

  const handleMarkCollected = async (order: SoilTestOrder) => {
    if (!user) return;
    const confirm = window.confirm(
      `Confirm sample collection for order ${order.order_number}? Make sure the composite soil bag is properly packed and labeled.`
    );
    if (!confirm) return;

    setActionLoadingId(order.id);
    await soilTestingService.updateOrderStatus(
      order.id,
      'sample_collected',
      user.id,
      user.user_metadata?.full_name || 'Pickup Agent',
      `Soil sample collected by field technician ${user.user_metadata?.full_name || ''} at farm site.`
    );
    await loadAgentOrders(true);
    setActionLoadingId(null);
  };

  const handleReportIssue = async (order: SoilTestOrder) => {
    const reason = window.prompt(
      `Enter pickup issue details for order ${order.order_number} (e.g. Farmer unavailable, rescheduled, wrong address):`
    );
    if (!reason || !user) return;

    setActionLoadingId(order.id);
    await soilTestingService.updateOrderStatus(
      order.id,
      order.order_status,
      user.id,
      user.user_metadata?.full_name || 'Pickup Agent',
      `Technician Note: ${reason}`
    );
    await loadAgentOrders(true);
    setActionLoadingId(null);
  };

  const filteredOrders = orders.filter((o) => {
    const isCompleted = o.order_status === 'sample_collected' || o.order_status === 'sample_received' || o.order_status === 'report_ready' || o.order_status === 'report_delivered';
    const matchesTab = activeTab === 'pending' ? !isCompleted : isCompleted;
    if (!matchesTab) return false;

    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      o.order_number.toLowerCase().includes(q) ||
      o.farmer_name.toLowerCase().includes(q) ||
      o.district.toLowerCase().includes(q) ||
      o.mobile.includes(q)
    );
  });

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6 pb-28">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 uppercase tracking-wider">
            <Truck className="w-4 h-4" />
            Field Dispatch Console
          </div>
          <h1 className="text-2xl font-black text-foreground tracking-tight mt-1">
            Assigned Soil Sample Pickups
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Collect composite soil bags from farmers, verify labelling, and dispatch to testing lab.
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadAgentOrders(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-semibold px-3 py-1.5 rounded-xl border border-border bg-card shadow-sm self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex gap-2 bg-muted p-1 rounded-xl w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'pending'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Pending Pickups ({orders.filter((o) => o.order_status === 'pickup_scheduled' || o.order_status === 'agent_pending').length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('completed')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'completed'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Completed / Dispatched ({orders.filter((o) => o.order_status === 'sample_collected' || o.order_status === 'sample_received').length})
          </button>
        </div>

        <div className="relative flex-1 max-w-xs">
          <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search farmer, order ID…"
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-muted/60 border border-border rounded-xl text-foreground"
          />
        </div>
      </div>

      {/* List of Orders */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-36 bg-muted/40 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-16 bg-muted/20 border border-dashed border-border rounded-2xl p-6">
          <Package className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-50" />
          <h4 className="text-sm font-bold text-foreground">No Pickups Found</h4>
          <p className="text-xs text-muted-foreground mt-1">
            {activeTab === 'pending'
              ? 'You currently have no pending soil sample pickups assigned.'
              : 'No completed pickups in your history.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const mapUrl = order.latitude && order.longitude
              ? `https://www.google.com/maps/search/?api=1&query=${order.latitude},${order.longitude}`
              : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  `${order.address}, ${order.district}, ${order.state}`
                )}`;

            const isPending = order.order_status === 'pickup_scheduled' || order.order_status === 'agent_pending';

            return (
              <AgriCard
                key={order.id}
                className="p-5 rounded-2xl border border-border/70 bg-card shadow-sm hover:shadow-md transition-all space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 pb-3 border-b border-border/50">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-foreground">{order.order_number}</span>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full uppercase">
                        {order.test_type} Test
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-foreground mt-1">{order.farmer_name}</h3>
                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-emerald-600" />
                      <span>{order.village ? `${order.village}, ` : ''}{order.address}, {order.district}</span>
                    </div>
                  </div>

                  <div className="text-right sm:self-start">
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1 rounded-lg inline-block">
                      📅 {order.confirmed_pickup_date || order.preferred_pickup_date || 'Date TBD'}
                    </span>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {order.pickup_time_slot || 'Morning Slot'}
                    </div>
                  </div>
                </div>

                {/* Logistics Notes & Crop */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs bg-muted/40 p-3 rounded-xl">
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Crop / Plot</span>
                    <span className="font-semibold text-foreground">{order.crop || 'Field Crop'} ({order.farm_size || '—'} {order.farm_size_unit || 'Acre'})</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Sample Spec</span>
                    <span className="font-semibold text-foreground">500g Composite Bag</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Current Status</span>
                    <span className="font-semibold text-emerald-600">{order.order_status.replace(/_/g, ' ').toUpperCase()}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                  <div className="flex items-center gap-2">
                    <a
                      href={`tel:${order.mobile}`}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-foreground bg-secondary hover:bg-secondary/80 px-3 py-2 rounded-xl transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Call Farmer (+91 {order.mobile})</span>
                    </a>

                    <a
                      href={mapUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-foreground bg-secondary hover:bg-secondary/80 px-3 py-2 rounded-xl transition-colors"
                    >
                      <Navigation className="w-3.5 h-3.5 text-blue-600" />
                      <span>Navigate Maps</span>
                    </a>
                  </div>

                  {isPending && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleReportIssue(order)}
                        disabled={actionLoadingId === order.id}
                        className="text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline px-2 py-1"
                      >
                        Report Issue
                      </button>

                      <AgriButton
                        onClick={() => handleMarkCollected(order)}
                        disabled={actionLoadingId === order.id}
                        variant="primary"
                        size="sm"
                        className="text-xs font-bold rounded-xl px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        <span>Mark Sample Collected</span>
                      </AgriButton>
                    </div>
                  )}
                </div>
              </AgriCard>
            );
          })}
        </div>
      )}
    </div>
  );
};
