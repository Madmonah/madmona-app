-- Migration: 2026-05-agent-infrastructure.sql
-- Purpose: Extend outreach_log for multi-channel agent outputs + add agent_runs tracking
-- Safe to run multiple times (idempotent)

-- ============================================================================
-- 1. Extend outreach_log to support email/multi-channel agents
-- ============================================================================

-- Make `phone` nullable (email outreach won't have a phone)
ALTER TABLE public.outreach_log
  ALTER COLUMN phone DROP NOT NULL;

-- Add channel column (email/whatsapp/sms)
ALTER TABLE public.outreach_log
  ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'whatsapp';

-- Add agent identifier
ALTER TABLE public.outreach_log
  ADD COLUMN IF NOT EXISTS agent_name text;

-- Add subject (for emails)
ALTER TABLE public.outreach_log
  ADD COLUMN IF NOT EXISTS subject text;

-- Add body (HTML for emails) — message_text becomes the plaintext fallback
ALTER TABLE public.outreach_log
  ADD COLUMN IF NOT EXISTS body text;

-- Make `message_text` nullable since some channels use `body` (HTML) instead
ALTER TABLE public.outreach_log
  ALTER COLUMN message_text DROP NOT NULL;

-- External provider id (Resend message id, Twilio sid, etc.)
ALTER TABLE public.outreach_log
  ADD COLUMN IF NOT EXISTS external_id text;

-- Free-form structured metadata
ALTER TABLE public.outreach_log
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Indexes for agent-specific queries
CREATE INDEX IF NOT EXISTS idx_outreach_log_agent_name
  ON public.outreach_log (agent_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_outreach_log_target
  ON public.outreach_log (target_type, target_id);

-- ============================================================================
-- 2. agent_runs: log every cron/webhook execution for observability
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.agent_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name text NOT NULL,
  trigger_type text NOT NULL,                  -- 'webhook' | 'cron' | 'manual'
  status text NOT NULL DEFAULT 'started',      -- 'started' | 'success' | 'error'
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  finished_at timestamp with time zone,
  duration_ms integer,
  input_payload jsonb,
  output_summary jsonb,
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_runs_name_started
  ON public.agent_runs (agent_name, started_at DESC);

ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agent_runs_service_role_only" ON public.agent_runs;
CREATE POLICY "agent_runs_service_role_only"
  ON public.agent_runs
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- 3. Webhook trigger function: notify Vercel API on new supplier signup
-- ============================================================================

-- Note: requires `pg_net` extension (enabled by default in Supabase)

CREATE OR REPLACE FUNCTION public.notify_signup_concierge()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  webhook_url text;
  webhook_secret text;
  payload jsonb;
BEGIN
  SELECT value INTO webhook_url
    FROM public.site_settings
    WHERE key = 'agent_webhook_url_signup_concierge';

  SELECT value INTO webhook_secret
    FROM public.site_settings
    WHERE key = 'agent_webhook_secret';

  IF webhook_url IS NULL OR webhook_secret IS NULL OR webhook_secret = 'CHANGE_ME_AFTER_DEPLOY' THEN
    RETURN NEW;
  END IF;

  payload := jsonb_build_object(
    'type', 'INSERT',
    'table', 'marketplace_suppliers',
    'schema', 'public',
    'record', to_jsonb(NEW),
    'old_record', NULL
  );

  PERFORM net.http_post(
    url := webhook_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || webhook_secret
    ),
    body := payload,
    timeout_milliseconds := 5000
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Sign-up concierge webhook failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_signup_concierge ON public.marketplace_suppliers;

CREATE TRIGGER trg_notify_signup_concierge
  AFTER INSERT ON public.marketplace_suppliers
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_signup_concierge();

-- ============================================================================
-- 4. Seed site_settings keys (values to be filled in manually after deploy)
-- ============================================================================

INSERT INTO public.site_settings (key, value)
VALUES
  ('agent_webhook_url_signup_concierge',
   'https://madmonacairo.com/api/agents/signup-concierge'),
  ('agent_webhook_secret',
   'CHANGE_ME_AFTER_DEPLOY')
ON CONFLICT (key) DO NOTHING;
