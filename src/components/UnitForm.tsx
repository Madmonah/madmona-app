'use client'

import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import {
  Upload,
  X,
  Save,
  Trash2,
  Image as ImageIcon,
  Loader2,
  AlertCircle,
  Building,
  Tag,
  Users,
  Banknote,
  Clock,
  GripVertical,
} from 'lucide-react'

// ============================================================
// UnitForm — shared component for /admin/units/new and /admin/units/[id]/edit
//
// Handles:
//   - Form state for all unit fields
//   - Multi-image upload with drag-to-reorder
//   - Pricing fields (any combination of hourly/daily/package/monthly)
//   - Operating hours
//   - Submit (POST or PATCH depending on `mode`)
//   - Delete (only in edit mode, with safety check)
// ============================================================

const supabasePublic = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Supplier {
  id: string
  business_name: string
  district: string | null
  status: string
  commission_rate: number | string
}

interface Category {
  slug: string
  name_ar: string
  name_en: string
  is_active: boolean
}

export interface UnitFormData {
  id?: string
  supplier_id: string
  category_slug: string
  name_ar: string
  description_ar: string
  photo_urls: string[]
  capacity: number
  price_hourly: string
  price_daily: string
  price_package_10: string
  price_monthly: string
  operating_start_hour: number
  operating_end_hour: number
}

interface UnitFormProps {
  mode: 'new' | 'edit'
  password: string
  initialData?: UnitFormData
}

export default function UnitForm({ mode, password, initialData }: UnitFormProps) {
  const router = useRouter()

  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loadingMeta, setLoadingMeta] = useState(true)

  const [form, setForm] = useState<UnitFormData>(
    initialData || {
      supplier_id: '',
      category_slug: 'workstation',
      name_ar: '',
      description_ar: '',
      photo_urls: [],
      capacity: 1,
      price_hourly: '',
      price_daily: '',
      price_package_10: '',
      price_monthly: '',
      operating_start_hour: 9,
      operating_end_hour: 23,
    }
  )

  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load suppliers + categories on mount
  useEffect(() => {
    fetch('/api/admin/meta', { headers: { 'X-Admin-Password': password } })
      .then((r) => r.json())
      .then((data) => {
        const sups: Supplier[] = (data.suppliers || []).filter(
          (s: Supplier) => s.status === 'approved'
        )
        const cats: Category[] = (data.categories || []).filter((c: Category) => c.is_active)
        setSuppliers(sups)
        setCategories(cats)
        // Default to Madmona supplier on new form
        if (mode === 'new' && !form.supplier_id && sups.length > 0) {
          const madmona = sups.find((s) => s.business_name === 'مضمونة')
          setForm((f) => ({ ...f, supplier_id: madmona?.id || sups[0].id }))
        }
      })
      .catch((e) => setError('فشل تحميل البيانات: ' + e.message))
      .finally(() => setLoadingMeta(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---- Image upload ----
  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setError(null)
    setUploading(true)
    const newUrls: string[] = []

    try {
      for (const file of Array.from(files)) {
        if (file.size > 10 * 1024 * 1024) {
          setError(`${file.name} أكبر من ١٠ ميجا، تم تجاهلها`)
          continue
        }
        const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
        const filename = `units/${Date.now()}-${Math.random().toString(36).substring(2, 10)}.${ext}`

        const { error: uploadErr } = await supabasePublic.storage
          .from('space-images')
          .upload(filename, file, { contentType: file.type, upsert: false })
        if (uploadErr) {
          setError(`فشل رفع ${file.name}: ${uploadErr.message}`)
          continue
        }
        const { data: pub } = supabasePublic.storage.from('space-images').getPublicUrl(filename)
        newUrls.push(pub.publicUrl)
      }
      setForm((f) => ({ ...f, photo_urls: [...f.photo_urls, ...newUrls] }))
      // Reset the input so the same file can be reselected if needed
      e.target.value = ''
    } finally {
      setUploading(false)
    }
  }

  const removePhoto = (index: number) => {
    setForm((f) => ({
      ...f,
      photo_urls: f.photo_urls.filter((_, i) => i !== index),
    }))
  }

  const movePhoto = (from: number, to: number) => {
    if (to < 0 || to >= form.photo_urls.length) return
    setForm((f) => {
      const arr = [...f.photo_urls]
      const [moved] = arr.splice(from, 1)
      arr.splice(to, 0, moved)
      return { ...f, photo_urls: arr }
    })
  }

  // ---- Submit ----
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (!form.supplier_id) return setError('اختار المورد')
    if (!form.category_slug) return setError('اختار التصنيف')
    if (form.name_ar.trim().length < 2) return setError('اكتب اسم الوحدة')
    if (form.capacity < 1) return setError('السعة لازم تكون ١ على الأقل')

    const hasAnyPrice =
      form.price_hourly || form.price_daily || form.price_package_10 || form.price_monthly
    if (!hasAnyPrice) return setError('أدخل سعر واحد على الأقل (ساعة/يوم/باكدج/شهر)')

    if (form.operating_end_hour <= form.operating_start_hour) {
      return setError('ساعة النهاية لازم تكون بعد ساعة البداية')
    }

    setSubmitting(true)

    // Convert string price fields to numbers (or null)
    const toNum = (s: string): number | null => {
      const n = parseFloat(s)
      return isNaN(n) || n <= 0 ? null : n
    }

    const payload = {
      ...(mode === 'edit' && form.id ? { id: form.id } : {}),
      supplier_id: form.supplier_id,
      category_slug: form.category_slug,
      name_ar: form.name_ar.trim(),
      description_ar: form.description_ar.trim() || null,
      photo_urls: form.photo_urls,
      capacity: form.capacity,
      price_hourly: toNum(form.price_hourly),
      price_daily: toNum(form.price_daily),
      price_package_10: toNum(form.price_package_10),
      price_monthly: toNum(form.price_monthly),
      operating_start_hour: form.operating_start_hour,
      operating_end_hour: form.operating_end_hour,
    }

    try {
      const res = await fetch('/api/admin/units', {
        method: mode === 'new' ? 'POST' : 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': password,
        },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'حصل خطأ')
        setSubmitting(false)
        return
      }
      // On success, go back to units list
      router.push('/admin/units')
    } catch (err) {
      setError('فيه مشكلة في الاتصال: ' + (err as Error).message)
      setSubmitting(false)
    }
  }

  // ---- Delete (edit mode only) ----
  const handleDelete = async () => {
    if (!form.id) return
    if (!confirm('متأكد إنك عاوز تحذف الوحدة دي؟ ده مش هيشتغل لو فيه حجوزات عليها.')) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/admin/units/${form.id}`, {
        method: 'DELETE',
        headers: { 'X-Admin-Password': password },
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'فشل الحذف')
        setSubmitting(false)
        return
      }
      router.push('/admin/units')
    } catch (err) {
      setError((err as Error).message)
      setSubmitting(false)
    }
  }

  if (loadingMeta) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-[#2B4521] animate-spin" />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto">
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* === Section 1: المورد + التصنيف === */}
      <section className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Tag className="w-4 h-4 text-gray-400" />
          المورد والتصنيف
        </h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">المورد</label>
          <select
            value={form.supplier_id}
            onChange={(e) => setForm((f) => ({ ...f, supplier_id: e.target.value }))}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#2B4521]/30 focus:border-[#2B4521]"
            disabled={mode === 'edit'}
          >
            <option value="">اختار المورد...</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.business_name}{s.district ? ` — ${s.district}` : ''}{Number(s.commission_rate) > 0 ? ` (عمولة ${s.commission_rate}%)` : ''}
              </option>
            ))}
          </select>
          {mode === 'edit' && (
            <p className="text-xs text-gray-500 mt-1">المورد لا يمكن تغييره بعد إنشاء الوحدة</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">التصنيف</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {categories.map((c) => {
              const selected = form.category_slug === c.slug
              return (
                <button
                  key={c.slug}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, category_slug: c.slug }))}
                  className={`px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                    selected
                      ? 'border-[#2B4521] bg-[#2B4521] text-white'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {c.name_ar}
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {/* === Section 2: التفاصيل === */}
      <section className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Building className="w-4 h-4 text-gray-400" />
          التفاصيل
        </h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            اسم الوحدة <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.name_ar}
            onChange={(e) => setForm((f) => ({ ...f, name_ar: e.target.value }))}
            placeholder="مثال: مكتب رقم ١، غرفة الفجر، Hot Desk A"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#2B4521]/30 focus:border-[#2B4521] text-right"
            maxLength={100}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">الوصف</label>
          <textarea
            value={form.description_ar}
            onChange={(e) => setForm((f) => ({ ...f, description_ar: e.target.value }))}
            placeholder="اوصف الوحدة: الموقع، المميزات، إيه اللي بيميزها"
            rows={3}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#2B4521]/30 focus:border-[#2B4521] text-right resize-none"
            maxLength={1000}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-400" />
            السعة (عدد الأشخاص) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min={1}
            max={500}
            value={form.capacity}
            onChange={(e) => setForm((f) => ({ ...f, capacity: parseInt(e.target.value) || 1 }))}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#2B4521]/30 focus:border-[#2B4521]"
          />
        </div>
      </section>

      {/* === Section 3: الصور === */}
      <section className="bg-white rounded-xl border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
          <ImageIcon className="w-4 h-4 text-gray-400" />
          الصور
          <span className="text-xs text-gray-500 font-normal">({form.photo_urls.length})</span>
        </h3>

        {/* Existing photos grid */}
        {form.photo_urls.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
            {form.photo_urls.map((url, idx) => (
              <div key={idx} className="relative group rounded-xl overflow-hidden border border-gray-200 aspect-square">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`صورة ${idx + 1}`} className="w-full h-full object-cover" />
                {idx === 0 && (
                  <div className="absolute top-2 right-2 bg-[#2FA084] text-white text-[10px] px-2 py-1 rounded-full font-bold">
                    رئيسية
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                  {idx > 0 && (
                    <button
                      type="button"
                      onClick={() => movePhoto(idx, idx - 1)}
                      className="bg-white text-gray-900 rounded-full p-1.5 hover:bg-gray-100"
                      title="حرك يمين"
                    >
                      <GripVertical className="w-3 h-3" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removePhoto(idx)}
                    className="bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600"
                    title="حذف"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Upload button */}
        <label className="block">
          <div className={`flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
            uploading
              ? 'border-gray-200 bg-gray-50 text-gray-400'
              : 'border-gray-300 bg-[#FAFAF7] text-gray-700 hover:border-[#2B4521] hover:bg-[#2B4521]/5'
          }`}>
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">جاري الرفع...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span className="text-sm font-medium">إضافة صور</span>
              </>
            )}
          </div>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={handleFileUpload}
            disabled={uploading}
            className="hidden"
          />
        </label>
        <p className="text-xs text-gray-500 mt-2">
          أول صورة هي الصورة الرئيسية. تقدر ترفع أكتر من صورة مرة واحدة.
        </p>
      </section>

      {/* === Section 4: الأسعار === */}
      <section className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Banknote className="w-4 h-4 text-gray-400" />
          الأسعار
          <span className="text-xs text-gray-500 font-normal">سعر واحد على الأقل</span>
        </h3>

        <div className="grid grid-cols-2 gap-3">
          <PriceField
            label="الساعة"
            value={form.price_hourly}
            onChange={(v) => setForm((f) => ({ ...f, price_hourly: v }))}
          />
          <PriceField
            label="اليوم"
            value={form.price_daily}
            onChange={(v) => setForm((f) => ({ ...f, price_daily: v }))}
          />
          <PriceField
            label="باكدج ١٠ أيام"
            value={form.price_package_10}
            onChange={(v) => setForm((f) => ({ ...f, price_package_10: v }))}
          />
          <PriceField
            label="الشهر"
            value={form.price_monthly}
            onChange={(v) => setForm((f) => ({ ...f, price_monthly: v }))}
          />
        </div>
        <p className="text-xs text-gray-500">سيب الخانة فاضية لو الخطة دي مش متاحة لهذه الوحدة</p>
      </section>

      {/* === Section 5: ساعات العمل === */}
      <section className="bg-white rounded-xl border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-gray-400" />
          ساعات العمل
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">من الساعة</label>
            <select
              value={form.operating_start_hour}
              onChange={(e) =>
                setForm((f) => ({ ...f, operating_start_hour: parseInt(e.target.value) }))
              }
              className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#2B4521]/30"
            >
              {Array.from({ length: 24 }, (_, i) => i).map((h) => (
                <option key={h} value={h}>
                  {hourLabel(h)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">إلى الساعة</label>
            <select
              value={form.operating_end_hour}
              onChange={(e) =>
                setForm((f) => ({ ...f, operating_end_hour: parseInt(e.target.value) }))
              }
              className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#2B4521]/30"
            >
              {Array.from({ length: 24 }, (_, i) => i + 1).map((h) => (
                <option key={h} value={h}>
                  {hourLabel(h)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">دي بتأثر على الحجز بالساعة فقط</p>
      </section>

      {/* === Actions === */}
      <div className="flex flex-col sm:flex-row gap-3 sticky bottom-4 bg-[#FAFAF7] py-3 border-t border-gray-200 -mx-4 px-4 sm:relative sm:bottom-auto sm:py-0 sm:border-0 sm:mx-0 sm:px-0">
        <button
          type="submit"
          disabled={submitting || uploading}
          className="flex-1 flex items-center justify-center gap-2 bg-[#2B4521] text-white py-3 rounded-xl font-semibold hover:bg-[#2B4521]/90 disabled:opacity-50"
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {mode === 'new' ? 'إضافة الوحدة' : 'حفظ التغييرات'}
        </button>

        {mode === 'edit' && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={submitting}
            className="px-4 py-3 bg-red-50 text-red-700 rounded-xl text-sm font-semibold hover:bg-red-100 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            حذف
          </button>
        )}

        <button
          type="button"
          onClick={() => router.back()}
          disabled={submitting}
          className="px-4 py-3 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 disabled:opacity-50"
        >
          إلغاء
        </button>
      </div>
    </form>
  )
}

function PriceField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      <div className="relative">
        <input
          type="number"
          min={0}
          step={0.01}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="—"
          className="w-full px-3 py-2.5 pl-12 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#2B4521]/30 focus:border-[#2B4521]"
        />
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">
          ج.م
        </span>
      </div>
    </div>
  )
}

function hourLabel(h: number): string {
  if (h === 0 || h === 24) return '١٢ ص'
  if (h < 12) return `${h} ص`
  if (h === 12) return '١٢ م'
  return `${h - 12} م`
}
