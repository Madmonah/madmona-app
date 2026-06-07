'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import {
  Loader2, MapPin, Calendar, ChevronLeft, Scissors, Clock, Sparkles, User,
  ChevronDown, MessageCircle, ShieldCheck, Image as ImageIcon, Crown, Wind,
  Brush, Hand, Flower2, Building2,
} from 'lucide-react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

const CATEGORY_LABELS: Record<string, string> = {
  hair_cut: 'قص شعر', hair_color: 'صبغة', hair_treatment: 'علاج شعر', styling: 'سشوار / تسريحة', hair: 'شعر وصبغة',
  makeup: 'مكياج', bridal: 'عرايس', nails: 'منيكير وبديكير', skin: 'بشرة', spa: 'سبا ومساج',
  package: 'باقات', waxing: 'إزالة شعر', general: 'عام', عام: 'عام',
}
const CATEGORY_ICONS: Record<string, any> = {
  bridal: Crown, hair: Wind, hair_cut: Scissors, hair_color: Wind, hair_treatment: Wind,
  styling: Wind, makeup: Brush, nails: Hand, skin: Sparkles, spa: Flower2, package: Crown,
}
const fmt = (n: any) => Number(n || 0).toLocaleString('ar-EG')

// brand gradients (gold->green CTA, green cover fallback, soft tint tile)
const G_CTA = 'linear-gradient(100deg,#d4a017 0%,#2FA084 55%,#1F6F5F 100%)'
const G_COVER = 'linear-gradient(135deg,#1d6253 0%,#2FA084 70%,#6FCF97 100%)'
const G_SOFT = 'linear-gradient(135deg,rgba(31,111,95,.10),rgba(212,160,23,.13))'

// gallery items can be plain url strings or { url, caption }
const galUrl = (g: any) => (typeof g === 'string' ? g : g?.url || '')
const galCap = (g: any) => (typeof g === 'string' ? '' : g?.caption || '')

export default function SalonLandingPage({ params }: { params: { slug: string } }) {
  const { slug } = params
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [openCat, setOpenCat] = useState<string | null>(null)
  const [logoOk, setLogoOk] = useState(true)

  useEffect(() => {
    (async () => {
      // @ts-expect-error rpc typing
      const { data: d } = await supabase.rpc('public_salon_landing', { p_slug: slug })
      setData(d)
      setLoading(false)
    })()
  }, [slug])

  if (loading) return <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center"><Loader2 className="w-8 h-8 text-[#1F6F5F] animate-spin" /></div>

  if (!data?.ok) return (
    <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4" dir="rtl">
      <div className="text-center"><MapPin className="w-12 h-12 text-[#6B7280] opacity-30 mx-auto mb-2" /><p className="font-bold text-[#1A2E26]">الصفحة مش موجودة</p></div>
    </div>
  )

  const branches: any[] = data.branches || []
  const services: any[] = data.services || []
  const team: any[] = data.team || []
  const gallery: any[] = (data.gallery || []).filter((g: any) => galUrl(g))
  const cover: string = data.cover_url || ''
  const loc = branches[0]?.district || branches[0]?.address || 'القاهرة'
  // WhatsApp goes to Madmona's business line (AI auto-responder)
  const WA = '201002229982'

  // generated placeholder tiles used until real photos are uploaded
  const galleryTiles = gallery.length
    ? gallery.map((g, i) => ({ url: galUrl(g), cap: galCap(g) || `صورة ${i + 1}` }))
    : [{ url: '', cap: 'الريسبشن' }, { url: '', cap: 'الشغل' }, { url: '', cap: 'السبا' }, { url: '', cap: 'المكان' }]

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">

      {/* ===== COVER HERO ===== */}
      <header className="relative text-white overflow-hidden">
        <div className="absolute inset-0" style={{ backgroundImage: cover ? `url(${cover})` : G_COVER, backgroundSize: 'cover', backgroundPosition: 'center' }} />
        <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(180deg,rgba(8,26,21,.18) 0%,rgba(8,26,21,.10) 35%,rgba(8,26,21,.80) 100%)' }} />
        {!cover && <span className="absolute top-3 right-3 z-10 text-[10px] font-bold text-white/85 bg-black/30 px-2.5 py-1 rounded-full">صورة غلاف الصالون</span>}

        <div className="relative z-10 max-w-2xl mx-auto px-5 pt-10 pb-7 min-h-[330px] flex flex-col justify-end">
          {data.logo_url && logoOk ? (
            <div className="mb-3 w-[110px] rounded-2xl overflow-hidden ring-1 ring-white/25 bg-black/30 backdrop-blur-sm" style={{ aspectRatio: '460 / 177' }}>
              <img src={data.logo_url} alt={data.business_name} className="w-full h-full object-contain" onError={() => setLogoOk(false)} />
            </div>
          ) : (
            <div className="mb-3 w-14 h-14 rounded-2xl bg-white/15 ring-1 ring-white/25 grid place-items-center backdrop-blur-sm"><Sparkles className="w-7 h-7 text-white" /></div>
          )}
          <p className="text-[11px] font-bold tracking-[0.22em] text-white/80 mb-1">{data.industry === 'beauty_salon' ? 'صالون تجميل وسبا' : 'احجزي أونلاين'}</p>
          <h1 className="text-3xl md:text-4xl font-black leading-tight mb-2">{data.business_name}</h1>
          <p className="text-sm text-white/90 flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {loc}</p>

          <div className="flex flex-wrap gap-2 mt-3.5">
            {[`${fmt(branches.length)} فروع`, `${fmt(data.service_count)} خدمة`, 'حجز فوري'].map((s) => (
              <span key={s} className="text-xs font-bold bg-white/14 ring-1 ring-white/25 px-3 py-1.5 rounded-full">{s}</span>
            ))}
          </div>

          <div className="flex gap-2.5 mt-4">
            <a href="#book" className="flex-[1.4] h-12 rounded-2xl text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg" style={{ backgroundImage: G_CTA }}>
              <Calendar className="w-4 h-4" /> احجزي موعدك
            </a>
            <a href={`https://wa.me/${WA}`} target="_blank" rel="noopener" className="flex-1 h-12 rounded-2xl bg-white/14 ring-1 ring-white/28 text-white font-bold text-sm flex items-center justify-center gap-2">
              <MessageCircle className="w-4 h-4" /> تواصلي
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5 space-y-6">

        {/* trust strip */}
        <div className="bg-white rounded-2xl border border-[#1F6F5F]/15 shadow-sm p-3.5 flex items-center gap-3 -mt-9 relative z-20">
          <div className="w-9 h-9 rounded-xl bg-[#1F6F5F]/10 grid place-items-center flex-shrink-0"><ShieldCheck className="w-5 h-5 text-[#1F6F5F]" /></div>
          <p className="text-[11.5px] text-[#6B7280] leading-relaxed">الحجز والدفع <b className="text-[#1A2E26]">مؤمّن عن طريق مضمونة</b> — تأكيد على واتساب وتقييم بعد الزيارة.</p>
        </div>

        {/* gallery */}
        <section>
          <h2 className="text-sm font-black text-[#1A2E26] mb-3 flex items-center gap-1.5"><ImageIcon className="w-4 h-4 text-[#1F6F5F]" /> معرض الصالون</h2>
          <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-4 px-4" style={{ scrollbarWidth: 'none' }}>
            {galleryTiles.map((t, i) => (
              <div key={i} className="relative flex-shrink-0 w-[140px] h-[104px] rounded-2xl overflow-hidden ring-1 ring-black/5">
                {t.url ? (
                  <img src={t.url} alt={t.cap} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full grid place-items-center" style={{ backgroundImage: G_COVER }}>
                    <ImageIcon className="w-6 h-6 text-white/70" />
                    <span className="absolute bottom-1.5 right-2 text-[10px] font-bold text-white bg-black/35 px-2 py-0.5 rounded-full">{t.cap}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* team */}
        {team.length > 0 && (
          <section>
            <h2 className="text-sm font-black text-[#1A2E26] mb-3 flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-[#1F6F5F]" /> فريقنا</h2>
            <div className="flex gap-3.5 overflow-x-auto pb-1 -mx-4 px-4" style={{ scrollbarWidth: 'none' }}>
              {team.map((m: any) => (
                <div key={m.id} className="flex-shrink-0 w-[76px] text-center">
                  {m.photo_url ? (
                    <img src={m.photo_url} alt={m.full_name} className="w-[68px] h-[68px] rounded-full object-cover mx-auto ring-2 ring-[#1F6F5F]/15" />
                  ) : (
                    <div className="w-[68px] h-[68px] rounded-full grid place-items-center mx-auto text-white font-black text-xl ring-2 ring-white" style={{ backgroundImage: G_COVER }}>
                      {m.avatar_initial || (m.full_name || '?').charAt(0)}
                    </div>
                  )}
                  <p className="text-[11px] font-bold text-[#1A2E26] mt-1.5 truncate">{m.full_name}</p>
                  {m.role_ar && <p className="text-[9px] text-[#6B7280] truncate">{m.role_ar}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* branches → book */}
        <section id="book">
          <h2 className="text-sm font-black text-[#1A2E26] mb-3 flex items-center gap-1.5"><MapPin className="w-4 h-4 text-[#1F6F5F]" /> احجزي في أقرب فرع ليكي</h2>
          <div className="space-y-2.5">
            {branches.map((b: any) => (
              <Link key={b.id} href={`/book/${b.code}`} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-2.5 flex items-center gap-3 hover:border-[#1F6F5F] hover:shadow-md transition-all">
                <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 ring-1 ring-black/5">
                  {b.image_url ? (
                    <img src={b.image_url} alt={b.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full grid place-items-center" style={{ backgroundImage: G_SOFT }}><Building2 className="w-5 h-5 text-[#1F6F5F]" /></div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-black text-[#1A2E26] truncate">{b.name}</p>
                  {(b.address || b.district) && <p className="text-[11px] text-[#6B7280] truncate flex items-center gap-1"><MapPin className="w-3 h-3" /> {b.address || b.district}</p>}
                </div>
                <span className="text-[#1F6F5F] font-bold text-sm flex items-center gap-0.5 flex-shrink-0">احجزي <ChevronLeft className="w-4 h-4" /></span>
              </Link>
            ))}
          </div>
        </section>

        {/* services menu */}
        {services.length > 0 && (
          <section>
            <h2 className="text-sm font-black text-[#1A2E26] mb-3 flex items-center gap-1.5"><Scissors className="w-4 h-4 text-[#1F6F5F]" /> الخدمات والأسعار</h2>
            <div className="space-y-2.5">
              {services.map((cat: any) => {
                const isOpen = openCat === cat.category
                const Icon = CATEGORY_ICONS[cat.category] || Sparkles
                return (
                  <div key={cat.category} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <button onClick={() => setOpenCat(isOpen ? null : cat.category)} className="w-full px-3.5 py-3 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl grid place-items-center flex-shrink-0" style={{ backgroundImage: G_SOFT }}><Icon className="w-5 h-5 text-[#1F6F5F]" /></div>
                      <span className="font-black text-[#1A2E26] text-sm flex-1 text-right">{CATEGORY_LABELS[cat.category] || cat.category}</span>
                      <span className="text-[10px] font-bold text-[#6B7280]">{fmt(cat.items.length)} خدمة</span>
                      <ChevronDown className={`w-4 h-4 text-[#6B7280] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isOpen && (
                      <div className="divide-y divide-gray-100 border-t border-gray-100">
                        {cat.items.map((s: any, i: number) => (
                          <div key={i} className="px-4 py-2.5 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm text-[#1A2E26] truncate">{s.name}</p>
                              {s.duration > 0 && <p className="text-[10px] text-[#6B7280] flex items-center gap-1"><Clock className="w-3 h-3" /> {fmt(s.duration)} دقيقة</p>}
                            </div>
                            <span className="font-black font-mono text-[#1F6F5F] text-sm flex-shrink-0">{fmt(s.price)} ج</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* account access */}
        <Link href="/login" className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-between hover:border-[#1F6F5F] hover:shadow-md transition-all">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1F6F5F]/10 grid place-items-center"><User className="w-5 h-5 text-[#1F6F5F]" /></div>
            <div>
              <p className="font-black text-[#1A2E26]">حسابك على مضمونة</p>
              <p className="text-[11px] text-[#6B7280]">شوفي حجوزاتك، قيّمي، وكرّمي اللي خدمك</p>
            </div>
          </div>
          <ChevronLeft className="w-5 h-5 text-[#6B7280]" />
        </Link>

        <p className="text-center text-[10px] text-[#6B7280] pt-2">powered by <b className="text-[#1F6F5F]">مضمونة</b> · madmonacairo.com</p>
      </main>
    </div>
  )
}
