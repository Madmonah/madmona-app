'use client'

// ============================================================================
// 🤖 بوت واتساب البيزنس — ربط الرقم + الإعدادات + آخر الليدات (٦ سبتمبر ٢٠٢٦)
//
// محمد: «محتاجين نفعّله بحيث يرشّح منتجات البيزنس لصاحب البيزنس ويظبط ليه الليد».
//
// صاحب البيزنس بيمسح QR من واتساب رقمه → البوت بيرد على عملائه من كتالوجه
// (إعلاناته · منيوه · خدماته) وبيسجّل كل عميل كليد في CRM البيزنس + إشعار.
//
// القراءة: financeRpc (business_wa_channel_get) — p_token أوتوماتيك.
// الربط/الحالة/الفك: POST /api/business/wa-channel (بيكلّم OpenWA بمفتاح السيرفر).
// ============================================================================
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { financeRpc } from '@/lib/financeRpc'
import { safeStorage } from '@/lib/safe-storage'

type Channel = {
  session_id: string; enabled: boolean; status: string; phone: string | null
  bot_name: string | null; greeting: string | null; handoff_phone: string | null; tone: string | null
  leads_count: number; last_lead_at: string | null; linked_at: string | null
}
type Lead = { id: string; name: string | null; phone: string; tags: string[] | null; notes: string | null; at: string }
type State = 'none' | 'initializing' | 'qr' | 'ready' | 'failed' | 'disconnected' | 'stopped' | string

export default function BusinessWhatsappBotPage({ params }: { params: { supplierId: string } }) {
  const { supplierId } = params
  const [channel, setChannel] = useState<Channel | null>(null)
  const [leads, setLeads] = useState<Lead[]>([])
  const [state, setState] = useState<State>('none')
  const [qr, setQr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [form, setForm] = useState({ bot_name: '', greeting: '', handoff_phone: '', tone: '' })
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  const token = () => (typeof window !== 'undefined' ? safeStorage.get('madmona_token') : null)

  const load = useCallback(async () => {
    const { data } = await financeRpc('business_wa_channel_get', { p_supplier_id: supplierId })
    if (data?.ok) {
      const c = (data.channel as Channel | null) ?? null
      setChannel(c)
      setLeads((data.recent_leads as Lead[]) ?? [])
      if (c) setForm({ bot_name: c.bot_name ?? '', greeting: c.greeting ?? '', handoff_phone: c.handoff_phone ?? '', tone: c.tone ?? '' })
      if (c?.enabled) setState('ready')
    }
  }, [supplierId])

  const call = useCallback(async (action: 'start' | 'status' | 'unlink') => {
    const r = await fetch('/api/business/wa-channel', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ supplierId, token: token(), action }),
    }).then((x) => x.json()).catch(() => ({ ok: false, error: 'الشبكة' }))
    if (!r.ok) { setMsg(r.error || 'حصل خطأ'); return r }
    setState(r.state)
    setQr(r.state === 'qr' ? r.qr ?? null : null)
    if (r.error) setMsg(r.error)
    return r
  }, [supplierId])

  useEffect(() => { load().then(() => call('status')) }, [load, call])

  // ⏱️ وإحنا مستنيين الـQR أو الاتصال — نسأل كل ٤ ثواني
  useEffect(() => {
    if (timer.current) clearInterval(timer.current)
    if (state === 'initializing' || state === 'qr') {
      timer.current = setInterval(async () => {
        const r = await call('status')
        if (r?.state === 'ready') { setMsg('✅ اتربط — البوت بقى بيرد على عملائك'); load() }
      }, 4000)
    }
    return () => { if (timer.current) clearInterval(timer.current) }
  }, [state, call, load])

  async function start() { setBusy(true); setMsg(null); await call('start'); setBusy(false) }
  async function unlink() {
    if (!confirm('تفك ربط الرقم؟ البوت هيبطل يرد على عملائك.')) return
    setBusy(true); await call('unlink'); setQr(null); setChannel(null); setBusy(false); setMsg('اتفك الربط')
  }
  async function saveSettings() {
    setBusy(true)
    const { data } = await financeRpc('business_wa_channel_settings', {
      p_supplier_id: supplierId, p_bot_name: form.bot_name, p_greeting: form.greeting, p_handoff_phone: form.handoff_phone, p_tone: form.tone,
    })
    setBusy(false); setMsg(data?.ok ? 'اتحفظ' : (data?.error || 'مااتحفظش'))
  }

  const ready = state === 'ready'
  const base = `/admin/business-finance/${supplierId}`

  return (
    <main dir="rtl" className="mx-auto max-w-3xl p-4 space-y-5">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-[#0C2B22]">🤖 واتساب البيزنس يرد لوحده</h1>
          <p className="text-xs text-gray-500 mt-1">بيرد على عملائك من كتالوجك (إعلاناتك · منيوك · خدماتك)، وبيسجّل كل عميل كليد في CRM بتاعك.</p>
        </div>
        <Link href={base} className="text-xs font-bold text-[#059669]">← لوحة الإدارة</Link>
      </header>

      {msg && <div className="rounded-xl bg-[#F3F6F4] border border-[#E4DECE] px-3 py-2 text-sm">{msg}</div>}

      {/* ─── الربط ─── */}
      <section className="rounded-2xl border border-[#E4DECE] bg-white p-4">
        {ready ? (
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-black text-[#0C2B22]">✅ متربط: <span dir="ltr">+{channel?.phone}</span></p>
              <p className="text-xs text-gray-500 mt-1">
                الليدات: <b>{channel?.leads_count ?? 0}</b>
                {channel?.last_lead_at ? ` · آخر ليد ${new Date(channel.last_lead_at).toLocaleString('ar-EG')}` : ''}
              </p>
            </div>
            <button onClick={unlink} disabled={busy} className="text-xs font-bold text-red-600 border border-red-200 rounded-xl px-3 py-2">فك الربط</button>
          </div>
        ) : state === 'qr' && qr ? (
          <div className="text-center">
            <p className="font-black text-[#0C2B22] mb-2">امسح الكود من واتساب رقم البيزنس</p>
            <p className="text-xs text-gray-500 mb-3">واتساب ← الإعدادات ← الأجهزة المرتبطة ← ربط جهاز</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt="QR" className="mx-auto w-64 h-64 rounded-xl border border-[#E4DECE]" />
            <p className="text-[11px] text-gray-400 mt-2">الكود بيتجدد لوحده — سيب الصفحة مفتوحة لحد ما يتربط</p>
          </div>
        ) : state === 'initializing' ? (
          <p className="text-sm text-gray-600 text-center py-4">⏳ بنجهّز الجلسة… الكود هيظهر خلال ثواني</p>
        ) : (
          <div className="text-center py-2">
            {state !== 'none' && <p className="text-xs text-red-600 mb-2">الحالة: {state}</p>}
            <p className="text-sm text-gray-600 mb-3">اربط رقم واتساب البيزنس — من غير ما تغيّر رقمك ولا تنقل شريحة.</p>
            <button onClick={start} disabled={busy} className="bg-[#04352A] text-white font-black rounded-2xl px-6 py-3 text-sm disabled:opacity-50">
              {busy ? '…' : 'اربط واتساب البيزنس'}
            </button>
          </div>
        )}
      </section>

      {/* ─── الإعدادات ─── */}
      {channel && (
        <section className="rounded-2xl border border-[#E4DECE] bg-white p-4 space-y-3">
          <h2 className="font-black text-sm text-[#0C2B22]">شخصية البوت</h2>
          <label className="block text-xs text-gray-600">اسم البوت
            <input value={form.bot_name} onChange={(e) => setForm({ ...form, bot_name: e.target.value })} placeholder={`مساعد ${'البيزنس'}`}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-[16px]" />
          </label>
          <label className="block text-xs text-gray-600">أول جملة في المحادثة
            <input value={form.greeting} onChange={(e) => setForm({ ...form, greeting: e.target.value })} placeholder="أهلًا بيك في …"
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-[16px]" />
          </label>
          <label className="block text-xs text-gray-600">رقم بشري للتحويل (شكاوى · تفاوض · أي حاجة بره الكتالوج)
            <input value={form.handoff_phone} onChange={(e) => setForm({ ...form, handoff_phone: e.target.value })} placeholder="+2010… أو +9715…" dir="ltr"
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-[16px]" />
          </label>
          <label className="block text-xs text-gray-600">نبرة الكلام
            <input value={form.tone} onChange={(e) => setForm({ ...form, tone: e.target.value })} placeholder="ودود ومختصر — مصري عامية"
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-[16px]" />
          </label>
          <button onClick={saveSettings} disabled={busy} className="bg-[#059669] text-white font-black rounded-xl px-4 py-2 text-sm disabled:opacity-50">احفظ</button>
        </section>
      )}

      {/* ─── آخر الليدات ─── */}
      <section className="rounded-2xl border border-[#E4DECE] bg-white p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-black text-sm text-[#0C2B22]">آخر الليدات من الواتساب</h2>
          <Link href={`${base}/crm`} className="text-xs font-bold text-[#059669]">CRM كامل ←</Link>
        </div>
        {leads.length === 0 ? (
          <p className="text-xs text-gray-500">لسه مفيش — أول ما عميل يكلّم الرقم هيظهر هنا وهيوصلك إشعار.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {leads.map((l) => (
              <li key={l.id} className="py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-sm">{l.name || '—'} <span dir="ltr" className="text-xs text-gray-500">+{l.phone}</span></span>
                  <span className="text-[10px] text-gray-400">{new Date(l.at).toLocaleString('ar-EG')}</span>
                </div>
                {l.notes && <p className="text-xs text-gray-600 mt-1 whitespace-pre-line line-clamp-3">{l.notes}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
