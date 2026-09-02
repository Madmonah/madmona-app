'use client'
// ============================================================================
// 👥 /supplier/erp/crm — عملاء البيزنس
//
// (٢٨ أغسطس ٢٠٢٦) محمد: «أكّدلي إذا كان نظام الـCRM موجود في نماذج
//   البيزنس ولا لأ» — مكانش موجود. فيه ٢٧ جدول CRM بس كلها لمضمونة،
//   والموردين مش شايفينها.
//
// CRM موديول **أساسي لكل بيزنس** — لأن أي بيزنس عنده عملاء مهما كان نشاطه.
// ============================================================================
import { useEffect, useState, useCallback } from 'react'
import { useT } from '@/lib/i18n/LanguageProvider'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { resolveBusiness, type Business } from '@/lib/business-access'
import { Loader2, Plus, Users, ArrowRight, X, Phone, MessageCircle, Search } from 'lucide-react'

type Cust = {
  id: string; full_name: string; phone: string | null; email: string | null
  city: string | null; source: string | null; status: string | null
  notes: string | null; total_orders: number | null; total_spent: number | null
}

const STATUS: Record<string, { label: string; bg: string; fg: string }> = {
  lead:     { label: 'مهتم',  bg: '#FEF3C7', fg: '#B45309' },
  active:   { label: 'عميل',  bg: '#34D39922', fg: '#059669' },
  inactive: { label: 'خامل',  bg: '#F1EEE6', fg: '#6B7280' },
  blocked:  { label: 'محظور', bg: '#FEE2E2', fg: '#B91C1C' },
}

export default function BizCrmPage() {
  // 🌍 (٢ سبتمبر ٢٠٢٦) ترجمة شاشات الإدارة
  const { t } = useT()
  const [biz, setBiz] = useState<Business | null>(null)
  const [rows, setRows] = useState<Cust[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [form, setForm] = useState<Partial<Cust> | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async (sid: string) => {
    const { data } = await (supabaseBrowser as unknown as {
      from: (t: string) => { select: (c: string) => { eq: (a: string, b: unknown) => { order: (c: string, o: unknown) => Promise<{ data: unknown }> } } }
    }).from('biz_customers').select('*').eq('supplier_id', sid).order('created_at', { ascending: false })
    setRows((data as Cust[]) || [])
  }, [])

  useEffect(() => {
    (async () => {
      const acc = await resolveBusiness()
      if (!acc.business) { setLoading(false); return }
      setBiz(acc.business); await load(acc.business.id); setLoading(false)
    })()
  }, [load])

  async function save() {
    if (!biz || !form?.full_name?.trim()) { alert('اكتب اسم العميل'); return }
    setSaving(true)
    const payload = {
      supplier_id: biz.id, full_name: form.full_name.trim(),
      phone: form.phone?.trim() || null, email: form.email?.trim() || null,
      city: form.city || null, status: form.status || 'active',
      source: form.source || 'manual', notes: form.notes || null,
    }
    const db = supabaseBrowser as unknown as {
      from: (t: string) => {
        insert: (v: unknown) => Promise<{ error: { message: string } | null }>
        update: (v: unknown) => { eq: (a: string, b: unknown) => Promise<{ error: { message: string } | null }> }
      }
    }
    const { error } = form.id
      ? await db.from('biz_customers').update(payload).eq('id', form.id)
      : await db.from('biz_customers').insert(payload)
    setSaving(false)
    if (error) {
      alert(error.message.includes('duplicate') ? t('erp.dup_customer') : error.message)
      return
    }
    setForm(null); await load(biz.id)
  }

  if (loading) return <div className="py-24 text-center"><Loader2 className="w-7 h-7 animate-spin mx-auto text-gray-400" /></div>
  if (!biz) return (
    <div className="max-w-md mx-auto py-20 px-4 text-center" dir="rtl">
      <h1 className="font-black text-lg mb-2">{t('erp.suppliers_only')}</h1>
      <Link href="/marketplace" className="text-[#059669] font-bold text-sm">{t('erp.back_market')}</Link>
    </div>
  )

  const shown = q.trim()
    ? rows.filter((r) => (r.full_name + ' ' + (r.phone || '')).includes(q.trim()))
    : rows

  return (
    <div className="max-w-4xl mx-auto p-4 pb-24" dir="rtl">
      <div className="flex items-center justify-between mb-3 gap-2">
        <div>
          <Link href="/supplier/erp" className="text-[11px] text-gray-500 font-bold flex items-center gap-1 mb-1">
            <ArrowRight className="w-3 h-3" /> نظام الإدارة
          </Link>
          <h1 className="text-lg font-black text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-[#059669]" /> عملائي
          </h1>
        </div>
        <button onClick={() => setForm({ status: 'active', source: 'manual' })}
          className="px-3 py-2 rounded-xl bg-[#34D399] text-[#04352A] text-sm font-black flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> عميل جديد
        </button>
      </div>

      {rows.length > 4 && (
        <div className="relative mb-3">
          <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('erp.search_customer')}
            className="w-full border border-gray-200 rounded-xl pr-9 pl-3 py-2.5 text-sm" />
        </div>
      )}

      {shown.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 p-10 text-center">
          <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-gray-600">{q ? t('erp.no_results') : t('erp.no_customers_yet')}</p>
          {!q && <p className="text-[11px] text-gray-400 mt-1">{t('erp.customers_hint')}</p>}
        </div>
      ) : (
        <div className="space-y-2">
          {shown.map((r) => {
            const st = STATUS[r.status || 'active'] || STATUS.active
            return (
              <div key={r.id} className="rounded-2xl border border-gray-200 bg-white p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-black text-sm text-gray-900">{r.full_name}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5" dir="ltr">
                      {r.phone || '—'}{r.city ? ` · ${r.city}` : ''}
                    </p>
                    {Number(r.total_orders) > 0 && (
                      <p className="text-[11px] text-[#059669] font-bold mt-1">
                        {r.total_orders} طلب · {Number(r.total_spent || 0).toLocaleString('ar-EG')} ج.م
                      </p>
                    )}
                  </div>
                  <span className="text-[10.5px] font-black px-2 py-1 rounded-full shrink-0"
                    style={{ background: st.bg, color: st.fg }}>{st.label}</span>
                </div>
                <div className="flex gap-1.5 mt-2.5">
                  {r.phone && (
                    <>
                      <a href={`tel:${r.phone}`} className="px-2.5 py-1.5 rounded-lg bg-[#F1EEE6] text-[11.5px] font-bold flex items-center gap-1">
                        <Phone className="w-3 h-3" /> اتصل
                      </a>
                      <a href={`https://wa.me/${r.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer"
                        className="px-2.5 py-1.5 rounded-lg bg-[#34D399]/15 text-[#059669] text-[11.5px] font-bold flex items-center gap-1">
                        <MessageCircle className="w-3 h-3" /> واتساب
                      </a>
                    </>
                  )}
                  <button onClick={() => setForm(r)} className="px-2.5 py-1.5 rounded-lg bg-[#F1EEE6] text-[11.5px] font-bold">{t('erp.edit')}</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {form && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-3" onClick={() => setForm(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-4 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-black text-base">{form.id ? t('erp.edit_customer') : t('erp.new_customer')}</h2>
              <button onClick={() => setForm(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <F label="الاسم *"><input value={form.full_name || ''} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className={INP} /></F>
            <F label={t('erp.mobile')}><input value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={INP} dir="ltr" placeholder="01xxxxxxxxx" /></F>
            <div className="grid grid-cols-2 gap-2">
              <F label={t('erp.city')}><input value={form.city || ''} onChange={(e) => setForm({ ...form, city: e.target.value })} className={INP} /></F>
              <F label="الحالة">
                <select value={form.status || 'active'} onChange={(e) => setForm({ ...form, status: e.target.value })} className={INP}>
                  <option value="lead">{t('erp.interested')}</option><option value="active">{t('erp.customer')}</option>
                  <option value="inactive">{t('erp.inactive')}</option><option value="blocked">{t('erp.blocked')}</option>
                </select>
              </F>
            </div>
            <F label={t('erp.notes')}><textarea value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={INP} rows={2} /></F>
            <button onClick={save} disabled={saving}
              className="w-full mt-2 py-3 rounded-xl bg-[#34D399] text-[#04352A] font-black text-sm disabled:opacity-50">
              {saving ? t('erp.saving') : t('erp.save')}
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
