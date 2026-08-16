'use client'

// ============================================================================
// BusinessLoungeClient — «بورصة رجال الأعمال» (١١ أغسطس ٢٠٢٦)
// طلب محمد: تاب خامسة في هيرو الهوم جنب بيع/إيجار/خدمات/بورصة عقارية، بتجمع
// الأخبار + أسعار العملات + الذهب في مكان واحد. مش بيانات جديدة — واجهة
// أوسع فوق نفس /api/financial-data ونفس CompactNewsTabs المستخدمين في الهوم.
// ============================================================================

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, TrendingUp, Coins } from 'lucide-react'
import CompactNewsTabs from '@/components/CompactNewsTabs'

interface FinData {
  ok: boolean
  currencies: { code: string; name_ar: string; flag: string; rate: number }[]
  gold: { karat: number; label: string; price_per_gram_egp: number }[]
  updated_at?: string
}

export default function BusinessLoungeClient() {
  const [fin, setFin] = useState<FinData | null>(null)

  useEffect(() => {
    let dead = false
    const load = () => {
      fetch(`/api/financial-data?t=${Date.now()}`, { cache: 'no-store' })
        .then(r => r.json())
        .then(j => { if (!dead && j?.ok) setFin(j) })
        .catch(() => {})
    }
    load()
    const timer = setInterval(load, 60 * 1000)
    return () => { dead = true; clearInterval(timer) }
  }, [])

  return (
    <main className="mx-auto max-w-7xl pb-28 md:pb-16" dir="rtl">
      {/* ─── الهيدر المدمج (موبايل) — نفس نمط بورصة العقارات ─── */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1 md:hidden">
        <div className="flex items-center gap-2.5 min-w-0">
          <Link
            href="/"
            aria-label="رجوع"
            className="w-10 h-10 bg-white rounded-[14px] flex items-center justify-center shadow-[0_2px_8px_-2px_rgba(0,0,0,.06)] shrink-0"
          >
            <ArrowRight className="w-[18px] h-[18px] text-[#374151]" strokeWidth={2.5} />
          </Link>
          <div className="min-w-0">
            <h1 className="text-[16px] font-black text-[#0A0A0A] leading-[1.2]">
              بورصة رجال الأعمال{' '}
              <span className="align-[2px] text-[9px] font-bold text-[#059669] bg-[#34D399]/10 px-[7px] py-[2px] rounded-full">
                LIVE
              </span>
            </h1>
            <p className="text-[10px] font-bold text-[#7C8A84] mt-px truncate">
              أخبار + أسعار عملات وذهب — يتجدد لحظيًا
            </p>
          </div>
        </div>
        <div className="w-10 h-10 bg-white rounded-[14px] flex items-center justify-center shadow-[0_2px_8px_-2px_rgba(0,0,0,.06)] shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/madmona-logo.png" alt="مضمونة" className="w-7 h-7 object-contain" />
        </div>
      </div>

      {/* عنوان الديسكتوب */}
      <div className="hidden md:block px-4 pt-8 pb-2 max-w-5xl mx-auto">
        <h1 className="text-3xl font-black text-[#0A0A0A]">بورصة رجال الأعمال</h1>
        <p className="text-sm text-[#7C8A84] mt-1">أخبار مضمونة + أسعار العملات والذهب لحظيًا — في مكان واحد</p>
      </div>

      {/* ─── لوحة الأسعار: عملات + ذهب ─── */}
      <section className="px-4 pt-3 max-w-5xl mx-auto">
        <div className="flex items-center gap-2 mb-2.5">
          <TrendingUp className="w-4 h-4 text-[#059669]" />
          <h2 className="text-[13px] font-black text-[#0A0A0A]">أسعار السوق الآن</h2>
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
          </span>
        </div>

        {!fin ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="bg-white border border-[#EAE4D7] rounded-2xl p-3.5 h-[68px] animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            {fin.currencies?.map(c => (
              <div key={c.code} className="bg-white border border-[#EAE4D7] rounded-2xl p-3.5">
                <p className="text-[10px] font-extrabold text-[#7C8A84] flex items-center gap-1.5">
                  <span className="text-sm leading-none">{c.flag}</span>
                  {c.name_ar}
                </p>
                <p className="text-lg font-black text-[#0A0A0A] mt-1 tabular-nums">{c.rate.toFixed(2)} ج.م</p>
              </div>
            ))}
            {fin.gold?.map(g => (
              <div key={g.karat} className="bg-white border border-[#EAE4D7] rounded-2xl p-3.5">
                <p className="text-[10px] font-extrabold text-[#7C8A84] flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-[#D4A017]" />
                  {g.label}
                </p>
                <p className="text-lg font-black text-[#0A0A0A] mt-1 tabular-nums">{g.price_per_gram_egp.toLocaleString('ar-EG')} ج.م/جم</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ─── الأخبار ─── */}
      <section className="px-4 pt-6 max-w-5xl mx-auto">
        <h2 className="text-[13px] font-black text-[#0A0A0A] mb-2.5">أخبار مضمونة</h2>
        <CompactNewsTabs />
      </section>
    </main>
  )
}
