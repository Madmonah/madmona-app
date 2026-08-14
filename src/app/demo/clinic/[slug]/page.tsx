'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabase-browser'
import SiteFooter from '@/components/SiteFooter'
import {
  Loader2, MapPin, Calendar, Stethoscope, Building2,
  Users, CheckCircle2, Activity, Shield,
  DollarSign, Sparkles, Brain, Clock, MessageSquare, BarChart3,
  ExternalLink,
} from 'lucide-react'

interface Doctor {
  employee_id: string
  title_ar: string
  specialty_label_ar: string
  consultation_fee_egp: number
  accepted_insurance: string[] | null
  years_experience: number
  bio: string | null
  branch_code: string
}

interface SpecialtyGroup {
  specialty_label_ar: string
  doctors: Doctor[]
}

interface Branch {
  branch_code: string
  branch_name: string
  address: string | null
  city: string | null
  latitude: number | null
  longitude: number | null
}

interface RecentBooking {
  service_name: string
  patient_initial: string
  scheduled_at: string
  status: string
}

interface PnLEntry {
  branch_name: string
  bookings_count: number
  revenue_egp: number
}

interface Snapshot {
  business_name: string
  industry: string
  contact_phone: string | null
  branches: Branch[]
  specialties: SpecialtyGroup[]
  kpis: {
    total_bookings: number
    completed: number
    confirmed: number
    no_show: number
    revenue_egp: number
    deposits_collected_egp: number
    doctors_count: number
    branches_count: number
  }
  recent_bookings: RecentBooking[]
  pnl: PnLEntry[]
}

const FEATURES = [
  { icon: Calendar, title: 'حجز ٢٤/٧', desc: 'المرضى يحجزوا أونلاين في أي وقت' },
  { icon: Shield, title: 'عربون مضمون', desc: '٥٪ عربون من كل حجز عشان نضمن الحضور' },
  { icon: MapPin, title: 'حضور بالموقع', desc: 'الموظفين بيسجلوا حضور بـ GPS' },
  { icon: Users, title: 'إدارة الفريق', desc: 'PIN لكل موظف — مفيش paperwork' },
  { icon: Clock, title: 'الورديات', desc: 'جدول مرتب أوتوماتيك' },
  { icon: DollarSign, title: 'المرتبات', desc: 'حساب أتوماتيك مع الخصومات' },
  { icon: CheckCircle2, title: 'التأمينات', desc: 'AXA, MetLife, Allianz, GlobeMed' },
  { icon: Brain, title: 'AI Matching', desc: 'بنطابق المرضى مع الدكتور الأنسب' },
]

export default function ClinicDemoPage() {
  const params = useParams()
  const slug = params?.slug as string
  const [data, setData] = useState<Snapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!slug) return
    let alive = true
    ;(async () => {
      try {
        const { data: snap, error: rpcErr } = await supabaseBrowser.rpc('public_clinic_demo_snapshot', {
          p_slug: slug,
        })
        if (!alive) return
        if (rpcErr) throw rpcErr
        setData(snap as Snapshot)
        setLoading(false)
      } catch (e: unknown) {
        if (!alive) return
        const msg = e instanceof Error ? e.message : 'حصل خطأ في تحميل البيانات'
        setError(msg)
        setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [slug])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl">
        <Loader2 className="w-12 h-12 animate-spin text-[#059669]" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl">
        <div className="text-center p-8">
          <p className="text-red-600 mb-4">{error || 'لم يتم العثور على البيانات'}</p>
          <Link href="/" className="text-[#059669] underline">ارجع للرئيسية</Link>
        </div>
      </div>
    )
  }

  const completionRate = data.kpis.total_bookings > 0
    ? Math.round((data.kpis.completed / data.kpis.total_bookings) * 100)
    : 0

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-[#059669] font-black text-xl">
            <span className="inline-block w-9 h-9 rounded-xl bg-[#34D399] text-[#04352A] grid place-items-center font-black">م</span>
            مضمونة
          </Link>
          <a href="https://wa.me/201002229982" target="_blank" rel="noreferrer"
            className="text-sm font-bold bg-[#34D399] text-[#04352A] px-4 py-2 rounded-xl hover:bg-[#175a4d]">
            تواصل معانا
          </a>
        </div>
      </header>

      <section className="bg-gradient-to-br from-[#34D399] via-[#34D399] to-[#2FA084] text-white py-16">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur px-4 py-2 rounded-full text-sm font-bold mb-6">
            <Sparkles className="w-4 h-4" />
            عرض حقيقي لعيادة شغّالة على مضمونة
          </div>
          <h1 className="text-3xl md:text-5xl font-black mb-4">شوف عيادتك على مضمونة</h1>
          <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto">
            ده <span className="font-bold text-[#FFD700]">{data.business_name}</span> — نموذج فعلي لعيادة بـ {data.kpis.branches_count} فروع و {data.kpis.doctors_count} أطباء.
          </p>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 -mt-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard icon={Calendar} label="حجوزات آخر ٣٠ يوم" value={data.kpis.total_bookings.toString()} />
          <KpiCard icon={CheckCircle2} label="نسبة الحضور" value={`${completionRate}%`} />
          <KpiCard icon={DollarSign} label="إيرادات (ج.م)" value={data.kpis.revenue_egp.toLocaleString('ar-EG')} />
          <KpiCard icon={Shield} label="عربون مُحصّل" value={`${data.kpis.deposits_collected_egp.toLocaleString('ar-EG')} ج`} />
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-black text-[#0A0A0A] mb-6 flex items-center gap-2">
          <Building2 className="w-6 h-6 text-[#059669]" /> الفروع ({data.branches.length})
        </h2>
        <div className="grid md:grid-cols-3 gap-4">
          {data.branches.map((b) => (
            <div key={b.branch_code} className="bg-white rounded-2xl p-5 border border-gray-100 hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 grid place-items-center mb-3">
                <Building2 className="w-5 h-5 text-[#059669]" />
              </div>
              <h3 className="font-bold text-[#0A0A0A] mb-1">{b.branch_name}</h3>
              {b.city && <p className="text-sm text-gray-600 flex items-center gap-1 mb-1">
                <MapPin className="w-3 h-3" /> {b.city}
              </p>}
              {b.address && <p className="text-xs text-gray-500">{b.address}</p>}
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white border-y border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <h2 className="text-2xl font-black text-[#0A0A0A] mb-6 flex items-center gap-2">
            <Stethoscope className="w-6 h-6 text-[#059669]" /> الأطباء ({data.kpis.doctors_count})
          </h2>
          <div className="space-y-8">
            {data.specialties.map((sp) => (
              <div key={sp.specialty_label_ar}>
                <h3 className="text-lg font-bold text-[#059669] mb-3">{sp.specialty_label_ar}</h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {sp.doctors.map((d) => (
                    <div key={d.employee_id} className="bg-[#FAFAF7] rounded-2xl p-4 border border-gray-100">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-bold text-[#0A0A0A]">{d.title_ar}</h4>
                        <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">
                          {d.years_experience} سنين
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 mb-2">
                        كشف: <span className="font-bold text-[#059669]">{d.consultation_fee_egp} ج</span>
                      </div>
                      {d.accepted_insurance && d.accepted_insurance.length > 0 && (
                        <div className="text-xs text-gray-500">تأمين: {d.accepted_insurance.join('، ')}</div>
                      )}
                      {d.bio && <p className="text-xs text-gray-600 mt-2 line-clamp-2">{d.bio}</p>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {data.recent_bookings && data.recent_bookings.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 py-12">
          <h2 className="text-2xl font-black text-[#0A0A0A] mb-6 flex items-center gap-2">
            <Activity className="w-6 h-6 text-[#059669]" /> آخر الحجوزات
          </h2>
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {data.recent_bookings.map((b, i) => (
              <div key={i} className="px-5 py-3 border-b border-gray-50 last:border-0 flex items-center justify-between hover:bg-gray-50">
                <div>
                  <div className="font-semibold text-[#0A0A0A]">{b.service_name}</div>
                  <div className="text-xs text-gray-500">المريض: {b.patient_initial}</div>
                </div>
                <div className="text-left">
                  <div className="text-sm text-gray-700">
                    {new Date(b.scheduled_at).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    b.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                    b.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {b.status === 'completed' ? 'مكتمل' : b.status === 'confirmed' ? 'مؤكد' : b.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {data.pnl && data.pnl.length > 0 && (
        <section className="bg-white border-y border-gray-100">
          <div className="max-w-6xl mx-auto px-4 py-12">
            <h2 className="text-2xl font-black text-[#0A0A0A] mb-6 flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-[#059669]" /> إيرادات الفروع
            </h2>
            <div className="space-y-3">
              {data.pnl.map((p) => {
                const maxRevenue = Math.max(...data.pnl.map(x => x.revenue_egp), 1)
                const pct = (p.revenue_egp / maxRevenue) * 100
                return (
                  <div key={p.branch_name} className="bg-[#FAFAF7] rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-[#0A0A0A]">{p.branch_name}</span>
                      <span className="text-sm text-gray-600">{p.bookings_count} حجز · {p.revenue_egp.toLocaleString('ar-EG')} ج</span>
                    </div>
                    <div className="h-2 bg-white rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-l from-[#34D399] to-[#2FA084]" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      <section className="max-w-6xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-black text-[#0A0A0A] mb-2 text-center">كل اللي عيادتك محتاجاه</h2>
        <p className="text-center text-gray-600 mb-8">منصة شاملة لإدارة العيادات</p>
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
          {FEATURES.map((f, i) => {
            const Icon = f.icon
            return (
              <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100 hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 grid place-items-center mb-3">
                  <Icon className="w-5 h-5 text-[#059669]" />
                </div>
                <h3 className="font-bold text-[#0A0A0A] mb-1">{f.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{f.desc}</p>
              </div>
            )
          })}
        </div>
      </section>

      <section className="bg-gradient-to-br from-[#34D399] to-[#2FA084] text-white py-12">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-black mb-4">سعرنا واضح</h2>
          <div className="bg-white/10 backdrop-blur rounded-2xl p-8 border border-white/20">
            <div className="text-5xl font-black mb-2">١٠٪</div>
            <p className="text-lg text-white/90 mb-4">عمولة على كل حجز فعلي بس</p>
            <ul className="text-right space-y-2 text-white/90 text-sm">
              <li className="flex gap-2"><CheckCircle2 className="w-5 h-5 text-[#FFD700] flex-shrink-0" /> بدون رسوم اشتراك</li>
              <li className="flex gap-2"><CheckCircle2 className="w-5 h-5 text-[#FFD700] flex-shrink-0" /> بدون التزام طويل المدى</li>
              <li className="flex gap-2"><CheckCircle2 className="w-5 h-5 text-[#FFD700] flex-shrink-0" /> دفع المستحقات أسبوعي</li>
              <li className="flex gap-2"><CheckCircle2 className="w-5 h-5 text-[#FFD700] flex-shrink-0" /> دعم ٢٤/٧ بالعربي</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h2 className="text-3xl font-black text-[#0A0A0A] mb-4">عايز كده لعيادتك؟</h2>
        <p className="text-lg text-gray-600 mb-8">كلّمنا واحجز موعد عرض مجاني ١٥ دقيقة</p>
        <div className="flex gap-3 justify-center flex-wrap">
          <a href="https://wa.me/201002229982?text=أنا%20من%20عيادة%20وحابب%20أعرف%20أكتر%20عن%20مضمونة"
            target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-2 bg-[#34D399] text-[#04352A] px-8 py-4 rounded-xl font-black text-lg hover:bg-[#175a4d] transition-colors shadow-lg">
            <MessageSquare className="w-5 h-5" /> كلّمنا على واتساب
          </a>
          <Link href={`/clinic/${slug}`}
            className="inline-flex items-center gap-2 bg-white border-2 border-[#059669] text-[#059669] px-8 py-4 rounded-xl font-black text-lg hover:bg-emerald-50 transition-colors">
            شوف صفحة الحجز <ExternalLink className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* فوتر موحّد (١١ أغسطس ٢٠٢٦) — بدل الفوتر الأسود القديم، اتساقًا مع باقي صفحات العميل */}
      <SiteFooter />
    </div>
  )
}

function KpiCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
      <Icon className="w-5 h-5 text-[#059669] mb-2" />
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="text-xl md:text-2xl font-black text-[#0A0A0A]">{value}</div>
    </div>
  )
}
