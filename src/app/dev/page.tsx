'use client'

// ============================================================================
// 🏗️ دليل المطورين — /dev
// (١٧ أغسطس ٢٠٢٦ — محمد: «كل واحد يبقى ليه مكانه».)
// كل مطور على البورصة ليه شركة كلاود بلوجوه ومشاريعه — ده الدليل.
// ============================================================================

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

export default function DevelopersIndex() {
  const [devs, setDevs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc('public_developers_index')
      setDevs(Array.isArray(data) ? data : [])
      setLoading(false)
    })()
  }, [])

  return (
    <div dir="rtl" className="min-h-screen bg-[#FAFAF7]">
      <div className="bg-[#14231E]">
        <div className="max-w-3xl mx-auto px-4 h-11 flex items-center justify-between">
          <a href="/" className="text-sm font-black text-[#FAFAF7]">مضمونة</a>
          <span className="text-[10px] font-bold text-[#B9C7BF]">معاملاتك مضمونة</span>
        </div>
      </div>
      <header className="bg-[#14231E] text-white">
        <div className="max-w-3xl mx-auto px-5 pt-8 pb-8">
          <p className="text-[11px] font-bold tracking-[0.2em] text-[#4ADE80] mb-1">بورصة مضمونة العقارية</p>
          <h1 className="text-3xl font-black">المطورين</h1>
          <p className="text-sm text-[#B9C7BF] mt-2">كل مطور ليه شركة كلاود بمشاريعه — اختار واتفرّج</p>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-6">
        {loading && <p className="text-center text-[#7C8A84] py-10">⏳ ثواني…</p>}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {devs.filter((d) => d.projects > 0).map((d) => (
            <Link key={d.slug} href={`/dev/${d.slug}`}
              className="bg-white rounded-2xl border border-[#E5DFD3] p-4 flex flex-col items-center text-center hover:shadow-md transition-shadow">
              <div className="w-16 h-16 rounded-xl bg-[#FAFAF7] flex items-center justify-center overflow-hidden mb-2">
                {d.logo_url
                  ? <img src={d.logo_url} alt={d.name} className="max-w-full max-h-full object-contain" />
                  : <span className="text-2xl">🏗️</span>}
              </div>
              <p className="font-black text-[13px] text-[#14231E] leading-snug">{d.name}</p>
              <p className="text-[11px] text-[#7C8A84] mt-1">{Number(d.projects).toLocaleString('ar-EG')} مشاريع</p>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
