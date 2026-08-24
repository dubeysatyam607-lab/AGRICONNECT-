import React, { useState, useEffect } from 'react';
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
  CreditCard,
  History,
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AdminStatusBadge } from './StatusBadge';
import { fmtINR, fmtNumber, shortDate, timeAgo } from '../../domain/adminStore';
import {
  updateUserStatus,
  updateUserKyc,
  adjustUserWalletBalance,
  fetchUserWallet,
  fetchUserWalletTransactions,
} from '../../domain/adminDatabaseService';
import { supabase } from '@/integrations/supabase/client';
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

interface WalletTx {
  id: string;
  amount: number;
  type: string;
  reason: string | null;
  created_at: string;
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

  // Real data from DB
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [walletTxns, setWalletTxns] = useState<WalletTx[]>([]);
  const [bookingCount, setBookingCount] = useState(0);
  const [scanCount, setScanCount] = useState(0);
  const [conversationCount, setConversationCount] = useState(0);
  const [subscription, setSubscription] = useState<{ plan: string; status: string } | null>(null);

  // Fetch real data when drawer opens
  useEffect(() => {
    if (!farmer || !open) return;
    let cancelled = false;

    (async () => {
      // Wallet
      const w = await fetchUserWallet(farmer.id);
      const txns = await fetchUserWalletTransactions(farmer.id);
      if (cancelled) return;
      setWalletBalance(w.balance);
      setWalletTxns(txns);

      // Activity counts
      const [bookingsRes, scansRes, convRes] = await Promise.allSettled([
        supabase.from('tractor_bookings').select('id', { count: 'exact', head: true }).eq('user_name', farmer.name),
        supabase.from('crop_scans').select('id', { count: 'exact', head: true }).eq('user_id', farmer.id),
        supabase.from('ai_conversations').select('id', { count: 'exact', head: true }).eq('user_id', farmer.id),
      ]);
      if (cancelled) return;
      setBookingCount(bookingsRes.status === 'fulfilled' ? (bookingsRes.value as any).count ?? 0 : 0);
      setScanCount(scansRes.status === 'fulfilled' ? (scansRes.value as any).count ?? 0 : 0);
      setConversationCount(convRes.status === 'fulfilled' ? (convRes.value as any).count ?? 0 : 0);

      // Subscription
      const { data: sub } = await supabase
        .from('user_subscriptions')
        .select('status, subscription_plans(name)')
        .eq('user_id', farmer.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      if (sub) {
        setSubscription({
          plan: (sub as any).subscription_plans?.name || 'Unknown Plan',
          status: sub.status || 'active',
        });
      } else {
        setSubscription(null);
      }
    })();

    return () => { cancelled = true; };
  }, [farmer?.id, open]);

  if (!farmer) return null;

  const handleExecuteAction = async () => {
    if (!confirmAction) return;
    setIsProcessing(true);
    try {
      let result: { ok: boolean; error?: string };
      if (confirmAction.type === 'suspend') {
        result = await updateUserStatus(farmer.id, 'Suspended', 'Suspended by Administrator');
        if (result.ok) toast.success(`User ${farmer.name} suspended`);
        else toast.error(`Failed: ${result.error}`);
      } else if (confirmAction.type === 'unsuspend') {
        result = await updateUserStatus(farmer.id, 'Active', 'Reactivated by Administrator');
        if (result.ok) toast.success(`User ${farmer.name} reactivated`);
        else toast.error(`Failed: ${result.error}`);
      } else if (confirmAction.type === 'verify_kyc') {
        result = await updateUserKyc(farmer.id, true, 'Verified by Admin');
        if (result.ok) toast.success(`KYC approved for ${farmer.name}`);
        else toast.error(`Verification failed: ${result.error}`);
      } else if (confirmAction.type === 'reject_kyc') {
        result = await updateUserKyc(farmer.id, false, 'Rejected by Admin');
        if (result.ok) toast.success(`KYC rejected for ${farmer.name}`);
        else toast.error(`Rejection failed: ${result.error}`);
      } else if (confirmAction.type === 'wallet_adjust') {
        const amt = parseFloat(walletAmount);
        if (isNaN(amt) || amt <= 0 || !walletReason.trim()) {
          toast.error('Please specify valid amount and reason');
          setIsProcessing(false);
          return;
        }
        result = await adjustUserWalletBalance({
          userId: farmer.id,
          amount: amt,
          direction: walletDirection,
          reason: walletReason,
        });
        if (result.ok) {
          toast.success(`Wallet adjusted by ₹${amt}`);
          // Refresh wallet data
          const w = await fetchUserWallet(farmer.id);
          const txns = await fetchUserWalletTransactions(farmer.id);
          setWalletBalance(w.balance);
          setWalletTxns(txns);
          setWalletAmount('');
          setWalletReason('');
        } else {
          toast.error(`Wallet adjustment failed: ${result.error}`);
        }
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
            <TabsList className="grid grid-cols-5 w-full h-9">
              <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
              <TabsTrigger value="farm" className="text-xs">Farm</TabsTrigger>
              <TabsTrigger value="finance" className="text-xs">Wallet</TabsTrigger>
              <TabsTrigger value="activity" className="text-xs">Activity</TabsTrigger>
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
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="bg-muted/50 rounded-lg p-2.5">
                    <p className="text-lg font-black text-foreground">{bookingCount}</p>
                    <p className="text-[10px] text-muted-foreground">Tractor Bookings</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-2.5">
                    <p className="text-lg font-black text-foreground">{scanCount}</p>
                    <p className="text-[10px] text-muted-foreground">Crop Scans</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-2.5">
                    <p className="text-lg font-black text-foreground">{conversationCount}</p>
                    <p className="text-[10px] text-muted-foreground">AI Chats</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-2.5">
                    <p className="text-lg font-black text-foreground">{fmtINR(walletBalance)}</p>
                    <p className="text-[10px] text-muted-foreground">Wallet</p>
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
                    <p className="text-sm font-bold text-foreground mt-0.5">{farmer.primaryCrop || 'Not specified'}</p>
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

            {/* TAB 3: WALLET & SUBSCRIPTION */}
            <TabsContent value="finance" className="space-y-4 pt-3">
              <div className="rounded-xl border p-4 bg-card space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-emerald-600" />
                    <div>
                      <p className="text-xs text-muted-foreground">AgriPay Wallet Balance</p>
                      <p className="text-xl font-black text-foreground">{fmtINR(walletBalance)}</p>
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

              {/* Wallet Transaction History */}
              {walletTxns.length > 0 && (
                <div className="rounded-xl border p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <History className="h-4 w-4 text-muted-foreground" />
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Recent Transactions</p>
                  </div>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {walletTxns.map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2 text-xs">
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-foreground">{tx.reason || tx.type}</p>
                            <p className="text-muted-foreground">{timeAgo(tx.created_at)}</p>
                          </div>
                        </div>
                        <span className={`font-bold ${tx.type === 'credit' || tx.type === 'in' ? 'text-emerald-600' : 'text-red-600'}`}>
                          {tx.type === 'credit' || tx.type === 'in' ? '+' : '-'}{fmtINR(tx.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Subscription */}
              <div className="rounded-xl border p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-purple-600" />
                  <p className="text-sm font-bold text-foreground">Subscription Status</p>
                </div>
                {subscription ? (
                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <p className="text-xs font-semibold text-foreground">{subscription.plan}</p>
                      <p className="text-[11px] text-muted-foreground">Status: {subscription.status}</p>
                    </div>
                    <Badge variant="outline" className={`text-xs font-bold ${
                      subscription.status === 'active' ? 'text-emerald-600 border-emerald-500/30' :
                      subscription.status === 'cancelled' ? 'text-red-600 border-red-500/30' :
                      'text-amber-600 border-amber-500/30'
                    }`}>
                      {subscription.status}
                    </Badge>
                  </div>
                ) : (
                  <div className="pt-1">
                    <p className="text-xs text-muted-foreground">No active subscription — using Free plan</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* TAB 4: ACTIVITY */}
            <TabsContent value="activity" className="space-y-4 pt-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border bg-muted/40 p-3 text-center">
                  <Tractor className="mx-auto h-5 w-5 text-amber-600 mb-1" />
                  <p className="text-lg font-black text-foreground">{bookingCount}</p>
                  <p className="text-[10px] text-muted-foreground">Tractor Bookings</p>
                </div>
                <div className="rounded-xl border bg-muted/40 p-3 text-center">
                  <ScanLine className="mx-auto h-5 w-5 text-green-600 mb-1" />
                  <p className="text-lg font-black text-foreground">{scanCount}</p>
                  <p className="text-[10px] text-muted-foreground">Crop Scans</p>
                </div>
                <div className="rounded-xl border bg-muted/40 p-3 text-center">
                  <Bot className="mx-auto h-5 w-5 text-teal-600 mb-1" />
                  <p className="text-lg font-black text-foreground">{conversationCount}</p>
                  <p className="text-[10px] text-muted-foreground">AI Conversations</p>
                </div>
              </div>
            </TabsContent>

            {/* TAB 5: ACTIONS */}
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
                <label className="text-xs font-semibold text-muted-foreground">Audit Reason (min 5 chars)</label>
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
