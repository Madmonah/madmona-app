'use client'
// 💳 /admin/subscriptions — مراجعة إثباتات دفع برنامج الإدارة (١١ سبتمبر ٢٠٢٦)
// محمد: «لهجتي عاملين آلية دفع بإنستاباي وفودافون كاش — نعمل زيهم بالظبط».
// الفريق بيشوف الإثبات (signed URL من bucket خاص) ويقبل → المورد بيتفعّل، أو يرفض بسبب.
import { useCallback, useEffect, useState } from 'react'

type Row = {
  id: string; created_at: string; method: string; amount: number; currency: string; phone: string; business_name: string | null
  sender_name: string; reference: string | null; status: string; proof_url: string | null; review_note: string | null; reviewed_at: string | null
  supplier_id: string | null; supplier: { id: string; business_name: string } | null; utm_source: string | null
}
const METHOD: Record<string, string> = { instapay: 'إنستاباي', vodafone_cash: 'فودافون كاش', bank_transfer: 'تحويل بنكي' }
const STATUS: Record<string, string> = { pending: 'مستني مراجعة', approved: 'مقبول ✓', rejected: 'مرفوض', expired: 'انتهى' }

export default function SubscriptionsAdmin() {
  const [rows, setRows] = useState<Row[]>([])
  const [status, setStatus] = useState<'pending' | 'all'>('pending')
  const [busy, setBusy] = useState<string | null>(null)
  const [err, setErr] = useState('')
  const [sup, setSup] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    setErr('')
    const r = await fetch(`/api/admin/subscriptions?status=${status}`, { cache: 'no-store' })
    const j = await r.json().catch(() => ({}))
    if (!r.ok || !j.ok) { setErr(j.error || 'مش قادرين نحمّل'); return }
    setRows(j.rows || [])
  }, [status])
  useEffect(() => { load() }, [load])

  async function act(id: string, action: 'approve' | 'reject') {
    const note = action === 'reject' ? (window.prompt('سبب الرفض (بيظهر للفريق بس):') || '') : ''
    if (action === 'reject' && !note) return
    setBusy(id)
    const r = await fetch('/api/admin/subscriptions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id, action, note, supplier_id: sup[id] || undefined }) })
    const j = await r.json().catch(() => ({}))
    setBusy(null)
    if (!r.ok || !j.ok) { alert(j.error || 'حصل خطأ'); return }
    if (j.needs_supplier) alert('اتقبل الدفع بس مفيش مورد مربوط — اربطه بالـid من قايمة الموردين وفعّله من هناك.')
    load()
  }

  return (
    <div dir="rtl" className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <div>
          <h1 className="text-xl font-black text-[#04352A]">💳 مدفوعات برنامج الإدارة</h1>
          <p className="text-sm text-gray-500 mt-1">إثباتات التحويل (إنستاباي · فودافون كاش · بنكي). القبول بيفعّل المورد.</p>
        </div>
        <div className="flex gap-2 text-sm">
          <button onClick={() => setStatus('pending')} className={`px-3 py-1.5 rounded-xl border ${status === 'pending' ? 'bg-[#04352A] text-white' : 'bg-white'}`}>مستني مراجعة</button>
          <button onClick={() => setStatus('all')} className={`px-3 py-1.5 rounded-xl border ${status === 'all' ? 'bg-[#04352A] text-white' : 'bg-white'}`}>الكل</button>
          <button onClick={load} className="px-3 py-1.5 rounded-xl border bg-white">تحديث</button>
        </div>
      </div>
      {err && <div className="bg-red-50 text-red-700 rounded-xl p-3 text-sm mb-3">{err}</div>}
      {rows.length === 0 && !err && <div className="text-gray-500 text-sm bg-white rounded-2xl border p-6 text-center">مفيش طلبات {status === 'pending' ? 'مستنية' : ''} دلوقتي.</div>}
      <div className="grid gap-3">
        {rows.map((r) => (
          <div key={r.id} className="bg-white rounded-2xl border p-4 grid md:grid-cols-[180px_1fr] gap-4">
            <a href={r.proof_url || '#'} target="_blank" rel="noreferrer" className="block rounded-xl overflow-hidden bg-gray-100 border aspect-[3/4]">
              {r.proof_url && !/\.pdf($|\?)/.test(r.proof_url) ? <img src={r.proof_url} alt="إثبات الدفع" className="w-full h-full object-cover" /> : <div className="h-full grid place-items-center text-sm text-gray-500">افتح الإثبات</div>}
            </a>
            <div className="text-sm">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${r.status === 'pending' ? 'bg-amber-100 text-amber-800' : r.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-700'}`}>{STATUS[r.status] || r.status}</span>
                <span className="font-black text-[#04352A]">{Number(r.amount).toLocaleString('ar-EG')} ج</span>
                <span className="text-gray-600">· {METHOD[r.method] || r.method}</span>
                <span className="text-gray-400">· {new Date(r.created_at).toLocaleString('ar-EG')}</span>
              </div>
              <div className="mt-2 grid sm:grid-cols-2 gap-x-4 gap-y-1">
                <div><span className="text-gray-500">البيزنس:</span> <b>{r.business_name || '—'}</b></div>
                <div><span className="text-gray-500">الموبايل:</span> <a href={`https://wa.me/${r.phone}`} target="_blank" rel="noreferrer" className="font-mono text-[#059669]">{r.phone}</a></div>
                <div><span className="text-gray-500">اسم المُحوِّل:</span> {r.sender_name}</div>
                <div><span className="text-gray-500">رقم المعاملة:</span> {r.reference || '—'}</div>
                <div className="sm:col-span-2"><span className="text-gray-500">المورد المربوط:</span> {r.supplier ? <a className="text-[#059669]" href={`/admin/business-finance/${r.supplier.id}`}>{r.supplier.business_name}</a> : <span className="text-amber-700">مش مربوط — الرقم مش على أي مورد</span>}</div>
                {r.utm_source && <div className="sm:col-span-2 text-gray-500">المصدر: {r.utm_source}</div>}
                {r.review_note && <div className="sm:col-span-2 text-gray-600">ملاحظة المراجعة: {r.review_note}</div>}
              </div>
              {r.status === 'pending' && (
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  {!r.supplier && <input value={sup[r.id] || ''} onChange={(e) => setSup((s) => ({ ...s, [r.id]: e.target.value.trim() }))} placeholder="id المورد (اختياري) لتفعيله مع القبول" className="border rounded-xl px-3 py-2 text-xs w-full sm:w-80 font-mono" />}
                  <button disabled={busy === r.id} onClick={() => act(r.id, 'approve')} className="bg-[#059669] text-white font-bold rounded-xl px-4 py-2 disabled:opacity-50">✓ اتأكدت من التحويل — فعّل</button>
                  <button disabled={busy === r.id} onClick={() => act(r.id, 'reject')} className="bg-white border text-red-700 font-bold rounded-xl px-4 py-2 disabled:opacity-50">ارفض</button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
