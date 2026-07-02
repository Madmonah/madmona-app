'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabase-browser'
import {
  ArrowRight, Loader2, Lock, AlertCircle, Users, UserPlus, Shield,
  CheckCircle, X, Edit2, Trash2, Search, Phone, User, Sparkles, Crown,
} from 'lucide-react'
import { normalizePhone, phoneToEmail } from '@/lib/auth-helpers'

// ============================================================================
// /supplier/team
// Manage your team — invite staff with granular permissions (checklist).
// Only the supplier owner sees this. Owner can also be staff via DB seed.
// ============================================================================

type Stage = 'loading' | 'unauthenticated' | 'no-supplier' | 'not-owner' | 'ready'

interface SupplierData {
  id: string
  business_name: string
}

interface StaffMember {
  id: string
  profile_id: string
  role_label: string
  display_name: string | null
  is_active: boolean
  invited_at: string
  accepted_at: string | null
  can_view: boolean
  can_manage_listings: boolean
  can_publish_listings: boolean
  can_delete_listings: boolean
  can_manage_bookings: boolean
  can_complete_bookings: boolean
  can_respond_reviews: boolean
  can_view_analytics: boolean
  can_manage_pricing: boolean
  can_manage_team: boolean
  profile: {
    full_name: string | null
    phone: string
  } | null
}

// Granular permissions checklist
const PERMISSIONS = [
  { key: 'can_view',              label: 'الدخول للوحة',          desc: 'يقدر يدخل لوحة التحكم ويشوف البيانات' },
  { key: 'can_manage_listings',   label: 'إدارة المنتجات',      desc: 'إنشاء وتعديل ونسخ المنتجات' },
  { key: 'can_publish_listings',  label: 'نشر/إيقاف listings',    desc: 'يخلّي المنتج يظهر للعملاء أو يوقفه' },
  { key: 'can_delete_listings',   label: 'حذف listings',           desc: 'حذف نهائي — لا تراجع' },
  { key: 'can_manage_bookings',   label: 'إدارة الحجوزات',         desc: 'تأكيد ورفض الحجوزات' },
  { key: 'can_complete_bookings', label: 'إنهاء الحجوزات',         desc: 'يعتبر الحجز مكتمل' },
  { key: 'can_respond_reviews',   label: 'الرد على التقييمات',     desc: 'كتابة ردود على تقييمات العملاء' },
  { key: 'can_view_analytics',    label: 'مشاهدة الإحصائيات',     desc: 'الإيرادات وعدد الحجوزات' },
  { key: 'can_manage_pricing',    label: 'إدارة الأسعار',          desc: 'تعديل قواعد التسعير' },
  { key: 'can_manage_team',       label: 'إدارة الفريق',           desc: 'دعوة وإزالة موظفين تانيين' },
] as const

type PermissionKey = typeof PERMISSIONS[number]['key']

// Quick presets
const ROLE_PRESETS: Record<string, { label: string; perms: PermissionKey[] }> = {
  manager: {
    label: 'مدير',
    perms: ['can_view', 'can_manage_listings', 'can_publish_listings', 'can_manage_bookings', 'can_complete_bookings', 'can_respond_reviews', 'can_view_analytics', 'can_manage_pricing'],
  },
  operator: {
    label: 'موظف تشغيل',
    perms: ['can_view', 'can_manage_bookings', 'can_complete_bookings', 'can_respond_reviews'],
  },
  accountant: {
    label: 'محاسب',
    perms: ['can_view', 'can_view_analytics'],
  },
  viewer: {
    label: 'مشاهد فقط',
    perms: ['can_view'],
  },
}

export default function TeamManagementPage() {
  const [stage, setStage] = useState<Stage>('loading')
  const [supplier, setSupplier] = useState<SupplierData | null>(null)
  const [staff, setStaff] = useState<StaffMember[]>([])

  const [showInviteModal, setShowInviteModal] = useState(false)
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null)

  useEffect(() => { init() }, [])

  const init = async () => {
    const { data: { session } } = await supabaseBrowser.auth.getSession()
    if (!session?.user) { setStage('unauthenticated'); return }

    // @ts-expect-error
    const { data: sup } = await supabaseBrowser
      .from('marketplace_suppliers')
      .select('id, business_name, profile_id')
      .eq('profile_id', session.user.id)
      .maybeSingle()

    if (!sup) { setStage('no-supplier'); return }
    if (sup.profile_id !== session.user.id) { setStage('not-owner'); return }

    setSupplier({ id: sup.id, business_name: sup.business_name })
    await loadStaff(sup.id)
    setStage('ready')
  }

  const loadStaff = async (supplierId: string) => {
    // @ts-expect-error
    const { data } = await supabaseBrowser
      .from('supplier_staff')
      .select(`
        *,
        profile:profiles!supplier_staff_profile_id_fkey(full_name, phone)
      `)
      .eq('supplier_id', supplierId)
      .order('created_at', { ascending: false })

    setStaff((data || []) as StaffMember[])
  }

  if (stage === 'loading') {
    return <FullScreenLoader />
  }

  if (stage === 'unauthenticated') {
    return (
      <CenteredCard>
        <Lock className="w-8 h-8 text-[#1F6F5F] mx-auto mb-3" />
        <h1 className="font-bold mb-4">سجّل دخول الأول</h1>
        <Link
          href="/auth/login?redirect=/supplier/team"
          className="block w-full bg-[#1F6F5F] text-white py-3 rounded-xl font-semibold"
        >
          دخول
        </Link>
      </CenteredCard>
    )
  }

  if (stage === 'no-supplier') {
    return (
      <CenteredCard>
        <AlertCircle className="w-8 h-8 text-yellow-600 mx-auto mb-3" />
        <h1 className="font-bold mb-2">مش مورد على Madmona</h1>
        <p className="text-sm text-gray-500 mb-4">صفحة إدارة الفريق متاحة بس للموردين.</p>
        <Link href="/account" className="text-sm text-[#1F6F5F] hover:underline">
          ارجع للحساب
        </Link>
      </CenteredCard>
    )
  }

  return (
    <div className="min-h-screen gradient-mesh pb-24" dir="rtl">
      <header className="sticky top-0 z-40 glass border-b border-white/40">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link
            href="/supplier/marketplace"
            className="w-9 h-9 bg-white shadow-soft hover:shadow-card hover:-translate-y-0.5 rounded-full flex items-center justify-center transition-all"
          >
            <ArrowRight className="w-4 h-4 text-gray-700" />
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-black text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-[#1F6F5F]" />
              فريق العمل
            </h1>
            <p className="text-xs text-gray-500">{supplier?.business_name}</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {/* Owner banner */}
        <div className="bg-gradient-to-l from-[#1F6F5F] to-[#2d7a52] text-white rounded-2xl p-5 mb-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <div className="relative flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#2FA084] flex items-center justify-center flex-shrink-0">
              <Crown className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-black">أنت مالك الـsupplier</p>
              <p className="text-xs text-white/80 mt-0.5">عندك صلاحيات كاملة على {supplier?.business_name}</p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex-1 flex items-center justify-center gap-2 bg-[#1F6F5F] text-white py-3 rounded-2xl font-bold text-sm shadow-elevated hover:shadow-luxe hover:-translate-y-0.5 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            ادعو موظف جديد
          </button>
        </div>

        {/* Staff list */}
        <div className="space-y-3">
          {staff.length === 0 ? (
            <div className="bg-white rounded-3xl shadow-soft p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-3 bg-gray-100 rounded-2xl flex items-center justify-center">
                <Users className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-base font-black text-gray-900 mb-1">مفيش موظفين لسه</h3>
              <p className="text-sm text-gray-500 mb-4">ادعو حد يساعدك في إدارة المنتجات والحجوزات.</p>
            </div>
          ) : (
            staff.map(member => (
              <StaffCard
                key={member.id}
                member={member}
                onEdit={() => setEditingStaff(member)}
                onChange={() => loadStaff(supplier!.id)}
              />
            ))
          )}
        </div>
      </main>

      {showInviteModal && supplier && (
        <InviteModal
          supplierId={supplier.id}
          onClose={() => setShowInviteModal(false)}
          onInvited={() => {
            setShowInviteModal(false)
            loadStaff(supplier.id)
          }}
        />
      )}

      {editingStaff && supplier && (
        <EditPermissionsModal
          member={editingStaff}
          onClose={() => setEditingStaff(null)}
          onSaved={() => {
            setEditingStaff(null)
            loadStaff(supplier.id)
          }}
        />
      )}
    </div>
  )
}

// ============================================================================
// Staff Card
// ============================================================================
function StaffCard({
  member, onEdit, onChange,
}: {
  member: StaffMember
  onEdit: () => void
  onChange: () => void
}) {
  const [busy, setBusy] = useState(false)

  const activeCount = PERMISSIONS.filter(p => member[p.key as keyof StaffMember]).length

  const remove = async () => {
    if (!confirm(`هل تريد إزالة ${member.profile?.full_name || 'الموظف'} من الفريق؟`)) return
    setBusy(true)
    // @ts-expect-error
    const { error } = await supabaseBrowser
      .from('supplier_staff')
      .delete()
      .eq('id', member.id)
    setBusy(false)
    if (error) {
      alert('فشل الحذف: ' + error.message)
    } else {
      onChange()
    }
  }

  const toggleActive = async () => {
    setBusy(true)
    // @ts-expect-error
    const { error } = await supabaseBrowser
      .from('supplier_staff')
      .update({ is_active: !member.is_active })
      .eq('id', member.id)
    setBusy(false)
    if (error) {
      alert('فشل التحديث: ' + error.message)
    } else {
      onChange()
    }
  }

  return (
    <div className={`bg-white rounded-2xl border ${member.is_active ? 'border-gray-100' : 'border-gray-200 opacity-60'} shadow-soft p-4`}>
      <div className="flex items-start gap-3 mb-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#1F6F5F]/20 to-[#2FA084]/20 flex items-center justify-center flex-shrink-0">
          <User className="w-6 h-6 text-[#1F6F5F]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-gray-900 truncate">
              {member.display_name || member.profile?.full_name || 'موظف'}
            </p>
            <span className="text-[10px] px-2 py-0.5 bg-[#1F6F5F]/10 text-[#1F6F5F] rounded-full font-bold">
              {member.role_label}
            </span>
            {!member.is_active && (
              <span className="text-[10px] px-2 py-0.5 bg-gray-200 text-gray-700 rounded-full font-bold">
                موقوف
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1" dir="ltr">
            <Phone className="w-3 h-3" />
            {member.profile?.phone}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            <span className="font-bold text-gray-700">{activeCount}</span> صلاحية مفعّلة من {PERMISSIONS.length}
          </p>
        </div>
      </div>

      <div className="flex gap-2 pt-3 border-t border-gray-100">
        <button
          onClick={onEdit}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-50 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-100 transition-colors"
        >
          <Edit2 className="w-3 h-3" />
          عدّل الصلاحيات
        </button>
        <button
          onClick={toggleActive}
          disabled={busy}
          className="px-3 py-2 bg-yellow-50 text-yellow-700 rounded-xl text-xs font-bold hover:bg-yellow-100 transition-colors disabled:opacity-50"
        >
          {member.is_active ? 'أوقف' : 'فعّل'}
        </button>
        <button
          onClick={remove}
          disabled={busy}
          className="px-3 py-2 bg-red-50 text-red-700 rounded-xl text-xs font-bold hover:bg-red-100 transition-colors disabled:opacity-50"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}

// ============================================================================
// Invite Modal
// ============================================================================
function InviteModal({
  supplierId, onClose, onInvited,
}: {
  supplierId: string
  onClose: () => void
  onInvited: () => void
}) {
  const [phone, setPhone] = useState('')
  const [foundProfile, setFoundProfile] = useState<{ id: string; full_name: string | null; phone: string } | null>(null)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [searching, setSearching] = useState(false)

  const [roleLabel, setRoleLabel] = useState('staff')
  const [displayName, setDisplayName] = useState('')
  const [permissions, setPermissions] = useState<Record<PermissionKey, boolean>>({
    can_view: true,
    can_manage_listings: false,
    can_publish_listings: false,
    can_delete_listings: false,
    can_manage_bookings: false,
    can_complete_bookings: false,
    can_respond_reviews: false,
    can_view_analytics: false,
    can_manage_pricing: false,
    can_manage_team: false,
  })

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const searchByPhone = async () => {
    setSearchError(null)
    setFoundProfile(null)
    const norm = normalizePhone(phone)
    if (!norm) {
      setSearchError('رقم التليفون مش صحيح')
      return
    }
    setSearching(true)
    const email = phoneToEmail(norm)

    // Search profile by synthetic email or phone
    // @ts-expect-error
    const { data, error } = await supabaseBrowser
      .from('profiles')
      .select('id, full_name, phone')
      .or(`phone.eq.${norm},phone.eq.${email.split('@')[0]}`)
      .maybeSingle()

    setSearching(false)

    if (error) {
      setSearchError('حصل خطأ: ' + error.message)
      return
    }

    if (!data) {
      setSearchError('مفيش حساب بالرقم ده. الموظف لازم يعمل حساب على Madmona الأول.')
      return
    }
    setFoundProfile(data)
  }

  const applyPreset = (presetKey: string) => {
    const preset = ROLE_PRESETS[presetKey]
    if (!preset) return
    const newPerms = { ...permissions }
    PERMISSIONS.forEach(p => { newPerms[p.key] = false })
    preset.perms.forEach(perm => { newPerms[perm] = true })
    setPermissions(newPerms)
    setRoleLabel(preset.label)
  }

  const submitInvite = async () => {
    if (!foundProfile) return
    setSubmitting(true)
    setSubmitError(null)

    // @ts-expect-error
    const { error } = await supabaseBrowser
      .from('supplier_staff')
      .insert({
        supplier_id: supplierId,
        profile_id: foundProfile.id,
        role_label: roleLabel || 'staff',
        display_name: displayName.trim() || null,
        ...permissions,
      })

    setSubmitting(false)
    if (error) {
      if (error.code === '23505') {
        setSubmitError('الموظف ده موجود بالفعل في الفريق.')
      } else {
        setSubmitError('فشل الإضافة: ' + error.message)
      }
      return
    }
    onInvited()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center p-4 animate-fade-in" dir="rtl">
      <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-luxe animate-slide-up">
        <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex items-center justify-between">
          <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-[#1F6F5F]" />
            دعوة موظف جديد
          </h2>
          <button onClick={onClose} className="w-8 h-8 hover:bg-gray-100 rounded-full flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {!foundProfile ? (
            <>
              <div>
                <label className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-[#1F6F5F]" />
                  رقم تليفون الموظف
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  لازم يكون عنده حساب على Madmona الأول. لو ما عندوش، اطلب منه يسجل عبر <Link href="/auth/signup" className="text-[#1F6F5F] underline">/auth/signup</Link>.
                </p>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="01002229982"
                    className="flex-1 px-4 py-3 bg-[#FAFAF7] border border-gray-100 rounded-xl text-sm font-medium focus:outline-none focus:bg-white focus:border-[#1F6F5F]/40 focus:ring-4 focus:ring-[#1F6F5F]/10 transition-all"
                    dir="ltr"
                    style={{ textAlign: 'right' }}
                  />
                  <button
                    onClick={searchByPhone}
                    disabled={searching || !phone}
                    className="px-4 bg-[#1F6F5F] text-white rounded-xl font-bold text-sm shadow-soft hover:shadow-card disabled:opacity-50"
                  >
                    {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  </button>
                </div>
                {searchError && (
                  <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{searchError}</span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Profile preview */}
              <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-bold text-green-900">{foundProfile.full_name || 'موظف'}</p>
                  <p className="text-xs text-green-700" dir="ltr">{foundProfile.phone}</p>
                </div>
                <button
                  onClick={() => { setFoundProfile(null); setPhone('') }}
                  className="text-xs text-green-700 hover:text-green-900 font-bold"
                >
                  غيّر
                </button>
              </div>

              {/* Role label */}
              <div>
                <label className="text-xs font-bold text-gray-700 mb-2 block">المسمى الوظيفي</label>
                <input
                  type="text"
                  value={roleLabel}
                  onChange={(e) => setRoleLabel(e.target.value)}
                  placeholder="مثل: مدير، موظف استقبال، محاسب..."
                  className="w-full px-4 py-3 bg-[#FAFAF7] border border-gray-100 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-[#1F6F5F]/40 focus:ring-4 focus:ring-[#1F6F5F]/10 transition-all"
                />
              </div>

              {/* Quick presets */}
              <div>
                <label className="text-xs font-bold text-gray-700 mb-2 block flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#2FA084]" />
                  قوالب جاهزة (اختياري)
                </label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(ROLE_PRESETS).map(([key, preset]) => (
                    <button
                      key={key}
                      onClick={() => applyPreset(key)}
                      className="px-3 py-1.5 bg-[#1F6F5F]/5 hover:bg-[#1F6F5F]/10 border border-[#1F6F5F]/20 text-[#1F6F5F] rounded-full text-xs font-bold transition-colors"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Permissions checklist */}
              <div>
                <label className="text-xs font-bold text-gray-700 mb-2 block flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-[#1F6F5F]" />
                  الصلاحيات (Checklist)
                </label>
                <div className="space-y-2">
                  {PERMISSIONS.map(p => (
                    <label
                      key={p.key}
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        permissions[p.key]
                          ? 'bg-[#1F6F5F]/5 border-[#1F6F5F]/30'
                          : 'bg-white border-gray-100 hover:border-gray-200'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={permissions[p.key]}
                        onChange={(e) => setPermissions({ ...permissions, [p.key]: e.target.checked })}
                        className="mt-0.5 w-4 h-4 accent-[#1F6F5F]"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-bold text-gray-900">{p.label}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{p.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {submitError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{submitError}</span>
                </div>
              )}

              <button
                onClick={submitInvite}
                disabled={submitting}
                className="w-full bg-[#1F6F5F] text-white py-3.5 rounded-2xl font-black text-sm shadow-elevated hover:shadow-luxe hover:-translate-y-0.5 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                {submitting ? 'جاري الإضافة...' : 'أضف للفريق'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Edit Permissions Modal
// ============================================================================
function EditPermissionsModal({
  member, onClose, onSaved,
}: {
  member: StaffMember
  onClose: () => void
  onSaved: () => void
}) {
  const [roleLabel, setRoleLabel] = useState(member.role_label)
  const [displayName, setDisplayName] = useState(member.display_name || '')
  const [permissions, setPermissions] = useState<Record<PermissionKey, boolean>>({
    can_view: member.can_view,
    can_manage_listings: member.can_manage_listings,
    can_publish_listings: member.can_publish_listings,
    can_delete_listings: member.can_delete_listings,
    can_manage_bookings: member.can_manage_bookings,
    can_complete_bookings: member.can_complete_bookings,
    can_respond_reviews: member.can_respond_reviews,
    can_view_analytics: member.can_view_analytics,
    can_manage_pricing: member.can_manage_pricing,
    can_manage_team: member.can_manage_team,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const applyPreset = (presetKey: string) => {
    const preset = ROLE_PRESETS[presetKey]
    if (!preset) return
    const newPerms = { ...permissions }
    PERMISSIONS.forEach(p => { newPerms[p.key] = false })
    preset.perms.forEach(perm => { newPerms[perm] = true })
    setPermissions(newPerms)
    setRoleLabel(preset.label)
  }

  const save = async () => {
    setSaving(true)
    setError(null)
    // @ts-expect-error
    const { error: updateErr } = await supabaseBrowser
      .from('supplier_staff')
      .update({
        role_label: roleLabel || 'staff',
        display_name: displayName.trim() || null,
        ...permissions,
      })
      .eq('id', member.id)

    setSaving(false)
    if (updateErr) {
      setError('فشل الحفظ: ' + updateErr.message)
      return
    }
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center p-4 animate-fade-in" dir="rtl">
      <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-luxe animate-slide-up">
        <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex items-center justify-between">
          <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
            <Edit2 className="w-5 h-5 text-[#1F6F5F]" />
            تعديل صلاحيات
          </h2>
          <button onClick={onClose} className="w-8 h-8 hover:bg-gray-100 rounded-full flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="bg-gray-50 rounded-2xl p-4">
            <p className="font-bold text-gray-900">{member.profile?.full_name || 'موظف'}</p>
            <p className="text-xs text-gray-500 mt-0.5" dir="ltr">{member.profile?.phone}</p>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 mb-2 block">المسمى الوظيفي</label>
            <input
              type="text"
              value={roleLabel}
              onChange={(e) => setRoleLabel(e.target.value)}
              className="w-full px-4 py-3 bg-[#FAFAF7] border border-gray-100 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-[#1F6F5F]/40 focus:ring-4 focus:ring-[#1F6F5F]/10 transition-all"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 mb-2 block">قوالب سريعة</label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(ROLE_PRESETS).map(([key, preset]) => (
                <button
                  key={key}
                  onClick={() => applyPreset(key)}
                  className="px-3 py-1.5 bg-[#1F6F5F]/5 hover:bg-[#1F6F5F]/10 border border-[#1F6F5F]/20 text-[#1F6F5F] rounded-full text-xs font-bold transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 mb-2 block">الصلاحيات</label>
            <div className="space-y-2">
              {PERMISSIONS.map(p => (
                <label
                  key={p.key}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    permissions[p.key]
                      ? 'bg-[#1F6F5F]/5 border-[#1F6F5F]/30'
                      : 'bg-white border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={permissions[p.key]}
                    onChange={(e) => setPermissions({ ...permissions, [p.key]: e.target.checked })}
                    className="mt-0.5 w-4 h-4 accent-[#1F6F5F]"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-gray-900">{p.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{p.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button
            onClick={save}
            disabled={saving}
            className="w-full bg-[#1F6F5F] text-white py-3.5 rounded-2xl font-black text-sm shadow-elevated hover:shadow-luxe hover:-translate-y-0.5 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            {saving ? 'جاري الحفظ...' : 'احفظ التغييرات'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Helpers
// ============================================================================
function FullScreenLoader() {
  return (
    <div className="min-h-screen gradient-mesh flex items-center justify-center" dir="rtl">
      <Loader2 className="w-6 h-6 text-[#1F6F5F] animate-spin" />
    </div>
  )
}

function CenteredCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen gradient-mesh flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-3xl shadow-luxe p-8 text-center max-w-sm">
        {children}
      </div>
    </div>
  )
}
