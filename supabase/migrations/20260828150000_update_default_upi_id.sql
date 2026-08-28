-- ============================================================================
-- Migration: Update official UPI ID to 7067820256@airtel
-- ============================================================================

INSERT INTO public.payment_config (id, upi_id, payee_name, currency, pending_expiry_hours, is_active, updated_at)
VALUES ('default', '7067820256@airtel', 'SATYAM DUBEY', 'INR', 72, TRUE, now())
ON CONFLICT (id) DO UPDATE SET
  upi_id = '7067820256@airtel',
  payee_name = 'SATYAM DUBEY',
  updated_at = now();
