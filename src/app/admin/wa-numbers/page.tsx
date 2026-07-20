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
} from 'lucide-react'

type Stage = 'loading' | 'unauthenticated' | 'forbidden' | 'ready'

interface WaSession {
  id: string
  label: string
  connected: boolean
  me: string | null
  waiting_for_qr: boolean
}

export default function WaNumbersPage() {
  const [stage, setStage] = useState<Stage>('loading')
  const [sessions, setSessions] = useState<WaSession[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [adding, setAdding] = useState(false)
  const [newPhone, setNewPhone] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [qrFor, setQrFor] = useState<string | null>(null)
  const [flash, setFlash] = useState<{ ok: boolean; text: string } | null>(null)

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
        body: JSON.stringify({ session: phone, label: newLabel || phone }),
      })
      const data = await res.json()
      if (data?.ok) {
        setQrFor(phone)
        setNewPhone(''); setNewLabel('')
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
          {sessions.map((s) => (
            <div key={s.id} className="bg-white rounded-2xl p-5 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-4">
                <span className={`w-3 h-3 rounded-full ${s.connected ? 'bg-green-500' : 'bg-red-400'}`} />
                <div>
                  <div className="font-black">{s.label}</div>
                  <div className="text-sm text-gray-500 tabular">
                    +{s.id} · {s.connected ? 'متصل' : s.waiting_for_qr ? 'مستني مسح QR' : 'مفصول'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
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
          ))}
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
          <p className="text-xs text-gray-500 mt-3">
            الرقم لازم يكون شغال على واتساب عادي — الخدمة بتتربط كجهاز مرتبط، والرقم يفضل على الموبايل.
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

        <div className="mt-8 text-center">
          <Link href="/admin" className="text-[#1F6F5F] font-bold text-sm inline-flex items-center gap-1">
            رجوع للأدمن <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
