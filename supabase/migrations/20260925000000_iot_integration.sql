-- ── IOT INTEGRATION DATA MODEL ─────────────────────────────────────────

-- 1. Create iot_devices table if not exists
CREATE TABLE IF NOT EXISTS public.iot_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  farm_id text NOT NULL DEFAULT 'default_farm',
  device_name text NOT NULL DEFAULT 'AgriConnect ESP32 Node',
  device_type text NOT NULL DEFAULT 'ESP32_FARM_NODE',
  device_uid text NOT NULL UNIQUE,
  device_token_hash text,
  status text NOT NULL DEFAULT 'NOT_CONNECTED' CHECK (status IN ('ONLINE', 'OFFLINE', 'NOT_CONNECTED')),
  capabilities jsonb NOT NULL DEFAULT '{"soilMoisture": true, "temperature": true, "humidity": true, "rain": true, "laserFence": false, "buzzer": false}'::jsonb,
  last_seen timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure device_token_hash exists on existing tables
ALTER TABLE public.iot_devices ADD COLUMN IF NOT EXISTS device_token_hash text;

-- 2. Create sensor_readings table if not exists
CREATE TABLE IF NOT EXISTS public.sensor_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid REFERENCES public.iot_devices(id) ON DELETE CASCADE,
  farm_id text NOT NULL,
  soil_moisture numeric,
  temperature numeric CHECK (temperature IS NULL OR (temperature >= -50 AND temperature <= 100)),
  humidity numeric CHECK (humidity IS NULL OR (humidity >= 0 AND humidity <= 100)),
  rain_value numeric CHECK (rain_value IS NULL OR rain_value >= 0),
  fence_status text DEFAULT 'NOT_CONNECTED',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Create iot_alerts table if not exists
CREATE TABLE IF NOT EXISTS public.iot_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id text NOT NULL,
  device_id uuid REFERENCES public.iot_devices(id) ON DELETE CASCADE,
  alert_type text NOT NULL CHECK (alert_type IN ('LOW_SOIL_MOISTURE', 'HEAVY_RAIN', 'DEVICE_OFFLINE', 'SENSOR_ERROR', 'FENCE_INTRUSION')),
  severity text NOT NULL DEFAULT 'WARNING' CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL')),
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on all three tables
ALTER TABLE public.iot_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sensor_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.iot_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for iot_devices
DO $$ BEGIN
  CREATE POLICY "Users can view their own IoT devices" ON public.iot_devices
    FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert their own IoT devices" ON public.iot_devices
    FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update their own IoT devices" ON public.iot_devices
    FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete their own IoT devices" ON public.iot_devices
    FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- RLS Policies for sensor_readings
DO $$ BEGIN
  CREATE POLICY "Users can view sensor readings for their devices" ON public.sensor_readings
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM public.iot_devices
        WHERE public.iot_devices.id = public.sensor_readings.device_id
        AND (public.iot_devices.user_id = auth.uid() OR public.iot_devices.user_id IS NULL)
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Allow device telemetry insertion" ON public.sensor_readings
    FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- RLS Policies for iot_alerts
DO $$ BEGIN
  CREATE POLICY "Users can view IoT alerts" ON public.iot_alerts
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM public.iot_devices
        WHERE public.iot_devices.id = public.iot_alerts.device_id
        AND (public.iot_devices.user_id = auth.uid() OR public.iot_devices.user_id IS NULL)
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update IoT alerts" ON public.iot_alerts
    FOR UPDATE USING (
      EXISTS (
        SELECT 1 FROM public.iot_devices
        WHERE public.iot_devices.id = public.iot_alerts.device_id
        AND (public.iot_devices.user_id = auth.uid() OR public.iot_devices.user_id IS NULL)
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Allow server alert insertion" ON public.iot_alerts
    FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Indexes for rapid queries
CREATE INDEX IF NOT EXISTS idx_iot_devices_uid ON public.iot_devices (device_uid);
CREATE INDEX IF NOT EXISTS idx_iot_devices_user ON public.iot_devices (user_id);
CREATE INDEX IF NOT EXISTS idx_iot_devices_farm ON public.iot_devices (farm_id);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_device_time ON public.sensor_readings (device_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_farm_time ON public.sensor_readings (farm_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_iot_alerts_farm_time ON public.iot_alerts (farm_id, created_at DESC);

-- Enable Supabase Realtime publication for IoT tables
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.iot_devices, public.sensor_readings, public.iot_alerts;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
