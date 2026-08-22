import React, { useState } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  User,
  Phone,
  MapPin,
  Sprout,
  Layers,
  Wallet,
  Tractor,
  ScanLine,
  Bot,
  Calendar,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  ArrowUpRight,
  PlusCircle,
  MinusCircle,
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AdminStatusBadge } from './StatusBadge';
import { fmtINR, fmtNumber, shortDate, timeAgo } from '../../domain/adminStore';
import { updateUserStatus, updateUserKyc, adjustUserWalletBalance } from '../../domain/adminDatabaseService';
import type { FarmerEntity } from '../../domain/adminTypes';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

interface FarmerDetailDrawerProps {
  farmer: FarmerEntity | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefresh: () => void;
}

export function FarmerDetailDrawer({
  farmer,
  open,
  onOpenChange,
  onRefresh,
}: FarmerDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [confirmAction, setConfirmAction] = useState<{
    type: 'suspend' | 'unsuspend' | 'verify_kyc' | 'reject_kyc' | 'wallet_adjust';
    title: string;
    description: string;
  } | null>(null);

  const [walletAmount, setWalletAmount] = useState<string>('');
  const [walletDirection, setWalletDirection] = useState<'credit' | 'debit'>('credit');
  const [walletReason, setWalletReason] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!farmer) return null;

  const handleExecuteAction = async () => {
    if (!confirmAction) return;
    setIsProcessing(true);
    try {
      if (confirmAction.type === 'suspend') {
        const ok = await updateUserStatus(farmer.id, 'Suspended', 'Suspended by Administrator');
        if (ok) toast.success(`User ${farmer.name} suspended`);
      } else if (confirmAction.type === 'unsuspend') {
        const ok = await updateUserStatus(farmer.id, 'Active', 'Reactivated by Administrator');
        if (ok) toast.success(`User ${farmer.name} reactivated`);
      } else if (confirmAction.type === 'verify_kyc') {
        const ok = await updateUserKyc(farmer.id, true, 'Verified by Admin');
        if (ok) toast.success(`KYC approved for ${farmer.name}`);
      } else if (confirmAction.type === 'reject_kyc') {
        const ok = await updateUserKyc(farmer.id, false, 'Rejected by Admin');
        if (ok) toast.success(`KYC rejected for ${farmer.name}`);
      } else if (confirmAction.type === 'wallet_adjust') {
        const amt = parseFloat(walletAmount);
        if (isNaN(amt) || amt <= 0 || !walletReason.trim()) {
          toast.error('Please specify valid amount and reason');
          setIsProcessing(false);
          return;
        }
        const ok = await adjustUserWalletBalance({
          userId: farmer.id,
          amount: amt,
          direction: walletDirection,
          reason: walletReason,
        });
        if (ok) toast.success(`Wallet adjusted by ₹${amt}`);
      }
      onRefresh();
    } catch {
      toast.error('Action failed. Please try again.');
    } finally {
      setIsProcessing(false);
      setConfirmAction(null);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-6">
          <SheetHeader className="border-b pb-4">
            <div className="flex items-start justify-between">
              <div>
                <SheetTitle className="text-xl font-bold text-foreground flex items-center gap-2">
                  {farmer.name}
                  <AdminStatusBadge status={farmer.status} />
                  <AdminStatusBadge status={farmer.verification} />
                </SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground mt-1">
                  User ID: <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-[11px]">{farmer.id}</code>
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
            <TabsList className="grid grid-cols-4 w-full h-9">
              <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
              <TabsTrigger value="farm" className="text-xs">Farm & Crop</TabsTrigger>
              <TabsTrigger value="finance" className="text-xs">Wallet & Subs</TabsTrigger>
              <TabsTrigger value="actions" className="text-xs text-red-500 dark:text-red-400 font-bold">Actions</TabsTrigger>
            </TabsList>

            {/* TAB 1: OVERVIEW */}
            <TabsContent value="overview" className="space-y-4 pt-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border bg-muted/40 p-3">
                  <p className="text-[11px] font-semibold text-muted-foreground">Phone Number</p>
                  <p className="text-sm font-bold text-foreground mt-0.5 flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-primary" /> {farmer.phone}
                  </p>
                </div>
                <div className="rounded-xl border bg-muted/40 p-3">
                  <p className="text-[11px] font-semibold text-muted-foreground">Location</p>
                  <p className="text-sm font-bold text-foreground mt-0.5 flex items-center gap-1.5 truncate">
                    <MapPin className="h-3.5 w-3.5 text-primary" /> {[farmer.village, farmer.district, farmer.state].filter(Boolean).join(', ') || 'India'}
                  </p>
                </div>
                <div className="rounded-xl border bg-muted/40 p-3">
                  <p className="text-[11px] font-semibold text-muted-foreground">Joined Date</p>
                  <p className="text-sm font-bold text-foreground mt-0.5 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-primary" /> {shortDate(farmer.joined)} ({timeAgo(farmer.joined)})
                  </p>
                </div>
                <div className="rounded-xl border bg-muted/40 p-3">
                  <p className="text-[11px] font-semibold text-muted-foreground">Rating</p>
                  <p className="text-sm font-bold text-foreground mt-0.5">
                    ⭐ {farmer.rating || '5.0'} / 5.0
                  </p>
                </div>
              </div>

              <div className="rounded-xl border p-4 bg-card space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Platform Activity</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-muted/50 rounded-lg p-2.5">
                    <p className="text-lg font-black text-foreground">{farmer.orders}</p>
                    <p className="text-[10px] text-muted-foreground">Store Orders</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-2.5">
                    <p className="text-lg font-black text-foreground">0</p>
                    <p className="text-[10px] text-muted-foreground">Tractor Rentals</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-2.5">
                    <p className="text-lg font-black text-foreground">0</p>
                    <p className="text-[10px] text-muted-foreground">Crop Scans</p>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* TAB 2: FARM & CROP */}
            <TabsContent value="farm" className="space-y-4 pt-3">
              <div className="rounded-xl border p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Sprout className="h-5 w-5 text-emerald-600" />
                  <h3 className="text-sm font-bold text-foreground">Land & Crop Information</h3>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Land Size</p>
                    <p className="text-sm font-bold text-foreground mt-0.5">
                      {farmer.landSize ? `${farmer.landSize} ${farmer.unit}` : 'Not recorded'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Primary Crop</p>
                    <p className="text-sm font-bold text-foreground mt-0.5">{farmer.primaryCrop || 'Wheat'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Village / Town</p>
                    <p className="text-sm font-bold text-foreground mt-0.5">{farmer.village || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">State</p>
                    <p className="text-sm font-bold text-foreground mt-0.5">{farmer.state || 'India'}</p>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* TAB 3: FINANCE & WALLET */}
            <TabsContent value="finance" className="space-y-4 pt-3">
              <div className="rounded-xl border p-4 bg-card space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-emerald-600" />
                    <div>
                      <p className="text-xs text-muted-foreground">AgriPay Wallet Balance</p>
                      <p className="text-xl font-black text-foreground">₹0</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setConfirmAction({
                        type: 'wallet_adjust',
                        title: `Adjust Wallet Balance for ${farmer.name}`,
                        description: 'This modification will be recorded in the audit trail.',
                      });
                    }}
                  >
                    Adjust Balance
                  </Button>
                </div>
              </div>

              <div className="rounded-xl border p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-purple-600" />
                  <p className="text-sm font-bold text-foreground">Subscription Status</p>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <div>
                    <p className="text-xs font-semibold text-foreground">Kisan Basic (Free)</p>
                    <p className="text-[11px] text-muted-foreground">Active · Standard Farmer Plan</p>
                  </div>
                  <Badge variant="outline" className="text-xs font-bold text-emerald-600 border-emerald-500/30">
                    Active
                  </Badge>
                </div>
              </div>
            </TabsContent>

            {/* TAB 4: ACTIONS */}
            <TabsContent value="actions" className="space-y-3 pt-3">
              <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 space-y-3">
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <AlertTriangle className="h-5 w-5" />
                  <h3 className="text-sm font-bold">Authorized Account Operations</h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  All administrative modifications are logged to the immutable audit trail.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                  {farmer.status === 'Active' ? (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setConfirmAction({
                        type: 'suspend',
                        title: `Suspend Account for ${farmer.name}?`,
                        description: 'User will lose access to ordering, bookings, and active sessions.',
                      })}
                    >
                      Suspend User
                    </Button>
                  ) : (
                    <Button
                      variant="default"
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-500"
                      onClick={() => setConfirmAction({
                        type: 'unsuspend',
                        title: `Reactivate Account for ${farmer.name}?`,
                        description: 'User will regain standard platform access.',
                      })}
                    >
                      Reactivate User
                    </Button>
                  )}

                  {farmer.verification === 'Unverified' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-emerald-600 text-emerald-600 hover:bg-emerald-50"
                      onClick={() => setConfirmAction({
                        type: 'verify_kyc',
                        title: `Approve KYC Verification for ${farmer.name}?`,
                        description: 'Farmer badge will be displayed as Verified.',
                      })}
                    >
                      Verify KYC
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-red-500 text-red-500 hover:bg-red-50"
                      onClick={() => setConfirmAction({
                        type: 'reject_kyc',
                        title: `Revoke KYC Verification for ${farmer.name}?`,
                        description: 'Status will return to Unverified.',
                      })}
                    >
                      Revoke KYC
                    </Button>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      {/* CONFIRMATION ALERT DIALOG */}
      <AlertDialog open={!!confirmAction} onOpenChange={(o) => !o && setConfirmAction(null)}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmAction?.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmAction?.description}</AlertDialogDescription>
          </AlertDialogHeader>

          {confirmAction?.type === 'wallet_adjust' && (
            <div className="space-y-3 py-2">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={walletDirection === 'credit' ? 'default' : 'outline'}
                  onClick={() => setWalletDirection('credit')}
                  className={walletDirection === 'credit' ? 'bg-emerald-600' : ''}
                >
                  <PlusCircle className="h-4 w-4 mr-1" /> Credit (Add)
                </Button>
                <Button
                  size="sm"
                  variant={walletDirection === 'debit' ? 'destructive' : 'outline'}
                  onClick={() => setWalletDirection('debit')}
                >
                  <MinusCircle className="h-4 w-4 mr-1" /> Debit (Deduct)
                </Button>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Amount (₹)</label>
                <input
                  type="number"
                  value={walletAmount}
                  onChange={(e) => setWalletAmount(e.target.value)}
                  placeholder="e.g. 500"
                  className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Audit Reason</label>
                <input
                  type="text"
                  value={walletReason}
                  onChange={(e) => setWalletReason(e.target.value)}
                  placeholder="e.g. Promotional grant or refund"
                  className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm"
                />
              </div>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isProcessing}
              onClick={handleExecuteAction}
              className="bg-primary text-primary-foreground"
            >
              {isProcessing ? 'Processing…' : 'Confirm Action'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
