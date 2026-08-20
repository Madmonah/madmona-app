'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import {
  Loader2, Check, ArrowLeft, Store, Users, CalendarClock, Wallet,
  ClipboardList, BarChart3, MessageCircle, ShieldCheck, MapPin,
} from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } },
)

/* ============================================================================
   /manage/[slug] — «تقدر تدير البيزنس بتاعك من هنا»
   ============================================================================
   🎯 (٢٠ أغسطس ٢٠٢٦) محمد: «محتاجين نعمل شكل محترف لعملاء كل بيزنس، وشكل
      محترف أو لينك نبعته لكل بيزنس نقوله تقدر تدير البيزنس بتاعك من هنا،
      وأكيد باللوجو بتاعه لو موجود ولو مش موجود هنعمل لوجو باسمه، وأكيد أي
      بيزنس عنده منتج أو خدمة أو مشروع عقاري أو أي حاجة تكون مسمّعة معانا
      في الماركت بليس».

   اللي كان موجود قبل كده:
     • `/s/[slug]`  → صفحة العملاء (شغّالة كويس)
     • `/join/[slug]` → **انضمام الموظفين**، مش صاحب البيزنس
     • `/owner/[id]` → بوابة المالك بس بالـUUID ومقفولة بتوكن
     ومفيش أي صفحة نبعتها لصاحب بيزنس **قبل** ما يكون له حساب.
     وكمان ١١٣ بيزنس من ١٦٢ مكانش لهم `join_slug` أصلًا — يعني ماكانش
     ينفع نبعتلهم لينك محترم أصلًا. اتعملوا كلهم دلوقتي.

   الصفحة دي عامة عن قصد — بتعرض اسمه ولوجوه وحاجاته اللي معروضة عندنا،
   وبتوريه إن شغله **موجود بالفعل** في الماركتبليس، وبعدين تقوله ادخل.
   ============================================================================ */

type Invite = {
  ok: boolean; error?: string
  supplier_id: string; business_name: string
  logo_url: string | null; cover_url: string | null
  industry: string | null; city: string | null; district: string | null
  description: string | null; slug: string; in_marketplace: boolean
  counts: { listings: number; projects: number; branches: number; services: number }
  showcase: { title: string; slug: string; price: number | null; photo: string | null }[]
}

const FEATURES = [
  { icon: <Store className="w-4 h-4" />,         t: 'منتجاتك وخدماتك', s: 'اعرضها للعملاء وعدّل الأسعار في ثانية' },
  { icon: <CalendarClock className="w-4 h-4" />, t: 'الحجوزات والمواعيد', s: 'كل ميعاد جاي قدامك، والعميل بيتبعتله تذكير' },
  { icon: <Users className="w-4 h-4" />,         t: 'موظفينك', s: 'حضور وانصراف أوتوماتيك · طلبات · صلاحيات' },
  { icon: <Wallet className="w-4 h-4" />,        t: 'الفلوس', s: 'مصاريف · مرتبات · حسابات وقيود · تقارير' },
  { icon: <ClipboardList className="w-4 h-4" />, t: 'المخزون والمشتريات', s: 'كام باقي · إيه اللي قرب يخلص' },
  { icon: <BarChart3 className="w-4 h-4" />,     t: 'متابعة عملائك', s: 'مين بقاله كتير مجاش · مين محتاج تكلّمه' },
]

const egp = (n: number | null) => n == null ? '' : `${Number(n).toLocaleString('ar-EG')} ج`

export default function ManageInvitePage({ params }: { params: { slug: string } }) {
  const [d, setD] = useState<Invite | null>(null)
  const [loading, setLoading] = useState(true)
  const [logoOk, setLogoOk] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const { data } = await (supabase.rpc as unknown as (
          fn: string, args: Record<string, unknown>,
        ) => Promise<{ data: Invite | null }>)('public_business_invite', { p_slug: params.slug })
        setD(data)
      } catch (e) {
        console.error('[manage] invite load failed:', e)
      } finally { setLoading(false) }
    })()
  }, [params.slug])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B1512] flex items-center justify-center" dir="rtl">
        <Loader2 className="w-7 h-7 animate-spin text-[#34D399]" />
      </div>
    )
  }

  if (!d?.ok) {
    return (
      <div className="min-h-screen bg-[#0B1512] flex items-center justify-center px-6" dir="rtl">
        <div className="text-center">
          <p className="text-white font-black text-lg mb-2">اللينك ده مش شغّال</p>
          <p className="text-white/50 text-sm mb-5">يمكن يكون اتغيّر. كلّمنا ونبعتلك لينك جديد.</p>
          <Link href="/marketplace" className="text-[#34D399] font-bold text-sm no-underline">
            روح للماركتبليس
          </Link>
        </div>
      </div>
    )
  }

  // 🖼️ لوجوه لو موجود، وإلا لوجو مولّد باسمه — مش أيقونة عامة
  const logo = d.logo_url && logoOk ? d.logo_url : `/api/logo/${d.supplier_id}`
  const total = d.counts.listings + d.counts.projects + d.counts.services
  const place = [d.district, d.city].filter(Boolean).join('، ')

  return (
    <div className="min-h-screen bg-[#0B1512]" dir="rtl">
      {/* ── الغلاف ── */}
      <div className="relative h-52 md:h-64 overflow-hidden">
        {d.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={d.cover_url} alt="" className="w-full h-full object-cover opacity-40" />
        ) : (
          <div className="w-full h-full bg-gradient-to-bl from-[#14231E] via-[#0F3D31] to-[#059669] opacity-70" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B1512] via-[#0B1512]/60 to-transparent" />
      </div>

      <main className="max-w-3xl mx-auto px-5 -mt-24 relative pb-16">
        {/* ── الهيدر ── */}
        <div className="text-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logo}
            alt={d.business_name}
            onError={() => setLogoOk(false)}
            className="w-24 h-24 rounded-3xl object-cover mx-auto mb-4 shadow-2xl ring-4 ring-white/10 bg-white"
          />
          <h1 className="text-2xl md:text-3xl font-black text-white leading-tight">
            {d.business_name}
          </h1>
          {place && (
            <p className="text-white/45 text-[12.5px] mt-1.5 flex items-center justify-center gap-1">
              <MapPin className="w-3.5 h-3.5" /> {place}
            </p>
          )}
          <p className="text-[#34D399] font-black text-base md:text-lg mt-4">
            تقدر تدير البيزنس بتاعك من هنا
          </p>
        </div>

        {/* ── شغلك موجود عندنا بالفعل ── */}
        {total > 0 && (
          <section className="bg-white/[0.04] border border-white/10 rounded-3xl p-5 mb-5">
            <p className="text-white font-bold text-sm mb-3 flex items-center gap-2">
              <Check className="w-4 h-4 text-[#34D399]" />
              شغلك معروض على مضمونة بالفعل
            </p>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {d.counts.listings > 0 && <Num n={d.counts.listings} l="منتج وخدمة" />}
              {d.counts.projects > 0 && <Num n={d.counts.projects} l="مشروع عقاري" />}
              {d.counts.services > 0 && <Num n={d.counts.services} l="خدمة" />}
              {d.counts.branches > 0 && <Num n={d.counts.branches} l="فرع" />}
            </div>

            {d.showcase.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {d.showcase.slice(0, 6).map((it, i) => (
                  <Link
                    key={i}
                    href={`/marketplace/${it.slug}`}
                    className="block rounded-xl overflow-hidden bg-white/5 no-underline group"
                  >
                    <div className="aspect-square bg-white/5 overflow-hidden">
                      {it.photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={it.photo} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/20">
                          <Store className="w-6 h-6" />
                        </div>
                      )}
                    </div>
                    <div className="p-2">
                      <p className="text-white text-[10.5px] font-bold leading-tight line-clamp-2">{it.title}</p>
                      {it.price != null && (
                        <p className="text-[#34D399] text-[10px] font-black mt-0.5">{egp(it.price)}</p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}

            <Link
              href={`/s/${d.slug}`}
              className="mt-4 w-full inline-flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white py-2.5 rounded-2xl text-[13px] font-bold no-underline transition-colors"
            >
              شوف صفحتك زي ما العميل بيشوفها
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </section>
        )}

        {/* ── اللي هتقدر تعمله ── */}
        <section className="bg-white/[0.04] border border-white/10 rounded-3xl p-5 mb-5">
          <p className="text-white font-bold text-sm mb-4">اللي هتديره من لوحتك</p>
          <div className="grid md:grid-cols-2 gap-3">
            {FEATURES.map((f, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#34D399]/12 text-[#34D399] flex items-center justify-center flex-shrink-0">
                  {f.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-white text-[13px] font-bold leading-tight">{f.t}</p>
                  <p className="text-white/45 text-[11.5px] mt-0.5 leading-snug">{f.s}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── الدخول ── */}
        <section className="bg-gradient-to-bl from-[#059669] to-[#0F3D31] rounded-3xl p-6 text-center">
          <p className="text-white font-black text-lg mb-1.5">جاهز تبدأ؟</p>
          <p className="text-white/70 text-[12.5px] mb-5 leading-relaxed">
            سجّل دخولك برقم تليفونك — لوحتك جاهزة ومستنياك.
          </p>
          <Link
            href={`/auth/login?next=${encodeURIComponent(`/admin/business-finance/${d.supplier_id}`)}`}
            className="inline-flex items-center justify-center gap-2 bg-white text-[#04352A] px-7 py-3 rounded-2xl text-sm font-black no-underline hover:bg-white/90 transition-colors"
          >
            <ShieldCheck className="w-4 h-4" />
            ادخل على لوحتك
          </Link>
          <p className="text-white/45 text-[11px] mt-4">
            مش لاقي حسابك؟{' '}
            <a href="https://wa.me/201002229982" target="_blank" rel="noopener noreferrer"
              className="text-white font-bold underline">
              كلّمنا على واتساب
            </a>
          </p>
        </section>

        <p className="text-center text-white/25 text-[11px] mt-8 flex items-center justify-center gap-1.5">
          <MessageCircle className="w-3.5 h-3.5" />
          مضمونة — منصة إدارة وتسويق البيزنس
        </p>
      </main>
    </div>
  )
}

function Num({ n, l }: { n: number; l: string }) {
  return (
    <div className="bg-white/5 rounded-2xl py-3 text-center">
      <p className="text-[#34D399] text-xl font-black leading-none">{n}</p>
      <p className="text-white/50 text-[10.5px] font-bold mt-1">{l}</p>
    </div>
  )
}
