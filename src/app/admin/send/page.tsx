'use client'

// src/app/admin/send/page.tsx
// ============================================================================
// 📤 ابعت — لزق الأرقام، اكتب الرسالة، شوف المعاينة، وبعدين حط في الطابور.
//
// ليه (١٥ أغسطس ٢٠٢٦ — محمد: «كان في موديل للإرسال بنضيف فيه الأرقام
// وبتتبعت بنفس البروتوكول... ده موجود فين؟»): الموديل ده كان باكيدج محلي
// على الديسكتوب بيبعت برّه البروتوكول ومش بيبان في أي شاشة. الشاشة دي
// بتديك نفس السهولة بس على طابور السيرفر.
//
// **الشاشة دي مابتبعتش.** بتحط في الطابور. الكرون هو اللي بيبعت — رسالة
// رسالة، بينتظر إيصال «وصلت»، وبيعيد بعد ٣ دقايق لو مفيش إيصال.
//
// المعاينة إجبارية: زرار «حط في الطابور» مايفتحش غير بعد ما تشوف المعاينة.
// ============================================================================

import { useState, useEffect, useCallback, type FormEvent } from 'react'
import { Lock, Send, Eye, AlertTriangle, Check, Clock, Users } from 'lucide-react'
import { safePw } from '@/lib/adminPw'
import WaSafetyCard from '@/components/admin/WaSafetyCard'

interface Skipped { phone: string; reason: string }
interface Preview {
  ok?: boolean
  dry_run?: boolean
  would_queue?: number
  queued?: number
  skipped_count?: number
  skipped?: Skipped[]
  first_send?: string | null
  last_send?: string | null
  error?: string
  safety?: { maxPerDay: number; minGapSec: number; maxGapSec: number; startHour: number; endHour: number }
}
interface Upcoming {
  recipient_phone: string
  recipient_name: string | null
  scheduled_for: string
}
interface SessionOption { session: string; status: string; connected: boolean; phone: string | null }
interface Status {
  counts?: Record<string, number>
  upcoming?: Upcoming[]
  safety?: Preview['safety']
  /** 📤 (١٥ أغسطس ٢٠٢٦) الأرقام المتاحة — حية من OpenWA، مش متكتوبة في الكود */
  sessions?: SessionOption[]
  default_session?: string
}

function when(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('ar-EG', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Cairo',
    })
  } catch { return '—' }
}

/** كل سطر: رقم، أو «رقم,اسم» — بنقبل الاتنين */
function parseLines(text: string): Array<{ phone: string; name: string | null }> {
  const out: Array<{ phone: string; name: string | null }> = []
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) continue
    const parts = line.split(/[,\t;]/).map((p) => p.trim())
    const phone = parts[0]
    if (!phone) continue
    out.push({ phone, name: parts[1] || null })
  }
  return out
}

export default function SendPage() {
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const [authError, setAuthError] = useState('')

  const [numbers, setNumbers] = useState('')
  const [message, setMessage] = useState('')
  const [campaign, setCampaign] = useState('')
  const [skipDays, setSkipDays] = useState(3)
  // 📤 (١٥ أغسطس ٢٠٢٦ — محمد: «عايز أقدر أختار الرقم اللي هيبعت»)
  //    فاضي = الرقم الافتراضي من whatsapp_config.queue_send_session.
  const [session, setSession] = useState('')

  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [done, setDone] = useState<Preview | null>(null)
  const [status, setStatus] = useState<Status | null>(null)
  const [error, setError] = useState('')

  const loadStatus = useCallback(async (pw: string, silent = false) => {
    const res = await fetch('/api/admin/send', { headers: { 'X-Admin-Password': safePw(pw) } })
    if (res.status === 401) { setAuthed(false); if (!silent) setAuthError('كلمة السر غلط'); return false }
    // 🐞 (١٥ أغسطس ٢٠٢٦) بنقرا نص الرد الأول — لو الراوت رجّع صفحة خطأ HTML
    //    الـjson() كان بيرمي والرسالة بتطلع «فشل الاتصال» وكأن النت فاصل.
    const raw = await res.text()
    let json: Status
    try { json = JSON.parse(raw) as Status } catch {
      setAuthed(false)
      setAuthError(`الراوت رجّع ${res.status} مش JSON — ${raw.slice(0, 200) || '(رد فاضي)'}`)
      return false
    }
    if (!res.ok) { setAuthed(false); setAuthError(`${res.status} — رد غير متوقع من الراوت`); return false }
    setStatus(json); setAuthed(true); setAuthError('')
    return true
  }, [])

  // 🔓 (١٥ أغسطس ٢٠٢٦ — محمد: «الصفحة مش بتدخل») نجرّب من غير باسورد الأول —
  //    كوكي جلسة الأدمن بتتبعت لوحدها والراوت بقى بيقبلها.
  useEffect(() => { loadStatus('', true).catch(() => {}) }, [loadStatus])

  const submitPw = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try { await loadStatus(password) } catch (err) { setAuthError(`مامقدرناش نوصل للراوت: ${(err as Error)?.message || 'سبب مش معروف'}`) } finally { setBusy(false) }
  }

  const recipients = parseLines(numbers)

  const call = async (dry: boolean) => {
    setBusy(true); setError('')
    try {
      const res = await fetch('/api/admin/send', {
        method: 'POST',
        headers: { 'X-Admin-Password': safePw(password), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign_name: campaign || undefined,
          message,
          recipients: recipients.map((r) => ({ phone: r.phone, name: r.name })),
          dry_run: dry,
          skip_recent_days: skipDays,
          session: session || undefined,
        }),
      })
      const json = (await res.json()) as Preview
      if (!res.ok || json.ok === false) { setError(json.error || 'فشل'); return }
      if (dry) { setPreview(json); setDone(null) }
      else { setDone(json); setPreview(null); setNumbers(''); await loadStatus(password) }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'فشل الاتصال')
    } finally { setBusy(false) }
  }

  if (!authed) {
    return (
      <div dir="rtl" className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-6">
        <form onSubmit={submitPw} className="bg-white rounded-2xl border border-gray-200 p-6 w-full max-w-sm">
          <div className="flex items-center gap-2 mb-4">
            <Lock className="w-5 h-5 text-gray-500" />
            <h1 className="font-bold">ابعت</h1>
          </div>
          <input
            type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="كلمة سر الأدمن" autoComplete="current-password"
            className="w-full px-4 py-3 bg-[#FAFAF7] border border-gray-200 rounded-xl text-sm mb-3"
          />
          {authError && <p className="text-sm text-red-600 mb-3">{authError}</p>}
          <button type="submit" disabled={busy}
            className="w-full py-3 bg-[#059669] text-white rounded-xl text-sm font-medium disabled:opacity-50">
            {busy ? 'بيحمّل…' : 'دخول'}
          </button>
        </form>
      </div>
    )
  }

  const s = status?.safety

  return (
    <div dir="rtl" className="min-h-screen bg-[#FAFAF7] p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-xl font-bold flex items-center gap-2 mb-2">
          <Send className="w-5 h-5 text-[#059669]" /> ابعت
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          الشاشة دي <strong>مابتبعتش على طول</strong> — بتحط في الطابور، والكرون بيبعت رسالة رسالة،
          بينتظر إيصال «وصلت» قبل اللي بعدها، وبيعيد بعد ٣ دقايق لو مفيش إيصال. تقدر تتابع كل رسالة في{' '}
          <a href="/admin/sending" className="text-[#059669] underline">شاشة الإرسال</a>.
        </p>

        {/* 📤 اختيار الرقم اللي هيبعت — الليستة حية من OpenWA */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4">
          <label className="block text-sm font-bold mb-2">الرقم اللي هيبعت</label>
          <select
            value={session}
            onChange={(e) => setSession(e.target.value)}
            className="w-full px-4 py-3 bg-[#FAFAF7] border border-gray-200 rounded-xl text-sm"
          >
            <option value="">
              الافتراضي{status?.default_session ? ` — ${status.default_session}` : ''}
            </option>
            {(status?.sessions ?? []).map((x) => (
              <option key={x.session} value={x.session}>
                {x.session}{x.phone ? ` · ${x.phone}` : ''} — {x.connected ? 'متصل' : x.status}
              </option>
            ))}
          </select>
          {(status?.sessions?.length ?? 0) === 0 ? (
            <p className="text-xs text-amber-700 mt-2">
              ماقدرناش نجيب الأجهزة من OpenWA دلوقتي — هيتبعت من الرقم الافتراضي.
            </p>
          ) : (
            <p className="text-xs text-gray-500 mt-2">
              الرسايل بتتحط في الطابور بالرقم ده. سيبها «الافتراضي» عشان تمشي مع
              إعداد <code>queue_send_session</code> وتتغيّر من مكان واحد.
            </p>
          )}
        </div>

        {/* 🛡️ (١٥ أغسطس ٢٠٢٦ — محمد: «حد اليوم / الفاصل / ساعات الإرسال يبقوا ديناميك»)
            كان جدول قراءة بس، والأرقام جاية من متغيرات بيئة و**ثوابت في الكود**
            (١٠ و٢٠). وكمان السطر القديم كان بيحسب `endHour - 12` بإيده، فلو
            الساعة بقت ١١ كان هيكتب «١١ص – ١م» غلط. دلوقتي كارت واحد بيتعدّل
            ويتحفظ، ونفسه بالظبط موجود في «مين بيبعت إيه». */}
        <div className="mb-4">
          <WaSafetyCard
            password={password}
            onSaved={() => { void loadStatus(password, true) }}
          />
        </div>

        {s && (
          <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4 text-sm">
            <span className="text-gray-500 block text-xs">في الطابور دلوقتي</span>
            <span className="font-black text-gray-900">{status?.counts?.queued ?? 0}</span>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1">الأرقام — كل رقم في سطر</label>
            <p className="text-xs text-gray-500 mb-2">تقدر تكتب «الرقم,الاسم» لو عايز الاسم يتسجّل.</p>
            <textarea
              value={numbers} onChange={(e) => { setNumbers(e.target.value); setPreview(null) }}
              rows={8} dir="ltr" placeholder={'01012345678,أحمد\n01098765432'}
              className="w-full px-4 py-3 bg-[#FAFAF7] border border-gray-200 rounded-xl text-sm font-mono"
            />
            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
              <Users className="w-3 h-3" /> {recipients.length} رقم
            </p>
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">نص الرسالة</label>
            <textarea
              value={message} onChange={(e) => { setMessage(e.target.value); setPreview(null) }}
              rows={5} placeholder="اكتب الرسالة اللي هتروح لكل الأرقام…"
              className="w-full px-4 py-3 bg-[#FAFAF7] border border-gray-200 rounded-xl text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium block mb-1">اسم الحملة (اختياري)</label>
              <input
                value={campaign} onChange={(e) => setCampaign(e.target.value)}
                placeholder="مثلاً: دعوة معارض"
                className="w-full px-4 py-2.5 bg-[#FAFAF7] border border-gray-200 rounded-xl text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">متبعتش لحد كلمناه خلال</label>
              <select
                value={skipDays} onChange={(e) => { setSkipDays(Number(e.target.value)); setPreview(null) }}
                className="w-full px-4 py-2.5 bg-[#FAFAF7] border border-gray-200 rounded-xl text-sm"
              >
                <option value={0}>مفيش استبعاد</option>
                <option value={3}>٣ أيام</option>
                <option value={7}>أسبوع</option>
                <option value={30}>شهر</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{error}</div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => call(true)}
              disabled={busy || !recipients.length || !message.trim()}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium disabled:opacity-50"
            >
              <Eye className="w-4 h-4" /> {busy ? 'بيحسب…' : 'معاينة'}
            </button>
            <button
              onClick={() => call(false)}
              disabled={busy || !preview || !preview.would_queue}
              title={!preview ? 'اعمل معاينة الأول' : ''}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#059669] text-white rounded-xl text-sm font-medium disabled:opacity-50"
            >
              <Send className="w-4 h-4" /> حط في الطابور
            </button>
          </div>
        </div>

        {preview && (
          <div className="bg-white rounded-2xl border border-[#059669]/30 p-4 mt-4">
            <h2 className="font-bold text-sm mb-3 flex items-center gap-2">
              <Eye className="w-4 h-4 text-[#059669]" /> المعاينة — لسه محصلش حاجة
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
              <div><span className="text-gray-500 block text-xs">هيتحط في الطابور</span>
                <strong className="text-[#059669]">{preview.would_queue}</strong></div>
              <div><span className="text-gray-500 block text-xs">هيتستبعد</span>
                <strong>{preview.skipped_count}</strong></div>
              <div><span className="text-gray-500 block text-xs">أول رسالة</span>{when(preview.first_send)}</div>
              <div><span className="text-gray-500 block text-xs">آخر رسالة</span>{when(preview.last_send)}</div>
            </div>
            {!!preview.skipped?.length && (
              <div className="bg-[#FAFAF7] rounded-xl p-3 max-h-48 overflow-auto">
                <p className="text-xs font-medium text-gray-600 mb-2">المستبعدين:</p>
                <ul className="text-xs space-y-1">
                  {preview.skipped.map((k, i) => (
                    <li key={i} className="flex justify-between gap-2">
                      <span className="font-mono" dir="ltr">{k.phone}</span>
                      <span className="text-gray-500">{k.reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {!preview.would_queue && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mt-3 flex gap-2 text-sm text-amber-900">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                مفيش أي رقم هيتحط في الطابور — كلهم اتستبعدوا.
              </div>
            )}
          </div>
        )}

        {done && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mt-4 text-sm text-emerald-900">
            <p className="flex items-center gap-2 font-medium">
              <Check className="w-4 h-4" /> اتحط في الطابور {done.queued} رسالة
              {done.skipped_count ? ` — و${done.skipped_count} اتستبعدوا` : ''}
            </p>
            <p className="mt-1 flex items-center gap-2">
              <Clock className="w-4 h-4" /> أول واحدة {when(done.first_send)} · آخر واحدة {when(done.last_send)}
            </p>
          </div>
        )}

        {!!status?.upcoming?.length && (
          <div className="bg-white rounded-2xl border border-gray-200 p-4 mt-4">
            <h2 className="font-bold text-sm mb-3">الجاي في الطابور</h2>
            <ul className="text-sm divide-y divide-gray-100">
              {status.upcoming.map((u, i) => (
                <li key={i} className="py-2 flex justify-between gap-2">
                  <span className="font-mono text-xs" dir="ltr">{u.recipient_phone}</span>
                  <span className="text-gray-500 text-xs">{u.recipient_name || ''}</span>
                  <span className="text-xs">{when(u.scheduled_for)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
