'use client'

// src/app/admin/leads/page.tsx
// ============================================================================
// 👥 كل الليدز في مكان واحد — ٣٬٥٥١ ليد من ٥ مصادر.
//
// 🐞 (١٤ أغسطس ٢٠٢٦) النسخة القديمة كانت مبنية على جدول `booking_leads`
//    اللي **مش موجود في الداتابيز**، وكانت بتعرض حقول (space_slug,
//    pricing_label, preferred_date) مالهاش أصل. الصفحة كانت بتفشل دايمًا.
//    دلوقتي بتقرا من ڤيو `v_all_leads` عن طريق /api/admin/leads.
// ============================================================================

import { useState, useEffect, useCallback, type FormEvent } from 'react'
import { Lock, Phone, MapPin, RefreshCw, LogOut, Search, Users } from 'lucide-react'

interface Lead {
  id: string
  kind: string
  kind_ar: string
  name: string | null
  phone: string | null
  city: string | null
  category: string | null
  status: string | null
  notes: string | null
  source: string | null
  created_at: string | null
}

const KINDS: Array<{ key: string; ar: string }> = [
  { key: '',           ar: 'الكل' },
  { key: 'cold',       ar: 'بارد' },
  { key: 'sales',      ar: 'مبيعات' },
  { key: 'restaurant', ar: 'مطاعم' },
  { key: 'clinic',     ar: 'عيادات' },
  { key: 'fnb',        ar: 'تسويق F&B' },
]

// الحالات المسموحة لكل نوع — لازم تطابق KIND_MAP في الراوت
const STATUSES: Record<string, string[]> = {
  cold:       ['new', 'contacted', 'converted', 'dead', 'do_not_contact'],
  sales:      ['new', 'inquire', 'qualified'],
  restaurant: ['new', 'contacted', 'replied', 'unclaimed_listing_created'],
  clinic:     ['new', 'contacted', 'converted', 'dead'],
  fnb:        ['pending', 'sent', 'skipped'],
}

const STATUS_AR: Record<string, string> = {
  new: 'جديد', contacted: 'اتكلمنا', converted: 'اتحوّل', dead: 'ميت',
  do_not_contact: 'ممنوع التواصل', inquire: 'استفسار', qualified: 'مؤهّل',
  replied: 'ردّ', unclaimed_listing_created: 'اتعمله إعلان',
  pending: 'مستني', sent: 'اتبعت', skipped: 'اتخطّى',
}

const STATUS_COLOR: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800',
  contacted: 'bg-amber-100 text-amber-800',
  converted: 'bg-emerald-100 text-emerald-800',
  qualified: 'bg-emerald-100 text-emerald-800',
  replied: 'bg-emerald-100 text-emerald-800',
  sent: 'bg-emerald-100 text-emerald-800',
  dead: 'bg-gray-100 text-gray-600',
  do_not_contact: 'bg-red-100 text-red-700',
  skipped: 'bg-gray-100 text-gray-600',
}

function fmt(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch { return '—' }
}

export default function LeadsPage() {
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const [authError, setAuthError] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [leads, setLeads] = useState<Lead[]>([])
  const [kind, setKind] = useState('')
  const [q, setQ] = useState('')

  const fetchLeads = useCallback(async (pw: string, k: string, search: string, silent = false) => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (k) params.set('kind', k)
      if (search.trim()) params.set('q', search.trim())
      params.set('limit', '500')

      const res = await fetch(`/api/admin/leads?${params.toString()}`, {
        headers: { 'X-Admin-Password': pw },
      })
      if (res.status === 401) {
        if (!silent) setAuthError('كلمة السر غلط')
        sessionStorage.removeItem('madmona_admin_pw')
        setAuthed(false)
        return
      }
      const data = await res.json()
      if (!res.ok) {
        // 🔎 بنعرض تفاصيل الخطأ بدل «حصل خطأ» المبهم — ده اللي خلّى
        //    عطل `booking_leads` مستخبي شهور.
        setError(data?.detail || data?.error || 'حصل خطأ في جلب البيانات')
        return
      }
      setLeads(data.leads || [])
      setAuthed(true)
      sessionStorage.setItem('madmona_admin_pw', pw)
    } catch {
      setError('مشكلة في الاتصال')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const stored = sessionStorage.getItem('madmona_admin_pw')
    if (stored) {
      setPassword(stored)
      fetchLeads(stored, '', '', true)
    }
  }, [fetchLeads])

  const handleLogin = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setAuthError('')
    fetchLeads(password, kind, q)
  }

  const updateStatus = async (lead: Lead, status: string) => {
    const prev = lead.status
    setLeads((ls) => ls.map((l) => (l.id === lead.id ? { ...l, status } : l)))
    try {
      const res = await fetch('/api/admin/leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Password': password },
        body: JSON.stringify({ id: lead.id, kind: lead.kind, status }),
      })
      if (!res.ok) {
        // رجّع القيمة القديمة بدل ما الشاشة تكدب على صاحبها
        setLeads((ls) => ls.map((l) => (l.id === lead.id ? { ...l, status: prev } : l)))
        const d = await res.json().catch(() => ({}))
        setError(d?.detail || d?.error || 'مانفعش نغيّر الحالة')
      }
    } catch {
      setLeads((ls) => ls.map((l) => (l.id === lead.id ? { ...l, status: prev } : l)))
      setError('مشكلة في الاتصال')
    }
  }

  // ============ شاشة الدخول ============
  if (!authed) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4" dir="rtl">
        <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
          <div className="flex items-center justify-center w-12 h-12 bg-[#34D399]/10 rounded-full mb-4 mx-auto">
            <Lock className="w-5 h-5 text-[#059669]" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 text-center mb-1">الليدز</h1>
          <p className="text-sm text-gray-500 text-center mb-6">اكتب كلمة سر الأدمن</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="كلمة السر"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#059669]"
              autoFocus
            />
            {authError && <p className="text-sm text-red-600 text-center">{authError}</p>}
            {error && <p className="text-xs text-red-600 text-center break-words">{error}</p>}
            <button
              type="submit"
              disabled={loading || !password}
              className="w-full py-3 rounded-xl bg-[#059669] text-white text-sm font-bold disabled:opacity-50"
            >
              {loading ? 'بيحمّل…' : 'دخول'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ============ الشاشة ============
  const counts = leads.reduce<Record<string, number>>((a, l) => {
    a[l.kind_ar] = (a[l.kind_ar] ?? 0) + 1
    return a
  }, {})

  return (
    <div className="min-h-screen bg-[#FAFAF7] p-4 md:p-6" dir="rtl">
      <div className="max-w-6xl mx-auto">
        <header className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#059669]" />
            <h1 className="text-xl font-black text-gray-900">الليدز</h1>
            <span className="text-sm text-gray-500">({leads.length})</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchLeads(password, kind, q)}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-gray-200 text-xs font-bold text-gray-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> تحديث
            </button>
            <button
              onClick={() => { sessionStorage.removeItem('madmona_admin_pw'); setAuthed(false); setLeads([]) }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-gray-200 text-xs font-bold text-gray-500"
            >
              <LogOut className="w-3.5 h-3.5" /> خروج
            </button>
          </div>
        </header>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          {KINDS.map((k) => (
            <button
              key={k.key || 'all'}
              onClick={() => { setKind(k.key); fetchLeads(password, k.key, q) }}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border ${
                kind === k.key
                  ? 'bg-[#059669] text-white border-[#059669]'
                  : 'bg-white text-gray-600 border-gray-200'
              }`}
            >
              {k.ar}{counts[k.ar] ? ` · ${counts[k.ar]}` : ''}
            </button>
          ))}
          <form
            onSubmit={(e) => { e.preventDefault(); fetchLeads(password, kind, q) }}
            className="flex items-center gap-1.5 mr-auto"
          >
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="اسم أو تليفون أو مدينة"
                className="pr-9 pl-3 py-2 rounded-xl border border-gray-200 text-xs w-52 focus:outline-none focus:border-[#059669]"
              />
            </div>
          </form>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-xs text-red-700 break-words">
            {error}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr className="bg-[#FAFAF7] text-[11px] font-black text-gray-500">
                  <th className="px-4 py-3">النوع</th>
                  <th className="px-4 py-3">الاسم</th>
                  <th className="px-4 py-3">التليفون</th>
                  <th className="px-4 py-3">المدينة</th>
                  <th className="px-4 py-3">التصنيف</th>
                  <th className="px-4 py-3">الحالة</th>
                  <th className="px-4 py-3">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {leads.length === 0 && !loading && (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-400">مفيش ليدز</td></tr>
                )}
                {leads.map((l) => (
                  <tr key={`${l.kind}-${l.id}`} className="border-t border-gray-50 text-[13px]">
                    <td className="px-4 py-3 whitespace-nowrap text-gray-500 text-[11px] font-bold">{l.kind_ar}</td>
                    <td className="px-4 py-3 font-bold text-gray-900">{l.name || '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {l.phone ? (
                        <a href={`tel:${l.phone}`} className="flex items-center gap-1 text-[#059669] font-bold" dir="ltr">
                          <Phone className="w-3 h-3" />{l.phone}
                        </a>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {l.city ? <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-gray-400" />{l.city}</span> : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{l.category || '—'}</td>
                    <td className="px-4 py-3">
                      <select
                        value={l.status ?? ''}
                        onChange={(e) => updateStatus(l, e.target.value)}
                        className={`px-2 py-1 rounded-full text-[11px] font-bold border-0 ${
                          STATUS_COLOR[l.status ?? ''] ?? 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {(STATUSES[l.kind] ?? []).map((s) => (
                          <option key={s} value={s}>{STATUS_AR[s] ?? s}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-400 text-[11px]">{fmt(l.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
