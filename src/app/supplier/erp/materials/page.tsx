'use client'
// ============================================================================
// 📦 /supplier/erp/materials — الخامات
// (٢٨ أغسطس ٢٠٢٦) موديول المصنع. بيحسب اللي محتاج إعادة طلب أوتوماتيك.
// ============================================================================
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { resolveBusiness, type Business } from '@/lib/business-access'
import { Loader2, Plus, Boxes, ArrowRight, X, AlertTriangle } from 'lucide-react'

type Mat = {
  id: string; name: string; sku: string | null; unit: string | null
  qty_on_hand: number; reorder_level: number | null; unit_cost: number | null
  supplier_name: string | null; notes: string | null
}

export default function MaterialsPage() {
  const [biz, setBiz] = useState<Business | null>(null)
  const [rows, setRows] = useState<Mat[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<Partial<Mat> | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async (sid: string) => {
    const { data } = await (supabaseBrowser as unknown as {
      from: (t: string) => { select: (c: string) => { eq: (a: string, b: unknown) => { order: (c: string) => Promise<{ data: unknown }> } } }
    }).from('mfg_materials').select('*').eq('supplier_id', sid).order('name')
    setRows((data as Mat[]) || [])
  }, [])

  useEffect(() => {
    (async () => {
      const acc = await resolveBusiness()
      if (!acc.business) { setLoading(false); return }
      setBiz(acc.business); await load(acc.business.id); setLoading(false)
    })()
  }, [load])

  async function save() {
    if (!biz || !form?.name?.trim()) { alert('اكتب اسم الخامة'); return }
    setSaving(true)
    const payload = {
      supplier_id: biz.id, name: form.name.trim(), sku: form.sku || null,
      unit: form.unit || 'قطعة', qty_on_hand: Number(form.qty_on_hand) || 0,
      reorder_level: Number(form.reorder_level) || 0, unit_cost: Number(form.unit_cost) || 0,
      supplier_name: form.supplier_name || null, notes: form.notes || null,
    }
    const db = supabaseBrowser as unknown as {
      from: (t: string) => {
        insert: (v: unknown) => Promise<{ error: { message: string } | null }>
        update: (v: unknown) => { eq: (a: string, b: unknown) => Promise<{ error: { message: string } | null }> }
      }
    }
    const { error } = form.id
      ? await db.from('mfg_materials').update(payload).eq('id', form.id)
      : await db.from('mfg_materials').insert(payload)
    setSaving(false)
    if (error) { alert(error.message); return }
    setForm(null); await load(biz.id)
  }

  if (loading) return <div className="py-24 text-center"><Loader2 className="w-7 h-7 animate-spin mx-auto text-gray-400" /></div>
  if (!biz) return (
    <div className="max-w-md mx-auto py-20 px-4 text-center" dir="rtl">
      <h1 className="font-black text-lg mb-2">الصفحة دي للموردين</h1>
      <Link href="/marketplace" className="text-[#059669] font-bold text-sm">ارجع للماركت بليس</Link>
    </div>
  )

  // 🔔 اللي وصل حد إعادة الطلب
  const low = rows.filter((r) => Number(r.reorder_level) > 0 && Number(r.qty_on_hand) <= Number(r.reorder_level))

  return (
    <div className="max-w-4xl mx-auto p-4 pb-24" dir="rtl">
      <div className="flex items-center justify-between mb-3 gap-2">
        <div>
          <Link href="/supplier/erp" className="text-[11px] text-gray-500 font-bold flex items-center gap-1 mb-1">
            <ArrowRight className="w-3 h-3" /> نظام الإدارة
          </Link>
          <h1 className="text-lg font-black text-gray-900 flex items-center gap-2">
            <Boxes className="w-5 h-5 text-[#059669]" /> الخامات
          </h1>
        </div>
        <button onClick={() => setForm({ unit: 'قطعة', qty_on_hand: 0 })}
          className="px-3 py-2 rounded-xl bg-[#34D399] text-[#04352A] text-sm font-black flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> خامة جديدة
        </button>
      </div>

      {low.length > 0 && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3 mb-3">
          <p className="text-xs font-black text-amber-900 flex items-center gap-1.5 mb-1">
            <AlertTriangle className="w-3.5 h-3.5" /> {low.length} خامة محتاجة طلب
          </p>
          <p className="text-[11px] text-amber-900">{low.map((r) => r.name).join(' · ')}</p>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 p-10 text-center">
          <Boxes className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-gray-600">مفيش خامات مسجّلة</p>
          <p className="text-[11px] text-gray-400 mt-1">سجّل خاماتك عشان النظام ينبّهك لما تقرب تخلص.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
          <table className="w-full text-xs">
            <thead className="bg-[#F5F4F0] text-gray-600">
              <tr>
                <Th>الخامة</Th><Th>المتاح</Th><Th>حد الطلب</Th><Th>سعر الوحدة</Th><Th>المورد</Th><Th></Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const isLow = Number(r.reorder_level) > 0 && Number(r.qty_on_hand) <= Number(r.reorder_level)
                return (
                  <tr key={r.id} className={`border-t border-gray-100 ${isLow ? 'bg-amber-50/50' : ''}`}>
                    <td className="px-2.5 py-2.5">
                      <p className="font-bold text-gray-900">{r.name}</p>
                      {r.sku && <p className="text-[10.5px] text-gray-400">{r.sku}</p>}
                    </td>
                    <td className="px-2.5 py-2.5 tabular font-bold">
                      <span className={isLow ? 'text-amber-700' : ''}>
                        {Number(r.qty_on_hand).toLocaleString('ar-EG')}
                      </span>
                      <span className="text-gray-400 text-[10.5px]"> {r.unit}</span>
                    </td>
                    <td className="px-2.5 py-2.5 tabular text-gray-500">{Number(r.reorder_level || 0).toLocaleString('ar-EG')}</td>
                    <td className="px-2.5 py-2.5 tabular text-gray-600">{Number(r.unit_cost || 0).toLocaleString('ar-EG')}</td>
                    <td className="px-2.5 py-2.5 text-gray-500">{r.supplier_name || '—'}</td>
                    <td className="px-2.5 py-2.5">
                      <button onClick={() => setForm(r)} className="text-[11px] font-bold text-[#059669]">تعديل</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {form && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-3" onClick={() => setForm(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-4 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-black text-base">{form.id ? 'تعديل خامة' : 'خامة جديدة'}</h2>
              <button onClick={() => setForm(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <F label="الاسم *"><input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} className={INP} /></F>
            <div className="grid grid-cols-2 gap-2">
              <F label="الكمية المتاحة"><input type="number" value={form.qty_on_hand ?? 0} onChange={(e) => setForm({ ...form, qty_on_hand: Number(e.target.value) })} className={INP} /></F>
              <F label="الوحدة"><input value={form.unit || ''} onChange={(e) => setForm({ ...form, unit: e.target.value })} className={INP} placeholder="متر · كيلو · قطعة" /></F>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <F label="حد إعادة الطلب"><input type="number" value={form.reorder_level ?? 0} onChange={(e) => setForm({ ...form, reorder_level: Number(e.target.value) })} className={INP} /></F>
              <F label="سعر الوحدة"><input type="number" value={form.unit_cost ?? 0} onChange={(e) => setForm({ ...form, unit_cost: Number(e.target.value) })} className={INP} /></F>
            </div>
            <F label="المورد"><input value={form.supplier_name || ''} onChange={(e) => setForm({ ...form, supplier_name: e.target.value })} className={INP} /></F>
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
function Th({ children }: { children?: React.ReactNode }) {
  return <th className="px-2.5 py-2 text-right font-bold whitespace-nowrap">{children}</th>
}
function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="mb-2.5"><label className="block text-[11px] font-bold text-gray-600 mb-1">{label}</label>{children}</div>
}
