import { safeStorage } from '@/lib/safe-storage'
'use client'
// =====================================================================
// 🔑 MyAssetsCard — «حاجاتي» في شاشة حسابي  (15 Jul 2026)
//
// المبدأ: رقم التليفون = الهوية = الملكية. أي حاجة معروضة على مضمونة
// (إعلان · مشروع عقاري · نشاط تجاري) مربوطة برقم في asset_owners،
// وصاحب الرقم بيلاقيها هنا ويتحكم فيها — مهما كان الأصل اتضاف إزاي:
// من الموقع، أو المارد ضافه من واتساب.
//
// قبل كده كانت الحاجات دي متفرّقة على 3 داشبوردات مالهاش رابط ظاهر،
// فالناس مكانتش بتوصلها أصلاً. دلوقتي كلها في مكان واحد.
//
// الداتا من my_assets() — بتاخد الهوية من جلسة Supabase وبترجّع كل
// أصول الرقم في نداء واحد.
// =====================================================================
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabase-browser'
import {
  Building2, Home, Store, ChevronLeft, Loader2, Phone, ShieldCheck, CalendarClock,
} from 'lucide-react'

type Project = {
  id: string; title: string; developer: string | null; area: string
  slug: string; cover_url: string | null; status: string
  property_type: string | null; role: string; href: string
}
type Listing = { id: string; title: string; status: string; role: string; href: string }
type Business = {
  id: string; name: string; logo_url: string | null; status: string
  has_erp_crm: boolean | null; role: string; href: string
}
// 📅 (15 Jul 2026) المواعيد — قبل كده المارد كان بيوعد بميعاد ومفيش حاجة بتتسجّل،
// فالعميل مكانش عنده أي طريقة يتأكد. دلوقتي بيشوفه هنا بعينه.
type Meeting = {
  id: string; at: string; kind: 'visit' | 'call' | 'online'
  location: string | null; status: string
}
type MyAssets = {
  authenticated: boolean
  phone: string | null
  needs_phone: boolean
  projects: Project[]
  listings: Listing[]
  businesses: Business[]
  meetings: Meeting[]
}

const KIND_LABEL: Record<string, string> = {
  visit: 'زيارة لمقرّنا', call: 'مكالمة تليفون', online: 'أونلاين',
}

// «النهاردة الساعة ٤:٣٠ م» / «بكره ...» / «الخميس ٢٤ يوليو ...» — بتوقيت القاهرة
function meetingWhen(iso: string): string {
  const d = new Date(iso)
  const cairo = (o: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat('ar-EG', { timeZone: 'Africa/Cairo', ...o }).format(d)
  const يوم = (x: Date) =>
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(x)
  const الوقت = cairo({ hour: 'numeric', minute: '2-digit', hour12: true })
  const now = new Date()
  const بكره = new Date(now.getTime() + 86400000)
  if (يوم(d) === يوم(now)) return `النهاردة الساعة ${الوقت}`
  if (يوم(d) === يوم(بكره)) return `بكره الساعة ${الوقت}`
  return `${cairo({ weekday: 'long', day: 'numeric', month: 'long' })} — ${الوقت}`
}

export default function MyAssetsCard() {
  const [data, setData] = useState<MyAssets | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      try {
        // الناس داخلة من مسارين: جلسة Supabase (جوجل) أو توكن واتساب.
        // بنبعت التوكن لو موجود — الدالة بتفهم الاتنين، فمحدش بيتسجّل خروج
        // وإحنا بنوحّد الهوية تحت.
        const waToken =
          typeof window !== 'undefined' ? safeStorage.get('madmona_token') : null

        // @ts-expect-error — أنواع الـRPC المولّدة لسه متعرفش my_assets
        const { data: res } = await supabaseBrowser.rpc('my_assets', {
          p_wa_token: waToken || null,
        })
        setData(res as unknown as MyAssets | null)
      } catch {
        // الكارت بيختفي بدل ما يوقع الصفحة
      }
      setLoading(false)
    })()
  }, [])

  if (loading) {
    return (
      <div className="bg-white rounded-3xl shadow-soft p-6 flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-[#1F6F5F] animate-spin" />
      </div>
    )
  }

  if (!data?.authenticated) return null

  // 🔵 داخل بجوجل ولسه محطش رقم — من غير الرقم مفيش ملكية، فده أهم زرار في الصفحة
  if (data.needs_phone) {
    return (
      <div className="bg-gradient-to-br from-[#1F6F5F] to-[#2FA084] rounded-3xl shadow-soft p-6 text-white">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
            <Phone className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-[15px] mb-1">أضف رقم موبايلك</p>
            <p className="text-white/85 text-xs leading-relaxed mb-4">
              رقمك هو هويتك على مضمونة. أول ما تضيفه، أي مشروع أو إعلان أو نشاط
              تجاري مربوط بيه هيظهر هنا وتقدر تتحكم فيه.
            </p>
            <Link
              href="/auth/complete-phone?redirect=/account"
              className="inline-flex items-center gap-1.5 bg-white text-[#1F6F5F] font-bold text-xs px-4 py-2.5 rounded-full no-underline hover:bg-white/90 transition-colors"
            >
              أضف رقمي دلوقتي
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const total =
    (data.projects?.length || 0) + (data.listings?.length || 0) + (data.businesses?.length || 0)
  const meetings = data.meetings || []

  // 📅 الميعاد بيبان لوحده — حتى لو الشخص معندوش أصول خالص.
  // ده مقصود: أي حد ليه ميعاد لازم يشوفه، مش بس الموردين.
  const meetingCard = meetings.length > 0 && (
    <div className="bg-white rounded-3xl shadow-soft overflow-hidden mb-4">
      <div className="px-6 py-3.5 border-b border-gray-100">
        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
          ميعادك مع فريق مضمونة
        </p>
      </div>
      <div className="px-6 py-4 space-y-3">
        {meetings.map((m) => (
          <div key={m.id} className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#2FA084]/10 text-[#1F6F5F] flex items-center justify-center shrink-0">
              <CalendarClock className="w-4.5 h-4.5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-[14px] text-gray-900">{meetingWhen(m.at)}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {KIND_LABEL[m.kind] || m.kind}
                {m.location ? ` · ${m.location}` : ''}
              </p>
            </div>
          </div>
        ))}
        <p className="text-[11px] text-gray-400 leading-relaxed pt-1">
          لو محتاج تغيّر الميعاد، ابعت للمارد على واتساب{' '}
          <span className="font-bold text-gray-500" dir="ltr">01002229982</span>
        </p>
      </div>
    </div>
  )

  // مفيش أصول ولا مواعيد؟ الكارت مبيظهرش — بانر «اعرض معانا» بيغطّي الحالة دي
  if (total === 0 && meetings.length === 0) return null
  if (total === 0) return <>{meetingCard}</>

  return (
    <>
    {meetingCard}
    <div className="bg-white rounded-3xl shadow-soft overflow-hidden">
      <div className="px-6 py-3.5 border-b border-gray-100 flex items-center justify-between">
        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
          حاجاتي على مضمونة
        </p>
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#2FA084] bg-[#2FA084]/10 px-2 py-0.5 rounded-full">
          <ShieldCheck className="w-3 h-3" />
          {total}
        </span>
      </div>

      {/* 🏗️ المشاريع — بصور، لأن دي أغلى الأصول وأكترها تفاصيل */}
      {data.projects?.length > 0 && (
        <AssetGroup
          icon={<Building2 className="w-4 h-4" />}
          label="مشاريعي العقارية"
          count={data.projects.length}
          href="/my-projects"
        >
          <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-1 px-1">
            {data.projects.slice(0, 8).map((p) => (
              <Link
                key={p.id}
                href="/my-projects"
                className="shrink-0 w-32 no-underline group"
              >
                <div className="relative w-32 h-20 rounded-xl overflow-hidden bg-gradient-to-br from-[#1F6F5F] to-[#2FA084] mb-1.5">
                  {p.cover_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={p.cover_url}
                      alt={p.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-white/80" />
                    </div>
                  )}
                  {p.status !== 'published' && (
                    <span className="absolute top-1 right-1 bg-amber-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full">
                      مسودة
                    </span>
                  )}
                </div>
                <p className="text-[11px] font-bold text-gray-800 leading-tight line-clamp-2">
                  {p.title}
                </p>
                <p className="text-[9px] text-gray-400 mt-0.5">{p.area}</p>
              </Link>
            ))}
          </div>
        </AssetGroup>
      )}

      {/* 🏪 الأنشطة التجارية */}
      {data.businesses?.length > 0 && (
        <AssetGroup
          icon={<Store className="w-4 h-4" />}
          label="نشاطي التجاري"
          count={data.businesses.length}
          href="/supplier/dashboard"
        >
          <div className="space-y-1.5">
            {data.businesses.map((b) => (
              <Link
                key={b.id}
                href={b.href}
                className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-gray-50 transition-colors no-underline"
              >
                <div className="w-8 h-8 rounded-lg bg-[#1F6F5F]/10 flex items-center justify-center shrink-0 overflow-hidden">
                  {b.logo_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={b.logo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Store className="w-4 h-4 text-[#1F6F5F]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-gray-800 truncate">{b.name}</p>
                  {b.role === 'staff' && (
                    <p className="text-[9px] text-gray-400">موظف</p>
                  )}
                </div>
                <ChevronLeft className="w-3.5 h-3.5 text-gray-300" />
              </Link>
            ))}
          </div>
        </AssetGroup>
      )}

      {/* 📣 الإعلانات */}
      {data.listings?.length > 0 && (
        <AssetGroup
          icon={<Home className="w-4 h-4" />}
          label="إعلاناتي"
          count={data.listings.length}
          href="/supplier/marketplace"
        >
          <div className="space-y-1.5">
            {data.listings.slice(0, 5).map((l) => (
              <Link
                key={l.id}
                href={l.href}
                className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-gray-50 transition-colors no-underline"
              >
                <div className="w-8 h-8 rounded-lg bg-[#2FA084]/10 flex items-center justify-center shrink-0">
                  <Home className="w-4 h-4 text-[#2FA084]" />
                </div>
                <p className="flex-1 text-xs font-bold text-gray-800 truncate">{l.title}</p>
                <ChevronLeft className="w-3.5 h-3.5 text-gray-300" />
              </Link>
            ))}
            {data.listings.length > 5 && (
              <Link
                href="/supplier/marketplace"
                className="block text-center text-[10px] font-bold text-[#1F6F5F] py-1.5 no-underline hover:underline"
              >
                شوف الـ{data.listings.length} كلهم
              </Link>
            )}
          </div>
        </AssetGroup>
      )}
    </div>
    </>
  )
}

function AssetGroup({
  icon, label, count, href, children,
}: {
  icon: React.ReactNode
  label: string
  count: number
  href: string
  children: React.ReactNode
}) {
  return (
    <div className="px-5 py-4 border-b border-gray-50 last:border-0">
      <div className="flex items-center justify-between mb-2.5">
        <p className="flex items-center gap-1.5 text-xs font-bold text-gray-700">
          <span className="text-[#1F6F5F]">{icon}</span>
          {label}
          <span className="text-[10px] text-gray-400 font-medium">({count})</span>
        </p>
        <Link
          href={href}
          className="text-[10px] font-bold text-[#1F6F5F] no-underline hover:underline"
        >
          تحكّم
        </Link>
      </div>
      {children}
    </div>
  )
}
