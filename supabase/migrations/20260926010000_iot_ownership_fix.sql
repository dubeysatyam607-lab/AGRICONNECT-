-- ── IOT OWNERSHIP & SECURITY HARDENING ────────────────────────────────────
-- Fixes two data-ownership flaws from the earlier iot_integration migration:
--   1. iot_devices with `user_id IS NULL` were visible to EVERY authenticated
--      user (SELECT policy had `user_id IS NULL` in the USING clause).
--   2. Devices were registered without a user, using a crop-derived `farm_id`
--      shared by everyone growing the same crop.
--
-- New model: a device is only ever readable/mutable by its owner. Registration
-- MUST set user_id = auth.uid(). Public (non-owner) inserts into
-- sensor_readings / iot_alerts are removed — telemetry is written by the
-- server with the service role, which bypasses RLS, so nothing breaks.

ALTER TABLE public.iot_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sensor_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.iot_alerts ENABLE ROW LEVEL SECURITY;

-- 1. iot_devices — owner-only access
DROP POLICY IF EXISTS "Users can view their own IoT devices" ON public.iot_devices;
DROP POLICY IF EXISTS "Users can insert their own IoT devices" ON public.iot_devices;
DROP POLICY IF EXISTS "Users can update their own IoT devices" ON public.iot_devices;
DROP POLICY IF EXISTS "Users can delete their own IoT devices" ON public.iot_devices;

CREATE POLICY "Device owners can view their IoT devices" ON public.iot_devices
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can register their own IoT devices" ON public.iot_devices
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Device owners can update their IoT devices" ON public.iot_devices
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Device owners can delete their IoT devices" ON public.iot_devices
  FOR DELETE USING (auth.uid() = user_id);

-- 2. sensor_readings — owner-only read, no anonymous insert
DROP POLICY IF EXISTS "Users can view sensor readings for their devices" ON public.sensor_readings;
DROP POLICY IF EXISTS "Allow device telemetry insertion" ON public.sensor_readings;

CREATE POLICY "Device owners can view sensor readings" ON public.sensor_readings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.iot_devices
      WHERE public.iot_devices.id = public.sensor_readings.device_id
      AND public.iot_devices.user_id = auth.uid()
    )
  );

-- Telemetry rows are inserted by the server (service role, RLS bypassed).
-- No public INSERT policy exists for sensor_readings.

-- 3. iot_alerts — owner-only read/update, no anonymous insert
DROP POLICY IF EXISTS "Users can view IoT alerts" ON public.iot_alerts;
DROP POLICY IF EXISTS "Users can update IoT alerts" ON public.iot_alerts;
DROP POLICY IF EXISTS "Allow server alert insertion" ON public.iot_alerts;

CREATE POLICY "Device owners can view IoT alerts" ON public.iot_alerts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.iot_devices
      WHERE public.iot_devices.id = public.iot_alerts.device_id
      AND public.iot_devices.user_id = auth.uid()
    )
  );

CREATE POLICY "Device owners can update IoT alerts" ON public.iot_alerts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.iot_devices
      WHERE public.iot_devices.id = public.iot_alerts.device_id
      AND public.iot_devices.user_id = auth.uid()
    )
  );

-- 4. Server-only helper functions for IoT inserts (callable via REST with the
--    service role, which already bypasses RLS). Provided for completeness so
--    storage rules can stay locked down.

-- 5. iot_commands — owner-only read is already defined in the iot_commands
--    migration; written only via service role.