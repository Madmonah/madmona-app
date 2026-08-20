'use client'

/* ============================================================================
   /admin/business-finance/[supplierId]/permissions — صلاحيات موظفي البيزنس ده
   ============================================================================
   🎯 (٢٠ أغسطس ٢٠٢٦) محمد:
      «خلي ربط صلاحيات مضمونة في مضمونة الشركة»
      «صلاحيات موظفين الـB2B أو أي بيزنس B2B يكون داخل تاب الـB2B — كل بيزنس
       سواء معرض أو شركة عقارات أو شركة، كله يتضاف في الـB2B وكل موظف
       بصلاحياته»

   المشكلة اللي بيحلها التاب ده:
     `/admin/permissions` كانت **صفحة واحدة لكل شركات المنصة مع بعض**
     (مضمونة + كل عملاء B2B في مكان واحد)، والتقسيم بينهم مبني على **ID
     متحطوط في الكود**. ده خلّى:
       • صلاحيات مضمونة بعيدة عن إدارة مضمونة (٦٣ تاب ومفيهاش صلاحيات!)
       • صلاحيات كل عميل B2B بعيدة عن لوحة العميل نفسه
       • والتقسيم يتكسر أول ما الـID يتغيّر (حصل فعلًا النهاردة)

   الحل: **نفس الصفحة تشتغل لأي بيزنس** — بتقرا `supplierId` من الرابط
   وتعرض موظفينه هو بس. مضمونة بتوصلها من إدارة مضمونة، وأي عميل B2B
   بيوصلها من لوحته. مفيش تكرار ومفيش ID متحطوط.
   ============================================================================ */

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { adminRpc } from '@/lib/adminRpc'
import { supabaseBrowser } from '@/lib/supabase-browser'
import {
  Loader2, AlertCircle, ArrowRight, ShieldCheck, Search, Check,
  Users, Crown, Building2,
} from 'lucide-react'

/* 🚪 بابين للصفحة دي، فبنجرّب الاتنين:
     • صاحب البيزنس أو موظف عنده «يدير الفريق» → داخل بجلسة الأبليكيشن
       العادية (Supabase Auth) — بينادي الـRPC على طول.
     • محمد من لوحة الأدمن → داخل بكوكي البوابة (مش جلسة Supabase)، فلازم
       يعدّي على /api/admin/rpc.
   الداتابيز هي اللي بتحسم مين مسموح له (`can_manage_business_team`)،
   فمفيش خطر في إننا نجرّب الاتنين. */
async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  try {
    const { data, error } = await (supabaseBrowser.rpc as unknown as (
      f: string, a: Record<string, unknown>,
    ) => Promise<{ data: T | null; error: { message: string } | null }>)(fn, args)
    if (!error && data != null) return data
  } catch { /* نكمّل على باب الأدمن */ }
  return await adminRpc<T>(fn, args)
}

type Stage = 'loading' | 'error' | 'ready'
type Catalog = { key: string; label_ar: string; label_en: string | null }
type Emp = {
  id: string; full_name: string; role: string | null; role_ar: string | null
  branch: string | null; branch_code: string | null; pin: string | null
  status: string | null; permissions: Record<string, boolean>
}
type Supplier = {
  supplier_id: string; business_name: string; business_type: string | null
  is_platform_owner: boolean; employee_seats: number
  employee_count: number; employees: Emp[]
}
type Payload = { catalog: Catalog[]; supplier: Supplier }

export default function BusinessPermissionsPage({
  params,
}: { params: { supplierId: string } }) {
  const { supplierId } = params

  const [stage, setStage] = useState<Stage>('loading')
  const [error, setError] = useState<string | null>(null)
  const [catalog, setCatalog] = useState<Catalog[]>([])
  const [supplier, setSupplier] = useState<Supplier | null>(null)
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState<Record<string, boolean>>({})
  const [toast, setToast] = useState<string | null>(null)

  function flash(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2200)
  }

  // 🔎 نداء واحد بيرجّع الكتالوج + **البيزنس ده بس** (حتى لو لسه من غير
  //    موظفين) + هل هو الشركة الأم + عدد المقاعد. مفيش فلترة في الواجهة
  //    ومفيش ID متحطوط في الكود — الفرق كله جاي من `suppliers.is_platform_owner`.
  async function load() {
    try {
      const data = await rpc<Payload>('get_business_permissions', {
        p_supplier_id: supplierId,
      })
      setCatalog(data?.catalog ?? [])
      setSupplier(data?.supplier ?? null)
      setStage('ready')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'حصل خطأ')
      setStage('error')
    }
  }

  useEffect(() => { load() /* eslint-disable-next-line */ }, [supplierId])

  async function toggle(emp: Emp, key: string) {
    const k = `${emp.id}:${key}`
    setBusy(b => ({ ...b, [k]: true }))
    const next = !emp.permissions?.[key]
    try {
      await rpc('set_employee_permission', {
        p_employee_id: emp.id, p_key: key, p_value: next,
      })
      setSupplier(s => s && ({
        ...s,
        employees: s.employees.map(e =>
          e.id === emp.id ? { ...e, permissions: { ...e.permissions, [key]: next } } : e),
      }))
    } catch {
      flash('ماقدرناش نحفظ الصلاحية')
    } finally {
      setBusy(b => ({ ...b, [k]: false }))
    }
  }

  async function bulk(emp: Emp, on: boolean) {
    const k = `${emp.id}:__bulk__`
    setBusy(b => ({ ...b, [k]: true }))
    const perms: Record<string, boolean> = {}
    catalog.forEach(c => { perms[c.key] = on })
    try {
      await rpc('set_employee_permissions_bulk', {
        p_employee_id: emp.id, p_permissions: perms,
      })
      setSupplier(s => s && ({
        ...s,
        employees: s.employees.map(e => e.id === emp.id ? { ...e, permissions: perms } : e),
      }))
      flash(on ? 'اتفتحت كل الصلاحيات' : 'اتقفلت كل الصلاحيات')
    } catch {
      flash('ماقدرناش نحفظ')
    } finally {
      setBusy(b => ({ ...b, [k]: false }))
    }
  }

  const isOwnerCompany = supplier?.is_platform_owner === true

  const employees = useMemo(() => {
    const q = search.trim().toLowerCase()
    const all = supplier?.employees ?? []
    if (!q) return all
    return all.filter(e =>
      (e.full_name || '').toLowerCase().includes(q) ||
      (e.role_ar || '').toLowerCase().includes(q))
  }, [supplier, search])

  if (stage === 'loading') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center" dir="rtl">
        <Loader2 className="w-6 h-6 animate-spin text-[#059669]" />
      </div>
    )
  }

  if (stage === 'error') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-2xl border border-black/5 p-6 text-center max-w-sm">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="font-black mb-1">ماقدرناش نجيب الصلاحيات</p>
          <p className="text-xs text-[#6B7280]">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto p-4 pb-16" dir="rtl">
      <div className="flex items-center gap-3 mb-4">
        <Link
          href={`/admin/business-finance/${supplierId}`}
          className="w-9 h-9 bg-white border border-black/5 rounded-full flex items-center justify-center hover:bg-[#FAFAF7]"
        >
          <ArrowRight className="w-4 h-4 text-[#6B7280]" />
        </Link>
        <div className="min-w-0">
          <h1 className="text-base md:text-lg font-black leading-none flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#059669]" />
            صلاحيات الموظفين
          </h1>
          <p className="text-[11px] text-[#6B7280] mt-1 truncate">
            {supplier?.business_name ?? '—'}
            {isOwnerCompany && ' · الشركة الأم'}
            {supplier ? ` · ${supplier.employee_count} موظف` : ''}
          </p>
        </div>
      </div>

      {/* شريح توضيحي: البيزنس ده نوعه إيه */}
      <div className={`rounded-2xl px-4 py-3 mb-4 flex items-center gap-2.5 border ${
        isOwnerCompany
          ? 'bg-gradient-to-l from-[#D4A017]/10 to-[#34D399]/10 border-[#059669]/25'
          : 'bg-white border-black/5'
      }`}>
        {isOwnerCompany
          ? <Crown className="w-4 h-4 text-[#D4A017] flex-shrink-0" />
          : <Building2 className="w-4 h-4 text-[#059669] flex-shrink-0" />}
        <p className="text-[11px] text-[#4B5563] leading-relaxed">
          {isOwnerCompany
            ? 'دول موظفين مضمونة — الشركة اللي بتدير المنصة. صلاحياتهم بتشتغل على مستوى المنصة كلها.'
            : 'دول موظفين البيزنس ده بس. صلاحياتهم بتشتغل جوّه حسابه لوحده — مالهاش أي علاقة بباقي المنصة.'}
        </p>
      </div>

      {(supplier?.employees?.length ?? 0) > 3 && (
        <div className="relative mb-3">
          <Search className="w-4 h-4 text-[#9CA3AF] absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="دوّر باسم الموظف أو وظيفته"
            className="w-full bg-white border border-black/5 rounded-xl py-2.5 pr-9 pl-3 text-sm focus:outline-none focus:border-[#059669]/40"
          />
        </div>
      )}

      {!supplier || employees.length === 0 ? (
        <div className="bg-white rounded-2xl border border-black/5 p-8 text-center">
          <Users className="w-8 h-8 text-[#9CA3AF] mx-auto mb-2" />
          <p className="font-bold text-sm mb-1">
            {search ? 'مفيش نتيجة للبحث' : 'مفيش موظفين في البيزنس ده'}
          </p>
          {!search && (
            <Link
              href={`/admin/business-finance/${supplierId}/team`}
              className="text-xs font-bold text-[#059669] hover:underline"
            >
              ضيف موظفين من صفحة الفريق
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {employees.map(e => (
            <EmployeeRow
              key={e.id} e={e} catalog={catalog}
              onToggle={toggle} onBulk={bulk} busy={busy}
            />
          ))}
        </div>
      )}

      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-[#04352A] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  )
}

function EmployeeRow({ e, catalog, onToggle, onBulk, busy }: {
  e: Emp; catalog: Catalog[]
  onToggle: (e: Emp, k: string) => void
  onBulk: (e: Emp, on: boolean) => void
  busy: Record<string, boolean>
}) {
  const onCount = catalog.reduce((n, c) => n + (e.permissions?.[c.key] ? 1 : 0), 0)
  const bulkBusy = !!busy[`${e.id}:__bulk__`]
  const inactive = e.status && e.status !== 'active'

  return (
    <div className={`bg-white rounded-2xl border border-black/5 px-4 py-3 ${inactive ? 'opacity-60' : ''}`}>
      <div className="flex items-center justify-between gap-3 mb-2.5 flex-wrap">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-full bg-[#34D399]/10 text-[#059669] flex items-center justify-center font-black text-sm flex-shrink-0">
            {(e.full_name || '؟').trim().charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold truncate">{e.full_name}</p>
            <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
              {e.role_ar && (
                <span className="text-[9px] font-bold bg-[#FAFAF7] text-[#6B7280] px-1.5 py-0.5 rounded">
                  {e.role_ar}
                </span>
              )}
              {e.branch_code && <span className="text-[9px] font-mono text-[#6B7280]">{e.branch_code}</span>}
              {inactive && (
                <span className="text-[9px] font-bold bg-red-50 text-red-600 px-1.5 py-0.5 rounded">موقوف</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-[10px] font-bold text-[#059669]">{onCount}/{catalog.length}</span>
          <button
            disabled={bulkBusy} onClick={() => onBulk(e, true)}
            className="text-[10px] font-bold px-2 py-1 rounded-lg bg-[#34D399]/10 text-[#059669] hover:bg-[#34D399]/20 disabled:opacity-40"
          >الكل</button>
          <button
            disabled={bulkBusy} onClick={() => onBulk(e, false)}
            className="text-[10px] font-bold px-2 py-1 rounded-lg bg-gray-100 text-[#6B7280] hover:bg-gray-200 disabled:opacity-40"
          >مسح</button>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {catalog.map(c => {
          const on = !!e.permissions?.[c.key]
          const b = !!busy[`${e.id}:${c.key}`]
          return (
            <button
              key={c.key} disabled={b} onClick={() => onToggle(e, c.key)}
              className={`text-[11px] font-bold px-2.5 py-1.5 rounded-full border transition-all disabled:opacity-50 flex items-center gap-1 ${
                on
                  ? 'bg-gradient-to-br from-[#2FA084] to-[#34D399] text-white border-transparent shadow-sm'
                  : 'bg-white text-[#6B7280] border-black/10 hover:border-[#059669]/40'
              }`}
            >
              {on && <Check className="w-3 h-3" />}
              {c.label_ar}
            </button>
          )
        })}
      </div>
    </div>
  )
}
