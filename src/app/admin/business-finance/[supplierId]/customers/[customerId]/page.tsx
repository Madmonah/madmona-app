'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import {
  ChevronLeft, Loader2, Cake, Crown, Sparkles, Calendar, Phone, Mail,
  Edit2, Save, X, MessageCircle, Star, TrendingUp, Award,
} from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const TIER_LABELS: Record<string, { label: string; class: string; icon?: React.ReactNode }> = {
  platinum: { label: 'بلاتينيوم', class: 'bg-[#1A2E26] text-white', icon: <Crown className="w-3.5 h-3.5" /> },
  vip: { label: 'VIP', class: 'bg-[#34D399] text-[#04352A]', icon: <Star className="w-3.5 h-3.5" /> },
  regular: { label: 'منتظمة', class: 'bg-[#34D399]/10 text-[#059669]' },
  new: { label: 'جديدة', class: 'bg-[#FAFAF7] text-[#6B7280] border border-gray-200' },
  inactive: { label: 'غير نشطة', class: 'bg-gray-100 text-gray-500' },
}

export default function CustomerDetailPage({ params }: { params: { supplierId: string; customerId: string } }) {
  const { supplierId, customerId } = params
  const [data, setData] = useState<any>(null)
  const [ltv, setLtv] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<any>({})
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const { data: result } = await supabase.rpc('admin_get_customer_detail', { p_customer_id: customerId })
    setData(result)
    const { data: ltvData } = await supabase.rpc('admin_get_customer_ltv', { p_customer_id: customerId })
    setLtv(ltvData)
    if (result?.customer) {
      setForm({
        full_name: result.customer.full_name || '',
        phone: result.customer.phone || '',
        email: result.customer.email || '',
        date_of_birth: result.customer.date_of_birth || '',
        notes: result.customer.notes || '',
        allergies: result.customer.allergies || '',
        hair_color_formula: result.customer.hair_color_formula || '',
        skin_type: result.customer.skin_type || '',
      })
    }
    setLoading(false)
  }

  useEffect(() => { load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [customerId])

  async function save() {
    setSaving(true)
    await supabase.from('customers').update(form).eq('id', customerId)
    setEditing(false)
    setSaving(false)
    await load()
  }

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl">
        <Loader2 className="w-8 h-8 text-[#059669] animate-spin" />
      </div>
    )
  }

  const c = data.customer
  const tier = TIER_LABELS[c.customer_tier] || TIER_LABELS.new
  const bookings = data.bookings || []
  const topServices = data.top_services || []
  const bdayToday = c.date_of_birth &&
    new Date(c.date_of_birth).getMonth() === new Date().getMonth() &&
    new Date(c.date_of_birth).getDate() === new Date().getDate()

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <Link href={`/admin/business-finance/${supplierId}/customers`} className="text-xs font-bold text-[#6B7280] hover:text-[#059669] flex items-center gap-1 mb-2">
            <ChevronLeft className="w-3.5 h-3.5" /> رجوع للعملاء
          </Link>
          <div className="flex items-start gap-4">
            <div className="inline-grid place-items-center w-16 h-16 rounded-2xl bg-[#34D399]/10 text-[#059669] font-black text-2xl flex-shrink-0">
              {c.full_name?.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl md:text-3xl font-black text-[#1A2E26] tracking-tight truncate">{c.full_name}</h1>
                {bdayToday && (
                  <span className="px-2 py-1 rounded-lg bg-amber-50 text-amber-700 text-xs font-black flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" /> عيد ميلادها اليوم!
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap mt-1">
                <span className={`px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1 ${tier.class}`}>
                  {tier.icon} {tier.label}
                </span>
                <span className="text-xs text-[#6B7280] font-mono">{c.phone}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <a href={`https://wa.me/${c.phone?.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener"
                className="px-3 py-2 rounded-xl bg-[#34D399] hover:opacity-90 text-[#04352A] text-xs font-bold flex items-center gap-1.5">
                <MessageCircle className="w-3.5 h-3.5" /> واتساب
              </a>
              {!editing ? (
                <button onClick={() => setEditing(true)} className="px-3 py-2 rounded-xl bg-[#FAFAF7] hover:bg-gray-100 text-[#1A2E26] text-xs font-bold flex items-center gap-1.5">
                  <Edit2 className="w-3.5 h-3.5" /> تعديل
                </button>
              ) : (
                <>
                  <button onClick={save} disabled={saving} className="px-3 py-2 rounded-xl bg-[#34D399] hover:opacity-90 text-[#04352A] text-xs font-bold flex items-center gap-1.5 disabled:opacity-50">
                    <Save className="w-3.5 h-3.5" /> {saving ? 'حفظ...' : 'حفظ'}
                  </button>
                  <button onClick={() => setEditing(false)} className="p-2 rounded-xl bg-[#FAFAF7] hover:bg-gray-100 text-[#1A2E26]">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="زيارات" value={c.total_visits} icon={<Calendar className="w-4 h-4" />} />
          <StatCard label="إجمالي صرف" value={`${Number(c.total_spent_egp).toLocaleString()} ج`} icon={<TrendingUp className="w-4 h-4" />} />
          <StatCard label="نقاط ولاء" value={c.loyalty_points} icon={<Award className="w-4 h-4" />} primary />
          <StatCard label="متوسط الفاتورة" value={`${Number(ltv?.avg_ticket || 0).toLocaleString()} ج`} icon={<Star className="w-4 h-4" />} tone="positive" />
        </section>

        {/* LTV Deep Dive */}
        {ltv && ltv.total_visits > 0 && (
          <section className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="text-sm font-bold tracking-wider uppercase text-[#6B7280] mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#059669]" /> Customer Lifetime Value
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
              <div className="p-3 rounded-xl bg-[#FAFAF7]">
                <p className="text-[10px] font-bold uppercase text-[#6B7280]">أول زيارة</p>
                <p className="text-sm font-black text-[#1A2E26] mt-1">{ltv.first_visit_at ? new Date(ltv.first_visit_at).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</p>
              </div>
              <div className="p-3 rounded-xl bg-[#FAFAF7]">
                <p className="text-[10px] font-bold uppercase text-[#6B7280]">آخر زيارة</p>
                <p className="text-sm font-black text-[#1A2E26] mt-1">{ltv.last_visit_at ? new Date(ltv.last_visit_at).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' }) : '—'}</p>
              </div>
              <div className="p-3 rounded-xl bg-[#34D399]/5 border border-[#059669]/20">
                <p className="text-[10px] font-bold uppercase text-[#059669]">عميلة عندنا</p>
                <p className="text-sm font-black text-[#059669] mt-1">{ltv.days_as_customer} يوم</p>
              </div>
              <div className="p-3 rounded-xl bg-[#FAFAF7]">
                <p className="text-[10px] font-bold uppercase text-[#6B7280]">حجوزات ملغية</p>
                <p className={`text-sm font-black mt-1 ${ltv.cancelled_count > 0 ? 'text-amber-700' : 'text-[#1A2E26]'}`}>{ltv.cancelled_count}</p>
              </div>
            </div>
            {ltv.days_as_customer > 30 && (
              <p className="text-xs text-[#6B7280] mt-3 text-center">
                متوسط إنفاق شهري: <span className="font-mono font-bold text-[#1A2E26]">{Math.round(Number(ltv.total_spent) / (ltv.days_as_customer / 30)).toLocaleString()} ج</span>
              </p>
            )}
          </section>
        )}

        {/* Customer details */}
        <section className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
          <h3 className="text-sm font-bold tracking-wider uppercase text-[#6B7280]">معلومات العميلة</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="الاسم الكامل" icon={null} editing={editing} value={form.full_name} onChange={(v) => setForm({...form, full_name: v})} display={c.full_name} />
            <Field label="رقم الموبايل" icon={<Phone className="w-3.5 h-3.5" />} editing={editing} value={form.phone} onChange={(v) => setForm({...form, phone: v})} display={c.phone} />
            <Field label="الإيميل" icon={<Mail className="w-3.5 h-3.5" />} editing={editing} value={form.email} onChange={(v) => setForm({...form, email: v})} display={c.email || 'مش متاح'} />
            <Field label="تاريخ الميلاد" icon={<Cake className="w-3.5 h-3.5" />} editing={editing} value={form.date_of_birth} onChange={(v) => setForm({...form, date_of_birth: v})} display={c.date_of_birth ? new Date(c.date_of_birth).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' }) : 'مش متاح'} type="date" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
            <Field label="🧪 تركيبة الصبغة (Formula)" editing={editing} value={form.hair_color_formula} onChange={(v) => setForm({...form, hair_color_formula: v})} display={c.hair_color_formula || 'مش محفوظة'} />
            <Field label="⚠️ حساسية" editing={editing} value={form.allergies} onChange={(v) => setForm({...form, allergies: v})} display={c.allergies || 'مفيش'} />
            <Field label="نوع البشرة" editing={editing} value={form.skin_type} onChange={(v) => setForm({...form, skin_type: v})} display={c.skin_type || 'مش محدد'} />
            <Field label="📝 ملاحظات" editing={editing} value={form.notes} onChange={(v) => setForm({...form, notes: v})} display={c.notes || 'مفيش ملاحظات'} multiline />
          </div>
        </section>

        {/* Top services */}
        {topServices.length > 0 && (
          <section className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="text-sm font-bold tracking-wider uppercase text-[#6B7280] mb-4">⭐ الخدمات المفضلة</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {topServices.map((s: any, i: number) => (
                <div key={i} className="p-3 rounded-xl bg-[#FAFAF7] border border-gray-100">
                  <p className="text-sm font-bold text-[#1A2E26]">{s.name}</p>
                  <p className="text-xs text-[#6B7280] mt-1">{s.times} مرة · {Number(s.spent).toLocaleString()} ج</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Booking history */}
        <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-bold tracking-wider uppercase text-[#6B7280]">📅 السجل الكامل ({bookings.length})</h3>
          </div>
          {bookings.length === 0 ? (
            <div className="p-8 text-center">
              <Calendar className="w-10 h-10 text-[#6B7280] opacity-30 mx-auto mb-2" />
              <p className="text-sm font-bold text-[#1A2E26]">مفيش حجوزات لسه</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {bookings.map((b: any) => (
                <div key={b.id} className="p-4 flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                    b.status === 'completed' ? 'bg-[#34D399]' :
                    b.status === 'scheduled' ? 'bg-amber-500' :
                    b.status === 'cancelled' ? 'bg-red-500' : 'bg-gray-300'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[#1A2E26]">{b.service_name_snapshot}</p>
                    <p className="text-xs text-[#6B7280] mt-0.5">
                      {new Date(b.scheduled_at).toLocaleString('ar-EG', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                      {b.stylist_name && ` · ${b.stylist_name}`}
                      {b.branch_name && ` · ${b.branch_name}`}
                    </p>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-black text-[#1A2E26]">{Number(b.price_egp).toLocaleString()} ج</p>
                    <p className={`text-[10px] font-bold mt-0.5 ${
                      b.status === 'completed' ? 'text-[#059669]' :
                      b.status === 'scheduled' ? 'text-amber-700' : 'text-gray-500'
                    }`}>
                      {b.status === 'completed' ? '✓ خلصت' : b.status === 'scheduled' ? '⏰ متحجزة' : b.status === 'cancelled' ? 'اتلغت' : b.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

function Field({ label, icon, editing, value, onChange, display, type = 'text', multiline }: {
  label: string; icon?: React.ReactNode; editing: boolean; value: string;
  onChange: (v: string) => void; display: string; type?: string; multiline?: boolean
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <p className="text-[10px] font-bold tracking-wider uppercase text-[#6B7280]">{label}</p>
      </div>
      {editing ? (
        multiline ? (
          <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={2}
            className="w-full px-3 py-2 bg-[#FAFAF7] rounded-lg text-sm text-[#1A2E26] focus:outline-none focus:ring-2 focus:ring-[#059669]" />
        ) : (
          <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 bg-[#FAFAF7] rounded-lg text-sm text-[#1A2E26] focus:outline-none focus:ring-2 focus:ring-[#059669]" />
        )
      ) : (
        <p className="text-sm text-[#1A2E26] font-medium">{display}</p>
      )}
    </div>
  )
}

function StatCard({ label, value, icon, tone, primary }: { label: string; value: number | string; icon: React.ReactNode; tone?: 'positive' | 'negative'; primary?: boolean }) {
  const toneClass = tone === 'positive' ? 'text-[#059669]' : 'text-[#1A2E26]'
  return (
    <div className={`rounded-2xl p-4 border ${primary ? 'bg-[#34D399] border-[#059669] text-[#04352A]' : 'bg-white border-gray-100'}`}>
      <div className={`flex items-center gap-2 mb-1.5 ${primary ? 'text-white/90' : 'text-[#6B7280]'}`}>{icon}<p className="text-[10px] font-bold tracking-wider uppercase">{label}</p></div>
      <p className={`text-xl md:text-2xl font-black ${primary ? 'text-white' : toneClass}`}>{value}</p>
    </div>
  )
}
