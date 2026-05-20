'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import {
  Loader2, MapPin, Phone, Calendar, ChevronLeft, Scissors, Clock,
  Sparkles, User, Star, ChevronDown, MessageCircle,
} from 'lucide-react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

const CATEGORY_LABELS: Record<string, string> = {
  hair_cut: 'قص شعر', hair_color: 'صبغة', hair_treatment: 'علاج شعر', styling: 'سشوار / تسريحة',
  makeup: 'مكياج', bridal: 'عرايس', nails: 'أظافر', skin: 'بشرة', spa: 'سبا',
  package: 'باقات', waxing: 'إزالة شعر', general: 'عام', عام: 'عام',
}
const fmt = (n: any) => Number(n || 0).toLocaleString('ar-EG')

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

  const branches = data.branches || []
  const services = data.services || []
  // WhatsApp goes to Madmona's business line (AI auto-responder)
  const WA = '201002229982'

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      {/* Hero */}
      <header className="bg-[#1F6F5F] text-white">
        <div className="max-w-2xl mx-auto px-4 py-10 text-center">
          {data.logo_url && logoOk ? (
            <div className="w-20 h-20 rounded-2xl bg-white grid place-items-center mx-auto mb-4 overflow-hidden shadow-sm p-1">
              <img src={data.logo_url} alt={data.business_name} className="w-full h-full object-contain rounded-xl" onError={() => setLogoOk(false)} />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-white/15 grid place-items-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
          )}
          <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-white/70 mb-1">
            {data.industry === 'beauty_salon' ? 'صالون تجميل' : 'احجزي أونلاين'}
          </p>
          <h1 className="text-3xl md:text-4xl font-black mb-2">{data.business_name}</h1>
          <p className="text-sm text-white/80">{branches.length} فروع · {data.service_count} خدمة · حجز أونلاين فوري</p>
          <div className="flex items-center justify-center gap-2 mt-5">
            <a href="#book" className="px-6 py-3 rounded-xl bg-white text-[#1F6F5F] font-black text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4" /> احجزي موعدك
            </a>
            <a href={`https://wa.me/${WA}`} target="_blank" rel="noopener" className="px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm flex items-center gap-2">
              <MessageCircle className="w-4 h-4" /> تواصلي
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Account access */}
        <Link href="/login" className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center justify-between hover:border-[#1F6F5F] hover:shadow-md transition-all">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1F6F5F]/10 grid place-items-center"><User className="w-5 h-5 text-[#1F6F5F]" /></div>
            <div>
              <p className="font-black text-[#1A2E26]">حسابك على مضمونة</p>
              <p className="text-[11px] text-[#6B7280]">شوفي حجوزاتك، قيّمي، وكرّمي اللي خدمك</p>
            </div>
          </div>
          <ChevronLeft className="w-5 h-5 text-[#6B7280]" />
        </Link>

        {/* Branches → book */}
        <section id="book">
          <h2 className="text-sm font-black text-[#1A2E26] mb-3 flex items-center gap-1.5"><Calendar className="w-4 h-4 text-[#1F6F5F]" /> احجزي في أقرب فرع ليكي</h2>
          <div className="space-y-2">
            {branches.map((b: any) => (
              <Link key={b.id} href={`/book/${b.code}`} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center justify-between hover:border-[#1F6F5F] hover:shadow-md transition-all">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[#1F6F5F]/10 grid place-items-center flex-shrink-0"><MapPin className="w-5 h-5 text-[#1F6F5F]" /></div>
                  <div className="min-w-0">
                    <p className="font-black text-[#1A2E26] truncate">{b.name}</p>
                    {(b.address || b.district) && <p className="text-[11px] text-[#6B7280] truncate">{b.address || b.district}</p>}
                  </div>
                </div>
                <span className="text-[#1F6F5F] font-bold text-sm flex items-center gap-1 flex-shrink-0">احجزي <ChevronLeft className="w-4 h-4" /></span>
              </Link>
            ))}
          </div>
        </section>

        {/* Services menu */}
        {services.length > 0 && (
          <section>
            <h2 className="text-sm font-black text-[#1A2E26] mb-3 flex items-center gap-1.5"><Scissors className="w-4 h-4 text-[#1F6F5F]" /> الخدمات والأسعار</h2>
            <div className="space-y-2">
              {services.map((cat: any) => {
                const isOpen = openCat === cat.category
                return (
                  <div key={cat.category} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    <button onClick={() => setOpenCat(isOpen ? null : cat.category)} className="w-full px-4 py-3 flex items-center justify-between">
                      <span className="font-black text-[#1A2E26] text-sm">{CATEGORY_LABELS[cat.category] || cat.category}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-[#6B7280]">{cat.items.length} خدمة</span>
                        <ChevronDown className={`w-4 h-4 text-[#6B7280] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      </div>
                    </button>
                    {isOpen && (
                      <div className="divide-y divide-gray-100 border-t border-gray-100">
                        {cat.items.map((s: any, i: number) => (
                          <div key={i} className="px-4 py-2.5 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm text-[#1A2E26] truncate">{s.name}</p>
                              {s.duration > 0 && <p className="text-[10px] text-[#6B7280] flex items-center gap-1"><Clock className="w-3 h-3" /> {s.duration} دقيقة</p>}
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

        {/* Trust footer */}
        <section className="bg-[#1F6F5F]/5 border border-[#1F6F5F]/20 rounded-2xl p-4 flex items-start gap-2">
          <Star className="w-4 h-4 text-[#1F6F5F] flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-[#6B7280] leading-relaxed">
            الحجز والدفع مؤمّن عن طريق <b className="text-[#1A2E26]">مضمونة</b> — احجزي أونلاين، استلمي تأكيد على واتساب، وقيّمي خدمتك بعد الزيارة.
          </p>
        </section>

        <p className="text-center text-[10px] text-[#6B7280]">powered by مضمونة · madmonacairo.com</p>
      </main>
    </div>
  )
}
