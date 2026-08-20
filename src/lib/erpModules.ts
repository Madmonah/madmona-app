// src/lib/erpModules.ts
// قائمة موديولات (تبويبات) لوحة business-finance — مصدر واحد للتحكم في الإظهار/الإخفاء.
// ⚠️ لازم تفضل متطابقة مع MODULE_REGISTRY في
//    src/app/admin/business-finance/[supplierId]/page.tsx (نفس الـ href و v).
// تبويب "الموديولات" في settings بيستخدم القائمة دي عشان يفتح/يقفل لكل بيزنس.

export type VKey =
  | 'core' | 'beauty_salon' | 'polyclinic' | 'restaurant' | 'contracting' | 'vehicle_agency'

export const VERTICAL_ALIAS: Record<string, VKey> = {
  beauty_salon: 'beauty_salon', spa: 'beauty_salon',
  polyclinic: 'polyclinic', clinic: 'polyclinic',
  restaurant: 'restaurant',
  vehicle_agency: 'vehicle_agency', auto: 'vehicle_agency',
  // معارض بيع السيارات — نفس موديولات المركبات (المعرض · الاستيراد · الكتالوج)
  car_showroom: 'vehicle_agency', cars: 'vehicle_agency',
  contracting: 'contracting', construction: 'contracting',
}

export type ModuleDef = { href: string; label: string; primary?: boolean; v: VKey[] }

export const MODULE_DEFS: ModuleDef[] = [
  { href: 'confirmations',      label: 'التأكيدات',        primary: true, v: ['core'] },
  { href: 'links',              label: 'كل اللينكات',                     v: ['core'] },
  { href: 'dashboard',          label: 'Dashboard',        primary: true, v: ['core'] },
  { href: 'team',               label: 'الفريق',                          v: ['core'] },
  // 🔐 (٢٠ أغسطس ٢٠٢٦) صلاحيات موظفي البيزنس — جوّه لوحة البيزنس نفسه.
  //    محمد: «صلاحيات موظفين الـB2B أو أي بيزنس B2B يكون داخل تاب الـB2B».
  //    قبل كده كانت في صفحة واحدة عامة لكل شركات المنصة مع بعض.
  { href: 'permissions',        label: 'الصلاحيات',        primary: true, v: ['core'] },
  { href: 'requests',           label: 'طلبات الموظفين',   primary: true, v: ['core'] },
  { href: 'custody',            label: 'العهدة',                          v: ['core'] },
  { href: 'flow-tasks',         label: 'المهام',                          v: ['core'] },
  { href: 'branches',           label: 'الفروع',                          v: ['core'] },
  { href: 'customers',          label: 'العملاء',                         v: ['core'] },
  { href: 'expenses',           label: 'المصاريف',                        v: ['core'] },
  { href: 'accounting',         label: 'الحسابات والقيود', primary: true, v: ['core'] },
  { href: 'attendance',         label: 'الحضور',                          v: ['core'] },
  { href: 'attendance-devices', label: 'أجهزة البصم',                     v: ['core'] },
  { href: 'cash-recon',         label: 'جرد الكاش',                       v: ['core'] },
  { href: 'payroll',            label: 'المرتبات',                        v: ['core'] },
  { href: 'documents',          label: 'المستندات',                       v: ['core'] },
  { href: 'audit-log',          label: 'سجل التعديلات',                   v: ['core'] },
  { href: 'at-risk',            label: 'عملاء في خطر',                    v: ['core'] },
  { href: 'reports',            label: 'تصدير تقارير',                    v: ['core'] },
  { href: 'vat-report',         label: 'VAT Report',                      v: ['core'] },
  { href: 'whatsapp-campaigns', label: 'WhatsApp',                        v: ['core'] },
  { href: 'promotions',         label: 'العروض',                          v: ['core'] },
  { href: 'inventory',          label: 'المخزون',                         v: ['core'] },
  { href: 'vendors',            label: 'الموردين',                        v: ['core'] },
  { href: 'purchase-orders',    label: 'طلبات شراء',                      v: ['core'] },
  { href: 'bookings',           label: 'إدارة الحجوزات',                  v: ['beauty_salon', 'vehicle_agency'] },
  { href: 'services-catalog',   label: 'قائمة الخدمات / المنيو',          v: ['beauty_salon', 'vehicle_agency', 'restaurant'] },
  { href: 'services',           label: 'ربط خدمة-منتج',                   v: ['beauty_salon', 'vehicle_agency'] },
  { href: 'shifts',             label: 'مواعيد العمل',                    v: ['beauty_salon', 'polyclinic'] },
  { href: 'waitlist',           label: 'قائمة الانتظار',                  v: ['beauty_salon', 'polyclinic'] },
  { href: 'appointments',       label: 'المواعيد',                        v: ['polyclinic'] },
  { href: 'quote-orders',       label: 'طلبات التسعير',    primary: true, v: ['restaurant'] },
  { href: 'showroom',           label: 'المعرض',           primary: true, v: ['vehicle_agency'] },
  { href: 'import',             label: 'الاستيراد',        primary: true, v: ['vehicle_agency'] },
  { href: 'workshop',           label: 'الورشة',                          v: ['vehicle_agency'] },
  { href: 'brands',             label: 'التوكيلات',                       v: ['vehicle_agency'] },
  { href: 'catalog',            label: 'الكتالوج',         primary: true, v: ['vehicle_agency'] },
  { href: 'projects',           label: 'المشاريع',         primary: true, v: ['contracting'] },
  { href: 'payment-certificates', label: 'المستخلصات',     primary: true, v: ['contracting'] },
  { href: 'boq',                label: 'جدول الكميات',                    v: ['contracting'] },
  { href: 'variation-orders',   label: 'أوامر التغيير',                   v: ['contracting'] },
  { href: 'guarantees',         label: 'خطابات الضمان',                   v: ['contracting'] },
  { href: 'subcontractors',     label: 'مقاولي الباطن',                   v: ['contracting'] },
  { href: 'assignments',        label: 'المأموريات',                      v: ['contracting'] },
  { href: 'custody-projects',   label: 'العُهد',                          v: ['contracting'] },
  { href: 'advances',           label: 'السُّلف',                         v: ['contracting'] },
  { href: 'equipment',          label: 'المعدات',                         v: ['contracting'] },
  { href: 'pnl',                label: 'ربحية المشاريع',   primary: true, v: ['contracting'] },
  { href: 'expenses-projects',  label: 'مصروفات المشاريع',                v: ['contracting'] },
  { href: 'collections',        label: 'التحصيل',          primary: true, v: ['contracting'] },
  { href: 'tenders',            label: 'المناقصات',                       v: ['contracting'] },
  { href: 'milestones',         label: 'الجدول الزمني',                   v: ['contracting'] },
  { href: 'daily-reports',      label: 'يومية الموقع',                    v: ['contracting'] },
  { href: 'material-requests',  label: 'طلبات المواد',                    v: ['contracting'] },
  { href: 'inspections',        label: 'الفحص والاستلام',                 v: ['contracting'] },
  { href: 'equipment-logs',     label: 'صيانة المعدات',                   v: ['contracting'] },
  { href: 'company-docs',       label: 'سجلات الشركة',                    v: ['contracting'] },
]

// الموديولات اللي تخص بيزنس حسب نشاطه (core + الـvertical بتاعه)
export function modulesForIndustry(industry: string | null | undefined): ModuleDef[] {
  const vk = (VERTICAL_ALIAS[(industry || '').toLowerCase()] || '') as VKey
  return MODULE_DEFS.filter(m => m.v.includes('core') || (vk && m.v.includes(vk)))
}
