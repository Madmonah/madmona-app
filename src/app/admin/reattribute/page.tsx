'use client'

// src/app/admin/reattribute/page.tsx
// ============================================================================
// 🏷️ رجّع الإعلانات لأصحابها.
//
// ليه (١٥ أغسطس ٢٠٢٦ — محمد: «وكيل الليستنج لما يجي يرفع اعلان من الواتساب
// لازم الاعلان يتسجل بالرقم الي باعت»): دالة النشر كانت حاطة رقم الوكيل ثابت.
// اتصلّحت للإعلانات الجديدة — الشاشة دي للقديم.
//
// كل صف بيقول محتاج إيه: جاهز / ناقص سجل مورد / محتاج حساب / مفيش رقم.
// زرار «انقل» بيشتغل على رقم واحد بس في المرة، وبيوريك النتيجة بالاسم.
// ============================================================================

import { useState, useCallback, type FormEvent } from 'react'
import { Lock, RefreshCw, ArrowLeftRight, AlertTriangle, Check } from 'lucide-react'
import { safePw } from '@/lib/adminPw'

interface Group {
  raw_phone: string
  phone: string | null
  listings: number
  sample_title: string
  profile_id: string | null
  supplier_id: string | null
  business_name: string | null
  action: 'ready' | 'needs_supplier' | 'needs_account' | 'no_phone'
}

interface Result {
  ok?: boolean
  moved?: number
  skipped_duplicates?: number
  business_name?: string
  created_account?: boolean
  error?: string
  detail?: string
}

const ACTION_AR: Record<Group['action'], string> = {
  ready: 'جاهز — الحساب موجود',
  needs_supplier: 'البروفايل موجود، ناقص سجل مورد',
  needs_account: 'محتاج حساب جديد',
  no_phone: 'مش موبايل مصري (آي دي صفحة؟)',
}
const ACTION_COLOR: Record<Group['action'], string> = {
  ready: 'bg-emerald-100 text-emerald-800',
  needs_supplier: 'bg-blue-100 text-blue-800',
  needs_account: 'bg-amber-100 text-amber-800',
  no_phone: 'bg-gray-100 text-gray-600',
}

export default function ReattributePage() {
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const [authError, setAuthError] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [groups, setGroups] = useState<Group[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [results, setResults] = useState<Record<string, Result>>({})
  const [names, setNames] = useState<Record<string, string>>({})

  const load = useCallback(async (pw: string) => {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/admin/reattribute', { headers: { 'X-Admin-Password': safePw(pw) } })
      if (res.status === 401) { setAuthed(false); setAuthError('كلمة السر غلط'); return }
      const json = await res.json()
      if (!res.ok) { setError(json.detail || json.error || 'فشل التحميل'); return }
      setGroups(json.groups || [])
      setAuthed(true); setAuthError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'فشل الاتصال')
    } finally {
      setLoading(false)
    }
  }, [])

  const submitPw = (e: FormEvent) => { e.preventDefault(); load(password) }

  const move = async (g: Group) => {
    if (!g.phone) return
    setBusy(g.raw_phone)
    try {
      const res = await fetch('/api/admin/reattribute', {
        method: 'POST',
        headers: { 'X-Admin-Password': safePw(password), 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: g.phone, business_name: names[g.raw_phone] || undefined }),
      })
      const json = (await res.json()) as Result
      setResults((r) => ({ ...r, [g.raw_phone]: json }))
      if (json.ok) await load(password)
    } catch (e) {
      setResults((r) => ({ ...r, [g.raw_phone]: { error: e instanceof Error ? e.message : 'فشل' } }))
    } finally {
      setBusy(null)
    }
  }

  if (!authed) {
    return (
      <div dir="rtl" className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-6">
        <form onSubmit={submitPw} className="bg-white rounded-2xl border border-gray-200 p-6 w-full max-w-sm">
          <div className="flex items-center gap-2 mb-4">
            <Lock className="w-5 h-5 text-gray-500" />
            <h1 className="font-bold">رجّع الإعلانات لأصحابها</h1>
          </div>
          <input
            type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="كلمة سر الأدمن" autoComplete="current-password"
            className="w-full px-4 py-3 bg-[#FAFAF7] border border-gray-200 rounded-xl text-sm mb-3"
          />
          {authError && <p className="text-sm text-red-600 mb-3">{authError}</p>}
          {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full py-3 bg-[#059669] text-white rounded-xl text-sm font-medium disabled:opacity-50">
            {loading ? 'بيحمّل…' : 'دخول'}
          </button>
        </form>
      </div>
    )
  }

  const total = groups.reduce((s, g) => s + g.listings, 0)

  return (
    <div dir="rtl" className="min-h-screen bg-[#FAFAF7] p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-[#059669]" />
            رجّع الإعلانات لأصحابها
          </h1>
          <button onClick={() => load(password)} disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            تحديث
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-6">
          {total} إعلان لسه مسجّل باسم «وكيل الليستنجات» — مجمّعين على {groups.length} رقم.
          الإعلانات الجديدة بقت بتتسجل بالرقم اللي بعت أوتوماتيك.
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-sm text-red-700">{error}</div>
        )}

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-900">
            «انقل» على رقم من غير حساب بيعمل <strong>حساب جديد لصاحب الرقم</strong> (بروفايل + مورد + مالك).
            دوس بس على اللي إنت متأكد إنه شريك فعلي. الإعلان المكرر مابيتنقلش ومابيتمسحش — بيترجع في النتيجة عشان تقرر.
          </p>
        </div>

        <div className="space-y-3">
          {groups.map((g) => {
            const r = results[g.raw_phone]
            return (
              <div key={g.raw_phone} className="bg-white rounded-2xl border border-gray-200 p-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-medium">{g.raw_phone}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${ACTION_COLOR[g.action]}`}>
                        {ACTION_AR[g.action]}
                      </span>
                      <span className="text-xs text-gray-500">{g.listings} إعلان</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1 truncate">{g.sample_title}</p>
                    {g.business_name && (
                      <p className="text-xs text-emerald-700 mt-1">هيروح لـ: {g.business_name}</p>
                    )}
                  </div>
                  {g.phone && (
                    <div className="flex items-center gap-2">
                      {!g.supplier_id && (
                        <input
                          value={names[g.raw_phone] || ''}
                          onChange={(e) => setNames((n) => ({ ...n, [g.raw_phone]: e.target.value }))}
                          placeholder="اسم النشاط"
                          className="px-3 py-2 bg-[#FAFAF7] border border-gray-200 rounded-xl text-sm w-40"
                        />
                      )}
                      <button
                        onClick={() => move(g)} disabled={busy === g.raw_phone}
                        className="px-4 py-2 bg-[#059669] text-white rounded-xl text-sm font-medium disabled:opacity-50 whitespace-nowrap"
                      >
                        {busy === g.raw_phone ? 'بينقل…' : 'انقل'}
                      </button>
                    </div>
                  )}
                </div>

                {r && (
                  <div className={`mt-3 rounded-xl p-3 text-sm ${r.ok ? 'bg-emerald-50 text-emerald-900' : 'bg-red-50 text-red-700'}`}>
                    {r.ok ? (
                      <span className="flex items-center gap-2">
                        <Check className="w-4 h-4" />
                        اتنقل {r.moved} إعلان لـ«{r.business_name}»
                        {r.created_account ? ' (اتعمل حساب جديد)' : ''}
                        {r.skipped_duplicates ? ` — ${r.skipped_duplicates} اتساب لأنه مكرر` : ''}
                      </span>
                    ) : (
                      <span>{r.detail || r.error}</span>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
