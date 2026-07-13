'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
// 🔐 كل الـRPCs هنا محميّة بصلاحية أدمن — لازم تعدّي من بوابة الأدمن على السيرفر
import { adminRpc } from '@/lib/adminRpc'
import {
  Loader2, Lock, AlertCircle, ArrowRight, ShieldCheck, Search,
  Plus, Check, ChevronDown, X, Building2, Crown, Users,
} from 'lucide-react'

/* ============================================================
   /admin/permissions — صلاحيات الموظفين (dynamic, per-employee)
   فصل تام: مضمونة (فريق المنصة) ≠ عملاء B2B (Elite وغيره).
   DB RPCs:
     get_employee_permissions_overview()
     set_employee_permission(p_employee_id,p_key,p_value)
     set_employee_permissions_bulk(p_employee_id,p_permissions)
     add_permission_to_catalog(p_key,p_label_ar,p_label_en)
   ============================================================ */

const MADMONA_ID = 'c8b7b9d7-6178-4d0c-abdf-66f34b628e9d'

type Stage = 'loading' | 'unauthenticated' | 'forbidden' | 'ready'
type Catalog = { key: string; label_ar: string; label_en: string | null }
type Emp = {
  id: string; full_name: string; role: string | null; role_ar: string | null;
  branch: string | null; branch_code: string | null; pin: string | null;
  status: string | null; permissions: Record<string, boolean>
}
type Supplier = { supplier_id: string; business_name: string; employee_count: number; employees: Emp[] }
type Overview = { catalog: Catalog[]; suppliers: Supplier[] }

export default function PermissionsPage() {
  const [stage, setStage] = useState<Stage>('loading')
  const [ov, setOv] = useState<Overview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState<Record<string, boolean>>({})
  const [toast, setToast] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)

  function flash(m: string) { setToast(m); setTimeout(() => setToast(null), 2500) }

  function toggleGroup(id: string) {
    setOpen(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  }

  // 🔐 (13 Jul 2026) قبل كده كانت بتطلب جلسة Supabase وتنادي الـRPC من المتصفح
  // — والصفحة تحت /admin اللي مقفولة بكوكي مش بـ Supabase Auth، فـ auth.uid() = NULL
  // و is_admin() = false → forbidden، وصفحة الصلاحيات كلها مكانتش بتشتغل.
  // دلوقتي بتعدّي من /api/admin/rpc اللي بيتأكد من الكوكي على السيرفر.
  async function load() {
    try {
      const data = await adminRpc<Overview>('get_employee_permissions_overview')
      setOv(data)
      setOpen(new Set([MADMONA_ID]))
      setStage('ready')
    } catch (e) {
      const m = (e instanceof Error ? e.message : '').toLowerCase()
      if (m.includes('بوابة الأدمن') || m.includes('forbidden')) { setStage('forbidden'); return }
      setError(e instanceof Error ? e.message : 'فشل التحميل'); setStage('ready')
    }
  }

  useEffect(() => { load() }, [])

  function applyPerms(o: Overview, empId: string, perms: Record<string, boolean>): Overview {
    return {
      ...o,
      suppliers: o.suppliers.map(s => ({
        ...s,
        employees: s.employees.map(e => e.id === empId ? { ...e, permissions: perms } : e),
      })),
    }
  }

  async function toggle(emp: Emp, key: string) {
    const prev = emp.permissions || {}
    const value = !prev[key]
    const next = { ...prev, [key]: value }
    const lock = `${emp.id}:${key}`
    setBusy(b => ({ ...b, [lock]: true }))
    setOv(o => o ? applyPerms(o, emp.id, next) : o)
    try {
      await adminRpc('set_employee_permission', { p_employee_id: emp.id, p_key: key, p_value: value })
    } catch (e: any) {
      setOv(o => o ? applyPerms(o, emp.id, prev) : o)
      flash(e?.message || 'فشل الحفظ، حاول تاني')
    } finally {
      setBusy(b => { const n = { ...b }; delete n[lock]; return n })
    }
  }

  async function bulk(emp: Emp, allOn: boolean) {
    if (!ov) return
    const prev = emp.permissions || {}
    const perms = allOn ? Object.fromEntries(ov.catalog.map(c => [c.key, true])) : {}
    const lock = `${emp.id}:__bulk__`
    setBusy(b => ({ ...b, [lock]: true }))
    setOv(o => o ? applyPerms(o, emp.id, perms) : o)
    try {
      await adminRpc('set_employee_permissions_bulk', { p_employee_id: emp.id, p_permissions: perms })
    } catch (e: any) {
      setOv(o => o ? applyPerms(o, emp.id, prev) : o)
      flash(e?.message || 'فشل الحفظ، حاول تاني')
    } finally {
      setBusy(b => { const n = { ...b }; delete n[lock]; return n })
    }
  }

  if (stage === 'loading') return <Center><Loader2 className="w-8 h-8 text-[#1F6F5F] animate-spin" /></Center>
  if (stage === 'unauthenticated') return (
    <Center>
      <div className="bg-white rounded-3xl p-8 text-center max-w-sm shadow-sm">
        <Lock className="w-8 h-8 text-[#1F6F5F] mx-auto mb-3" />
        <h1 className="text-lg font-black text-[#1A2E26] mb-3">سجّل دخول الأول</h1>
        <Link href="/auth/login?redirect=/admin/permissions" className="block bg-[#1F6F5F] text-white py-3 rounded-xl font-bold">تسجيل دخول</Link>
      </div>
    </Center>
  )
  if (stage === 'forbidden') return (
    <Center>
      <div className="bg-white rounded-3xl p-8 text-center max-w-sm shadow-sm">
        <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
        <h1 className="text-lg font-black text-[#1A2E26]">للأدمن بس</h1>
      </div>
    </Center>
  )
  if (error || !ov) return (
    <Center>
      <div className="bg-white rounded-3xl p-8 text-center max-w-sm shadow-sm">
        <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-3" />
        <p className="text-sm text-[#6B7280] mb-4">{error || 'مفيش بيانات'}</p>
        <button onClick={load} className="bg-[#1F6F5F] text-white px-5 py-2.5 rounded-xl font-bold">حاول تاني</button>
      </div>
    </Center>
  )

  const madmona = ov.suppliers.find(s => s.supplier_id === MADMONA_ID)
  const clients = ov.suppliers.filter(s => s.supplier_id !== MADMONA_ID)
  const searching = search.trim().length > 0

  return (
    <div className="min-h-screen text-[#1A2E26]" dir="rtl" style={{ background: 'radial-gradient(1100px 560px at 88% -8%, rgba(47,160,132,0.10), transparent 60%), radial-gradient(900px 480px at -5% 4%, rgba(31,111,95,0.09), transparent 55%), radial-gradient(800px 500px at 50% 118%, rgba(212,160,23,0.06), transparent 60%), #FAFAF7' }}>
      <header className="sticky top-0 z-30 border-b border-[#1F6F5F]/10 bg-white/70 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/admin/dashboard" className="w-9 h-9 bg-[#FAFAF7] hover:bg-gray-100 rounded-xl flex items-center justify-center"><ArrowRight className="w-4 h-4 text-[#6B7280]" /></Link>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D4A017] via-[#2FA084] to-[#1F6F5F] flex items-center justify-center text-white shadow"><ShieldCheck className="w-5 h-5" /></div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black tracking-[0.3em] uppercase bg-gradient-to-r from-[#D4A017] to-[#1F6F5F] bg-clip-text text-transparent">PERMISSIONS</p>
            <h1 className="text-base md:text-lg font-black leading-none">صلاحيات الموظفين</h1>
          </div>
          <button onClick={() => setAddOpen(true)} className="flex items-center gap-1.5 bg-[#1F6F5F] text-white text-xs font-bold px-3 py-2 rounded-xl hover:bg-[#185547]"><Plus className="w-4 h-4" /> صلاحية جديدة</button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-5 space-y-6 pb-24">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="دوّر باسم الموظف أو الـ PIN…"
            className="w-full bg-white border border-black/5 rounded-2xl pr-10 pl-4 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1F6F5F]/30" />
        </div>

        {/* ===== مضمونة — فريق المنصة ===== */}
        <section>
          <SectionHead icon={<Crown className="w-4 h-4" />} title="فريق مضمونة · المنصة" note="دول موظفين الشركة نفسها — مش عملاء" />
          {madmona ? (
            <SupplierGroup s={madmona} catalog={ov.catalog} search={search}
              open={searching || open.has(madmona.supplier_id)} onToggleOpen={() => toggleGroup(madmona.supplier_id)}
              onToggle={toggle} onBulk={bulk} busy={busy} platform />
          ) : <Empty text="مفيش موظفين لمضمونة" />}
        </section>

        {/* ===== عملاء B2B ===== */}
        <section>
          <SectionHead icon={<Building2 className="w-4 h-4" />} title="عملاء B2B" note="كل عميل بيدير فريقه (Elite وغيره) — منفصل تماماً عن مضمونة" />
          {clients.length ? (
            <div className="space-y-3">
              {clients.map(s => (
                <SupplierGroup key={s.supplier_id} s={s} catalog={ov.catalog} search={search}
                  open={searching || open.has(s.supplier_id)} onToggleOpen={() => toggleGroup(s.supplier_id)}
                  onToggle={toggle} onBulk={bulk} busy={busy} />
              ))}
            </div>
          ) : <Empty text="مفيش عملاء بموظفين" />}
        </section>
      </main>

      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 bg-[#1A2E26] text-white text-sm font-bold px-5 py-3 rounded-2xl shadow-lg">{toast}</div>
      )}

      {addOpen && (
        <AddPermModal
          onClose={() => setAddOpen(false)}
          onDone={async () => { setAddOpen(false); await load(); flash('اتضافت الصلاحية') }}
          onError={() => flash('فشل الإضافة')} />
      )}
    </div>
  )
}

/* ============================================================ */

function SupplierGroup({ s, catalog, search, open, onToggleOpen, onToggle, onBulk, busy, platform }: {
  s: Supplier; catalog: Catalog[]; search: string; open: boolean;
  onToggleOpen: () => void; onToggle: (e: Emp, k: string) => void; onBulk: (e: Emp, on: boolean) => void;
  busy: Record<string, boolean>; platform?: boolean
}) {
  const q = search.trim().toLowerCase()
  const emps = q
    ? s.employees.filter(e => (e.full_name || '').toLowerCase().includes(q) || (e.pin || '').includes(q))
    : s.employees
  if (q && emps.length === 0) return null
  return (
    <div className={`bg-white rounded-2xl border ${platform ? 'border-[#1F6F5F]/30' : 'border-black/5'} shadow-sm overflow-hidden`}>
      <button onClick={onToggleOpen} className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-[#FAFAF7]/60">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white flex-shrink-0 ${platform ? 'bg-gradient-to-br from-[#D4A017] via-[#2FA084] to-[#1F6F5F]' : 'bg-[#1F6F5F]/90'}`}><Building2 className="w-4 h-4" /></div>
          <div className="text-right min-w-0">
            <p className="text-sm font-black truncate">{s.business_name}</p>
            <p className="text-[10px] text-[#6B7280]">{emps.length} موظف{q ? ' · نتيجة بحث' : ''}</p>
          </div>
        </div>
        <ChevronDown className={`w-5 h-5 text-[#6B7280] transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="divide-y divide-gray-50 border-t border-gray-50">
          {emps.map(e => <EmployeeRow key={e.id} e={e} catalog={catalog} onToggle={onToggle} onBulk={onBulk} busy={busy} />)}
        </div>
      )}
    </div>
  )
}

function EmployeeRow({ e, catalog, onToggle, onBulk, busy }: {
  e: Emp; catalog: Catalog[]; onToggle: (e: Emp, k: string) => void; onBulk: (e: Emp, on: boolean) => void; busy: Record<string, boolean>
}) {
  const onCount = catalog.reduce((n, c) => n + (e.permissions?.[c.key] ? 1 : 0), 0)
  const bulkBusy = !!busy[`${e.id}:__bulk__`]
  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between gap-3 mb-2.5 flex-wrap">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-full bg-[#1F6F5F]/10 text-[#1F6F5F] flex items-center justify-center font-black text-sm flex-shrink-0">{(e.full_name || '؟').trim().charAt(0)}</div>
          <div className="min-w-0">
            <p className="text-sm font-bold truncate">{e.full_name}</p>
            <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
              {e.role_ar && <span className="text-[9px] font-bold bg-[#FAFAF7] text-[#6B7280] px-1.5 py-0.5 rounded">{e.role_ar}</span>}
              {e.branch_code && <span className="text-[9px] font-mono text-[#6B7280]">{e.branch_code}</span>}
              {e.pin && <span className="text-[9px] font-mono text-[#6B7280]">PIN {e.pin}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-[10px] font-bold text-[#1F6F5F]">{onCount}/{catalog.length}</span>
          <button disabled={bulkBusy} onClick={() => onBulk(e, true)} className="text-[10px] font-bold px-2 py-1 rounded-lg bg-[#1F6F5F]/10 text-[#1F6F5F] hover:bg-[#1F6F5F]/20 disabled:opacity-40">الكل</button>
          <button disabled={bulkBusy} onClick={() => onBulk(e, false)} className="text-[10px] font-bold px-2 py-1 rounded-lg bg-gray-100 text-[#6B7280] hover:bg-gray-200 disabled:opacity-40">مسح</button>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {catalog.map(c => {
          const on = !!e.permissions?.[c.key]
          const b = !!busy[`${e.id}:${c.key}`]
          return (
            <button key={c.key} disabled={b} onClick={() => onToggle(e, c.key)}
              className={`text-[11px] font-bold px-2.5 py-1.5 rounded-full border transition-all disabled:opacity-50 flex items-center gap-1 ${
                on ? 'bg-gradient-to-br from-[#2FA084] to-[#1F6F5F] text-white border-transparent shadow-sm'
                   : 'bg-white text-[#6B7280] border-black/10 hover:border-[#1F6F5F]/40'
              }`}>
              {on && <Check className="w-3 h-3" />}
              {c.label_ar}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function AddPermModal({ onClose, onDone, onError }: { onClose: () => void; onDone: () => void; onError: () => void }) {
  const [labelAr, setLabelAr] = useState('')
  const [key, setKey] = useState('')
  const [saving, setSaving] = useState(false)
  async function save() {
    if (!labelAr.trim()) return
    setSaving(true)
    try {
      await adminRpc('add_permission_to_catalog', {
        p_key: key.trim() || `perm_${Date.now()}`,
        p_label_ar: labelAr.trim(),
        p_label_en: null,
      })
      onDone()
    } catch { onError() } finally { setSaving(false) }
  }
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" dir="rtl" onClick={onClose}>
      <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-black text-[#1A2E26]">صلاحية جديدة</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-[#FAFAF7] flex items-center justify-center"><X className="w-4 h-4 text-[#6B7280]" /></button>
        </div>
        <label className="block text-xs font-bold text-[#6B7280] mb-1">الاسم بالعربي</label>
        <input value={labelAr} onChange={e => setLabelAr(e.target.value)} placeholder="مثلاً: يعدّل الأسعار"
          className="w-full bg-[#FAFAF7] border border-black/5 rounded-xl px-3 py-2.5 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-[#1F6F5F]/30" />
        <label className="block text-xs font-bold text-[#6B7280] mb-1">المفتاح (اختياري · إنجليزي)</label>
        <input value={key} onChange={e => setKey(e.target.value)} placeholder="can_edit_pricing" dir="ltr"
          className="w-full bg-[#FAFAF7] border border-black/5 rounded-xl px-3 py-2.5 text-sm mb-4 font-mono focus:outline-none focus:ring-2 focus:ring-[#1F6F5F]/30" />
        <button onClick={save} disabled={saving || !labelAr.trim()}
          className="w-full bg-[#1F6F5F] text-white py-3 rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} أضف
        </button>
      </div>
    </div>
  )
}

function Center({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4" dir="rtl">{children}</div>
}

function SectionHead({ icon, title, note }: { icon: ReactNode; title: string; note: string }) {
  return (
    <div className="mb-3 flex items-start gap-2.5">
      <span className="mt-0.5 w-8 h-8 rounded-xl bg-gradient-to-br from-[#D4A017] to-[#1F6F5F] text-white flex items-center justify-center flex-shrink-0">{icon}</span>
      <div>
        <h2 className="text-base font-black text-[#1A2E26]">{title}</h2>
        <p className="text-[11px] text-[#6B7280] mt-0.5">{note}</p>
      </div>
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-6 text-center">
      <Users className="w-8 h-8 text-[#6B7280] opacity-30 mx-auto mb-2" />
      <p className="text-sm text-[#6B7280]">{text}</p>
    </div>
  )
}
