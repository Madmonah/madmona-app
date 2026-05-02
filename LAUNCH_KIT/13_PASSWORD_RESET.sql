-- ============================================================================
-- Madmona — Password Reset Infrastructure
--
-- Adds:
--   1. email column on profiles (recovery email)
--   2. password_reset_tokens table (token-based reset)
--
-- Run in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/mjhflxpxunwycbiquoig/sql/new
-- ============================================================================

-- 1. Add email column to profiles (if not exists)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Index for fast email lookup
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email) WHERE email IS NOT NULL;

-- 2. Create password_reset_tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  token TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for cleanup of expired tokens
CREATE INDEX IF NOT EXISTS idx_reset_tokens_expires ON password_reset_tokens(expires_at);

-- RLS — only service role can access (no user-level RLS needed)
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- 3. Cleanup function — removes expired or used tokens older than 7 days
CREATE OR REPLACE FUNCTION cleanup_expired_reset_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM password_reset_tokens
  WHERE expires_at < now()
     OR (used = true AND created_at < now() - interval '7 days');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Update Mohamed's profile with admin email (CHANGE THIS to your real email)
UPDATE profiles
SET email = 'admin@madmonacairo.com'
WHERE phone = '+201002229982';

-- ============================================================================
-- ✅ Verification
-- ============================================================================
SELECT
  full_name,
  phone,
  email,
  role
FROM profiles
ORDER BY created_at DESC;

SELECT COUNT(*) AS total_reset_tokens FROM password_reset_tokens;
