'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import {
  Loader2, MapPin, Calendar, ChevronLeft, Scissors, Clock, Sparkles, User,
  ChevronDown, MessageCircle, ShieldCheck, Image as ImageIcon, Crown, Wind,
  Brush, Hand, Flower2, Building2, Stethoscope, Utensils, Briefcase,
  Wrench, Car, ShoppingBag, Home, Factory, Plane,
} from 'lucide-react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

const fmt = (n: any) => Number(n || 0).toLocaleString('ar-EG')

// gallery items can be plain url strings or { url, caption }
const galUrl = (g: any) => (typeof g === 'string' ? g : g?.url || '')
const galCap = (g: any) => (typeof g === 'string' ? '' : g?.caption || '')

/* ============================================================
 * PER-MERCHANT THEME LAYER  (added 20 Jun 2026)
 * نفس الستورفرنت بيدعم أكتر من هوية بصرية. الافتراضي = هوية مضمونة
 * (كريمي/أخضر). ثيم 'dark' = أسود/أحمر أوتوموتيف (سعداوي جراج).
 * ربط التاجر بالثيم عن طريق slug (TODO: ينتقل للداتا لاحقًا = dynamic).
 * تغيير الثيم لتاجر = سطر واحد هنا، من غير ما يلمس باقي العملاء.
 * ============================================================ */
type ThemeKey = 'default' | 'dark'
const THEME_BY_SLUG: Record<string, ThemeKey> = { sa3dawy: 'dark' }

interface Theme {
  pageBg: string
  barBg: string; barBorder: string; barText: string; barTag: string
  accent: string; accentSoft: string
  gCta: string; gCover: string; gSoft: string; heroOverlay: string
  trustBg: string; trustBorder: string; trustText: string; trustStrong: string; trustIcoBg: string; trustIco: string
}

const THEMES: Record<ThemeKey, Theme> = {
  // هوية مضمونة الافتراضية — مطابقة للقديم بالظبط
  default: {
    pageBg: '#FAFAF7',
    barBg: '#FFFFFF', barBorder: 'rgba(250, 129, 37,.10)', barText: '#059669', barTag: '#059669',
    accent: '#059669', accentSoft: 'rgba(250, 129, 37,.10)',
    gCta: 'linear-gradient(100deg,#d4a017 0%,#2FA084 55%,#059669 100%)',
    gCover: 'linear-gradient(135deg,#1d6253 0%,#2FA084 70%,#6FCF97 100%)',
    gSoft: 'linear-gradient(135deg,rgba(250, 129, 37,.10),rgba(212,160,23,.13))',
    heroOverlay: 'linear-gradient(180deg,rgba(8,26,21,.18) 0%,rgba(8,26,21,.10) 35%,rgba(8,26,21,.80) 100%)',
    trustBg: '#FFFFFF', trustBorder: 'rgba(250, 129, 37,.15)', trustText: '#6B7280', trustStrong: '#1A2E26',
    trustIcoBg: 'rgba(250, 129, 37,.10)', trustIco: '#059669',
  },
  // هوية سعداوي — أسود/أحمر أوتوموتيف
  dark: {
    pageBg: '#FFFFFF',
    barBg: '#0A0A0A', barBorder: '#1f1f22', barText: '#FFFFFF', barTag: '#9a9a9e',
    accent: '#E4002B', accentSoft: 'rgba(228,0,43,.12)',
    gCta: 'linear-gradient(90deg,#E4002B 0%,#b00020 100%)',
    gCover: 'radial-gradient(120% 90% at 80% 0%, rgba(228,0,43,.22), transparent 55%), linear-gradient(180deg,#121214 0%,#0A0A0A 60%,#0A0A0A 100%)',
    gSoft: 'linear-gradient(135deg,rgba(228,0,43,.12),rgba(228,0,43,.05))',
    heroOverlay: 'linear-gradient(180deg,rgba(0,0,0,.20) 0%,rgba(0,0,0,.10) 35%,rgba(0,0,0,.82) 100%)',
    trustBg: '#101012', trustBorder: '#1f1f22', trustText: '#cfcfd4', trustStrong: '#FFFFFF',
    trustIcoBg: 'rgba(228,0,43,.16)', trustIco: '#E4002B',
  },
}

/* ============================================================
 * VERTICAL-AWARE STOREFRONT  (page created 7 Jun 2026 — vertical-aware 9 Jun 2026)
 * نفس الصفحة بتخدم كل المجالات: صالون / عيادة / مطعم / مركبات / عام.
 * بتتفرّع حسب suppliers.industry — الـ RPC public_salon_landing عام.
 * ============================================================ */

interface VerticalCfg {
  kicker: string
  heroCta: string
  heroCtaIcon: any
  waCta: string
  bookChip: string
  unitWord: string
  galleryHeading: string
  galleryTiles: string[]
  branchesHeading: string
  branchCta: string
  servicesHeading: string
  servicesIcon: any
  teamHeading: string
  accountSub: string
  coverBadge: string
  catLabels: Record<string, string>
  catIcons: Record<string, any>
// 🏷️ (٤ سبتمبر ٢٠٢٦) تيست الاستور: صالون تجميل ومطعم كانوا بيقولوا
//    «المنتجات · ١ منتج للبيع · تسوّق». `productsHeading` كان معرّف
//    لتلات أنشطة بس (عربيات · عقارات · مصانع) والباقي بيقع على
//    «المنتجات» العام. أضفناه للباقي بلغة نشاطه.
  /** عنوان كارت المنتجات — لو فاضي بنقع على الافتراضي القديم */
  productsHeading?: string
  /** وحدة العدّ: «منتج» · «صنف» · «خدمة» … */
  productsUnit?: string
}

// salon-specific category maps (used only by the beauty_salon preset)
const SALON_CAT_LABELS: Record<string, string> = {
  hair_cut: 'قص شعر', hair_color: 'صبغة', hair_treatment: 'علاج شعر', styling: 'سشوار / تسريحة', hair: 'شعر وصبغة',
  makeup: 'مكياج', bridal: 'عرايس', nails: 'منيكير وبديكير', skin: 'بشرة', spa: 'سبا ومساج',
  package: 'باقات', waxing: 'إزالة شعر', general: 'عام', عام: 'عام',
}
const SALON_CAT_ICONS: Record<string, any> = {
  bridal: Crown, hair: Wind, hair_cut: Scissors, hair_color: Wind, hair_treatment: Wind,
  styling: Wind, makeup: Brush, nails: Hand, skin: Sparkles, spa: Flower2, package: Crown,
}

const VERTICALS: Record<string, VerticalCfg> = {
  // صالون تجميل — صيغة مؤنثة (Elite وأمثالها)
  beauty_salon: {
    productsHeading: 'الخدمات المعروضة',
    productsUnit: 'خدمة',
    kicker: 'صالون تجميل وسبا',
    heroCta: 'احجزي موعدك', heroCtaIcon: Calendar, waCta: 'تواصلي',
    bookChip: 'حجز فوري', unitWord: 'خدمة',
    galleryHeading: 'معرض الصالون',
    galleryTiles: ['الريسبشن', 'الشغل', 'السبا', 'المكان'],
    branchesHeading: 'احجزي في أقرب فرع ليكي', branchCta: 'احجزي',
    servicesHeading: 'الخدمات والأسعار', servicesIcon: Scissors,
    teamHeading: 'فريقنا',
    accountSub: 'شوفي حجوزاتك، قيّمي، وكرّمي اللي خدمك',
    coverBadge: 'صورة غلاف الصالون',
    catLabels: SALON_CAT_LABELS, catIcons: SALON_CAT_ICONS,
  },
  // عيادة / مركز طبي — صيغة محايدة
  polyclinic: {
    productsHeading: 'الخدمات الطبية المعروضة',
    productsUnit: 'خدمة',
    kicker: 'عيادة ومركز طبي',
    heroCta: 'احجز كشف', heroCtaIcon: Calendar, waCta: 'تواصل معنا',
    bookChip: 'حجز فوري', unitWord: 'خدمة',
    galleryHeading: 'صور العيادة',
    galleryTiles: ['الاستقبال', 'العيادة', 'الانتظار', 'المكان'],
    branchesHeading: 'احجز في أقرب فرع ليك', branchCta: 'احجز',
    servicesHeading: 'التخصصات والأسعار', servicesIcon: Stethoscope,
    teamHeading: 'الأطباء',
    accountSub: 'شوف حجوزاتك، قيّم، وتابع كشوفاتك',
    coverBadge: 'صورة غلاف العيادة',
    catLabels: { general: 'عام', عام: 'عام' }, catIcons: {},
  },
  // مطعم — صيغة محايدة (منيو + حجز ترابيزة)
  restaurant: {
    productsHeading: 'الأصناف المعروضة',
    productsUnit: 'صنف',
    kicker: 'مطعم',
    heroCta: 'احجز ترابيزة', heroCtaIcon: Calendar, waCta: 'اطلب دلفري',
    bookChip: 'حجز فوري', unitWord: 'صنف',
    galleryHeading: 'صور من المطعم',
    galleryTiles: ['المكان', 'من جوه', 'الأطباق', 'الأجواء'],
    branchesHeading: 'احجز في أقرب فرع ليك', branchCta: 'احجز',
    servicesHeading: 'المنيو والأسعار', servicesIcon: Utensils,
    teamHeading: 'الشيف والفريق',
    accountSub: 'شوف حجوزاتك وطلباتك وقيّم تجربتك',
    coverBadge: 'صورة غلاف المطعم',
    catLabels: { general: 'عام', عام: 'عام' }, catIcons: {},
  },
  // توكيلات / جراجات المركبات — موتوسيكلات وعربيات (بيع / صيانة / إكسسوارات)
  vehicle_agency: {
    kicker: 'صيانة وخدمات الموتوسيكلات',
    heroCta: 'احجز ميعاد', heroCtaIcon: Calendar, waCta: 'كلّمنا',
    bookChip: 'حجز فوري', unitWord: 'خدمة',
    galleryHeading: 'صور من المكان',
    galleryTiles: ['الجراج', 'الورشة', 'الشغل', 'المكان'],
    branchesHeading: 'احجز في أقرب فرع ليك', branchCta: 'احجز',
    servicesHeading: 'الخدمات والأسعار', servicesIcon: Wrench,
    teamHeading: 'الفنيين',
    accountSub: 'شوف حجوزاتك وقيّم الخدمة',
    coverBadge: 'صورة غلاف المكان',
    catLabels: { 'صيانة': 'صيانة وإصلاح', 'تجهيز': 'تجهيز وتلميع', 'بيع': 'بيع مركبات', general: 'عام', 'عام': 'عام' },
    catIcons: { 'صيانة': Wrench, 'تجهيز': Sparkles, 'بيع': Car },
  },
  // 🚗 معارض بيع السيارات — (١٧ أغسطس ٢٠٢٦ — محمد: «هو مش بتاع موتوسيكلات
  //    وانت حطيت اسمه كمعرض موتوسيكلات».) ثيم vehicle_agency كان متفصّل على
  //    عميل جراج الموتوسيكلات، ومعرض الديب (بيع سيارات) ورث كلامه.
  //    ده ثيم منفصل لمعارض العربيات — industry = 'car_showroom'.
  car_showroom: {
    kicker: 'معرض سيارات — بيع واستيراد',
    heroCta: 'اتفرّج على العربيات', heroCtaIcon: Car, waCta: 'اسأل عن عربية',
    // ⚠️ (٢٢ أغسطس ٢٠٢٦ — محمد: «انت عامل معرض وكاتب خدمة!») معرض السيارات
    //    كان بيرث كلام الورشة: الشريط بيقول «١٠ خدمة» والعنوان «خدماتنا».
    //    المعرض بيبيع **عربيات** مش بيقدّم خدمات.
    bookChip: 'معاينة بالمعرض', unitWord: 'عربية',
    galleryHeading: 'صور من المعرض',
    galleryTiles: ['المعرض', 'العربيات', 'من جوه', 'التسليم'],
    branchesHeading: 'زورنا في المعرض', branchCta: 'زور',
    servicesHeading: 'العربيات والأسعار', servicesIcon: Car,
    teamHeading: 'فريق المعرض',
    accountSub: 'تابع معايناتك وطلباتك',
    coverBadge: 'صورة المعرض',
    catLabels: { 'بيع': 'بيع سيارات', 'استيراد': 'استيراد', general: 'عام', 'عام': 'عام' },
    catIcons: { 'بيع': Car },
    productsHeading: 'العربيات المعروضة للبيع',
    productsUnit: 'عربية',
  },
  // مقاولات وتشطيبات — طلب عرض سعر بدل الحجز
  contracting: {
    kicker: 'مقاولات وتشطيبات',
    heroCta: 'اطلب عرض سعر', heroCtaIcon: Briefcase, waCta: 'كلّمنا',
    bookChip: 'عرض سعر مجاني', unitWord: 'خدمة',
    galleryHeading: 'معرض أعمالنا',
    galleryTiles: ['مشاريع', 'تشطيبات', 'تنفيذ', 'تسليم'],
    branchesHeading: 'مكاتبنا', branchCta: 'تواصل',
    servicesHeading: 'خدماتنا والأسعار', servicesIcon: Building2,
    teamHeading: 'الفريق',
    accountSub: 'تابع عروض الأسعار والمشاريع',
    coverBadge: 'صورة من أعمالنا',
    catLabels: { general: 'عام', عام: 'عام' }, catIcons: {},
  },

  // بيع منتجات (أثاث / منزل / إلكترونيات) — تسوّق بدل حجز
  retail: {
    kicker: 'تسوّق أونلاين',
    heroCta: 'اتفرّج على المنتجات', heroCtaIcon: ShoppingBag, waCta: 'اسأل عن منتج',
    bookChip: 'شحن وتوصيل', unitWord: 'منتج',
    galleryHeading: 'من المعرض',
    galleryTiles: ['المنتجات', 'المعرض', 'تفاصيل', 'الجودة'],
    branchesHeading: 'فروعنا', branchCta: 'زور',
    servicesHeading: 'منتجاتنا وأسعارها', servicesIcon: ShoppingBag,
    teamHeading: 'الفريق',
    accountSub: 'تابع طلباتك ومشترياتك',
    coverBadge: 'صورة المعرض',
    catLabels: { general: 'عام', 'عام': 'عام' }, catIcons: {},
  },
  // أي مجال تاني (تكنولوجيا / غير محدد) — محايد عام
  // 🛥️ (٢١ أغسطس ٢٠٢٦) تأجير يخوت ورحلات بحرية — كان بيقع على
  // `default` فيطلع بكلام عام («المكان» · «من جوه» · «احجز في أقرب فرع ليك»)
  // على نشاط بيتأجّر بالساعة وبينطلق من مرسى مش «فرع».
  marine_rentals: {
    productsHeading: 'المراكب المعروضة',
    productsUnit: 'مركب',
    kicker: 'تأجير يخوت ورحلات بحرية',
    heroCta: 'احجز رحلتك', heroCtaIcon: Calendar, waCta: 'اسأل عن يخت',
    bookChip: 'حجز بالساعة', unitWord: 'يخت',
    galleryHeading: 'من على المركب',
    galleryTiles: ['اليخت', 'على البحر', 'من جوّه', 'الرحلة'],
    branchesHeading: 'مكان الانطلاق', branchCta: 'احجز',
    servicesHeading: 'اليخوت والأسعار', servicesIcon: Calendar,
    teamHeading: 'الطاقم',
    accountSub: 'شوف حجوزاتك وقيّم رحلتك',
    coverBadge: 'صورة اليخت',
    catLabels: { general: 'عام', 'عام': 'عام' }, catIcons: {},
  },
  // 🏠 (٢٢ أغسطس ٢٠٢٦ — محمد: «عايز الموديل الكلاود يكون متوافق مع أي نوع
  //    بيزنس عندنا») — راجعنا أقسام الـCRM الـ١٢ ولقينا ٤ منهم مالهمش ثيم،
  //    وبيقعوا على `default` فيطلعوا بكلام عام. أكبرهم **العقارات**:
  //    ٢٢٩٥ رقم في الداتابيز — أكبر قسم عندنا، وكان بيتعرض بـ«احجز الآن».
  //    الأربعة دول هما اللي تحت. دلوقتي كل قسم في الـCRM ليه ثيم حقيقي.
  real_estate: {
    kicker: 'عقارات — بيع وإيجار',
    heroCta: 'اتفرّج على الوحدات', heroCtaIcon: Home, waCta: 'اسأل عن وحدة',
    bookChip: 'معاينة بموعد', unitWord: 'وحدة',
    galleryHeading: 'صور من المشروع',
    galleryTiles: ['الوحدة', 'من جوه', 'الموقع', 'التشطيب'],
    branchesHeading: 'مكاتبنا', branchCta: 'زور',
    servicesHeading: 'الوحدات والأسعار', servicesIcon: Home,
    teamHeading: 'فريق المبيعات',
    accountSub: 'تابع معايناتك والوحدات اللي عجبتك',
    coverBadge: 'صورة المشروع',
    catLabels: {
      'بيع': 'للبيع', 'إيجار': 'للإيجار', 'تمليك': 'تمليك',
      'إداري': 'إداري', 'تجاري': 'تجاري', general: 'عام', 'عام': 'عام',
    },
    catIcons: { 'بيع': Home, 'إيجار': Home, 'إداري': Building2, 'تجاري': Building2 },
    productsHeading: 'الوحدات المعروضة',
    productsUnit: 'وحدة',
  },
  // 🔧 خدمات ومهنيين — سباك، كهربائي، نجار، صيانة، تنظيف، محامي، محاسب.
  //    دي أكتر فئة «شغل من غير محل» — وهي بالظبط اللي الحملة بتكلّمها.
  home_services: {
    productsHeading: 'الخدمات المعروضة',
    kicker: 'خدمات وصيانة — بنيجي لك',
    heroCta: 'اطلب فني', heroCtaIcon: Wrench, waCta: 'كلّمنا دلوقتي',
    bookChip: 'بنيجي لحد عندك', unitWord: 'خدمة',
    galleryHeading: 'من شغلنا',
    galleryTiles: ['قبل', 'بعد', 'التنفيذ', 'التسليم'],
    branchesHeading: 'المناطق اللي بنغطيها', branchCta: 'اطلب',
    servicesHeading: 'الخدمات والأسعار', servicesIcon: Wrench,
    teamHeading: 'الفنيين',
    accountSub: 'تابع طلباتك وقيّم الفني',
    coverBadge: 'صورة من شغلنا',
    catLabels: {
      'صيانة': 'صيانة وإصلاح', 'تركيب': 'تركيب', 'تنظيف': 'تنظيف',
      'استشارة': 'استشارة', general: 'عام', 'عام': 'عام',
    },
    catIcons: { 'صيانة': Wrench, 'تركيب': Wrench, 'تنظيف': Sparkles, 'استشارة': Briefcase },
  },
  // 🏭 مصانع وتوريدات — البيع بالجملة: المشتري بيطلب عرض سعر مش بيحجز.
  factory: {
    kicker: 'مصنع وتوريدات',
    heroCta: 'اطلب عرض سعر', heroCtaIcon: Factory, waCta: 'اطلب كتالوج',
    bookChip: 'توريد بالجملة', unitWord: 'منتج',
    galleryHeading: 'من المصنع',
    galleryTiles: ['خط الإنتاج', 'المنتجات', 'الجودة', 'الشحن'],
    branchesHeading: 'مقر المصنع والمخازن', branchCta: 'تواصل',
    servicesHeading: 'المنتجات وأسعار الجملة', servicesIcon: Factory,
    teamHeading: 'فريق المبيعات والتوريد',
    accountSub: 'تابع عروض الأسعار وأوردراتك',
    coverBadge: 'صورة المصنع',
    catLabels: { 'جملة': 'بالجملة', 'تصنيع': 'تصنيع حسب الطلب', general: 'عام', 'عام': 'عام' },
    catIcons: { 'جملة': ShoppingBag, 'تصنيع': Factory },
    productsHeading: 'المنتجات المتاحة للتوريد',
  },
  // ✈️ سياحة ورحلات وقاعات ومناسبات.
  tourism: {
    productsHeading: 'الرحلات والعروض',
    productsUnit: 'عرض',
    kicker: 'سياحة ورحلات ومناسبات',
    heroCta: 'احجز رحلتك', heroCtaIcon: Plane, waCta: 'اسأل عن برنامج',
    bookChip: 'حجز بمقدّم', unitWord: 'برنامج',
    galleryHeading: 'صور من الرحلات',
    galleryTiles: ['الوجهة', 'الإقامة', 'البرنامج', 'اللحظات'],
    branchesHeading: 'مكاتبنا', branchCta: 'احجز',
    servicesHeading: 'البرامج والأسعار', servicesIcon: Plane,
    teamHeading: 'فريق الحجوزات',
    accountSub: 'شوف حجوزاتك وقيّم رحلتك',
    coverBadge: 'صورة الوجهة',
    catLabels: {
      'داخلي': 'رحلات داخلية', 'خارجي': 'رحلات خارجية',
      'مناسبات': 'قاعات ومناسبات', general: 'عام', 'عام': 'عام',
    },
    catIcons: { 'داخلي': MapPin, 'خارجي': Plane, 'مناسبات': Crown },
  },
  default: {
    kicker: 'احجز أونلاين',
    heroCta: 'احجز الآن', heroCtaIcon: Calendar, waCta: 'تواصل معنا',
    bookChip: 'حجز فوري', unitWord: 'خدمة',
    galleryHeading: 'صور',
    galleryTiles: ['المكان', 'من جوه', 'تفاصيل', 'أجواء'],
    branchesHeading: 'احجز في أقرب فرع ليك', branchCta: 'احجز',
    servicesHeading: 'الخدمات والأسعار', servicesIcon: Briefcase,
    teamHeading: 'الفريق',
    accountSub: 'شوف حجوزاتك وقيّم تجربتك',
    coverBadge: 'صورة الغلاف',
    catLabels: { general: 'عام', عام: 'عام' }, catIcons: {},
  },
}

function getVertical(industry: string | null | undefined): VerticalCfg {
  if (industry === 'beauty_salon') return VERTICALS.beauty_salon
  if (industry === 'polyclinic' || industry === 'clinic') return VERTICALS.polyclinic
  if (industry === 'restaurant' || industry === 'restaurants') return VERTICALS.restaurant
  if (industry === 'car_showroom' || industry === 'cars') return VERTICALS.car_showroom
  if (industry === 'vehicle_agency' || industry === 'auto') return VERTICALS.vehicle_agency
  if (industry === 'contracting' || industry === 'construction') return VERTICALS.contracting
  if (industry === 'retail' || industry === 'furniture' || industry === 'shop') return VERTICALS.retail
  if (industry === 'marine_rentals' || industry === 'yachts') return VERTICALS.marine_rentals
  // (٢٢ أغسطس ٢٠٢٦) الأربعة الجداد — بنقبل مفاتيح الستورفرنت **و**مفاتيح
  // أقسام الـCRM (properties/services/factories/tourism) عشان التاجر اللي
  // جاي من الـCRM يلاقي ثيمه جاهز من غير ما حد يترجم الاسم بالإيد.
  if (industry === 'real_estate' || industry === 'properties' || industry === 'property') return VERTICALS.real_estate
  if (industry === 'home_services' || industry === 'services' || industry === 'maintenance') return VERTICALS.home_services
  if (industry === 'factory' || industry === 'factories' || industry === 'industrial') return VERTICALS.factory
  if (industry === 'tourism' || industry === 'travel' || industry === 'events') return VERTICALS.tourism
  return VERTICALS.default
}

export default function StorefrontPage({ params }: { params: { slug: string } }) {
  const { slug } = params

  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [openCat, setOpenCat] = useState<string | null>(null)
  const [logoOk, setLogoOk] = useState(true)

  /* 🏠 (٢٤ أغسطس ٢٦) محمد: «عايز أشوف صفحة البيزنس الكلاود اللي العميل
     بيشوفها» لنشاط عقاري. ثيم العقارات كان موجود من زمان بس مصدر
     البيانات الوحيد كان services_catalog — والمكتب العقاري وحداته في
     listings. `units` بتجيب الوحدات المنشورة وكروتها بتودّي على صفحة
     الوحدة في الماركتبليس نفسها — مفيش صفحة عرض موازية. */
  const [units, setUnits] = useState<any[]>([])

  useEffect(() => {
    (async () => {
      const [{ data: d }, { data: u }] = await Promise.all([
        supabase.rpc('public_salon_landing', { p_slug: slug }),
        supabase.rpc('public_storefront_listings', { p_slug: slug }),
      ])
      setData(d)
      setUnits(Array.isArray(u) ? u : [])
      setLoading(false)
      // 🏷️ (٤ سبتمبر ٢٠٢٦) عنوان التاب = اسم البيزنس.
      //    الصفحة 'use client' فمالهاش metadata — كان بيقول «مضمونة |
      //    معاملاتك مضمونة…» زي أي صفحة، فصاحب البيزنس اللي بيبعت لينكه
      //    مايشوفش اسمه في التاب ولا في البوكماركس.
      try {
        const nm = (d as { business_name?: string } | null)?.business_name
        if (nm) document.title = `${nm} — مضمونة`
      } catch { /* مايكسرش الصفحة */ }
    })()
  }, [slug])

  // PER-MERCHANT THEME — data-driven (suppliers.theme → RPC) with legacy map / default fallback.
  // إضافة عميل جديد بثيم = صف في الداتا (admin_provision_storefront)، مفيش كود.
  const dbTheme = (data?.theme as Theme | undefined) || undefined
  const fallbackKey: ThemeKey = THEME_BY_SLUG[slug] || 'default'
  const t: Theme = dbTheme || THEMES[fallbackKey]
  const dk = dbTheme ? Boolean((dbTheme as any).dark) : fallbackKey === 'dark'

  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{ background: t.pageBg }}><Loader2 className="w-8 h-8 animate-spin" style={{ color: t.accent }} /></div>

  if (!data?.ok) return (
    <div className="min-h-screen flex items-center justify-center p-4" dir="rtl" style={{ background: t.pageBg }}>
      <div className="text-center"><MapPin className="w-12 h-12 text-[#6B7280] opacity-30 mx-auto mb-2" /><p className="font-bold text-[#1A2E26]">الصفحة مش موجودة</p></div>
    </div>
  )

  /* 🎭 (٢١ أغسطس ٢٠٢٦) نصوص النشاط من الداتابيز الأول، والكود fallback.
     محمد: «اللي تقدر تخليه ديناميك خليه ديناميك».
     `storefront_verticals` صف لكل نشاط — إضافة نشاط جديد بمسمياته بقت
     صف في جدول، مش تعديل كود ونشر. الجدول تحت (`VERTICALS`) فضل موجود
     كشبكة أمان لو الصف اتمسح أو الـRPC رجّعت null. */
  const dbV = data.vertical as Record<string, unknown> | null | undefined
  const base = getVertical(data.industry)
  const v: VerticalCfg = dbV ? {
    ...base,
    kicker:           (dbV.kicker as string)           ?? base.kicker,
    heroCta:          (dbV.hero_cta as string)         ?? base.heroCta,
    waCta:            (dbV.wa_cta as string)           ?? base.waCta,
    bookChip:         (dbV.book_chip as string)        ?? base.bookChip,
    unitWord:         (dbV.unit_word as string)        ?? base.unitWord,
    galleryHeading:   (dbV.gallery_heading as string)  ?? base.galleryHeading,
    galleryTiles:     (dbV.gallery_tiles as string[])?.length
                        ? (dbV.gallery_tiles as string[]) : base.galleryTiles,
    branchesHeading:  (dbV.branches_heading as string) ?? base.branchesHeading,
    branchCta:        (dbV.branch_cta as string)       ?? base.branchCta,
    servicesHeading:  (dbV.services_heading as string) ?? base.servicesHeading,
    teamHeading:      (dbV.team_heading as string)     ?? base.teamHeading,
    accountSub:       (dbV.account_sub as string)      ?? base.accountSub,
    coverBadge:       (dbV.cover_badge as string)      ?? base.coverBadge,
  } : base
  const HeroCtaIcon = v.heroCtaIcon
  const ServicesIcon = v.servicesIcon

  const branches: any[] = data.branches || []
  const services: any[] = data.services || []
  const team: any[] = data.team || []
  const gallery: any[] = (data.gallery || []).filter((g: any) => galUrl(g))
  const cover: string = data.cover_url || ''
  const loc = branches[0]?.district || branches[0]?.address || 'القاهرة'
  // WhatsApp goes to Madmona's business line (AI auto-responder)
  const WA = '201002229982'

  /* 🖼️ (٢٤ أغسطس ٢٠٢٦ — محمد: «لقيت تابات لصور مش عارف بتترفع منين»)
   *
   *  كانت الصفحة بتعرض ٤ مربعات وهمية بعناوين ثابتة («المكان · من جوه ·
   *  تفاصيل · أجواء») لما البيزنس مايكونش رافع ولا صورة. المربعات دي
   *  **مش تابات ومش بيترفع فيها حاجة** — دي عناوين متكتّبة في
   *  `VERTICALS` هنا وفي `vertical.gallery_tiles` في الداتابيز، وبتختفي
   *  لوحدها أول ما أول صورة حقيقية تتضاف.
   *
   *  المشكلة إنها بتقرا كأنها محتوى، فاللي بيشوف الصفحة (وإحنا كمان)
   *  بيفتكر إن فيه صور مرفوعة. القسم كله بقى يختفي لما مايكونش فيه صور
   *  حقيقية — الغياب بيقول «لسه مارفعش صور» بصراحة، والمربعات كانت بتكدب.
   *
   *  الصور الحقيقية بتترفع من: /supplier/dashboard ← تاب «الصور» (حساب
   *  صاحب البيزنس)، أو /admin/business-finance/<id>/identity ← «معرض الصور».
   */
  const galleryTiles = gallery.map((g, i) => ({ url: galUrl(g), cap: galCap(g) || `صورة ${i + 1}` }))

  return (
    <div className="min-h-screen" dir="rtl" style={{ background: t.pageBg }}>

      {/* ===== MADMONA CO-BRAND TOP BAR ===== */}
      <div style={{ background: t.barBg, borderBottom: `1px solid ${t.barBorder}` }}>
        <div className="max-w-2xl mx-auto px-4 h-11 flex items-center justify-between">
          <a href="https://madmonacairo.com" className="flex items-center gap-1.5">
            {dk ? (
              <span className="text-sm font-black flex items-center gap-1.5" style={{ color: t.barText }}>
                <span style={{ width: 7, height: 7, borderRadius: 9, background: t.accent, display: 'inline-block' }} /> مضمونة
              </span>
            ) : (
              <img src="https://res.cloudinary.com/duxfgqioc/image/upload/madmona/logo-official.png" alt="مضمونة" className="h-5 w-auto object-contain" />
            )}
          </a>
          <span className="text-[10px] font-bold tracking-wide" style={{ color: t.barTag }}>معاملاتك مضمونة</span>
        </div>
      </div>

      {/* ===== COVER HERO ===== */}
      <header className="relative text-white overflow-hidden">
        <div className="absolute inset-0" style={{ backgroundImage: cover ? `url(${cover})` : t.gCover, backgroundSize: 'cover', backgroundPosition: 'center' }} />
        <div className="absolute inset-0" style={{ backgroundImage: t.heroOverlay }} />
        {!cover && <span className="absolute top-3 right-3 z-10 text-[10px] font-bold text-white/85 bg-black/30 px-2.5 py-1 rounded-full">{v.coverBadge}</span>}

        <div className="relative z-10 max-w-2xl mx-auto px-5 pt-10 pb-7 min-h-[330px] flex flex-col justify-end">
          {/* 🏷️ (٢٤ أغسطس ٢٠٢٦) البيزنس اللي مالوش لوجو كان بياخد نجمة ✨ —
              نفس البيزنس على /manage/<slug> بياخد لوجو مولّد باسمه من
              `/api/logo/<supplierId>`. الصفحة دي كانت الوحيدة اللي مش
              بتستعمله. وحّدناها. */}
          {data.logo_url && logoOk ? (
            <div className="mb-3 w-[110px] rounded-2xl overflow-hidden ring-1 ring-white/25 bg-black/30 backdrop-blur-sm" style={{ aspectRatio: '460 / 177' }}>
              <img src={data.logo_url} alt={data.business_name} className="w-full h-full object-contain" onError={() => setLogoOk(false)} />
            </div>
          ) : data.supplier_id ? (
            <div className="mb-3 w-[110px] rounded-2xl overflow-hidden ring-1 ring-white/25 bg-black/30 backdrop-blur-sm" style={{ aspectRatio: '460 / 177' }}>
              <img src={`/api/logo/${data.supplier_id}`} alt={data.business_name} className="w-full h-full object-contain" />
            </div>
          ) : (
            <div className="mb-3 w-14 h-14 rounded-2xl bg-white/15 ring-1 ring-white/25 grid place-items-center backdrop-blur-sm"><Sparkles className="w-7 h-7 text-white" /></div>
          )}
          <p className="text-[11px] font-bold tracking-[0.22em] text-white/80 mb-1">{v.kicker}</p>
          <h1 className="text-3xl md:text-4xl font-black leading-tight mb-2">{data.business_name}</h1>
          <p className="text-sm text-white/90 flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {loc}</p>

          {/* ✍️ (٢١ أغسطس ٢٠٢٦) وصف النشاط — كان **بيتجاب من الداتابيز
              ويترمي**. الـRPC بترجّع `description_ar`، والاسكريبت اللي بنبعته
              للتاجر بيطلبه، والصفحة عمرها ما عرضته. عشان كده كل الصفحات كانت
              بتبان «قايمة منتجات» مش «شركة». */}
          {data.description_ar && (
            <p className="text-[12.5px] leading-relaxed text-white/75 mt-2 max-w-[46ch]">
              {data.description_ar}
            </p>
          )}

          <div className="flex flex-wrap gap-2 mt-3.5">
            {[branches.length > 0 ? `${fmt(branches.length)} فروع` : null, `${fmt(data.industry === 'retail' ? data.product_count : data.service_count)} ${v.unitWord}`, v.bookChip].filter(Boolean).map((s: any) => (
              <span key={s} className="text-xs font-bold bg-white/14 ring-1 ring-white/25 px-3 py-1.5 rounded-full">{s}</span>
            ))}
          </div>

          <div className="flex gap-2.5 mt-4">
            <a href={data.industry === 'retail' ? '#products' : '#book'} className="flex-[1.4] h-12 rounded-2xl text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg" style={{ backgroundImage: t.gCta }}>
              <HeroCtaIcon className="w-4 h-4" /> {v.heroCta}
            </a>
            <a href={`https://wa.me/${WA}`} target="_blank" rel="noopener" className="flex-1 h-12 rounded-2xl bg-white/14 ring-1 ring-white/28 text-white font-bold text-sm flex items-center justify-center gap-2">
              <MessageCircle className="w-4 h-4" /> {v.waCta}
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5 space-y-6">

        {/* trust strip */}
        <div className="rounded-2xl shadow-sm p-3.5 flex items-center gap-3 -mt-9 relative z-20" style={{ background: t.trustBg, border: `1px solid ${t.trustBorder}` }}>
          <div className="w-9 h-9 rounded-xl grid place-items-center flex-shrink-0" style={{ background: t.trustIcoBg }}><ShieldCheck className="w-5 h-5" style={{ color: t.trustIco }} /></div>
          <p className="text-[11.5px] leading-relaxed" style={{ color: t.trustText }}>الحجز والدفع <b style={{ color: t.trustStrong }}>مؤمّن عن طريق مضمونة</b> — تأكيد على واتساب وتقييم بعد الزيارة.</p>
        </div>

        {/* products → marketplace (filtered to this merchant) */}
        {data.product_count > 0 && (
          <Link id="products" href={`/marketplace?supplier=${data.supplier_id}`} className="rounded-2xl shadow-sm p-4 flex items-center gap-3 hover:shadow-md transition-all" style={{ backgroundImage: t.gSoft, border: `1px solid ${t.trustBorder}` }}>
            <div className="w-11 h-11 rounded-xl grid place-items-center flex-shrink-0" style={{ background: t.accentSoft }}><ShoppingBag className="w-5 h-5" style={{ color: t.accent }} /></div>
            <div className="min-w-0 flex-1">
              <p className="font-black text-[#1A2E26]">{v.productsHeading || (data.industry === 'vehicle_agency' ? 'قطع غيار وإكسسوارات موتوسيكلات' : 'المنتجات')}</p>
              <p className="text-[11px] text-[#6B7280]">{fmt(data.product_count)} {v.productsUnit || 'منتج'} · مضمون عن طريق مضمونة</p>
            </div>
            <span className="font-bold text-sm flex items-center gap-0.5 flex-shrink-0" style={{ color: t.accent }}>تسوّق <ChevronLeft className="w-4 h-4" /></span>
          </Link>
        )}

        {/* gallery — بيبان بس لو فيه صور حقيقية (شوف التعليق فوق) */}
        {galleryTiles.length > 0 && (
        <section>
          <h2 className="text-sm font-black text-[#1A2E26] mb-3 flex items-center gap-1.5"><ImageIcon className="w-4 h-4" style={{ color: t.accent }} /> {v.galleryHeading}</h2>
          <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-4 px-4" style={{ scrollbarWidth: 'none' }}>
            {galleryTiles.map((tile, i) => (
              <div key={i} className="relative flex-shrink-0 w-[140px] h-[104px] rounded-2xl overflow-hidden ring-1 ring-black/5">
                {tile.url ? (
                  <img src={tile.url} alt={tile.cap} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full grid place-items-center" style={{ backgroundImage: t.gCover }}>
                    <ImageIcon className="w-6 h-6 text-white/70" />
                    <span className="absolute bottom-1.5 right-2 text-[10px] font-bold text-white bg-black/35 px-2 py-0.5 rounded-full">{tile.cap}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
        )}

        {/* team */}
        {team.length > 0 && (
          <section>
            <h2 className="text-sm font-black text-[#1A2E26] mb-3 flex items-center gap-1.5"><Sparkles className="w-4 h-4" style={{ color: t.accent }} /> {v.teamHeading}</h2>
            <div className="flex gap-3.5 overflow-x-auto pb-1 -mx-4 px-4" style={{ scrollbarWidth: 'none' }}>
              {team.map((m: any) => (
                <div key={m.id} className="flex-shrink-0 w-[76px] text-center">
                  {m.photo_url ? (
                    <img src={m.photo_url} alt={m.full_name} className="w-[68px] h-[68px] rounded-full object-cover mx-auto ring-2 ring-black/5" />
                  ) : (
                    <div className="w-[68px] h-[68px] rounded-full grid place-items-center mx-auto text-white font-black text-xl ring-2 ring-white" style={{ backgroundImage: t.gCover }}>
                      {m.avatar_initial || (m.full_name || '?').charAt(0)}
                    </div>
                  )}
                  <p className="text-[11px] font-bold text-[#1A2E26] mt-1.5 truncate">{m.full_name}</p>
                  {m.role_ar && <p className="text-[9px] text-[#6B7280] truncate">{m.role_ar}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* branches → book */}
        {branches.length > 0 && (
        <section id="book">
          <h2 className="text-sm font-black text-[#1A2E26] mb-3 flex items-center gap-1.5"><MapPin className="w-4 h-4" style={{ color: t.accent }} /> {v.branchesHeading}</h2>
          <div className="space-y-2.5">
            {branches.map((b: any) => (
              <Link key={b.id} href={`/book/${b.code}`} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-2.5 flex items-center gap-3 hover:border-gray-300 hover:shadow-md transition-all">
                <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 ring-1 ring-black/5">
                  {b.image_url ? (
                    <img src={b.image_url} alt={b.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full grid place-items-center" style={{ backgroundImage: t.gSoft }}><Building2 className="w-5 h-5" style={{ color: t.accent }} /></div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-black text-[#1A2E26] truncate">{b.name}</p>
                  {(b.address || b.district) && <p className="text-[11px] text-[#6B7280] truncate flex items-center gap-1"><MapPin className="w-3 h-3" /> {b.address || b.district}</p>}
                </div>
                <span className="font-bold text-sm flex items-center gap-0.5 flex-shrink-0" style={{ color: t.accent }}>{v.branchCta} <ChevronLeft className="w-4 h-4" /></span>
              </Link>
            ))}
          </div>
        </section>

        )}

        {/* 🏠 الوحدات/المعروض من الماركتبليس — للعقارات والمعارض وأي بيزنس
            بضاعته إعلانات مش كتالوج خدمات. الكارت بيودّي على صفحة الوحدة
            الحقيقية في الماركتبليس. */}
        {units.length > 0 && (
          <section>
            <h2 className="text-sm font-black text-[#1A2E26] mb-3 flex items-center gap-1.5">
              <ServicesIcon className="w-4 h-4" style={{ color: t.accent }} /> {v.productsHeading || v.servicesHeading}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {units.map((u: any) => (
                <Link key={u.id} href={u.href || `/marketplace/${u.slug}`}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-all">
                  <div className="h-36 bg-gray-100" style={u.photo
                    ? { backgroundImage: `url(${u.photo})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                    : { backgroundImage: t.gCover }} />
                  <div className="p-3.5">
                    {u.category && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: t.accentSoft, color: t.accent }}>{u.category}</span>}
                    <p className="font-black text-[#1A2E26] text-sm mt-1.5 leading-snug">{u.title}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[11px] text-[#6B7280] flex items-center gap-1"><MapPin className="w-3 h-3" />{u.district || u.city || '—'}</span>
                      {u.price_egp && <span className="font-black font-mono text-sm" style={{ color: t.accent }}>{fmt(Number(u.price_egp))} ج</span>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* services / menu */}
        {services.length > 0 && (
          <section>
            <h2 className="text-sm font-black text-[#1A2E26] mb-3 flex items-center gap-1.5"><ServicesIcon className="w-4 h-4" style={{ color: t.accent }} /> {v.servicesHeading}</h2>
            <div className="space-y-2.5">
              {services.map((cat: any) => {
                const isOpen = openCat === cat.category
                const Icon = v.catIcons[cat.category] || v.servicesIcon
                return (
                  <div key={cat.category} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <button onClick={() => setOpenCat(isOpen ? null : cat.category)} className="w-full px-3.5 py-3 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl grid place-items-center flex-shrink-0" style={{ backgroundImage: t.gSoft }}><Icon className="w-5 h-5" style={{ color: t.accent }} /></div>
                      <span className="font-black text-[#1A2E26] text-sm flex-1 text-right">{v.catLabels[cat.category] || cat.category}</span>
                      <span className="text-[10px] font-bold text-[#6B7280]">{fmt(cat.items.length)} {v.unitWord}</span>
                      <ChevronDown className={`w-4 h-4 text-[#6B7280] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isOpen && (
                      <div className="divide-y divide-gray-100 border-t border-gray-100">
                        {cat.items.map((s: any, i: number) => (
                          <div key={i} className="px-4 py-2.5 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm text-[#1A2E26] truncate">{s.name}</p>
                              {s.duration > 0 && <p className="text-[10px] text-[#6B7280] flex items-center gap-1"><Clock className="w-3 h-3" /> {fmt(s.duration)} دقيقة</p>}
                            </div>
                            <span className="font-black font-mono text-sm flex-shrink-0" style={{ color: t.accent }}>{fmt(s.price)} ج</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* account access */}
        <Link href="/login" className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-between hover:border-gray-300 hover:shadow-md transition-all">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl grid place-items-center" style={{ background: t.accentSoft }}><User className="w-5 h-5" style={{ color: t.accent }} /></div>
            <div>
              <p className="font-black text-[#1A2E26]">حسابك على مضمونة</p>
              <p className="text-[11px] text-[#6B7280]">{v.accountSub}</p>
            </div>
          </div>
          <ChevronLeft className="w-5 h-5 text-[#6B7280]" />
        </Link>

        <p className="text-center text-[10px] text-[#6B7280] pt-2">powered by <b style={{ color: t.accent }}>مضمونة</b> · madmonacairo.com</p>
      </main>
    </div>
  )
}
