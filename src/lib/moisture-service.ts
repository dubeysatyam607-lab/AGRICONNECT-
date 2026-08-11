// src/lib/moisture-service.ts

/**
 * Service for fetching moisture sensor data from Supabase.
 */

import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

export type MoistureReading = Database['public']['Tables']['moisture_readings']['Row'];

/** Fetch all moisture readings */
export const getMoistureReadings = async (): Promise<MoistureReading[]> => {
  const { data, error } = await supabase.from<MoistureReading>('moisture_readings').select('*');
  if (error) {
    console.error('Error fetching moisture readings:', error);
    return [];
  }
  return data ?? [];
};
