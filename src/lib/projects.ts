// src/lib/projects.ts
// =====================================================================
// 🏗️ مشاريع المطورين — types + helpers مشتركة بين البورصة والأدمن والـAPI
// المشروع = صف في property_market_items بـ segment='developer'.
// area_label نص حر → أي منطقة تظهر في البورصة من غير ما نلمس كود.
// =====================================================================

export const PRICE_UNITS = ['egp_total', 'egp_per_m2', 'egp_month', 'egp_night'] as const
export type PriceUnit = (typeof PRICE_UNITS)[number]

export const SEGMENTS = ['developer', 'resale', 'rent'] as const
export type Segment = (typeof SEGMENTS)[number]

export const STATUSES = ['draft', 'published', 'archived'] as const
export type ProjectStatus = (typeof STATUSES)[number]

// 🏷️ (14 Jul 2026) تصنيف المشروع — عشان الناس تلاقي اللي بتدور عليه بسرعة.
// بيتحسب أوتوماتيك من الوحدات، والمطوّر يقدر يعدّله من الداشبورد.
export const PROPERTY_TYPES = ['residential', 'coastal', 'commercial', 'mixed'] as const
export type PropertyType = (typeof PROPERTY_TYPES)[number]

export const PROPERTY_TYPE_LABEL: Record<PropertyType, string> = {
  residential: 'سكني',
  coastal: 'ساحلي',
  commercial: 'تجاري وإداري',
  mixed: 'مختلط',
}

/** إيموجي التصنيف — بيستخدم في الشارات والفلاتر */
export const PROPERTY_TYPE_ICON: Record<PropertyType, string> = {
  residential: '🏠',
  coastal: '🏖️',
  commercial: '🏢',
  mixed: '🏙️',
}

export type MediaItem = {
  type: 'image' | 'pdf' | 'video'
  url: string
  name?: string
  size?: number
}

export type Project = {
  id: string
  slug: string
  area: string
  area_label: string
  city: string | null
  segment: Segment
  developer: string | null
  title: string
  unit_label: string | null
  price_from: number | null
  price_to: number | null
  price_unit: PriceUnit
  note: string | null
  property_type: PropertyType | null
  payment_plan: string | null
  delivery_label: string | null
  // 🔎 (١٦/٩/٢٠٢٦) مساحة الأرض واللاونش — بيتملوا من المطوّر في الفورم أو بتحقق ناوي.
  // land_area_feddan عمود محسوب في الداتابيز (land_area_m2 ÷ ٤٢٠٠.٨٣) — للقراءة بس.
  land_area_m2: number | null
  land_area_feddan: number | null
  launch_start_date: string | null
  construction_pct: number | null
  commission_pct: number | null
  contact_phone: string | null
  cover_url: string | null
  brochure_url: string | null
  video_url: string | null
  media: MediaItem[]
  embargoed: boolean
  embargo_note: string | null
  status: ProjectStatus
  is_active: boolean
  sort_order: number
  source_name: string | null
  source_lead_phone: string | null
  updated_at: string
  created_at: string
}

/** الأعمدة اللي البورصة العامة بتقراها (من غير حاجات داخلية) */
// 🚀 (١٨/٩/٢٠٢٦ — محمد: «البورصة بتفتح ببطء والمشاريع بتلود في وقت كبير»)
//    أعمدة كروت البورصة: نفس الأعمدة **من غير `media`** (مصفوفة صور المشروع
//    ~٥٧ ك.ب لكل الصفوف) — الكروت مابتستخدمهاش خالص، وصفحة المشروع لوحدها
//    هي اللي بتعرض المعرض. الفرق بيتضاعف في الـHTML لأن الداتا بتتبعت مرتين
//    (رسم السيرفر + RSC payload).
export const PROJECT_CARD_COLUMNS =
  'id, slug, area, area_label, city, district, segment, developer, title, unit_label, ' +
  'price_from, price_to, price_unit, note, property_type, payment_plan, delivery_label, ' +
  'land_area_m2, land_area_feddan, launch_start_date, market_status, construction_pct, ' +
  'cover_url, brochure_url, video_url, sort_order, updated_at'

/** صورة الكارت عبر مُحسّن Next: ٣٠٣ ك.ب → ~٦٦ ك.ب عند عرض ٧٥٠.
 *  ⚠️ (١٨/٩/٢٠٢٦) العرض لازم يكون **من `deviceSizes`/`imageSizes`** في next.config —
 *  أي عرض تاني (٤٨٠ مثلًا) بيرجّع `400 INVALID_IMAGE_OPTIMIZE_REQUEST` والصورة ماتظهرش.
 *  فالدالة بتقرّب لأقرب عرض مسموح بدل ما تسيب الغلط يعدّي. */
const NEXT_IMAGE_WIDTHS = [16, 32, 48, 64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1920, 2048]
export function projectThumb(url: string, w = 640, q = 70): string {
  if (!url || url.startsWith('/_next/image')) return url
  const width = NEXT_IMAGE_WIDTHS.find(x => x >= w) ?? 2048
  return `/_next/image?url=${encodeURIComponent(url)}&w=${width}&q=${q}`
}

export const PUBLIC_PROJECT_COLUMNS =
  'id, slug, area, area_label, city, district, segment, developer, title, unit_label, ' +
  'price_from, price_to, price_unit, note, property_type, payment_plan, delivery_label, ' +
  'land_area_m2, land_area_feddan, launch_start_date, market_status, construction_pct, ' +
  'cover_url, brochure_url, video_url, media, sort_order, updated_at'

/** كود المشروع اللي بيتبعت في رسالة الواتساب — التريجر بيدوّر عليه ويربط الاستفسار */
export function projectCode(id: string): string {
  return `MDM-${id.slice(0, 8)}`
}

/** slug عربي/إنجليزي آمن */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9؀-ۿ]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

/** رقم واتساب المارد — كل تواصل بيمرّ من هنا */
export const MARID_WA = '201002229982'

/** رسالة الاستفسار عن مشروع — لازم تحتوي الكود عشان الربط يشتغل */
export function inquiryMessage(p: Pick<Project, 'id' | 'title' | 'developer' | 'area_label'>): string {
  const dev = p.developer ? ` (${p.developer})` : ''
  return (
    `أهلاً المارد 🧞 — عايز أستفسر عن مشروع *${p.title}*${dev} في ${p.area_label}، ` +
    `شفته في بورصة عقارات مضمونة.\n\nكود المشروع: ${projectCode(p.id)}`
  )
}

export function inquiryWaLink(p: Pick<Project, 'id' | 'title' | 'developer' | 'area_label'>): string {
  return `https://wa.me/${MARID_WA}?text=${encodeURIComponent(inquiryMessage(p))}`
}

/**
 * حدود الرفع. الضغط بيحصل في المتصفح قبل ما يوصل هنا.
 * ⚠️ إحنا اللي نضغط مش المطوّر — الحدود واسعة عشان محدش يترفض،
 * والضغط بيصغّر الحجم لوحده. البروشور مبيتضغطش (PDF) فحده أوسع.
 */
export const UPLOAD_LIMITS = {
  image: 5 * 1024 * 1024, // 5MB — بعد ضغط WebP الصورة بتبقى ~200KB
  pdf: 45 * 1024 * 1024, // 45MB — بروشورات المطورين الديجيتال بتوصل لكده
  video: 50 * 1024 * 1024, // 50MB — بعد ضغط 720p
} as const

export const ACCEPTED_MIME: Record<MediaItem['type'], string[]> = {
  image: ['image/jpeg', 'image/png', 'image/webp'],
  pdf: ['application/pdf'],
  video: ['video/mp4', 'video/webm', 'video/quicktime'],
}
