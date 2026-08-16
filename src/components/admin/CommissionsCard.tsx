'use client'

// src/components/admin/CommissionsCard.tsx
// ============================================================================
// 💰 كارت عمولة كل قسم.
//
// (١٦ أغسطس ٢٠٢٦ — محمد: «عمولة العربيات ١٠ الاف» · «كل قسم ليه العمولة بتاعته»)
//
// اللي حصل قبل الكارت ده: حملة «عربيات» كانت بتقول للبايع «عمولتنا ١٠ آلاف»
// وبرومبت المارد كان مكتوب فيه «بالاتفاق ⛔ ماتقولش رقم». البايع بياخد رقم
// في الرسالة، يرد يسأل، فالمارد ينكر الرقم. تغيير ده كان محتاج كوميت ونشر.
//
// أهم تفصيلة في الكارت: **معاينة اللي المارد هيقوله بالنص** تحت خالص.
// من غيرها كنت هتغيّر رقم وتفضل مش متأكد وصل للمارد ولا لأ.
// ============================================================================

import { useState, useEffect, useCallback } from 'react'
import { Percent, Save, RotateCcw, Eye, EyeOff } from 'lucide-react'
import { safePw } from '@/lib/adminPw'

type Kind = 'percent' | 'flat' | 'months' | 'manual'

interface Rule {
  key: string
  match_track: string | null
  match_group: string | null
  kind: Kind
  value: number
  label_ar: string
  note_ar: string | null
  auto_charge: boolean
  priority: number
}

interface Data {
  rules: Rule[]
  impact: Record<string, { categories: number; listings: number }>
  prompt_preview: string
}

const KIND_LABEL: Record<Kind, string> = {
  percent: 'نسبة ٪',
  flat: 'مبلغ ثابت (جنيه)',
  months: 'شهور إيجار',
  manual: 'بالاتفاق (من غير رقم)',
}

/** أسماء عربية للمفاتيح — عشان محمد يشوف القسم مش الـslug. */
const RULE_NAME: Record<string, string> = {
  'sale-vehicles': 'بيع المركبات — عربيات وموتوسيكلات',
  'sale-marine': 'بيع المركبات البحرية',
  'sale-property': 'بيع وريسيل العقارات',
  'rent-property': 'إيجار العقارات',
  default: 'كل الباقي — خدمات · مطاعم · مارت · منتجات',
}

export default function CommissionsCard({ password }: { password: string }) {
  const [d, setD] = useState<Data | null>(null)
  const [draft, setDraft] = useState<Record<string, Rule>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [okKey, setOkKey] = useState<string | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setErr(null)
    try {
      const res = await fetch('/api/admin/commissions', {
        headers: { 'X-Admin-Password': safePw(password) }, cache: 'no-store',
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j?.detail || j?.error || `HTTP ${res.status}`)
      setD(j)
      setDraft(Object.fromEntries((j.rules as Rule[]).map((r) => [r.key, { ...r }])))
    } catch (e) { setErr((e as Error).message) } finally { setLoading(false) }
  }, [password])

  useEffect(() => { load() }, [load])

  const set = (key: string, patch: Partial<Rule>) =>
    setDraft((p) => ({ ...p, [key]: { ...p[key], ...patch } }))

  const dirty = (r: Rule) => {
    const orig = d?.rules.find((x) => x.key === r.key)
    if (!orig) return false
    return (
      orig.kind !== r.kind ||
      Number(orig.value) !== Number(r.value) ||
      orig.label_ar !== r.label_ar ||
      (orig.note_ar ?? '') !== (r.note_ar ?? '')
    )
  }

  async function save(r: Rule) {
    setSaving(r.key); setErr(null); setOkKey(null)
    try {
      const res = await fetch('/api/admin/commissions', {
        method: 'POST',
        headers: { 'X-Admin-Password': safePw(password), 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: r.key, kind: r.kind, value: r.value, label_ar: r.label_ar, note_ar: r.note_ar }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j?.detail || j?.error || `HTTP ${res.status}`)
      setD(j)
      setDraft(Object.fromEntries((j.rules as Rule[]).map((x) => [x.key, { ...x }])))
      setOkKey(r.key); setTimeout(() => setOkKey(null), 3000)
    } catch (e) { setErr((e as Error).message) } finally { setSaving(null) }
  }

  const list = Object.values(draft).sort((a, b) => a.priority - b.priority)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <div className="flex items-center justify-between gap-2 mb-1">
        <p className="font-black text-sm text-gray-900 flex items-center gap-1.5">
          <Percent className="w-4 h-4 text-[#059669]" /> عمولة كل قسم
        </p>
        <button onClick={() => load()} disabled={loading}
          className="text-[11px] font-bold text-gray-500 hover:text-gray-800 disabled:opacity-50">
          {loading ? 'بيحمّل…' : 'حدّث'}
        </button>
      </div>
      <p className="text-[11px] text-gray-500 mb-3 leading-relaxed">
        الأرقام دي هي <b>المرجع الوحيد</b>: المارد بيقولها للعملاء، والشيك أوت بيحسب بيها،
        والمورد الجديد بيتسجّل بيها. تغييرها هنا بيمشي على طول من غير نشر.
      </p>

      {err && <div className="mb-3 text-[12px] text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2 break-words">{err}</div>}

      <div className="space-y-2.5">
        {list.map((r) => {
          const imp = d?.impact?.[r.key]
          const isDirty = dirty(r)
          return (
            <div key={r.key} className={`rounded-xl border p-3 ${isDirty ? 'border-amber-300 bg-amber-50/40' : 'border-gray-100'}`}>
              <div className="flex items-start justify-between gap-2 flex-wrap mb-2">
                <div className="min-w-0">
                  <p className="font-black text-[13px] text-gray-900">{RULE_NAME[r.key] ?? r.key}</p>
                  <p className="text-[10px] text-gray-400 font-mono" dir="ltr">
                    {r.match_track ?? '*'} / {r.match_group ?? '*'}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {imp && (
                    <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[10px] font-bold">
                      {imp.categories} قسم · {imp.listings} إعلان منشور
                    </span>
                  )}
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    r.auto_charge ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {r.auto_charge ? 'بتتحسب في الشيك أوت' : 'بتتحصّل بره المنصة'}
                  </span>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                <div className="flex items-center gap-2">
                  <select
                    value={r.kind}
                    onChange={(e) => set(r.key, { kind: e.target.value as Kind })}
                    disabled={!!saving}
                    className="px-2.5 py-2 rounded-xl border border-gray-200 text-[12px] font-bold bg-white"
                  >
                    {(Object.keys(KIND_LABEL) as Kind[]).map((k) => (
                      <option key={k} value={k}>{KIND_LABEL[k]}</option>
                    ))}
                  </select>
                  <input
                    type="number" min={0} step={r.kind === 'percent' ? 0.5 : 1}
                    value={r.kind === 'manual' ? 0 : r.value}
                    disabled={r.kind === 'manual' || !!saving}
                    onChange={(e) => set(r.key, { value: Number(e.target.value) })}
                    className="w-28 px-3 py-2 rounded-xl border border-gray-200 text-sm font-mono font-bold disabled:bg-gray-50 disabled:text-gray-400"
                    dir="ltr"
                  />
                  <span className="text-[11px] text-gray-500 font-bold">
                    {r.kind === 'percent' ? '٪' : r.kind === 'flat' ? 'جنيه' : r.kind === 'months' ? 'شهر' : ''}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button onClick={() => save(r)} disabled={!isDirty || !!saving}
                    className="px-3 py-2 rounded-xl text-[11px] font-black bg-[#34D399] text-[#04352A] disabled:bg-gray-100 disabled:text-gray-400 flex items-center gap-1">
                    <Save className="w-3 h-3" /> {saving === r.key ? 'بيحفظ…' : 'احفظ'}
                  </button>
                  {isDirty && (
                    <button
                      onClick={() => {
                        const orig = d?.rules.find((x) => x.key === r.key)
                        if (orig) set(r.key, { ...orig })
                      }}
                      disabled={!!saving}
                      className="px-2.5 py-2 rounded-xl text-[11px] font-bold bg-gray-100 text-gray-600 hover:bg-gray-200 flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" /> رجّع
                    </button>
                  )}
                  {okKey === r.key && <span className="text-[11px] font-bold text-emerald-700">✅ اتحفظ</span>}
                </div>
              </div>

              {/* ⚠️ ده النص اللي المارد بيقوله حرفيًا. لو الرقم فوق اتغيّر
                  والنص ده مااتغيّرش، المارد هيقول رقم قديم — نفس البق
                  اللي حصل في المركبات بالظبط. */}
              <label className="block mt-2">
                <span className="text-[10px] font-bold text-gray-500">اللي المارد بيقوله بالنص:</span>
                <input
                  value={r.label_ar}
                  onChange={(e) => set(r.key, { label_ar: e.target.value })}
                  disabled={!!saving}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 text-[12px] font-bold"
                />
              </label>
              <label className="block mt-1.5">
                <span className="text-[10px] font-bold text-gray-500">تعليمات إضافية للمارد (اختياري):</span>
                <textarea
                  value={r.note_ar ?? ''} rows={2}
                  onChange={(e) => set(r.key, { note_ar: e.target.value })}
                  disabled={!!saving}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 text-[11px] leading-relaxed"
                />
              </label>
            </div>
          )
        })}
      </div>

      <button
        onClick={() => setShowPrompt((s) => !s)}
        className="mt-3 text-[11px] font-bold text-gray-600 hover:text-gray-900 flex items-center gap-1"
      >
        {showPrompt ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        {showPrompt ? 'اخفي' : 'وريني'} اللي المارد شايفه دلوقتي بالظبط
      </button>
      {showPrompt && (
        <pre className="mt-2 p-3 rounded-xl bg-gray-50 border border-gray-100 text-[11px] leading-relaxed whitespace-pre-wrap text-gray-700">
          {d?.prompt_preview || '—'}
        </pre>
      )}
    </div>
  )
}
