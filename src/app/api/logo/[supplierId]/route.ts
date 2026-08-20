import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const revalidate = 86400

/* ============================================================================
   /api/logo/[supplierId] — لوجو مولّد لأي بيزنس مالوش لوجو
   ============================================================================
   🎯 (٢٠ أغسطس ٢٠٢٦) محمد: «وأكيد باللوجو بتاعه لو موجود، ولو مش موجود
      هنعمل لوجو باسمه».

   ٢٠ بيزنس من ١٦٢ مالهمش `logo_url`. الصفحات كانت بتحط مكانه أيقونة عامة
   (نجمة ✨ أو مقص ✂️ أو إيموجي 🏢) — يعني كل البيزنس اللي مالهمش لوجو
   شكلهم واحد، وده عكس المطلوب بالظبط.

   بنولّد SVG بأول حرفين من الاسم على تدرّج لوني **ثابت لكل بيزنس**
   (مشتق من الـid)، فكل واحد ليه شكل مميّز بيفضل هو هو كل مرة.

   ⚠️ مش بنخزّن ملفات ولا بنكتب في `logo_url` — الراوت بيرسم على الطاير
      ويتكاش سنة. أول ما البيزنس يرفع لوجو حقيقي، الصفحة بتستخدمه هو
      وبتسيب الراوت ده.
   ============================================================================ */

// تدرّجات من هوية مضمونة — أخضر وذهبي وبترولي
const PALETTES: [string, string][] = [
  ['#059669', '#34D399'],
  ['#14231E', '#2FA084'],
  ['#B78A12', '#D4A017'],
  ['#0F766E', '#5EEAD4'],
  ['#065F46', '#6FCF97'],
  ['#1F2937', '#059669'],
  ['#7C2D12', '#D4A017'],
  ['#134E4A', '#34D399'],
]

/** أول حرفين معبّرين — بيتخطى «شركة/مطعم/معرض» عشان مايطلعش كلهم «ش» */
function initials(name: string): string {
  const SKIP = new Set([
    'شركة', 'مؤسسة', 'مكتب', 'مطعم', 'معرض', 'محل', 'صيدلية', 'مركز',
    'عيادة', 'الشركة', 'ال', 'و', 'the', 'al',
  ])
  const words = (name || '')
    .replace(/[—–\-_/|,.()]+/g, ' ')
    .split(/\s+/)
    .map(w => w.trim())
    .filter(w => w && !SKIP.has(w.toLowerCase()))
  if (words.length === 0) return 'م'
  if (words.length === 1) return words[0].slice(0, 2)
  return words[0].charAt(0) + words[1].charAt(0)
}

function paletteFor(id: string): [string, string] {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return PALETTES[h % PALETTES.length]
}

function svg(text: string, id: string): string {
  const [a, b] = paletteFor(id)
  const size = text.length > 1 ? 150 : 190
  // العربي محتاج فونت بيدعمه — الترتيب ده بيغطي أغلب الأنظمة
  const family = "'Cairo','Segoe UI','Noto Sans Arabic','Tahoma',sans-serif"
  const safe = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400" role="img" aria-label="${safe}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${a}"/><stop offset="100%" stop-color="${b}"/>
    </linearGradient>
  </defs>
  <rect width="400" height="400" rx="88" fill="url(#g)"/>
  <text x="200" y="200" fill="#FFFFFF" font-family="${family}" font-size="${size}"
        font-weight="900" text-anchor="middle" dominant-baseline="central"
        direction="rtl">${safe}</text>
</svg>`
}

export async function GET(
  _req: Request,
  { params }: { params: { supplierId: string } },
) {
  const id = params.supplierId
  let name = ''
  try {
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } },
    )
    const { data } = await sb
      .from('suppliers').select('business_name').eq('id', id).maybeSingle()
    name = (data as { business_name?: string } | null)?.business_name || ''
  } catch {
    // مش مشكلة — هنرسم الافتراضي
  }

  const body = svg(initials(name), id)
  return new NextResponse(body, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=604800, immutable',
    },
  })
}
