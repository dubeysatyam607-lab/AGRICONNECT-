import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Download,
  ExternalLink,
  FileCheck,
  FileText,
  FlaskConical,
  HelpCircle,
  MapPin,
  Phone,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Truck,
  User,
} from 'lucide-react';
import { AgriCard } from '@/components/ui/agri-card';
import { AgriButton } from '@/components/ui/agri-button';
import { SoilTestOrder, SoilTestStatusHistory, StructuredSoilReport } from '../domain/soilTestingTypes';
import { soilTestingService } from '../domain/soilTestingService';
import { SoilTestStatusTimeline } from './components/SoilTestStatusTimeline';
import { SoilHealthParametersCard } from './components/SoilHealthParametersCard';
import { SoilAiChatModal } from './SoilAiChatModal';
import { useLanguage } from '@/contexts/LanguageContext';
import { getPackageDetails } from '../domain/soilTestingPricing';

interface SoilTestOrderDetailViewProps {
  orderIdOrNumber: string;
  onBack: () => void;
}

export const SoilTestOrderDetailView: React.FC<SoilTestOrderDetailViewProps> = ({
  orderIdOrNumber,
  onBack,
}) => {
  const { t, formatDate } = useLanguage();
  const [order, setOrder] = useState<SoilTestOrder | null>(null);
  const [history, setHistory] = useState<SoilTestStatusHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signedPdfUrl, setSignedPdfUrl] = useState<string | null>(null);
  const [aiChatOpen, setAiChatOpen] = useState(false);

  const loadOrder = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    const res = await soilTestingService.getOrderDetails(orderIdOrNumber);
    if (res.error || !res.order) {
      setError(res.error?.message || 'Unable to find soil test order.');
    } else {
      setOrder(res.order);
      setHistory(res.history);

      // If report exists, obtain secure signed URL
      if (res.order.report_file_path) {
        const signedUrl = await soilTestingService.getReportSignedUrl(res.order.report_file_path);
        setSignedPdfUrl(signedUrl || res.order.report_url);
      } else if (res.order.report_url) {
        setSignedPdfUrl(res.order.report_url);
      }
    }

    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    loadOrder();
  }, [orderIdOrNumber]);

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6 animate-pulse">
        <div className="h-6 w-32 bg-muted rounded-lg" />
        <div className="h-28 bg-muted rounded-2xl" />
        <div className="h-64 bg-muted rounded-2xl" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="p-6 max-w-xl mx-auto text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/40 text-red-600 flex items-center justify-center mx-auto">
          <HelpCircle className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-foreground">Order Not Found</h3>
        <p className="text-xs text-muted-foreground">{error || 'This order does not exist or you do not have permission to view it.'}</p>
        <AgriButton onClick={onBack} variant="outline" className="font-bold">
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Return to Soil Testing
        </AgriButton>
      </div>
    );
  }

  const pkg = getPackageDetails(order.test_type);
  const isReportReady = order.order_status === 'report_ready' || order.order_status === 'report_delivered';
  const structuredResults = order.structured_results as StructuredSoilReport | null;

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6 pb-28">
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('soil.action.back') || 'Back to Mitti Jaanch'}</span>
        </button>

        <button
          type="button"
          onClick={() => loadOrder(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-semibold px-2.5 py-1 rounded-lg border border-border/50 bg-card shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>{refreshing ? 'Syncing…' : 'Refresh Status'}</span>
        </button>
      </div>

      {/* Main Order Header Card */}
      <AgriCard className="p-6 rounded-2xl border border-border/70 bg-card shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                {pkg.titleEn}
              </span>
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                  order.payment_status === 'paid'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                Payment: {order.payment_status.toUpperCase()}
              </span>
            </div>

            <h1 className="text-2xl font-black text-foreground tracking-tight mt-2">
              {order.order_number}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Booked on {formatDate(order.created_at, { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>

          {/* Quick Actions if Report Ready */}
          {isReportReady && signedPdfUrl && (
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <a
                href={signedPdfUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition-all"
              >
                <Download className="w-4 h-4" />
                <span>{t('soil.downloadReport') || 'Download PDF'}</span>
              </a>
              <AgriButton
                onClick={() => setAiChatOpen(true)}
                variant="outline"
                className="text-xs font-bold rounded-xl flex items-center gap-1.5 border-emerald-500/50"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>{t('soil.askAi') || 'Ask Kisan AI'}</span>
              </AgriButton>
            </div>
          )}
        </div>

        {/* Assigned Agent Card if scheduled */}
        {order.assigned_agent_name && (
          <div className="mt-4 pt-4 border-t border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/40 p-3.5 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                <Truck className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[11px] text-muted-foreground font-semibold">
                  {t('soil.assignedTechnician') || 'Assigned Pickup Technician'}
                </div>
                <div className="text-xs font-bold text-foreground">
                  {order.assigned_agent_name}
                </div>
                {order.confirmed_pickup_date && (
                  <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                    Scheduled: {order.confirmed_pickup_date} ({order.pickup_time_slot || 'Standard slot'})
                  </div>
                )}
              </div>
            </div>

            {order.assigned_agent_phone && (
              <a
                href={`tel:${order.assigned_agent_phone}`}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-950 px-3 py-1.5 rounded-lg shrink-0 hover:bg-emerald-200"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Call Agent</span>
              </a>
            )}
          </div>
        )}
      </AgriCard>

      {/* Grid: 9-Stage Timeline & Farm Information */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Status Timeline Card (2 Cols) */}
        <div className="md:col-span-2 space-y-6">
          <AgriCard className="p-6 rounded-2xl border border-border/70 bg-card shadow-sm">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-border/40">
              <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600" />
                {t('soil.timeline.title') || 'Real-time Lab Progress Timeline'}
              </h3>
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                {order.order_status.replace(/_/g, ' ').toUpperCase()}
              </span>
            </div>

            <SoilTestStatusTimeline
              currentStatus={order.order_status}
              history={history}
              pickupRequired={order.pickup_required}
            />
          </AgriCard>

          {/* Structured Report / Health Card */}
          {isReportReady && structuredResults && (
            <AgriCard className="p-6 rounded-2xl border border-border/70 bg-card shadow-sm">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-border/40">
                <div>
                  <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
                    <FlaskConical className="w-4 h-4 text-emerald-600" />
                    {t('soil.healthCard.title') || 'Official Soil Health Report Parameters'}
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Tested by {order.lab_name || 'AgriConnect Certified Central Laboratory'}
                  </p>
                </div>

                <AgriButton
                  onClick={() => setAiChatOpen(true)}
                  variant="outline"
                  size="sm"
                  className="text-xs font-bold flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Explain with AI</span>
                </AgriButton>
              </div>

              <SoilHealthParametersCard report={structuredResults} />
            </AgriCard>
          )}
        </div>

        {/* Order & Farm Details Sidebar (1 Col) */}
        <div className="space-y-4">
          <AgriCard className="p-5 rounded-2xl border border-border/70 bg-card shadow-sm text-xs space-y-4">
            <h4 className="font-bold text-foreground pb-2 border-b border-border/50 flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-600" />
              Farmer & Farm Details
            </h4>

            <div>
              <span className="text-muted-foreground font-medium block">Farmer Name</span>
              <span className="font-bold text-foreground">{order.farmer_name}</span>
            </div>

            <div>
              <span className="text-muted-foreground font-medium block">Mobile Number</span>
              <span className="font-bold text-foreground">+91 {order.mobile}</span>
            </div>

            <div>
              <span className="text-muted-foreground font-medium block">Field / Farm Plot</span>
              <span className="font-bold text-foreground">
                {order.farm_name || 'Main Farm Plot'} ({order.farm_size || '—'} {order.farm_size_unit || 'Acre'})
              </span>
            </div>

            <div>
              <span className="text-muted-foreground font-medium block">Target Crop & Stage</span>
              <span className="font-bold text-foreground">
                {order.crop || 'Field Crop'} {order.crop_stage ? `(${order.crop_stage})` : ''}
              </span>
            </div>

            <div>
              <span className="text-muted-foreground font-medium block">Location</span>
              <div className="font-medium text-foreground flex items-start gap-1 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  {order.village ? `${order.village}, ` : ''}
                  {order.address}, {order.district}, {order.state} - {order.pincode}
                </span>
              </div>
            </div>
          </AgriCard>

          <AgriCard className="p-5 rounded-2xl border border-border/70 bg-card shadow-sm text-xs space-y-3">
            <h4 className="font-bold text-foreground pb-2 border-b border-border/50">
              Payment & Fee Breakdown
            </h4>

            <div className="flex justify-between text-muted-foreground">
              <span>{pkg.titleEn}</span>
              <span className="text-foreground font-medium">₹{order.test_price.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-muted-foreground">
              <span>Doorstep Pickup Fee</span>
              <span className="text-foreground font-medium">
                {order.pickup_required ? `₹${order.pickup_fee.toFixed(2)}` : 'Self-Submit (₹0)'}
              </span>
            </div>

            <div className="flex justify-between text-xs font-extrabold text-foreground pt-2 border-t border-border/50">
              <span>Total Paid</span>
              <span className="text-emerald-600 dark:text-emerald-400">₹{order.total_amount.toFixed(2)}</span>
            </div>
          </AgriCard>
        </div>
      </div>

      {/* Kisan AI Dialog */}
      <SoilAiChatModal
        open={aiChatOpen}
        onOpenChange={setAiChatOpen}
        order={order}
      />
    </div>
  );
};
