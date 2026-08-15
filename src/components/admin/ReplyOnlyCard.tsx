'use client'

// src/components/admin/ReplyOnlyCard.tsx
// ============================================================================
// 🚨 كارت حارس «رد بس».
//
// (١٥ أغسطس ٢٠٢٦ — محمد: «شيل الحارس وشغّل الباقي»)
//
// الحارس ده هو اللي بيمنع بدء محادثات جديدة مع ناس ماكلّموناش. اتحط في
// ٢٠ يوليو بعد ما واتساب حظر الرقم من بدء المحادثات (٥٠ جروب و٣٥ رسالة
// في يوم). الكارت بيخلّي محمد يتحكم فيه من غير نشر — وأهم حاجة إنه يقدر
// يفتحه **لحملة واحدة بالاسم** بدل ما يفتح الباب لكل حاجة.
// ============================================================================

import { useState, useEffect, useCallback } from 'react'
import { safePw } from '@/lib/adminPw'

type Mode = 'on' | 'campaigns' | 'off'

interface Data {
  mode: Mode
  campaigns: string[]
  source: 'db' | 'env'
  queued_campaigns: Array<{ name: string; queued: number }>
}

const MODES: Array<{ key: Mode; label: string; desc: string; tone: string }> = [
  {
    key: 'on',
    label: '🔒 مقفول',
    desc: 'مفيش أي بدء محادثة جديدة. الرد على اللي بيكلّمنا شغّال عادي.',
    tone: 'bg-emerald-50 border-emerald-300 text-emerald-900',
  },
  {
    key: 'campaigns',
    label: '🎯 حملات مختارة',
    desc: 'الحملات اللي تحت بس هي اللي تقدر تبدأ محادثات. أي حاجة تانية تفضل محمية.',
    tone: 'bg-amber-50 border-amber-300 text-amber-900',
  },
  {
    key: 'off',
    label: '⚠️ مفتوح',
    desc: 'مفيش حارس خالص — أي مسار إرسال يقدر يبدأ محادثة. ده اللي حظر الرقم في ٢٠ يوليو.',
    tone: 'bg-red-50 border-red-300 text-red-900',
  },
]

export default function ReplyOnlyCard({ password }: { password: string }) {
  const [d, setD] = useState<Data | null>(null)
  const [mode, setMode] = useState<Mode>('on')
  const [picked, setPicked] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [ok, setOk] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const res = await fetch('/api/admin/wa-reply-only', {
        headers: { 'X-Admin-Password': safePw(password) },
        cache: 'no-store',
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j?.detail || j?.error || `HTTP ${res.status}`)
      setD(j)
      setMode(j.mode)
      setPicked(j.campaigns ?? [])
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [password])

  useEffect(() => { load() }, [load])

  const dirty =
    !!d && (mode !== d.mode || picked.slice().sort().join('|') !== (d.campaigns ?? []).slice().sort().join('|'))

  async function save() {
    setSaving(true); setErr(null); setOk(false)
    try {
      const res = await fetch('/api/admin/wa-reply-only', {
        method: 'POST',
        headers: { 'X-Admin-Password': safePw(password), 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, campaigns: picked }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j?.detail || j?.error || `HTTP ${res.status}`)
      setD(j); setMode(j.mode); setPicked(j.campaigns ?? [])
      setOk(true); setTimeout(() => setOk(false), 2500)
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const toggle = (name: string) =>
    setPicked(p => (p.includes(name) ? p.filter(x => x !== name) : [...p, name]))

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <div className="flex items-center justify-between gap-2 mb-1">
        <p className="font-black text-sm text-gray-900">🚨 حارس «رد بس»</p>
        {loading && <span className="text-[11px] text-gray-400">بيحمّل…</span>}
      </div>
      <p className="text-[11px] text-gray-500 mb-3 leading-relaxed">
        بيمنع بدء محادثات جديدة مع ناس ماكلّموناش. اتحط في ٢٠ يوليو بعد ما واتساب حظر الرقم
        من <b>بدء المحادثات</b> (٥٠ جروب و٣٥ رسالة في يوم واحد) — الرد فضل شغّال وقتها.
        الردود على اللي بيكلّمنا <b>مالهاش أي قيد في كل الأوضاع</b>.
      </p>

      {err && (
        <div className="mb-3 text-[12px] text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2 break-words">
          {err}
        </div>
      )}

      <div className="grid gap-2 mb-3">
        {MODES.map(m => (
          <button
            key={m.key}
            type="button"
            onClick={() => setMode(m.key)}
            disabled={loading || saving}
            className={`text-right px-3 py-2.5 rounded-xl border-2 transition-all ${
              mode === m.key ? m.tone : 'bg-white border-gray-100 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <span className="block text-[12px] font-black">{m.label}</span>
            <span className="block text-[10px] mt-0.5 leading-snug opacity-80">{m.desc}</span>
          </button>
        ))}
      </div>

      {mode === 'campaigns' && (
        <div className="mb-3 bg-amber-50/60 border border-amber-200 rounded-xl p-3">
          <p className="text-[11px] font-bold text-amber-900 mb-2">
            الحملات المسموح لها تبدأ محادثات:
          </p>
          {(d?.queued_campaigns ?? []).length === 0 ? (
            <p className="text-[11px] text-gray-500">مفيش حملات في الطابور دلوقتي.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {(d?.queued_campaigns ?? []).map(c => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => toggle(c.name)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all ${
                    picked.includes(c.name)
                      ? 'bg-amber-500 border-amber-600 text-white'
                      : 'bg-white border-amber-200 text-amber-900 hover:bg-amber-100'
                  }`}
                >
                  {picked.includes(c.name) ? '✓ ' : ''}{c.name}
                  <span className="opacity-70"> · {c.queued}</span>
                </button>
              ))}
            </div>
          )}
          {/* الحملات المحفوظة اللي مابقاش ليها رسايل في الطابور — عشان
              ماتختفيش من غير ما محمد ياخد باله إنها لسه مسموحة. */}
          {picked.filter(n => !(d?.queued_campaigns ?? []).some(c => c.name === n)).length > 0 && (
            <p className="text-[10px] text-amber-800 mt-2">
              مسموحة كمان (مفيش رسايل في الطابور):{' '}
              {picked.filter(n => !(d?.queued_campaigns ?? []).some(c => c.name === n)).join(' · ')}
            </p>
          )}
        </div>
      )}

      {mode === 'off' && (
        <p className="mb-3 text-[11px] text-red-800 bg-red-50 border border-red-200 rounded-xl px-3 py-2 leading-relaxed">
          الوضع ده بيفتح بدء المحادثات لكل مسارات الإرسال مرة واحدة — الحملات والوكلاء
          وإشعارات الحجز. لو محتاج حملة واحدة بس، «حملات مختارة» بتعمل نفس الشغل
          والباقي يفضل محمي.
        </p>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={!dirty || saving || loading}
          className="px-4 py-2 rounded-xl text-xs font-black bg-[#34D399] text-[#04352A] disabled:bg-gray-100 disabled:text-gray-400 transition-all"
        >
          {saving ? 'بيحفظ…' : 'احفظ'}
        </button>
        {dirty && !saving && d && (
          <button
            type="button"
            onClick={() => { setMode(d.mode); setPicked(d.campaigns ?? []) }}
            className="px-3 py-2 rounded-xl text-[11px] font-bold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all"
          >
            رجّع
          </button>
        )}
        {ok && <span className="text-[11px] font-bold text-emerald-700">✅ اتحفظ</span>}
        {d?.source === 'env' && (
          <span className="text-[10px] text-gray-400">
            (لسه بيقرا من متغيّر البيئة القديم — احفظ عشان ينتقل للداتابيز)
          </span>
        )}
      </div>
    </div>
  )
}
