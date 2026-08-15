'use client'

// src/components/admin/WaSafetyCard.tsx
// ============================================================================
// 🛡️ كارت حدود الإرسال — حد اليوم · الفاصل · ساعات الإرسال.
//
// (١٥ أغسطس ٢٠٢٦ — محمد: «حد اليوم / الفاصل / ساعات الإرسال يبقوا ديناميك»
//  و«الاتنين» لما سألته يتحكم فيهم من أنهي شاشة)
//
// الكارت ده مكوّن واحد بيتحط في `/admin/send` و`/admin/sending` — نفس
// المصدر ونفس الراوت، فمفيش نسختين ممكن يختلفوا. ده نفس الدرس اللي
// اتعلمناه من ليستة المُرسِلين اللي كانت متكتوبة في مكانين.
// ============================================================================

import { useState, useEffect, useCallback } from 'react'
import { safePw } from '@/lib/adminPw'

export interface WaSafetyValues {
  maxPerDay: number
  minGapSec: number
  maxGapSec: number
  startHour: number
  endHour: number
}

interface Props {
  /** باسورد الأدمن اللي الصفحة شغّالة بيه — بيتبعت في الهيدر. */
  password: string
  /** بينادى بعد أي حفظ ناجح — عشان الصفحة تحدّث أرقامها. */
  onSaved?: (s: WaSafetyValues) => void
}

const FIELDS: Array<{ key: keyof WaSafetyValues; label: string; hint: string; min: number; max: number; suffix: string }> = [
  { key: 'maxPerDay', label: 'حد اليوم',        hint: 'أقصى رسايل تسويقية للرقم الواحد في اليوم', min: 1,  max: 200,  suffix: 'رسالة' },
  { key: 'minGapSec', label: 'أقل فاصل',        hint: 'أقل وقت بين رسالتين',                      min: 5,  max: 3600, suffix: 'ثانية' },
  { key: 'maxGapSec', label: 'أكبر فاصل',       hint: 'الفاصل الفعلي عشوائي بين الاتنين',          min: 5,  max: 7200, suffix: 'ثانية' },
  { key: 'startHour', label: 'من الساعة',       hint: 'بتوقيت القاهرة',                           min: 0,  max: 23,   suffix: '' },
  { key: 'endHour',   label: 'لحد الساعة',      hint: 'مش شاملة — ٢٠ يعني آخر رسالة ١٩:٥٩',        min: 1,  max: 24,   suffix: '' },
]

function hhmm(h: number): string {
  return `${String(h).padStart(2, '0')}:00`
}

export default function WaSafetyCard({ password, onSaved }: Props) {
  const [val, setVal] = useState<WaSafetyValues | null>(null)
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [ok, setOk] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const res = await fetch('/api/admin/wa-safety', {
        headers: { 'X-Admin-Password': safePw(password) },
        cache: 'no-store',
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j?.detail || j?.error || `HTTP ${res.status}`)
      setVal(j.safety)
      setDraft(Object.fromEntries(Object.entries(j.safety).map(([k, v]) => [k, String(v)])))
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [password])

  useEffect(() => { load() }, [load])

  const dirty = !!val && FIELDS.some(f => String(draft[f.key] ?? '') !== String(val[f.key]))

  async function save() {
    setSaving(true)
    setErr(null)
    setOk(false)
    try {
      const res = await fetch('/api/admin/wa-safety', {
        method: 'POST',
        headers: { 'X-Admin-Password': safePw(password), 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j?.detail || j?.error || `HTTP ${res.status}`)
      setVal(j.safety)
      setDraft(Object.fromEntries(Object.entries(j.safety).map(([k, v]) => [k, String(v)])))
      setOk(true)
      onSaved?.(j.safety)
      setTimeout(() => setOk(false), 2500)
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <div className="flex items-center justify-between gap-2 mb-1">
        <p className="font-black text-sm text-gray-900">🛡️ حدود الإرسال</p>
        {loading && <span className="text-[11px] text-gray-400">بيحمّل…</span>}
      </div>
      <p className="text-[11px] text-gray-500 mb-3">
        بتتحفظ في الداتابيز وبتشتغل على طول — من غير نشر. بتتطبّق على الحملات الجديدة؛
        اللي متجدول في الطابور بالفعل مواعيده ماتتغيّرش.
      </p>

      {err && (
        <div className="mb-3 text-[12px] text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2 break-words">
          {err}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {FIELDS.map(f => (
          <label key={f.key} className="block">
            <span className="block text-[11px] font-bold text-gray-700 mb-1">{f.label}</span>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                inputMode="numeric"
                min={f.min}
                max={f.max}
                value={draft[f.key] ?? ''}
                onChange={e => setDraft(d => ({ ...d, [f.key]: e.target.value }))}
                disabled={loading || saving}
                dir="ltr"
                className="w-full px-2.5 py-1.5 rounded-xl border border-gray-200 text-sm font-mono text-gray-900 focus:border-emerald-400 focus:outline-none disabled:bg-gray-50"
              />
              {f.suffix && <span className="text-[10px] text-gray-400 whitespace-nowrap">{f.suffix}</span>}
            </div>
            <span className="block text-[10px] text-gray-400 mt-0.5 leading-snug">{f.hint}</span>
          </label>
        ))}
      </div>

      {val && (
        <p className="mt-3 text-[11px] text-gray-600 bg-gray-50 rounded-xl px-3 py-2 leading-relaxed">
          دلوقتي: <b>{val.maxPerDay}</b> رسالة كحد أقصى في اليوم · واحدة كل{' '}
          <b>{val.minGapSec}–{val.maxGapSec}</b> ثانية · من <b>{hhmm(val.startHour)}</b> لـ{' '}
          <b>{hhmm(val.endHour)}</b> بتوقيت القاهرة.
        </p>
      )}

      <div className="flex items-center gap-2 mt-3">
        <button
          type="button"
          onClick={save}
          disabled={!dirty || saving || loading}
          className="px-4 py-2 rounded-xl text-xs font-black bg-[#34D399] text-[#04352A] disabled:bg-gray-100 disabled:text-gray-400 transition-all"
        >
          {saving ? 'بيحفظ…' : 'احفظ'}
        </button>
        {dirty && !saving && (
          <button
            type="button"
            onClick={() => val && setDraft(Object.fromEntries(Object.entries(val).map(([k, v]) => [k, String(v)])))}
            className="px-3 py-2 rounded-xl text-[11px] font-bold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all"
          >
            رجّع
          </button>
        )}
        {ok && <span className="text-[11px] font-bold text-emerald-700">✅ اتحفظ</span>}
      </div>
    </div>
  )
}
