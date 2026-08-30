'use client'
// ============================================================================
// 🎁 /b/[token] — صفحة العرض للعارض في المعرض
//
// (٢٨ أغسطس ٢٠٢٦) محمد: «عايز أجهّز عرض لكل عارض بتفاصيل شغله وأعمل
//   مفاجأة ليه وأخليه يضيف الجديد» + «مش هنعرض على الماركت بليس
//   منتجاته إلا لما يوافق ويستلم».
//
// الشاشة دي هي «المفاجأة»: العارض يمسح QR على الاستاند، فيلاقي
// **نظام إدارة باسم شركته** جاهز بموديولاته ومنتجاته.
// وزرار واحد بيحوّله لبيزنس حقيقي — بموافقته.
//
// ⚖️ المنتجات المعروضة من الكتالوج المعلن، وبتتحفظ **مسودّات** بعد
//    الاستلام — مابتظهرش في الماركت بليس إلا لما هو ينشرها.
// ============================================================================
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'
import {
  Loader2, CheckCircle2, ShieldCheck, Package, Users, Wallet, Factory,
  Boxes, CalendarClock, ClipboardCheck, LayoutGrid, ShoppingCart, Star,
  Sparkles, ArrowLeft,
} from 'lucide-react'

export type Preview = {
  business_name: string
  business_name_en: string | null
  logo_url: string | null
  booth_number: string | null
  source_event: string
  description: string | null
  industry_name: string | null
  regulator: string | null
  license_note: string | null
  modules: string[]
  sample_products: { name: string; description?: string }[]
  status: string
  already_claimed: boolean
}

const MOD: Record<string, { label: string; icon: typeof Package }> = {
  listings: { label: 'إعلاناتك', icon: LayoutGrid },
  orders: { label: 'الطلبات', icon: ShoppingCart },
  bookings: { label: 'الحجوزات', icon: CalendarClock },
  reviews: { label: 'التقييمات', icon: Star },
  crm: { label: 'عملاؤك', icon: Users },
  team: { label: 'فريقك', icon: Users },
  accounting: { label: 'الحسابات', icon: Wallet },
  production: { label: 'أوامر التشغيل', icon: Factory },
  materials: { label: 'الخامات', icon: Boxes },
  stages: { label: 'مراحل الإنتاج', icon: Factory },
  batches: { label: 'التشغيلات', icon: ClipboardCheck },
  quality_control: { label: 'مراقبة الجودة', icon: ShieldCheck },
  expiry_tracking: { label: 'تتبّع الصلاحية', icon: CalendarClock },
  regulatory: { label: 'الملف الرقابي', icon: ShieldCheck },
  inventory: { label: 'المخزون', icon: Boxes },
  bulk_products: { label: 'المنتجات بالجملة', icon: Package },
}

/* 🖥️ (٢٨ أغسطس ٢٠٢٦) محمد طلب إن الصفحة تتبني على السيرفر.
   كانت بتتبني في المتصفح بالكامل — فالعارض بيشوف صفحة فاضية لحد
   ما الداتا توصل. في قاعة معرض بنت ضعيف ده فرق حقيقي.
   دلوقتي السيرفر بيجيب الداتا، والكومبوننت ده للتفاعل بس (الاستلام). */
export default function ProspectView({ token, data }: { token: string; data: Preview | null }) {
  const router = useRouter()
  const [claiming, setClaiming] = useState(false)
  const [done, setDone] = useState<string | null>(null)
  const loading = false

  async function claim() {
    const { data: { session } } = await supabaseBrowser.auth.getSession()
    if (!session?.user) {
      router.push(`/auth/login?redirect=${encodeURIComponent(`/b/${token}`)}`)
      return
    }
    setClaiming(true)
    try {
      const { data: r } = await (supabaseBrowser.rpc as unknown as (
        f: string, a: Record<string, unknown>,
      ) => Promise<{ data: unknown }>)('claim_prospect_business', {
        p_token: token, p_profile_id: session.user.id,
      })
      const res = r as { ok: boolean; message?: string; reason?: string }
      setDone(res?.message || res?.reason || 'تم')
    } catch (e) {
      alert(e instanceof Error ? e.message : 'حصل خطأ، جرّب تاني')
    }
    setClaiming(false)
  }

  if (loading) return <div className="py-32 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" /></div>

  if (!data) {
    return (
      <div className="max-w-md mx-auto py-24 px-4 text-center" dir="rtl">
        <h1 className="font-black text-lg mb-2">الرابط ده مش صالح</h1>
        <p className="text-sm text-gray-600">اتأكد من الكود أو كلّم فريق مضمونة.</p>
      </div>
    )
  }

  if (done) {
    return (
      <div className="max-w-md mx-auto py-20 px-4 text-center" dir="rtl">
        <CheckCircle2 className="w-14 h-14 text-[#059669] mx-auto mb-3" />
        <h1 className="font-black text-xl mb-2">أهلاً بيك في مضمونة</h1>
        <p className="text-sm text-gray-700 leading-relaxed mb-5">{done}</p>
        <a href="/supplier/erp"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#34D399] text-[#04352A] font-black text-sm">
          افتح نظام الإدارة <ArrowLeft className="w-4 h-4" />
        </a>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto p-4 pb-32" dir="rtl">
      {/* الترحيب */}
      <div className="text-center pt-6 pb-5">
        <p className="text-[11px] font-bold text-[#059669] mb-2">
          <Sparkles className="w-3.5 h-3.5 inline ml-1" />
          {data.source_event}{data.booth_number ? ` · استاند ${data.booth_number}` : ''}
        </p>
        {data.logo_url
          ? <img src={data.logo_url} alt="" className="w-16 h-16 rounded-2xl object-cover mx-auto mb-3 border border-gray-200" />
          : <div className="w-16 h-16 rounded-2xl bg-[#F1EEE6] flex items-center justify-center mx-auto mb-3">
              <Factory className="w-7 h-7 text-[#059669]" />
            </div>}
        <h1 className="text-xl font-black text-gray-900">{data.business_name}</h1>
        {data.industry_name && <p className="text-xs text-gray-500 mt-1">{data.industry_name}</p>}
        <p className="text-sm font-bold text-gray-700 mt-4 leading-relaxed">
          جهّزنا نظام إدارة كامل لشركتك على مضمونة.
          <br />
          <span className="text-gray-500 font-normal text-xs">
            شوفه الأول — ولو عجبك استلمه في ثانية.
          </span>
        </p>
      </div>

      {/* الموديولات */}
      <h2 className="text-sm font-black text-gray-900 mb-2">نظامك جاهز بـ{data.modules.length} أداة</h2>
      <div className="grid grid-cols-2 gap-2 mb-5">
        {data.modules.map((m) => {
          const ui = MOD[m]
          if (!ui) return null
          return (
            <div key={m} className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5">
              <ui.icon className="w-4 h-4 text-[#059669] shrink-0" />
              <span className="text-xs font-bold text-gray-800">{ui.label}</span>
            </div>
          )
        })}
      </div>

      {/* منتجاته */}
      {data.sample_products?.length > 0 && (
        <>
          <h2 className="text-sm font-black text-gray-900 mb-1">ومنتجاتك جاهزة للعرض</h2>
          <p className="text-[11px] text-gray-500 mb-2">
            من الكتالوج المعلن في المعرض — <b>مش منشورة</b>، تراجعها وتقرر تنشر إيه.
          </p>
          <div className="space-y-1.5 mb-5">
            {data.sample_products.map((p, i) => (
              <div key={i} className="flex items-center gap-2.5 rounded-xl border border-gray-200 bg-white px-3 py-2.5">
                <Package className="w-4 h-4 text-gray-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-gray-900">{p.name}</p>
                  {p.description && <p className="text-[11px] text-gray-500">{p.description}</p>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ⚖️ التنبيه الرقابي — شفافية من أول لحظة */}
      {data.license_note && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3.5 mb-5">
          <p className="text-[11px] font-black text-amber-900 mb-1 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" /> {data.regulator}
          </p>
          <p className="text-[11px] text-amber-900 leading-relaxed">{data.license_note}</p>
        </div>
      )}

      <div className="rounded-2xl bg-[#F1EEE6] p-3.5 mb-5">
        <p className="text-[11.5px] text-gray-700 leading-relaxed">
          <b>معاملاتك مضمونة:</b> فلوس العميل محفوظة لحد ما يستلم، والسعر اللي بتحدده
          هو اللي بيوصلك بالكامل. الإضافة والنشر <b>مجانًا</b>.
        </p>
      </div>

      {/* زرار الاستلام */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 p-3">
        <div className="max-w-lg mx-auto">
          {data.already_claimed ? (
            <p className="text-center text-sm font-bold text-gray-600 py-2">
              البيزنس ده اتستلم بالفعل ✓
            </p>
          ) : (
            <>
              <button onClick={claim} disabled={claiming}
                className="w-full py-3.5 rounded-2xl bg-[#34D399] text-[#04352A] font-black text-sm disabled:opacity-50">
                {claiming ? 'لحظة…' : 'استلم نظامك دلوقتي'}
              </button>
              <p className="text-center text-[10.5px] text-gray-400 mt-1.5">
                بتسجّل برقمك، ومنتجاتك مابتظهرش للعملاء غير لما تنشرها بنفسك.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
