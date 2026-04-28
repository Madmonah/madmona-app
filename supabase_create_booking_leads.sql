-- ================================================
-- مضمونة (Madmona) - Booking Leads Table
-- ================================================
-- Stores customer inquiries from the /book form.
-- Captures leads BEFORE they hit WhatsApp, so even if
-- the customer abandons the WhatsApp redirect, we still
-- have their name + phone + preferred date to follow up.
-- ================================================

CREATE TABLE IF NOT EXISTS public.booking_leads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name   TEXT NOT NULL,
  customer_phone  TEXT NOT NULL,
  space_slug      TEXT NOT NULL,                -- e.g. 'indoor-coworking'
  pricing_label   TEXT,                         -- e.g. 'بالساعة' (free-form, comes from DB)
  preferred_date  DATE,
  notes           TEXT,
  status          TEXT NOT NULL DEFAULT 'new',  -- new | contacted | confirmed | cancelled
  source          TEXT DEFAULT 'website',       -- website | whatsapp | phone | walk-in
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for the columns Mohamed will filter/sort by most often
CREATE INDEX IF NOT EXISTS idx_booking_leads_status      ON public.booking_leads(status);
CREATE INDEX IF NOT EXISTS idx_booking_leads_created_at  ON public.booking_leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_booking_leads_space_slug  ON public.booking_leads(space_slug);

-- Auto-update updated_at on row modification
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_booking_leads_updated_at ON public.booking_leads;
CREATE TRIGGER trg_booking_leads_updated_at
BEFORE UPDATE ON public.booking_leads
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ================================================
-- Row Level Security
-- ================================================
ALTER TABLE public.booking_leads ENABLE ROW LEVEL SECURITY;

-- Public can INSERT new leads (form submission from anyone)
DROP POLICY IF EXISTS "Anyone can submit a booking lead" ON public.booking_leads;
CREATE POLICY "Anyone can submit a booking lead"
  ON public.booking_leads
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only authenticated admins (you, via service_role) can SELECT/UPDATE/DELETE
-- Note: service_role bypasses RLS automatically, so this is just defense-in-depth
DROP POLICY IF EXISTS "Only authenticated can read leads" ON public.booking_leads;
CREATE POLICY "Only authenticated can read leads"
  ON public.booking_leads
  FOR SELECT
  TO authenticated
  USING (true);

-- Verification query
SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'booking_leads'
ORDER BY ordinal_position;
