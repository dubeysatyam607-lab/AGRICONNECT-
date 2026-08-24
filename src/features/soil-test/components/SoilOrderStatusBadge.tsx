import React from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Clock,
  CheckCircle2,
  Truck,
  FlaskConical,
  FileCheck,
  PackageCheck,
  XCircle,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import type { SoilOrderStatus } from '../domain/soilTestTypes';
import { useLanguage } from '@/context/LanguageContext';

interface StatusConfig {
  label: string;
  hindiLabel: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  className: string;
  icon: React.ComponentType<{ className?: string }>;
}

const STATUS_CONFIGS: Record<SoilOrderStatus, StatusConfig> = {
  submitted: {
    label: 'Order Submitted',
    hindiLabel: 'ऑर्डर दर्ज',
    variant: 'secondary',
    className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
    icon: Clock,
  },
  payment_confirmed: {
    label: 'Payment Confirmed',
    hindiLabel: 'भुगतान सफल',
    variant: 'secondary',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
    icon: CheckCircle2,
  },
  agent_pending: {
    label: 'Agent Assignment',
    hindiLabel: 'एजेंट चयन जारी',
    variant: 'secondary',
    className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
    icon: UserCheck,
  },
  pickup_scheduled: {
    label: 'Pickup Scheduled',
    hindiLabel: 'पिकअप निर्धारित',
    variant: 'secondary',
    className: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800',
    icon: Truck,
  },
  sample_collected: {
    label: 'Sample Collected',
    hindiLabel: 'नमूना एकत्र किया',
    variant: 'secondary',
    className: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800',
    icon: PackageCheck,
  },
  sample_received: {
    label: 'Received at Lab',
    hindiLabel: 'लैब में प्राप्त',
    variant: 'secondary',
    className: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800',
    icon: FlaskConical,
  },
  testing_in_progress: {
    label: 'Testing in Progress',
    hindiLabel: 'परीक्षण जारी',
    variant: 'secondary',
    className: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-700 animate-pulse',
    icon: FlaskConical,
  },
  report_ready: {
    label: 'Report Ready',
    hindiLabel: 'रिपोर्ट तैयार 🎉',
    variant: 'default',
    className: 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-sm font-semibold',
    icon: Sparkles,
  },
  report_delivered: {
    label: 'Delivered',
    hindiLabel: 'पूर्ण',
    variant: 'secondary',
    className: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
    icon: FileCheck,
  },
  cancelled: {
    label: 'Cancelled',
    hindiLabel: 'रद्द',
    variant: 'destructive',
    className: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
    icon: XCircle,
  },
};

export const SoilOrderStatusBadge: React.FC<{
  status: SoilOrderStatus;
  className?: string;
  showIcon?: boolean;
}> = ({ status, className = '', showIcon = true }) => {
  const { language } = useLanguage();
  const isHindi = language === 'hi';
  const cfg = STATUS_CONFIGS[status] || STATUS_CONFIGS.submitted;
  const Icon = cfg.icon;

  return (
    <Badge
      variant="outline"
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border transition-all ${cfg.className} ${className}`}
    >
      {showIcon && <Icon className="w-3.5 h-3.5 shrink-0" />}
      <span>{isHindi ? cfg.hindiLabel : cfg.label}</span>
    </Badge>
  );
};
