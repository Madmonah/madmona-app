-- 2026-07-22 — جدول استفسارات إعلانات الماركت (فيتشر «استفسار»)
-- اتطبّق live على البروجيكت mjhflxpxunwycbiquoig. الملف ده للتوثيق/إعادة الإنشاء.
CREATE TABLE IF NOT EXISTS public.listing_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  listing_title text,
  inquirer_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  inquirer_name text,
  owner_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  owner_phone text,
  room_id uuid REFERENCES public.chat_rooms(id) ON DELETE SET NULL,
  channel text,                              -- 'in_app' | 'whatsapp'
  status text NOT NULL DEFAULT 'open',
  notified_via text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.listing_inquiries ENABLE ROW LEVEL SECURITY; -- API يستخدم service-role
CREATE INDEX IF NOT EXISTS idx_listing_inquiries_listing ON public.listing_inquiries(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_inquiries_owner   ON public.listing_inquiries(owner_profile_id);
CREATE INDEX IF NOT EXISTS idx_listing_inquiries_open    ON public.listing_inquiries(status) WHERE status='open';
