-- App language preference persisted per user so the selected language
-- survives across devices and sessions (not just localStorage).
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS app_language TEXT NOT NULL DEFAULT 'en';
