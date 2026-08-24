import { supabase } from '@/integrations/supabase/client';
import {
  SoilTestOrder,
  SoilTestStatusHistory,
  CreateSoilTestOrderInput,
  SoilOrderStatus,
  SoilPaymentStatus,
  StructuredSoilReport,
  SoilTestingKPIs,
} from './soilTestingTypes';
import { calculateSoilOrderTotal } from './soilTestingPricing';
import { sendSoilTestNotification } from './soilEmailNotifications';

/**
 * Generate cryptographically secure random non-sequential order number
 * Format: ST-2026-XXXXXXXX
 */
export function generateOrderNumber(): string {
  const year = new Date().getFullYear();
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let random = '';
  const cryptoObj = typeof window !== 'undefined' ? window.crypto : null;
  if (cryptoObj && cryptoObj.getRandomValues) {
    const values = new Uint8Array(8);
    cryptoObj.getRandomValues(values);
    for (let i = 0; i < 8; i++) {
      random += chars[values[i] % chars.length];
    }
  } else {
    for (let i = 0; i < 8; i++) {
      random += chars[Math.floor(Math.random() * chars.length)];
    }
  }
  return `ST-${year}-${random}`;
}

export const soilTestingService = {
  /**
   * Create a real Soil Test Order in Supabase
   */
  async createSoilTestOrder(
    userId: string,
    input: CreateSoilTestOrderInput,
    paymentMethod: string = 'upi',
    paymentStatus: SoilPaymentStatus = 'paid'
  ): Promise<{ data: SoilTestOrder | null; error: Error | null }> {
    try {
      const orderNumber = generateOrderNumber();
      const pricing = calculateSoilOrderTotal(input.test_type, input.pickup_required);

      const initialStatus: SoilOrderStatus = input.pickup_required
        ? paymentStatus === 'paid'
          ? 'agent_pending'
          : 'submitted'
        : paymentStatus === 'paid'
        ? 'payment_confirmed'
        : 'submitted';

      const insertPayload = {
        order_number: orderNumber,
        user_id: userId,
        farmer_name: input.farmer_name,
        mobile: input.mobile,
        email: input.email || null,
        farm_name: input.farm_name || null,
        address: input.address,
        state: input.state,
        district: input.district,
        village: input.village || null,
        pincode: input.pincode || null,
        latitude: input.latitude || null,
        longitude: input.longitude || null,
        farm_size: input.farm_size || null,
        farm_size_unit: input.farm_size_unit || 'acre',
        crop: input.crop || null,
        crop_stage: input.crop_stage || null,
        test_type: input.test_type,
        sample_quantity: input.sample_quantity || '500g composite sample',
        pickup_required: input.pickup_required,
        pickup_fee: pricing.pickupFee,
        test_price: pricing.testPrice,
        total_amount: pricing.totalAmount,
        payment_status: paymentStatus,
        payment_method: paymentMethod,
        order_status: initialStatus,
        preferred_pickup_date: input.preferred_pickup_date || null,
        pickup_time_slot: input.pickup_time_slot || '09:00 AM - 01:00 PM',
        additional_notes: input.additional_notes || null,
      };

      const { data, error } = await supabase
        .from('soil_test_orders')
        .insert(insertPayload as any)
        .select()
        .single();

      if (error) throw error;

      const order = data as unknown as SoilTestOrder;

      // Create initial audit history record
      await supabase.from('soil_test_status_history').insert({
        soil_test_order_id: order.id,
        previous_status: null,
        new_status: initialStatus,
        changed_by: userId,
        changed_by_name: input.farmer_name,
        note: input.pickup_required
          ? 'Test booked with doorstep pickup request'
          : 'Test booked for direct sample submission at laboratory',
      } as any);

      // Trigger notification
      await sendSoilTestNotification(order, initialStatus);

      return { data: order, error: null };
    } catch (err: any) {
      console.error('[SoilTestingService] createSoilTestOrder error:', err);
      return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  /**
   * Fetch all orders for current logged-in farmer
   */
  async getFarmerOrders(userId: string): Promise<{ data: SoilTestOrder[]; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('soil_test_orders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data: (data || []) as unknown as SoilTestOrder[], error: null };
    } catch (err: any) {
      console.error('[SoilTestingService] getFarmerOrders error:', err);
      return { data: [], error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  /**
   * Fetch single order by ID or order_number + its status history
   */
  async getOrderDetails(
    orderIdOrNumber: string
  ): Promise<{
    order: SoilTestOrder | null;
    history: SoilTestStatusHistory[];
    error: Error | null;
  }> {
    try {
      // Check if parameter is UUID or order_number
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        orderIdOrNumber
      );

      const query = supabase.from('soil_test_orders').select('*');
      const { data: orderData, error: orderError } = isUuid
        ? await query.eq('id', orderIdOrNumber).maybeSingle()
        : await query.eq('order_number', orderIdOrNumber).maybeSingle();

      if (orderError) throw orderError;
      if (!orderData) return { order: null, history: [], error: new Error('Order not found') };

      const order = orderData as unknown as SoilTestOrder;

      // Fetch audit history
      const { data: historyData, error: historyError } = await supabase
        .from('soil_test_status_history')
        .select('*')
        .eq('soil_test_order_id', order.id)
        .order('created_at', { ascending: true });

      if (historyError) {
        console.warn('[SoilTestingService] getHistory warning:', historyError.message);
      }

      return {
        order,
        history: (historyData || []) as unknown as SoilTestStatusHistory[],
        error: null,
      };
    } catch (err: any) {
      console.error('[SoilTestingService] getOrderDetails error:', err);
      return { order: null, history: [], error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  /**
   * Fetch orders assigned to a pickup agent
   */
  async getAssignedAgentOrders(
    agentId: string
  ): Promise<{ data: SoilTestOrder[]; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('soil_test_orders')
        .select('*')
        .eq('assigned_agent_id', agentId)
        .order('confirmed_pickup_date', { ascending: true, nullsFirst: false });

      if (error) throw error;
      return { data: (data || []) as unknown as SoilTestOrder[], error: null };
    } catch (err: any) {
      console.error('[SoilTestingService] getAssignedAgentOrders error:', err);
      return { data: [], error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  /**
   * Fetch all orders for Admin console with filters & real KPIs
   */
  async getAdminSoilOrders(options?: {
    status?: string;
    testType?: string;
    search?: string;
  }): Promise<{ data: SoilTestOrder[]; kpis: SoilTestingKPIs; error: Error | null }> {
    try {
      let query = supabase.from('soil_test_orders').select('*').order('created_at', { ascending: false });

      if (options?.status && options.status !== 'all') {
        query = query.eq('order_status', options.status);
      }
      if (options?.testType && options.testType !== 'all') {
        query = query.eq('test_type', options.testType);
      }

      const { data, error } = await query;
      if (error) throw error;

      let list = (data || []) as unknown as SoilTestOrder[];

      if (options?.search && options.search.trim()) {
        const q = options.search.trim().toLowerCase();
        list = list.filter(
          (o) =>
            o.order_number.toLowerCase().includes(q) ||
            o.farmer_name.toLowerCase().includes(q) ||
            o.mobile.includes(q) ||
            o.district.toLowerCase().includes(q) ||
            (o.village && o.village.toLowerCase().includes(q))
        );
      }

      // Compute real KPIs from raw dataset
      const allOrders = (data || []) as unknown as SoilTestOrder[];
      const kpis: SoilTestingKPIs = {
        totalRequests: allOrders.length,
        pendingPickup: allOrders.filter((o) => o.order_status === 'agent_pending').length,
        scheduledPickups: allOrders.filter((o) => o.order_status === 'pickup_scheduled').length,
        samplesCollected: allOrders.filter((o) => o.order_status === 'sample_collected').length,
        samplesAtLab: allOrders.filter((o) => o.order_status === 'sample_received').length,
        testingInProgress: allOrders.filter((o) => o.order_status === 'testing_in_progress').length,
        reportsReady: allOrders.filter(
          (o) => o.order_status === 'report_ready' || o.order_status === 'report_delivered'
        ).length,
        completedTests: allOrders.filter((o) => o.order_status === 'report_delivered').length,
        failedOrCancelled: allOrders.filter((o) => o.order_status === 'cancelled').length,
        totalRevenue: allOrders
          .filter((o) => o.payment_status === 'paid')
          .reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0),
      };

      return { data: list, kpis, error: null };
    } catch (err: any) {
      console.error('[SoilTestingService] getAdminSoilOrders error:', err);
      return {
        data: [],
        kpis: {
          totalRequests: 0,
          pendingPickup: 0,
          scheduledPickups: 0,
          samplesCollected: 0,
          samplesAtLab: 0,
          testingInProgress: 0,
          reportsReady: 0,
          completedTests: 0,
          failedOrCancelled: 0,
          totalRevenue: 0,
        },
        error: err instanceof Error ? err : new Error(String(err)),
      };
    }
  },

  /**
   * Admin assigns a pickup agent and schedules confirmed date
   */
  async assignAgentAndSchedulePickup(
    orderId: string,
    agent: { id: string; name: string; phone?: string },
    confirmedDate: string,
    timeSlot: string,
    adminUserId: string,
    adminName: string,
    internalNotes?: string
  ): Promise<{ success: boolean; error: Error | null }> {
    try {
      const { data: currentOrder, error: fetchErr } = await supabase
        .from('soil_test_orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (fetchErr || !currentOrder) throw new Error('Order not found');

      const prevStatus = currentOrder.order_status as SoilOrderStatus;
      const newStatus: SoilOrderStatus = 'pickup_scheduled';

      const updatePayload: any = {
        assigned_agent_id: agent.id,
        assigned_agent_name: agent.name,
        assigned_agent_phone: agent.phone || null,
        confirmed_pickup_date: confirmedDate,
        pickup_time_slot: timeSlot,
        order_status: newStatus,
        updated_at: new Date().toISOString(),
      };
      if (internalNotes) {
        updatePayload.internal_notes = internalNotes;
      }

      const { data: updated, error: updateErr } = await supabase
        .from('soil_test_orders')
        .update(updatePayload)
        .eq('id', orderId)
        .select()
        .single();

      if (updateErr) throw updateErr;

      // Record audit history
      await supabase.from('soil_test_status_history').insert({
        soil_test_order_id: orderId,
        previous_status: prevStatus,
        new_status: newStatus,
        changed_by: adminUserId,
        changed_by_name: adminName,
        note: `Pickup scheduled for ${confirmedDate} (${timeSlot}). Assigned to agent: ${agent.name}.`,
      } as any);

      // Trigger notification & email
      await sendSoilTestNotification(
        updated as unknown as SoilTestOrder,
        newStatus,
        `Agent: ${agent.name}`
      );

      return { success: true, error: null };
    } catch (err: any) {
      console.error('[SoilTestingService] assignAgent error:', err);
      return { success: false, error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  /**
   * Update order status with audit logging
   */
  async updateOrderStatus(
    orderId: string,
    newStatus: SoilOrderStatus,
    changedById: string,
    changedByName: string,
    note?: string
  ): Promise<{ success: boolean; error: Error | null }> {
    try {
      const { data: currentOrder, error: fetchErr } = await supabase
        .from('soil_test_orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (fetchErr || !currentOrder) throw new Error('Order not found');

      const prevStatus = currentOrder.order_status as SoilOrderStatus;
      const now = new Date().toISOString();

      const updatePayload: any = {
        order_status: newStatus,
        updated_at: now,
      };

      if (newStatus === 'sample_collected' && !currentOrder.sample_collected_at) {
        updatePayload.sample_collected_at = now;
      }
      if (newStatus === 'sample_received' && !currentOrder.sample_received_at) {
        updatePayload.sample_received_at = now;
      }
      if (newStatus === 'testing_in_progress' && !currentOrder.lab_started_at) {
        updatePayload.lab_started_at = now;
      }
      if (newStatus === 'report_ready' && !currentOrder.report_generated_at) {
        updatePayload.report_generated_at = now;
      }

      const { data: updated, error: updateErr } = await supabase
        .from('soil_test_orders')
        .update(updatePayload)
        .eq('id', orderId)
        .select()
        .single();

      if (updateErr) throw updateErr;

      // Insert audit history
      await supabase.from('soil_test_status_history').insert({
        soil_test_order_id: orderId,
        previous_status: prevStatus,
        new_status: newStatus,
        changed_by: changedById,
        changed_by_name: changedByName,
        note: note || `Status updated from ${prevStatus} to ${newStatus}`,
      } as any);

      // Trigger notification
      await sendSoilTestNotification(updated as unknown as SoilTestOrder, newStatus, note);

      return { success: true, error: null };
    } catch (err: any) {
      console.error('[SoilTestingService] updateOrderStatus error:', err);
      return { success: false, error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  /**
   * Upload official lab PDF report to Supabase private storage and update order with structured metrics
   */
  async uploadLabReport(
    orderId: string,
    file: File,
    structuredResults: StructuredSoilReport | null,
    uploaderId: string,
    uploaderName: string,
    labName: string = 'AgriConnect Certified Central Laboratory'
  ): Promise<{ success: boolean; reportUrl?: string; error: Error | null }> {
    try {
      // Validate PDF
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        throw new Error('Only valid PDF reports are allowed.');
      }
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('File size exceeds 10MB limit.');
      }

      const filePath = `reports/${orderId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

      // Upload to private bucket 'soil-reports'
      const { error: uploadErr } = await supabase.storage
        .from('soil-reports')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: 'application/pdf',
        });

      if (uploadErr) throw uploadErr;

      // Get signed URL for 24 hours
      const { data: signedUrlData } = await supabase.storage
        .from('soil-reports')
        .createSignedUrl(filePath, 60 * 60 * 24);

      const now = new Date().toISOString();

      const updatePayload: any = {
        report_file_path: filePath,
        report_url: signedUrlData?.signedUrl || null,
        report_generated_at: now,
        lab_name: labName,
        order_status: 'report_ready',
        updated_at: now,
      };

      if (structuredResults) {
        updatePayload.structured_results = structuredResults;
      }

      const { data: updated, error: updateErr } = await supabase
        .from('soil_test_orders')
        .update(updatePayload)
        .eq('id', orderId)
        .select()
        .single();

      if (updateErr) throw updateErr;

      // Audit history
      await supabase.from('soil_test_status_history').insert({
        soil_test_order_id: orderId,
        previous_status: 'testing_in_progress',
        new_status: 'report_ready',
        changed_by: uploaderId,
        changed_by_name: uploaderName,
        note: `Official laboratory PDF report uploaded by ${uploaderName} (${labName}).`,
      } as any);

      // Notification
      await sendSoilTestNotification(
        updated as unknown as SoilTestOrder,
        'report_ready',
        'Your official Soil Health Report is ready for download.'
      );

      return { success: true, reportUrl: signedUrlData?.signedUrl, error: null };
    } catch (err: any) {
      console.error('[SoilTestingService] uploadLabReport error:', err);
      return { success: false, error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  /**
   * Get fresh signed URL for secure report viewing/downloading
   */
  async getReportSignedUrl(filePath: string): Promise<string | null> {
    try {
      if (!filePath) return null;
      const { data, error } = await supabase.storage
        .from('soil-reports')
        .createSignedUrl(filePath, 60 * 60 * 6); // 6 hours validity

      if (error) throw error;
      return data?.signedUrl || null;
    } catch (err) {
      console.error('[SoilTestingService] getReportSignedUrl error:', err);
      return null;
    }
  },
};
