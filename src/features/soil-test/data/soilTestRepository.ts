import { supabase } from '@/integrations/supabase/client';
import type {
  SoilTestOrder,
  SoilTestStatusHistory,
  SoilOrderStatus,
  SoilTestType,
  SoilTestKpis,
  StructuredSoilResults,
  FarmSizeUnit,
  PaymentStatus,
} from '../domain/soilTestTypes';
import { logAdminAudit } from '@/features/admin/domain/adminDatabaseService';

function generateOrderNumber(): string {
  const random = Math.random().toString(36).substring(2, 10).toUpperCase();
  const year = new Date().getFullYear();
  return `ST-${year}-${random}`;
}

export interface CreateSoilOrderInput {
  userId: string;
  farmerName: string;
  mobile: string;
  email?: string;
  farmName?: string;
  address: string;
  state: string;
  district: string;
  village?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
  farmSize?: number;
  farmSizeUnit?: FarmSizeUnit;
  crop?: string;
  cropStage?: string;
  testType: SoilTestType;
  sampleQuantity?: string;
  pickupRequired: boolean;
  pickupFee: number;
  testPrice: number;
  totalAmount: number;
  preferredPickupDate?: string;
  pickupTimeSlot?: string;
  paymentMethod?: string;
  additionalNotes?: string;
}

/**
 * Creates a new Soil Test order in the real Supabase database.
 */
export async function createSoilTestOrder(input: CreateSoilOrderInput): Promise<SoilTestOrder> {
  const orderNumber = generateOrderNumber();
  const orderStatus: SoilOrderStatus = 'submitted';
  const paymentStatus: PaymentStatus = 'paid'; // Immediately marked paid upon online/demo checkout confirmation

  const payload: Partial<SoilTestOrder> = {
    order_number: orderNumber,
    user_id: input.userId,
    farmer_name: input.farmerName.trim(),
    mobile: input.mobile.trim(),
    email: input.email?.trim() || null,
    farm_name: input.farmName?.trim() || null,
    address: input.address.trim(),
    state: input.state.trim(),
    district: input.district.trim(),
    village: input.village?.trim() || null,
    pincode: input.pincode?.trim() || null,
    latitude: input.latitude || null,
    longitude: input.longitude || null,
    farm_size: input.farmSize || null,
    farm_size_unit: input.farmSizeUnit || 'acre',
    crop: input.crop?.trim() || null,
    crop_stage: input.cropStage?.trim() || null,
    test_type: input.testType,
    sample_quantity: input.sampleQuantity || '500g composite sample',
    pickup_required: input.pickupRequired,
    pickup_fee: input.pickupFee,
    test_price: input.testPrice,
    total_amount: input.totalAmount,
    payment_status: paymentStatus,
    payment_method: input.paymentMethod || 'upi',
    order_status: orderStatus,
    preferred_pickup_date: input.preferredPickupDate || null,
    pickup_time_slot: input.pickupTimeSlot || 'Morning (09:00 AM - 01:00 PM)',
    additional_notes: input.additionalNotes?.trim() || null,
    lab_name: 'AgriConnect Certified Central Laboratory',
  };

  const { data, error } = await supabase
    .from('soil_test_orders')
    .insert(payload as any)
    .select()
    .single();

  if (error) {
    console.error('[soilTestRepository] Failed to insert soil order:', error);
    throw new Error(error.message || 'Failed to place soil test order.');
  }

  const createdOrder = data as unknown as SoilTestOrder;

  // Insert initial status history record
  try {
    await supabase.from('soil_test_status_history').insert({
      soil_test_order_id: createdOrder.id,
      previous_status: null,
      new_status: 'submitted',
      changed_by: input.userId,
      changed_by_name: input.farmerName,
      note: 'Soil test order placed successfully.',
    } as any);
  } catch (histErr) {
    console.warn('[soilTestRepository] Non-fatal history insert error:', histErr);
  }

  // Push in-app notification
  try {
    await supabase.from('notifications').insert({
      user_id: input.userId,
      title: 'Mitti Jaanch Request Received 🌱',
      message: `Your soil test order ${createdOrder.order_number} has been created. Total amount ₹${createdOrder.total_amount}.`,
      type: 'order',
      link: `/soil-test`,
      data: { orderId: createdOrder.id, orderNumber: createdOrder.order_number },
    } as any);
  } catch {
    // Non-fatal notification failure
  }

  return createdOrder;
}

/**
 * Fetches all soil test orders for a specific farmer.
 */
export async function fetchFarmerSoilOrders(userId: string): Promise<SoilTestOrder[]> {
  const { data, error } = await supabase
    .from('soil_test_orders')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[soilTestRepository] fetchFarmerSoilOrders error:', error);
    return [];
  }

  return (data || []) as unknown as SoilTestOrder[];
}

/**
 * Fetches a single soil order with its status history.
 */
export async function fetchSoilOrderById(orderId: string): Promise<{
  order: SoilTestOrder | null;
  history: SoilTestStatusHistory[];
}> {
  const { data: orderData, error: orderErr } = await supabase
    .from('soil_test_orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (orderErr || !orderData) {
    console.warn('[soilTestRepository] fetchSoilOrderById error:', orderErr);
    return { order: null, history: [] };
  }

  const { data: historyData } = await supabase
    .from('soil_test_status_history')
    .select('*')
    .eq('soil_test_order_id', orderId)
    .order('created_at', { ascending: true });

  return {
    order: orderData as unknown as SoilTestOrder,
    history: (historyData || []) as unknown as SoilTestStatusHistory[],
  };
}

/**
 * Fetches all orders for Admin console with flexible filters.
 */
export async function fetchAdminSoilOrders(options?: {
  search?: string;
  status?: string;
  testType?: string;
  state?: string;
  limit?: number;
}): Promise<SoilTestOrder[]> {
  let query = supabase
    .from('soil_test_orders')
    .select('*')
    .order('created_at', { ascending: false });

  if (options?.status && options.status !== 'all') {
    query = query.eq('order_status', options.status);
  }

  if (options?.testType && options.testType !== 'all') {
    query = query.eq('test_type', options.testType);
  }

  if (options?.state && options.state !== 'all') {
    query = query.eq('state', options.state);
  }

  if (options?.search) {
    const s = `%${options.search.trim()}%`;
    query = query.or(`order_number.ilike.${s},farmer_name.ilike.${s},mobile.ilike.${s},district.ilike.${s},village.ilike.${s}`);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[soilTestRepository] fetchAdminSoilOrders error:', error);
    return [];
  }

  return (data || []) as unknown as SoilTestOrder[];
}

/**
 * Fetches orders assigned to a specific pickup agent.
 */
export async function fetchAgentAssignedOrders(agentId: string): Promise<SoilTestOrder[]> {
  const { data, error } = await supabase
    .from('soil_test_orders')
    .select('*')
    .eq('assigned_agent_id', agentId)
    .order('preferred_pickup_date', { ascending: true });

  if (error) {
    console.error('[soilTestRepository] fetchAgentAssignedOrders error:', error);
    return [];
  }

  return (data || []) as unknown as SoilTestOrder[];
}

/**
 * Updates status of a soil test order with automatic timestamp recording and notification.
 */
export async function updateSoilOrderStatus(
  orderId: string,
  newStatus: SoilOrderStatus,
  note?: string,
  actorName: string = 'AgriConnect Admin'
): Promise<SoilTestOrder> {
  const { data: currentOrder, error: fetchErr } = await supabase
    .from('soil_test_orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (fetchErr || !currentOrder) {
    throw new Error('Order not found.');
  }

  const prevStatus = (currentOrder as any).order_status;
  const updates: Record<string, any> = {
    order_status: newStatus,
    updated_at: new Date().toISOString(),
  };

  const now = new Date().toISOString();
  if (newStatus === 'sample_collected' && !(currentOrder as any).sample_collected_at) {
    updates.sample_collected_at = now;
  } else if (newStatus === 'sample_received' && !(currentOrder as any).sample_received_at) {
    updates.sample_received_at = now;
  } else if (newStatus === 'testing_in_progress' && !(currentOrder as any).lab_started_at) {
    updates.lab_started_at = now;
  } else if (newStatus === 'report_ready' && !(currentOrder as any).report_generated_at) {
    updates.report_generated_at = now;
  }

  const { data: updated, error: updateErr } = await supabase
    .from('soil_test_orders')
    .update(updates)
    .eq('id', orderId)
    .select()
    .single();

  if (updateErr) {
    console.error('[soilTestRepository] updateSoilOrderStatus failed:', updateErr);
    throw new Error(updateErr.message || 'Failed to update order status.');
  }

  // Insert status history
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('soil_test_status_history').insert({
      soil_test_order_id: orderId,
      previous_status: prevStatus,
      new_status: newStatus,
      changed_by: user?.id || null,
      changed_by_name: actorName,
      note: note || `Status updated to ${newStatus.replace(/_/g, ' ')}`,
    } as any);
  } catch (histErr) {
    console.warn('[soilTestRepository] Status history log warning:', histErr);
  }

  // Send farmer in-app notification
  try {
    const statusTitles: Record<SoilOrderStatus, string> = {
      submitted: 'Soil Test Submitted',
      payment_confirmed: 'Payment Confirmed',
      agent_pending: 'Assigning Field Agent',
      pickup_scheduled: 'Sample Pickup Scheduled 🚚',
      sample_collected: 'Sample Collected Successfully 🌾',
      sample_received: 'Sample Reached Central Lab 🔬',
      testing_in_progress: 'Lab Testing in Progress 🧪',
      report_ready: 'Your Soil Health Card is Ready! 📄🎉',
      report_delivered: 'Soil Report Completed ✅',
      cancelled: 'Soil Test Request Cancelled ❌',
    };

    await supabase.from('notifications').insert({
      user_id: (currentOrder as any).user_id,
      title: statusTitles[newStatus] || 'Soil Test Update',
      message: note || `Order ${currentOrder.order_number}: Status changed to ${newStatus.replace(/_/g, ' ')}.`,
      type: 'order',
      link: `/soil-test`,
      data: { orderId, orderNumber: currentOrder.order_number, newStatus },
    } as any);
  } catch {
    // Non-fatal
  }

  // Audit log
  logAdminAudit({
    action: `SOIL_ORDER_STATUS_${newStatus.toUpperCase()}`,
    tableName: 'soil_test_orders',
    recordId: orderId,
    oldData: { order_status: prevStatus },
    newData: { order_status: newStatus, note },
  }).catch(() => {});

  return updated as unknown as SoilTestOrder;
}

/**
 * Assigns pickup technician and confirms scheduled date/slot.
 */
export async function assignPickupAgent(
  orderId: string,
  agentId: string,
  agentName: string,
  agentPhone: string,
  confirmedPickupDate: string,
  pickupTimeSlot: string
): Promise<SoilTestOrder> {
  const updates = {
    assigned_agent_id: agentId,
    assigned_agent_name: agentName,
    assigned_agent_phone: agentPhone,
    confirmed_pickup_date: confirmedPickupDate,
    pickup_time_slot: pickupTimeSlot,
    order_status: 'pickup_scheduled' as SoilOrderStatus,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('soil_test_orders')
    .update(updates as any)
    .eq('id', orderId)
    .select()
    .single();

  if (error) {
    console.error('[soilTestRepository] assignPickupAgent error:', error);
    throw new Error(error.message || 'Failed to assign pickup technician.');
  }

  // Log status history
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('soil_test_status_history').insert({
      soil_test_order_id: orderId,
      previous_status: 'submitted',
      new_status: 'pickup_scheduled',
      changed_by: user?.id || null,
      changed_by_name: 'Admin',
      note: `Assigned agent ${agentName} (${agentPhone}) for pickup on ${confirmedPickupDate} (${pickupTimeSlot})`,
    } as any);
  } catch {
    // Non-fatal
  }

  return data as unknown as SoilTestOrder;
}

/**
 * Uploads official PDF report to Supabase Storage and records structured nutrient results.
 */
export async function uploadLabReportFile(
  orderId: string,
  file: File,
  structuredResults?: StructuredSoilResults,
  labTechnician: string = 'Dr. R. K. Sharma (Senior Soil Scientist)'
): Promise<SoilTestOrder> {
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    throw new Error('Only PDF documents are accepted for laboratory test reports.');
  }

  if (file.size > 10 * 1024 * 1024) {
    throw new Error('File size exceeds the 10MB limit.');
  }

  const timestamp = Date.now();
  const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = `${orderId}/soil_report_${timestamp}_${cleanName}`;

  // Upload to Supabase Storage 'soil-reports'
  const { error: uploadErr } = await supabase.storage
    .from('soil-reports')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: 'application/pdf',
    });

  if (uploadErr) {
    console.error('[soilTestRepository] Report file upload failed:', uploadErr);
    throw new Error(uploadErr.message || 'Failed to upload report PDF to storage.');
  }

  // Generate signed URL
  const { data: urlData } = await supabase.storage
    .from('soil-reports')
    .createSignedUrl(filePath, 60 * 60 * 24 * 7); // 7 days

  const reportUrl = urlData?.signedUrl || '';

  const resultsWithMeta: StructuredSoilResults = {
    ...(structuredResults || {}),
    testedAt: new Date().toISOString(),
    labTechnician,
  };

  const updates: Record<string, any> = {
    report_file_path: filePath,
    report_url: reportUrl,
    structured_results: resultsWithMeta,
    order_status: 'report_ready' as SoilOrderStatus,
    report_generated_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data: updatedOrder, error: updateErr } = await supabase
    .from('soil_test_orders')
    .update(updates)
    .eq('id', orderId)
    .select()
    .single();

  if (updateErr) {
    console.error('[soilTestRepository] Failed to attach report to order:', updateErr);
    throw new Error(updateErr.message || 'Failed to attach report to order.');
  }

  // Insert status history
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('soil_test_status_history').insert({
      soil_test_order_id: orderId,
      previous_status: 'testing_in_progress',
      new_status: 'report_ready',
      changed_by: user?.id || null,
      changed_by_name: labTechnician,
      note: `Official certified laboratory report uploaded by ${labTechnician}.`,
    } as any);
  } catch {
    // Non-fatal
  }

  return updatedOrder as unknown as SoilTestOrder;
}

/**
 * Gets a fresh temporary signed download URL for private report PDF.
 */
export async function getSignedReportUrl(filePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('soil-reports')
    .createSignedUrl(filePath, 60 * 60); // 1 hour

  if (error || !data?.signedUrl) {
    throw new Error('Failed to generate signed download link.');
  }

  return data.signedUrl;
}

/**
 * Aggregates real KPIs from soil_test_orders table.
 */
export async function fetchSoilTestingKpis(): Promise<SoilTestKpis> {
  const { data, error } = await supabase
    .from('soil_test_orders')
    .select('order_status, payment_status, total_amount');

  if (error || !data) {
    return {
      totalOrders: 0,
      pendingPayment: 0,
      agentPending: 0,
      scheduledPickups: 0,
      sampleCollected: 0,
      inLab: 0,
      testingInProgress: 0,
      reportsReady: 0,
      delivered: 0,
      cancelled: 0,
      totalRevenue: 0,
    };
  }

  const kpis: SoilTestKpis = {
    totalOrders: data.length,
    pendingPayment: 0,
    agentPending: 0,
    scheduledPickups: 0,
    sampleCollected: 0,
    inLab: 0,
    testingInProgress: 0,
    reportsReady: 0,
    delivered: 0,
    cancelled: 0,
    totalRevenue: 0,
  };

  data.forEach((row: any) => {
    if (row.payment_status === 'paid') {
      kpis.totalRevenue += Number(row.total_amount || 0);
    }

    switch (row.order_status) {
      case 'submitted':
        kpis.pendingPayment += 1;
        break;
      case 'agent_pending':
      case 'payment_confirmed':
        kpis.agentPending += 1;
        break;
      case 'pickup_scheduled':
        kpis.scheduledPickups += 1;
        break;
      case 'sample_collected':
        kpis.sampleCollected += 1;
        break;
      case 'sample_received':
        kpis.inLab += 1;
        break;
      case 'testing_in_progress':
        kpis.testingInProgress += 1;
        break;
      case 'report_ready':
        kpis.reportsReady += 1;
        break;
      case 'report_delivered':
        kpis.delivered += 1;
        break;
      case 'cancelled':
        kpis.cancelled += 1;
        break;
    }
  });

  return kpis;
}
