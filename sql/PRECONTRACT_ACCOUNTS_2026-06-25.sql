-- =============================================================================
-- MADMONA — PRE-CONTRACT SUPPLIER ACCOUNTS  (أكاونت "ما قبل التعاقد")
-- File: sql/PRECONTRACT_ACCOUNTS_2026-06-25.sql
-- Date: 2026-06-25
--
-- المطلوب (اتفاق محمد):
--   أي بيزنس يسجّل لوحده (self-serve) يبقى تلقائياً في مرحلة "ما قبل التعاقد"
--   (pre_contract)، وياخد تجربة ERP كاملة، بس:
--     • مفيش عمولة فعّالة
--     • ممنوع ينشر ليستنج (status='published') لحد ما يتعاقد
--   ولما يتعاقد → يتحوّل لـ contracted ويتفعّل النشر والعمولة.
--
-- ملاحظة مهمة: محور "التعاقد" منفصل تماماً عن kyc_status
--   (kyc_status = pending/approved/rejected/suspended → محور التحقق).
--   هنا بنضيف محور جديد: contract_stage.
--
-- السلامة:
--   • Idempotent (ADD COLUMN IF NOT EXISTS / CREATE IF NOT EXISTS / OR REPLACE / DO-guards).
--   • مفيش DROP. الأعمدة والجداول إضافية.
--   • Backfill آمن: الموردين الحاليين (approved أو عندهم ليستنج منشور) → contracted،
--     عشان منكسرش أي نشر قائم.
--   • التفعيل التلقائي للـERP بيشتغل بس لو ملف ERP_DEPARTMENT_MODEL اتطبّق (guarded).
--
-- التطبيق: Supabase → SQL Editor → الصق الكل → Run.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1) أعمدة دورة التعاقد على marketplace_suppliers
-- -----------------------------------------------------------------------------
ALTER TABLE public.marketplace_suppliers
    ADD COLUMN IF NOT EXISTS contract_stage   text NOT NULL DEFAULT 'pre_contract',
    ADD COLUMN IF NOT EXISTS trial_started_at timestamptz,
    ADD COLUMN IF NOT EXISTS contracted_at    timestamptz;

COMMENT ON COLUMN public.marketplace_suppliers.contract_stage IS
  'مرحلة التعاقد: prospect / pre_contract / contracted / churned. منفصلة عن kyc_status.';

-- قيد القيم المسموحة (يتضاف مرة واحدة)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname='marketplace_suppliers_contract_stage_chk'
  ) THEN
    ALTER TABLE public.marketplace_suppliers
      ADD CONSTRAINT marketplace_suppliers_contract_stage_chk
      CHECK (contract_stage IN ('prospect','pre_contract','contracted','churned'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_msuppliers_contract_stage
  ON public.marketplace_suppliers (contract_stage);

-- -----------------------------------------------------------------------------
-- 2) Backfill آمن — الموردين الحاليين الفعّالين يبقوا contracted
--    (approved أو عندهم ليستنج منشور بالفعل) عشان منكسرش نشر قائم.
-- -----------------------------------------------------------------------------
UPDATE public.marketplace_suppliers s
SET contract_stage = 'contracted',
    contracted_at  = COALESCE(s.contracted_at, s.created_at, now())
WHERE s.contract_stage <> 'contracted'
  AND (
        s.kyc_status = 'approved'
        OR s.id IN (SELECT DISTINCT supplier_id FROM public.listings WHERE status='published')
      );

-- اللي لسه pre_contract: علّم بداية التجربة
UPDATE public.marketplace_suppliers
SET trial_started_at = COALESCE(trial_started_at, created_at, now())
WHERE contract_stage = 'pre_contract';

-- -----------------------------------------------------------------------------
-- 3) جدول العقود (سجل التعاقد الرسمي)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.supplier_contracts (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id     uuid NOT NULL REFERENCES public.marketplace_suppliers(id) ON DELETE CASCADE,
    status          text NOT NULL DEFAULT 'active',     -- active / ended / cancelled
    commission_rate numeric(5,2),                        -- العمولة المتفق عليها (10/5 ...)
    account_type    text,                                -- individual / business
    document_url    text,                                -- صورة/PDF العقد لو موجود
    signed_by       uuid,                                -- مين وقّع من طرف مضمونة
    effective_from  date NOT NULL DEFAULT CURRENT_DATE,
    effective_to    date,
    notes           text,
    metadata        jsonb NOT NULL DEFAULT '{}',
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_supplier_contracts_supplier
  ON public.supplier_contracts (supplier_id, status);
COMMENT ON TABLE public.supplier_contracts IS
  'سجل تعاقدات الموردين. pre_contract = مفيش صف active هنا.';

ALTER TABLE public.supplier_contracts ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='supplier_contracts' AND policyname='supplier_contracts_service') THEN
    CREATE POLICY supplier_contracts_service ON public.supplier_contracts
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='supplier_contracts' AND policyname='supplier_contracts_tenant') THEN
    CREATE POLICY supplier_contracts_tenant ON public.supplier_contracts
      FOR SELECT TO authenticated
      USING (EXISTS (
        SELECT 1 FROM public.supplier_admins sa
        WHERE sa.supplier_id = supplier_contracts.supplier_id
          AND sa.auth_user_id = auth.uid()
          AND sa.active = true));
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 4) سيلف-سرفس: أي مورّد جديد → pre_contract + تجربة ERP كاملة تلقائياً
-- -----------------------------------------------------------------------------
-- (أ) قبل الإدخال: اضبط الديفولتس للتجربة
CREATE OR REPLACE FUNCTION public.set_supplier_trial_defaults()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.contract_stage IS NULL THEN
        NEW.contract_stage := 'pre_contract';
    END IF;
    IF NEW.contract_stage = 'pre_contract' THEN
        NEW.trial_started_at := COALESCE(NEW.trial_started_at, now());
        IF NEW.has_erp_crm IS NULL OR NEW.has_erp_crm = false THEN
            NEW.has_erp_crm := true;        -- تجربة ERP كاملة
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_supplier_trial_defaults') THEN
    CREATE TRIGGER trg_supplier_trial_defaults
      BEFORE INSERT ON public.marketplace_suppliers
      FOR EACH ROW EXECUTE FUNCTION public.set_supplier_trial_defaults();
  END IF;
END $$;

-- (ب) بعد الإدخال: فعّل موديولات الـERP تلقائياً (لو كتالوج الـERP متطبّق)
CREATE OR REPLACE FUNCTION public.autoprovision_supplier_erp()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
    IF NEW.contract_stage = 'pre_contract'
       AND to_regprocedure('public.provision_supplier_erp(uuid,boolean)') IS NOT NULL THEN
        PERFORM public.provision_supplier_erp(NEW.id, false);
    END IF;
    RETURN NULL;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_autoprovision_supplier_erp') THEN
    CREATE TRIGGER trg_autoprovision_supplier_erp
      AFTER INSERT ON public.marketplace_suppliers
      FOR EACH ROW EXECUTE FUNCTION public.autoprovision_supplier_erp();
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 5) إنفورسمنت عند طبقة الداتا (RULE 2): منع نشر ليستنج لمورّد غير متعاقد
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_listing_publish_contract()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    v_stage text;
BEGIN
    IF NEW.status = 'published' THEN
        SELECT contract_stage INTO v_stage
        FROM public.marketplace_suppliers
        WHERE id = NEW.supplier_id;

        IF v_stage IS DISTINCT FROM 'contracted' THEN
            RAISE EXCEPTION
              'ممنوع نشر ليستنج لمورّد غير متعاقد (contract_stage=%). لازم إتمام التعاقد الأول.', v_stage
              USING ERRCODE = 'check_violation';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_enforce_listing_publish_contract') THEN
    CREATE TRIGGER trg_enforce_listing_publish_contract
      BEFORE INSERT OR UPDATE OF status ON public.listings
      FOR EACH ROW EXECUTE FUNCTION public.enforce_listing_publish_contract();
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 6) دالة إتمام التعاقد: تحوّل المورّد لـ contracted + تسجّل العقد + العمولة
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.contract_supplier(
    p_supplier_id     uuid,
    p_commission_rate numeric DEFAULT NULL,   -- NULL = سيب العمولة الحالية زي ما هي
    p_account_type    text    DEFAULT NULL,
    p_signed_by       uuid    DEFAULT NULL,
    p_document_url    text    DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
    v_contract_id uuid;
BEGIN
    -- اقفل أي عقد سابق نشط
    UPDATE public.supplier_contracts
       SET status='ended', effective_to=CURRENT_DATE, updated_at=now()
     WHERE supplier_id=p_supplier_id AND status='active';

    INSERT INTO public.supplier_contracts
        (supplier_id, status, commission_rate, account_type, document_url, signed_by)
    VALUES
        (p_supplier_id, 'active', p_commission_rate, p_account_type, p_document_url, p_signed_by)
    RETURNING id INTO v_contract_id;

    UPDATE public.marketplace_suppliers
       SET contract_stage='contracted',
           contracted_at=COALESCE(contracted_at, now()),
           commission_rate=COALESCE(p_commission_rate, commission_rate),
           account_type=COALESCE(p_account_type, account_type),
           updated_at=now()
     WHERE id=p_supplier_id;

    RETURN v_contract_id;
END;
$$;
COMMENT ON FUNCTION public.contract_supplier(uuid,numeric,text,uuid,text) IS
  'إتمام تعاقد مورّد: ينشئ عقد active + يحوّله contracted + يفعّل النشر. مثال: SELECT contract_supplier(''<id>'', 10);';

-- -----------------------------------------------------------------------------
-- 7) VIEW — حالة كل مورّد (مرحلة التعاقد + التجربة + العقد النشط)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_supplier_contract_state AS
SELECT
    s.id              AS supplier_id,
    s.business_name,
    s.contract_stage,
    s.kyc_status,
    s.has_erp_crm,
    s.commission_rate,
    s.trial_started_at,
    s.contracted_at,
    c.id              AS active_contract_id,
    c.commission_rate AS contracted_commission_rate,
    c.effective_from
FROM public.marketplace_suppliers s
LEFT JOIN public.supplier_contracts c
       ON c.supplier_id = s.id AND c.status = 'active'
ORDER BY s.contract_stage, s.business_name;

COMMIT;

-- =============================================================================
-- التحقق + الاستخدام:
--   -- توزيع المراحل:
--   SELECT contract_stage, count(*) FROM marketplace_suppliers GROUP BY 1;
--
--   -- تجربة: لو حاولت تنشر ليستنج لمورّد pre_contract هيرفض:
--   --   UPDATE listings SET status='published' WHERE supplier_id='<precontract_id>'; -- EXCEPTION
--
--   -- إتمام تعاقد مورّد (أفراد 10% / شركات 5%):
--   --   SELECT contract_supplier('<supplier_id>', 10, 'individual', '<admin_profile_id>');
--
--   -- حالة الموردين:
--   --   SELECT * FROM v_supplier_contract_state;
-- =============================================================================
