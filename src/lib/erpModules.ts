// src/lib/erpModules.ts
// قائمة موديولات (تبويبات) لوحة business-finance — مصدر واحد للتحكم في الإظهار/الإخفاء.
// ⚠️ لازم تفضل متطابقة مع MODULE_REGISTRY في
//    src/app/admin/business-finance/[supplierId]/page.tsx (نفس الـ href و v).
// تبويب "الموديولات" في settings بيستخدم القائمة دي عشان يفتح/يقفل لكل بيزنس.

export type VKey =
  | 'core' | 'beauty_salon' | 'polyclinic' | 'restaurant' | 'contracting' | 'vehicle_agency'
  | 'real_estate'

export const VERTICAL_ALIAS: Record<string, VKey> = {
  beauty_salon: 'beauty_salon', spa: 'beauty_salon',
  polyclinic: 'polyclinic', clinic: 'polyclinic',
  restaurant: 'restaurant',
  vehicle_agency: 'vehicle_agency', auto: 'vehicle_agency',
  // معارض بيع السيارات — نفس موديولات المركبات (المعرض · الاستيراد · الكتالوج)
  car_showroom: 'vehicle_agency', cars: 'vehicle_agency',
  contracting: 'contracting', construction: 'contracting',
  // 🏠 (٢٤ أغسطس ٢٦) محمد: «وريني أحلى موديل لإدارة بيزنس عقاري في مصر».
  //    أكبر نشاط على المنصة (٢٢٩٥ رقم CRM) ومكانش ليه اسطمبة أصلاً.
  real_estate: 'real_estate', realestate: 'real_estate',
  properties: 'real_estate', brokerage: 'real_estate', developer: 'real_estate',
}

// 🔐 (٢٠ أغسطس ٢٠٢٦) `perm` = مفتاح الصلاحية المطلوبة عشان الموديول ده يفتح.
//    محمد: «عايز التاب بتاع الفاينانس يفتح لأي موظف طبقًا لصلاحيته».
//    • صاحب البيزنس وأدمن المنصة بيعدّوا من غير أي فحص.
//    • الموظف بيشوف الموديول بس لو المفتاح ده مفتوح له في صلاحياته.
//    • موديول من غير `perm` = مفتوح لأي عضو في البيزنس.
//    المفاتيح دي هي نفسها اللي في `permission_catalog` — مفيش أسماء مخترعة.
export type ModuleDef = { href: string; label: string; primary?: boolean; v: VKey[]; perm?: string }

export const MODULE_DEFS: ModuleDef[] = [
  { href: 'confirmations',      label: 'التأكيدات',        primary: true, v: ['core'] },
  { href: 'links',              label: 'كل اللينكات',                     v: ['core'] },
  // 📊 (٢٠ أغسطس ٢٠٢٦) كان اسمه «Dashboard» بالإنجليزي، وبيظهر جنب زرار
  //    اسمه «لوحة الإدارة» — اسمين مختلفين لنفس المكان، ومحمد سأل عن الفرق
  //    بينهم: «إيه الفرق بين الداشبورد ولوحة الإدارة اللي موجودة في حسابي؟».
  //    مفيش فرق — ده تاب **جوّه** لوحة الإدارة. فبقى «نظرة عامة»، واللوحة
  //    نفسها هي «لوحة الإدارة». اسم واحد لكل حاجة.
  { href: 'dashboard',          label: 'نظرة عامة',        primary: true, v: ['core'] },
  // 🎨 (٢١ أغسطس ٢٠٢٦) محمد: «لو مش موجود ليها تاب في الداشبورد ضيفها».
  //    الهوية كانت مدفونة جوّه «إعدادات ← الهوية». بقت تاب أساسي —
  //    دي أول حاجة العميل بيشوفها في صفحة البيزنس، مش إعداد جانبي.
  { href: 'identity',           label: 'هوية البيزنس',     primary: true, v: ['core'] },
  { href: 'team',               label: 'الفريق',                          v: ['core'], perm: 'can_manage_team' },
  // 🔐 (٢٠ أغسطس ٢٠٢٦) صلاحيات موظفي البيزنس — جوّه لوحة البيزنس نفسه.
  //    محمد: «صلاحيات موظفين الـB2B أو أي بيزنس B2B يكون داخل تاب الـB2B».
  //    قبل كده كانت في صفحة واحدة عامة لكل شركات المنصة مع بعض.
  { href: 'permissions',        label: 'الصلاحيات',        primary: true, v: ['core'], perm: 'can_manage_team' },
  { href: 'requests',           label: 'طلبات الموظفين',   primary: true, v: ['core'] },
  { href: 'custody',            label: 'العهدة',                          v: ['core'] },
  { href: 'flow-tasks',         label: 'المهام',                          v: ['core'] },
  { href: 'branches',           label: 'الفروع',                          v: ['core'], perm: 'can_manage_branches' },
  { href: 'customers',          label: 'العملاء',                         v: ['core'], perm: 'can_manage_customers' },
  { href: 'expenses',           label: 'المصاريف',                        v: ['core'], perm: 'can_view_finance' },
  { href: 'accounting',         label: 'الحسابات والقيود', primary: true, v: ['core'], perm: 'can_view_finance' },
  { href: 'attendance',         label: 'الحضور',                          v: ['core'] },
  { href: 'attendance-devices', label: 'أجهزة البصم',                     v: ['core'] },
  { href: 'cash-recon',         label: 'جرد الكاش',                       v: ['core'], perm: 'can_view_finance' },
  { href: 'payroll',            label: 'المرتبات',                        v: ['core'], perm: 'can_view_finance' },
  { href: 'documents',          label: 'المستندات',                       v: ['core'] },
  { href: 'audit-log',          label: 'سجل التعديلات',                   v: ['core'] },
  { href: 'at-risk',            label: 'عملاء في خطر',                    v: ['core'], perm: 'can_manage_customers' },
  { href: 'reports',            label: 'تصدير تقارير',                    v: ['core'], perm: 'can_view_reports' },
  { href: 'vat-report',         label: 'VAT Report',                      v: ['core'], perm: 'can_view_finance' },
  // 🤝 (٢٠ أغسطس ٢٠٢٦) تاب الواتساب اتشال وبقى CRM.
  //    محمد: «شيل تاب الواتساب اللي في إدارة البيزنس وخليه نظام CRM بيتابع
  //    منه صاحب البيزنس العميل بتاعه». القديم كان بيعرض إحصائيات حملات
  //    ومكتوب فيه «الصفحة دي للمتابعة وإلا» — شاشة قراءة مالهاش فعل.
  { href: 'crm',                label: 'متابعة العملاء',   primary: true, v: ['core'], perm: 'can_manage_customers' },
  { href: 'promotions',         label: 'العروض',                          v: ['core'] },
  { href: 'inventory',          label: 'المخزون',                         v: ['core'], perm: 'can_manage_inventory' },
  { href: 'vendors',            label: 'الموردين',                        v: ['core'] },
  { href: 'purchase-orders',    label: 'طلبات شراء',                      v: ['core'] },
  { href: 'bookings',           label: 'إدارة الحجوزات',                  v: ['beauty_salon', 'vehicle_agency', 'real_estate'], perm: 'can_manage_bookings' },
  { href: 'services-catalog',   label: 'قائمة الخدمات / المنيو',          v: ['beauty_salon', 'vehicle_agency', 'restaurant'], perm: 'can_manage_services' },
  { href: 'services',           label: 'ربط خدمة-منتج',                   v: ['beauty_salon', 'vehicle_agency'], perm: 'can_manage_services' },
  { href: 'shifts',             label: 'مواعيد العمل',                    v: ['beauty_salon', 'polyclinic'] },
  { href: 'waitlist',           label: 'قائمة الانتظار',                  v: ['beauty_salon', 'polyclinic'], perm: 'can_manage_bookings' },
  { href: 'appointments',       label: 'المواعيد',                        v: ['polyclinic'], perm: 'can_manage_bookings' },
  { href: 'quote-orders',       label: 'طلبات التسعير',    primary: true, v: ['restaurant'] },
  { href: 'showroom',           label: 'المعرض',           primary: true, v: ['vehicle_agency'] },
  { href: 'import',             label: 'الاستيراد',        primary: true, v: ['vehicle_agency'] },
  { href: 'workshop',           label: 'الورشة',                          v: ['vehicle_agency'] },
  { href: 'brands',             label: 'التوكيلات',                       v: ['vehicle_agency'] },
  { href: 'catalog',            label: 'الكتالوج',         primary: true, v: ['vehicle_agency'] },
  /* 🏠 اسطمبة العقارات — إعادة استخدام صفحات موجودة فعلاً (مفيش نسخ
     موازية): المشاريع = الكمبوندات والمشاريع اللي المكتب شغال عليها،
     التحصيل = أقساط وعمولات مستحقة، الجدول الزمني = مواعيد التسليمات،
     الحجوزات = المعاينات المحجوزة من المنصة. الجديد الوحيد: «الوحدات»
     — لأنه فعلاً محتاج شاشة خاصة (وحدات المكتب = إعلاناته). */
  { href: 'units',              label: 'الوحدات',          primary: true, v: ['real_estate'] },
  { href: 'projects',           label: 'المشاريع',         primary: true, v: ['contracting', 'real_estate'] },
  { href: 'payment-certificates', label: 'المستخلصات',     primary: true, v: ['contracting'] },
  { href: 'boq',                label: 'جدول الكميات',                    v: ['contracting'] },
  { href: 'variation-orders',   label: 'أوامر التغيير',                   v: ['contracting'] },
  { href: 'guarantees',         label: 'خطابات الضمان',                   v: ['contracting'] },
  { href: 'subcontractors',     label: 'مقاولي الباطن',                   v: ['contracting'] },
  { href: 'assignments',        label: 'المأموريات',                      v: ['contracting'] },
  { href: 'custody-projects',   label: 'العُهد',                          v: ['contracting'] },
  { href: 'advances',           label: 'السُّلف',                         v: ['contracting'], perm: 'can_view_finance' },
  { href: 'equipment',          label: 'المعدات',                         v: ['contracting'] },
  { href: 'pnl',                label: 'ربحية المشاريع',   primary: true, v: ['contracting', 'real_estate'], perm: 'can_view_finance' },
  { href: 'expenses-projects',  label: 'مصروفات المشاريع',                v: ['contracting'], perm: 'can_view_finance' },
  { href: 'collections',        label: 'التحصيل',          primary: true, v: ['contracting', 'real_estate'], perm: 'can_view_finance' },
  { href: 'tenders',            label: 'المناقصات',                       v: ['contracting'] },
  { href: 'milestones',         label: 'الجدول الزمني',                   v: ['contracting', 'real_estate'] },
  { href: 'daily-reports',      label: 'يومية الموقع',                    v: ['contracting'] },
  { href: 'material-requests',  label: 'طلبات المواد',                    v: ['contracting'] },
  { href: 'inspections',        label: 'الفحص والاستلام',                 v: ['contracting'] },
  { href: 'equipment-logs',     label: 'صيانة المعدات',                   v: ['contracting'] },
  { href: 'company-docs',       label: 'سجلات الشركة',                    v: ['contracting', 'real_estate'] },
]

// 🔐 مفتاح الصلاحية المطلوب لموديول معيّن (null = مفتوح لأي عضو في البيزنس)
export function modulePermission(href: string): string | null {
  return MODULE_DEFS.find(m => m.href === href)?.perm ?? null
}

/**
 * هل اليوزر ده يقدر يفتح الموديول ده؟
 * @param href   اسم الموديول في الرابط (مثلاً 'accounting')
 * @param full   صاحب البيزنس أو أدمن المنصة — بيعدّي من غير فحص
 * @param perms  صلاحيات الموظف زي ما هي متخزّنة (من `my_supplier_access`)
 */
export function canOpenModule(
  href: string,
  full: boolean,
  perms: Record<string, boolean> | null | undefined,
): boolean {
  if (full) return true
  const need = modulePermission(href)
  if (!need) return true
  return perms?.[need] === true
}

// الموديولات اللي تخص بيزنس حسب نشاطه (core + الـvertical بتاعه)
export function modulesForIndustry(industry: string | null | undefined): ModuleDef[] {
  const vk = (VERTICAL_ALIAS[(industry || '').toLowerCase()] || '') as VKey
  return MODULE_DEFS.filter(m => m.v.includes('core') || (vk && m.v.includes(vk)))
}
