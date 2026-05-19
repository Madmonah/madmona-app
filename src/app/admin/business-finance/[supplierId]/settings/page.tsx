'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import {
  ChevronLeft, Plus, Trash2, Edit2, Save, X, Loader2,
  Building2, Users, BadgePercent, AlertCircle, Check, Sparkles,
  MapPin, Navigation, ShieldCheck,
} from 'lucide-react'

/* ============================================================
   /admin/business-finance/[supplierId]/settings
   Edit supplier · branches · employees · commission · contract
   ============================================================ */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Supplier = {
  id: string
  business_name: string
  industry: string | null
  contract_status: string
  commission_rate: number | null
  commission_extra_rate: number | null
  contact_phone: string | null
  contact_name: string | null
  contact_email: string | null
  address: string | null
  district: string | null
  city: string | null
}

type Branch = {
  id: string
  name: string
  code: string | null
  address: string | null
  district: string | null
  phone: string | null
  manager_name: string | null
  status: string
  latitude?: number | null
  longitude?: number | null
  geofence_radius_meters?: number | null
  geofence_enabled?: boolean | null
}

type Employee = {
  id: string
  branch_id: string | null
  full_name: string
  role: string
  role_ar: string | null
  phone: string | null
  status: string
  personal_commission_rate: number | null
}

type RoleTemplate = { role: string; role_ar: string }

export default function SettingsPage({
  params,
}: {
  params: { supplierId: string }
}) {
  const { supplierId } = params
  const [supplier, setSupplier] = useState<Supplier | null>(null)
  const [branches, setBranches] = useState<Branch[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [roles, setRoles] = useState<RoleTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'general' | 'branches' | 'employees' | 'commission'>('general')
  const [toast, setToast] = useState('')

  async function loadAll() {
    setLoading(true)
    const [supRes, brRes, empRes] = await Promise.all([
      // @ts-expect-error
      supabase.from('suppliers').select('*').eq('id', supplierId).single(),
      // @ts-expect-error
      supabase.from('supplier_branches').select('*').eq('supplier_id', supplierId).order('code'),
      // @ts-expect-error
      supabase.from('business_employees').select('*').eq('supplier_id', supplierId).order('role'),
    ])
    setSupplier(supRes.data as Supplier)
    setBranches((brRes.data || []) as Branch[])
    setEmployees((empRes.data || []) as Employee[])

    // Load role templates for this industry
    if (supRes.data?.industry) {
      // @ts-expect-error
      const { data: rt } = await supabase
        .from('employee_role_templates')
        .select('role, role_ar')
        .eq('industry', supRes.data.industry)
      setRoles((rt || []) as RoleTemplate[])
    }
    setLoading(false)
  }

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplierId])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  if (loading && !supplier) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl">
        <Loader2 className="w-8 h-8 text-[#1F6F5F] animate-spin" />
      </div>
    )
  }

  if (!supplier) return null

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <Link
            href={`/admin/business-finance/${supplierId}`}
            className="text-xs font-bold text-[#6B7280] hover:text-[#1F6F5F] flex items-center gap-1 mb-2 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            رجوع للـ finance
          </Link>
          <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#1F6F5F] mb-1">
            SETTINGS
          </p>
          <h1 className="text-2xl md:text-3xl font-black text-[#1A2E26] tracking-tight">
            إعدادات {supplier.business_name}
          </h1>

          {/* Tabs */}
          <div className="flex items-center gap-1 mt-5 bg-[#FAFAF7] rounded-xl p-1 w-fit border border-gray-100">
            {[
              { key: 'general', label: 'الأساسية' },
              { key: 'branches', label: `الفروع (${branches.length})` },
              { key: 'employees', label: `الموظفين (${employees.length})` },
              { key: 'commission', label: 'العمولة' },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key as any)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  tab === t.key
                    ? 'bg-[#1F6F5F] text-white shadow-sm'
                    : 'text-[#6B7280] hover:text-[#1A2E26]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {toast && (
          <div className="mb-4 bg-[#1F6F5F]/10 border border-[#1F6F5F]/30 rounded-xl px-4 py-3 text-sm text-[#1A2E26] flex items-center gap-2">
            <Check className="w-4 h-4 text-[#1F6F5F]" />
            {toast}
          </div>
        )}

        {tab === 'general' && (
          <GeneralTab supplier={supplier} onSaved={() => { loadAll(); showToast('تم الحفظ') }} />
        )}
        {tab === 'branches' && (
          <BranchesTab
            branches={branches}
            supplierId={supplierId}
            onChanged={() => { loadAll(); showToast('تم التحديث') }}
          />
        )}
        {tab === 'employees' && (
          <EmployeesTab
            employees={employees}
            branches={branches}
            roles={roles}
            supplierId={supplierId}
            onChanged={() => { loadAll(); showToast('تم التحديث') }}
          />
        )}
        {tab === 'commission' && (
          <CommissionTab supplier={supplier} onSaved={() => { loadAll(); showToast('تم تحديث العمولة') }} />
        )}
      </main>
    </div>
  )
}

/* ============================================================
   GENERAL TAB
   ============================================================ */
function GeneralTab({ supplier, onSaved }: { supplier: Supplier; onSaved: () => void }) {
  const [name, setName] = useState(supplier.business_name)
  const [contactName, setContactName] = useState(supplier.contact_name || '')
  const [contactPhone, setContactPhone] = useState(supplier.contact_phone || '')
  const [contactEmail, setContactEmail] = useState(supplier.contact_email || '')
  const [address, setAddress] = useState(supplier.address || '')
  const [district, setDistrict] = useState(supplier.district || '')
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    // @ts-expect-error
    await supabase.from('suppliers').update({
      business_name: name.trim(),
      contact_name: contactName.trim() || null,
      contact_phone: contactPhone.trim() || null,
      contact_email: contactEmail.trim() || supplier.contact_email,
      address: address.trim() || null,
      district: district.trim() || null,
      updated_at: new Date().toISOString(),
    }).eq('id', supplier.id)
    setSaving(false)
    onSaved()
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 md:p-6 space-y-4">
      <Field label="اسم الشركة">
        <input value={name} onChange={(e) => setName(e.target.value)} className={INPUT_CLASS} />
      </Field>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="اسم المسؤول">
          <input value={contactName} onChange={(e) => setContactName(e.target.value)} className={INPUT_CLASS} />
        </Field>
        <Field label="الهاتف">
          <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className={INPUT_CLASS} />
        </Field>
      </div>
      <Field label="الإيميل">
        <input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className={INPUT_CLASS} />
      </Field>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="الحي">
          <input value={district} onChange={(e) => setDistrict(e.target.value)} className={INPUT_CLASS} />
        </Field>
        <Field label="العنوان">
          <input value={address} onChange={(e) => setAddress(e.target.value)} className={INPUT_CLASS} />
        </Field>
      </div>
      <SaveButton onClick={save} loading={saving} />
    </div>
  )
}

/* ============================================================
   BRANCHES TAB
   ============================================================ */
function BranchesTab({
  branches, supplierId, onChanged,
}: { branches: Branch[]; supplierId: string; onChanged: () => void }) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  async function addBranch(b: Partial<Branch>) {
    // @ts-expect-error
    await supabase.from('supplier_branches').insert({
      supplier_id: supplierId,
      name: b.name?.trim() || 'فرع جديد',
      code: b.code?.trim() || `BR${branches.length + 1}`,
      address: b.address?.trim() || null,
      district: b.district?.trim() || null,
      phone: b.phone?.trim() || null,
      manager_name: b.manager_name?.trim() || null,
      status: 'active',
      opens_at: '10:00',
      closes_at: '22:00',
    })
    setAdding(false)
    onChanged()
  }

  async function updateBranch(id: string, updates: Partial<Branch>) {
    // @ts-expect-error
    await supabase.from('supplier_branches').update({
      ...updates,
      updated_at: new Date().toISOString(),
    }).eq('id', id)
    setEditingId(null)
    onChanged()
  }

  async function deleteBranch(id: string) {
    if (!confirm('متأكد؟ الـ branch هيتمسح + كل الموظفين عليه هيتنقلوا لـ "بدون فرع"')) return
    // @ts-expect-error
    await supabase.from('supplier_branches').delete().eq('id', id)
    onChanged()
  }

  return (
    <div className="space-y-3">
      {branches.map((b) => (
        editingId === b.id ? (
          <BranchEditForm
            key={b.id}
            branch={b}
            onSave={(updates) => updateBranch(b.id, updates)}
            onCancel={() => setEditingId(null)}
          />
        ) : (
          <div key={b.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="inline-grid place-items-center w-10 h-10 rounded-xl bg-[#1F6F5F]/10 text-[#1F6F5F] flex-shrink-0">
                <Building2 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-black text-[#1A2E26] truncate">{b.name}</h3>
                <p className="text-[11px] text-[#6B7280] truncate">
                  {b.code} · {b.district || '—'} · {b.manager_name || 'بدون مدير'} · {b.phone || '—'}
                </p>
                {b.latitude && b.longitude ? (
                  <p className="text-[10px] text-[#1F6F5F] font-mono mt-0.5 flex items-center gap-1">
                    <ShieldCheck className="w-2.5 h-2.5" />
                    GPS مفعّل ({b.latitude.toFixed(4)}, {b.longitude.toFixed(4)}) · ±{b.geofence_radius_meters || 100}م
                  </p>
                ) : (
                  <p className="text-[10px] text-amber-600 mt-0.5 flex items-center gap-1">
                    <AlertCircle className="w-2.5 h-2.5" />
                    مفيش GPS · الحضور جوول الفرع غير محمي
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => setEditingId(b.id)}
                className="p-2 text-[#6B7280] hover:text-[#1F6F5F] hover:bg-[#FAFAF7] rounded-lg transition-colors"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => deleteBranch(b.id)}
                className="p-2 text-[#6B7280] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        )
      ))}

      {adding ? (
        <BranchEditForm
          isNew
          branch={{ id: '', name: '', code: `BR${branches.length + 1}`, address: '', district: '', phone: '', manager_name: '', status: 'active' }}
          onSave={addBranch}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="w-full p-3 rounded-2xl border-2 border-dashed border-gray-300 hover:border-[#1F6F5F] text-[#6B7280] hover:text-[#1F6F5F] text-sm font-bold transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          اضف فرع
        </button>
      )}
    </div>
  )
}

function BranchEditForm({
  branch, onSave, onCancel, isNew,
}: {
  branch: Branch
  onSave: (b: Partial<Branch>) => void | Promise<void>
  onCancel: () => void
  isNew?: boolean
}) {
  const [name, setName] = useState(branch.name)
  const [code, setCode] = useState(branch.code || '')
  const [district, setDistrict] = useState(branch.district || '')
  const [address, setAddress] = useState(branch.address || '')
  const [phone, setPhone] = useState(branch.phone || '')
  const [manager, setManager] = useState(branch.manager_name || '')
  const [lat, setLat] = useState<number | ''>(branch.latitude ?? '')
  const [lng, setLng] = useState<number | ''>(branch.longitude ?? '')
  const [radius, setRadius] = useState<number>(branch.geofence_radius_meters || 150)
  const [geoEnabled, setGeoEnabled] = useState<boolean>(branch.geofence_enabled ?? true)
  const [locating, setLocating] = useState(false)
  const [locError, setLocError] = useState('')

  function useMyLocation() {
    setLocError('')
    if (!('geolocation' in navigator)) {
      setLocError('المتصفح ما يدعمش GPS')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(Number(pos.coords.latitude.toFixed(6)))
        setLng(Number(pos.coords.longitude.toFixed(6)))
        setLocating(false)
      },
      (err) => {
        setLocError(err.code === err.PERMISSION_DENIED ? 'السماح مرفوض' : 'فشل الموقع')
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 15000 },
    )
  }

  return (
    <div className="bg-white rounded-2xl border-2 border-[#1F6F5F] p-4 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم الفرع *" className={INPUT_SMALL} />
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="كود" className={`${INPUT_SMALL} font-mono`} />
        <input value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="الحي" className={INPUT_SMALL} />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="الهاتف" className={INPUT_SMALL} />
        <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="العنوان" className={`md:col-span-2 ${INPUT_SMALL}`} />
        <input value={manager} onChange={(e) => setManager(e.target.value)} placeholder="اسم المدير" className={`md:col-span-2 ${INPUT_SMALL}`} />
      </div>

      {/* GPS section */}
      <div className="bg-[#FAFAF7] rounded-xl p-3 space-y-2 border border-gray-100">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-[#1F6F5F]" />
            <p className="text-xs font-bold text-[#1A2E26]">موقع الفرع GPS</p>
          </div>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={geoEnabled} onChange={(e) => setGeoEnabled(e.target.checked)} className="w-3.5 h-3.5" />
            <span className="text-[11px] text-[#6B7280]">حماية الحضور</span>
          </label>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number" step="0.000001" value={lat}
            onChange={(e) => setLat(e.target.value === '' ? '' : Number(e.target.value))}
            placeholder="latitude" className={`${INPUT_SMALL} font-mono text-[11px]`}
          />
          <input
            type="number" step="0.000001" value={lng}
            onChange={(e) => setLng(e.target.value === '' ? '' : Number(e.target.value))}
            placeholder="longitude" className={`${INPUT_SMALL} font-mono text-[11px]`}
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[11px] text-[#6B7280] flex-shrink-0">نصف قطر السماح:</label>
          <input
            type="number" min="50" max="500" step="10" value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            className={`${INPUT_SMALL} font-mono w-20`}
          />
          <span className="text-[11px] text-[#6B7280]">متر</span>
        </div>
        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          className="w-full mt-1 py-2 rounded-lg bg-[#1F6F5F]/10 hover:bg-[#1F6F5F]/20 text-[#1F6F5F] text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          {locating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Navigation className="w-3.5 h-3.5" />}
          {locating ? 'جاري تحديد الموقع...' : 'حدد من موقعي الحالي (أنا في الفرع)'}
        </button>
        {locError && <p className="text-[11px] text-red-600">{locError}</p>}
        <p className="text-[10px] text-[#6B7280] leading-relaxed">
          ⓘ فتح الصفحة دي وإنت في الفرع واضغط “حدد من موقعي”. لو GPS متفعّل، أي موظف يدخل من خارج الفرع = رفض تسجيل الحضور.
        </p>
      </div>

      <div className="flex items-center justify-end gap-2 pt-2">
        <button onClick={onCancel} className="px-3 py-1.5 text-xs font-bold text-[#6B7280] hover:text-[#1A2E26]">إلغاء</button>
        <button
          onClick={() => onSave({
            name, code, district, address, phone, manager_name: manager,
            latitude: lat === '' ? null : Number(lat),
            longitude: lng === '' ? null : Number(lng),
            geofence_radius_meters: radius,
            geofence_enabled: geoEnabled,
          })}
          disabled={!name.trim()}
          className="px-4 py-1.5 rounded-lg bg-[#1F6F5F] text-white text-xs font-bold hover:shadow-md transition-shadow disabled:opacity-50 flex items-center gap-1"
        >
          <Save className="w-3 h-3" />
          {isNew ? 'اضف' : 'احفظ'}
        </button>
      </div>
    </div>
  )
}

/* ============================================================
   EMPLOYEES TAB
   ============================================================ */
function EmployeesTab({
  employees, branches, roles, supplierId, onChanged,
}: {
  employees: Employee[]
  branches: Branch[]
  roles: RoleTemplate[]
  supplierId: string
  onChanged: () => void
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [generating, setGenerating] = useState(false)

  async function addEmployee(e: Partial<Employee>) {
    const role = roles.find((r) => r.role === e.role)
    // @ts-expect-error
    await supabase.from('business_employees').insert({
      supplier_id: supplierId,
      branch_id: e.branch_id || null,
      full_name: e.full_name?.trim() || 'موظف جديد',
      role: e.role || 'staff',
      role_ar: role?.role_ar || e.role,
      phone: e.phone?.trim() || null,
      personal_commission_rate: e.personal_commission_rate || 0,
      status: 'active',
      avatar_initial: e.full_name?.trim().charAt(0) || 'م',
    })
    setAdding(false)
    onChanged()
  }

  async function updateEmployee(id: string, updates: Partial<Employee>) {
    const payload: any = { ...updates, updated_at: new Date().toISOString() }
    if (updates.role) {
      const role = roles.find((r) => r.role === updates.role)
      if (role) payload.role_ar = role.role_ar
    }
    // @ts-expect-error
    await supabase.from('business_employees').update(payload).eq('id', id)
    setEditingId(null)
    onChanged()
  }

  async function deleteEmployee(id: string) {
    if (!confirm('متأكد من حذف الموظف؟ كل tasks بتاعته هتتمسح كمان')) return
    // @ts-expect-error
    await supabase.from('business_employees').delete().eq('id', id)
    onChanged()
  }

  async function regenerateTasks() {
    setGenerating(true)
    // @ts-expect-error
    await supabase.rpc('generate_tasks_for_supplier_today', { p_supplier_id: supplierId })
    setGenerating(false)
    onChanged()
  }

  // Group by branch
  const byBranch = new Map<string, Employee[]>()
  for (const e of employees) {
    const key = e.branch_id || 'no_branch'
    if (!byBranch.has(key)) byBranch.set(key, [])
    byBranch.get(key)!.push(e)
  }

  return (
    <div className="space-y-4">
      {/* Action bar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-xs text-[#6B7280]">
          ⓘ كل موظف بـ يطلع له daily tasks تلقائي حسب دوره
        </p>
        <button
          onClick={regenerateTasks}
          disabled={generating}
          className="px-4 py-2 rounded-xl bg-[#FAFAF7] hover:bg-gray-100 text-xs font-bold text-[#1A2E26] flex items-center gap-2 transition-colors disabled:opacity-50"
        >
          <Sparkles className={`w-3 h-3 ${generating ? 'animate-pulse' : ''}`} />
          توليد مهام اليوم
        </button>
      </div>

      {/* Owner + no-branch group */}
      {(byBranch.get('no_branch') || []).map((e) => (
        editingId === e.id ? (
          <EmployeeEditForm key={e.id} employee={e} branches={branches} roles={roles}
            onSave={(updates) => updateEmployee(e.id, updates)} onCancel={() => setEditingId(null)} />
        ) : (
          <EmployeeRow key={e.id} employee={e} branchName="بدون فرع (إدارة عليا)"
            onEdit={() => setEditingId(e.id)} onDelete={() => deleteEmployee(e.id)} />
        )
      ))}

      {/* By branch */}
      {branches.map((b) => {
        const emps = byBranch.get(b.id) || []
        return (
          <div key={b.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-2.5 bg-[#FAFAF7] border-b border-gray-100">
              <p className="text-xs font-bold text-[#1A2E26]">
                {b.name} <span className="text-[#6B7280] font-normal">· {emps.length} موظف</span>
              </p>
            </div>
            <div className="divide-y divide-gray-50">
              {emps.length === 0 ? (
                <p className="text-xs text-[#6B7280] p-4 text-center">مفيش موظفين في الفرع ده</p>
              ) : (
                emps.map((e) => (
                  editingId === e.id ? (
                    <div key={e.id} className="p-3">
                      <EmployeeEditForm employee={e} branches={branches} roles={roles}
                        onSave={(updates) => updateEmployee(e.id, updates)} onCancel={() => setEditingId(null)} />
                    </div>
                  ) : (
                    <EmployeeRow key={e.id} employee={e}
                      onEdit={() => setEditingId(e.id)} onDelete={() => deleteEmployee(e.id)} />
                  )
                ))
              )}
            </div>
          </div>
        )
      })}

      {/* Add new */}
      {adding ? (
        <EmployeeEditForm isNew employee={{
          id: '', full_name: '', role: roles[0]?.role || 'staff', role_ar: '', phone: '',
          branch_id: branches[0]?.id || null, personal_commission_rate: 0, status: 'active',
        }} branches={branches} roles={roles}
          onSave={addEmployee} onCancel={() => setAdding(false)} />
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="w-full p-3 rounded-2xl border-2 border-dashed border-gray-300 hover:border-[#1F6F5F] text-[#6B7280] hover:text-[#1F6F5F] text-sm font-bold transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          اضف موظف
        </button>
      )}
    </div>
  )
}

function EmployeeRow({
  employee, branchName, onEdit, onDelete,
}: {
  employee: Employee
  branchName?: string
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-[#FAFAF7]/50">
      <div className="flex items-center gap-3 min-w-0">
        <div className="inline-grid place-items-center w-8 h-8 rounded-lg bg-[#1F6F5F]/10 text-[#1F6F5F] font-black text-xs flex-shrink-0">
          {employee.full_name.charAt(0)}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-[#1A2E26] truncate">{employee.full_name}</p>
          <p className="text-[11px] text-[#6B7280] truncate">
            {employee.role_ar || employee.role}
            {employee.personal_commission_rate ? ` · عمولته ${employee.personal_commission_rate}%` : ''}
            {employee.phone ? ` · ${employee.phone}` : ''}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button onClick={onEdit} className="p-1.5 text-[#6B7280] hover:text-[#1F6F5F] hover:bg-white rounded transition-colors">
          <Edit2 className="w-3.5 h-3.5" />
        </button>
        <button onClick={onDelete} className="p-1.5 text-[#6B7280] hover:text-red-600 hover:bg-white rounded transition-colors">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

function EmployeeEditForm({
  employee, branches, roles, onSave, onCancel, isNew,
}: {
  employee: Employee
  branches: Branch[]
  roles: RoleTemplate[]
  onSave: (e: Partial<Employee>) => void | Promise<void>
  onCancel: () => void
  isNew?: boolean
}) {
  const [name, setName] = useState(employee.full_name)
  const [role, setRole] = useState(employee.role)
  const [phone, setPhone] = useState(employee.phone || '')
  const [branchId, setBranchId] = useState(employee.branch_id || '')
  const [commission, setCommission] = useState(employee.personal_commission_rate || 0)

  return (
    <div className="bg-white rounded-2xl border-2 border-[#1F6F5F] p-4 space-y-2">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="الاسم *" className={INPUT_SMALL} />
        <select value={role} onChange={(e) => setRole(e.target.value)} className={INPUT_SMALL}>
          {roles.map((r) => (
            <option key={r.role} value={r.role}>{r.role_ar}</option>
          ))}
        </select>
        <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className={INPUT_SMALL}>
          <option value="">بدون فرع (إدارة عليا)</option>
          {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="الهاتف" className={INPUT_SMALL} />
        <div className="md:col-span-2">
          <label className="text-[11px] text-[#6B7280]">عمولته الشخصية (%)</label>
          <input
            type="number"
            min="0"
            max="50"
            value={commission}
            onChange={(e) => setCommission(Number(e.target.value))}
            className={`${INPUT_SMALL} mt-1 font-mono`}
          />
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 pt-2">
        <button onClick={onCancel} className="px-3 py-1.5 text-xs font-bold text-[#6B7280] hover:text-[#1A2E26]">إلغاء</button>
        <button
          onClick={() => onSave({
            full_name: name, role, phone, branch_id: branchId || null,
            personal_commission_rate: commission,
          })}
          disabled={!name.trim()}
          className="px-4 py-1.5 rounded-lg bg-[#1F6F5F] text-white text-xs font-bold hover:shadow-md transition-shadow disabled:opacity-50 flex items-center gap-1"
        >
          <Save className="w-3 h-3" />
          {isNew ? 'اضف' : 'احفظ'}
        </button>
      </div>
    </div>
  )
}

/* ============================================================
   COMMISSION TAB
   ============================================================ */
function CommissionTab({ supplier, onSaved }: { supplier: Supplier; onSaved: () => void }) {
  const [base, setBase] = useState(Number(supplier.commission_rate) || 0)
  const [extra, setExtra] = useState(Number(supplier.commission_extra_rate) || 0)
  const [status, setStatus] = useState(supplier.contract_status)
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    const payload: any = {
      commission_rate: base,
      commission_extra_rate: extra,
      contract_status: status,
      updated_at: new Date().toISOString(),
    }
    if (status === 'signed' || status === 'active') {
      payload.contract_signed_at = new Date().toISOString()
    }
    // @ts-expect-error
    await supabase.from('suppliers').update(payload).eq('id', supplier.id)
    setSaving(false)
    onSaved()
  }

  return (
    <div className="space-y-4">
      <div className="bg-[#1F6F5F]/5 rounded-2xl p-4 border border-[#1F6F5F]/20 flex items-start gap-3">
        <BadgePercent className="w-5 h-5 text-[#1F6F5F] flex-shrink-0 mt-0.5" />
        <p className="text-sm text-[#1A2E26] leading-relaxed">
          العمولة بتتحسب على <span className="font-bold">إجمالي الإيرادات (gross)</span>، 
          مش net profit. الـ trigger في الـ DB بـ يطبقها تلقائي على كل transaction جديد.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
        <Field label="العمولة الأساسية (%)">
          <input type="number" min="0" max="50" step="0.5" value={base}
            onChange={(e) => setBase(Number(e.target.value))} className={`${INPUT_CLASS} font-mono`} />
        </Field>
        <Field label="عمولة إضافية على bookings via Madmona (%)">
          <input type="number" min="0" max="20" step="0.5" value={extra}
            onChange={(e) => setExtra(Number(e.target.value))} className={`${INPUT_CLASS} font-mono`} />
        </Field>

        <Field label="حالة العقد">
          <div className="grid grid-cols-3 gap-2">
            {(['negotiating', 'signed', 'active'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`p-3 rounded-xl text-sm font-bold transition-all ${
                  status === s
                    ? 'bg-[#1F6F5F] text-white'
                    : 'bg-[#FAFAF7] border border-gray-100 text-[#6B7280] hover:border-[#1F6F5F]'
                }`}
              >
                {s === 'negotiating' ? 'قيد التفاوض' : s === 'signed' ? 'موقّع' : 'نشط'}
              </button>
            ))}
          </div>
        </Field>

        <div className="bg-[#FAFAF7] rounded-xl p-4 border border-gray-100">
          <p className="text-[10px] font-bold tracking-wider uppercase text-[#6B7280] mb-2">معاينة</p>
          <p className="text-sm font-mono text-[#1A2E26]">
            إجمالي العمولة = <span className="text-[#1F6F5F] font-black text-base">{(base + extra).toFixed(1)}%</span>
          </p>
          <p className="text-xs text-[#6B7280] mt-1">
            كل ج إيراد × {((base + extra) / 100).toFixed(3)} = Madmona commission
          </p>
        </div>

        <SaveButton onClick={save} loading={saving} />
      </div>
    </div>
  )
}

/* ============================================================
   Shared helpers
   ============================================================ */
const INPUT_CLASS = "w-full px-4 py-3 rounded-xl bg-white border border-gray-200 text-[#1A2E26] focus:outline-none focus:border-[#1F6F5F] transition-colors text-sm"
const INPUT_SMALL = "w-full px-3 py-2 rounded-lg bg-[#FAFAF7] border border-gray-100 text-sm text-[#1A2E26] focus:outline-none focus:border-[#1F6F5F]"

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="text-xs font-bold text-[#1A2E26] mb-1.5 block">{label}</label>
      {children}
    </div>
  )
}

function SaveButton({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="px-5 py-2.5 rounded-xl bg-[#1F6F5F] text-white text-sm font-bold hover:shadow-md transition-shadow disabled:opacity-50 flex items-center gap-2"
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
      احفظ التغييرات
    </button>
  )
}
