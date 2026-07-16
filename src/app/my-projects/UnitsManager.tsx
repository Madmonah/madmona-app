'use client'

import { useEffect, useState, useCallback } from 'react'
import { Grid3X3, Loader2, Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'

// =====================================================================
// 🗂️ إدارة وحدات المشروع — داشبورد المطوّر (16 Jul 2026)
// المطوّر بيحدّث الوحدات المتاحة (كود/نوع/مساحة/سعر/حالة) وبيفعّل
// «الحجز 48 ساعة عبر مضمونة» ويحدد تكلفته — والعميل بيحجز من صفحة المشروع.
// =====================================================================

type Unit = {
  id: string
  unit_code: string
  unit_type: string | null
  area_m2: number | null
  bedrooms: number | null
  price: number | null
  status: string
  held_until: string | null
  held_by_phone: string | null
}

const STATUS_AR: Record<string, string> = {
  available: '🟢 متاحة',
  held: '🟡 محجوزة 48س',
  contracted: '🔵 متعاقد عليها',
  sold: '⚫ مباعة',
  hidden: '🙈 مخفية',
}

export default function UnitsManager({
  projectId, token, bookingEnabled, bookingFee, bookingFeeNote,
  onToggleBooking,
}: {
  projectId: string
  token: string
  bookingEnabled: boolean
  bookingFee: number | null
  bookingFeeNote: string | null
  onToggleBooking: (enabled: boolean, fee: number | null, note: string | null) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [units, setUnits] = useState<Unit[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  // فورم إضافة سريعة
  const [code, setCode] = useState('')
  const [utype, setUtype] = useState('')
  const [area, setArea] = useState('')
  const [price, setPrice] = useState('')
  // إعدادات الحجز
  const [fee, setFee] = useState(bookingFee != null ? String(bookingFee) : '')
  const [feeNote, setFeeNote] = useState(bookingFeeNote || '')

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/my-projects/units?project_id=${projectId}`, {
        headers: { 'x-madmona-token': token },
      })
      const j = await r.json()
      setUnits(j.units || [])
    } catch { setUnits([]) }
  }, [projectId, token])

  useEffect(() => { if (open && units === null) load() }, [open, units, load])

  async function addUnit() {
    if (!code.trim()) { setErr('اكتب كود الوحدة'); return }
    setBusy(true); setErr('')
    try {
      const r = await fetch('/api/my-projects/units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-madmona-token': token },
        body: JSON.stringify({
          project_id: projectId,
          unit_code: code.trim(),
          unit_type: utype.trim() || null,
          area_m2: area ? Number(area) : null,
          price: price ? Number(price) : null,
          status: 'available',
        }),
      })
      if (!r.ok) throw new Error((await r.json()).error || 'فشل الحفظ')
      setCode(''); setUtype(''); setArea(''); setPrice('')
      await load()
    } catch (e) { setErr(e instanceof Error ? e.message : 'فشل الحفظ') }
    setBusy(false)
  }

  async function setStatus(u: Unit, status: string) {
    setBusy(true); setErr('')
    try {
      await fetch('/api/my-projects/units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-madmona-token': token },
        body: JSON.stringify({ project_id: projectId, unit_code: u.unit_code, status }),
      })
      await load()
    } catch { setErr('فشل التحديث') }
    setBusy(false)
  }

  async function removeUnit(u: Unit) {
    setBusy(true); setErr('')
    try {
      await fetch('/api/my-projects/units', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'x-madmona-token': token },
        body: JSON.stringify({ unit_id: u.id }),
      })
      await load()
    } catch { setErr('فشل الحذف') }
    setBusy(false)
  }

  async function saveBooking(enabled: boolean) {
    setBusy(true); setErr('')
    try {
      await onToggleBooking(enabled, fee ? Number(fee) : null, feeNote.trim() || null)
    } catch { setErr('فشل حفظ إعدادات الحجز') }
    setBusy(false)
  }

  return (
    <div className="border border-gray-100 rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-[#FAFAF7] hover:bg-gray-50"
      >
        <span className="text-xs font-black text-[#1A2E26] flex items-center gap-1.5">
          <Grid3X3 className="w-4 h-4 text-[#1F6F5F]" /> الوحدات المتاحة + الحجز ٤٨ ساعة
          {units && <span className="text-gray-400 font-normal">({units.length} وحدة)</span>}
        </span>
        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${bookingEnabled ? 'bg-[#1F6F5F]/10 text-[#1F6F5F]' : 'bg-gray-100 text-gray-400'}`}>
          {bookingEnabled ? 'الحجز مفعّل' : 'الحجز متوقف'}
        </span>
      </button>

      {open && (
        <div className="p-4 space-y-4">
          {/* ⚙️ تفعيل الحجز + التكلفة */}
          <div className="bg-[#F0F7F4] border border-[#2FA084]/20 rounded-xl p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-gray-800">
                حجز العميل للوحدة ٤٨ ساعة من صفحة المشروع
              </p>
              <button type="button" disabled={busy} onClick={() => saveBooking(!bookingEnabled)}>
                {bookingEnabled
                  ? <ToggleRight className="w-8 h-8 text-[#1F6F5F]" />
                  : <ToggleLeft className="w-8 h-8 text-gray-300" />}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number" value={fee} onChange={(e) => setFee(e.target.value)}
                placeholder="تكلفة الحجز بالجنيه (اختياري)"
                className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-medium outline-none focus:border-[#1F6F5F]"
              />
              <input
                type="text" value={feeNote} onChange={(e) => setFeeNote(e.target.value)}
                placeholder="ملاحظة (بتتخصم من المقدم مثلاً)"
                className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-medium outline-none focus:border-[#1F6F5F]"
              />
            </div>
            {bookingEnabled && (
              <button
                type="button" disabled={busy} onClick={() => saveBooking(true)}
                className="text-[11px] font-bold text-[#1F6F5F] hover:underline"
              >
                احفظ التكلفة
              </button>
            )}
          </div>

          {/* ➕ إضافة وحدة */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="كود الوحدة *"
              className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-medium outline-none focus:border-[#1F6F5F]" />
            <input value={utype} onChange={(e) => setUtype(e.target.value)} placeholder="النوع (شقة/فيلا)"
              className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-medium outline-none focus:border-[#1F6F5F]" />
            <input value={area} onChange={(e) => setArea(e.target.value)} type="number" placeholder="المساحة م²"
              className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-medium outline-none focus:border-[#1F6F5F]" />
            <input value={price} onChange={(e) => setPrice(e.target.value)} type="number" placeholder="السعر ج"
              className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-medium outline-none focus:border-[#1F6F5F]" />
            <button
              type="button" onClick={addUnit} disabled={busy}
              className="flex items-center justify-center gap-1 bg-[#1F6F5F] text-white text-xs font-bold rounded-xl py-2 disabled:opacity-60"
            >
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              ضيف
            </button>
          </div>

          {/* 📋 الوحدات */}
          {units === null ? (
            <Loader2 className="w-4 h-4 animate-spin text-[#1F6F5F] mx-auto" />
          ) : units.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-2">
              مفيش وحدات لسه — ضيف وحدات الماستر بلان المتاحة وهتظهر للعملاء فوراً
            </p>
          ) : (
            <div className="divide-y divide-gray-50 border border-gray-100 rounded-xl overflow-hidden">
              {units.map((u) => (
                <div key={u.id} className="flex items-center justify-between gap-2 px-3 py-2.5 text-xs">
                  <div className="min-w-0">
                    <span className="font-mono font-bold text-[#1F6F5F]">{u.unit_code}</span>
                    <span className="text-gray-500 mr-2">
                      {[u.unit_type, u.area_m2 ? `${u.area_m2}م²` : null, u.price ? `${Number(u.price).toLocaleString('en-US')} ج` : null].filter(Boolean).join(' · ')}
                    </span>
                    {u.status === 'held' && u.held_by_phone && (
                      <span className="block text-[10px] text-amber-600 mt-0.5">
                        محجوزة لـ {u.held_by_phone} لحد {u.held_until ? new Date(u.held_until).toLocaleString('ar-EG', { hour: 'numeric', minute: '2-digit', day: 'numeric', month: 'short' }) : ''}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <select
                      value={u.status}
                      onChange={(e) => setStatus(u, e.target.value)}
                      disabled={busy}
                      className="text-[11px] font-bold border border-gray-200 rounded-lg px-1.5 py-1 bg-white"
                    >
                      {Object.entries(STATUS_AR).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                    <button type="button" onClick={() => removeUnit(u)} disabled={busy}
                      className="w-6 h-6 rounded-lg bg-gray-50 hover:bg-red-50 flex items-center justify-center">
                      <Trash2 className="w-3 h-3 text-gray-400 hover:text-red-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {err && <p className="text-[11px] font-bold text-red-600">{err}</p>}
        </div>
      )}
    </div>
  )
}
