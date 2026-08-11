// src/lib/tractor-service.ts

/** Service utilities for fetching tractor data from Supabase. */

import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

// Adjust type according to your Supabase schema
export type Tractor = Database['public']['Tables']['tractors']['Row'];

/** Fetch all tractors */
export const getTractors = async (): Promise<Tractor[]> => {
  const { data, error } = await supabase.from<Tractor>('tractors').select('*');
  if (error) {
    console.error('Error fetching tractors:', error);
    return [];
  }
  return data ?? [];
};

/** Fetch a single tractor by ID */
export const getTractorById = async (id: string): Promise<Tractor | null> => {
  const { data, error } = await supabase
    .from<Tractor>('tractors')
    .select('*')
    .eq('id', id)
    .single();
  if (error) {
    console.error(`Error fetching tractor ${id}:`, error);
    return null;
  }
  return data ?? null;
};
