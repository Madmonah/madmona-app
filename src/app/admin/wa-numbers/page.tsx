'use client'

// =====================================================================
// /admin/wa-numbers — إدارة أرقام واتساب المربوطة بالمارد
// ٢٠ يوليو ٢٠٢٦
// =====================================================================

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabase-browser'
import {
  ArrowRight, Loader2, Lock, ShieldAlert, RefreshCw,
  CheckCircle, AlertCircle, Plus, Trash2, QrCode, Smartphone,
  Settings2, Power, Globe,
} from 'lucide-react'

type Stage = 'loading' | 'unauthenticated' | 'forbidden' | 'ready'

interface WaSession {
  id: string
  label: string
  connected: boolean
  me: string | null
  waiting_for_qr: boolean
  /** قناة الخروج — جاية مخفي منها اليوزر والباسورد. '' = IP السيرفر */
  proxy?: string
}

interface NumberCfg {
  session_id: string
  label: string | null
  persona: string | null
  enabled: boolean
}

export default function WaNumbersPage() {
  const [stage, setStage] = useState<Stage>('loading')
  const [sessions, setSessions] = useState<WaSession[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [adding, setAdding] = useState(false)
  const [newPhone, setNewPhone] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [newProxy, setNewProxy] = useState('')
  const [qrFor, setQrFor] = useState<string | null>(null)
  const [flash, setFlash] = useState<{ ok: boolean; text: string } | null>(null)

  // إعداد كل رقم (سياق/تشغيل)
  const [configs, setConfigs] = useState<Record<string, NumberCfg>>({})
  const [editFor, setEditFor] = useState<string | null>(null)
  const [draftPersona, setDraftPersona] = useState('')
  const [draftEnabled, setDraftEnabled] = useState(true)
  const [savingCfg, setSavingCfg] = useState(false)
  const [draftProxy, setDraftProxy] = useState('')
  const [savingProxy, setSavingProxy] = useState(false)

  useEffect(() => { init() }, [])

  // تحديث تلقائي كل ٥ ثواني وإحنا مستنيين QR
  useEffect(() => {
    if (!qrFor) return
    const t = setInterval(load, 5000)
    return () => clearInterval(t)
  }, [qrFor])

  async function init() {
    const { data: { session } } = await supabaseBrowser.auth.getSession()
    if (!session?.user) { setStage('unauthenticated'); return }
    const { data: profRaw } = await supabaseBrowser.from('profiles').select('role').eq('id', session.user.id).maybeSingle()
    const prof = profRaw as { role?: string } | null
    if (prof?.role !== 'admin') { setStage('forbidden'); return }
    await load()
    setStage('ready')
  }

  async function load() {
    setRefreshing(true)
    try {
      const res = await fetch('/api/admin/wa-sessions')
      const data = await res.json()
      setSessions(data?.sessions ?? [])

      // إعدادات الأرقام (سياق/تشغيل) — اختيارية، مش بتوقف عرض الأرقام لو فشلت
      try {
        const cres = await fetch('/api/admin/wa-numbers/config')
        const cdata = await cres.json()
        if (cdata?.ok) {
          const map: Record<string, NumberCfg> = {}
          for (const c of (cdata.configs ?? []) as NumberCfg[]) map[c.session_id] = c
          setConfigs(map)
        }
      } catch { /* الإعدادات اختيارية للعرض */ }

      // لو الجلسة اللي مستنيين QR بتاعها اتصلت، نقفل النافذة
      if (qrFor) {
        const s = (data?.sessions ?? []).find((x: WaSession) => x.id === qrFor)
        if (s?.connected) { setQrFor(null); setFlash({ ok: true, text: `✅ ${s.label} اتربط بنجاح` }) }
      }
    } catch {
      setFlash({ ok: false, text: 'فشل الاتصال بخدمة المارد' })
    }
    setRefreshing(false)
  }

  async function addNumber() {
    const phone = newPhone.replace(/[^\d]/g, '')
    if (phone.length < 10) { setFlash({ ok: false, text: 'اكتب الرقم بصيغة 201xxxxxxxxx' }); return }
    setAdding(true)
    try {
      const res = await fetch('/api/admin/wa-sessions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ session: phone, label: newLabel || phone, proxy: newProxy.trim() }),
      })
      const data = await res.json()
      if (data?.ok) {
        setQrFor(phone)
        setNewPhone(''); setNewLabel(''); setNewProxy('')
        setFlash({ ok: true, text: 'الرقم اتضاف — امسح الـ QR من الموبايل' })
        await load()
      } else {
        setFlash({ ok: false, text: data?.error || 'فشل إضافة الرقم' })
      }
    } catch {
      setFlash({ ok: false, text: 'حصل خطأ في الاتصال' })
    }
    setAdding(false)
  }

  async function removeNumber(id: string, label: string) {
    if (!confirm(`متأكد إنك عايز تفصل «${label}»؟\n\nده هيمسح جلسة الربط، وهتحتاج تمسح QR جديد لو رجعت.`)) return
    try {
      const res = await fetch(`/api/admin/wa-sessions?session=${encodeURIComponent(id)}`, { method: 'DELETE' })
      const data = await res.json()
      setFlash(data?.ok ? { ok: true, text: `${label} اتفصل` } : { ok: false, text: data?.error || 'فشل الفصل' })
      await load()
    } catch {
      setFlash({ ok: false, text: 'حصل خطأ في الاتصال' })
    }
  }

  // ── إعداد الرقم (سياق/تشغيل) ────────────────────────────────────────
  function openEditor(id: string) {
    const c = configs[id]
    setDraftPersona(c?.persona ?? '')
    setDraftEnabled(c?.enabled ?? true)
    // القناة الحالية جاية مخفي منها اليوزر والباسورد، فماينفعش نحطها في
    // الخانة (لو المستخدم حفظ من غير ما يغيّر، هيتبعت `***` وتبوظ).
    // الخانة بتفضل فاضية = «ماتغيّرش»، والقيمة الحالية بتبان تحتها.
    setDraftProxy('')
    setEditFor(id)
  }

  /** تغيير قناة الخروج لرقم. القيمة الفاضية = رجوع لـIP السيرفر. */
  async function saveProxy(id: string, value: string) {
    setSavingProxy(true)
    try {
      const res = await fetch('/api/admin/wa-sessions', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ session: id, proxy: value }),
      })
      const data = await res.json()
      if (data?.ok) {
        setFlash({ ok: true, text: value ? 'اتظبطت القناة — الرقم بيعيد الاتصال دلوقتي' : 'الرقم رجع على IP السيرفر' })
        setDraftProxy('')
        await load()
      } else {
        setFlash({ ok: false, text: data?.error || 'فشل تغيير القناة' })
      }
    } catch {
      setFlash({ ok: false, text: 'حصل خطأ في الاتصال' })
    }
    setSavingProxy(false)
  }

  async function saveConfig() {
    if (!editFor) return
    setSavingCfg(true)
    try {
      const res = await fetch('/api/admin/wa-numbers/config', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ session_id: editFor, persona: draftPersona, enabled: draftEnabled }),
      })
      const data = await res.json()
      if (data?.ok && data.config) {
        setConfigs((m) => ({ ...m, [editFor]: data.config as NumberCfg }))
        setEditFor(null)
        setFlash({ ok: true, text: 'اتحفظ إعداد الرقم' })
      } else {
        setFlash({ ok: false, text: data?.error || 'فشل الحفظ' })
      }
    } catch {
      setFlash({ ok: false, text: 'حصل خطأ في الاتصال' })
    }
    setSavingCfg(false)
  }

  // ── حالات الدخول ──────────────────────────────────────────────────────
  if (stage === 'loading') {
    return <div className="min-h-screen grid place-items-center"><Loader2 className="w-8 h-8 animate-spin text-[#1F6F5F]" /></div>
  }
  if (stage === 'unauthenticated') {
    return (
      <div className="min-h-screen grid place-items-center px-6" dir="rtl">
        <div className="text-center"><Lock className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h1 className="text-xl font-black mb-2">محتاج تسجّل دخول</h1>
          <Link href="/auth/login" className="text-[#1F6F5F] font-bold">تسجيل الدخول ←</Link>
        </div>
      </div>
    )
  }
  if (stage === 'forbidden') {
    return (
      <div className="min-h-screen grid place-items-center px-6" dir="rtl">
        <div className="text-center"><ShieldAlert className="w-12 h-12 mx-auto mb-4 text-red-400" />
          <h1 className="text-xl font-black">الصفحة دي للأدمن بس</h1>
        </div>
      </div>
    )
  }

  // ── الصفحة ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#FAFAF7] px-4 py-8 md:px-8" dir="rtl">
      <div className="max-w-4xl mx-auto">

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-black flex items-center gap-2">
              <Smartphone className="w-7 h-7 text-[#1F6F5F]" /> أرقام المارد
            </h1>
            <p className="text-gray-500 text-sm mt-1">الأرقام المربوطة بواتساب — كل رقم بيشتغل مستقل</p>
          </div>
          <button onClick={load} disabled={refreshing}
            className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-xl font-bold text-sm hover:bg-gray-50">
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> تحديث
          </button>
        </div>

        {flash && (
          <div className={`mb-4 p-3 rounded-xl text-sm font-bold flex items-center gap-2 ${flash.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            {flash.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {flash.text}
          </div>
        )}

        {/* الأرقام */}
        <div className="space-y-3 mb-8">
          {sessions.length === 0 && (
            <div className="bg-white rounded-2xl p-8 text-center text-gray-500">مفيش أرقام مربوطة</div>
          )}
          {sessions.map((s) => {
            const cfg = configs[s.id]
            const hasPersona = !!(cfg?.persona && cfg.persona.trim())
            const disabled = cfg ? !cfg.enabled : false
            return (
            <div key={s.id} className="bg-white rounded-2xl p-5 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-4">
                <span className={`w-3 h-3 rounded-full ${s.connected ? 'bg-green-500' : 'bg-red-400'}`} />
                <div>
                  <div className="font-black flex items-center gap-2 flex-wrap">
                    {s.label}
                    {disabled && <span className="text-[11px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">المارد موقوف</span>}
                    {hasPersona && <span className="text-[11px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">سياق مخصص</span>}
                  </div>
                  <div className="text-sm text-gray-500 tabular">
                    +{s.id} · {s.connected ? 'متصل' : s.waiting_for_qr ? 'مستني مسح QR' : 'مفصول'}
                  </div>
                  <div className="text-xs mt-1 flex items-center gap-1.5" dir="ltr">
                    <Globe className={`w-3.5 h-3.5 ${s.proxy ? 'text-[#1F6F5F]' : 'text-gray-400'}`} />
                    <span className={s.proxy ? 'text-[#1F6F5F] font-bold' : 'text-gray-400'}>
                      {s.proxy || 'IP السيرفر (مشترك)'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => openEditor(s.id)}
                  className="flex items-center gap-1.5 bg-gray-100 text-gray-800 px-3 py-2 rounded-xl text-sm font-bold hover:bg-gray-200" title="سياق/تشغيل الرقم">
                  <Settings2 className="w-4 h-4" /> إعداد
                </button>
                {!s.connected && (
                  <button onClick={() => setQrFor(s.id)}
                    className="flex items-center gap-1.5 bg-[#1F6F5F] text-white px-3 py-2 rounded-xl text-sm font-bold">
                    <QrCode className="w-4 h-4" /> اربط
                  </button>
                )}
                <button onClick={() => removeNumber(s.id, s.label)}
                  className="p-2 rounded-xl text-red-500 hover:bg-red-50" title="فصل">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )})}
        </div>

        {/* إضافة رقم */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="font-black mb-4 flex items-center gap-2"><Plus className="w-5 h-5 text-[#1F6F5F]" /> إضافة رقم</h2>
          <div className="grid md:grid-cols-3 gap-3">
            <input value={newPhone} onChange={(e) => setNewPhone(e.target.value)}
              placeholder="201xxxxxxxxx" dir="ltr"
              className="border border-gray-200 rounded-xl px-4 py-3 text-sm" />
            <input value={newLabel} onChange={(e) => setNewLabel(e.target.value)}
              placeholder="الاسم (مثلاً: المبيعات)"
              className="border border-gray-200 rounded-xl px-4 py-3 text-sm" />
            <button onClick={addNumber} disabled={adding}
              className="bg-[#1F6F5F] text-white rounded-xl px-4 py-3 font-bold text-sm disabled:opacity-50">
              {adding ? 'بيضيف…' : 'ضيف واطلّع QR'}
            </button>
          </div>
          <input value={newProxy} onChange={(e) => setNewProxy(e.target.value)}
            placeholder="قناة خروج خاصة (اختياري) — socks5://user:pass@host:port" dir="ltr"
            className="w-full mt-3 border border-gray-200 rounded-xl px-4 py-3 text-sm" />
          <p className="text-xs text-gray-500 mt-3 leading-relaxed">
            الرقم لازم يكون شغال على واتساب عادي — الخدمة بتتربط كجهاز مرتبط، والرقم يفضل على الموبايل.
            <br />
            <span className="text-gray-400">
              لو سبت خانة القناة فاضية، الرقم هيطلع من IP السيرفر زي باقي الأرقام. حطّ بروكسي عشان يبقى ليه IP لوحده
              — والأفضل تحطه دلوقتي قبل الربط، عشان أول اتصال للرقم بواتساب يبقى من نفس المكان.
            </span>
          </p>
        </div>

        {/* نافذة الـ QR */}
        {qrFor && (
          <div className="fixed inset-0 bg-black/60 grid place-items-center z-50 p-4" onClick={() => setQrFor(null)}>
            <div className="bg-white rounded-3xl overflow-hidden max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="font-black">اربط +{qrFor}</h3>
                <button onClick={() => setQrFor(null)} className="text-gray-400 font-bold px-2">✕</button>
              </div>
              <iframe src={`/api/admin/wa-sessions/qr?session=${encodeURIComponent(qrFor)}`}
                className="w-full h-[460px] border-0" />
              <div className="p-4 text-center text-sm text-gray-600 border-t">
                واتساب ← الإعدادات ← الأجهزة المرتبطة ← ربط جهاز
              </div>
            </div>
          </div>
        )}

        {/* محرّر سياق/تشغيل الرقم */}
        {editFor && (
          <div className="fixed inset-0 bg-black/60 grid place-items-center z-50 p-4" onClick={() => setEditFor(null)}>
            <div className="bg-white rounded-3xl overflow-hidden max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="font-black flex items-center gap-2"><Settings2 className="w-5 h-5 text-[#1F6F5F]" /> إعداد +{editFor}</h3>
                <button onClick={() => setEditFor(null)} className="text-gray-400 font-bold px-2">✕</button>
              </div>
              <div className="p-5 space-y-4">
                <label className="flex items-center justify-between gap-3 bg-gray-50 rounded-xl p-3 cursor-pointer">
                  <span className="text-sm font-bold flex items-center gap-2"><Power className="w-4 h-4" /> المارد شغّال على الرقم ده</span>
                  <button type="button" onClick={() => setDraftEnabled((v) => !v)}
                    className={`w-12 h-7 rounded-full transition relative shrink-0 ${draftEnabled ? 'bg-green-500' : 'bg-gray-300'}`}>
                    <span className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${draftEnabled ? 'right-1' : 'left-1'}`} />
                  </button>
                </label>
                <div>
                  <label className="block text-sm font-bold mb-1">سياق/شخصية الرقم <span className="text-gray-400 font-normal">(اختياري)</span></label>
                  <p className="text-xs text-gray-500 mb-2">
                    بيتضاف لبرومبت المارد على الرقم ده بس — مثلاً «الرقم ده للعقارات، ركّز على المطوّرين» أو نبرة مختلفة.
                    القواعد الأساسية بتفضل زي ما هي.
                  </p>
                  <textarea value={draftPersona} onChange={(e) => setDraftPersona(e.target.value)} rows={6}
                    placeholder="اكتب سياق أو تعليمات خاصة بالرقم ده…"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-y" dir="rtl" />
                </div>

                {/* ── قناة الخروج ───────────────────────────────────── */}
                <div className="border-t pt-4">
                  <label className="block text-sm font-bold mb-1 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-[#1F6F5F]" /> قناة الخروج (الـIP)
                  </label>
                  <p className="text-xs text-gray-500 mb-2 leading-relaxed">
                    الحالي: <span className="font-bold" dir="ltr">{sessions.find((s) => s.id === editFor)?.proxy || 'IP السيرفر (مشترك مع باقي الأرقام)'}</span>
                    <br />
                    اكتب قناة جديدة عشان الرقم ده يطلع من IP لوحده. سيبها فاضية = ماتغيّرش حاجة.
                  </p>
                  <input value={draftProxy} onChange={(e) => setDraftProxy(e.target.value)}
                    placeholder="socks5://user:pass@host:port · http://… · bind://203.0.113.7" dir="ltr"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm" />
                  <div className="flex items-center gap-2 mt-2">
                    <button onClick={() => editFor && saveProxy(editFor, draftProxy.trim())}
                      disabled={savingProxy || !draftProxy.trim()}
                      className="bg-[#1F6F5F] text-white px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-40">
                      {savingProxy ? 'بيظبط…' : 'ظبّط القناة'}
                    </button>
                    {!!sessions.find((s) => s.id === editFor)?.proxy && (
                      <button onClick={() => editFor && saveProxy(editFor, '')} disabled={savingProxy}
                        className="px-4 py-2 rounded-xl text-sm font-bold text-red-600 hover:bg-red-50 disabled:opacity-40">
                        شيل القناة
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-amber-700 bg-amber-50 rounded-lg p-2 mt-2 leading-relaxed">
                    ⚠️ تغيير القناة بيعيد اتصال الرقم ده بس (تانية-اتنين) — مش بيمسح الربط ومش هيطلب QR تاني.
                    <br />
                    وخلي بالك: IP داتا سنتر منفصل بيعمل <b>عزل</b> (رقم يتحظر مايجرّش الباقي)، مش <b>تمويه</b>.
                    اللي بيقلل الحظر نفسه هو بروكسي موبايل/ريزيدنشال مصري.
                  </p>
                </div>
              </div>
              <div className="p-4 border-t flex justify-end gap-2">
                <button onClick={() => setEditFor(null)} className="px-4 py-2 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-100">إلغاء</button>
                <button onClick={saveConfig} disabled={savingCfg}
                  className="bg-[#1F6F5F] text-white px-5 py-2 rounded-xl text-sm font-bold disabled:opacity-50">
                  {savingCfg ? 'بيحفظ…' : 'حفظ'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 text-center">
          <Link href="/admin" className="text-[#1F6F5F] font-bold text-sm inline-flex items-center gap-1">
            رجوع للأدمن <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
