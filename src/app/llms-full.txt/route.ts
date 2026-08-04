import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// llms-full.txt — النسخة كاملة المحتوى لزواحف الذكاء الاصطناعي (مكملة لـ llms.txt)
// ماركداون: تعريف المنصة + أقسام + أحدث 300 إعلان بتفاصيلهم ولينكاتهم
export const runtime = 'nodejs'
export const revalidate = 3600

const SITE = 'https://www.madmonacairo.com'

export async function GET() {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  })
  const [{ data: cats }, { data: rows }] = await Promise.all([
    db.from('categories').select('slug, name_ar, track').eq('is_active', true).is('parent_id', null).limit(300),
    db.from('listings').select('slug, title, description, city, district, price_egp, created_at, categories!inner(name_ar)')
      .eq('status', 'published').order('created_at', { ascending: false }).limit(300),
  ])
  const catLines = (cats || [])
    .map((c: any) => `- [${c.name_ar}](${SITE}/marketplace?category=${encodeURIComponent(c.slug)})`)
    .join('\n')
  const items = (rows || [])
    .map((r: any) => {
      const loc = [r.district, r.city].filter(Boolean).join('، ')
      const price = r.price_egp ? `${Number(r.price_egp).toLocaleString('en')} جنيه` : 'السعر بالتواصل'
      const desc = String(r.description || '').replace(/\s+/g, ' ').slice(0, 200)
      return `### ${r.title}\n- القسم: ${r.categories?.name_ar || ''} | المكان: ${loc || 'مصر'} | السعر: ${price}\n- الرابط: ${SITE}/marketplace/${encodeURIComponent(r.slug)}\n${desc ? `- الوصف: ${desc}` : ''}`
    })
    .join('\n\n')
  const body = `# مضمونة (Madmona) — النسخة الكاملة للمحتوى

> منصة السوق المضمون في مصر: بيع وإيجار عقارات ومركبات ومنتجات، خدمات، مطاعم، وسوبر ماركت — بحماية كاملة للمعاملة، دفع مستحقات سريع، ودعم مستمر. «معاملاتك مضمونة».
> الموقع: ${SITE} | واتساب: +201002229982 | العنوان: ٧ شارع سليمان عزمي، مصر الجديدة، القاهرة

## الأقسام الرئيسية
${catLines}

## أحدث الإعلانات المنشورة (${(rows || []).length})

${items}
`
  return new NextResponse(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 's-maxage=3600, stale-while-revalidate=600' },
  })
}
