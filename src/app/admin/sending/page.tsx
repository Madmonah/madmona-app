'use client'

// src/app/admin/sending/page.tsx
// ============================================================================
// 📡 مين بيبعت إيه — كل قنوات الإرسال في شاشة واحدة.
//
// ليه (١٤ أغسطس ٢٠٢٦ — محمد): «مش عارف مين بيبعت إيه». الإرسال كان متفرّق
// على ٤ حتت، كل واحدة بمفتاح إيقاف في مكان تاني، ومفيش مكان بيقول: إيه اللي
// اتبعت النهاردة، من أنهي رقم، ووصل ولا لأ.
// ============================================================================

import { useState, useEffect, useCallback, type FormEvent } from 'react'
import { Lock, RefreshCw, Radio, Phone, Clock, AlertTriangle } from 'lucide-react'
import { safePw } from '@/lib/adminPw'
import WaSafetyCard from '@/components/admin/WaSafetyCard'

interface Channel {
  key: string; name: string; cron: string
  enabled: boolean; note: string | null
  queued: number; sent_today: number; failed_today: number
}
interface NumberRow {
  session: string
  sent_total: number; delivered_total: number
  sent_6h: number; delivered_6h: number
  last_delivery: string | null
}
interface Waiting { phone: string; name: string | null; campaign: string | null; sent_at: string; mins: number }
interface Recent { phone: string; name: string | null; campaign: string; status: string; at: string; error: string | null }
interface Device {
  id: string; name: string; phone: string | null
  status: string; connected: boolean; used_by: string[]
}
interface Sender {
  name: string; session: string; source: string
  // 🔀 (١٥ أغسطس ٢٠٢٦) الليستة بقت تتبني من الداتابيز، فبتيجي معاها
  // «من فين الرقم ده» و«شغّال ولا مقفول» بدل ما تبقى ٣ سطور ثابتة.
  note?: string | null; active?: boolean
  device_status: string; connected: boolean; device_phone: string | null
}
interface Overview {
  generated_at: string
  channels: Channel[]; numbers: NumberRow[]
  waiting: Waiting[]; recent: Recent[]
  openwa?: { reachable: boolean; error: string | null }
  devices?: Device[]
  senders?: Sender[]
}

const STATUS_AR: Record<string, string> = {
  queued: 'في الطابور', sending: 'بيتبعت', sent: 'اتبعت (مستني إيصال)',
  delivered: 'وصلت', read: 'اتقرت', failed: 'فشلت',
}
const STATUS_COLOR: Record<string, string> = {
  delivered: 'bg-emerald-100 text-emerald-800',
  read: 'bg-emerald-100 text-emerald-800',
  sent: 'bg-amber-100 text-amber-800',
  sending: 'bg-amber-100 text-amber-800',
  queued: 'bg-blue-100 text-blue-800',
  failed: 'bg-red-100 text-red-700',
}

function pct(a: number, b: number): string {
  if (!b) return '—'
  return `${Math.round((a / b) * 100)}%`
}
function when(iso: string | null): string {
  if (!iso) return 'عمره ما سلّم'
  try {
    return new Date(iso).toLocaleString('ar-EG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  } catch { return '—' }
}

export default function SendingPage() {
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const [authError, setAuthError] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<Overview | null>(null)

  const load = useCallback(async (pw: string, silent = false) => {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/admin/sending', { headers: { 'X-Admin-Password': safePw(pw) } })
      if (res.status === 401) {
        if (!silent) setAuthError('كلمة السر غلط')
        if (pw) sessionStorage.removeItem('madmona_admin_pw')
        setAuthed(false); return
      }
      // 🐞 (١٥ أغسطس ٢٠٢٦) قبل كده أي فشل كان بيتلمّ في «مشكلة في الاتصال»
      //    من غير ما يقول إيه اللي حصل — لا كود ولا رسالة. لو الراوت رجّع
      //    صفحة خطأ HTML (٥٠٠ أو ٤٠٤ وقت الديبلوي) الـjson() بيرمي، والرسالة
      //    كانت بتوحي إن النت فاصل. دلوقتي بنقول الكود ونص الرد الحقيقي.
      const raw = await res.text()
      let j: { detail?: string; error?: string } | null = null
      try { j = JSON.parse(raw) } catch {
        setError(`الراوت رجّع ${res.status} مش JSON — ${raw.slice(0, 200) || '(رد فاضي)'}`)
        return
      }
      if (!res.ok) { setError(`${res.status} — ${j?.detail || j?.error || 'حصل خطأ'}`); return }
      setData(j as unknown as Overview)
      setAuthed(true)
      if (pw) sessionStorage.setItem('madmona_admin_pw', pw)
    } catch (e) {
      setError(`مامقدرناش نوصل للراوت: ${(e as Error)?.message || 'سبب مش معروف'}`)
    } finally { setLoading(false) }
  }, [])

  // 🔓 (١٥ أغسطس ٢٠٢٦ — محمد: «الصفحة مش بتدخل») بنجرّب نحمّل من غير باسورد
  //    الأول: إنت أصلًا داخل على /admin بجلسة، والمتصفح بيبعت الكوكي لوحده،
  //    والراوت بقى بيقبلها. صندوق الباسورد مابيظهرش غير لو ده فشل فعلًا.
  useEffect(() => {
    const stored = sessionStorage.getItem('madmona_admin_pw')
    if (stored) setPassword(stored)
    load(stored || '', true)
  }, [load])

  const onLogin = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); setAuthError(''); load(password) }

  if (!authed) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4" dir="rtl">
        <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
          <div className="flex items-center justify-center w-12 h-12 bg-[#34D399]/10 rounded-full mb-4 mx-auto">
            <Lock className="w-5 h-5 text-[#059669]" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 text-center mb-1">مين بيبعت إيه</h1>
          <p className="text-sm text-gray-500 text-center mb-6">اكتب كلمة سر الأدمن</p>
          <form onSubmit={onLogin} className="space-y-4">
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="كلمة السر" autoFocus
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#059669]"
            />
            {authError && <p className="text-sm text-red-600 text-center">{authError}</p>}
            {error && <p className="text-xs text-red-600 text-center break-words">{error}</p>}
            <button type="submit" disabled={loading || !password}
              className="w-full py-3 rounded-xl bg-[#059669] text-white text-sm font-bold disabled:opacity-50">
              {loading ? 'بيحمّل…' : 'دخول'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  const d = data
  return (
    <div className="min-h-screen bg-[#FAFAF7] p-4 md:p-6" dir="rtl">
      <div className="max-w-5xl mx-auto">
        <header className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-[#059669]" />
            <h1 className="text-xl font-black text-gray-900">مين بيبعت إيه</h1>
          </div>
          <button onClick={() => load(password)} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-gray-200 text-xs font-bold text-gray-700 disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> تحديث
          </button>
        </header>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-xs text-red-700 break-words">{error}</div>
        )}

        {/* ⓪ الأجهزة المتصلة دلوقتي — من OpenWA مباشرة */}
        <h2 className="text-sm font-black text-gray-700 mb-2">
          الأجهزة المتصلة دلوقتي
          <span className="font-normal text-gray-400 text-[11px] mr-2">حي من OpenWA، مش من الداتابيز</span>
        </h2>
        {d?.openwa && !d.openwa.reachable && (
          <div className="mb-3 p-3 rounded-xl bg-red-50 border border-red-100 text-xs text-red-700">
            ماقدرناش نوصل لـOpenWA: {d.openwa.error || 'سبب غير معروف'}
          </div>
        )}
        <div className="grid gap-2 sm:grid-cols-2 mb-4">
          {(d?.devices ?? []).map((dev) => (
            <div key={dev.id} className={`bg-white rounded-2xl border p-3 ${
              dev.connected ? 'border-emerald-200' : 'border-red-200'
            }`}>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-black text-sm text-gray-900 truncate">{dev.name}</p>
                  {dev.phone && <p className="text-[12px] text-gray-500 font-mono" dir="ltr">+{dev.phone}</p>}
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-black whitespace-nowrap ${
                  dev.connected ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'
                }`}>{dev.connected ? '🟢 متصل' : `🔴 ${dev.status}`}</span>
              </div>
              <p className="mt-1.5 text-[11px] text-gray-500">
                {dev.used_by.length > 0
                  ? <>بيبعت منه: <b className="text-gray-700">{dev.used_by.join(' · ')}</b></>
                  : 'مفيش حاجة بتبعت منه'}
              </p>
            </div>
          ))}
          {(d?.devices ?? []).length === 0 && d?.openwa?.reachable && (
            <p className="text-xs text-gray-400 col-span-2">مفيش أجهزة مربوطة على OpenWA خالص.</p>
          )}
        </div>

        {/* 🛡️ (١٥ أغسطس ٢٠٢٦ — محمد: «حد اليوم / الفاصل / ساعات الإرسال يبقوا
            ديناميك» · «الاتنين»). نفس الكارت اللي في شاشة «ابعت» بالظبط —
            مكوّن واحد وراوت واحد، فمستحيل الشاشتين يقولوا حاجتين مختلفين. */}
        <div className="mb-6">
          <WaSafetyCard password={password} onSaved={() => { void load(password, true) }} />
        </div>

        {/* 🔗 اللينك: كل مُرسِل وحالة جهازه */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6">
          <p className="font-black text-sm text-gray-900 mb-2">كل مُرسِل بيستخدم أنهي جهاز</p>
          {(d?.senders ?? []).map((sn, i) => (
            <div key={i} className="py-2 border-t border-gray-50 text-[12px]">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-gray-800">
                  {sn.name}
                  {sn.active === false && (
                    <span className="mr-1.5 px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[10px] font-black">
                      مقفول
                    </span>
                  )}
                </span>
                <span className="font-mono text-gray-500 truncate" dir="ltr">{sn.session}</span>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-black whitespace-nowrap ${
                  sn.connected ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'
                }`}>{sn.connected ? 'متصل' : sn.device_status}</span>
              </div>
              <p className="mt-0.5 text-[10px] text-gray-400">
                <span className="font-mono" dir="ltr">{sn.source}</span>
                {sn.note && <span className="text-gray-500"> · {sn.note}</span>}
              </p>
            </div>
          ))}
          {(d?.senders ?? []).length === 0 && (
            <p className="text-[12px] text-gray-400 py-2">مفيش مُرسِلين متظبطين.</p>
          )}
          <p className="mt-2 text-[11px] text-gray-500">
            لو مكتوب «مش موجود على OpenWA» يبقى المُرسِل بيحاول يبعت من جهاز مش مربوط — وكل رسايله هتفشل.
            <br />
            السطر الرمادي الصغير بيقول <b>الرقم ده جاي منين</b> — أي حاجة مكتوب جنبها
            {' '}<code className="font-mono">whatsapp_config</code> بتتغيّر من الداتابيز على طول من غير نشر.
          </p>
        </div>

        {/* ① القنوات */}
        <h2 className="text-sm font-black text-gray-700 mb-2">القنوات</h2>
        <div className="grid gap-3 sm:grid-cols-2 mb-6">
          {(d?.channels ?? []).map((c) => (
            <div key={c.key} className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <p className="font-black text-sm text-gray-900">{c.name}</p>
                  <p className="text-[11px] text-gray-400 font-mono" dir="ltr">{c.cron}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-black whitespace-nowrap ${
                  c.enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'
                }`}>{c.enabled ? '🟢 شغّال' : '🔴 مقفول'}</span>
              </div>
              <div className="flex gap-4 text-[12px]">
                <span className="text-gray-600">في الطابور: <b className="text-gray-900">{c.queued}</b></span>
                <span className="text-gray-600">اتبعت النهاردة: <b className="text-gray-900">{c.sent_today}</b></span>
                {c.failed_today > 0 && <span className="text-red-600">فشل: <b>{c.failed_today}</b></span>}
              </div>
              {c.note && (
                <p className="mt-2 text-[11px] text-amber-800 bg-amber-50 rounded-lg px-2 py-1.5 break-words">
                  {c.note}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* ② مستنيين إيصال */}
        {(d?.waiting?.length ?? 0) > 0 && (
          <div className="mb-6 bg-white rounded-2xl border border-amber-200 p-4">
            <p className="flex items-center gap-1.5 font-black text-sm text-amber-800 mb-2">
              <Clock className="w-4 h-4" /> مستنيين إيصال دلوقتي ({d?.waiting.length})
            </p>
            <p className="text-[11px] text-gray-500 mb-2">
              البوابة مش هتبعت رسالة جديدة قبل ما دول يوصلوا. بعد ٣ دقايق بتتعاد.
            </p>
            {(d?.waiting ?? []).map((w, i) => (
              <div key={i} className="flex items-center justify-between text-[12px] py-1 border-t border-gray-50">
                <span dir="ltr" className="font-mono">{w.phone}</span>
                <span className="text-gray-500">{w.campaign ?? '—'}</span>
                <span className="text-amber-700 font-bold">{w.mins} دقيقة</span>
              </div>
            ))}
          </div>
        )}

        {/* ③ الأرقام */}
        <h2 className="text-sm font-black text-gray-700 mb-2">الأرقام — مين بيسلّم فعلًا</h2>
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr className="bg-[#FAFAF7] text-[11px] font-black text-gray-500">
                  <th className="px-4 py-3">الجلسة</th>
                  <th className="px-4 py-3">صادر</th>
                  <th className="px-4 py-3">اتسلّم</th>
                  <th className="px-4 py-3">النسبة</th>
                  <th className="px-4 py-3">آخر ٦ ساعات</th>
                  <th className="px-4 py-3">آخر تسليم</th>
                </tr>
              </thead>
              <tbody>
                {(d?.numbers ?? []).map((n) => {
                  const rate = n.sent_total ? n.delivered_total / n.sent_total : 0
                  return (
                    <tr key={n.session} className="border-t border-gray-50 text-[13px]">
                      <td className="px-4 py-3 font-mono font-bold text-gray-900" dir="ltr">{n.session}</td>
                      <td className="px-4 py-3 text-gray-600">{n.sent_total}</td>
                      <td className="px-4 py-3 text-gray-600">{n.delivered_total}</td>
                      <td className={`px-4 py-3 font-black ${
                        rate >= 0.8 ? 'text-emerald-700' : rate >= 0.3 ? 'text-amber-700' : 'text-red-700'
                      }`}>{pct(n.delivered_total, n.sent_total)}</td>
                      <td className="px-4 py-3 text-gray-500 text-[12px]">
                        {n.sent_6h} / {n.delivered_6h} وصلت
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-[11px] whitespace-nowrap">{when(n.last_delivery)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="px-4 py-2.5 text-[11px] text-gray-500 bg-[#FAFAF7] border-t border-gray-100 flex items-center gap-1.5">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            نسبة تحت ٣٠٪ يعني الرقم بيقبل من الـAPI ومابيوصّلش — البوابة بتقفل الطابور لوحدها لو حصل ده.
          </p>
        </div>

        {/* ④ آخر الرسايل */}
        <h2 className="text-sm font-black text-gray-700 mb-2">آخر ٣٠ رسالة</h2>
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr className="bg-[#FAFAF7] text-[11px] font-black text-gray-500">
                  <th className="px-4 py-3">لمين</th>
                  <th className="px-4 py-3">الحملة</th>
                  <th className="px-4 py-3">الحالة</th>
                  <th className="px-4 py-3">الوقت</th>
                </tr>
              </thead>
              <tbody>
                {(d?.recent ?? []).length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-10 text-center text-sm text-gray-400">مفيش رسايل</td></tr>
                )}
                {(d?.recent ?? []).map((r, i) => (
                  <tr key={i} className="border-t border-gray-50 text-[13px]">
                    <td className="px-4 py-3">
                      <span className="font-mono text-gray-900" dir="ltr">{r.phone}</span>
                      {r.name && <span className="text-gray-400 text-[11px] mr-2">{r.name}</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-[12px]">{r.campaign}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap ${
                        STATUS_COLOR[r.status] ?? 'bg-gray-100 text-gray-600'
                      }`}>{STATUS_AR[r.status] ?? r.status}</span>
                      {r.error && <p className="text-[10px] text-red-600 mt-1 break-words max-w-[240px]">{r.error}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-[11px] whitespace-nowrap">{when(r.at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {d?.generated_at && (
          <p className="text-[11px] text-gray-400 text-center mt-4">آخر تحديث: {when(d.generated_at)}</p>
        )}
      </div>
    </div>
  )
}
