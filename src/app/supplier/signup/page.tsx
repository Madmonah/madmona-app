'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowRight,
  Building2,
  User,
  Phone,
  Mail,
  MapPin,
  FileText,
  CheckCircle,
  AlertCircle,
} from 'lucide-react'

export default function SupplierSignupPage() {
  const router = useRouter()

  const [businessName, setBusinessName] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [district, setDistrict] = useState('')
  const [address, setAddress] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const canSubmit =
    businessName.trim().length >= 2 &&
    contactName.trim().length >= 2 &&
    contactPhone.trim().length >= 11 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail) &&
    !submitting

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/suppliers/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_name: businessName.trim(),
          contact_name: contactName.trim(),
          contact_phone: contactPhone.trim(),
          contact_email: contactEmail.trim(),
          district: district.trim() || null,
          address: address.trim() || null,
          description_ar: description.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'حصل خطأ، حاول تاني')
        setSubmitting(false)
        return
      }
      setSuccess(true)
      setSubmitting(false)
    } catch (err) {
      console.error(err)
      setError('فيه مشكلة في الاتصال، حاول تاني')
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center px-6 py-8" dir="rtl">
        <div className="max-w-md w-full bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
          <div className="flex items-center justify-center w-14 h-14 bg-[#1F5F3F]/10 rounded-full mx-auto mb-5">
            <CheckCircle className="w-7 h-7 text-[#1F5F3F]" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 text-center mb-2">تم استلام طلبك!</h1>
          <p className="text-sm text-gray-600 text-center leading-relaxed mb-6">
            هنراجع بياناتك ونتواصل معاك على الإيميل والموبايل خلال ٢٤-٤٨ ساعة.
            بعد الموافقة، هنبعتلك بيانات الدخول للوحة التحكم بتاعتك.
          </p>
          <Link href="/" className="block text-center text-sm text-[#1F5F3F] hover:underline">
            الرجوع للصفحة الرئيسية
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-[#FAFAF7] border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-50 rounded-full" type="button" aria-label="رجوع">
            <ArrowRight className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">انضم لمضمونة</h1>
          <div className="w-9" />
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6 pb-12">
        {/* Hero pitch */}
        <section className="mb-6 bg-gradient-to-br from-[#1F5F3F] to-[#1F5F3F]/90 text-white rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center text-xs bg-[#B8860B] text-white px-2.5 py-1 rounded-full font-medium tracking-wide">
              للموردين
            </span>
          </div>
          <h2 className="text-xl font-bold mb-2">حوّل مساحتك لمصدر دخل دائم</h2>
          <p className="text-sm text-white/85 leading-relaxed">
            اعرض مساحات العمل بتاعتك على مضمونة، وخلي العملاء يحجزوا أونلاين بأي وقت.
            عمولة بسيطة على كل حجز ناجح. الدفع شهري.
          </p>
        </section>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-gray-500" /> اسم النشاط <span className="text-red-500">*</span>
            </label>
            <input type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="مثال: WorkStation Cairo" className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#1F5F3F]/30 focus:border-[#1F5F3F] text-right" />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <User className="w-4 h-4 text-gray-500" /> اسم المسؤول <span className="text-red-500">*</span>
            </label>
            <input type="text" value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="اسمك بالكامل" className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#1F5F3F]/30 focus:border-[#1F5F3F] text-right" autoComplete="name" />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Phone className="w-4 h-4 text-gray-500" /> رقم الموبايل <span className="text-red-500">*</span>
            </label>
            <input type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value.replace(/[^\d+]/g, '').slice(0, 14))} placeholder="01xxxxxxxxx" className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#1F5F3F]/30 focus:border-[#1F5F3F]" dir="ltr" style={{ textAlign: 'right' }} autoComplete="tel" inputMode="tel" />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Mail className="w-4 h-4 text-gray-500" /> البريد الإلكتروني <span className="text-red-500">*</span>
            </label>
            <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="email@example.com" className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#1F5F3F]/30 focus:border-[#1F5F3F]" dir="ltr" style={{ textAlign: 'right' }} autoComplete="email" />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-500" /> الحي <span className="text-xs text-gray-400 font-normal">(اختياري)</span>
            </label>
            <input type="text" value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="مثال: مصر الجديدة، الزمالك، التجمع الخامس..." className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#1F5F3F]/30 focus:border-[#1F5F3F] text-right" />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-500" /> العنوان التفصيلي <span className="text-xs text-gray-400 font-normal">(اختياري)</span>
            </label>
            <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="رقم الشارع، المنطقة، علامة مميزة..." className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#1F5F3F]/30 focus:border-[#1F5F3F] text-right" />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-500" /> وصف مختصر <span className="text-xs text-gray-400 font-normal">(اختياري)</span>
            </label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="إيه المساحة بتاعتك بتقدمه؟ كم مكتب؟ كم غرفة اجتماعات؟" rows={3} className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#1F5F3F]/30 focus:border-[#1F5F3F] text-right resize-none" />
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button type="button" onClick={handleSubmit} disabled={!canSubmit} className="w-full bg-[#1F5F3F] text-white py-3.5 px-6 rounded-xl font-semibold hover:bg-[#1F5F3F]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-2">
            {submitting ? 'جاري الإرسال...' : 'إرسال الطلب'}
          </button>

          <p className="text-xs text-gray-500 text-center mt-2 leading-relaxed">
            بإرسال هذا الطلب، أنت توافق على الشروط والأحكام الخاصة بمضمونة كمنصة وسيطة.
            عمولة المنصة ٢٠٪ من قيمة كل حجز ناجح.
          </p>
        </div>
      </main>
    </div>
  )
}
