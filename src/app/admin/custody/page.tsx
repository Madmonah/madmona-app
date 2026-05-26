'use client'

/* ============================================================
   /admin/custody — نظام العهدة
   أصول/معدات/فلوس مسلّمة للموظفين بمسؤولية + تسليم/استرداد/صرف
   ============================================================ */

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import {
  ShieldCheck, RefreshCw, ChevronLeft, Plus, X, Save, Loader2, Trash2,
  Laptop, Banknote, KeyRound, Car, Smartphone, Package, User, Undo2,
  CheckCircle2, AlertTriangle, Wallet,
} from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Kind = 'equipment' | 'cash' | 'keys' | 'vehicle' | 'device' | 'other'
type Status = 'held' | 'returned' | 'lost' | 'damaged' | 'settled'
type Item = {
  id: string; employee_id: string; employee_name: string; role: string | null
  branch_id: string | null; kind: Kind; title: string; description: string | null
  value_egp: number; cash_spent: number; cash_remaining: number
  serial_no: string | null; photo_url: string | null; status: Status
  assigned_at: string; due_back_at: string | null; returned_at: string | null
  notes: string | null; n_events: number
}
type Emp = { id: string; full_name: string; role: string; email: string | null; branch_id: string | null }

const KIND_META: Record<Kind, { label: string; Icon: typeof Laptop }> = {
  equipment: { label: 'معدات', Icon: Laptop },
  cash:      { label: 'نقدي',  Icon: Banknote },
  keys:      { label: 'مفاتيح', Icon: KeyRound },
  vehicle:   { label: 'عربية', Icon: Car },
  device:    { label: 'جهاز',  Icon: Smartphone },
  other:     { label: 'أخرى',  Icon: Package },
}
const STATUS_META: Record<Status, { label: string; cls: string }> = {
  held:     { label: 'مع الموظف', cls: 'bg-amber-50 text-amber-700' },
  returned: { label: 'اترجعت',    cls: 'bg-gray-100 text-[#6B7280]' },
  settled:  { label: 'اتسوّت ✓',  cls: 'bg-[#1F6F5F]/10 text-[#1F6F5F]' },
  lost:     { label: 'ضايعة',     cls: 'bg-red-50 text-red-600' },
  damaged:  { label: 'تالفة',     cls: 'bg-red-50 text-red-600' },
}
const egp = (n: number) => `${(n || 0).toLocaleString('en-EG')} ج`

export default function CustodyPage() {
  const [items, setItems] = useState<Item[]>([])
  const [emps, setEmps] = useState<Emp[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [cashFor, setCashFor] = useState<Item | null>(null)

  async function load() {
    setLoading(true)
    // @ts-expect-error rpc untyped
    const [{ data: it }, { data: em }] = await Promise.all([
      supabase.rpc('get_custody'),
      supabase.rpc('get_custody_employees'),
    ])
    setItems((Array.isArray(it) ? it : []) as Item[])
    setEmps((Array.isArray(em) ? em : []) as Emp[])
    setLoading(false)
  }
  useEffect(() => { load(); const i = setInterval(load, 45000); return () => clearInterval(i) }, [])

  async function setStatus(id: string, status: Status) {
    // @ts-expect-error rpc untyped
    await supabase.rpc('custody_set_status', { p_id: id, p_status: status, p_by_name: 'admin' })
    await load()
  }
  async function del(id: string) {
    if (!confirm('تحذف العهدة دي وكل سجلها؟')) return
    setItems((p) => p.filter((x) => x.id !== id))
    // @ts-expect-error rpc untyped
    await supabase.rpc('custody_delete', { p_id: id })
  }

  // group by employee
  const groups = useMemo(() => {
    const m = new Map<string, Item[]>()
    for (const it of items) {
      if (!m.has(it.employee_name)) m.set(it.employee_name, [])
      m.get(it.employee_name)!.push(it)
    }
    return [...m.entries()]
  }, [items])

  const stats = useMemo(() => {
    const held = items.filter((i) => i.status === 'held')
    const valueHeld = held.reduce((s, i) => s + (i.kind === 'cash' ? i.cash_remaining : i.value_egp), 0)
    const cashOut = held.filter((i) => i.kind === 'cash').reduce((s, i) => s + i.cash_remaining, 0)
    return { open: held.length, valueHeld, cashOut }
  }, [items])

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <Link href="/admin/business-finance/c8b7b9d7-6178-4d0c-abdf-66f34b628e9d/team"
            className="text-xs font-bold text-[#6B7280] hover:text-[#1F6F5F] flex items-center gap-1 mb-2 transition-colors">
            <ChevronLeft className="w-3.5 h-3.5" /> رجوع للفريق
          </Link>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#1F6F5F] mb-1 flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> CUSTODY</p>
              <h1 className="text-2xl md:text-3xl font-black text-[#1A2E26] tracking-tight">العهدة</h1>
              <p className="text-sm text-[#6B7280] mt-1">
                {stats.open} عهدة مفتوحة · قيمة بالعهدة {egp(stats.valueHeld)} · نقدي متبقّي {egp(stats.cashOut)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setAdding(true)}
                className="px-4 py-2 rounded-xl bg-[#1F6F5F] hover:opacity-90 text-sm font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4" /> تسليم عهدة
              </button>
              <button onClick={load}
                className="px-4 py-2 rounded-xl bg-[#FAFAF7] hover:bg-gray-100 border border-gray-200 text-sm font-bold text-[#1A2E26] flex items-center gap-2">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> تحديث
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {loading && items.length === 0 ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-[#1F6F5F] animate-spin" /></div>
        ) : items.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-gray-200 bg-white p-12 text-center">
            <ShieldCheck className="w-12 h-12 text-[#6B7280] opacity-30 mx-auto mb-3" />
            <p className="text-base font-bold text-[#1A2E26]">مفيش عهدة متسجّلة</p>
            <p className="text-sm text-[#6B7280] mt-1">دوس «تسليم عهدة» وسجّل معدات أو فلوس مع أي موظف</p>
          </div>
        ) : (
          groups.map(([emp, list]) => {
            const held = list.filter((i) => i.status === 'held')
            const empValue = held.reduce((s, i) => s + (i.kind === 'cash' ? i.cash_remaining : i.value_egp), 0)
            return (
              <section key={emp} className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="inline-grid place-items-center w-7 h-7 rounded-lg bg-[#1F6F5F]/10 text-[#1F6F5F]"><User className="w-4 h-4" /></div>
                  <h2 className="text-sm font-black text-[#1A2E26]">{emp}</h2>
                  <span className="text-[10px] text-[#6B7280]">{held.length} مفتوحة · {egp(empValue)}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {list.map((it) => (
                    <CustodyCard key={it.id} it={it} onStatus={setStatus} onDelete={del} onCash={() => setCashFor(it)} />
                  ))}
                </div>
              </section>
            )
          })
        )}
      </main>

      {adding && <AddModal emps={emps} onClose={() => setAdding(false)} onSaved={async () => { setAdding(false); await load() }} />}
      {cashFor && <CashModal item={cashFor} onClose={() => setCashFor(null)} onSaved={async () => { setCashFor(null); await load() }} />}
    </div>
  )
}

function CustodyCard({ it, onStatus, onDelete, onCash }: {
  it: Item; onStatus: (id: string, s: Status) => void; onDelete: (id: string) => void; onCash: () => void
}) {
  const km = KIND_META[it.kind]; const sm = STATUS_META[it.status]
  const isCash = it.kind === 'cash'; const isHeld = it.status === 'held'
  const pctSpent = isCash && it.value_egp > 0 ? Math.round((it.cash_spent / it.value_egp) * 100) : 0
  return (
    <div className={`rounded-2xl border p-4 bg-white ${isHeld ? 'border-gray-100' : 'border-gray-100 opacity-80'}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="inline-grid place-items-center w-9 h-9 rounded-xl bg-[#FAFAF7] text-[#1F6F5F] flex-shrink-0"><km.Icon className="w-4.5 h-4.5" /></span>
          <div className="min-w-0">
            <h3 className="text-sm font-black text-[#1A2E26] truncate">{it.title}</h3>
            <p className="text-[10px] text-[#6B7280]">{km.label}{it.serial_no ? ` · ${it.serial_no}` : ''}</p>
          </div>
        </div>
        <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold flex-shrink-0 ${sm.cls}`}>{sm.label}</span>
      </div>

      {it.description && <p className="text-xs text-[#6B7280] mb-2">{it.description}</p>}

      {isCash ? (
        <div className="mb-3 bg-[#FAFAF7] rounded-xl p-3">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-[#6B7280] flex items-center gap-1"><Wallet className="w-3.5 h-3.5" /> متبقّي</span>
            <span className="font-black text-[#1F6F5F]">{egp(it.cash_remaining)}</span>
          </div>
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden mb-1.5">
            <div className="h-full bg-[#D4A017]" style={{ width: `${pctSpent}%` }} />
          </div>
          <div className="flex items-center justify-between text-[10px] text-[#6B7280]">
            <span>اتسلّم {egp(it.value_egp)}</span><span>اتصرف {egp(it.cash_spent)}</span>
          </div>
        </div>
      ) : (
        <div className="mb-3 text-sm font-black text-[#1A2E26]">{egp(it.value_egp)}</div>
      )}

      <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
        <span className="text-[10px] text-[#6B7280]">
          {isHeld ? `اتسلّم ${new Date(it.assigned_at).toLocaleDateString('ar-EG')}` : it.returned_at ? `اقفلت ${new Date(it.returned_at).toLocaleDateString('ar-EG')}` : ''}
        </span>
        <div className="flex items-center gap-1 flex-wrap justify-end">
          {isHeld && isCash && (
            <button onClick={onCash} className="px-2 py-1 rounded-lg text-[10px] font-bold bg-[#D4A017]/10 text-[#B8860B] hover:bg-[#D4A017]/20 flex items-center gap-1">
              <Banknote className="w-3 h-3" /> صرف
            </button>
          )}
          {isHeld && (
            <>
              <button onClick={() => onStatus(it.id, isCash ? 'settled' : 'returned')}
                className="px-2 py-1 rounded-lg text-[10px] font-bold bg-[#1F6F5F]/10 text-[#1F6F5F] hover:bg-[#1F6F5F] hover:text-white flex items-center gap-1">
                {isCash ? <CheckCircle2 className="w-3 h-3" /> : <Undo2 className="w-3 h-3" />} {isCash ? 'تسوية' : 'استرد'}
              </button>
              <button onClick={() => { if (confirm('تعلّمها تالفة/ضايعة؟')) onStatus(it.id, 'damaged') }}
                className="px-2 py-1 rounded-lg text-[10px] font-bold bg-red-50 text-red-600 hover:bg-red-100 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> تالفة
              </button>
            </>
          )}
          <button onClick={() => onDelete(it.id)} className="px-2 py-1 rounded-lg bg-[#FAFAF7] hover:bg-red-50 text-[#6B7280] hover:text-red-600">
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  )
}

const inputCls = 'w-full px-3 py-2 text-sm rounded-xl border border-gray-200 bg-[#FAFAF7] text-[#1A2E26] focus:outline-none focus:border-[#1F6F5F]'

function AddModal({ emps, onClose, onSaved }: { emps: Emp[]; onClose: () => void; onSaved: () => void }) {
  const [employeeId, setEmployeeId] = useState(emps[0]?.id || '')
  const [kind, setKind] = useState<Kind>('equipment')
  const [title, setTitle] = useState('')
  const [value, setValue] = useState('')
  const [serial, setSerial] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const isCash = kind === 'cash'

  async function save() {
    if (!employeeId || !title.trim()) return
    setSaving(true)
    // @ts-expect-error rpc untyped
    await supabase.rpc('custody_add', {
      p_employee_id: employeeId, p_kind: kind, p_title: title.trim(),
      p_value_egp: Number(value) || 0, p_serial_no: serial.trim() || null,
      p_notes: notes.trim() || null, p_by_name: 'admin',
    })
    setSaving(false); onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" dir="rtl">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#FAFAF7] rounded-t-3xl md:rounded-3xl w-full md:max-w-lg md:mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
        <header className="px-5 py-4 border-b border-gray-100 bg-white rounded-t-3xl flex items-center gap-3 sticky top-0">
          <div className="inline-grid place-items-center w-11 h-11 rounded-xl bg-[#1F6F5F]/10 text-[#1F6F5F]"><ShieldCheck className="w-5 h-5" /></div>
          <div className="flex-1"><h2 className="text-base font-black text-[#1A2E26]">تسليم عهدة</h2><p className="text-xs text-[#6B7280]">معدات أو فلوس مع موظف</p></div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#FAFAF7] text-[#6B7280]"><X className="w-5 h-5" /></button>
        </header>
        <div className="p-4 space-y-3">
          <div>
            <label className="text-xs font-bold text-[#1A2E26] mb-1 block">الموظف</label>
            <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className={inputCls}>
              {emps.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-[#1A2E26] mb-1 block">نوع العهدة</label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(KIND_META) as Kind[]).map((k) => {
                const M = KIND_META[k]
                return (
                  <button key={k} onClick={() => setKind(k)}
                    className={`py-2 rounded-xl text-xs font-bold flex flex-col items-center gap-1 border transition-colors ${kind === k ? 'bg-[#1F6F5F] text-white border-[#1F6F5F]' : 'bg-white text-[#6B7280] border-gray-200 hover:border-[#1F6F5F]'}`}>
                    <M.Icon className="w-4 h-4" /> {M.label}
                  </button>
                )
              })}
            </div>
          </div>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={isCash ? 'وصف العهدة (مثلاً نثرية الفرع)' : 'اسم المعدة (مثلاً لابتوب Dell)'} className={inputCls} />
          <input value={value} onChange={(e) => setValue(e.target.value)} type="number" inputMode="numeric"
            placeholder={isCash ? 'المبلغ المسلَّم (ج)' : 'القيمة التقديرية (ج)'} className={inputCls} />
          {!isCash && <input value={serial} onChange={(e) => setSerial(e.target.value)} placeholder="رقم سيريال / علامة مميزة (اختياري)" className={inputCls} />}
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="ملاحظات (اختياري)" className={`${inputCls} resize-none`} />
          <button onClick={save} disabled={saving || !title.trim() || !employeeId}
            className="w-full py-2.5 rounded-xl bg-[#1F6F5F] text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-90">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} سجّل التسليم
          </button>
        </div>
      </div>
    </div>
  )
}

function CashModal({ item, onClose, onSaved }: { item: Item; onClose: () => void; onSaved: () => void }) {
  const [event, setEvent] = useState<'spent' | 'reimbursed'>('spent')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  async function save() {
    const amt = Number(amount); if (!amt || amt <= 0) return
    setSaving(true)
    // @ts-expect-error rpc untyped
    await supabase.rpc('custody_cash_event', { p_id: item.id, p_event: event, p_amount: amt, p_note: note.trim() || null, p_by_name: 'admin' })
    setSaving(false); onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" dir="rtl">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#FAFAF7] rounded-t-3xl md:rounded-3xl w-full md:max-w-sm md:mx-4 shadow-2xl">
        <header className="px-5 py-4 border-b border-gray-100 bg-white rounded-t-3xl flex items-center gap-3">
          <div className="inline-grid place-items-center w-11 h-11 rounded-xl bg-[#D4A017]/10 text-[#B8860B]"><Banknote className="w-5 h-5" /></div>
          <div className="flex-1"><h2 className="text-base font-black text-[#1A2E26]">{item.title}</h2><p className="text-xs text-[#6B7280]">متبقّي {egp(item.cash_remaining)}</p></div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#FAFAF7] text-[#6B7280]"><X className="w-5 h-5" /></button>
        </header>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setEvent('spent')} className={`py-2 rounded-xl text-xs font-bold border ${event === 'spent' ? 'bg-[#1F6F5F] text-white border-[#1F6F5F]' : 'bg-white text-[#6B7280] border-gray-200'}`}>صرف</button>
            <button onClick={() => setEvent('reimbursed')} className={`py-2 rounded-xl text-xs font-bold border ${event === 'reimbursed' ? 'bg-[#1F6F5F] text-white border-[#1F6F5F]' : 'bg-white text-[#6B7280] border-gray-200'}`}>استرجاع</button>
          </div>
          <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" inputMode="numeric" placeholder="المبلغ (ج)" className={inputCls} />
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="على إيه؟ (اختياري)" className={inputCls} />
          <button onClick={save} disabled={saving || !amount}
            className="w-full py-2.5 rounded-xl bg-[#1F6F5F] text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-90">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} سجّل
          </button>
        </div>
      </div>
    </div>
  )
}
