'use client'

import { useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import {
  Building2, ChevronLeft, Plus, X, Trash2, Loader2, Check,
  Sparkles, AlertCircle, BadgePercent,
} from 'lucide-react'

/* ============================================================
   /admin/business-partners/new — Add a new B2B partner
   Wizard: business info → branches → review → create
   ============================================================ */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const INDUSTRIES = [
  { value: 'beauty_salon', label: 'صالون تجميل / Beauty Salon' },
  { value: 'gym', label: 'جيم / Fitness' },
  { value: 'restaurant', label: 'مطعم / Restaurant' },
  { value: 'clinic', label: 'عيادة / Clinic' },
  { value: 'spa', label: 'سبا / Spa' },
  { value: 'retail_shop', label: 'محل تجزئة / Retail' },
  { value: 'other', label: 'تاني / Other' },
]

const CITIES = ['القاهرة', 'الجيزة', 'الإسكندرية', 'الساحل الشمالي', 'الغردقة', 'شرم الشيخ']

type Branch = {
  name: string
  code: string
  address: string
  district: string
  phone: string
  manager_name: string
}

export default function NewBusinessPartnerPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Step 1: Business info
  const [businessName, setBusinessName] = useState('')
  const [industry, setIndustry] = useState('beauty_salon')
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [city, setCity] = useState('القاهرة')
  const [district, setDistrict] = useState('')
  const [address, setAddress] = useState('')

  // Step 2: Commission
  const [commissionRate, setCommissionRate] = useState(10)
  const [commissionExtraRate, setCommissionExtraRate] = useState(0)
  const [contractStatus, setContractStatus] = useState<'negotiating' | 'signed' | 'active'>('negotiating')

  // Step 3: Branches
  const [branches, setBranches] = useState<Branch[]>([
    { name: '', code: 'HQ', address: '', district: '', phone: '', manager_name: '' },
  ])

  function addBranch() {
    if (branches.length >= 20) return
    const nextCode = `BR${branches.length}`
    setBranches([...branches, { name: '', code: nextCode, address: '', district: '', phone: '', manager_name: '' }])
  }

  function removeBranch(i: number) {
    setBranches(branches.filter((_, idx) => idx !== i))
  }

  function updateBranch(i: number, key: keyof Branch, value: string) {
    setBranches(branches.map((b, idx) => idx === i ? { ...b, [key]: value } : b))
  }

  // Validation per step
  const canContinue1 = businessName.trim().length > 2 && contactPhone.trim().length > 8
  const canContinue2 = commissionRate >= 0 && commissionRate <= 50
  const canContinue3 = branches.length > 0 && branches.every((b) => b.name.trim().length > 0)

  async function createPartner() {
    setSubmitting(true)
    setError('')
    try {
      // Create supplier
      // @ts-expect-error
      const { data: sup, error: supError } = await supabase
        .from('suppliers')
        .insert({
          business_name: businessName.trim(),
          contact_name: contactName.trim() || 'Owner',
          contact_phone: contactPhone.trim(),
          contact_email: contactEmail.trim() || `${businessName.toLowerCase().replace(/\s+/g, '_')}.placeholder@madmonacairo.com`,
          city,
          district: district.trim(),
          address: address.trim(),
          business_type: 'multi_branch',
          industry,
          contract_status: contractStatus,
          subscription_tier: 'business',
          commission_rate: commissionRate,
          commission_extra_rate: commissionExtraRate,
          status: 'approved',
        })
        .select('id')
        .single()

      if (supError || !sup) {
        throw new Error(supError?.message || 'فشل إنشاء الشريك')
      }

      const supplierId = (sup as { id: string }).id

      // Create branches
      const branchRows = branches.map((b) => ({
        supplier_id: supplierId,
        name: b.name.trim(),
        code: b.code.trim(),
        address: b.address.trim() || null,
        district: b.district.trim() || null,
        city,
        phone: b.phone.trim() || null,
        manager_name: b.manager_name.trim() || null,
        status: 'active' as const,
        opens_at: '10:00',
        closes_at: '22:00',
      }))

      // @ts-expect-error
      const { error: brError } = await supabase
        .from('supplier_branches')
        .insert(branchRows)

      if (brError) {
        throw new Error('تم إنشاء الشريك لكن فشل إنشاء الفروع: ' + brError.message)
      }

      // Redirect to the new partner's finance page
      router.push(`/admin/business-finance/${supplierId}`)
    } catch (e: any) {
      setError(e.message || 'حدث خطأ غير متوقع')
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-5">
          <Link
            href="/admin/business-partners"
            className="text-xs font-bold text-[#6B7280] hover:text-[#1F6F5F] flex items-center gap-1 mb-2 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            رجوع للشركاء
          </Link>
          <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#1F6F5F] mb-1">
            ONBOARDING · NEW B2B PARTNER
          </p>
          <h1 className="text-2xl md:text-3xl font-black text-[#1A2E26] tracking-tight">
            اضف شريك جديد
          </h1>

          {/* Progress */}
          <div className="flex items-center gap-2 mt-5">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`flex-1 h-1.5 rounded-full transition-colors ${
                  s <= step ? 'bg-[#1F6F5F]' : 'bg-gray-200'
                }`}
              />
            ))}
            <span className="text-xs font-bold text-[#6B7280] mr-2 whitespace-nowrap">
              {step}/3
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 pb-32">
        {/* STEP 1: Business info */}
        {step === 1 && (
          <Section title="معلومات الشركة" subtitle="الأساسيات اللي بنحتاجها لـ register الشريك">
            <Field label="اسم الشركة" required>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="مثلاً: Elite Beauty Salon"
                className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 text-[#1A2E26] focus:outline-none focus:border-[#1F6F5F] transition-colors"
              />
            </Field>

            <Field label="نوع النشاط" required>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 text-[#1A2E26] focus:outline-none focus:border-[#1F6F5F]"
              >
                {INDUSTRIES.map((i) => (
                  <option key={i.value} value={i.value}>{i.label}</option>
                ))}
              </select>
              <p className="text-[11px] text-[#6B7280] mt-1.5">
                ⓘ بناءً على النوع، السيستم بـ يجهز categories + role templates مخصصة
              </p>
            </Field>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="اسم المسؤول">
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="مثلاً: محمد المالك"
                  className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 text-[#1A2E26] focus:outline-none focus:border-[#1F6F5F]"
                />
              </Field>

              <Field label="هاتف المسؤول" required>
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+201001234567"
                  className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 text-[#1A2E26] focus:outline-none focus:border-[#1F6F5F]"
                />
              </Field>
            </div>

            <Field label="ايميل" optional>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="optional@example.com"
                className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 text-[#1A2E26] focus:outline-none focus:border-[#1F6F5F]"
              />
            </Field>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="المحافظة">
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 text-[#1A2E26] focus:outline-none focus:border-[#1F6F5F]"
                >
                  {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="الحي">
                <input
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder="مثلاً: مصر الجديدة"
                  className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 text-[#1A2E26] focus:outline-none focus:border-[#1F6F5F]"
                />
              </Field>
            </div>

            <Field label="عنوان المقر الرئيسي" optional>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="مثلاً: ١٥ شارع سليمان عزمي"
                className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 text-[#1A2E26] focus:outline-none focus:border-[#1F6F5F]"
              />
            </Field>
          </Section>
        )}

        {/* STEP 2: Commission */}
        {step === 2 && (
          <Section title="شروط الشراكة" subtitle="عمولة Madmona على gross bookings (مش net profit)">
            <div className="bg-[#1F6F5F]/5 rounded-2xl p-4 mb-4 border border-[#1F6F5F]/20">
              <div className="flex items-start gap-3">
                <BadgePercent className="w-5 h-5 text-[#1F6F5F] flex-shrink-0 mt-0.5" />
                <p className="text-sm text-[#1A2E26] leading-relaxed">
                  <span className="font-bold">العمولة على إجمالي الحجوزات (gross)</span> — مش بـ net profit. 
                  المصاريف (مرتبات، إيجار، مستلزمات) لا تؤثر على عمولة Madmona.
                </p>
              </div>
            </div>

            <Field label="العمولة الأساسية (%)" required>
              <input
                type="number"
                min="0"
                max="50"
                step="0.5"
                value={commissionRate}
                onChange={(e) => setCommissionRate(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 text-[#1A2E26] focus:outline-none focus:border-[#1F6F5F] font-mono"
              />
              <p className="text-[11px] text-[#6B7280] mt-1.5">
                ⓘ 10% للأفراد، 5% للشركات الكبيرة، 0% أثناء التفاوض
              </p>
            </Field>

            <Field label="عمولة إضافية (%) — optional" optional>
              <input
                type="number"
                min="0"
                max="20"
                step="0.5"
                value={commissionExtraRate}
                onChange={(e) => setCommissionExtraRate(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 text-[#1A2E26] focus:outline-none focus:border-[#1F6F5F] font-mono"
              />
              <p className="text-[11px] text-[#6B7280] mt-1.5">
                ⓘ % إضافية على bookings اللي تيجي عن طريق Madmona (سوشيال، marketing). إجمالي العمولة = أساسية + إضافية.
              </p>
            </Field>

            <Field label="حالة العقد" required>
              <div className="grid grid-cols-3 gap-2">
                {(['negotiating', 'signed', 'active'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setContractStatus(s)}
                    className={`p-3 rounded-xl text-sm font-bold transition-all ${
                      contractStatus === s
                        ? 'bg-[#1F6F5F] text-white'
                        : 'bg-white border border-gray-200 text-[#6B7280] hover:border-[#1F6F5F]'
                    }`}
                  >
                    {s === 'negotiating' ? 'قيد التفاوض' : s === 'signed' ? 'موقّع' : 'نشط'}
                  </button>
                ))}
              </div>
            </Field>

            {/* Preview */}
            <div className="mt-6 bg-white rounded-2xl p-5 border border-gray-100">
              <p className="text-[10px] font-bold tracking-wider uppercase text-[#6B7280] mb-3">المعادلة</p>
              <p className="text-sm text-[#1A2E26] font-mono">
                Madmona commission = gross_revenue × <span className="text-[#1F6F5F] font-black">
                  {(commissionRate + commissionExtraRate).toFixed(1)}%
                </span>
              </p>
              <p className="text-xs text-[#6B7280] mt-2">
                مثلاً: لو يوم بـ ١٠٬٠٠٠ ج إيراد، Madmona تأخذ {((10000 * (commissionRate + commissionExtraRate)) / 100).toLocaleString('ar-EG')} ج
              </p>
            </div>
          </Section>
        )}

        {/* STEP 3: Branches */}
        {step === 3 && (
          <Section title="الفروع" subtitle="اضف فرع واحد على الأقل — تقدر تزود لاحقاً">
            <div className="space-y-3">
              {branches.map((b, i) => (
                <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-bold tracking-wider uppercase text-[#1F6F5F]">
                      فرع {i + 1} {b.code && `· ${b.code}`}
                    </p>
                    {branches.length > 1 && (
                      <button
                        onClick={() => removeBranch(i)}
                        className="text-[#6B7280] hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={b.name}
                      onChange={(e) => updateBranch(i, 'name', e.target.value)}
                      placeholder="اسم الفرع *"
                      className="px-3 py-2 rounded-lg bg-[#FAFAF7] border border-gray-100 text-sm text-[#1A2E26] focus:outline-none focus:border-[#1F6F5F]"
                    />
                    <input
                      type="text"
                      value={b.code}
                      onChange={(e) => updateBranch(i, 'code', e.target.value)}
                      placeholder="كود (HQ, BR2, إلخ)"
                      className="px-3 py-2 rounded-lg bg-[#FAFAF7] border border-gray-100 text-sm text-[#1A2E26] focus:outline-none focus:border-[#1F6F5F] font-mono"
                    />
                    <input
                      type="text"
                      value={b.district}
                      onChange={(e) => updateBranch(i, 'district', e.target.value)}
                      placeholder="الحي"
                      className="px-3 py-2 rounded-lg bg-[#FAFAF7] border border-gray-100 text-sm text-[#1A2E26] focus:outline-none focus:border-[#1F6F5F]"
                    />
                    <input
                      type="tel"
                      value={b.phone}
                      onChange={(e) => updateBranch(i, 'phone', e.target.value)}
                      placeholder="هاتف الفرع"
                      className="px-3 py-2 rounded-lg bg-[#FAFAF7] border border-gray-100 text-sm text-[#1A2E26] focus:outline-none focus:border-[#1F6F5F]"
                    />
                    <input
                      type="text"
                      value={b.address}
                      onChange={(e) => updateBranch(i, 'address', e.target.value)}
                      placeholder="العنوان"
                      className="md:col-span-2 px-3 py-2 rounded-lg bg-[#FAFAF7] border border-gray-100 text-sm text-[#1A2E26] focus:outline-none focus:border-[#1F6F5F]"
                    />
                    <input
                      type="text"
                      value={b.manager_name}
                      onChange={(e) => updateBranch(i, 'manager_name', e.target.value)}
                      placeholder="اسم مدير الفرع (optional)"
                      className="md:col-span-2 px-3 py-2 rounded-lg bg-[#FAFAF7] border border-gray-100 text-sm text-[#1A2E26] focus:outline-none focus:border-[#1F6F5F]"
                    />
                  </div>
                </div>
              ))}

              {branches.length < 20 && (
                <button
                  onClick={addBranch}
                  className="w-full p-3 rounded-2xl border-2 border-dashed border-gray-300 hover:border-[#1F6F5F] text-[#6B7280] hover:text-[#1F6F5F] text-sm font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  اضف فرع
                </button>
              )}
            </div>

            {/* Review */}
            <div className="mt-6 bg-[#FAFAF7] rounded-2xl p-5 border border-gray-100">
              <p className="text-[10px] font-bold tracking-wider uppercase text-[#6B7280] mb-3">مراجعة</p>
              <div className="space-y-1.5 text-sm">
                <Review label="الشركة" value={businessName || '—'} />
                <Review label="النشاط" value={INDUSTRIES.find((i) => i.value === industry)?.label || industry} />
                <Review label="المسؤول" value={`${contactName || '—'} · ${contactPhone}`} />
                <Review label="الموقع" value={`${city} · ${district || '—'}`} />
                <Review label="العمولة" value={`${commissionRate}% + ${commissionExtraRate}% = ${(commissionRate + commissionExtraRate).toFixed(1)}%`} />
                <Review label="حالة العقد" value={contractStatus === 'negotiating' ? 'قيد التفاوض' : contractStatus === 'signed' ? 'موقّع' : 'نشط'} />
                <Review label="عدد الفروع" value={String(branches.length)} />
              </div>
            </div>
          </Section>
        )}

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
      </main>

      {/* Sticky footer */}
      <footer className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-100 px-4 py-3 z-10">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <button
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1 || submitting}
            className="text-sm font-bold text-[#6B7280] hover:text-[#1F6F5F] disabled:opacity-30 disabled:pointer-events-none transition-colors px-4 py-2"
          >
            السابق
          </button>

          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={(step === 1 && !canContinue1) || (step === 2 && !canContinue2)}
              className="px-6 py-3 rounded-xl bg-[#1F6F5F] text-white font-bold text-sm hover:shadow-md transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
            >
              التالي
            </button>
          ) : (
            <button
              onClick={createPartner}
              disabled={!canContinue3 || submitting}
              className="px-6 py-3 rounded-xl bg-[#1F6F5F] text-white font-bold text-sm hover:shadow-md transition-shadow disabled:opacity-50 flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  جاري الإنشاء...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  أنشئ الشريك
                </>
              )}
            </button>
          )}
        </div>
      </footer>
    </div>
  )
}

/* Sub-components */

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg md:text-xl font-black text-[#1A2E26] tracking-tight">{title}</h2>
        <p className="text-sm text-[#6B7280] mt-0.5">{subtitle}</p>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function Field({
  label, required, optional, children,
}: {
  label: string
  required?: boolean
  optional?: boolean
  children: ReactNode
}) {
  return (
    <div>
      <label className="text-xs font-bold text-[#1A2E26] mb-1.5 flex items-center gap-1">
        {label}
        {required && <span className="text-red-500">*</span>}
        {optional && <span className="text-[#6B7280] font-normal">(اختياري)</span>}
      </label>
      {children}
    </div>
  )
}

function Review({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[#6B7280]">{label}</span>
      <span className="font-bold text-[#1A2E26]">{value}</span>
    </div>
  )
}
