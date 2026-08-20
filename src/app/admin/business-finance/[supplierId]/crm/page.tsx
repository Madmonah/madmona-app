'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import {
  ChevronLeft, Loader2, RefreshCw, Users, MessageCircle, Phone,
  CalendarClock, Star, AlertTriangle, Crown, Cake, Search,
} from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

/* ============================================================================
   CRM — صاحب البيزنس بيتابع عملاءه
   ============================================================================
   🎯 (٢٠ أغسطس ٢٠٢٦) محمد: «شيل تاب الواتساب اللي في إدارة البيزنس وخليه
      نظام CRM بيتابع منه صاحب البيزنس العميل بتاعه».

   اللي كان مكانها:
     تاب «حملات WhatsApp» — بيعرض كام رسالة اتبعتت وكام اتقرت، ومكتوب فيه
     بالنص «إنشاء الحملات بيتم من خلال Madmona مباشرة… الصفحة دي للمتابعة
     وإلا». يعني شاشة قراءة مالهاش أي فعل، ومبنية حوالين **الحملة** مش
     حوالين **العميل**.

   صاحب البيزنس مش عايز يعرف الحملة وصلت لكام واحد. عايز يعرف: مين اللي
   بقاله كتير مجاش؟ مين له ميعاد بكرة؟ مين كلّمنا وماحدش ردّ عليه؟

   فمارميناش داتا الواتساب — قلبناها. بقت **عمود جوّه صف العميل**: آخر
   كلام معاه، وأقرب ميعاد، وآخر زيارة، وكله في صف واحد بزرار «كلّمه».
   ============================================================================ */

type Cust = {
  id: string; full_name: string | null; phone: string | null
  tier: string | null; total_visits: number; total_spent: number
  loyalty_points: number; last_visit_at: string | null
  days_since_visit: number | null; bday_today: boolean; notes: string | null
  bookings_count: number
  next_booking: { at: string; service: string | null; status: string; price: number | null } | null
  last_chat: { at: string; direction: string; body: string } | null
  avg_rating: number | null
}
type Stats = {
  total: number; vip: number; at_risk: number
  new_30d: number; bday_month: number; revenue: number
}

const FILTERS = [
  { key: 'all',        label: 'الكل' },
  { key: 'at_risk',    label: 'بقالهم كتير' },
  { key: 'vip',        label: 'VIP' },
  { key: 'new',        label: 'جداد' },
  { key: 'no_contact', label: 'محدش كلّمهم' },
]

const TIER: Record<string, { label: string; cls: string }> = {
  platinum: { label: 'بلاتينوم', cls: 'bg-gray-800 text-white' },
  vip:      { label: 'VIP',      cls: 'bg-[#D4A017]/15 text-[#B78A12]' },
  regular:  { label: 'دايم',     cls: 'bg-[#34D399]/10 text-[#059669]' },
  new:      { label: 'جديد',     cls: 'bg-blue-50 text-blue-700' },
  inactive: { label: 'واقف',     cls: 'bg-gray-100 text-gray-600' },
}

const egp = (n: number) => `${Number(n || 0).toLocaleString('ar-EG')} ج`
const fmtDate = (iso: string | null) => {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' }) }
  catch { return '—' }
}

export default function CrmPage({ params }: { params: { supplierId: string } }) {
  const { supplierId } = params
  const [name, setName] = useState('')
  const [rows, setRows] = useState<Cust[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [filter, setFilter] = useState('all')
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setErr(null)
    const { data: s } = await supabase
      .from('suppliers').select('business_name').eq('id', supplierId).maybeSingle()
    setName((s as { business_name?: string } | null)?.business_name || '')

    const { data } = await (supabase.rpc as unknown as (
      fn: string, args: Record<string, unknown>,
    ) => Promise<{ data: { ok?: boolean; error?: string; customers?: Cust[]; stats?: Stats } | null }>)(
      'admin_crm_customers', { p_supplier_id: supplierId, p_filter: filter, p_limit: 300 })

    if (!data?.ok) { setErr(data?.error || 'مش قادر أجيب العملاء'); setRows([]) }
    else { setRows(data.customers || []); setStats(data.stats || null) }
    setLoading(false)
  }, [supplierId, filter])

  useEffect(() => { load() }, [load])

  const shown = q.trim()
    ? rows.filter(r =>
        (r.full_name || '').includes(q.trim()) || (r.phone || '').includes(q.trim()))
    : rows

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link href={`/admin/business-finance/${supplierId}`}
            className="text-xs font-bold text-[#6B7280] hover:text-[#059669] flex items-center gap-1 mb-2">
            <ChevronLeft className="w-3.5 h-3.5" /> رجوع
          </Link>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#059669] mb-1">CRM · متابعة العملاء</p>
              <h1 className="text-2xl md:text-3xl font-black text-[#1A2E26]">عملاء {name}</h1>
              <p className="text-sm text-[#6B7280] mt-1">
                مين محتاج تكلّمه النهاردة — وآخر مرة اتكلمتوا فيها إمتى
              </p>
            </div>
            <button onClick={load} className="p-2 rounded-xl bg-[#FAFAF7] hover:bg-gray-100">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-5">
        {err && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm font-bold text-amber-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />{err}
          </div>
        )}

        {stats && (
          <section className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
            <Stat label="كل العملاء" value={String(stats.total)} icon={<Users className="w-4 h-4" />} />
            <Stat label="بقالهم +٦٠ يوم" value={String(stats.at_risk)} icon={<AlertTriangle className="w-4 h-4" />} tone="warn" />
            <Stat label="VIP" value={String(stats.vip)} icon={<Crown className="w-4 h-4" />} tone="gold" />
            <Stat label="أعياد ميلاد الشهر" value={String(stats.bday_month)} icon={<Cake className="w-4 h-4" />} />
            <Stat label="إجمالي صرفهم" value={egp(stats.revenue)} icon={<Star className="w-4 h-4" />} tone="ok" />
          </section>
        )}

        <section className="flex flex-wrap items-center gap-2">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`text-[12.5px] font-black px-3.5 py-2 rounded-full border transition-colors ${
                filter === f.key
                  ? 'bg-[#059669] text-white border-[#059669]'
                  : 'bg-white text-[#6B7280] border-gray-200 hover:border-[#059669]/40'
              }`}
            >
              {f.label}
            </button>
          ))}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              value={q} onChange={e => setQ(e.target.value)}
              placeholder="دوّر باسم أو تليفون"
              className="w-full bg-white border border-gray-200 rounded-full pr-9 pl-3 py-2 text-[13px]"
            />
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="py-16 text-center"><Loader2 className="w-6 h-6 text-[#059669] animate-spin inline" /></div>
          ) : shown.length === 0 ? (
            <div className="py-16 text-center">
              <Users className="w-10 h-10 text-[#6B7280] opacity-30 mx-auto mb-2" />
              <p className="text-sm font-bold text-[#1A2E26]">مفيش عملاء في الفلتر ده</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {shown.map(c => <Row key={c.id} c={c} supplierId={supplierId} />)}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

function Row({ c, supplierId }: { c: Cust; supplierId: string }) {
  const tier = TIER[c.tier || ''] || null
  const cold = (c.days_since_visit ?? 0) >= 60
  // wa.me بيحب الرقم من غير علامات
  const wa = (c.phone || '').replace(/[^\d]/g, '')

  return (
    <div className="px-4 py-3.5 hover:bg-[#FAFAF7] transition-colors">
      <div className="flex items-start gap-3 flex-wrap">
        <div className="flex-1 min-w-[190px]">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Link href={`/admin/business-finance/${supplierId}/customers/${c.id}`}
              className="font-black text-[#1A2E26] no-underline hover:text-[#059669]">
              {c.full_name || 'بدون اسم'}
            </Link>
            {tier && <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${tier.cls}`}>{tier.label}</span>}
            {c.bday_today && (
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-pink-50 text-pink-700 flex items-center gap-1">
                <Cake className="w-3 h-3" /> عيد ميلاده النهاردة
              </span>
            )}
            {cold && (
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                بقاله {c.days_since_visit} يوم
              </span>
            )}
          </div>
          <p className="text-[11.5px] text-[#6B7280] font-mono" dir="ltr" style={{ textAlign: 'right' }}>
            {c.phone || '—'}
          </p>
          {c.notes && <p className="text-[11.5px] text-[#6B7280] mt-1 truncate">📝 {c.notes}</p>}
        </div>

        <div className="grid grid-cols-3 gap-3 text-center min-w-[190px]">
          <Mini label="زيارات" value={String(c.total_visits)} />
          <Mini label="صرف" value={egp(c.total_spent)} />
          <Mini label="آخر زيارة" value={fmtDate(c.last_visit_at)} />
        </div>

        <div className="min-w-[190px] space-y-1">
          {c.next_booking ? (
            <p className="text-[11.5px] font-bold text-[#059669] flex items-center gap-1.5">
              <CalendarClock className="w-3.5 h-3.5 flex-shrink-0" />
              ميعاد {fmtDate(c.next_booking.at)}
              {c.next_booking.service ? ` · ${c.next_booking.service}` : ''}
            </p>
          ) : (
            <p className="text-[11.5px] text-[#9CA3AF] flex items-center gap-1.5">
              <CalendarClock className="w-3.5 h-3.5 flex-shrink-0" /> مفيش ميعاد جاي
            </p>
          )}
          {c.last_chat ? (
            <p className="text-[11px] text-[#6B7280] flex items-start gap-1.5">
              <MessageCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span className="truncate">
                {c.last_chat.direction === 'inbound' ? 'قال: ' : 'بعتنا: '}
                {c.last_chat.body} · {fmtDate(c.last_chat.at)}
              </span>
            </p>
          ) : (
            <p className="text-[11px] text-[#9CA3AF] flex items-center gap-1.5">
              <MessageCircle className="w-3.5 h-3.5 flex-shrink-0" /> محدش كلّمه لسه
            </p>
          )}
        </div>

        {wa && (
          <a
            href={`https://wa.me/${wa}`}
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 bg-[#34D399] text-[#04352A] text-xs font-black px-3.5 py-2 rounded-xl no-underline hover:bg-[#34D399]/90 flex-shrink-0 self-center"
          >
            <Phone className="w-3.5 h-3.5" /> كلّمه
          </a>
        )}
      </div>
    </div>
  )
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9.5px] text-[#9CA3AF] font-bold">{label}</p>
      <p className="text-[12.5px] font-black text-[#1A2E26]">{value}</p>
    </div>
  )
}

function Stat({ label, value, icon, tone }: {
  label: string; value: string; icon: React.ReactNode
  tone?: 'ok' | 'warn' | 'gold'
}) {
  const cls = tone === 'warn' ? 'text-amber-700 bg-amber-50'
    : tone === 'gold' ? 'text-[#B78A12] bg-[#D4A017]/10'
    : tone === 'ok' ? 'text-[#059669] bg-[#34D399]/10'
    : 'text-[#6B7280] bg-[#FAFAF7]'
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-3">
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-2 ${cls}`}>{icon}</div>
      <p className="text-[10px] text-[#9CA3AF] font-bold">{label}</p>
      <p className="text-lg font-black text-[#1A2E26] leading-tight">{value}</p>
    </div>
  )
}
