'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import {
  ChevronLeft, Loader2, RefreshCw, ShoppingCart, Plus, X, Package,
  CheckCircle2, Truck, Filter, Trash2,
} from 'lucide-react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

const STATUSES = [
  { value: null, label: 'الكل' },
  { value: 'pending', label: 'معلق' },
  { value: 'ordered', label: 'مطلوب' },
  { value: 'received', label: 'وصلت' },
  { value: 'cancelled', label: 'ملغي' },
]

export default function PurchaseOrdersPage({ params }: { params: { supplierId: string } }) {
  const { supplierId } = params
  const [supplier, setSupplier] = useState<any>(null)
  const [branches, setBranches] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [data, setData] = useState<any>(null)
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)

  async function load() {
    setLoading(true)
    // @ts-expect-error
    const { data: s } = await supabase.from('suppliers').select('business_name').eq('id', supplierId).single()
    setSupplier(s)
    // @ts-expect-error
    const { data: br } = await supabase.from('supplier_branches').select('id, name, code').eq('supplier_id', supplierId).order('code')
    setBranches(br || [])
    // @ts-expect-error
    const { data: pr } = await supabase.from('inventory_products').select('id, name_ar, current_stock, unit_cost_egp').eq('supplier_id', supplierId).order('name_ar')
    setProducts(pr || [])
    // @ts-expect-error
    const { data: list } = await supabase.rpc('admin_list_purchase_orders', { p_supplier_id: supplierId, p_status: statusFilter })
    setData(list)
    setLoading(false)
  }

  async function receive(poId: string) {
    if (!confirm('متأكد إن البضاعة وصلت؟ هـ يتم إضافتها للمخزون.')) return
    // @ts-expect-error
    await supabase.rpc('admin_receive_purchase_order', { p_po_id: poId })
    load()
  }

  useEffect(() => { load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [supplierId, statusFilter])

  if (!supplier) return <Loader />

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link href={`/admin/business-finance/${supplierId}`} className="text-xs font-bold text-[#6B7280] hover:text-[#1F6F5F] flex items-center gap-1 mb-2">
            <ChevronLeft className="w-3.5 h-3.5" /> رجوع
          </Link>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#1F6F5F] mb-1">B2B PARTNER · PURCHASE ORDERS</p>
              <h1 className="text-2xl md:text-3xl font-black text-[#1A2E26]">طلبات الشراء · {supplier?.business_name}</h1>
              {data?.stats && (
                <p className="text-sm text-[#6B7280] mt-1">
                  {data.stats.total_orders} طلب · {data.stats.pending_count} معلق · إجمالي {Number(data.stats.total_spent).toLocaleString()} ج
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowAdd(true)} className="px-4 py-2 rounded-xl bg-[#1F6F5F] text-white text-sm font-bold flex items-center gap-2">
                <Plus className="w-4 h-4" /> طلب جديد
              </button>
              <button onClick={load} className="p-2 rounded-xl bg-[#FAFAF7]"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-5">
        <section className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex gap-2 flex-wrap items-center">
            <Filter className="w-3.5 h-3.5 text-[#6B7280]" />
            {STATUSES.map(s => (
              <button key={s.value || 'all'} onClick={() => setStatusFilter(s.value)} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                statusFilter === s.value ? 'bg-[#1F6F5F] text-white' : 'bg-[#FAFAF7] text-[#1A2E26]'
              }`}>{s.label}</button>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="divide-y divide-gray-100">
            {loading ? (
              <div className="py-12 text-center"><Loader2 className="w-6 h-6 text-[#1F6F5F] animate-spin inline" /></div>
            ) : data?.orders?.length === 0 ? (
              <div className="py-12 text-center">
                <ShoppingCart className="w-10 h-10 text-[#6B7280] opacity-30 mx-auto mb-2" />
                <p className="text-sm font-bold text-[#1A2E26]">مفيش طلبات شراء</p>
                <button onClick={() => setShowAdd(true)} className="mt-3 px-4 py-2 rounded-xl bg-[#1F6F5F] text-white text-sm font-bold">أنشئ أول طلب</button>
              </div>
            ) : (data?.orders || []).map((po: any) => (
              <div key={po.id} className="px-4 py-3 grid grid-cols-12 gap-3 items-center text-sm">
                <div className="col-span-3">
                  <p className="font-bold text-[#1A2E26]">{po.vendor_name}</p>
                  <p className="text-[10px] text-[#6B7280] font-mono">{po.po_number}</p>
                </div>
                <div className="col-span-2 text-xs text-[#6B7280]">{po.ordered_at?.slice(0, 10)}</div>
                <div className="col-span-2 text-center">
                  <p className="font-mono font-black">{Number(po.total_egp).toLocaleString()} ج</p>
                  <p className="text-[10px] text-[#6B7280]">{po.items_count} صنف</p>
                </div>
                <div className="col-span-2"><POStatusBadge status={po.status} /></div>
                <div className="col-span-3 text-left">
                  {po.status === 'pending' || po.status === 'ordered' ? (
                    <button onClick={() => receive(po.id)} className="px-3 py-1.5 rounded-lg bg-[#1F6F5F] text-white text-xs font-bold inline-flex items-center gap-1">
                      <Truck className="w-3 h-3" /> سجل وصول
                    </button>
                  ) : po.status === 'received' ? (
                    <span className="text-[10px] text-[#1F6F5F] font-bold flex items-center justify-end gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> وصلت {po.received_at?.slice(0, 10)}
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {showAdd && (
        <CreatePOModal supplierId={supplierId} branches={branches} products={products} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load() }} />
      )}
    </div>
  )
}

function CreatePOModal({ supplierId, branches, products, onClose, onSaved }: any) {
  const [vendor, setVendor] = useState('')
  const [phone, setPhone] = useState('')
  const [branchId, setBranchId] = useState(branches[0]?.id || '')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<any[]>([])
  const [saving, setSaving] = useState(false)

  function addItem() {
    setItems([...items, { product_id: '', quantity: '1', unit_cost_egp: '' }])
  }

  function updateItem(i: number, patch: any) {
    setItems(items.map((it, idx) => idx === i ? { ...it, ...patch } : it))
  }

  function removeItem(i: number) {
    setItems(items.filter((_, idx) => idx !== i))
  }

  async function save() {
    if (!vendor || items.length === 0) return alert('اكمل البيانات')
    setSaving(true)
    // @ts-expect-error
    const { data, error } = await supabase.rpc('admin_create_purchase_order', {
      p_supplier_id: supplierId,
      p_branch_id: branchId,
      p_vendor_name: vendor,
      p_vendor_phone: phone || null,
      p_items: items.map(it => ({
        product_id: it.product_id,
        quantity: parseFloat(it.quantity) || 0,
        unit_cost_egp: parseFloat(it.unit_cost_egp) || 0,
      })),
      p_notes: notes || null,
    })
    if (error) alert(error.message)
    else onSaved()
    setSaving(false)
  }

  const total = items.reduce((s, it) => s + (parseFloat(it.quantity) || 0) * (parseFloat(it.unit_cost_egp) || 0), 0)

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" dir="rtl">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl md:rounded-3xl w-full md:max-w-2xl md:mx-4 max-h-[90vh] flex flex-col shadow-2xl">
        <header className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-black text-[#1A2E26]">طلب شراء جديد</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-[#6B7280]" /></button>
        </header>
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="اسم المورد *">
              <input type="text" value={vendor} onChange={e => setVendor(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm" />
            </Field>
            <Field label="موبايل المورد">
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm font-mono" />
            </Field>
          </div>
          <Field label="الفرع المستلم">
            <select value={branchId} onChange={e => setBranchId(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm">
              {branches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </Field>

          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-bold tracking-wider uppercase text-[#6B7280]">المنتجات</label>
              <button onClick={addItem} className="text-xs font-bold text-[#1F6F5F] flex items-center gap-1"><Plus className="w-3 h-3" /> اضف منتج</button>
            </div>
            <div className="space-y-2">
              {items.map((it, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <select value={it.product_id} onChange={e => {
                    const p = products.find((x: any) => x.id === e.target.value)
                    updateItem(i, { product_id: e.target.value, unit_cost_egp: p?.unit_cost_egp || '' })
                  }} className="col-span-6 px-2 py-1.5 rounded-lg bg-[#FAFAF7] text-xs">
                    <option value="">اختار منتج...</option>
                    {products.map((p: any) => <option key={p.id} value={p.id}>{p.name_ar} (متاح: {p.current_stock})</option>)}
                  </select>
                  <input type="number" placeholder="كمية" value={it.quantity} onChange={e => updateItem(i, { quantity: e.target.value })} className="col-span-2 px-2 py-1.5 rounded-lg bg-[#FAFAF7] text-xs font-mono" />
                  <input type="number" placeholder="سعر" value={it.unit_cost_egp} onChange={e => updateItem(i, { unit_cost_egp: e.target.value })} className="col-span-3 px-2 py-1.5 rounded-lg bg-[#FAFAF7] text-xs font-mono" />
                  <button onClick={() => removeItem(i)} className="col-span-1 text-red-600"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          </div>

          {total > 0 && (
            <div className="rounded-xl bg-[#1F6F5F]/5 border border-[#1F6F5F]/20 p-3 flex justify-between font-bold">
              <span>الإجمالي:</span>
              <span className="font-mono font-black text-[#1F6F5F]">{total.toLocaleString()} ج</span>
            </div>
          )}

          <Field label="ملاحظات">
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm" />
          </Field>
        </div>
        <footer className="px-5 py-3 border-t border-gray-100">
          <button onClick={save} disabled={saving || items.length === 0} className="w-full py-3 rounded-xl bg-[#1F6F5F] text-white font-black text-sm disabled:opacity-50">
            {saving ? 'جاري الحفظ...' : 'احفظ الطلب'}
          </button>
        </footer>
      </div>
    </div>
  )
}

function POStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: 'معلق', cls: 'bg-amber-50 text-amber-700' },
    ordered: { label: 'مطلوب', cls: 'bg-blue-50 text-blue-700' },
    received: { label: 'وصلت ✓', cls: 'bg-[#1F6F5F]/10 text-[#1F6F5F]' },
    cancelled: { label: 'ملغي', cls: 'bg-red-50 text-red-600' },
  }
  const s = map[status] || { label: status, cls: 'bg-gray-100 text-gray-700' }
  return <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${s.cls}`}>{s.label}</span>
}

function Field({ label, children }: any) {
  return <div><label className="text-[10px] font-bold tracking-wider uppercase text-[#6B7280] mb-1.5 block">{label}</label>{children}</div>
}

function Loader() {
  return <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl"><Loader2 className="w-8 h-8 text-[#1F6F5F] animate-spin" /></div>
}
