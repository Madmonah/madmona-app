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
  payment_plan: string | null
  delivery_label: string | null
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
export const PUBLIC_PROJECT_COLUMNS =
  'id, slug, area, area_label, city, segment, developer, title, unit_label, ' +
  'price_from, price_to, price_unit, note, payment_plan, delivery_label, ' +
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

/** حدود الرفع — الضغط بيحصل في المتصفح قبل ما يوصل هنا */
export const UPLOAD_LIMITS = {
  image: 5 * 1024 * 1024, // 5MB بعد الضغط
  pdf: 12 * 1024 * 1024, // 12MB — الـPDF مبيتضغطش في المتصفح
  video: 50 * 1024 * 1024, // 50MB بعد الضغط (حد البكت)
} as const

export const ACCEPTED_MIME: Record<MediaItem['type'], string[]> = {
  image: ['image/jpeg', 'image/png', 'image/webp'],
  pdf: ['application/pdf'],
  video: ['video/mp4', 'video/webm', 'video/quicktime'],
}
