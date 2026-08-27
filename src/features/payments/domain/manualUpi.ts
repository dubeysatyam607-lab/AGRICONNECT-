import { supabase } from '@/integrations/supabase/client';

export type PaymentStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface PaymentConfig {
  ok: boolean;
  upi_id: string;
  payee_name: string;
  currency: string;
  is_active: boolean;
  pending_expiry_hours: number;
}

export interface PaymentRequestRow {
  id: string;
  user_id: string;
  plan_id: string;
  amount: number;
  currency: string;
  utr: string;
  payment_date: string | null;
  proof_storage_path: string;
  status: PaymentStatus;
  admin_note: string | null;
  rejection_reason: string | null;
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbSubscriptionRow {
  id: string;
  plan_id: string;
  status: string;
  started_at: string | null;
  expires_at: string | null;
  cancelled_at: string | null;
  founding_farmer: boolean | null;
  founding_farmer_number: number | null;
}

export interface ManualPlan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  interval: string;
  is_active: boolean | null;
  features: unknown;
}

export const UTR_FORBIDDEN = /[^A-Z0-9/-]/;

export function normalizeUtr(raw: string): string {
  return (raw || '').toUpperCase().replace(/\s+/g, '');
}

export function validateUtr(raw: string): string | null {
  const utr = normalizeUtr(raw);
  if (utr.length < 6) return 'UTR must be at least 6 characters';
  if (utr.length > 40) return 'UTR must be at most 40 characters';
  if (UTR_FORBIDDEN.test(utr)) return 'Use letters, digits, - or / only';
  return null;
}

const ALLOWED_EXT: Record<string, string> = { png: 'png', jpg: 'jpeg', jpeg: 'jpeg', webp: 'webp' };

export type ProofImage = { blob: Blob; ext: 'png' | 'jpeg' | 'webp' };

export async function prepareProofImage(file: File): Promise<{ error: string | null; image?: ProofImage }> {
  if (!file) return { error: 'Please select a payment screenshot' };
  if (file.size > 5 * 1024 * 1024) return { error: 'Screenshot must be under 5 MB' };

  const buf = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  let type: 'png' | 'jpeg' | 'webp' | null = null;
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) type = 'png';
  else if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) type = 'jpeg';
  else if (buf.slice(0, 4).every((b, i) => b === [0x52, 0x49, 0x46, 0x46][i])) type = 'webp';
  if (!type) return { error: 'Only PNG, JPG or WebP images are accepted' };

  try {
    const bitmap = await createImageBitmap(file);
    const maxSide = 1800;
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    if (scale >= 1 && file.size <= 900 * 1024) {
      return { image: { blob: file, ext: type } };
    }
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.82));
    if (!blob) return { error: 'Could not process the image' };
    return { image: { blob, ext: 'webp' } };
  } catch {
    return { error: 'Could not read the image file' };
  }
}

export function buildUpiUri(config: Pick<PaymentConfig, 'upi_id' | 'payee_name' | 'currency'>, amount: number, note?: string): string {
  const pairs = [`pa=${encodeURIComponent(config.upi_id.trim())}`];
  pairs.push(`pn=${encodeURIComponent((config.payee_name || 'AgriConnect').trim())}`);
  pairs.push(`am=${encodeURIComponent(String(amount))}`);
  pairs.push(`cu=${encodeURIComponent(config.currency || 'INR')}`);
  if (note) pairs.push(`tn=${encodeURIComponent(note)}`);
  return `upi://pay?${pairs.join('&')}`;
}

export async function fetchPaymentConfig(): Promise<PaymentConfig | null> {
  const { data, error } = await supabase.rpc('get_payment_config');
  if (error || !data?.ok) return null;
  return data as PaymentConfig;
}

export async function fetchManualPlans(): Promise<ManualPlan[]> {
  const { data, error } = await supabase
    .from('subscription_plans')
    .select('id, name, description, price, currency, interval, is_active, features')
    .order('sort_order', { ascending: true });
  if (error) return [];
  return (data || []).filter((p) => p.is_active !== false);
}

export interface SubmitPaymentInput {
  planId: string;
  amount: number;
  utr: string;
  proofPath: string;
  paymentDate?: string;
  note?: string;
}

export async function submitManualPayment(input: SubmitPaymentInput): Promise<{ ok: true; id: string; status: string } | { ok: false; error: string }> {
  const { data, error } = await supabase.rpc('submit_manual_payment', {
    p_plan_id: input.planId,
    p_amount: input.amount,
    p_utr: input.utr,
    p_proof_path: input.proofPath,
    p_payment_date: input.paymentDate || null,
    p_note: input.note || null,
  });
  if (error) return { ok: false, error: error.message };
  if (!data?.ok) return { ok: false, error: data?.error || 'Submission failed' };
  return data;
}

export async function uploadProof(userId: string, blob: Blob, ext: string): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  const folder = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const path = `payment-proofs/${userId}/${folder}/proof.${ext}`;
  const { error } = await supabase.storage.from('payment-proofs').upload(path, blob, { contentType: `image/${ext === 'jpeg' ? 'jpeg' : ext}` });
  if (error) return { ok: false, error: error.message };
  return { ok: true, path };
}

export async function adminApprovePayment(id: string, note?: string) {
  const { data, error } = await supabase.rpc('admin_approve_manual_payment', { p_payment_request_id: id, p_note: note || null });
  return { ok: Boolean(data?.ok), error: error?.message || data?.error || null };
}

export async function adminRejectPayment(id: string, reason: string) {
  const { data, error } = await supabase.rpc('admin_reject_manual_payment', { p_payment_request_id: id, p_reason: reason });
  return { ok: Boolean(data?.ok), error: error?.message || data?.error || null };
}

export async function adminRequestInfo(id: string, message: string) {
  const { data, error } = await supabase.rpc('admin_request_payment_info', { p_payment_request_id: id, p_message: message });
  return { ok: Boolean(data?.ok), error: error?.message || data?.error || null };
}

export async function adminManageSubscription(input: {
  userId: string;
  planId?: string;
  action: 'grant' | 'extend' | 'cancel' | 'suspend';
  durationMonths?: number;
  reason?: string;
}) {
  const { data, error } = await supabase.rpc('admin_manage_subscription', {
    p_user_id: input.userId,
    p_plan_id: input.planId || null,
    p_action: input.action,
    p_duration_months: input.durationMonths || 1,
    p_reason: input.reason || 'Manual verification',
  });
  return { ok: Boolean(data?.ok), error: error?.message || data?.error || null };
}

export function fmtINR(n: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
}