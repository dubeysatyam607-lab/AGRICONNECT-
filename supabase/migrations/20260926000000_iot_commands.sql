-- ── IOT COMMAND QUEUE (command delivery + hardware acknowledgment) ────────
-- The ESP32 node polls queued commands and POSTs an ack. Nothing is ever
-- reported as "delivered" until the hardware confirms execution.

CREATE TABLE IF NOT EXISTS public.iot_commands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid NOT NULL REFERENCES public.iot_devices(id) ON DELETE CASCADE,
  farm_id text NOT NULL,
  command text NOT NULL CHECK (command IN ('BUZZER_ON', 'BUZZER_OFF', 'ARM_FENCE', 'DISARM_FENCE', 'PUMP_ON', 'PUMP_OFF')),
  state text NOT NULL DEFAULT 'QUEUED' CHECK (state IN ('QUEUED', 'EXECUTED', 'FAILED', 'EXPIRED')),
  error text,
  issued_at timestamptz NOT NULL DEFAULT now(),
  acked_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Queue indexes
CREATE INDEX IF NOT EXISTS idx_iot_commands_device_state ON public.iot_commands (device_id, state);
CREATE INDEX IF NOT EXISTS idx_iot_commands_device_time ON public.iot_commands (device_id, issued_at DESC);
CREATE INDEX IF NOT EXISTS idx_iot_commands_state ON public.iot_commands (state);

-- Document + include the pump capability in the device default for new rows
ALTER TABLE public.iot_devices
  ALTER COLUMN capabilities
  SET DEFAULT '{"soilMoisture": true, "temperature": true, "humidity": true, "rain": true, "laserFence": false, "buzzer": false, "pump": false}'::jsonb;

-- RLS: command history is only readable by the owner of the device.
ALTER TABLE public.iot_commands ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Device owners can view their commands" ON public.iot_commands
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM public.iot_devices
        WHERE public.iot_devices.id = public.iot_commands.device_id
        AND public.iot_devices.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Writes happen only through the server (service role bypasses RLS), so no
-- public INSERT/UPDATE policies exist on iot_commands.

-- Register iot_commands for Realtime so the app UI can live-update command state
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.iot_commands;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;