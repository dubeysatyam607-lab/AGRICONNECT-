-- Add extended_profile JSON column to store all profile fields that
-- don't have dedicated columns yet (farm specs, crops, livestock, etc.).
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS extended_profile text;

COMMENT ON COLUMN profiles.extended_profile IS 'JSON blob storing extended farmer profile fields (farm specs, crops, livestock, GPS, language, etc.)';
