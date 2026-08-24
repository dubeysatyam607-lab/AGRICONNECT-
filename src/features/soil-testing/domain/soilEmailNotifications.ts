import { notifyEvent } from '@/features/notifications/notify';
import { SoilTestOrder, SoilOrderStatus } from './soilTestingTypes';

/**
 * Dispatches localized in-app notifications and transactional emails for soil testing milestones.
 */
export async function sendSoilTestNotification(
  order: SoilTestOrder,
  newStatus: SoilOrderStatus,
  customNote?: string
) {
  try {
    let titleKey = 'soil.notif.submitted.title';
    let bodyKey = 'soil.notif.submitted.body';

    switch (newStatus) {
      case 'submitted':
        titleKey = 'soil.notif.submitted.title';
        bodyKey = 'soil.notif.submitted.body';
        break;
      case 'payment_confirmed':
      case 'agent_pending':
        titleKey = 'soil.notif.paid.title';
        bodyKey = 'soil.notif.paid.body';
        break;
      case 'pickup_scheduled':
        titleKey = 'soil.notif.scheduled.title';
        bodyKey = 'soil.notif.scheduled.body';
        break;
      case 'sample_collected':
        titleKey = 'soil.notif.collected.title';
        bodyKey = 'soil.notif.collected.body';
        break;
      case 'sample_received':
        titleKey = 'soil.notif.received.title';
        bodyKey = 'soil.notif.received.body';
        break;
      case 'testing_in_progress':
        titleKey = 'soil.notif.testing.title';
        bodyKey = 'soil.notif.testing.body';
        break;
      case 'report_ready':
      case 'report_delivered':
        titleKey = 'soil.notif.ready.title';
        bodyKey = 'soil.notif.ready.body';
        break;
      case 'cancelled':
        titleKey = 'soil.notif.cancelled.title';
        bodyKey = 'soil.notif.cancelled.body';
        break;
    }

    notifyEvent({
      category: 'order',
      severity: newStatus === 'report_ready' ? 'success' : newStatus === 'cancelled' ? 'critical' : 'info',
      titleKey,
      bodyKey,
      params: {
        orderId: order.order_number,
        date: order.confirmed_pickup_date || order.preferred_pickup_date || '',
        agent: order.assigned_agent_name || '',
        note: customNote || '',
      },
      tab: 'soil',
      dedupeKey: `soil-${order.id}-${newStatus}`,
    });
  } catch (err) {
    console.warn('[SoilNotifications] Notification failed gracefully:', err);
  }
}

/**
 * Builds clean transactional email markup for Soil Testing updates.
 */
export function buildSoilEmailContent(order: SoilTestOrder, status: SoilOrderStatus) {
  const brandName = 'AgriConnect — Mitti Jaanch';
  const orderNum = order.order_number;
  const farmerName = order.farmer_name;

  let headline = `Soil Test Update: ${orderNum}`;
  let message = `Your test request ${orderNum} has been received.`;

  if (status === 'pickup_scheduled') {
    headline = `Soil Sample Pickup Scheduled — ${orderNum}`;
    message = `Your soil sample pickup is scheduled for ${order.confirmed_pickup_date || 'the requested date'} (${order.pickup_time_slot || 'Morning slot'}). Pickup Agent: ${order.assigned_agent_name || 'AgriConnect Technician'} (${order.assigned_agent_phone || 'Support'}).`;
  } else if (status === 'sample_collected') {
    headline = `Soil Sample Collected — ${orderNum}`;
    message = `Your soil sample has been safely collected and is en route to our certified laboratory.`;
  } else if (status === 'sample_received' || status === 'testing_in_progress') {
    headline = `Sample Received at Laboratory — ${orderNum}`;
    message = `Your soil sample has reached the laboratory and chemical analysis is now in progress.`;
  } else if (status === 'report_ready') {
    headline = `Your AgriConnect Soil Health Report is Ready — ${orderNum}`;
    message = `Good news! The laboratory analysis for your soil sample is complete. Your certified Soil Health Card & AI Crop Recommendation Report are ready for download.`;
  }

  return {
    subject: headline,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0;">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="font-size: 20px; font-weight: bold; color: #16a34a;">🌱 ${brandName}</div>
          <div style="font-size: 13px; color: #64748b; margin-top: 4px;">Certified Agricultural Laboratory Testing</div>
        </div>
        <h2 style="color: #0f172a; font-size: 18px; margin-bottom: 12px;">Namaste ${farmerName},</h2>
        <p style="color: #334155; font-size: 15px; line-height: 1.6; margin-bottom: 20px;">${message}</p>
        <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin-bottom: 24px; border: 1px solid #e2e8f0;">
          <div style="font-size: 13px; color: #64748b; margin-bottom: 6px;">Order Summary</div>
          <div style="font-size: 14px; font-weight: 600; color: #0f172a;">Order Number: ${orderNum}</div>
          <div style="font-size: 14px; color: #334155;">Test Type: ${order.test_type.toUpperCase()} Test</div>
          <div style="font-size: 14px; color: #334155;">Farm Location: ${order.district}, ${order.state}</div>
          <div style="font-size: 14px; color: #334155;">Status: <strong>${status.replace(/_/g, ' ').toUpperCase()}</strong></div>
        </div>
        <div style="text-align: center; margin-top: 24px;">
          <a href="https://bharatkrishi.com/soil-test" style="background: #16a34a; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block;">View in AgriConnect App</a>
        </div>
        <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #f1f5f9; text-align: center; font-size: 12px; color: #94a3b8;">
          AgriConnect Lab Services · Toll-free Farmer Helpline: 1800-AGRI-HELP
        </div>
      </div>
    `,
  };
}
