'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabase-browser'
import {
  Users, Search, Loader2, RefreshCw, CheckCircle2, XCircle, Ban,
  Package, Calendar, Star, BadgePercent, ShieldCheck, FileText,
  Phone, Mail, AlertCircle, Lock, ArrowRight,
} from 'lucide-react'

/* ============================================================
   /admin/sup — إدارة موردي الماركت‑بليس
   بيقرأ من marketplace_suppliers عن طريق get_marketplace_suppliers_admin
   (SECURITY DEFINER + بيتحقق إن profiles.role = 'admin').
   ============================================================ */

type Kyc = 'pending' | 'approved' | 'rejected' | 'suspended'

type Supplier = {
  id: string
  profile_id: string | null
  business_name: string
  business_name_en: string | null
  description: string | null
  logo_url: string | null
  national_id: string | null
  commercial_registration: string | null
  tax_id: string | null
  kyc_status: Kyc
  kyc_rejection_reason: string | null
  kyc_reviewed_at: string | null
  commission_rate: number | null
  rating: number | null
  reviews_count: number | null
  listings_count: number | null
  bookings_count: number | null
  total_revenue: number | null
  created_at: string
  profile: {
    id: string | null
    phone: string | null
    email: string | null
    full_name: string | null
    avatar_url: string | null
  } | null
}

const KYC: Record<Kyc, { label: string; chip: string; bar: string; icon: ReactNode }> = {
  approved: {
    label: 'معتمد',
    chip: 'bg-[#D1FAE5] text-[#04352A]',
    bar: 'bg-[#34D399]',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  pending: {
    label: 'مستني مراجعة',
    chip: 'bg-amber-100 text-amber-900',
    bar: 'bg-amber-400',
    icon: <AlertCircle className="w-3.5 h-3.5" />,
  },
  rejected: {
    label: 'مرفوض',
    chip: 'bg-red-100 text-red-800',
    bar: 'bg-red-400',
    icon: <XCircle className="w-3.5 h-3.5" />,
  },
  suspended: {
    label: 'موقوف',
    chip: 'bg-gray-200 text-gray-700',
    bar: 'bg-gray-400',
    icon: <Ban className="w-3.5 h-3.5" />,
  },
}

const num = (v: number | null | undefined) => Number(v ?? 0)
const fmt = (v: number) => v.toLocaleString('ar-EG')

export default function SuppliersAdminPage() {
  const [state, setState] = useState<'loading' | 'unauth' | 'forbidden' | 'ready' | 'error'>('loading')
  const [rows, setRows] = useState<Supplier[]>([])
  const [errorMsg, setErrorMsg] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [rejectFor, setRejectFor] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [confirmFor, setConfirmFor] = useState<string | null>(null)
  const [toast, setToast] = useState('')

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | Kyc>('all')
  const [sort, setSort] = useState<'newest' | 'listings' | 'revenue'>('newest')

  const say = (m: string) => { setToast(m); setTimeout(() => setToast(''), 3500) }

  const load = async () => {
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session?.user) { setState('unauth'); return }

      const { data, error } = await supabaseBrowser.rpc('get_marketplace_suppliers_admin')
      if (error) {
        const msg = (error.message || '').toLowerCase()
        if (msg.includes('forbidden')) { setState('forbidden'); return }
        if (msg.includes('unauthenticated')) { setState('unauth'); return }
        setErrorMsg(error.message); setState('error'); return
      }
      setRows((data as Supplier[]) || [])
      setState('ready')
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'حصل خطأ')
      setState('error')
    }
  }

  useEffect(() => { load() }, [])

  const setKyc = async (id: string, kyc_status: Kyc, reason?: string) => {
    setBusyId(id)
    const { error } = await supabaseBrowser.rpc('update_supplier_kyc_admin', {
      p_supplier_id: id,
      p_kyc_status: kyc_status,
      p_rejection_reason: reason || undefined,
    })
    setBusyId(null)
    if (error) { say('❌ فشل: ' + error.message); return }

    // تحديث محلي — من غير reload للصفحة كلها
    setRows((prev) => prev.map((r) => r.id === id
      ? {
          ...r,
          kyc_status,
          kyc_reviewed_at: new Date().toISOString(),
          kyc_rejection_reason: kyc_status === 'rejected' ? (reason || 'مرفوض') : kyc_status === 'approved' ? null : r.kyc_rejection_reason,
        }
      : r))
    setRejectFor(null); setRejectReason(''); setConfirmFor(null)
    say(`✅ ${KYC[kyc_status].label} — ${rows.find((r) => r.id === id)?.business_name ?? ''}`)
  }

  const stats = useMemo(() => ({
    all: rows.length,
    approved: rows.filter((r) => r.kyc_status === 'approved').length,
    pending: rows.filter((r) => r.kyc_status === 'pending').length,
    rejected: rows.filter((r) => r.kyc_status === 'rejected').length,
    suspended: rows.filter((r) => r.kyc_status === 'suspended').length,
    listings: rows.reduce((s, r) => s + num(r.listings_count), 0),
    revenue: rows.reduce((s, r) => s + num(r.total_revenue), 0),
    silent: rows.filter((r) => r.kyc_status === 'approved' && num(r.listings_count) === 0).length,
  }), [rows])

  const filtered = useMemo(() => {
    let r = rows
    if (filter !== 'all') r = r.filter((x) => x.kyc_status === filter)
    const s = search.trim().toLowerCase()
    if (s) {
      r = r.filter((x) =>
        x.business_name.toLowerCase().includes(s) ||
        (x.business_name_en || '').toLowerCase().includes(s) ||
        (x.profile?.full_name || '').toLowerCase().includes(s) ||
        (x.profile?.phone || '').includes(s) ||
        (x.profile?.email || '').toLowerCase().includes(s),
      )
    }
    const out = [...r]
    if (sort === 'listings') out.sort((a, b) => num(b.listings_count) - num(a.listings_count))
    else if (sort === 'revenue') out.sort((a, b) => num(b.total_revenue) - num(a.total_revenue))
    else out.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
    return out
  }, [rows, filter, search, sort])

  /* ---------- حالات مش جاهزة ---------- */
  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl">
        <Loader2 className="w-6 h-6 animate-spin text-[#059669]" />
      </div>
    )
  }
  if (state === 'unauth') {
    return (
      <Notice icon={<Lock className="w-7 h-7 text-[#059669]" />} title="محتاج تسجّل دخول">
        <Link href="/auth/login?redirect=/admin/sup"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#34D399] text-[#04352A] text-sm font-bold">
          تسجيل الدخول <ArrowRight className="w-4 h-4" />
        </Link>
      </Notice>
    )
  }
  if (state === 'forbidden') {
    return <Notice icon={<ShieldCheck className="w-7 h-7 text-[#059669]" />} title="الصفحة دي للأدمن بس" />
  }
  if (state === 'error') {
    return (
      <Notice icon={<AlertCircle className="w-7 h-7 text-red-500" />} title="مقدرناش نحمّل الموردين">
        <p className="text-sm text-[#6B7280] mb-4 font-mono break-all">{errorMsg}</p>
        <button onClick={() => { setState('loading'); load() }}
          className="px-5 py-2.5 rounded-xl bg-[#34D399] text-[#04352A] text-sm font-bold">
          جرّب تاني
        </button>
      </Notice>
    )
  }

  /* ---------- الصفحة ---------- */
  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#059669] mb-1">
                MADMONA · MARKETPLACE SUPPLIERS
              </p>
              <h1 className="text-2xl md:text-3xl font-black text-[#1A2E26] tracking-tight">
                موردين الماركت‑بليس
              </h1>
              <p className="text-sm text-[#6B7280] mt-1">
                {fmt(stats.all)} مورد · {fmt(stats.listings)} إعلان
                {stats.pending > 0 && <span className="text-amber-700 font-bold"> · {fmt(stats.pending)} مستني مراجعة</span>}
              </p>
            </div>
            <button onClick={load}
              className="px-4 py-2.5 rounded-xl bg-[#FAFAF7] border border-gray-200 text-[#1A2E26] text-sm font-bold flex items-center gap-2 hover:shadow-md transition-shadow">
              <RefreshCw className="w-4 h-4" /> تحديث
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-5">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <Kpi label="إجمالي الموردين" value={fmt(stats.all)} />
          <Kpi label="معتمدين" value={fmt(stats.approved)} tone="good" />
          <Kpi label="مستنيين مراجعة" value={fmt(stats.pending)} tone={stats.pending > 0 ? 'warn' : undefined} />
          <Kpi label="إعلانات" value={fmt(stats.listings)}
            note={stats.silent > 0 ? `${fmt(stats.silent)} معتمد من غير إعلانات` : undefined} />
          <Kpi label="إيرادات" value={`${fmt(Math.round(stats.revenue))} ج`} />
        </div>

        {/* فلاتر */}
        <div className="bg-white rounded-2xl border border-gray-100 p-3 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-[#6B7280] absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="دوّر بالاسم · التليفون · الإيميل"
              className="w-full bg-[#FAFAF7] border border-gray-100 rounded-xl pr-9 pl-3 py-2.5 text-sm outline-none focus:border-[#34D399]"
            />
          </div>

          <div className="flex items-center gap-1 bg-[#FAFAF7] rounded-xl p-1 border border-gray-100">
            {([
              ['all', `الكل (${stats.all})`],
              ['pending', `مستني (${stats.pending})`],
              ['approved', `معتمد (${stats.approved})`],
              ['rejected', `مرفوض (${stats.rejected})`],
              ['suspended', `موقوف (${stats.suspended})`],
            ] as const).map(([k, label]) => (
              <button key={k} onClick={() => setFilter(k)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filter === k ? 'bg-[#34D399] text-[#04352A] shadow-sm' : 'text-[#6B7280] hover:text-[#1A2E26]'
                }`}>
                {label}
              </button>
            ))}
          </div>

          <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}
            className="bg-[#FAFAF7] border border-gray-100 rounded-xl px-3 py-2.5 text-xs font-bold text-[#1A2E26] outline-none focus:border-[#34D399]">
            <option value="newest">الأحدث</option>
            <option value="listings">الأكتر إعلانات</option>
            <option value="revenue">الأعلى إيرادًا</option>
          </select>
        </div>

        {/* الليستة */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
            <Users className="w-8 h-8 text-[#6B7280] mx-auto mb-3" />
            <p className="text-sm text-[#6B7280]">مفيش مورد بالمواصفات دي</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {filtered.map((s) => {
              const k = KYC[s.kyc_status] ?? KYC.pending
              const docs = [
                ['الرقم القومي', s.national_id],
                ['السجل التجاري', s.commercial_registration],
                ['البطاقة الضريبية', s.tax_id],
              ] as const
              const docsHave = docs.filter(([, v]) => !!v).length
              const busy = busyId === s.id

              return (
                <article key={s.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden flex">
                  <div className={`w-1.5 shrink-0 ${k.bar}`} />
                  <div className="flex-1 min-w-0 p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0">
                        <h2 className="font-black text-[#1A2E26] truncate">{s.business_name}</h2>
                        {s.profile?.full_name && (
                          <p className="text-xs text-[#6B7280] truncate">{s.profile.full_name}</p>
                        )}
                      </div>
                      <span className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${k.chip}`}>
                        {k.icon}{k.label}
                      </span>
                    </div>

                    {/* أرقام */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#6B7280] mb-2">
                      <span className="inline-flex items-center gap-1">
                        <Package className="w-3.5 h-3.5" />{fmt(num(s.listings_count))} إعلان
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />{fmt(num(s.bookings_count))} حجز
                      </span>
                      {num(s.total_revenue) > 0 && (
                        <span className="font-bold text-[#059669]">{fmt(Math.round(num(s.total_revenue)))} ج</span>
                      )}
                      {num(s.reviews_count) > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <Star className="w-3.5 h-3.5" />{s.rating ?? '—'} ({fmt(num(s.reviews_count))})
                        </span>
                      )}
                      {s.commission_rate != null && (
                        <span className="inline-flex items-center gap-1">
                          <BadgePercent className="w-3.5 h-3.5" />{s.commission_rate}%
                        </span>
                      )}
                    </div>

                    {/* تواصل + أوراق */}
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      {s.profile?.phone && (
                        <a href={`https://wa.me/${s.profile.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg bg-[#D1FAE5] text-[#04352A]">
                          <Phone className="w-3 h-3" />{s.profile.phone}
                        </a>
                      )}
                      {s.profile?.email && (
                        <a href={`mailto:${s.profile.email}`}
                          className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg bg-[#FAFAF7] border border-gray-100 text-[#1A2E26] max-w-[200px] truncate">
                          <Mail className="w-3 h-3 shrink-0" /><span className="truncate">{s.profile.email}</span>
                        </a>
                      )}
                      <span title={docs.map(([n, v]) => `${n}: ${v ? '✔' : '✘'}`).join(' · ')}
                        className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg ${
                          docsHave === 3 ? 'bg-[#D1FAE5] text-[#04352A]'
                            : docsHave === 0 ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800'
                        }`}>
                        <FileText className="w-3 h-3" />{docsHave}/3 أوراق
                      </span>
                    </div>

                    {s.kyc_status === 'rejected' && s.kyc_rejection_reason && (
                      <p className="text-[11px] text-red-700 bg-red-50 rounded-lg px-2.5 py-1.5 mb-3">
                        سبب الرفض: {s.kyc_rejection_reason}
                      </p>
                    )}

                    {/* أزرار */}
                    {rejectFor === s.id ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          autoFocus
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter' && rejectReason.trim()) setKyc(s.id, 'rejected', rejectReason.trim()) }}
                          placeholder="سبب الرفض — هيوصل للمورد"
                          className="flex-1 min-w-[180px] bg-[#FAFAF7] border border-gray-100 rounded-xl px-3 py-2 text-xs outline-none focus:border-[#34D399]"
                        />
                        <button disabled={busy || !rejectReason.trim()}
                          onClick={() => setKyc(s.id, 'rejected', rejectReason.trim())}
                          className="px-3 py-2 rounded-xl bg-red-500 text-white text-xs font-bold disabled:opacity-40">
                          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'أكّد الرفض'}
                        </button>
                        <button onClick={() => { setRejectFor(null); setRejectReason('') }}
                          className="px-3 py-2 rounded-xl bg-[#FAFAF7] border border-gray-200 text-[#1A2E26] text-xs font-bold">
                          إلغاء
                        </button>
                      </div>
                    ) : confirmFor === s.id ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-[#6B7280]">
                          {s.kyc_status === 'approved' ? 'توقف المورد ده؟ إعلاناته هتختفي من الموقع.' : 'تعتمد المورد ده؟'}
                        </span>
                        <button disabled={busy}
                          onClick={() => setKyc(s.id, s.kyc_status === 'approved' ? 'suspended' : 'approved')}
                          className={`px-3 py-2 rounded-xl text-xs font-bold disabled:opacity-40 ${
                            s.kyc_status === 'approved' ? 'bg-gray-700 text-white' : 'bg-[#34D399] text-[#04352A]'
                          }`}>
                          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'أكّد'}
                        </button>
                        <button onClick={() => setConfirmFor(null)}
                          className="px-3 py-2 rounded-xl bg-[#FAFAF7] border border-gray-200 text-[#1A2E26] text-xs font-bold">
                          إلغاء
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2">
                        {s.kyc_status !== 'approved' && (
                          <button onClick={() => setConfirmFor(s.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#34D399] text-[#04352A] text-xs font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {s.kyc_status === 'pending' ? 'اعتماد' : 'إعادة تفعيل'}
                          </button>
                        )}
                        {s.kyc_status !== 'rejected' && (
                          <button onClick={() => { setRejectFor(s.id); setRejectReason('') }}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 text-red-700 text-xs font-bold">
                            <XCircle className="w-3.5 h-3.5" /> رفض
                          </button>
                        )}
                        {s.kyc_status === 'approved' && (
                          <button onClick={() => setConfirmFor(s.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#FAFAF7] border border-gray-200 text-[#1A2E26] text-xs font-bold">
                            <Ban className="w-3.5 h-3.5" /> إيقاف
                          </button>
                        )}
                        <span className="text-[10px] text-[#6B7280] mr-auto">
                          انضم {new Date(s.created_at).toLocaleDateString('ar-EG')}
                        </span>
                      </div>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </main>

      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 bg-[#04352A] text-white text-sm font-bold px-5 py-3 rounded-2xl shadow-xl">
          {toast}
        </div>
      )}
    </div>
  )
}

/* ---------- عناصر صغيرة ---------- */

function Kpi({ label, value, note, tone }: {
  label: string; value: string; note?: string; tone?: 'good' | 'warn'
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-3.5">
      <p className="text-[10px] font-bold text-[#6B7280] mb-1">{label}</p>
      <p className={`text-xl font-black ${
        tone === 'good' ? 'text-[#059669]' : tone === 'warn' ? 'text-amber-600' : 'text-[#1A2E26]'
      }`}>{value}</p>
      {note && <p className="text-[10px] text-[#6B7280] mt-0.5">{note}</p>}
    </div>
  )
}

function Notice({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center px-4" dir="rtl">
      <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center max-w-md w-full">
        <div className="flex justify-center mb-3">{icon}</div>
        <h1 className="text-lg font-black text-[#1A2E26] mb-3">{title}</h1>
        {children}
      </div>
    </div>
  )
}
