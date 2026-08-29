'use client'
// ============================================================================
// 🏭 /supplier/erp/production — أوامر التشغيل
// (٢٨ أغسطس ٢٠٢٦) موديول المصنع — محمد: «تيكوود نشاطه مصنع».
// ============================================================================
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { resolveBusiness, type Business } from '@/lib/business-access'
import { Loader2, Plus, Factory, ArrowRight, X, Calendar, User } from 'lucide-react'

type PO = {
  id: string; order_number: string; product_name: string
  quantity: number; unit: string | null; status: string; priority: string | null
  start_date: string | null; due_date: string | null
  materials_cost: number | null; labor_cost: number | null; notes: string | null
}

const STATUS: Record<string, { label: string; bg: string; fg: string }> = {
  planned:     { label: 'مخطط',   bg: '#F1EEE6', fg: '#6B7280' },
  in_progress: { label: 'شغال',   bg: '#34D39922', fg: '#059669' },
  paused:      { label: 'متوقف',  bg: '#FEF3C7', fg: '#B45309' },
  done:        { label: 'خلص',    bg: '#DCFCE7', fg: '#15803D' },
  cancelled:   { label: 'ملغي',   bg: '#FEE2E2', fg: '#B91C1C' },
}
const PRIORITY: Record<string, string> = { low: 'عادي', normal: 'عادي', high: 'مهم', urgent: '🔴 عاجل' }

export default function ProductionPage() {
  const [biz, setBiz] = useState<Business | null>(null)
  const [rows, setRows] = useState<PO[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('active')
  const [form, setForm] = useState<Partial<PO> | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async (supplierId: string) => {
    const q = (supabaseBrowser as unknown as {
      from: (t: string) => { select: (c: string) => { eq: (a: string, b: unknown) => { order: (c: string, o: unknown) => Promise<{ data: unknown }> } } }
    }).from('mfg_production_orders').select('*').eq('supplier_id', supplierId)
      .order('created_at', { ascending: false })
    const { data } = await q
    setRows((data as PO[]) || [])
  }, [])

  useEffect(() => {
    (async () => {
      const acc = await resolveBusiness()
      if (!acc.business) { setLoading(false); return }
      setBiz(acc.business)
      await load(acc.business.id)
      setLoading(false)
    })()
  }, [load])

  async function save() {
    if (!biz || !form?.product_name?.trim()) { alert('اكتب اسم المنتج'); return }
    setSaving(true)
    const payload = {
      supplier_id: biz.id,
      order_number: form.order_number?.trim() || `PO-${Date.now().toString().slice(-6)}`,
      product_name: form.product_name.trim(),
      quantity: Number(form.quantity) || 1,
      unit: form.unit || 'قطعة',
      status: form.status || 'planned',
      priority: form.priority || 'normal',
      due_date: form.due_date || null,
      notes: form.notes || null,
    }
    const db = supabaseBrowser as unknown as {
      from: (t: string) => {
        insert: (v: unknown) => Promise<{ error: { message: string } | null }>
        update: (v: unknown) => { eq: (a: string, b: unknown) => Promise<{ error: { message: string } | null }> }
      }
    }
    const { error } = form.id
      ? await db.from('mfg_production_orders').update(payload).eq('id', form.id)
      : await db.from('mfg_production_orders').insert(payload)
    setSaving(false)
    if (error) { alert(error.message); return }
    setForm(null)
    await load(biz.id)
  }

  async function setStatus(id: string, status: string) {
    const db = supabaseBrowser as unknown as {
      from: (t: string) => { update: (v: unknown) => { eq: (a: string, b: unknown) => Promise<unknown> } }
    }
    await db.from('mfg_production_orders').update({
      status, ...(status === 'done' ? { completed_at: new Date().toISOString() } : {}),
    }).eq('id', id)
    if (biz) await load(biz.id)
  }

  if (loading) return <div className="py-24 text-center"><Loader2 className="w-7 h-7 animate-spin mx-auto text-gray-400" /></div>
  if (!biz) return <Denied />

  const shown = rows.filter((r) =>
    filter === 'all' ? true
    : filter === 'active' ? ['planned', 'in_progress', 'paused'].includes(r.status)
    : r.status === filter)

  return (
    <div className="max-w-4xl mx-auto p-4 pb-24" dir="rtl">
      <div className="flex items-center justify-between mb-3 gap-2">
        <div>
          <Link href="/supplier/erp" className="text-[11px] text-gray-500 font-bold flex items-center gap-1 mb-1">
            <ArrowRight className="w-3 h-3" /> نظام الإدارة
          </Link>
          <h1 className="text-lg font-black text-gray-900 flex items-center gap-2">
            <Factory className="w-5 h-5 text-[#059669]" /> أوامر التشغيل
          </h1>
        </div>
        <button onClick={() => setForm({ quantity: 1, unit: 'قطعة', status: 'planned', priority: 'normal' })}
          className="px-3 py-2 rounded-xl bg-[#34D399] text-[#04352A] text-sm font-black flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> أمر جديد
        </button>
      </div>

      <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
        {[['active', 'الشغال'], ['done', 'اللي خلص'], ['all', 'الكل']].map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${
              filter === k ? 'bg-[#04352A] text-white' : 'bg-[#F1EEE6] text-gray-600'}`}>
            {l}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 p-10 text-center">
          <Factory className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-gray-600">مفيش أوامر تشغيل</p>
          <p className="text-[11px] text-gray-400 mt-1">ابدأ بأول أمر تشغيل لمنتج.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {shown.map((r) => {
            const st = STATUS[r.status] || STATUS.planned
            return (
              <div key={r.id} className="rounded-2xl border border-gray-200 bg-white p-3.5">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="font-black text-sm text-gray-900">{r.product_name}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {r.order_number} · {Number(r.quantity).toLocaleString('ar-EG')} {r.unit}
                      {r.priority === 'urgent' && <span className="text-red-600 font-black"> · {PRIORITY.urgent}</span>}
                    </p>
                  </div>
                  <span className="text-[10.5px] font-black px-2 py-1 rounded-full shrink-0"
                    style={{ background: st.bg, color: st.fg }}>{st.label}</span>
                </div>
                {r.due_date && (
                  <p className="text-[11px] text-gray-500 flex items-center gap-1 mb-2">
                    <Calendar className="w-3 h-3" /> التسليم: {r.due_date}
                  </p>
                )}
                <div className="flex gap-1.5 flex-wrap">
                  {r.status !== 'in_progress' && r.status !== 'done' && (
                    <Act onClick={() => setStatus(r.id, 'in_progress')}>ابدأ</Act>
                  )}
                  {r.status === 'in_progress' && <Act onClick={() => setStatus(r.id, 'paused')}>وقّف</Act>}
                  {r.status !== 'done' && <Act onClick={() => setStatus(r.id, 'done')} primary>خلص ✓</Act>}
                  <Act onClick={() => setForm(r)}>تعديل</Act>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {form && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-3"
          onClick={() => setForm(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-4 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-black text-base">{form.id ? 'تعديل الأمر' : 'أمر تشغيل جديد'}</h2>
              <button onClick={() => setForm(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <F label="المنتج *"><input value={form.product_name || ''} onChange={(e) => setForm({ ...form, product_name: e.target.value })} className={INP} /></F>
            <div className="grid grid-cols-2 gap-2">
              <F label="الكمية"><input type="number" value={form.quantity ?? 1} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} className={INP} /></F>
              <F label="الوحدة"><input value={form.unit || ''} onChange={(e) => setForm({ ...form, unit: e.target.value })} className={INP} placeholder="قطعة" /></F>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <F label="الأولوية">
                <select value={form.priority || 'normal'} onChange={(e) => setForm({ ...form, priority: e.target.value })} className={INP}>
                  <option value="normal">عادي</option><option value="high">مهم</option><option value="urgent">عاجل</option>
                </select>
              </F>
              <F label="تاريخ التسليم"><input type="date" value={form.due_date || ''} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className={INP} /></F>
            </div>
            <F label="ملاحظات"><textarea value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={INP} rows={2} /></F>
            <button onClick={save} disabled={saving}
              className="w-full mt-2 py-3 rounded-xl bg-[#34D399] text-[#04352A] font-black text-sm disabled:opacity-50">
              {saving ? 'بيحفظ…' : 'حفظ'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const INP = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm'
function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="mb-2.5"><label className="block text-[11px] font-bold text-gray-600 mb-1">{label}</label>{children}</div>
}
function Act({ children, onClick, primary }: { children: React.ReactNode; onClick: () => void; primary?: boolean }) {
  return (
    <button onClick={onClick}
      className={`px-2.5 py-1.5 rounded-lg text-[11.5px] font-bold ${
        primary ? 'bg-[#34D399] text-[#04352A]' : 'bg-[#F1EEE6] text-gray-700'}`}>
      {children}
    </button>
  )
}
function Denied() {
  return (
    <div className="max-w-md mx-auto py-20 px-4 text-center" dir="rtl">
      <h1 className="font-black text-lg mb-2">الصفحة دي للموردين</h1>
      <Link href="/marketplace" className="text-[#059669] font-bold text-sm">ارجع للماركت بليس</Link>
    </div>
  )
}
