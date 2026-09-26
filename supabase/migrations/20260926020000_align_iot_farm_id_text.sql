-- ── ALIGN IoT FARM_ID COLUMNS TO TEXT ────────────────────────────────────
-- The live schema was created (manually) with `iot_devices.farm_id` as uuid.
-- The app + firmware always use text farm labels (e.g. "farm_soyabeen"), so
-- registration failed with `invalid input syntax for type uuid`. This safely
-- converts any still-uuid farm_id column to text. Idempotent: runs only when
-- the column really is uuid.

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['iot_devices', 'sensor_readings', 'iot_alerts', 'iot_commands']
  LOOP
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns c
      JOIN pg_attribute a
        ON a.attrelid = to_regclass(format('public.%I', tbl))
       AND a.attname = c.column_name
       AND NOT a.attisdropped
      WHERE c.table_schema = 'public'
        AND c.table_name = tbl
        AND c.column_name = 'farm_id'
        AND a.atttypid = 'uuid'::regtype
    ) THEN
      EXECUTE format(
        'ALTER TABLE public.%I ALTER COLUMN farm_id TYPE text USING farm_id::text',
        tbl
      );
      RAISE NOTICE 'iot farm_id converted to text on %', tbl;
    END IF;
  END LOOP;
END $$;