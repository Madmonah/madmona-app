-- =============================================================================
-- MADMONA — ERP DEPARTMENT MODEL  (نموذج الـERP بكل الأقسام للموردين B2B)
-- File: sql/ERP_DEPARTMENT_MODEL_2026-06-25.sql
-- Author: generated for Mohamed (مضمونة)
-- Date:   2026-06-25
--
-- الغرض:
--   مضمونة عندها بالفعل ٨٠+ جدول ERP شغّالين بس مبعثرين ومن غير تنظيم موحّد.
--   الملف ده *مش* بيعيد بناء أي حاجة — هو بيضيف طبقة تنظيمية نظيفة بتجمّع كل
--   الجداول الموجودة تحت "أقسام" (departments) و"موديولات" (modules)، وبيشغّل
--   جدول supplier_modules الفاضي اللي معمول مخصوص للغرض ده.
--
-- مبادئ السلامة (Root-cause, لا مسكنات — حسب RULE 1):
--   • مفيش DROP / مفيش ALTER على جداول قائمة. كله إضافي.
--   • Idempotent بالكامل: CREATE ... IF NOT EXISTS + INSERT ... ON CONFLICT DO NOTHING
--     + CREATE OR REPLACE. تقدر تشغّله أكتر من مرة من غير أي ضرر.
--   • RLS مفعّل على الجدولين الجدد مع policies صريحة (مش هيقفل أي وصول قائم).
--
-- طريقة التطبيق:
--   افتح Supabase → SQL Editor → الصق الملف ده كله → Run.
--   (مفيش أي عملية مدمّرة، فآمن تشغّله مباشرة.)
--
-- بعد التطبيق:
--   • شوف الخريطة الكاملة:   SELECT * FROM v_supplier_erp_full_map;
--   • فعّل الموديولات الافتراضية لمورّد:  SELECT provision_supplier_erp('<supplier_id>');
--   • فعّل لكل الموردين أصحاب ERP:  SELECT provision_all_suppliers_erp();
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1) كتالوج الأقسام (Departments)  — تعريف عالمي مش per-supplier
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.erp_departments (
    key          text PRIMARY KEY,            -- معرّف ثابت (slug)
    name_ar      text NOT NULL,
    name_en      text NOT NULL,
    icon         text,                          -- اسم أيقونة (lucide) للواجهة
    color        text,                          -- لون القسم (hex) — متوافق مع براند مضمونة
    sort_order   integer NOT NULL DEFAULT 100,
    description_ar text,
    created_at   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.erp_departments IS
  'كتالوج أقسام الـERP لمضمونة (B2B). تعريف عالمي يُعرَض لكل مورّد. أضيف 2026-06-25.';

-- -----------------------------------------------------------------------------
-- 2) كتالوج الموديولات (Modules)  — كل موديول بيتبع قسم وبيغطّي جدول/جداول حقيقية
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.erp_modules_catalog (
    module_key       text PRIMARY KEY,          -- معرّف ثابت (slug)
    department_key   text NOT NULL REFERENCES public.erp_departments(key) ON UPDATE CASCADE,
    name_ar          text NOT NULL,
    name_en          text NOT NULL,
    route_suffix     text NOT NULL,             -- بيتطابق مع supplier_modules.module_href
    backing_tables   text[] NOT NULL DEFAULT '{}',  -- الجداول الحقيقية اللي الموديول بيشغّلها
    icon             text,
    is_core          boolean NOT NULL DEFAULT false,  -- موديول أساسي يتفعّل تلقائياً
    default_enabled  boolean NOT NULL DEFAULT true,
    sort_order       integer NOT NULL DEFAULT 100,
    description_ar   text,
    created_at       timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.erp_modules_catalog IS
  'كتالوج موديولات الـERP. كل صف بيربط موديول بقسم وبالجداول الحقيقية اللي بيشتغل عليها. أضيف 2026-06-25.';

CREATE INDEX IF NOT EXISTS idx_erp_modules_dept ON public.erp_modules_catalog (department_key);

-- -----------------------------------------------------------------------------
-- 3) RLS  — الكتالوج بيانات تعريفية غير حساسة: قراءة للكل، تعديل للـservice_role فقط
-- -----------------------------------------------------------------------------
ALTER TABLE public.erp_departments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_modules_catalog ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='erp_departments' AND policyname='erp_departments_read') THEN
    CREATE POLICY erp_departments_read ON public.erp_departments
      FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='erp_modules_catalog' AND policyname='erp_modules_read') THEN
    CREATE POLICY erp_modules_read ON public.erp_modules_catalog
      FOR SELECT USING (true);
  END IF;
  -- تعديل الكتالوج محصور على service_role (الأدمن/الـEdge functions)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='erp_departments' AND policyname='erp_departments_write') THEN
    CREATE POLICY erp_departments_write ON public.erp_departments
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='erp_modules_catalog' AND policyname='erp_modules_write') THEN
    CREATE POLICY erp_modules_write ON public.erp_modules_catalog
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 4) SEED — الأقسام (١٢ قسم بيغطّوا كل الـERP الحالي)
-- -----------------------------------------------------------------------------
INSERT INTO public.erp_departments (key, name_ar, name_en, icon, color, sort_order, description_ar) VALUES
  ('hr',          'الموارد البشرية',        'People & HR',          'users',         '#1F6F5F', 10, 'الموظفين، الشيفتات، الحضور، الإجازات، الجزاءات، المهام'),
  ('payroll',     'الرواتب والأجور',        'Payroll',              'wallet',        '#2d7a52', 20, 'مسيّرات الرواتب، الصرف، السلف، البقشيش، العمولات'),
  ('finance',     'المالية والمحاسبة',      'Finance & Accounting', 'bar-chart-3',   '#2FA084', 30, 'الحركات المالية، المصاريف، الفواتير الدورية، إقفال اليومية'),
  ('cash',        'الخزينة والجرد النقدي',  'Cash & Reconcile',     'banknote',      '#6FCF97', 40, 'جرد الكاش اليومي، التسويات، السحب من الخزينة'),
  ('inventory',   'المخزون والمشتريات',     'Inventory & Procurement','package',     '#1F6F5F', 50, 'المنتجات، حركة المخزون، أوامر الشراء، الموردين، العهدة'),
  ('branches',    'الفروع والعمليات',       'Branches & Ops',       'store',         '#2d7a52', 60, 'إدارة الفروع، الأجهزة، إعدادات الحضور والحجز لكل فرع'),
  ('sales',       'المبيعات والحجوزات (CRM)','Sales & Bookings',     'calendar-check','#2FA084', 70, 'العملاء، الحجوزات، كتالوج الخدمات، التقييمات، قائمة الانتظار'),
  ('marketing',   'التسويق والعروض',        'Marketing & Promos',   'megaphone',     '#d4a017', 80, 'البروموكود، حملات الواتساب، مشاركات السوشيال'),
  ('documents',   'المستندات',              'Documents',            'file-text',     '#2d7a52', 90, 'مستندات المورّد والعقود والتراخيص'),
  ('tax',         'الضرائب والامتثال',      'Tax & Compliance',     'scale',         '#2FA084',100, 'ضريبة القيمة المضافة، الإعدادات القانونية، التأمينات'),
  ('payouts',     'المدفوعات والتحصيل',     'Payouts & Billing',    'credit-card',   '#6FCF97',110, 'مستحقات المورّد، مدفوعات السوق، فواتير الـAI'),
  ('reports',     'التقارير والتدقيق',      'Reports & Audit',      'clipboard-list','#1F6F5F',120, 'مؤشرات الأداء، الملخصات اليومية، سجل التدقيق')
ON CONFLICT (key) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 5) SEED — الموديولات (مربوطة بالجداول الحقيقية الموجودة في القاعدة)
--     route_suffix = القيمة اللي هتتحط في supplier_modules.module_href
-- -----------------------------------------------------------------------------
INSERT INTO public.erp_modules_catalog
  (module_key, department_key, name_ar, name_en, route_suffix, backing_tables, icon, is_core, default_enabled, sort_order, description_ar) VALUES

  -- ===== HR =====
  ('hr_team',        'hr', 'فريق العمل',        'Team',            'team',
     ARRAY['business_employees','employee_role_templates','permission_catalog','employee_join_requests'], 'users', true, true, 10, 'بيانات الموظفين، الأدوار، الصلاحيات، طلبات الانضمام'),
  ('hr_attendance',  'hr', 'الحضور والانصراف',  'Attendance',      'attendance',
     ARRAY['attendance_logs','attendance_sessions','attendance_devices','attendance_geofence_attempts'], 'fingerprint', true, true, 20, 'تسجيل الحضور بالـgeofence والأجهزة'),
  ('hr_shifts',      'hr', 'الشيفتات',          'Shifts',          'shifts',
     ARRAY['employee_shifts'], 'clock', false, true, 30, 'جدولة شيفتات الموظفين'),
  ('hr_tasks',       'hr', 'المهام اليومية',    'Daily Tasks',     'tasks',
     ARRAY['daily_tasks','employee_fixed_tasks','recurring_task_templates'], 'list-checks', false, true, 40, 'مهام تتولّد تلقائياً من قوالب الأدوار'),
  ('hr_leaves',      'hr', 'الإجازات',          'Leaves',          'leaves',
     ARRAY['employee_leave_requests','employee_leave_balances'], 'plane', false, true, 50, 'طلبات وأرصدة الإجازات'),
  ('hr_penalties',   'hr', 'الجزاءات والمخالفات','Penalties',      'penalties',
     ARRAY['hr_penalty_rules','hr_infractions'], 'alert-triangle', false, true, 60, 'قواعد الجزاءات وتسجيل المخالفات'),

  -- ===== PAYROLL =====
  ('pay_runs',       'payroll', 'مسيّر الرواتب', 'Payroll Runs',   'payroll',
     ARRAY['payroll_runs','payroll_items'], 'wallet', true, true, 10, 'تشغيل مسيّر الرواتب الشهري'),
  ('pay_salaries',   'payroll', 'صرف الرواتب',   'Salary Payments','salaries',
     ARRAY['salary_payments','employee_salary_history'], 'banknote', false, true, 20, 'صرف وتاريخ الرواتب'),
  ('pay_advances',   'payroll', 'السلف',         'Advances',       'advances',
     ARRAY['employee_advances'], 'hand-coins', false, true, 30, 'سلف الموظفين وخصمها'),
  ('pay_tips',       'payroll', 'البقشيش',       'Tips',           'tips',
     ARRAY['tips'], 'coins', false, false, 40, 'توزيع البقشيش على الفريق'),
  ('pay_commissions','payroll', 'العمولات',      'Commissions',    'commissions',
     ARRAY['commissions_log'], 'percent', false, true, 50, 'عمولات الموظفين على الحجوزات'),

  -- ===== FINANCE =====
  ('fin_ledger',     'finance', 'الحركات المالية','Transactions',  'transactions',
     ARRAY['financial_transactions','transaction_categories'], 'arrow-left-right', true, true, 10, 'كل جنيه داخل/خارج مصنّف'),
  ('fin_expenses',   'finance', 'المصاريف',      'Expenses',       'expenses',
     ARRAY['branch_expenses'], 'receipt', true, true, 20, 'مصاريف الفروع'),
  ('fin_bills',      'finance', 'الفواتير الدورية','Recurring Bills','bills',
     ARRAY['recurring_bills','bill_payments'], 'calendar-clock', false, true, 30, 'الإيجار والكهرباء والاشتراكات المتكررة'),
  ('fin_close',      'finance', 'إقفال اليومية', 'Daily Close',    'daily-close',
     ARRAY['daily_closes'], 'lock', false, true, 40, 'تقفيل نهاية اليوم لكل فرع'),

  -- ===== CASH =====
  ('cash_recon',     'cash', 'الجرد النقدي',     'Cash Reconcile', 'cash-recon',
     ARRAY['cash_reconciliations'], 'calculator', false, true, 10, 'مطابقة الكاش الفعلي بالنظام'),
  ('cash_withdraw',  'cash', 'السحب من الخزينة', 'Withdrawals',    'cash-withdrawals',
     ARRAY['cash_withdrawals'], 'banknote', false, true, 20, 'تسجيل السحب النقدي'),

  -- ===== INVENTORY & PROCUREMENT =====
  ('inv_products',   'inventory', 'المنتجات',    'Products',       'inventory',
     ARRAY['inventory_products','inventory_locations'], 'package', true, true, 10, 'كتالوج المنتجات والمواقع'),
  ('inv_movements',  'inventory', 'حركة المخزون','Stock Movements','stock-movements',
     ARRAY['inventory_stock_movements','service_product_consumption'], 'truck', false, true, 20, 'الإضافة/الصرف واستهلاك الخدمات للمخزون'),
  ('inv_po',         'inventory', 'أوامر الشراء','Purchase Orders','purchase-orders',
     ARRAY['inventory_purchase_orders','inventory_purchase_items'], 'shopping-cart', false, true, 30, 'أوامر الشراء وبنودها'),
  ('inv_vendors',    'inventory', 'الموردين',    'Vendors',        'vendors',
     ARRAY['vendors'], 'building-2', false, true, 40, 'موردين المورّد (مصادر التوريد)'),
  ('inv_custody',    'inventory', 'العهدة',      'Custody',        'custody',
     ARRAY['custody_items','custody_events'], 'box', false, false, 50, 'عهدة المعدات لدى الموظفين'),

  -- ===== BRANCHES =====
  ('br_branches',    'branches', 'الفروع',       'Branches',       'branches',
     ARRAY['supplier_branches'], 'store', true, true, 10, 'إدارة الفروع وإعداداتها'),

  -- ===== SALES / CRM =====
  ('crm_customers',  'sales', 'العملاء',         'Customers',      'customers',
     ARRAY['customers','customer_birthday_alerts'], 'user-round', true, true, 10, 'قاعدة عملاء المورّد'),
  ('crm_bookings',   'sales', 'الحجوزات',        'Bookings',       'bookings',
     ARRAY['branch_bookings','booking_waitlist','branch_visit_sessions'], 'calendar-check', true, true, 20, 'حجوزات الفروع وقائمة الانتظار'),
  ('crm_services',   'sales', 'كتالوج الخدمات',  'Services',       'services',
     ARRAY['services_catalog'], 'concierge-bell', false, true, 30, 'الخدمات اللي بيقدّمها المورّد'),
  ('crm_ratings',    'sales', 'تقييمات الخدمة',  'Service Ratings','ratings',
     ARRAY['service_ratings'], 'star', false, true, 40, 'تقييم العملاء للخدمات'),

  -- ===== MARKETING / PROMOS =====
  ('mkt_promos',     'marketing', 'العروض والبروموكود','Promotions','promotions',
     ARRAY['promotions','promotion_uses'], 'ticket-percent', false, true, 10, 'أكواد الخصم واستخداماتها'),
  ('mkt_wa',         'marketing', 'حملات الواتساب','WhatsApp Campaigns','wa-campaigns',
     ARRAY['whatsapp_campaigns','whatsapp_campaign_messages'], 'message-circle', false, false, 20, 'حملات تسويق واتساب للعملاء'),
  ('mkt_social',     'marketing', 'مشاركات السوشيال','Social Shares','social',
     ARRAY['social_packs','supplier_post_shares'], 'share-2', false, false, 30, 'باكدچات سوشيال جاهزة للمورّد'),

  -- ===== DOCUMENTS =====
  ('doc_docs',       'documents', 'المستندات',   'Documents',      'documents',
     ARRAY['supplier_documents'], 'file-text', false, true, 10, 'العقود والتراخيص ومستندات المورّد'),

  -- ===== TAX & COMPLIANCE =====
  ('tax_vat',        'tax', 'ضريبة القيمة المضافة','VAT',          'vat',
     ARRAY['financial_transactions'], 'scale', false, true, 10, 'حساب وتقرير ضريبة القيمة المضافة من الحركات'),
  ('tax_legal',      'tax', 'الإعدادات القانونية','Legal Config',  'legal',
     ARRAY['hr_legal_config'], 'gavel', false, true, 20, 'إعدادات التأمينات والقانون لكل مورّد'),

  -- ===== PAYOUTS / BILLING =====
  ('po_payouts',     'payouts', 'مستحقات المورّد','Payouts',       'payouts',
     ARRAY['supplier_payouts'], 'credit-card', true, true, 10, 'مستحقات المورّد من مضمونة'),
  ('po_payments',    'payouts', 'مدفوعات السوق', 'Marketplace Payments','payments',
     ARRAY['marketplace_payments','marketplace_orders','marketplace_order_items'], 'shopping-bag', false, true, 20, 'مدفوعات وطلبات السوق'),
  ('po_aibilling',   'payouts', 'فواتير الـAI',  'AI Billing',     'ai-billing',
     ARRAY['ai_billing_invoices'], 'cpu', false, false, 30, 'فواتير استخدام خدمات الـAI'),

  -- ===== REPORTS & AUDIT =====
  ('rep_kpis',       'reports', 'مؤشرات الأداء', 'KPIs',           'kpis',
     ARRAY['daily_kpis'], 'trending-up', true, true, 10, 'مؤشرات الأداء اليومية'),
  ('rep_digests',    'reports', 'الملخصات اليومية','Digests',      'digests',
     ARRAY['supplier_digests'], 'mail', false, false, 20, 'ملخص يومي يتبعت للمورّد'),
  ('rep_audit',      'reports', 'سجل التدقيق',   'Audit Log',      'audit',
     ARRAY['audit_log'], 'shield-check', false, true, 30, 'سجل كل عملية حساسة على بيانات المورّد')
ON CONFLICT (module_key) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 6) VIEW — خريطة الـERP الكاملة (قسم → موديول → جداول)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_erp_blueprint AS
SELECT
    d.key            AS department_key,
    d.name_ar        AS department_ar,
    d.name_en        AS department_en,
    d.sort_order     AS dept_order,
    m.module_key,
    m.name_ar        AS module_ar,
    m.name_en        AS module_en,
    m.route_suffix,
    m.is_core,
    m.default_enabled,
    m.backing_tables,
    m.sort_order     AS module_order
FROM public.erp_departments d
JOIN public.erp_modules_catalog m ON m.department_key = d.key
ORDER BY d.sort_order, m.sort_order;

COMMENT ON VIEW public.v_erp_blueprint IS 'الخريطة المرجعية الكاملة للـERP: كل قسم وموديولاته والجداول الحقيقية ورا كل موديول.';

-- -----------------------------------------------------------------------------
-- 7) VIEW — خريطة كل مورّد (إيه مفعّل عنده فعلياً من supplier_modules)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_supplier_erp_full_map AS
SELECT
    s.id                       AS supplier_id,
    s.business_name,
    s.has_erp_crm,
    d.key                      AS department_key,
    d.name_ar                  AS department_ar,
    m.module_key,
    m.name_ar                  AS module_ar,
    m.route_suffix,
    m.is_core,
    COALESCE(sm.enabled, false)            AS is_enabled,
    (sm.id IS NOT NULL)                     AS is_provisioned,
    COALESCE(sm.label_override, m.name_ar) AS display_label,
    COALESCE(sm.display_order, m.sort_order) AS display_order,
    m.backing_tables
FROM public.marketplace_suppliers s
CROSS JOIN public.erp_modules_catalog m
JOIN public.erp_departments d ON d.key = m.department_key
LEFT JOIN public.supplier_modules sm
       ON sm.supplier_id = s.id
      AND sm.module_href  = m.route_suffix
ORDER BY s.business_name, d.sort_order, m.sort_order;

COMMENT ON VIEW public.v_supplier_erp_full_map IS 'لكل مورّد: كل موديولات الـERP وحالتها الفعلية (مفعّل/متاح) من supplier_modules.';

-- -----------------------------------------------------------------------------
-- 8) FUNCTION — تفعيل الموديولات الافتراضية لمورّد واحد (آمن + idempotent)
--     بيكتب في supplier_modules الموجود — مفيش تكرار بفضل ON CONFLICT.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.provision_supplier_erp(
    p_supplier_id uuid,
    p_only_core   boolean DEFAULT false   -- true = الأساسية بس
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_inserted integer := 0;
BEGIN
    -- idempotent من غير ما نعتمد على وجود قيد فريد على supplier_modules:
    -- بنضيف الموديول بس لو مش موجود فعلاً لنفس المورّد بنفس الـhref.
    INSERT INTO public.supplier_modules
        (supplier_id, module_href, enabled, is_primary, display_order, label_override)
    SELECT
        p_supplier_id,
        m.route_suffix,
        m.default_enabled,
        m.is_core,
        m.sort_order,
        NULL
    FROM public.erp_modules_catalog m
    WHERE ((NOT p_only_core) OR m.is_core)
      AND NOT EXISTS (
            SELECT 1 FROM public.supplier_modules sm
            WHERE sm.supplier_id = p_supplier_id
              AND sm.module_href = m.route_suffix
      );

    GET DIAGNOSTICS v_inserted = ROW_COUNT;
    RETURN v_inserted;
END;
$$;

COMMENT ON FUNCTION public.provision_supplier_erp(uuid, boolean) IS
  'بيملأ supplier_modules بالموديولات الافتراضية لمورّد. idempotent. مثال: SELECT provision_supplier_erp(''<id>'');';

-- -----------------------------------------------------------------------------
-- 9) FUNCTION — تفعيل لكل الموردين أصحاب ERP دفعة واحدة
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.provision_all_suppliers_erp(
    p_only_core boolean DEFAULT false
)
RETURNS TABLE(supplier_id uuid, modules_added integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT id FROM public.marketplace_suppliers
        WHERE COALESCE(has_erp_crm, false) = true
    LOOP
        supplier_id   := r.id;
        modules_added := public.provision_supplier_erp(r.id, p_only_core);
        RETURN NEXT;
    END LOOP;
END;
$$;

COMMENT ON FUNCTION public.provision_all_suppliers_erp(boolean) IS
  'بيفعّل الموديولات الافتراضية لكل مورّد has_erp_crm=true. مثال: SELECT * FROM provision_all_suppliers_erp();';

COMMIT;

-- =============================================================================
-- التحقق (شغّلها بعد الـCOMMIT للتأكد):
--   SELECT count(*) FROM erp_departments;       -- متوقّع 12
--   SELECT count(*) FROM erp_modules_catalog;   -- متوقّع 39
--   SELECT * FROM v_erp_blueprint;              -- الخريطة المرجعية الكاملة
--   -- تفعيل تجريبي لمورّد مضمونة الأدمن:
--   SELECT provision_supplier_erp('7310f6ef-e474-4ef8-8b8a-388b5e1f5694');
--   SELECT * FROM v_supplier_erp_full_map
--     WHERE supplier_id='7310f6ef-e474-4ef8-8b8a-388b5e1f5694';
-- =============================================================================
