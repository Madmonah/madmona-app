'use client'

// src/components/admin/CampaignsCard.tsx
// ============================================================================
// 🚀 الحملات المستنية — ابدأ · أجّل · وقّف.
//
// (١٦ أغسطس ٢٠٢٦ — محمد: «كل مرة أبدأ حملة لازم أبعتلك هنا؟»)
//
// كان لأ. تلات حاجات من أربعة موجودين في الشاشة خلاص، والناقص الوحيد
// كان «ابدأ دلوقتي» — وده اللي كان بيتعمل بـSQL يدوي كل مرة. الكارت ده
// هو الحتة الناقصة.
//
// أهم تفصيلة فيه: لو الحارس هيرفض الحملة، الزرار **بيقولك قبل ما تدوس**
// ويعرض عليك تفتحه للحملة دي بس. من غير ده كنت هتدوس ابدأ، وتفتكر إنها
// اشتغلت، وتلاقي كل الرسايل فشلت بعد نص ساعة.
// ============================================================================

import { useState, useEffect, useCallback } from 'react'
import { Play, Clock, Pause, ShieldAlert } from 'lucide-react'
import { safePw } from '@/lib/adminPw'

interface Campaign {
  name: string
  queued: number
  first: string
  last: string
  sessions: string[]
  blocked_by_guard: boolean
}

interface Data {
  campaigns: Campaign[]
  guard: { mode: 'on' | 'campaigns' | 'off'; campaigns: string[] }
  safety: { minGapSec: number; maxGapSec: number; startHour: number; endHour: number }
}

const fmt = (iso: string) =>
  new Date(iso).toLocaleString('ar-EG', {
    timeZone: 'Africa/Cairo', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  })

export default function CampaignsCard({ password, onChanged }: { password: string; onChanged?: () => void }) {
  const [d, setD] = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setErr(null)
    try {
      const res = await fetch('/api/admin/campaigns', {
        headers: { 'X-Admin-Password': safePw(password) }, cache: 'no-store',
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j?.detail || j?.error || `HTTP ${res.status}`)
      setD(j)
    } catch (e) { setErr((e as Error).message) } finally { setLoading(false) }
  }, [password])

  useEffect(() => { load() }, [load])

  async function act(campaign: string, action: 'start_now' | 'defer' | 'hold', open_guard = false) {
    setBusy(`${campaign}:${action}`); setErr(null); setMsg(null); setConfirmOpen(null)
    try {
      const res = await fetch('/api/admin/campaigns', {
        method: 'POST',
        headers: { 'X-Admin-Password': safePw(password), 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign, action, open_guard }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j?.detail || j?.error || `HTTP ${res.status}`)
      const label = action === 'start_now' ? 'بدأت' : action === 'defer' ? 'اتأجّلت' : 'اتوقّفت'
      setMsg(`«${campaign}» ${label} — ${j.moved} رسالة، من ${fmt(j.first)} لـ ${fmt(j.last)}`)
      await load(); onChanged?.()
      setTimeout(() => setMsg(null), 8000)
    } catch (e) { setErr((e as Error).message) } finally { setBusy(null) }
  }

  const list = d?.campaigns ?? []

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <div className="flex items-center justify-between gap-2 mb-1">
        <p className="font-black text-sm text-gray-900">🚀 الحملات المستنية</p>
        <button onClick={() => load()} disabled={loading}
          className="text-[11px] font-bold text-gray-500 hover:text-gray-800 disabled:opacity-50">
          {loading ? 'بيحمّل…' : 'حدّث'}
        </button>
      </div>
      <p className="text-[11px] text-gray-500 mb-3">
        «ابدأ» بيوزّع الرسايل من دلوقتي بالفاصل اللي إنت حاططه
        {d && <> (<b>{d.safety.minGapSec}–{d.safety.maxGapSec}</b> ثانية)</>}.
        «أجّل» بيرجّعها لأول النافذة الجاية{d && <> (<b>{String(d.safety.startHour).padStart(2, '0')}:00</b>)</>}.
        «وقّف» بيبعّدها أسبوع لحد ما تقرر.
      </p>

      {err && <div className="mb-3 text-[12px] text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2 break-words">{err}</div>}
      {msg && <div className="mb-3 text-[12px] text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">✅ {msg}</div>}

      {list.length === 0 && !loading && (
        <p className="text-[12px] text-gray-400 py-3">مفيش حملات مستنية في الطابور.</p>
      )}

      <div className="space-y-2">
        {list.map((c) => (
          <div key={c.name} className="border border-gray-100 rounded-xl p-3">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div className="min-w-0">
                <p className="font-black text-[13px] text-gray-900">
                  {c.name}
                  <span className="mr-2 px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px]">
                    {c.queued} مستنية
                  </span>
                </p>
                <p className="text-[11px] text-gray-500 mt-1">
                  من <b dir="ltr">{fmt(c.first)}</b> لـ <b dir="ltr">{fmt(c.last)}</b>
                  {' · '}
                  {c.sessions.length === 0
                    ? 'الرقم الافتراضي'
                    : <>من <span className="font-mono" dir="ltr">{c.sessions.join('، ')}</span></>}
                </p>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => (c.blocked_by_guard ? setConfirmOpen(c.name) : act(c.name, 'start_now'))}
                  disabled={!!busy}
                  className="px-3 py-1.5 rounded-xl text-[11px] font-black bg-[#34D399] text-[#04352A] hover:opacity-90 disabled:opacity-50 flex items-center gap-1"
                >
                  <Play className="w-3 h-3" /> {busy === `${c.name}:start_now` ? '…' : 'ابدأ'}
                </button>
                <button onClick={() => act(c.name, 'defer')} disabled={!!busy}
                  className="px-3 py-1.5 rounded-xl text-[11px] font-bold bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {busy === `${c.name}:defer` ? '…' : 'أجّل'}
                </button>
                <button onClick={() => act(c.name, 'hold')} disabled={!!busy}
                  className="px-3 py-1.5 rounded-xl text-[11px] font-bold bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50 flex items-center gap-1">
                  <Pause className="w-3 h-3" /> {busy === `${c.name}:hold` ? '…' : 'وقّف'}
                </button>
              </div>
            </div>

            {c.blocked_by_guard && (
              <p className="mt-2 text-[11px] text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 flex items-start gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>
                  حارس «رد بس» مقفول على الحملة دي — أي حد ماكلّمناش هترفض رسالته.
                  اللي كلّمنا قبل كده هيوصله عادي.
                </span>
              </p>
            )}

            {confirmOpen === c.name && (
              <div className="mt-2 bg-amber-50 border-2 border-amber-300 rounded-xl p-3">
                <p className="text-[12px] font-bold text-amber-900 mb-2">
                  تفتح الحارس لـ«{c.name}» وتبدأ؟
                </p>
                <p className="text-[11px] text-amber-800 mb-2.5 leading-relaxed">
                  هيتسمح للحملة دي <b>بس</b> إنها تبدأ محادثات جديدة. باقي مسارات
                  الإرسال — الوكلاء وإشعارات الحجز — هتفضل محمية. ماتنساش ترجّعه
                  «🔒 مقفول» بعد ما تخلص.
                </p>
                <div className="flex gap-2">
                  <button onClick={() => act(c.name, 'start_now', true)} disabled={!!busy}
                    className="px-3 py-1.5 rounded-xl text-[11px] font-black bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50">
                    افتح وابدأ
                  </button>
                  <button onClick={() => act(c.name, 'start_now', false)} disabled={!!busy}
                    className="px-3 py-1.5 rounded-xl text-[11px] font-bold bg-white border border-amber-300 text-amber-900 hover:bg-amber-100 disabled:opacity-50">
                    ابدأ من غير ما تفتح
                  </button>
                  <button onClick={() => setConfirmOpen(null)} disabled={!!busy}
                    className="px-3 py-1.5 rounded-xl text-[11px] font-bold bg-gray-100 text-gray-600 hover:bg-gray-200">
                    إلغاء
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
