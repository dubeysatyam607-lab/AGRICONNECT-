import React from 'react';
import {
  CheckCircle2,
  Clock,
  FlaskConical,
  Truck,
  FileCheck,
  CreditCard,
  UserCheck,
  Send,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { SoilOrderStatus, SoilTestStatusHistory } from '../domain/soilTestingTypes';
import { useLanguage } from '@/contexts/LanguageContext';

interface SoilTestStatusTimelineProps {
  currentStatus: SoilOrderStatus;
  history?: SoilTestStatusHistory[];
  pickupRequired?: boolean;
}

interface TimelineStepDef {
  key: SoilOrderStatus;
  titleKey: string;
  defaultTitle: string;
  descKey: string;
  defaultDesc: string;
  icon: React.ComponentType<{ className?: string }>;
}

const ORDERED_STEPS: TimelineStepDef[] = [
  {
    key: 'submitted',
    titleKey: 'soil.status.submitted',
    defaultTitle: 'Request Submitted',
    descKey: 'soil.status.submitted.desc',
    defaultDesc: 'Soil test request details recorded',
    icon: FileText,
  },
  {
    key: 'payment_confirmed',
    titleKey: 'soil.status.payment_confirmed',
    defaultTitle: 'Payment Confirmed',
    descKey: 'soil.status.payment_confirmed.desc',
    defaultDesc: 'Order payment verified via gateway',
    icon: CreditCard,
  },
  {
    key: 'agent_pending',
    titleKey: 'soil.status.agent_pending',
    defaultTitle: 'Agent Dispatch Pending',
    descKey: 'soil.status.agent_pending.desc',
    defaultDesc: 'Assigning nearest verified collection technician',
    icon: UserCheck,
  },
  {
    key: 'pickup_scheduled',
    titleKey: 'soil.status.pickup_scheduled',
    defaultTitle: 'Pickup Scheduled',
    descKey: 'soil.status.pickup_scheduled.desc',
    defaultDesc: 'Technician confirmed pickup date & time slot',
    icon: Clock,
  },
  {
    key: 'sample_collected',
    titleKey: 'soil.status.sample_collected',
    defaultTitle: 'Sample Collected',
    descKey: 'soil.status.sample_collected.desc',
    defaultDesc: 'Soil bag tagged & en route to central lab',
    icon: Truck,
  },
  {
    key: 'sample_received',
    titleKey: 'soil.status.sample_received',
    defaultTitle: 'Sample Received at Lab',
    descKey: 'soil.status.sample_received.desc',
    defaultDesc: 'Sample logged into laboratory accession system',
    icon: FlaskConical,
  },
  {
    key: 'testing_in_progress',
    titleKey: 'soil.status.testing_in_progress',
    defaultTitle: 'Testing in Progress',
    descKey: 'soil.status.testing_in_progress.desc',
    defaultDesc: 'Chemical NPK, pH & micronutrient analysis',
    icon: FlaskConical,
  },
  {
    key: 'report_ready',
    titleKey: 'soil.status.report_ready',
    defaultTitle: 'Report Ready',
    descKey: 'soil.status.report_ready.desc',
    defaultDesc: 'Certified digital Soil Health Card generated',
    icon: FileCheck,
  },
  {
    key: 'report_delivered',
    titleKey: 'soil.status.report_delivered',
    defaultTitle: 'Report Delivered',
    descKey: 'soil.status.report_delivered.desc',
    defaultDesc: 'Delivered to farmer app with AI recommendations',
    icon: Send,
  },
];

const STATUS_RANK: Record<SoilOrderStatus, number> = {
  submitted: 0,
  payment_confirmed: 1,
  agent_pending: 2,
  pickup_scheduled: 3,
  sample_collected: 4,
  sample_received: 5,
  testing_in_progress: 6,
  report_ready: 7,
  report_delivered: 8,
  cancelled: -1,
};

export const SoilTestStatusTimeline: React.FC<SoilTestStatusTimelineProps> = ({
  currentStatus,
  history = [],
  pickupRequired = true,
}) => {
  const { t, formatDate } = useLanguage();

  if (currentStatus === 'cancelled') {
    return (
      <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-2xl p-4 flex items-center gap-3">
        <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
        <div>
          <div className="font-bold text-sm text-red-900 dark:text-red-300">
            {t('soil.status.cancelled') || 'Order Cancelled'}
          </div>
          <div className="text-xs text-red-700 dark:text-red-400">
            {t('soil.status.cancelled.desc') || 'This soil test order has been cancelled or refunded.'}
          </div>
        </div>
      </div>
    );
  }

  // Filter out pickup-specific steps if self-submission
  const steps = pickupRequired
    ? ORDERED_STEPS
    : ORDERED_STEPS.filter((s) => s.key !== 'agent_pending' && s.key !== 'pickup_scheduled');

  const currentRank = STATUS_RANK[currentStatus] ?? 0;

  return (
    <div className="space-y-4 py-2">
      <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-border/60">
        {steps.map((step, idx) => {
          const stepRank = STATUS_RANK[step.key];
          const isDone = stepRank < currentRank;
          const isCurrent = stepRank === currentRank;
          const isPending = stepRank > currentRank;
          const Icon = step.icon;

          // Check if we have an audit timestamp for this status
          const historyEntry = history.find((h) => h.new_status === step.key);

          return (
            <div key={idx} className="relative group">
              {/* Dot / Icon */}
              <div
                className={`absolute -left-[30px] sm:-left-[38px] top-0.5 w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center transition-all ${
                  isDone
                    ? 'bg-emerald-600 text-white shadow-sm ring-4 ring-emerald-50 dark:ring-emerald-950/40'
                    : isCurrent
                    ? 'bg-emerald-500 text-white animate-pulse ring-4 ring-emerald-100 dark:ring-emerald-900/50'
                    : 'bg-muted border border-border text-muted-foreground'
                }`}
              >
                {isDone ? (
                  <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                ) : (
                  <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                )}
              </div>

              {/* Content */}
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                <div>
                  <h4
                    className={`text-xs sm:text-sm font-bold ${
                      isDone || isCurrent
                        ? 'text-foreground font-semibold'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {t(step.titleKey) || step.defaultTitle}
                  </h4>
                  <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                    {historyEntry?.note || t(step.descKey) || step.defaultDesc}
                  </p>
                </div>

                {historyEntry?.created_at && (
                  <span className="text-[10px] text-muted-foreground shrink-0 font-medium">
                    {formatDate(historyEntry.created_at, {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
