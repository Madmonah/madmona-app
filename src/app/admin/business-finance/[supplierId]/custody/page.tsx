'use client'
// =====================================================================
// 🧾 العهدة وتسويتها — لوحة البيزنس (٩/٩/٢٠٢٦ — آخر الليل)
//
// محمد: «تسوية العهدة هل اندمجت (العهدة المالية) ولا لسه؟» — كانت **لسه**:
//   • الشاشة القديمة كانت بتسجّل العهدة بحالة `assigned` — **القيد بيرفضها**
//     (المسموح: requested · held · returned · lost · damaged · settled) فمفيش
//     عهدة اتسجّلت من اللوحة أصلًا (صفر صفوف)، ومن غير employee_id فالموظف
//     مش هيلاقيها في «عهدتي» حتى لو اتسجّلت.
//   • كانت بتقرا الجداول بعميل anon مستقل (قنبلة ٥/٩) ومفيش تسوية: «تسجيل
//     استرجاع» كان بيغيّر الحالة بس من غير حساب المتبقي أو المشتريات.
//
// دلوقتي: نفس الموديل اللي الموظف بيصرف منه في «شغلي» (custody_items ·
// branch_expenses category=custody_purchase) — الإدارة بتسلّم العهدة لموظف
// بعينه (held)، بتشوف مشترياته والمتبقي، وبتعمل **تسوية**: المسلَّم − المشتريات
// = المتبقي، والموظف بيرجّع كاش؛ الفرق (عجز) بيتقيّد سلفة عليه تلقائيًا.
// كل النداءات عبر financeRpc (p_token — بابين الدخول) على دوال admin_custody_*.
// =====================================================================

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, Loader2, RefreshCw, ShieldCheck, Plus, X, Package, Banknote, CheckCircle2, User, Scale } from 'lucide-react'
import { financeRpc } from '@/lib/financeRpc'

type Purchase = { id: string; amount: number; title: string; vendor: string | null; date: string | null }
type Ev = { event: string; amount: number | null; note: string | null; at: string }
type Item = {
  id: string; employee_id: string | null; employee_name: string | null; kind: string; title: string | null
  value: number; spent: number; remaining: number; status: string; assigned_at: string | null; returned_at: string | null
  notes: string | null; purchases: Purchase[]; events: Ev[]
}
type Emp = { id: string; full_name: string; role_ar: string | null }
type Board = { ok: boolean; error?: string; business_name?: string; items: Item[]; employees: Emp[] }

const fmt = (n: number | null | undefined) => Number(n || 0).toLocaleString('ar-EG')
const OPEN = new Set(['held', 'requested'])

export default function CustodyPage({ params }: { params: { supplierId: string } }) {
  const { supplierId } = params
  const [board, setBoard] = useState<Board | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [settling, setSettling] = useState<Item | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setErr(null)
    const { data, error } = await financeRpc('admin_custody_board', { p_supplier_id: supplierId })
    if (error || !data?.ok) setErr(error?.message || data?.error || 'مش قادرين نحمّل العهد')
    setBoard(data && data.ok ? data : { ok: false, items: [], employees: [] })
    setLoading(false)
  }, [supplierId])
  useEffect(() => { void load() }, [load])

  async function returnItem(i: Item) {
    if (!confirm(`تسجيل استرجاع «${i.title || 'العهدة'}» من ${i.employee_name || 'الموظف'}؟`)) return
    const { data, error } = await financeRpc('admin_custody_return', { p_supplier_id: supplierId, p_id: i.id, p_note: null })
    if (error || !data?.ok) { alert(error?.message || data?.error || 'ماتسجّلش'); return }
    void load()
  }

  const items = board?.items || []
  const open = items.filter(i => OPEN.has(i.status))
  const closed = items.filter(i => !OPEN.has(i.status))
  const totalOpen = open.reduce((s, i) => s + (i.kind === 'cash' ? i.remaining : i.value), 0)

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link href={`/admin/business-finance/${supplierId}`} className="text-xs font-bold text-[#6B7280] hover:text-[#059669] flex items-center gap-1 mb-2">
            <ChevronLeft className="w-3.5 h-3.5" /> رجوع
          </Link>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#059669] mb-1">CUSTODY · SETTLEMENT</p>
              <h1 className="text-2xl md:text-3xl font-black text-[#1A2E26]">العهدة وتسويتها{board?.business_name ? ` · ${board.business_name}` : ''}</h1>
              <p className="text-sm text-[#6B7280] mt-1">{open.length} عهدة مفتوحة · {closed.length} مقفولة · المتبقي في إيد الموظفين {fmt(totalOpen)} ج</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowAdd(true)} className="px-4 py-2 rounded-xl bg-[#34D399] text-[#04352A] text-sm font-bold flex items-center gap-2"><Plus className="w-4 h-4" /> تسليم عهدة</button>
              <button onClick={() => void load()} className="p-2 rounded-xl bg-[#FAFAF7]"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {err && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{err}</p>}
        {loading && !board ? (
          <div className="py-12 text-center"><Loader2 className="w-6 h-6 text-[#059669] animate-spin inline" /></div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center bg-white rounded-2xl border border-gray-100">
            <ShieldCheck className="w-10 h-10 text-[#6B7280] opacity-30 mx-auto mb-2" />
            <p className="text-sm font-bold text-[#1A2E26]">مفيش عهد مسجّلة</p>
            <p className="text-xs text-[#6B7280] mt-1">سلّم عهدة نقدية لموظف — هتظهرله في «شغلي» ويصرف منها، وإنت تسوّيها من هنا.</p>
            <button onClick={() => setShowAdd(true)} className="mt-3 px-4 py-2 rounded-xl bg-[#34D399] text-[#04352A] text-sm font-bold">تسليم أول عهدة</button>
          </div>
        ) : (
          <>
            <section>
              <h2 className="text-xs font-black text-[#6B7280] mb-2">المفتوحة ({open.length})</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {open.map(i => <Card key={i.id} i={i} onSettle={() => setSettling(i)} onReturn={() => void returnItem(i)} />)}
                {open.length === 0 && <p className="text-xs text-[#6B7280]">مفيش عهدة مفتوحة.</p>}
              </div>
            </section>
            {closed.length > 0 && (
              <section>
                <h2 className="text-xs font-black text-[#6B7280] mb-2">المقفولة ({closed.length})</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {closed.map(i => <Card key={i.id} i={i} />)}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      {showAdd && <AssignModal supplierId={supplierId} employees={board?.employees || []} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); void load() }} />}
      {settling && <SettleModal supplierId={supplierId} item={settling} onClose={() => setSettling(null)} onDone={() => { setSettling(null); void load() }} />}
    </div>
  )
}

function Card({ i, onSettle, onReturn }: { i: Item; onSettle?: () => void; onReturn?: () => void }) {
  const isOpen = OPEN.has(i.status)
  const cash = i.kind === 'cash'
  const settled = i.events.find(e => e.event === 'settled')
  const label = i.status === 'held' ? 'مفتوحة' : i.status === 'requested' ? 'مطلوبة' : i.status === 'settled' ? 'اتسوّت' : i.status === 'returned' ? 'مسترجعة' : i.status === 'lost' ? 'مفقودة' : 'تالفة'
  return (
    <div className={`bg-white rounded-2xl border p-4 ${isOpen ? 'border-[#059669]/20' : 'border-gray-100 opacity-80'}`}>
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-[#34D399]/10 text-[#059669] grid place-items-center">{cash ? <Banknote className="w-5 h-5" /> : <Package className="w-5 h-5" />}</div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase text-[#6B7280]">{cash ? 'عهدة نقدية' : 'عهدة عينية'}</p>
          <h3 className="text-sm font-black text-[#1A2E26] truncate">{i.title || (cash ? 'عهدة نقدية' : 'عهدة عينية')}</h3>
        </div>
        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${isOpen ? 'text-amber-700 bg-amber-50' : 'text-green-700 bg-green-50'}`}>{label}</span>
      </div>
      <div className="text-xs text-[#6B7280] space-y-1">
        <p className="flex items-center gap-1"><User className="w-3 h-3" /> {i.employee_name || '— من غير موظف'}</p>
        {cash ? (
          <div className="grid grid-cols-3 gap-2 mt-2">
            <Stat l="المسلَّم" v={i.value} />
            <Stat l="المشتريات" v={i.spent} />
            <Stat l="المتبقي" v={i.remaining} strong />
          </div>
        ) : i.value > 0 && <p>القيمة: <b className="text-[#1A2E26]">{fmt(i.value)} ج</b></p>}
        {i.assigned_at && <p>اتسلّمت: {new Date(i.assigned_at).toLocaleDateString('ar-EG')}</p>}
        {i.notes && <p>{i.notes}</p>}
        {cash && i.purchases.length > 0 && (
          <details className="mt-2">
            <summary className="cursor-pointer font-bold text-[#1A2E26]">المشتريات ({i.purchases.length})</summary>
            <div className="mt-1 space-y-1">
              {i.purchases.map(p => (
                <div key={p.id} className="flex items-center justify-between border-b border-gray-50 py-1">
                  <span>{p.title}{p.vendor ? ` · ${p.vendor}` : ''}{p.date ? ` · ${p.date}` : ''}</span>
                  <span className="font-mono font-bold text-[#1A2E26]">{fmt(p.amount)} ج</span>
                </div>
              ))}
            </div>
          </details>
        )}
        {settled && <p className="mt-2 text-[11px] text-[#1A2E26] bg-[#FAFAF7] rounded-lg px-2 py-1">✅ التسوية: {settled.note || `رجّع ${fmt(settled.amount)} ج`}</p>}
      </div>
      {isOpen && (cash
        ? <button onClick={onSettle} className="w-full mt-3 px-3 py-2 rounded-lg bg-[#34D399] text-[#04352A] text-xs font-black flex items-center justify-center gap-1"><Scale className="w-3.5 h-3.5" /> تسوية العهدة</button>
        : <button onClick={onReturn} className="w-full mt-3 px-3 py-1.5 rounded-lg bg-[#FAFAF7] text-[#059669] text-xs font-bold flex items-center justify-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> تسجيل استرجاع</button>)}
    </div>
  )
}

function Stat({ l, v, strong }: { l: string; v: number; strong?: boolean }) {
  return <div className="rounded-lg bg-[#FAFAF7] px-2 py-1.5 text-center"><p className="text-[10px]">{l}</p><p className={`font-mono font-bold ${strong ? 'text-[#059669]' : 'text-[#1A2E26]'}`}>{fmt(v)}</p></div>
}

function AssignModal({ supplierId, employees, onClose, onSaved }: { supplierId: string; employees: Emp[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ kind: 'cash', employee_id: employees[0]?.id || '', title: '', value_egp: '', due_back_at: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  async function save() {
    setErr(null)
    if (!form.employee_id) { setErr('اختار الموظف'); return }
    if (!form.title.trim()) { setErr('اكتب وصف العهدة'); return }
    if (form.kind === 'cash' && !(Number(form.value_egp) > 0)) { setErr('اكتب المبلغ المسلَّم'); return }
    setSaving(true)
    const { data, error } = await financeRpc('admin_custody_assign', {
      p_supplier_id: supplierId, p_employee_id: form.employee_id, p_kind: form.kind, p_title: form.title.trim(),
      p_value_egp: form.value_egp ? Number(form.value_egp) : 0, p_notes: form.notes || null, p_due_back_at: form.due_back_at || null,
    })
    setSaving(false)
    if (error || !data?.ok) { setErr(error?.message || data?.error || 'فشل الحفظ'); return }
    onSaved()
  }
  return (
    <Modal title="تسليم عهدة لموظف" onClose={onClose}>
      <Field label="الموظف *">
        <select value={form.employee_id} onChange={e => setForm({ ...form, employee_id: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm">
          {employees.length === 0 && <option value="">— مفيش موظفين نشطين —</option>}
          {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}{e.role_ar ? ` · ${e.role_ar}` : ''}</option>)}
        </select>
      </Field>
      <Field label="النوع">
        <select value={form.kind} onChange={e => setForm({ ...form, kind: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm">
          <option value="cash">عهدة نقدية (مشتريات)</option>
          <option value="equipment">عهدة عينية (جهاز/معدة)</option>
          <option value="keys">مفاتيح</option>
          <option value="vehicle">مركبة</option>
          <option value="device">جهاز</option>
          <option value="other">أخرى</option>
        </select>
      </Field>
      <Field label="الوصف *"><input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm" placeholder={form.kind === 'cash' ? 'عهدة مشتريات المكتب' : 'لابتوب Dell'} /></Field>
      <Field label={form.kind === 'cash' ? 'المبلغ المسلَّم (ج) *' : 'القيمة (ج)'}><input type="number" inputMode="decimal" value={form.value_egp} onChange={e => setForm({ ...form, value_egp: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm" dir="ltr" /></Field>
      <Field label="تاريخ الترجيع (اختياري)"><input type="date" value={form.due_back_at} onChange={e => setForm({ ...form, due_back_at: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm" /></Field>
      <Field label="ملاحظات"><textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm" /></Field>
      {err && <p className="text-xs text-red-600">{err}</p>}
      <button onClick={save} disabled={saving} className="w-full py-3 rounded-xl bg-[#34D399] text-[#04352A] font-black text-sm disabled:opacity-50 flex items-center justify-center gap-2">
        {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري الحفظ...</> : <><Plus className="w-4 h-4" /> سلّم العهدة</>}
      </button>
    </Modal>
  )
}

function SettleModal({ supplierId, item, onClose, onDone }: { supplierId: string; item: Item; onClose: () => void; onDone: () => void }) {
  const [returned, setReturned] = useState(String(item.remaining > 0 ? item.remaining : 0))
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const r = Number(returned) || 0
  const diff = r - item.remaining
  async function settle() {
    setErr(null); setBusy(true)
    const { data, error } = await financeRpc('admin_custody_settle', { p_supplier_id: supplierId, p_id: item.id, p_returned_cash: r, p_note: note || null })
    setBusy(false)
    if (error || !data?.ok) { setErr(error?.message || data?.error || 'التسوية ماتمّتش'); return }
    onDone()
  }
  return (
    <Modal title={`تسوية «${item.title || 'العهدة'}»`} onClose={onClose}>
      <div className="grid grid-cols-3 gap-2">
        <Stat l="المسلَّم" v={item.value} /><Stat l="المشتريات" v={item.spent} /><Stat l="المفروض يرجّع" v={item.remaining} strong />
      </div>
      <Field label="الكاش اللي رجّعه فعلًا (ج)"><input type="number" inputMode="decimal" value={returned} onChange={e => setReturned(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm" dir="ltr" /></Field>
      <p className={`text-xs rounded-lg px-3 py-2 ${diff < 0 ? 'bg-red-50 text-red-700' : diff > 0 ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'}`}>
        {diff < 0 ? `عجز ${fmt(-diff)} ج — هيتقيّد سلفة على ${item.employee_name || 'الموظف'} وتتخصم من مرتبه` : diff > 0 ? `زيادة ${fmt(diff)} ج — راجع المشتريات قبل ما تقفل` : 'الحساب مظبوط — العهدة هتتقفل'}
      </p>
      <Field label="ملاحظة (اختياري)"><input value={note} onChange={e => setNote(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm" /></Field>
      {err && <p className="text-xs text-red-600">{err}</p>}
      <button onClick={settle} disabled={busy} className="w-full py-3 rounded-xl bg-[#34D399] text-[#04352A] font-black text-sm disabled:opacity-50 flex items-center justify-center gap-2">
        {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري التسوية...</> : <><Scale className="w-4 h-4" /> اقفل العهدة</>}
      </button>
    </Modal>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" dir="rtl">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl md:rounded-3xl w-full md:max-w-md md:mx-4 max-h-[90vh] overflow-y-auto shadow-2xl">
        <header className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-black text-[#1A2E26]">{title}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-[#6B7280]" /></button>
        </header>
        <div className="p-5 space-y-3">{children}</div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="text-[10px] font-bold tracking-wider uppercase text-[#6B7280] mb-1.5 block">{label}</label>{children}</div>
}
