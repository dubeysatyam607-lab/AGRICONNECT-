import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { Json } from '@/integrations/supabase/types';

interface AuditLogEntry {
  action: string;
  tableName: string;
  recordId?: string;
  oldData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
}

export function useAuditLog() {
  const { user } = useAuth();

  const logEvent = useCallback(async (entry: AuditLogEntry) => {
    if (!user) {
      console.warn('Cannot log audit event: user not authenticated');
      return;
    }

    try {
      const { error } = await supabase
        .from('audit_logs')
        .insert([{
          user_id: user.id,
          action: entry.action,
          table_name: entry.tableName,
          record_id: entry.recordId,
          old_data: entry.oldData as Json,
          new_data: entry.newData as Json,
        }]);

      if (error) {
        console.error('Failed to log audit event:', error);
      }
    } catch (error) {
      console.error('Audit logger error:', error);
    }
  }, [user]);

  return { logEvent };
}
