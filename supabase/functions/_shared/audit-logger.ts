import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface AuditLogEntry {
  userId: string;
  action: string;
  tableName: string;
  recordId?: string;
  oldData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { error } = await supabase
      .from('audit_logs')
      .insert({
        user_id: entry.userId,
        action: entry.action,
        table_name: entry.tableName,
        record_id: entry.recordId,
        old_data: entry.oldData,
        new_data: entry.newData,
        ip_address: entry.ipAddress,
        user_agent: entry.userAgent,
      });

    if (error) {
      console.error('Failed to log audit event:', error);
    } else {
      console.log(`Audit log: ${entry.action} on ${entry.tableName} by ${entry.userId}`);
    }
  } catch (error) {
    console.error('Audit logger error:', error);
  }
}

export function getClientInfo(req: Request): { ipAddress: string; userAgent: string } {
  const forwarded = req.headers.get('x-forwarded-for');
  const ipAddress = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';
  
  return { ipAddress, userAgent };
}
