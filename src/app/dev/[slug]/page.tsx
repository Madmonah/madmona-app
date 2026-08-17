'use client'

// ============================================================================
// 🏗️ شركة المطور الكلاود — /dev/[slug]
//
// (١٧ أغسطس ٢٠٢٦ — محمد: «اعمل شركة كلاود لكل مطور باللوجو بتاعه حط فيه
//  مشاريعه وعرّفه إنه يقدر يدير كل حاجة عن طريق المارد».)
//
// صفحة شركة لكل مطور عقاري: اللوجو + كل مشاريعه من البورصة، وكل مشروع
// بيودّي على صفحته. الداتا من bourse_developers + property_market_items
// عن طريق public_developer_page — إضافة مطور جديد = صف في الجدول، مفيش كود.
// ============================================================================

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

interface Proj {
  slug: string | null
  title: string
  area: string | null
  city: string | null
  cover_url: string | null
  price_from: number | null
  price_unit: string | null
  delivery: string | null
  type: string | null
}

const WA = '201002229982'

const fmtPrice = (n: number | null, unit: string | null) => {
  if (!n) return null
  const m = n >= 1_000_000 ? `${(n / 1_000_000).toLocaleString('ar-EG', { maximumFractionDigits: 1 })} مليون` : n.toLocaleString('ar-EG')
  return `يبدأ من ${m} ${unit || 'ج'}`
}

export default function DeveloperPage({ params }: { params: { slug: string } }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const { data: d } = await supabase.rpc('public_developer_page', { p_slug: params.slug })
      setData(d)
      setLoading(false)
    })()
  }, [params.slug])

  if (loading) return <Center>⏳ ثواني…</Center>
  if (!data?.ok) return <Center>الصفحة مش موجودة</Center>

  const projects: Proj[] = data.projects || []

  return (
    <div dir="rtl" className="min-h-screen bg-[#FAFAF7]">
      {/* شريط مضمونة */}
      <div className="bg-[#14231E]">
        <div className="max-w-3xl mx-auto px-4 h-11 flex items-center justify-between">
          <a href="/" className="text-sm font-black text-[#FAFAF7]">مضمونة</a>
          <span className="text-[10px] font-bold text-[#B9C7BF]">معاملاتك مضمونة</span>
        </div>
      </div>

      {/* الهيدر */}
      <header className="bg-[#14231E] text-white">
        <div className="max-w-3xl mx-auto px-5 pt-8 pb-10">
          {data.logo_url && (
            <div className="w-24 h-24 rounded-2xl bg-white p-3 mb-4 flex items-center justify-center overflow-hidden">
              {/* لوجوهات المطورين SVG/webp من دومينا — من غير optimizer */}
              <img src={data.logo_url} alt={data.name} className="max-w-full max-h-full object-contain" />
            </div>
          )}
          <p className="text-[11px] font-bold tracking-[0.2em] text-[#4ADE80] mb-1">شركة كلاود على مضمونة</p>
          <h1 className="text-3xl font-black leading-tight">{data.name}</h1>
          <p className="text-sm text-[#B9C7BF] mt-2">
            {projects.length.toLocaleString('ar-EG')} {projects.length === 1 ? 'مشروع' : 'مشاريع'} على بورصة مضمونة العقارية
          </p>
          <a
            href={`https://wa.me/${WA}?text=${encodeURIComponent(`عايز أعرف عن مشاريع ${data.name}`)}`}
            target="_blank" rel="noopener"
            className="inline-flex items-center gap-2 mt-4 px-6 py-3 rounded-2xl bg-[#059669] text-white font-black text-sm"
          >💬 اسأل المارد عن أي مشروع</a>
        </div>
      </header>

      {/* المشاريع */}
      <main className="max-w-3xl mx-auto px-4 py-6">
        <h2 className="text-lg font-black text-[#14231E] mb-4">المشاريع</h2>
        {projects.length === 0 && (
          <p className="text-[#7C8A84] text-center py-10">المشاريع بتتجهز — كلمنا على واتساب</p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {projects.map((p) => {
            const card = (
              <div className="bg-white rounded-2xl overflow-hidden border border-[#E5DFD3] hover:shadow-md transition-shadow">
                <div className="h-40 bg-[#E7F5EE]" style={p.cover_url ? {
                  backgroundImage: `url(${p.cover_url})`, backgroundSize: 'cover', backgroundPosition: 'center',
                } : undefined} />
                <div className="p-4">
                  <h3 className="font-black text-[#14231E] leading-snug">{p.title}</h3>
                  <p className="text-xs text-[#7C8A84] mt-1">
                    {[p.area, p.city].filter(Boolean).join(' · ')}{p.delivery ? ` · استلام ${p.delivery}` : ''}
                  </p>
                  {fmtPrice(p.price_from, p.price_unit) && (
                    <p className="text-sm font-black text-[#059669] mt-2">{fmtPrice(p.price_from, p.price_unit)}</p>
                  )}
                </div>
              </div>
            )
            return p.slug
              ? <Link key={p.title} href={`/real-estate/projects/${p.slug}`}>{card}</Link>
              : <div key={p.title}>{card}</div>
          })}
        </div>

        {/* إدارة عن طريق المارد */}
        <div className="mt-8 bg-[#14231E] rounded-2xl p-6 text-center">
          <p className="text-[#FFD966] font-black text-lg leading-relaxed">
            المطور بيدير كل حاجة عن طريق المارد 🧞
          </p>
          <p className="text-[#D9E2DD] text-sm mt-2 leading-relaxed">
            تحديث الأسعار · إضافة مشاريع ووحدات · متابعة العملاء المهتمين — كله برسالة واتساب واحدة.
          </p>
        </div>
      </main>
    </div>
  )
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <div dir="rtl" className="min-h-[60vh] flex items-center justify-center text-[#7C8A84]">{children}</div>
  )
}
