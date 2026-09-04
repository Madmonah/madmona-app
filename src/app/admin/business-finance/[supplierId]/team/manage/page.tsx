'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { withToken } from '@/lib/rpc'
import {
  ChevronLeft, Loader2, RefreshCw, Search, Save, Check,
  Building2, Phone, Users, AlertCircle, Mail, Lock,
} from 'lucide-react'

/* ============================================================
   /admin/business-finance/[supplierId]/team/manage
   Edit employee phone + PIN, and move employees between branches.
   🔐 (١٩ أغسطس ٢٠٢٦ — محمد: «الكلوك ان و اوت هيتم عن طريق رقم التلفون
   أو الإيميل والباسورد») — ضفنا إيميل + زرار "تعيين باسورد" هنا عشان
   الموظف يقدر يدخل صفحة الحضور بإيميله وباسورده بدل الـPIN.
   ============================================================ */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

// 🔐 (٥/٩/٢٠٢٦) نفس العميل + p_token للدوال المحروسة — شوف withToken في lib/rpc.ts
const sbTok = withToken(supabase)

type Branch = { id: string; name: string; code: string | null }
type Emp = {
  employee_id: string
  full_name: string
  role_ar: string | null
  branch_id: string | null
  branch_name: string | null
  branch_code: string | null
  phone: string | null
  pin_code: string | null
  status: string
  email: string | null
  has_password: boolean
}
type Draft = { phone: string; pin: string; branch_id: string; email: string }
type RowState = { saving: boolean; msg: string; err: boolean }

export default function ManageTeamPage({ params }: { params: { supplierId: string } }) {
  const { supplierId } = params
  const [supplierName, setSupplierName] = useState('')
  const [branches, setBranches] = useState<Branch[]>([])
  const [emps, setEmps] = useState<Emp[]>([])
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [rowState, setRowState] = useState<Record<string, RowState>>({})
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')

  async function loadAll() {
    setLoading(true)
    const { data: sup } = await sbTok.rpc('business_supplier_head', { p_supplier_id: supplierId })
    setSupplierName((sup as any)?.business_name || '')

    const { data: br } = await supabase.from('supplier_branches')
      .select('id, name, code').eq('supplier_id', supplierId).order('code')
    setBranches((br || []) as Branch[])

    const { data: emp } = await sbTok.rpc('admin_list_employees_for_manage', {
      p_supplier_id: supplierId,
    })
    const list = (emp || []) as Emp[]
    setEmps(list)
    const d: Record<string, Draft> = {}
    for (const e of list) {
      d[e.employee_id] = {
        phone: e.phone || '',
        pin: e.pin_code || '',
        branch_id: e.branch_id || '',
        email: e.email || '',
      }
    }
    setDrafts(d)
    setRowState({})
    setLoading(false)
  }

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplierId])

  function setDraft(id: string, patch: Partial<Draft>) {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }))
  }

  function isDirty(e: Emp): boolean {
    const d = drafts[e.employee_id]
    if (!d) return false
    return (
      d.phone !== (e.phone || '') ||
      d.pin !== (e.pin_code || '') ||
      d.branch_id !== (e.branch_id || '') ||
      d.email !== (e.email || '')
    )
  }

  async function saveRow(e: Emp) {
    const d = drafts[e.employee_id]
    if (!d) return
    setRowState((p) => ({ ...p, [e.employee_id]: { saving: true, msg: '', err: false } }))

    if (d.phone !== (e.phone || '') || d.pin !== (e.pin_code || '') || d.email !== (e.email || '')) {
      const { data: r1 } = await sbTok.rpc('admin_update_employee_contact', {
        p_employee_id: e.employee_id, p_phone: d.phone, p_pin: d.pin, p_email: d.email,
      })
      if (r1 && (r1 as any).ok === false) {
        setRowState((p) => ({ ...p, [e.employee_id]: { saving: false, msg: (r1 as any).error, err: true } }))
        return
      }
    }
    if (d.branch_id !== (e.branch_id || '')) {
      const { data: r2 } = await sbTok.rpc('admin_move_employee_branch', {
        p_employee_id: e.employee_id, p_branch_id: d.branch_id || null,
      })
      if (r2 && (r2 as any).ok === false) {
        setRowState((p) => ({ ...p, [e.employee_id]: { saving: false, msg: (r2 as any).error, err: true } }))
        return
      }
    }

    setRowState((p) => ({ ...p, [e.employee_id]: { saving: false, msg: 'اتحفظ ✓', err: false } }))
    setEmps((prev) => prev.map((x) => x.employee_id === e.employee_id
      ? { ...x, phone: d.phone || null, pin_code: d.pin || null,
          branch_id: d.branch_id || null,
          branch_name: branches.find((b) => b.id === d.branch_id)?.name || null,
          branch_code: branches.find((b) => b.id === d.branch_id)?.code || null,
          email: d.email || null }
      : x))
    setTimeout(() => {
      setRowState((p) => ({ ...p, [e.employee_id]: { saving: false, msg: '', err: false } }))
    }, 2500)
  }

  async function setPassword(e: Emp) {
    if (!(drafts[e.employee_id]?.email || e.email)) {
      window.alert('سجّل إيميل الموظف واحفظه الأول قبل ما تحدد باسورد')
      return
    }
    const pw = window.prompt(`باسورد جديد لـ ${e.full_name} (٦ حروف/أرقام على الأقل):`)
    if (!pw) return
    const { data } = await sbTok.rpc('employee_set_password', { p_employee_id: e.employee_id, p_password: pw })
    if ((data as any)?.ok) {
      setEmps((prev) => prev.map((x) => x.employee_id === e.employee_id ? { ...x, has_password: true } : x))
      setRowState((p) => ({ ...p, [e.employee_id]: { saving: false, msg: 'اتحدد الباسورد ✓', err: false } }))
      setTimeout(() => setRowState((p) => ({ ...p, [e.employee_id]: { saving: false, msg: '', err: false } })), 2500)
    } else {
      window.alert((data as any)?.error || 'حصل خطأ')
    }
  }

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return emps
    return emps.filter((e) =>
      e.full_name.toLowerCase().includes(term) ||
      (e.phone || '').includes(term) ||
      (e.email || '').toLowerCase().includes(term) ||
      (e.pin_code || '').includes(term))
  }, [emps, q])

  const grouped = useMemo(() => {
    const map = new Map<string, Emp[]>()
    for (const e of filtered) {
      const key = e.branch_id || 'no_branch'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(e)
    }
    return map
  }, [filtered])

  const branchLabel = (id: string) => {
    if (id === 'no_branch') return 'بدون فرع'
    const b = branches.find((x) => x.id === id)
    return b ? `${b.name}${b.code ? ` (${b.code})` : ''}` : 'فرع'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl">
        <Loader2 className="w-8 h-8 text-[#059669] animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <Link
            href={`/admin/business-finance/${supplierId}/team`}
            className="text-xs font-bold text-[#6B7280] hover:text-[#059669] flex items-center gap-1 mb-2 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> رجوع للفريق
          </Link>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#059669] mb-1">
                إدارة الموظفين
              </p>
              <h1 className="text-2xl md:text-3xl font-black text-[#1A2E26] tracking-tight">
                أرقام وفروع — {supplierName}
              </h1>
              <p className="text-sm text-[#6B7280] mt-1">
                {emps.length} موظف · عدّل الرقم/الإيميل أو انقل الموظف لفرع تاني
              </p>
            </div>
            <button
              onClick={loadAll}
              className="px-4 py-2 rounded-xl bg-[#FAFAF7] hover:bg-gray-100 text-sm font-bold text-[#1A2E26] flex items-center gap-2 transition-colors border border-gray-200"
            >
              <RefreshCw className="w-4 h-4" /> تحديث
            </button>
          </div>

          <div className="mt-4 relative">
            <Search className="w-4 h-4 text-[#6B7280] absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ابحث بالاسم أو الرقم أو الإيميل..."
              className="w-full bg-[#FAFAF7] rounded-xl pr-10 pl-4 py-2.5 text-sm text-[#1A2E26] focus:outline-none focus:ring-2 focus:ring-[#059669]/30 border border-gray-200 placeholder-[#6B7280]"
            />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div className="bg-[#34D399]/5 border border-[#059669]/20 rounded-2xl p-3 text-xs text-[#1A2E26] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-[#059669] flex-shrink-0" />
          <span>عدّل أي خانة وزرار الحفظ هينوّر. الموظف بقى يسجّل حضوره برقم موبايله أو بإيميله+باسورده (زرار "حدد باسورد") — الـPIN القديم اختياري ومش لازم.</span>
        </div>

        {[...grouped.entries()]
          .sort((a, b) => branchLabel(a[0]).localeCompare(branchLabel(b[0]), 'ar'))
          .map(([branchKey, rows]) => (
          <section key={branchKey} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-3 bg-[#FAFAF7]/50">
              <div className="inline-grid place-items-center w-9 h-9 rounded-xl bg-[#34D399]/10 text-[#059669]">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-[#1A2E26] leading-tight">{branchLabel(branchKey)}</h3>
                <p className="text-xs text-[#6B7280]">{rows.length} موظف</p>
              </div>
            </div>

            <div className="divide-y divide-gray-50">
              {rows.map((e) => {
                const d = drafts[e.employee_id]
                const st = rowState[e.employee_id]
                const dirty = isDirty(e)
                return (
                  <div key={e.employee_id} className="px-4 py-3 flex flex-col md:flex-row md:items-center gap-3">
                    <div className="flex items-center gap-3 md:w-56 flex-shrink-0">
                      <div className="inline-grid place-items-center w-10 h-10 rounded-xl bg-[#34D399]/10 text-[#059669] font-black flex-shrink-0">
                        {e.full_name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-black text-[#1A2E26] truncate">{e.full_name}</p>
                        <p className="text-[11px] text-[#6B7280] truncate">{e.role_ar || '—'}</p>
                      </div>
                    </div>

                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      <label className="relative">
                        <Phone className="w-3.5 h-3.5 text-[#6B7280] absolute right-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          value={d?.phone ?? ''}
                          onChange={(ev) => setDraft(e.employee_id, { phone: ev.target.value })}
                          placeholder="رقم الموبايل"
                          inputMode="tel"
                          className="w-full bg-[#FAFAF7] rounded-lg pr-8 pl-2 py-2 text-sm text-[#1A2E26] focus:outline-none focus:ring-2 focus:ring-[#059669]/30 border border-gray-200 placeholder-[#6B7280]"
                        />
                      </label>
                      <label className="relative">
                        <Mail className="w-3.5 h-3.5 text-[#6B7280] absolute right-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          value={d?.email ?? ''}
                          onChange={(ev) => setDraft(e.employee_id, { email: ev.target.value })}
                          placeholder="الإيميل (لتسجيل حضور بباسورد)"
                          dir="ltr"
                          className="w-full bg-[#FAFAF7] rounded-lg pr-8 pl-2 py-2 text-sm text-[#1A2E26] focus:outline-none focus:ring-2 focus:ring-[#059669]/30 border border-gray-200 placeholder-[#6B7280]"
                        />
                      </label>
                      <select
                        value={d?.branch_id ?? ''}
                        onChange={(ev) => setDraft(e.employee_id, { branch_id: ev.target.value })}
                        className="w-full bg-[#FAFAF7] rounded-lg px-2 py-2 text-sm text-[#1A2E26] focus:outline-none focus:ring-2 focus:ring-[#059669]/30 border border-gray-200"
                      >
                        <option value="">بدون فرع</option>
                        {branches.map((b) => (
                          <option key={b.id} value={b.id}>{b.name}{b.code ? ` (${b.code})` : ''}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2 md:w-52 justify-end flex-shrink-0">
                      {st?.msg && (
                        <span className={`text-[11px] font-bold ${st.err ? 'text-red-600' : 'text-[#059669]'}`}>
                          {st.msg}
                        </span>
                      )}
                      <button
                        onClick={() => setPassword(e)}
                        title="تعيين/تغيير باسورد الحضور"
                        className={`px-2.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all border ${
                          e.has_password
                            ? 'bg-[#34D399]/10 text-[#059669] border-[#059669]/20'
                            : 'bg-white text-[#6B7280] border-gray-200'
                        }`}
                      >
                        <Lock className="w-3.5 h-3.5" /> {e.has_password ? 'غيّر الباسورد' : 'حدد باسورد'}
                      </button>
                      <button
                        onClick={() => saveRow(e)}
                        disabled={!dirty || st?.saving}
                        className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                          dirty
                            ? 'bg-[#34D399] text-[#04352A] hover:opacity-90'
                            : 'bg-[#FAFAF7] text-[#6B7280] border border-gray-200 cursor-default'
                        }`}
                      >
                        {st?.saving
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : st?.msg && !st.err
                          ? <Check className="w-3.5 h-3.5" />
                          : <Save className="w-3.5 h-3.5" />}
                        حفظ
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        ))}

        {filtered.length === 0 && (
          <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-10 text-center">
            <Users className="w-9 h-9 text-[#6B7280] opacity-40 mx-auto mb-2" />
            <p className="text-sm font-bold text-[#1A2E26]">مفيش نتائج</p>
            <p className="text-xs text-[#6B7280] mt-1">جرّب كلمة بحث تانية</p>
          </div>
        )}
      </main>
    </div>
  )
}
