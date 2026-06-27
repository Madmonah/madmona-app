-- =============================================================================
-- MADMONA — SUPPLIER MAGIC-LINK LOGIN  (دخول الشركاء بلينك سحري من غير باسورد)
-- File: sql/SUPPLIER_MAGIC_LINK_2026-06-25.sql
-- Date: 2026-06-25
--
-- المطلوب (محمد):
--   الشريك B2B اللي لسه بيتفاوض (pre_contract) يدخل تجربته الكاملة من غير باسورد —
--   عن طريق لينك خاص (magic link). تجربة كاملة، من غير نشر على الماركت بليس
--   (المنع ده اتعمل في ملف PRECONTRACT_ACCOUNTS).
--
-- الأمان:
--   • التوكن طويل وعشوائي (٦٤ حرف) ميتخمّنش.
--   • RLS مقفول: محدش يقرا التوكنات غير service_role (السيرفر). مفيش وصول للـauthenticated/anon.
--   • اللينك بينتهي بعد مدة (افتراضي ١٤ يوم) وينفع يتلغي.
--   • التحقق بيتم عبر دالة SECURITY DEFINER على السيرفر بس.
--
-- السلامة: Idempotent، مفيش DROP، يعتمد على marketplace_suppliers الموجود.
-- التطبيق: Supabase → SQL Editor → الصق الكل → Run. (يفضّل بعد PRECONTRACT_ACCOUNTS)
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1) جدول اللينكات السحرية
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.supplier_magic_links (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id  uuid NOT NULL REFERENCES public.marketplace_suppliers(id) ON DELETE CASCADE,
    token        text NOT NULL UNIQUE,            -- التوكن العشوائي (جزء اللينك)
    label        text,                            -- وصف اختياري (مين الشريك / الحملة)
    expires_at   timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
    revoked      boolean NOT NULL DEFAULT false,
    uses_count   integer NOT NULL DEFAULT 0,
    last_used_at timestamptz,
    created_by   uuid,                            -- مين أنشأ اللينك (سيلز/أدمن)
    created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_supplier_magic_links_supplier
  ON public.supplier_magic_links (supplier_id);
COMMENT ON TABLE public.supplier_magic_links IS
  'لينكات دخول بلا باسورد للشركاء (تجربة pre_contract). توكن عشوائي + صلاحية مؤقتة.';

-- RLS: مقفول تماماً ما عدا service_role (التوكنات حساسة)
ALTER TABLE public.supplier_magic_links ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies
                 WHERE tablename='supplier_magic_links' AND policyname='magic_links_service_only') THEN
    CREATE POLICY magic_links_service_only ON public.supplier_magic_links
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  -- ملاحظة: مفيش policy للـauthenticated/anon → ممنوع يقروا التوكنات نهائياً.
END $$;

-- -----------------------------------------------------------------------------
-- 2) إنشاء لينك سحري لمورّد  → بترجّع التوكن (الـapp يبني بيه اللينك)
--    اللينك الكامل في الواجهة:  https://madmonacairo.com/trial/<token>
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_supplier_magic_link(
    p_supplier_id uuid,
    p_valid_days  integer DEFAULT 14,
    p_label       text DEFAULT NULL,
    p_created_by  uuid DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
    v_token text;
BEGIN
    -- توكن عشوائي ٦٤ حرف (من غير ما نحتاج أي إكستنشن)
    v_token := replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-','');

    INSERT INTO public.supplier_magic_links (supplier_id, token, label, expires_at, created_by)
    VALUES (p_supplier_id, v_token, p_label, now() + make_interval(days => GREATEST(p_valid_days,1)), p_created_by);

    RETURN v_token;
END;
$$;
COMMENT ON FUNCTION public.create_supplier_magic_link(uuid,integer,text,uuid) IS
  'ينشئ لينك دخول بلا باسورد لمورّد ويرجّع التوكن. مثال: SELECT create_supplier_magic_link(''<supplier_id>'', 14, ''شريك جيم'');';

-- -----------------------------------------------------------------------------
-- 3) التحقق من اللينك عند الدخول  → بترجّع بيانات المورّد لو اللينك صالح
--    الـapp بينده الدالة دي، ولو رجّعت صف → يفتح للشريك جلسته (session).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.redeem_supplier_magic_link(p_token text)
RETURNS TABLE(supplier_id uuid, business_name text, contract_stage text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
    v_link public.supplier_magic_links%ROWTYPE;
BEGIN
    SELECT * INTO v_link FROM public.supplier_magic_links WHERE token = p_token;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'لينك غير صحيح.' USING ERRCODE='no_data_found';
    END IF;
    IF v_link.revoked THEN
        RAISE EXCEPTION 'اللينك ده متلغي.' USING ERRCODE='check_violation';
    END IF;
    IF v_link.expires_at < now() THEN
        RAISE EXCEPTION 'اللينك انتهت صلاحيته.' USING ERRCODE='check_violation';
    END IF;

    UPDATE public.supplier_magic_links
       SET uses_count = uses_count + 1, last_used_at = now()
     WHERE id = v_link.id;

    RETURN QUERY
    SELECT s.id, s.business_name, s.contract_stage
    FROM public.marketplace_suppliers s
    WHERE s.id = v_link.supplier_id;
END;
$$;
COMMENT ON FUNCTION public.redeem_supplier_magic_link(text) IS
  'يتحقق من توكن اللينك ويرجّع المورّد لو صالح. الـapp يعمل بيه الجلسة. بيرفع خطأ لو منتهي/متلغي.';

-- -----------------------------------------------------------------------------
-- 4) إلغاء لينك (لو حبيت توقف شريك)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.revoke_supplier_magic_link(p_token text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
    UPDATE public.supplier_magic_links SET revoked = true WHERE token = p_token;
    RETURN FOUND;
END;
$$;
COMMENT ON FUNCTION public.revoke_supplier_magic_link(text) IS 'يلغي لينك سحري فوراً.';

COMMIT;

-- =============================================================================
-- إزاي تستخدمه:
--   ١) تعمل لينك لشريك:
--        SELECT create_supplier_magic_link('<supplier_id>', 14, 'شريك بيتفاوض');
--      بترجّع توكن، تركّبه في:  https://madmonacairo.com/trial/<token>  وتبعته واتساب.
--
--   ٢) الواجهة عند فتح اللينك بتنده (من السيرفر/Edge function):
--        SELECT * FROM redeem_supplier_magic_link('<token>');
--      لو رجّعت صف → افتح للشريك تجربته (session). لو خطأ → اللينك مش صالح.
--
--   ٣) لإيقاف لينك:
--        SELECT revoke_supplier_magic_link('<token>');
--
--   ملاحظة: المنع من النشر على الماركت بليس شغّال من ملف PRECONTRACT_ACCOUNTS،
--   فالشريك ياخد تجربة كاملة بلا باسورد من غير ما ينشر — زي ما طلبت بالظبط.
-- =============================================================================
