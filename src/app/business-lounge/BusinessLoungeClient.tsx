'use client'

// ============================================================================
// BusinessLoungeClient — «بورصة رجال الأعمال»
//
// (١١ أغسطس ٢٠٢٦) اتعملت كتاب خامسة في هيرو الهوم — أخبار + عملات + ذهب.
//
// 🎨 (٥ سبتمبر ٢٠٢٦) إعادة تصميم شاملة بطلب محمد: «بورصة رجال الأعمال
//    محتاجة إعادة تصميم شامل يحسّن من تجربة المستخدم، موبايل وديسكتوب».
//
//    اللي كان غلط:
//    ١. **مفيش مؤشر طالع/نازل** — أهم حاجة في أي بورصة، والصفحة كانت
//       بتعرض رقم أصم. الـAPI مابيرجّعش تغيّر، فبنخزّن آخر قيمة شافها
//       المستخدم في localStorage ونعرض الفرق **من آخر زيارة** — معلومة
//       حقيقية ومجانية، ومكتوب مصدرها صراحةً عشان ماتتلبسش على إنها
//       تغيّر اليوم.
//    ٢. **٣ أقسام أخبار فوق بعض** من غير عناوين تفرّق بينها — بقت
//       مفصولة بعناوين واضحة وترتيب: العاجل (ستوريز) → الموجز → التفصيل.
//    ٣. **الديسكتوب كان نسخة الموبايل مركونة في عمود واحد** رغم إن
//       الشاشة عريضة — بقى عمودين: الأسعار ثابتة على الجنب والأخبار
//       بتاخد المساحة.
//    ٤. الهيدر كان أبيض باهت — بقى بالغامق بتاع البورصة (#04352A).
// ============================================================================

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Coins, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import CompactNewsTabs from '@/components/CompactNewsTabs'
import NewsStories from '@/components/NewsStories'
import NewsTabsSection from '@/components/NewsTabsSection'
import FinancialTicker from '@/components/FinancialTicker'

interface FinData {
  ok: boolean
  currencies: { code: string; name_ar: string; flag: string; rate: number }[]
  gold: { karat: number; label: string; price_per_gram_egp: number }[]
  updated_at?: string
}

const SNAP_KEY = 'madmona_fin_snapshot'
const DARK = '#04352A'

/** الفرق عن آخر زيارة — بنقراه من التخزين المحلي ونحدّثه بعد العرض. */
function useDeltas(fin: FinData | null) {
  const [prev, setPrev] = useState<Record<string, number> | null>(null)

  useEffect(() => {
    if (!fin) return
    let old: Record<string, number> = {}
    try { old = JSON.parse(localStorage.getItem(SNAP_KEY) || '{}') } catch { /* أول زيارة */ }
    setPrev(old)

    const now: Record<string, number> = {}
    fin.currencies?.forEach((c) => { now['c:' + c.code] = c.rate })
    fin.gold?.forEach((g) => { now['g:' + g.karat] = g.price_per_gram_egp })
    try { localStorage.setItem(SNAP_KEY, JSON.stringify(now)) } catch { /* وضع خاص */ }
  }, [fin])

  return (key: string, value: number): number | null => {
    if (!prev || typeof prev[key] !== 'number') return null
    const d = value - prev[key]
    return Math.abs(d) < 0.005 ? 0 : d
  }
}

function Delta({ d }: { d: number | null }) {
  if (d === null) return null
  if (d === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-[#7C8A84]">
        <Minus className="w-3 h-3" strokeWidth={3} /> زي ما هو
      </span>
    )
  }
  const up = d > 0
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-extrabold ${
        up ? 'text-[#B4552F]' : 'text-[#1F6F5F]'
      }`}
    >
      {up ? <TrendingUp className="w-3 h-3" strokeWidth={3} /> : <TrendingDown className="w-3 h-3" strokeWidth={3} />}
      {up ? '+' : '−'}{Math.abs(d).toLocaleString('ar-EG', { maximumFractionDigits: 2 })}
    </span>
  )
}

export default function BusinessLoungeClient() {
  const [fin, setFin] = useState<FinData | null>(null)
  const deltaOf = useDeltas(fin)

  useEffect(() => {
    let dead = false
    const load = () => {
      fetch(`/api/financial-data?t=${Date.now()}`, { cache: 'no-store' })
        .then((r) => r.json())
        .then((j) => { if (!dead && j?.ok) setFin(j) })
        .catch(() => {})
    }
    load()
    const timer = setInterval(load, 60 * 1000)
    return () => { dead = true; clearInterval(timer) }
  }, [])

  const updated = fin?.updated_at
    ? new Date(fin.updated_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
    : null

  const priceCards = (
    <>
      {!fin ? (
        <div className="grid grid-cols-2 xl:grid-cols-1 gap-2.5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="bg-white border border-[#EAE4D7] rounded-2xl h-[78px] animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 xl:grid-cols-1 gap-2.5">
          {fin.currencies?.map((c) => (
            <div key={c.code} className="bg-white border border-[#EAE4D7] rounded-2xl p-3.5">
              <p className="text-[10px] font-extrabold text-[#7C8A84] flex items-center gap-1.5">
                <span className="text-sm leading-none">{c.flag}</span>
                {c.name_ar}
              </p>
              <p className="text-[19px] font-black text-[#0A0A0A] mt-1 tabular-nums leading-none">
                {c.rate.toFixed(2)} <span className="text-[11px] font-bold text-[#7C8A84]">ج.م</span>
              </p>
              <div className="mt-1.5"><Delta d={deltaOf('c:' + c.code, c.rate)} /></div>
            </div>
          ))}
          {fin.gold?.map((g) => (
            <div key={g.karat} className="bg-white border border-[#EAE4D7] rounded-2xl p-3.5">
              <p className="text-[10px] font-extrabold text-[#7C8A84] flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-[#D4A017]" />
                {g.label}
              </p>
              <p className="text-[19px] font-black text-[#0A0A0A] mt-1 tabular-nums leading-none">
                {g.price_per_gram_egp.toLocaleString('ar-EG')}{' '}
                <span className="text-[11px] font-bold text-[#7C8A84]">ج.م/جم</span>
              </p>
              <div className="mt-1.5"><Delta d={deltaOf('g:' + g.karat, g.price_per_gram_egp)} /></div>
            </div>
          ))}
        </div>
      )}
      <p className="mt-2 text-[10px] leading-relaxed text-[#7C8A84]">
        السهم بيقارن بآخر مرة فتحت فيها الصفحة — مش تغيّر اليوم.
      </p>
    </>
  )

  return (
    <main className="pb-28 md:pb-16" dir="rtl">

      {/* ─── الهيدر: غامق البورصة، موبايل وديسكتوب ─── */}
      <div className="text-white" style={{ background: DARK }}>
        <div className="mx-auto max-w-7xl px-4 pt-3 pb-5 md:pt-6 md:pb-7">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <Link
                href="/"
                aria-label="رجوع"
                className="w-10 h-10 bg-white/12 rounded-[14px] flex items-center justify-center shrink-0"
              >
                <ArrowRight className="w-[18px] h-[18px] text-white" strokeWidth={2.5} />
              </Link>
              <div className="min-w-0">
                <h1 className="text-[17px] md:text-[26px] font-black leading-[1.2] flex items-center gap-2">
                  بورصة رجال الأعمال
                  <span className="inline-flex items-center gap-1 align-middle text-[9px] font-bold bg-white/15 px-2 py-[3px] rounded-full">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#6FCF97] opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#6FCF97]" />
                    </span>
                    مباشر
                  </span>
                </h1>
                <p className="text-[10px] md:text-xs font-bold text-white/65 mt-0.5 truncate">
                  أخبار + أسعار العملات والذهب{updated ? ` — آخر تحديث ${updated}` : ''}
                </p>
              </div>
            </div>
            <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center overflow-hidden shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/madmona-logo.png" alt="مضمونة" className="w-8 h-8 object-contain" width={32} height={32} />
            </div>
          </div>
        </div>
      </div>

      <FinancialTicker />

      {/* ─── عمودين على الديسكتوب: الأسعار جنب والأخبار في المساحة ─── */}
      <div className="mx-auto max-w-7xl px-4 pt-4 grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">

        <aside className="xl:sticky xl:top-4 xl:self-start">
          <h2 className="text-[13px] font-black text-[#0A0A0A] mb-2.5 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" style={{ color: DARK }} />
            أسعار السوق الآن
          </h2>
          {priceCards}
        </aside>

        <div className="min-w-0">
          <section>
            <h2 className="text-[13px] font-black text-[#0A0A0A] mb-2.5">العاجل</h2>
            <NewsStories />
          </section>

          <section className="mt-7">
            <h2 className="text-[13px] font-black text-[#0A0A0A] mb-2.5">موجز أخبار مضمونة</h2>
            <CompactNewsTabs />
          </section>

          <section className="mt-7">
            <h2 className="text-[13px] font-black text-[#0A0A0A] mb-2.5">الاقتصاد بالتفصيل</h2>
            <NewsTabsSection />
          </section>
        </div>
      </div>
    </main>
  )
}
