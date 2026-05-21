'use client'

/* Elite Beauty Salon & Spa — branded home / landing page on Madmona.
   URL: /elite  → shows Elite logo, lets the customer find the nearest
   branch (GPS) or pick one, then enters that branch's visit hub (/v/CODE). */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import {
  Loader2, MapPin, ChevronLeft, Instagram, MessageCircle, Phone,
  Navigation, ShieldCheck, Clock, Star, CalendarPlus,
} from 'lucide-react'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(SUPABASE_URL, ANON)
const ELITE_ID = '93eaa8cf-1def-4101-bca6-8fa33450cdce'
const WA = '201002229982'
const cleanName = (n: string) => (n || '').replace(/^Elite\s*-\s*/i, '').replace(/^إيليت\s*-\s*/, '').trim()

export default function EliteHome() {
  const router = useRouter()
  const [b, setB] = useState<any>(null)
  const [branches, setBranches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [geoBusy, setGeoBusy] = useState(false)
  const [geoErr, setGeoErr] = useState('')

  useEffect(() => {
    (async () => {
      const [{ data: br }, { data: list }] = await Promise.all([
        // @ts-expect-error rpc typing
        supabase.rpc('public_get_supplier_branding', { p_supplier_id: ELITE_ID }),
        // @ts-expect-error rpc typing
        supabase.rpc('public_list_branches'),
      ])
      setB(br)
      setBranches(list || [])
      setLoading(false)
    })()
  }, [])

  function nearest() {
    setGeoErr(''); setGeoBusy(true)
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoErr('متصفحك مش بيدعم تحديد الموقع — اختاري فرعك من تحت'); setGeoBusy(false); return
    }
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords
      // @ts-expect-error rpc typing
      const { data } = await supabase.rpc('public_nearest_branch', { p_lat: latitude, p_lng: longitude })
      setGeoBusy(false)
      if (data?.code) router.push(`/v/${data.code}`)
      else setGeoErr('مش لاقيين أقرب فرع — اختاري من تحت')
    }, () => {
      setGeoBusy(false); setGeoErr('مش قادرين نوصل لموقعك — اختاري فرعك من تحت')
    }, { enableHighAccuracy: true, timeout: 8000 })
  }

  if (loading) return <div className="min-h-screen bg-[#1F6F5F] flex items-center justify-center"><Loader2 className="w-9 h-9 text-white animate-spin" /></div>

  const gallery: string[] = b?.gallery || []
  const tagline = b?.description_ar || ''
  const logo = b?.logo_url
  const ig = b?.social_links?.instagram
  const phones: string[] = b?.social_links?.phones || []

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <style>{`
@keyframes mdFadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@keyframes mdFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
@keyframes mdGlow{0%,100%{box-shadow:0 10px 26px -10px rgba(31,111,95,.55)}50%{box-shadow:0 16px 40px -8px rgba(31,111,95,.85)}}
.md-fade{animation:mdFadeUp .6s ease both}
.md-float{animation:mdFloat 4.5s ease-in-out infinite}
.md-glow{animation:mdGlow 2.8s ease-in-out infinite}
`}</style>
      <Hero logo={logo} gallery={gallery} tagline={tagline} bizName={b?.business_name} />

      <main className="max-w-md mx-auto px-4 -mt-8 pb-12 space-y-5 relative z-10 md-fade">
        {/* trust row */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_10px_30px_-18px_rgba(26,46,38,0.35)] p-3 flex items-center justify-around text-center">
          {[{ i: ShieldCheck, t: 'أمان كامل' }, { i: Clock, t: 'حجز فوري' }, { i: Star, t: 'خدمة احترافية' }].map((x, k) => (
            <div key={k} className="flex flex-col items-center gap-1 flex-1">
              <x.i className="w-5 h-5 text-[#1F6F5F]" />
              <span className="text-[11px] font-bold text-[#1A2E26]">{x.t}</span>
            </div>
          ))}
        </div>

        {/* choose branch */}
        <section>
          <h2 className="text-xs font-bold tracking-wider uppercase text-[#6B7280] mb-3 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> اختاري فرعك وابدئي</h2>

          <button onClick={nearest} disabled={geoBusy}
            className="w-full bg-[#1F6F5F] text-white rounded-2xl p-4 flex items-center justify-between shadow-lg shadow-[#1F6F5F]/20 active:scale-[0.99] transition-transform disabled:opacity-70 mb-3 md-glow">
            <div className="flex items-center gap-3 text-right">
              <div className="w-11 h-11 rounded-xl bg-white/15 grid place-items-center">
                {geoBusy ? <Loader2 className="w-6 h-6 animate-spin" /> : <Navigation className="w-6 h-6" />}
              </div>
              <div>
                <p className="font-black text-base">{geoBusy ? 'بنحدد أقرب فرع...' : 'لاقي أقرب فرع ليكي'}</p>
                <p className="text-[12px] text-white/75">هنوديكي للفرع الأقرب أوتوماتيك</p>
              </div>
            </div>
            <ChevronLeft className="w-5 h-5 text-white/70" />
          </button>
          {geoErr && <p className="text-[12px] text-red-600 mb-3 text-center">{geoErr}</p>}

          <div className="space-y-2.5">
            {branches.map((br: any) => (
              <button key={br.code} onClick={() => router.push(`/v/${br.code}`)}
                className="w-full bg-white border border-gray-100 rounded-2xl p-4 flex items-center justify-between text-right active:scale-[0.99] transition-all hover:border-[#1F6F5F]/40 hover:shadow-md hover:shadow-[#1A2E26]/5 shadow-[0_8px_24px_-16px_rgba(26,46,38,0.3)]">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-[#1F6F5F]/10 text-[#1F6F5F] grid place-items-center"><MapPin className="w-5 h-5" /></div>
                  <div>
                    <p className="font-black text-sm text-[#1A2E26]">{cleanName(br.name)}</p>
                    <p className="text-[11px] text-[#6B7280]">احجزي · اكرامية · تقييم · منتجات</p>
                  </div>
                </div>
                <span className="w-8 h-8 rounded-lg bg-[#1F6F5F]/10 text-[#1F6F5F] grid place-items-center"><CalendarPlus className="w-4 h-4" /></span>
              </button>
            ))}
          </div>
        </section>

        {/* contact / social */}
        <section>
          <h2 className="text-xs font-bold tracking-wider uppercase text-[#6B7280] mb-3 flex items-center gap-1.5"><MessageCircle className="w-3.5 h-3.5" /> تواصلي معانا</h2>
          <div className="space-y-2.5">
            {ig && (
              <a href={`https://instagram.com/${ig}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-between bg-white border border-gray-100 rounded-2xl p-4 active:scale-[0.99] transition-all hover:shadow-md hover:shadow-[#1A2E26]/5 shadow-[0_8px_24px_-16px_rgba(26,46,38,0.3)]">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-[#1F6F5F]/10 text-[#1F6F5F] grid place-items-center"><Instagram className="w-6 h-6" /></div>
                  <div>
                    <p className="font-black text-sm text-[#1A2E26]">إنستجرام</p>
                    <p className="text-[12px] text-[#6B7280]" dir="ltr">@{ig}</p>
                  </div>
                </div>
                <span className="text-[12px] font-black text-[#1F6F5F]">تابعينا</span>
              </a>
            )}
            <a href={`https://wa.me/${WA}`} className="flex items-center justify-between bg-white border border-gray-100 rounded-2xl p-4 active:scale-[0.99] transition-all hover:shadow-md hover:shadow-[#1A2E26]/5 shadow-[0_8px_24px_-16px_rgba(26,46,38,0.3)]">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-[#1F6F5F]/10 text-[#1F6F5F] grid place-items-center"><MessageCircle className="w-6 h-6" /></div>
                <div>
                  <p className="font-black text-sm text-[#1A2E26]">واتساب</p>
                  <p className="text-[12px] text-[#6B7280]">أي استفسار أو حجز</p>
                </div>
              </div>
              <ChevronLeft className="w-5 h-5 text-[#6B7280]" />
            </a>
            {phones.length > 0 && (
              <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-[0_8px_24px_-16px_rgba(26,46,38,0.3)]">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280] mb-2 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> تليفونات الصالون</p>
                <div className="space-y-1.5">
                  {phones.map((p) => <a key={p} href={`tel:${p}`} className="block font-mono font-bold text-[#1A2E26] text-sm" dir="ltr">{p}</a>)}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* madmona co-brand footer */}
        <div className="flex flex-col items-center gap-2 pt-2">
          <div className="flex items-center gap-2 text-[#6B7280]">
            <span className="text-[11px]">على منصّة</span>
            <span className="w-6 h-6 rounded-lg bg-[#1F6F5F] text-white grid place-items-center text-[13px] font-black">م</span>
            <span className="text-[12px] font-black text-[#1A2E26]">مضمونة</span>
          </div>
          <p className="text-[11px] text-[#6B7280]">madmonacairo.com · اللي بتأجره مضمون</p>
        </div>
      </main>
    </div>
  )
}

/* ============================ HERO ============================ */
function Hero({ logo, gallery = [], tagline, bizName }: any) {
  const [idx, setIdx] = useState(0)
  useEffect(() => {
    if (gallery.length < 2) return
    const t = setInterval(() => setIdx((i: number) => (i + 1) % gallery.length), 5000)
    return () => clearInterval(t)
  }, [gallery.length])

  return (
    <header className="relative bg-[#1F6F5F] text-white overflow-hidden">
      {gallery.map((src: string, i: number) => (
        <img key={i} src={src} alt="" aria-hidden="true"
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[1200ms] ${i === idx ? 'opacity-100' : 'opacity-0'}`} />
      ))}
      <div className="absolute inset-0 bg-gradient-to-b from-[#1F6F5F]/75 via-[#1F6F5F]/55 to-[#1A2E26]/92" />
      {gallery.length === 0 && <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, white 1.5px, transparent 1.5px)', backgroundSize: '22px 22px' }} />}

      <div className="relative max-w-md mx-auto px-5 pt-12 pb-16 text-center">
        <p className="text-[10px] font-bold tracking-[0.45em] uppercase text-white/55 mb-4">MADMONA</p>
        {logo ? (
          <div className="mx-auto mb-4 rounded-2xl overflow-hidden ring-1 ring-white/20 shadow-2xl shadow-black/30 bg-[#14110f] md-float" style={{ width: 'min(82%, 320px)' }}>
            <img src={logo} alt={bizName} className="w-full block" />
          </div>
        ) : (
          <h1 className="text-3xl font-black drop-shadow-sm mb-2">{bizName}</h1>
        )}
        {tagline && <p className="text-[13px] text-white/85 leading-relaxed max-w-xs mx-auto">{tagline}</p>}
      </div>
    </header>
  )
}
