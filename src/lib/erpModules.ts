// src/lib/erpModules.ts
// قائمة موديولات (تبويبات) لوحة business-finance — مصدر واحد للتحكم في الإظهار/الإخفاء.
// ⚠️ لازم تفضل متطابقة مع MODULE_REGISTRY في
//    src/app/admin/business-finance/[supplierId]/page.tsx (نفس الـ href و v).
// تبويب "الموديولات" في settings بيستخدم القائمة دي عشان يفتح/يقفل لكل بيزنس.

export type VKey =
  | 'core' | 'beauty_salon' | 'polyclinic' | 'restaurant' | 'contracting' | 'vehicle_agency'
  | 'real_estate' | 'retail' | 'factory' | 'tourism' | 'marine' | 'home_services' | 'gym'

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
  /* 🧩 (٢٤ أغسطس ٢٦) محمد: «قلنا هنعمل موديل لكل نوع بيزنس — هل ده حصل؟»
     الجرد كشف ٦ أنشطة كانت واقعة على الأساس المشترك بس من غير موديولات
     نشاطها (حجوزات/كتالوج/مواعيد). اتسدّت بإعادة استخدام الموديولات
     الموجودة — صفر صفحات جديدة، صفر نسخ موازية. */
  retail: 'retail', retail_shop: 'retail', shop: 'retail', store: 'retail',
  factory: 'factory', manufacturing: 'factory', factories: 'factory',
  tourism: 'tourism', hotel: 'tourism', travel: 'tourism',
  marine: 'marine', marine_rentals: 'marine', boats: 'marine', yachts: 'marine',
  home_services: 'home_services', services: 'home_services', maintenance: 'home_services',
  gym: 'gym', fitness: 'gym',

  // 🌍 (٩/٩/٢٠٢٦) محمد: «لوحة التحكم في النشاط التجاري محتاج إنها تفتح
  //    الموديولات الكاملة لأنها بتلخبط العميل — بيضيف المنتج ومش بيتصنف
  //    ده تبع إيه».
  //    🐞 الجذر: `suppliers.industry` مخزّن **بالعربي حر** في أغلب الصفوف
  //    (قياس ٩/٩: «مطوّر عقاري» ١٢٢ · «مواد بناء وتشطيبات» ٥٣ · «مطاعم» ٣ …
  //    و١٠٤ صف فاضي) — والخريطة دي كانت بمفاتيح إنجليزي بس. فالنتيجة
  //    `vk = ''` لحوالي ٩٠٪ من الموردين، ومايشوفوش غير الموديولات الأساسية.
  'مطوّر عقاري': 'real_estate', 'مطور عقاري': 'real_estate',
  'تطوير عقاري': 'real_estate', 'عقارات': 'real_estate', 'وساطة عقارية': 'real_estate',
  'مواد بناء وتشطيبات': 'contracting', 'مقاولات': 'contracting', 'تشطيبات': 'contracting',
  'مطاعم': 'restaurant', 'مطعم': 'restaurant',
  'كافيهات ومشروبات': 'restaurant', 'كافيه': 'restaurant',
  'صالون': 'beauty_salon', 'صالونات': 'beauty_salon', 'تجميل': 'beauty_salon',
  'عيادة': 'polyclinic', 'عيادات': 'polyclinic',
  'معرض سيارات': 'vehicle_agency', 'سيارات': 'vehicle_agency',
  'غسيل وتلميع سيارات': 'vehicle_agency',
  'مصنع': 'factory', 'مصانع': 'factory', 'صناعة': 'factory',
  'سياحة': 'tourism', 'فنادق': 'tourism',
  'الإيجارات': 'retail', 'متجر': 'retail', 'محل': 'retail',
  'خدمات منزلية': 'home_services', 'صيانة': 'home_services',
  'جيم': 'gym',
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
  // 🧭 (٦/٩/٢٠٢٦) محمد: «هو محتاج توجيه — مش هيعرف يضيف موظف إلا لما يضيف فرع»
  { href: 'setup',              label: '🧭 كمّل شركتك',                  v: ['core'] },
  { href: 'links',              label: 'كل اللينكات',                     v: ['core'] },
  // 🤖 (٦/٩/٢٠٢٦) محمد: «نفعّله بحيث يرشّح منتجات البيزنس ويظبط ليه الليد»
  { href: 'whatsapp',           label: '🤖 بوت الواتساب',                 v: ['core'] },
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
  // 🚚 (١٢ سبتمبر ٢٠٢٦) محمد: «هل بند المواصلات وأوامر تشغيل السيارات والشحن معمول حسابه في الموديل؟» — ماكانوش.
  //    سيارات الشركة · أمر تشغيل لكل مشوار (بنزين · بدل · كيلومترات → مصروف «مواصلات» لوحده) · شحنات العملاء.
  { href: 'transport',          label: 'النقل والشحن',                    v: ['core'] },
  { href: 'flow-tasks',         label: 'المهام',                          v: ['core'] },
  // 🗓️ (٢٥ أغسطس ٢٠٢٦) محمد: «عايز أشوف التاسكات دي للمراجعة وعايزها
  //    تكون updated». «المهام» بتعرض تاسكات يوم بعينه، دي بتعرض **القالب**
  //    اللي بيتولّد منه كل يوم — الميعاد والأيام والأولوية لكل موظف.
  { href: 'schedule',           label: 'جدول التاسكات اليومي', primary: true, v: ['core'], perm: 'can_manage_team' },
  // 📺 (٢٥ أغسطس ٢٠٢٦) محمد: «محتاج أداة تعمل مونيتور» — الصورة الحية:
  //    مين حاضر، وكل واحد واقف فين في خطته دلوقتي. بيتحدث كل دقيقة.
  { href: 'monitor',            label: 'المونيتور',            primary: true, v: ['core'], perm: 'can_manage_team' },
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
  // 🧭 (٩/٩/٢٠٢٦) محمد: «خلي كل حاجة تودّي على اللوحة الكاملة». الشاشات دي
  //    كانت عايشة بره اللوحة في /supplier/erp/* (٢٨/٨) — بقت موديولات هنا.
  // 🧩 (٩/٩/٢٠٢٦ — آخر الليل) محمد: «تاب منتجات وخدمات وتاب تاني قائمة الخدمات وتاب تاني خدمات —
  //    الاتنين عاملين تعارض». شاشة واحدة «المنتجات والخدمات» (تابين جوّاها: منتجات · خدمات)
  //    فيها «سجّل بيع» يدوي. «قائمة الخدمات» بقت جوّه نفس الشاشة، و«ربط خدمة-منتج» اتسمّت بوضوح.
  { href: 'products',           label: 'المنتجات والخدمات', primary: true, v: ['core'], perm: 'can_manage_inventory' },
  { href: 'marketplace-catalog',label: 'اللي يظهر في السوق',              v: ['core'], perm: 'can_manage_inventory' },
  // 🧱 (٩/٩) الخامات (المنتج الأولي) بقت تاب جوّه «المنتجات والخدمات» — الراوت /materials شغال، بس من غير تاب مكرر
  { href: 'production',         label: 'أوامر التشغيل',                   v: ['factory', 'restaurant', 'contracting'] },
  { href: 'media',              label: 'الصور',                           v: ['core'] },
  { href: 'vendors',            label: 'الموردين',                        v: ['core'] },
  { href: 'purchase-orders',    label: 'طلبات شراء',                      v: ['core'] },
  { href: 'bookings',           label: 'إدارة الحجوزات',                  v: ['beauty_salon', 'vehicle_agency', 'real_estate', 'tourism', 'marine', 'home_services', 'gym'], perm: 'can_manage_bookings' },
  { href: 'services',           label: 'استهلاك الخدمة من المخزون',       v: ['beauty_salon', 'vehicle_agency'], perm: 'can_manage_services' },
  { href: 'shifts',             label: 'مواعيد العمل',                    v: ['beauty_salon', 'polyclinic', 'gym', 'home_services'] },
  { href: 'waitlist',           label: 'قائمة الانتظار',                  v: ['beauty_salon', 'polyclinic'], perm: 'can_manage_bookings' },
  { href: 'appointments',       label: 'المواعيد',                        v: ['polyclinic'], perm: 'can_manage_bookings' },
  { href: 'quote-orders',       label: 'طلبات التسعير',    primary: true, v: ['restaurant', 'factory'] },
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

// 🏛️ (٩/٩/٢٠٢٦ — آخر الليل) محمد: «ليه فاتح كل التابات لمضمونة؟ تابات مضمونة تخص بيزنس وشغل
//    مضمونة اللي هو العمولات من الماركتبليس ونظام الاشتراكات — ده اللي يكون ظاهر لحد ما أقولك
//    إن عندنا نشاط جديد». لوحة مضمونة نفسها = الفلوس (عمولات · حسابات · مصاريف · كاش · مرتبات)
//    + الفريق (حضور · تاسكات · طلبات · عهد · صلاحيات) + العملاء (CRM). مفيش منتجات/خدمات/حجوزات.
export const PLATFORM_SUPPLIER_ID = 'c8b7b9d7-6178-4d0c-abdf-66f34b628e9d'
export const PLATFORM_MODULE_KEYS = [
  'dashboard', 'accounting', 'expenses', 'cash-recon', 'payroll', 'reports', 'vat-report',
  'team', 'permissions', 'requests', 'custody', 'schedule', 'monitor', 'attendance', 'attendance-devices', 'flow-tasks',
  'crm', 'customers', 'at-risk', 'documents', 'audit-log', 'identity', 'branches', 'links',
]
export function modulesForPlatform(): ModuleDef[] {
  return MODULE_DEFS.filter(m => PLATFORM_MODULE_KEYS.includes(m.href))
}

// الموديولات اللي تخص بيزنس حسب نشاطه (core + الـvertical بتاعه)
export function modulesForIndustry(industry: string | null | undefined): ModuleDef[] {
  const vk = verticalOf(industry)
  // 🧭 (٩/٩/٢٠٢٦) نشاط مش متعرّف (فاضي أو مكتوب بشكل مش في الخريطة) =
  //    **نفتح كل الموديولات** بدل الأساسية بس. صاحب البيزنس بيلخبط لما
  //    يضيف منتج ومايلاقيش الشاشة اللي بتصنّفه. المعروف نشاطه بياخد
  //    لوحته المفصّلة زي ما هي.
  if (!vk) return MODULE_DEFS
  return MODULE_DEFS.filter(m => m.v.includes('core') || m.v.includes(vk))
}

/** الفيرتيكال المعتمد لأي كتابة للنشاط (إنجليزي أو عربي) — مصدر واحد. */
export function verticalOf(industry: string | null | undefined): VKey | '' {
  const raw = String(industry ?? '').trim()
  if (!raw) return ''
  return (VERTICAL_ALIAS[raw] || VERTICAL_ALIAS[raw.toLowerCase()] || '') as VKey | ''
}
