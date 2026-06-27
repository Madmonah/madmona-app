-- =============================================================================
-- MADMONA — GYM VERTICAL MODEL  (موديل الجيم: تدريب + مكملات + كافيه + حسابات)
-- File: sql/GYM_VERTICAL_MODEL_2026-06-25.sql
-- Date: 2026-06-25
--
-- الفكرة:
--   الجيم = مورّد على مضمونة (زي إليت/سعداوي). إدارته العامة مستقلة، والبيع
--   والخدمات بتمر على ماركت بليس مضمونة. التصميم multi-tenant بالكامل (كل صف
--   مربوط بـ supplier_id) فيستحمل أكتر من جيم، والقيم (أنواع الحصص/الباقات)
--   جداول قابلة للإضافة يدوي لكل جيم لوحده.
--
-- إعادة الاستخدام (من غير تكرار أو تداخل بيانات):
--   • المدرّبين      → business_employees (employee_type='trainer') + امتداد gym_trainer_profiles
--   • المكملات       → inventory_products (category='supplement')
--   • الكافيه (المنيو)→ restaurant_menu_items
--   • البيع أونلاين  → marketplace_orders / marketplace_order_items
--   • الإيراد/الكاش   → financial_transactions / daily_closes
--   • العملاء/الأعضاء → customers (scoped بـ supplier_id)
--   • الفروع          → supplier_branches
--   • الرواتب/الحضور  → payroll_runs / attendance_logs / employee_shifts ... (زي ما هي)
--
-- الجداول الجديدة هنا = بس النواقص الخاصة بالجيم اللي مفيش جدول بيغطّيها.
--
-- السلامة:
--   • Idempotent (CREATE IF NOT EXISTS / ON CONFLICT DO NOTHING / CREATE OR REPLACE).
--   • مفيش DROP/ALTER على أي جدول قائم.
--   • RLS مفعّل على كل جدول جديد، بصلاحية متوافقة مع supplier_admins.
--   • القسم والموديولات بتتسجّل في كتالوج الـERP لو الملف الأول اتطبّق (اختياري).
--
-- التطبيق: Supabase → SQL Editor → الصق الكل → Run.
-- =============================================================================

BEGIN;

-- =============================================================================
-- (أ) جداول الجيم — كلها scoped بـ supplier_id  (multi-gym ready)
-- =============================================================================

-- 1) امتداد بيانات المدرّب (1:1 مع business_employees) -------------------------
CREATE TABLE IF NOT EXISTS public.gym_trainer_profiles (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id     uuid NOT NULL REFERENCES public.marketplace_suppliers(id) ON DELETE CASCADE,
    employee_id     uuid NOT NULL REFERENCES public.business_employees(id) ON DELETE CASCADE,
    specialties     text[] NOT NULL DEFAULT '{}',   -- مثال: {'حديد','كروس فيت','تغذية'} — قابلة للإضافة يدوي
    bio             text,
    certifications  text[] NOT NULL DEFAULT '{}',
    hourly_rate_egp numeric(12,2),                  -- سعر ساعة التدريب الشخصي
    session_commission_pct numeric(5,2),            -- عمولته على الحصة
    rating          numeric(3,2) DEFAULT 0,
    is_accepting_clients boolean NOT NULL DEFAULT true,
    photo_url       text,
    metadata        jsonb NOT NULL DEFAULT '{}',
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE (employee_id)
);
COMMENT ON TABLE public.gym_trainer_profiles IS 'بيانات المدرّب الإضافية. المدرّب نفسه صف في business_employees.';

-- 2) كتالوج باقات الاشتراك (لكل جيم قائمته القابلة للإضافة يدوي) ----------------
CREATE TABLE IF NOT EXISTS public.gym_membership_plans (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id     uuid NOT NULL REFERENCES public.marketplace_suppliers(id) ON DELETE CASCADE,
    name_ar         text NOT NULL,
    name_en         text,
    duration_days   integer NOT NULL DEFAULT 30,    -- 30 / 90 / 365 ...
    price_egp       numeric(12,2) NOT NULL,
    classes_included integer,                       -- NULL = غير محدود
    pt_sessions_included integer NOT NULL DEFAULT 0,
    freeze_days_allowed integer NOT NULL DEFAULT 0, -- أيام التجميد المسموحة
    branch_scope    text NOT NULL DEFAULT 'all',    -- 'all' أو فرع محدد (نص حر — قابل للتوسعة)
    description     text,
    active          boolean NOT NULL DEFAULT true,
    metadata        jsonb NOT NULL DEFAULT '{}',
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.gym_membership_plans IS 'باقات اشتراك الجيم لكل مورّد. القيم تتضاف يدوي لكل جيم.';

-- 3) اشتراكات الأعضاء (العضو = صف في customers) --------------------------------
CREATE TABLE IF NOT EXISTS public.gym_memberships (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id     uuid NOT NULL REFERENCES public.marketplace_suppliers(id) ON DELETE CASCADE,
    customer_id     uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    plan_id         uuid NOT NULL REFERENCES public.gym_membership_plans(id),
    branch_id       uuid REFERENCES public.supplier_branches(id),
    start_date      date NOT NULL DEFAULT CURRENT_DATE,
    end_date        date NOT NULL,
    status          text NOT NULL DEFAULT 'active',  -- active / frozen / expired / cancelled
    classes_used    integer NOT NULL DEFAULT 0,
    pt_sessions_used integer NOT NULL DEFAULT 0,
    freeze_days_used integer NOT NULL DEFAULT 0,
    amount_paid_egp numeric(12,2),
    sold_by_employee_id uuid REFERENCES public.business_employees(id),
    order_id        uuid REFERENCES public.marketplace_orders(id),  -- لو البيع اتعمل أونلاين
    notes           text,
    metadata        jsonb NOT NULL DEFAULT '{}',
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gym_memberships_supplier ON public.gym_memberships (supplier_id);
CREATE INDEX IF NOT EXISTS idx_gym_memberships_customer ON public.gym_memberships (customer_id);
CREATE INDEX IF NOT EXISTS idx_gym_memberships_status   ON public.gym_memberships (supplier_id, status);
COMMENT ON TABLE public.gym_memberships IS 'اشتراك العضو الفعّال/المنتهي. مربوط بـ customers + باقة.';

-- 4) سجل دخول الأعضاء (check-in) ------------------------------------------------
CREATE TABLE IF NOT EXISTS public.gym_member_checkins (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id     uuid NOT NULL REFERENCES public.marketplace_suppliers(id) ON DELETE CASCADE,
    membership_id   uuid REFERENCES public.gym_memberships(id) ON DELETE SET NULL,
    customer_id     uuid REFERENCES public.customers(id) ON DELETE SET NULL,
    branch_id       uuid REFERENCES public.supplier_branches(id),
    checkin_at      timestamptz NOT NULL DEFAULT now(),
    checkout_at     timestamptz,
    method          text NOT NULL DEFAULT 'manual',  -- manual / qr / fingerprint / card
    created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gym_checkins_supplier_day ON public.gym_member_checkins (supplier_id, checkin_at);
COMMENT ON TABLE public.gym_member_checkins IS 'دخول/خروج الأعضاء للجيم.';

-- 5) أنواع الحصص (قابلة للإضافة يدوي لكل جيم) -----------------------------------
CREATE TABLE IF NOT EXISTS public.gym_class_types (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id     uuid NOT NULL REFERENCES public.marketplace_suppliers(id) ON DELETE CASCADE,
    name_ar         text NOT NULL,                  -- مثال: يوجا / سبينينج / كروس فيت
    name_en         text,
    color           text,
    active          boolean NOT NULL DEFAULT true,
    created_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE (supplier_id, name_ar)
);
COMMENT ON TABLE public.gym_class_types IS 'أنواع الحصص الجماعية. كل جيم بيضيف أنواعه.';

-- 6) حصص مجدولة (sessions) ------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.gym_classes (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id     uuid NOT NULL REFERENCES public.marketplace_suppliers(id) ON DELETE CASCADE,
    branch_id       uuid REFERENCES public.supplier_branches(id),
    class_type_id   uuid REFERENCES public.gym_class_types(id),
    trainer_employee_id uuid REFERENCES public.business_employees(id),
    title           text NOT NULL,
    starts_at       timestamptz NOT NULL,
    duration_minutes integer NOT NULL DEFAULT 60,
    capacity        integer NOT NULL DEFAULT 20,
    booked_count    integer NOT NULL DEFAULT 0,
    status          text NOT NULL DEFAULT 'scheduled', -- scheduled / done / cancelled
    metadata        jsonb NOT NULL DEFAULT '{}',
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gym_classes_supplier_time ON public.gym_classes (supplier_id, starts_at);
COMMENT ON TABLE public.gym_classes IS 'حصص جماعية مجدولة بمدرّب وفرع وسعة.';

-- 7) حجز عضو لحصة ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.gym_class_bookings (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id     uuid NOT NULL REFERENCES public.marketplace_suppliers(id) ON DELETE CASCADE,
    class_id        uuid NOT NULL REFERENCES public.gym_classes(id) ON DELETE CASCADE,
    customer_id     uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    membership_id   uuid REFERENCES public.gym_memberships(id) ON DELETE SET NULL,
    status          text NOT NULL DEFAULT 'booked',  -- booked / attended / no_show / cancelled
    booked_at       timestamptz NOT NULL DEFAULT now(),
    UNIQUE (class_id, customer_id)
);
CREATE INDEX IF NOT EXISTS idx_gym_class_bookings_supplier ON public.gym_class_bookings (supplier_id);
COMMENT ON TABLE public.gym_class_bookings IS 'حجز العضو لحصة جماعية.';

-- 8) باقات التدريب الشخصي (PT) --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.gym_pt_packages (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id     uuid NOT NULL REFERENCES public.marketplace_suppliers(id) ON DELETE CASCADE,
    customer_id     uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    trainer_employee_id uuid REFERENCES public.business_employees(id),
    sessions_total  integer NOT NULL,
    sessions_used   integer NOT NULL DEFAULT 0,
    price_egp       numeric(12,2) NOT NULL,
    expires_on      date,
    status          text NOT NULL DEFAULT 'active',  -- active / completed / expired / cancelled
    order_id        uuid REFERENCES public.marketplace_orders(id),
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gym_pt_packages_supplier ON public.gym_pt_packages (supplier_id);
COMMENT ON TABLE public.gym_pt_packages IS 'باقة حصص تدريب شخصي مدفوعة لعضو.';

-- 9) حصص التدريب الشخصي الفعلية -------------------------------------------------
CREATE TABLE IF NOT EXISTS public.gym_pt_sessions (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id     uuid NOT NULL REFERENCES public.marketplace_suppliers(id) ON DELETE CASCADE,
    package_id      uuid REFERENCES public.gym_pt_packages(id) ON DELETE SET NULL,
    customer_id     uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    trainer_employee_id uuid REFERENCES public.business_employees(id),
    branch_id       uuid REFERENCES public.supplier_branches(id),
    starts_at       timestamptz NOT NULL,
    duration_minutes integer NOT NULL DEFAULT 60,
    status          text NOT NULL DEFAULT 'scheduled', -- scheduled / done / no_show / cancelled
    trainer_commission_egp numeric(12,2),
    notes           text,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gym_pt_sessions_supplier_time ON public.gym_pt_sessions (supplier_id, starts_at);
COMMENT ON TABLE public.gym_pt_sessions IS 'حصة تدريب شخصي فعلية (تخصم من باقة).';

-- 10) قياسات/تقدّم العضو -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.gym_body_measurements (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id     uuid NOT NULL REFERENCES public.marketplace_suppliers(id) ON DELETE CASCADE,
    customer_id     uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    measured_on     date NOT NULL DEFAULT CURRENT_DATE,
    weight_kg       numeric(6,2),
    height_cm       numeric(6,2),
    body_fat_pct    numeric(5,2),
    muscle_mass_kg  numeric(6,2),
    measurements    jsonb NOT NULL DEFAULT '{}',     -- صدر/خصر/ذراع... مرن
    recorded_by_employee_id uuid REFERENCES public.business_employees(id),
    notes           text,
    created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gym_measurements_customer ON public.gym_body_measurements (customer_id, measured_on);
COMMENT ON TABLE public.gym_body_measurements IS 'متابعة تقدّم العضو (وزن/دهون/قياسات).';

-- =============================================================================
-- (ب) RLS — متوافق مع نموذج الصلاحيات (supplier_admins) + service_role
--      أي مستخدم authenticated مرتبط بالمورّد عبر supplier_admins (active) له وصول كامل
--      لصفوف الجيم بتاعته. service_role (الـedge functions) وصول كامل.
-- =============================================================================
DO $$
DECLARE
    t text;
    gym_tables text[] := ARRAY[
        'gym_trainer_profiles','gym_membership_plans','gym_memberships',
        'gym_member_checkins','gym_class_types','gym_classes',
        'gym_class_bookings','gym_pt_packages','gym_pt_sessions','gym_body_measurements'
    ];
BEGIN
    FOREACH t IN ARRAY gym_tables LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);

        -- service_role: وصول كامل
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename=t AND policyname=t||'_service') THEN
            EXECUTE format(
              'CREATE POLICY %I ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true);',
              t||'_service', t);
        END IF;

        -- supplier_admins: وصول كامل لصفوف المورّد بتاعهم
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename=t AND policyname=t||'_tenant') THEN
            EXECUTE format($f$
              CREATE POLICY %I ON public.%I FOR ALL TO authenticated
              USING (EXISTS (
                  SELECT 1 FROM public.supplier_admins sa
                  WHERE sa.supplier_id = %I.supplier_id
                    AND sa.auth_user_id = auth.uid()
                    AND sa.active = true))
              WITH CHECK (EXISTS (
                  SELECT 1 FROM public.supplier_admins sa
                  WHERE sa.supplier_id = %I.supplier_id
                    AND sa.auth_user_id = auth.uid()
                    AND sa.active = true));
            $f$, t||'_tenant', t, t, t);
        END IF;
    END LOOP;
END $$;

-- =============================================================================
-- (ج) تسجيل قسم "الجيم" وموديولاته في كتالوج الـERP (لو الملف الأول اتطبّق)
--     default_enabled=false عشان موديولات الجيم متتفعّلش غير للموردين الجيمات.
-- =============================================================================
DO $$
BEGIN
  IF to_regclass('public.erp_departments') IS NOT NULL
     AND to_regclass('public.erp_modules_catalog') IS NOT NULL THEN

    INSERT INTO public.erp_departments (key, name_ar, name_en, icon, color, sort_order, description_ar)
    VALUES ('gym','النادي الرياضي (جيم)','Gym','dumbbell','#1F6F5F', 65,
            'اشتراكات، حصص، تدريب شخصي، مدرّبين، مكملات، كافيه — vertical الجيم')
    ON CONFLICT (key) DO NOTHING;

    INSERT INTO public.erp_modules_catalog
      (module_key, department_key, name_ar, name_en, route_suffix, backing_tables, icon, is_core, default_enabled, sort_order, description_ar)
    VALUES
      ('gym_memberships','gym','الاشتراكات','Memberships','gym-memberships',
        ARRAY['gym_membership_plans','gym_memberships'], 'id-card', false, false, 10, 'باقات واشتراكات الأعضاء'),
      ('gym_checkins','gym','الدخول والخروج','Check-ins','gym-checkins',
        ARRAY['gym_member_checkins'], 'door-open', false, false, 20, 'تسجيل دخول الأعضاء'),
      ('gym_classes','gym','الحصص الجماعية','Classes','gym-classes',
        ARRAY['gym_class_types','gym_classes','gym_class_bookings'], 'calendar', false, false, 30, 'جدول الحصص وحجوزاتها'),
      ('gym_pt','gym','التدريب الشخصي','Personal Training','gym-pt',
        ARRAY['gym_pt_packages','gym_pt_sessions'], 'dumbbell', false, false, 40, 'باقات وحصص التدريب الشخصي'),
      ('gym_trainers','gym','المدرّبين','Trainers','gym-trainers',
        ARRAY['gym_trainer_profiles','business_employees'], 'user-check', false, false, 50, 'ملفات المدرّبين وتخصصاتهم'),
      ('gym_progress','gym','متابعة الأعضاء','Member Progress','gym-progress',
        ARRAY['gym_body_measurements'], 'activity', false, false, 60, 'قياسات وتقدّم الأعضاء'),
      ('gym_supplements','gym','المكملات','Supplements','gym-supplements',
        ARRAY['inventory_products','marketplace_orders','marketplace_order_items'], 'pill', false, false, 70, 'بيع المكملات (يعيد استخدام المخزون والطلبات)'),
      ('gym_cafe','gym','الكافيه','Cafe','gym-cafe',
        ARRAY['restaurant_menu_items','marketplace_orders','marketplace_order_items'], 'coffee', false, false, 80, 'منيو الكافيه والطلبات (يعيد استخدام جداول المطاعم والطلبات)')
    ON CONFLICT (module_key) DO NOTHING;

  END IF;
END $$;

-- =============================================================================
-- (د) دالة تفعيل موديولات الجيم لمورّد جيم محدد (idempotent)
--     بتفعّل موديولات الجيم + الموديولات الأساسية العامة في supplier_modules.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.provision_gym_supplier(p_supplier_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_added integer := 0;
BEGIN
    IF to_regclass('public.erp_modules_catalog') IS NULL
       OR to_regclass('public.supplier_modules') IS NULL THEN
        RAISE NOTICE 'erp catalog / supplier_modules غير موجودين — طبّق ERP_DEPARTMENT_MODEL أولاً.';
        RETURN 0;
    END IF;

    INSERT INTO public.supplier_modules
        (supplier_id, module_href, enabled, is_primary, display_order, label_override)
    SELECT p_supplier_id, m.route_suffix, true, m.is_core, m.sort_order, NULL
    FROM public.erp_modules_catalog m
    WHERE (m.department_key = 'gym' OR m.is_core = true)
      AND NOT EXISTS (
            SELECT 1 FROM public.supplier_modules sm
            WHERE sm.supplier_id = p_supplier_id
              AND sm.module_href = m.route_suffix);

    GET DIAGNOSTICS v_added = ROW_COUNT;
    RETURN v_added;
END;
$$;
COMMENT ON FUNCTION public.provision_gym_supplier(uuid) IS
  'بيفعّل موديولات الجيم + الأساسية لمورّد جيم. مثال: SELECT provision_gym_supplier(''<gym_supplier_id>'');';

COMMIT;

-- =============================================================================
-- التحقق + الاستخدام:
--   -- الجداول الجديدة (متوقّع 10):
--   SELECT count(*) FROM information_schema.tables
--     WHERE table_schema='public' AND table_name LIKE 'gym\_%';
--
--   -- لإضافة جيم جديد لاحقاً: اعمله مورّد في marketplace_suppliers ثم:
--   --   SELECT provision_gym_supplier('<gym_supplier_id>');
--   -- ثم أدخل باقاته يدوياً:
--   --   INSERT INTO gym_membership_plans (supplier_id, name_ar, duration_days, price_egp)
--   --     VALUES ('<gym_supplier_id>','شهر', 30, 600);
--   -- وأنواع حصصه:
--   --   INSERT INTO gym_class_types (supplier_id, name_ar) VALUES ('<gym_supplier_id>','يوجا');
--
--   -- لو طبّقت الملف الأول كمان، شوف موديولات الجيم في الخريطة:
--   --   SELECT * FROM v_erp_blueprint WHERE department_key='gym';
-- =============================================================================
