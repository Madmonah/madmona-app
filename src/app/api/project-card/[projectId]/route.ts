import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const revalidate = 86400

/* ============================================================================
   /api/project-card/[projectId] — كارت غلاف لمشروع بورصة مالوش صورة
   ============================================================================
   🎯 (٢٠ أغسطس ٢٠٢٦) محمد: «ابدأ، بس صلّح زي ما قلت».

   المشكلة اللي بيحلها — وهي **مش** إن المشاريع مالهاش صور:

   الشغلانة القديمة (`bourse-cover-cards` v3) كانت بتختار من **٣ صور
   ستوك بس**: `properties-commercial.jpg` · `properties-tourism.jpg` ·
   `properties-residential.jpg` — وتحطها كغلاف للمشروع.

   يعني ١٦٨ مشروع كانوا هيبقوا بـ٣ صور مكررة، وكل صورة **مبنى تاني خالص
   مش المشروع**. ده اللي خلّى «شقة كفر طهرمس» صورتها حاجة مالهاش علاقة.
   وده غش على العميل، مش حل.

   وكمان **مكانش بيحل المشكلة أصلًا**: لينك الصور دي تحته
   `/ads/categories/` — والسينك بتعتبر أي حاجة في المسار ده placeholder،
   فالإعلان كان بيفضل `draft` على أي حال. يعني الشغلانة كانت بتوسّخ
   البورصة **من غير** ما تنشر ولا إعلان واحد.

   الحل هنا: **كارت مرسوم بمعلومات المشروع نفسه** — اسمه ومطوّره ومنطقته
   وسعره. مش صورة مبنى تاني، ولا بيدّعي إنه صورة أصلًا. معلومة حقيقية
   معروضة بشكل محترم، ومميّزة لكل مشروع (التدرّج اللوني مشتق من الـid).

   ⚠️ أول ما المشروع ياخد صورة حقيقية، الكارت ده بيروح لوحده — الصفحات
      بتستخدم `cover_url` والشغلانة **عمرها ما بتلمس غلاف موجود**.
   ============================================================================ */

const PALETTES: [string, string][] = [
  ['#0F3D31', '#059669'],
  ['#14231E', '#2FA084'],
  ['#1F2937', '#0F766E'],
  ['#134E4A', '#34D399'],
  ['#0B1512', '#B78A12'],
  ['#065F46', '#6FCF97'],
]

function paletteFor(id: string): [string, string] {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return PALETTES[h % PALETTES.length]
}

const esc = (s: string) =>
  (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** يقصّ النص على كذا سطر بدل ما يخرج بره الكارت */
function wrap(text: string, perLine: number, maxLines: number): string[] {
  const words = (text || '').split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    if ((cur + ' ' + w).trim().length <= perLine) cur = (cur + ' ' + w).trim()
    else { if (cur) lines.push(cur); cur = w }
    if (lines.length === maxLines) break
  }
  if (cur && lines.length < maxLines) lines.push(cur)
  if (lines.length === maxLines && words.join(' ').length > lines.join(' ').length) {
    lines[maxLines - 1] = lines[maxLines - 1].replace(/.{0,2}$/, '…')
  }
  return lines
}

function priceLine(from: number | null, unit: string | null): string {
  if (from == null) return 'السعر عند الطلب'
  const n = Number(from).toLocaleString('ar-EG')
  switch (unit) {
    case 'egp_per_m2': return `${n} ج / م²`
    case 'egp_night':  return `${n} ج / الليلة`
    case 'egp_month':  return `${n} ج / الشهر`
    default:           return `تبدأ من ${n} ج`
  }
}

function card(o: {
  id: string; title: string; developer: string | null
  area: string | null; price: number | null; unit: string | null
}): string {
  const [a, b] = paletteFor(o.id)
  const family = "'Cairo','Segoe UI','Noto Sans Arabic','Tahoma',sans-serif"
  const titleLines = wrap(o.title, 26, 2)
  const sub = [o.developer, o.area].filter(Boolean).join(' · ')

  const titleSvg = titleLines
    .map((l, i) => `<text x="600" y="${300 + i * 62}" fill="#FFFFFF" font-family="${family}"
      font-size="52" font-weight="900" text-anchor="middle" direction="rtl">${esc(l)}</text>`)
    .join('\n  ')

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675" role="img" aria-label="${esc(o.title)}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${a}"/><stop offset="100%" stop-color="${b}"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="675" fill="url(#bg)"/>
  <g opacity="0.10" fill="none" stroke="#FFFFFF" stroke-width="2">
    <rect x="90" y="392" width="150" height="200" rx="6"/>
    <rect x="260" y="322" width="180" height="270" rx="6"/>
    <rect x="460" y="432" width="130" height="160" rx="6"/>
    <rect x="960" y="362" width="160" height="230" rx="6"/>
    <line x1="0" y1="592" x2="1200" y2="592"/>
  </g>
  ${titleSvg}
  ${sub ? `<text x="600" y="${300 + titleLines.length * 62 + 12}" fill="#FFFFFF" opacity="0.72"
      font-family="${family}" font-size="30" font-weight="700" text-anchor="middle"
      direction="rtl">${esc(sub)}</text>` : ''}
  <text x="600" y="${300 + titleLines.length * 62 + (sub ? 76 : 40)}" fill="#FFFFFF"
    font-family="${family}" font-size="34" font-weight="900" text-anchor="middle"
    direction="rtl">${esc(priceLine(o.price, o.unit))}</text>
  <text x="600" y="642" fill="#FFFFFF" opacity="0.45" font-family="${family}"
    font-size="22" font-weight="700" text-anchor="middle" direction="rtl">بورصة مضمونة</text>
</svg>`
}

type ProjectRow = {
  title: string | null
  developer: string | null
  area_label: string | null
  city: string | null
  price_from: number | null
  price_unit: string | null
}

export async function GET(
  _req: Request,
  { params }: { params: { projectId: string } },
) {
  const id = params.projectId
  let row: ProjectRow | null = null

  try {
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } },
    )
    const { data } = await sb
      .from('property_market_items')
      .select('title, developer, area_label, city, price_from, price_unit')
      .eq('id', id).maybeSingle()
    // الأنواع المولّدة بتضيّق النتيجة لـnever هنا، فبنعدّي بcast صريح
    row = (data as unknown as ProjectRow | null) ?? null
  } catch {
    // نرسم الافتراضي
  }

  const body = card({
    id,
    title: row?.title || 'مشروع عقاري',
    developer: row?.developer ?? null,
    area: row?.area_label || row?.city || null,
    price: row?.price_from ?? null,
    unit: row?.price_unit ?? null,
  })

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=604800',
    },
  })
}
