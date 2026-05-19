'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { ChevronLeft, Loader2, RefreshCw, FileText, Plus, X, AlertTriangle, FileCheck } from 'lucide-react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

const DOCUMENT_TYPES = [
  { value: 'contract', label: 'عقد' },
  { value: 'license', label: 'ترخيص مزاولة' },
  { value: 'kyc_id', label: 'هوية / بطاقة' },
  { value: 'kyc_register', label: 'سجل تجاري' },
  { value: 'tax_card', label: 'بطاقة ضريبية' },
  { value: 'insurance', label: 'تأمين' },
  { value: 'permit', label: 'تصريح' },
  { value: 'other', label: 'أخرى' },
]

export default function DocumentsPage({ params }: { params: { supplierId: string } }) {
  const { supplierId } = params
  const [supplier, setSupplier] = useState<any>(null)
  const [docs, setDocs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)

  async function load() {
    setLoading(true)
    // @ts-expect-error
    const { data: s } = await supabase.from('suppliers').select('business_name').eq('id', supplierId).single()
    setSupplier(s)
    // @ts-expect-error
    const { data: list } = await supabase.from('supplier_documents').select('*').eq('supplier_id', supplierId).eq('is_active', true).order('created_at', { ascending: false })
    setDocs(list || [])
    setLoading(false)
  }

  useEffect(() => { load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [supplierId])

  if (!supplier) return <Loader />

  const today = new Date()
  const expiringSoon = docs.filter(d => d.expires_at && new Date(d.expires_at) > today && (new Date(d.expires_at).getTime() - today.getTime()) / (1000 * 60 * 60 * 24) < 30)
  const expired = docs.filter(d => d.expires_at && new Date(d.expires_at) <= today)

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link href={`/admin/business-finance/${supplierId}`} className="text-xs font-bold text-[#6B7280] hover:text-[#1F6F5F] flex items-center gap-1 mb-2">
            <ChevronLeft className="w-3.5 h-3.5" /> رجوع
          </Link>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#1F6F5F] mb-1">B2B PARTNER · DOCUMENTS</p>
              <h1 className="text-2xl md:text-3xl font-black text-[#1A2E26]">المستندات · {supplier?.business_name}</h1>
              <p className="text-sm text-[#6B7280] mt-1">{docs.length} مستند {expiringSoon.length > 0 && `· ${expiringSoon.length} ينتهي قريب`} {expired.length > 0 && `· ${expired.length} منتهي`}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowAdd(true)} className="px-4 py-2 rounded-xl bg-[#1F6F5F] text-white text-sm font-bold flex items-center gap-2"><Plus className="w-4 h-4" /> مستند جديد</button>
              <button onClick={load} className="p-2 rounded-xl bg-[#FAFAF7]"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-5">
        {/* Warnings */}
        {expired.length > 0 && (
          <section className="bg-red-50 border border-red-200 rounded-2xl p-4">
            <div className="flex items-center gap-2 text-red-700 font-bold text-sm mb-1">
              <AlertTriangle className="w-4 h-4" /> {expired.length} مستند منتهي
            </div>
            <ul className="text-xs text-red-700 space-y-0.5 mr-6">
              {expired.map(d => <li key={d.id}>{d.document_name} (انتهى {d.expires_at})</li>)}
            </ul>
          </section>
        )}
        {expiringSoon.length > 0 && (
          <section className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <div className="flex items-center gap-2 text-amber-700 font-bold text-sm mb-1">
              <AlertTriangle className="w-4 h-4" /> {expiringSoon.length} مستند هينتهي خلال 30 يوم
            </div>
            <ul className="text-xs text-amber-700 space-y-0.5 mr-6">
              {expiringSoon.map(d => <li key={d.id}>{d.document_name} (ينتهي {d.expires_at})</li>)}
            </ul>
          </section>
        )}

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {loading ? (
            <div className="col-span-3 py-12 text-center"><Loader2 className="w-6 h-6 text-[#1F6F5F] animate-spin inline" /></div>
          ) : docs.length === 0 ? (
            <div className="col-span-3 py-12 text-center bg-white rounded-2xl border border-gray-100">
              <FileCheck className="w-10 h-10 text-[#6B7280] opacity-30 mx-auto mb-2" />
              <p className="text-sm font-bold text-[#1A2E26]">مفيش مستندات</p>
              <button onClick={() => setShowAdd(true)} className="mt-3 px-4 py-2 rounded-xl bg-[#1F6F5F] text-white text-sm font-bold">رفع أول مستند</button>
            </div>
          ) : docs.map(d => {
            const isExpired = d.expires_at && new Date(d.expires_at) <= today
            const isExpiringSoon = d.expires_at && new Date(d.expires_at) > today && (new Date(d.expires_at).getTime() - today.getTime()) / (1000 * 60 * 60 * 24) < 30
            return (
              <div key={d.id} className={`bg-white rounded-2xl border p-4 ${isExpired ? 'border-red-200' : isExpiringSoon ? 'border-amber-200' : 'border-gray-100'}`}>
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[#1F6F5F]/10 text-[#1F6F5F] grid place-items-center"><FileText className="w-5 h-5" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold uppercase text-[#6B7280]">{DOCUMENT_TYPES.find(t => t.value === d.document_type)?.label}</p>
                    <h3 className="text-sm font-black text-[#1A2E26] truncate">{d.document_name}</h3>
                  </div>
                </div>
                {d.expires_at && (
                  <p className={`text-xs font-bold ${isExpired ? 'text-red-600' : isExpiringSoon ? 'text-amber-700' : 'text-[#6B7280]'}`}>
                    {isExpired ? '⚠️ منتهي' : isExpiringSoon ? '⏰ ينتهي قريب' : '✓ ساري'} · {d.expires_at}
                  </p>
                )}
                {d.file_url && (
                  <a href={d.file_url} target="_blank" rel="noreferrer" className="block mt-3 px-3 py-1.5 rounded-lg bg-[#FAFAF7] text-[#1F6F5F] text-xs font-bold text-center">عرض الملف</a>
                )}
                {d.notes && <p className="mt-2 text-xs text-[#6B7280]">{d.notes}</p>}
              </div>
            )
          })}
        </section>
      </main>

      {showAdd && (
        <AddDocModal supplierId={supplierId} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load() }} />
      )}
    </div>
  )
}

function AddDocModal({ supplierId, onClose, onSaved }: any) {
  const [form, setForm] = useState({ document_type: 'contract', document_name: '', file_url: '', expires_at: '', notes: '' })
  const [saving, setSaving] = useState(false)
  async function save() {
    if (!form.document_name) return alert('اكتب اسم المستند')
    setSaving(true)
    // @ts-expect-error
    await supabase.from('supplier_documents').insert({
      supplier_id: supplierId,
      document_type: form.document_type,
      document_name: form.document_name,
      file_url: form.file_url || null,
      expires_at: form.expires_at || null,
      notes: form.notes || null,
    })
    onSaved()
  }
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" dir="rtl">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl md:rounded-3xl w-full md:max-w-md md:mx-4 max-h-[90vh] overflow-y-auto shadow-2xl">
        <header className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-black text-[#1A2E26]">مستند جديد</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-[#6B7280]" /></button>
        </header>
        <div className="p-5 space-y-3">
          <Field label="النوع">
            <select value={form.document_type} onChange={e => setForm({ ...form, document_type: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm">
              {DOCUMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </Field>
          <Field label="اسم المستند *"><input type="text" value={form.document_name} onChange={e => setForm({ ...form, document_name: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm" /></Field>
          <Field label="رابط الملف (اختياري)"><input type="url" value={form.file_url} onChange={e => setForm({ ...form, file_url: e.target.value })} placeholder="https://..." className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm" /></Field>
          <Field label="تاريخ الانتهاء (اختياري)"><input type="date" value={form.expires_at} onChange={e => setForm({ ...form, expires_at: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm" /></Field>
          <Field label="ملاحظات"><textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm" /></Field>
          <button onClick={save} disabled={saving} className="w-full py-3 rounded-xl bg-[#1F6F5F] text-white font-black text-sm disabled:opacity-50">{saving ? 'جاري الحفظ...' : 'احفظ'}</button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: any) { return <div><label className="text-[10px] font-bold tracking-wider uppercase text-[#6B7280] mb-1.5 block">{label}</label>{children}</div> }
function Loader() { return <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl"><Loader2 className="w-8 h-8 text-[#1F6F5F] animate-spin" /></div> }
