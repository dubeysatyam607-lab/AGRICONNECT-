-- Create audit_logs table for tracking sensitive operations
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id TEXT,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Users can only view their own audit logs
CREATE POLICY "Users can view their own audit logs"
ON public.audit_logs
FOR SELECT
USING (auth.uid() = user_id);

-- Users can write their own audit entries (insert-only; rows are immutable).
DROP POLICY IF EXISTS "Users can insert their own audit logs" ON public.audit_logs;
CREATE POLICY "Users can insert their own audit logs"
ON public.audit_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- Create rate_limits table for tracking API usage
CREATE TABLE public.rate_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  identifier TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique index for rate limiting lookups
CREATE UNIQUE INDEX idx_rate_limits_identifier_endpoint ON public.rate_limits(identifier, endpoint);

-- Enable RLS (service role only for rate limits)
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- No policies - only service role can access rate_limits table