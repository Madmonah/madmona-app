'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { jsonObj } from '@/lib/rpc'
import {
  ChevronLeft, ChevronRight, Check, X, Plus, Upload, Trash2, Star,
  Loader2, AlertCircle, Tag, MapPin, DollarSign, Image as ImageIcon,
  FolderTree, Info, ShieldCheck, MessageCircle, Phone, KeyRound, Building2,
} from 'lucide-react'
import { periodOptions, type PricingPeriod } from '@/lib/pricing-periods'
import LocationPicker from '@/components/marketplace/LocationPicker'

// ============================================================================
// Types
// ============================================================================

type FieldType = 'text' | 'number' | 'boolean' | 'select' | 'multi_select' | 'date' | 'file'
// 🐞 (١٥ أغسطس ٢٠٢٦ — محمد: «شاشات الإضافة لازم تطابق شاشات العرض»)
//    الاتحاد ده كان ٥ وحدات بس، فالمورد مايقدرش يختار الوحدة اللي
//    الموقع بيعرض بيها فعلًا (`per_unit` و`per_service`… ٢٤ في الإينَم).
//    بقى من `@/lib/pricing-periods` — نفس المصدر بتاع صفحة العرض والحجز.
type PeriodType = PricingPeriod

interface Category {
  id: string
  parent_id: string | null
  name_ar: string
  name_en: string | null
  slug: string
  icon: string | null
  is_active: boolean
  // 🗂️ (٢٥ يوليو ٢٠٢٦ — محمد): «خلي التصنيفات تبان زي أضف وزي الماركت بليس».
  //    الأعمدة دي كانت بتتجاب أصلاً (`select('*')`) بس مكانتش متعرّفة هنا،
  //    فخطوة اختيار الفئة كانت **حيطة مسطّحة من ٩٠+ فئة** من غير تابات ولا مجموعات.
  // 'sales' موجود في قيد الداتابيز (categories_track_check) و71 تصنيف بيستعمله —
  // كان ناقص من النوع المكتوب بالإيد هنا، فـTS كان بيعتبر مقارنته 'مقارنة مستحيلة'.
  track?: 'rentals' | 'services' | 'hybrid' | 'restaurants' | 'products' | 'daily' | 'sales' | null
  group_slug?: string | null
  group_name_ar?: string | null
  group_emoji?: string | null
  group_display_order?: number | null
  display_order?: number | null
  // 💰 (٢٥/٨/٢٠٢٦ — محمد: «العربية في قسم بيع وبيظهر السعر لكل ساعة»)
  //    الأعمدة دي بتتجاب أصلًا بـselect('*') بس مكانتش متعرّفة — فخطوة
  //    الأسعار كانت بتعرض الـ٢٤ وحدة (الساعة/اليوم/…) لعربية بيع.
  allowed_pricing_periods?: string[] | null
  default_pricing_period?: string | null
}

// 🐞 (١٥ أغسطس ٢٠٢٦ — محمد: «تصنيفات الإضافة مش زي العرض بتاع الماركت بليس»)
//
//    فيه ٣ فروق كانت بتخلّي شاشة الإضافة تورّي حاجة تانية خالص:
//
//    ① **تاب «بيع» كان بيخبّي نص السوق.** في الداتابيز فيه مجالين للبيع:
//       `products` (١٦ تصنيف جذر) و `sales` (٦ تصنيفات جذر). الماركت بليس
//       بيجمّع الاتنين تحت تاب «بيع» (`activeTrack === 'products' && c.track
//       === 'sales'`)، لكن شاشة الإضافة كانت بتفلتر بـ`track === pickTrack`
//       بالظبط — فـ«عقارات سياحية» بتاعة البيع (اللي تحتها ٣١ إعلان: ساحل
//       ١٦، سخنة ١٠، مارينا ٣، هاسيندا ١، مراسي ١) **ماكانتش بتظهر أصلًا**
//       في شاشة الإضافة. الوحيدة اللي كانت بتبان هي عقارات سياحية بتاعة
//       الإيجار (٣ إعلانات). ده سبب «مش زي العرض».
//    ② **تاب «الكل»** — شيلناه من الماركت بليس أمس بطلبه، وفضل هنا.
//    ③ **تاب «سوبر ماركت»** — مفيش ولا تصنيف واحد `track='daily'` في
//       الداتابيز، فالتاب ده كان بيفضل صفر على طول.
//
//    دلوقتي التابات الأربعة هي هي، وبنفس منطق التجميع.
type FormTrackTab = 'products' | 'rentals' | 'services' | 'restaurants'

const FORM_TRACKS: { key: FormTrackTab; ar: string; emoji: string }[] = [
  { key: 'products',    ar: 'بيع',        emoji: '🏷️' },
  { key: 'rentals',     ar: 'إيجار',      emoji: '🔑' },
  { key: 'services',    ar: 'خدمات',      emoji: '🛠️' },
  { key: 'restaurants', ar: 'مطاعم',      emoji: '🍽️' },
]

/** نفس شرط الماركت بليس بالحرف: «بيع» = products + sales، «إيجار» = rentals + hybrid. */
function catInTrack(catTrack: string | null | undefined, tab: FormTrackTab): boolean {
  if (tab === 'products') return catTrack === 'products' || catTrack === 'sales'
  if (tab === 'rentals') return catTrack === 'rentals' || catTrack === 'hybrid'
  return catTrack === tab
}

interface Attribute {
  id: string
  category_id: string
  name_ar: string
  field_key: string
  field_type: FieldType
  options: { key: string; label_ar?: string }[]
  unit: string | null
  is_required: boolean
  display_order: number
  placeholder: string | null
  help_text: string | null
}

interface PricingRule {
  id?: string
  period_type: PeriodType
  price: string
  min_periods: number | null
  is_active: boolean
}

interface Photo {
  id?: string
  url: string
  caption: string
  is_primary: boolean
  display_order: number
  storage_path?: string | null
  // For new uploads
  file?: File
  uploading?: boolean
  // Compression info
  originalSize?: number
  compressedSize?: number
}

/**
 * فرع — بيتعرض في قسم «فروعنا» في صفحة الإعلان.
 * نفس الحقول اللي `marketplace/[slug]/page.tsx` بيقراها من `listings.branches`.
 */
export interface Branch {
  name: string
  city: string
  address: string
  phone: string
}

export interface ListingFormData {
  category_id: string | null
  title: string
  description: string
  city: string
  district: string
  address: string
  min_booking_hours: number | null
  max_booking_hours: number | null
  status: 'draft' | 'published'
  requires_id_verification: boolean
  // 🐞 (١٥ أغسطس ٢٠٢٦ — محمد: «شاشات الإضافة لازم تطابق شاشات العرض»)
  //    صفحة الإعلان فيها قسمين كاملين مالهمش أي خانة في الفورم ده، فبيفضلوا
  //    فاضيين للأبد مهما المورد عمل إيه:
  //      • «تفاصيل المنتج» → product_condition / brand / model_name /
  //        stock_quantity / shipping_available / shipping_cost
  //      • «فروعنا»        → branches
  //    (الخانات دي موجودة في `/add-listing` العام بس — مش في شاشة المورد.)
  product_condition: string | null
  brand: string
  model_name: string
  stock_quantity: number | null
  shipping_available: boolean | null
  shipping_cost: number | null
  branches: Branch[]
  // 🗺️ (١٥ أغسطس ٢٠٢٦) إحداثيات الخريطة — السباكة موجودة من زمان
  //    (العمودين في `listings` وعليهم صلاحية كتابة) بس مفيش فورم كان
  //    بيملاهم: ٣٧٤ من ٣٧٨ إعلان منشور من غير خريطة.
  latitude: number | null
  longitude: number | null
  attributeValues: Record<string, any>
  photos: Photo[]
  pricing: PricingRule[]
}

interface ListingFormProps {
  supplierId: string
  userId: string
  existingId?: string
  initialData?: Partial<ListingFormData> & {
    existingPhotos?: Photo[]
    existingPricing?: PricingRule[]
    existingAttributes?: { attribute_id: string; value: any }[]
  }
  redirectAfterSubmit?: string
}



// ============================================================================
// 🔗 الحقول اللي صفحة العرض بتوريها — لازم تتكتب زي ما هي
// ============================================================================
// `marketplace/[slug]/page.tsx` فيه قسمين بيعتمدوا على أعمدة `listings` دي
// مباشرة. لو الفورم مابعتهاش، القسمين بيفضلوا مخفيين مهما المورد كتب.
// بنبعت `null`/`[]` صراحةً وقت التعديل عشان لو المورد مسح قيمة، تتمسح فعلًا
// من العرض — مش تفضل قديمة.
function applyDisplayParityFields(payload: Record<string, unknown>, form: ListingFormData) {
  payload.product_condition = form.product_condition || null
  payload.brand = form.brand.trim() || null
  payload.model_name = form.model_name.trim() || null
  payload.stock_quantity = form.stock_quantity
  payload.shipping_available = form.shipping_available
  payload.shipping_cost = form.shipping_available ? form.shipping_cost : null
  // الفروع الفاضية (بلا اسم ولا عنوان) مابتتحفظش — العرض بيوري كارت فاضي غير كده
  const branches = form.branches.filter(b => b.name.trim() || b.address.trim() || b.city.trim() || b.phone.trim())
  payload.branches = branches.length ? branches : []
  payload.latitude = form.latitude
  payload.longitude = form.longitude
}

// نفس شرط صفحة العرض بالظبط: `const isProduct = track === 'products' || track === 'sales'`
// لو الشرط اتغيّر هناك، لازم يتغيّر هنا — وإلا الفورم يسأل عن حاجة ماتتعرضش
// أو العكس.
const PRODUCT_TRACKS = ['products', 'sales']

const CONDITION_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'new', label: 'جديد بالكرتونة' },
  { value: 'used_like_new', label: 'مستعمل (مثل الجديد)' },
  { value: 'used_good', label: 'مستعمل (حالة جيدة)' },
  { value: 'refurbished', label: 'Refurbished' },
]

// ============================================================================
// Image compression — auto-resize/compress large images before upload
// ============================================================================

const MAX_FILE_SIZE_MB = 25 // Max raw input size
const TARGET_MAX_DIMENSION = 1920 // Max width/height after compression
const TARGET_QUALITY = 0.85 // JPEG quality

async function compressImage(file: File): Promise<File> {
  // Skip compression for already-small files (<800KB)
  if (file.size < 800 * 1024) return file

  // Skip compression for unsupported types
  if (!file.type.match(/^image\/(jpeg|jpg|png|webp)$/i)) return file

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('فشل قراءة الصورة'))
    reader.onload = (e) => {
      const img = new Image()
      img.onerror = () => reject(new Error('فشل معالجة الصورة'))
      img.onload = () => {
        let { width, height } = img

        // Resize if larger than target dimension
        if (width > TARGET_MAX_DIMENSION || height > TARGET_MAX_DIMENSION) {
          const ratio = Math.min(TARGET_MAX_DIMENSION / width, TARGET_MAX_DIMENSION / height)
          width = Math.round(width * ratio)
          height = Math.round(height * ratio)
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Canvas غير متاح'))
          return
        }

        // High-quality resize
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('فشل ضغط الصورة'))
              return
            }
            // If compressed is larger than original, keep original
            if (blob.size >= file.size) {
              resolve(file)
              return
            }
            const compressed = new File(
              [blob],
              file.name.replace(/\.(png|webp)$/i, '.jpg'),
              { type: 'image/jpeg', lastModified: Date.now() }
            )
            resolve(compressed)
          },
          'image/jpeg',
          TARGET_QUALITY
        )
      }
      img.src = e.target?.result as string
    }
    reader.readAsDataURL(file)
  })
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

// ============================================================================
// Component
// ============================================================================

export default function ListingForm({ supplierId, userId, existingId, initialData, redirectAfterSubmit }: ListingFormProps) {
  const router = useRouter()
  const isEditing = !!existingId

  /* ✏️ (٢٠ أغسطس ٢٠٢٦) محمد: «عايز أقدر أعدّل الصور، بس مش لازم لما أدوس
     تعديل أبدأ الإعلان من الأول».

     الفورم ده ٥ خطوات، وكان بيبدأ من خطوة ١ **حتى في التعديل**، وشِيبْس
     الخطوات فوق كانت `<div>` من غير `onClick` — يعني مش قابلة للدوس. وزرار
     الحفظ **موجود في الخطوة ٥ بس**. فعشان تغيّر صورة واحدة كنت مضطر:
     تأكّد الفئة (١) → تعدّي التحقق من العنوان والحي (٢) → تملا كل خاصية
     مطلوبة (٣) → توصل للصور (٤) → تكمّل للخطوة ٥ عشان تلاقي زرار الحفظ.

     وأوحش حاجة: لو خاصية بقت **مطلوبة** بعد ما الإعلان اتعمل، الخطوة ٣
     بتبقى حيطة — الإعلان مايتحفظش تاني من الواجهة دي **أبدًا**.

     دلوقتي في التعديل: بنبدأ من **خطوة الصور**، والخطوات كلها قابلة للدوس،
     وزرار الحفظ ظاهر في أي خطوة. */
  const [step, setStep] = useState(existingId ? 4 : 1)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [processingImages, setProcessingImages] = useState(false)

  const [categories, setCategories] = useState<Category[]>([])
  const [loadingCategories, setLoadingCategories] = useState(true)
  // 🗂️ تصفّح الفئات زي الماركت بليس: تاب المجال → كارت المجموعة → الأقسام
  // «الكل» اتشال — بنبدأ من «بيع» زي الماركت بليس بالظبط.
  const [pickTrack, setPickTrack] = useState<FormTrackTab>('products')
  const [pickGroup, setPickGroup] = useState<string | null>(null)

  const [form, setForm] = useState<ListingFormData>({
    category_id: initialData?.category_id || null,
    title: initialData?.title || '',
    description: initialData?.description || '',
    city: initialData?.city || 'القاهرة',
    district: initialData?.district || '',
    address: initialData?.address || '',
    min_booking_hours: initialData?.min_booking_hours ?? null,
    product_condition: initialData?.product_condition ?? null,
    brand: initialData?.brand ?? '',
    model_name: initialData?.model_name ?? '',
    stock_quantity: initialData?.stock_quantity ?? null,
    shipping_available: initialData?.shipping_available ?? null,
    shipping_cost: initialData?.shipping_cost ?? null,
    branches: initialData?.branches ?? [],
    latitude: initialData?.latitude ?? null,
    longitude: initialData?.longitude ?? null,
    max_booking_hours: initialData?.max_booking_hours ?? null,
    status: initialData?.status || 'draft',
    requires_id_verification: initialData?.requires_id_verification || false,
    attributeValues: {},
    photos: initialData?.existingPhotos || [],
    pricing: initialData?.existingPricing && initialData.existingPricing.length > 0
      ? initialData.existingPricing
      : [{ period_type: 'daily', price: '', min_periods: null, is_active: true }],
  })

  const [attributes, setAttributes] = useState<Attribute[]>([])
  const [loadingAttrs, setLoadingAttrs] = useState(false)

  // 💰 (٢٥/٨/٢٠٢٦) وحدات التسعير من التصنيف نفسه — محمد: «العربية في قسم بيع
  //    وبيظهر السعر لكل ساعة». التصنيفات فيها allowed_pricing_periods
  //    (بيع = per_unit بس) — قايمة الوحدات بتتفلتر عليها، والبيع بيتكتب
  //    كمان في price_egp عشان العرض وفحص «مفيش سعر» يشوفوه.
  const selCat = categories.find(c => c.id === form.category_id)
  const allowedPeriods = selCat?.allowed_pricing_periods && selCat.allowed_pricing_periods.length > 0
    ? selCat.allowed_pricing_periods : null
  const isFlatSale = !!allowedPeriods && allowedPeriods.length === 1 && allowedPeriods[0] === 'per_unit'

  // أول ما التصنيف يتحدد/يتغير: لو التسعير لسه على الوضع الافتراضي الفاضي،
  // حوّل وحدته لوحدة التصنيف (بيع → «الوحدة» بدل «اليوم»).
  useEffect(() => {
    if (!selCat) return
    const def = selCat.default_pricing_period
      || (allowedPeriods && allowedPeriods.length > 0 ? allowedPeriods[0] : null)
    if (!def) return
    setForm(f => {
      const untouched = f.pricing.length === 1 && !f.pricing[0].price && !f.pricing[0].id
      const badPeriod = allowedPeriods && f.pricing.some(p => !p.id && !allowedPeriods.includes(p.period_type))
      if (!untouched && !badPeriod) return f
      return {
        ...f,
        pricing: f.pricing.map(p => (p.id || (allowedPeriods && allowedPeriods.includes(p.period_type)))
          ? p : { ...p, period_type: def as PricingRule['period_type'] }),
      }
    })
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [form.category_id, categories.length])

  // ========================================
  // OTP / WhatsApp verification (Task 4)
  // ========================================
  const [showOTP, setShowOTP] = useState(false)
  const [otpStep, setOtpStep] = useState<'phone' | 'code' | 'success'>('phone')
  const [otpPhone, setOtpPhone] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [otpSending, setOtpSending] = useState(false)
  const [otpVerifying, setOtpVerifying] = useState(false)
  const [otpError, setOtpError] = useState<string | null>(null)
  const [otpDraftListingId, setOtpDraftListingId] = useState<string | null>(null)
  const [savedPayloadAfterOTP, setSavedPayloadAfterOTP] = useState<any>(null)

  // Prefill phone from user profile on mount
  useEffect(() => {
    const loadPhone = async () => {
      const { data: { user } } = await supabaseBrowser.auth.getUser()
      if (!user) return
      const { data: profile } = await supabaseBrowser
        .from('profiles')
        .select('phone')
        .eq('id', user.id)
        .maybeSingle()
      if (profile?.phone) {
        setOtpPhone(profile.phone)
      }
    }
    loadPhone()
  }, [])


  // Load categories
  useEffect(() => {
    const load = async () => {
      const { data } = await supabaseBrowser
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
      // الأنواع المولّدة بتوصف أعمدة الجدول كلها بأنواع واسعة (track: string|null)
      // بينما `Category` هنا بيسمّي القيم الفعلية — قيود CHECK في الداتابيز هي
      // اللي بتضمن صحتها. الكاست على الحدود بس.
      setCategories((data || []) as unknown as Category[])
      setLoadingCategories(false)
    }
    load()
  }, [])

  // 🗂️ لو بنعدّل إعلان موجود، الخطوة تفتح على **تاب ومجموعة فئته** مش على
  //    «الكل» — عشان المورّد يلاقي نفسه مكانه على طول بدل ما يدوّر تاني.
  //    بيتنفّذ مرة واحدة أول ما التصنيفات تتحمّل.
  useEffect(() => {
    if (!categories.length || !form.category_id) return
    let cur = categories.find(c => c.id === form.category_id)
    let guard = 0
    while (cur?.parent_id && guard++ < 5) {
      const p = categories.find(c => c.id === cur!.parent_id)
      if (!p) break
      cur = p
    }
    if (!cur) return
    // نفس الدمج بتاع التابات: hybrid ← إيجار، sales ← بيع.
    const t = cur.track === 'hybrid' ? 'rentals' : cur.track === 'sales' ? 'products' : cur.track
    if (t && FORM_TRACKS.some(f => f.key === t)) setPickTrack(t as FormTrackTab)
    if (cur.group_slug) setPickGroup(cur.group_slug)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories])

  // Load attributes when category changes
  useEffect(() => {
    if (!form.category_id) {
      setAttributes([])
      return
    }
    // الحارس فوق بيضمن إنها مش null، بس TS مش بيحافظ على التضييق جوه
    // الدالة غير المتزامنة — فبنمسك القيمة المتحقق منها في ثابت.
    const categoryId = form.category_id
    const load = async () => {
      setLoadingAttrs(true)
      const { data } = await supabaseBrowser
        .from('attributes')
        .select('*')
        .eq('category_id', categoryId)
        .order('display_order', { ascending: true })
      setAttributes((data || []) as unknown as Attribute[])

      if (initialData?.existingAttributes && Object.keys(form.attributeValues).length === 0) {
        const valuesMap: Record<string, any> = {}
        for (const ea of initialData.existingAttributes) {
          const attr = ((data || []) as unknown as Attribute[]).find((a) => a.id === ea.attribute_id)
          if (attr) valuesMap[attr.field_key] = ea.value
        }
        setForm(f => ({ ...f, attributeValues: valuesMap }))
      }
      setLoadingAttrs(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.category_id])

  const TOTAL_STEPS = 5

  // نفس مشي الشجرة اللي في الإفكت فوق: التراك بيتحدد من التصنيف الجذر.
  const isProductTrack = (() => {
    let cur = categories.find(c => c.id === form.category_id)
    let guard = 0
    while (cur?.parent_id && guard++ < 5) {
      const parent = categories.find(c => c.id === cur!.parent_id)
      if (!parent) break
      cur = parent
    }
    return !!cur?.track && PRODUCT_TRACKS.includes(cur.track)
  })()

  const canGoNext = () => {
    if (step === 1) return !!form.category_id
    if (step === 2) return form.title.trim().length > 0 && form.district.trim().length > 0
    if (step === 3) {
      for (const attr of attributes) {
        if (attr.is_required) {
          const val = form.attributeValues[attr.field_key]
          if (val === undefined || val === '' || val === null) return false
          if (Array.isArray(val) && val.length === 0) return false
        }
      }
      return true
    }
    if (step === 4) return form.photos.length > 0
    if (step === 5) {
      return form.pricing.some(p => p.is_active && parseFloat(p.price) > 0)
    }
    return true
  }

  const handlePhotoUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setError(null)
    setProcessingImages(true)

    const newPhotos: Photo[] = []
    const errors: string[] = []

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]

        if (!file.type.startsWith('image/')) {
          errors.push(`"${file.name}" مش صورة`)
          continue
        }

        // Hard upper limit: 25MB raw input
        if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
          errors.push(`"${file.name}" حجمها ${formatBytes(file.size)} (الحد الأقصى ${MAX_FILE_SIZE_MB}MB)`)
          continue
        }

        try {
          // Auto-compress if large
          const processed = await compressImage(file)

          newPhotos.push({
            url: URL.createObjectURL(processed),
            caption: '',
            is_primary: form.photos.length === 0 && newPhotos.length === 0,
            display_order: form.photos.length + newPhotos.length,
            file: processed,
            uploading: false,
            originalSize: file.size,
            compressedSize: processed.size,
          })
        } catch (compressErr: any) {
          // If compression fails, fall back to original (if reasonable size)
          if (file.size <= 8 * 1024 * 1024) {
            newPhotos.push({
              url: URL.createObjectURL(file),
              caption: '',
              is_primary: form.photos.length === 0 && newPhotos.length === 0,
              display_order: form.photos.length + newPhotos.length,
              file,
              uploading: false,
              originalSize: file.size,
              compressedSize: file.size,
            })
          } else {
            errors.push(`"${file.name}": ${compressErr?.message || 'فشل المعالجة'}`)
          }
        }
      }

      if (newPhotos.length > 0) {
        setForm(f => ({ ...f, photos: [...f.photos, ...newPhotos] }))
      }

      if (errors.length > 0) {
        setError(errors.join(' · '))
      }
    } finally {
      setProcessingImages(false)
    }
  }

  const removePhoto = (idx: number) => {
    setForm(f => {
      const newPhotos = f.photos.filter((_, i) => i !== idx)
      if (newPhotos.length > 0 && !newPhotos.some(p => p.is_primary)) {
        newPhotos[0].is_primary = true
      }
      return { ...f, photos: newPhotos }
    })
  }

  const setPrimary = (idx: number) => {
    setForm(f => ({
      ...f,
      photos: f.photos.map((p, i) => ({ ...p, is_primary: i === idx })),
    }))
  }

  const addPricingRule = () => {
    setForm(f => ({
      ...f,
      pricing: [...f.pricing, { period_type: 'daily', price: '', min_periods: null, is_active: true }],
    }))
  }
  const removePricingRule = (idx: number) => {
    setForm(f => ({ ...f, pricing: f.pricing.filter((_, i) => i !== idx) }))
  }
  const updatePricingRule = (idx: number, patch: Partial<PricingRule>) => {
    setForm(f => ({
      ...f,
      pricing: f.pricing.map((p, i) => (i === idx ? { ...p, ...patch } : p)),
    }))
  }

  // ========================================
  // OTP gate (Task 4) — wraps publish with WA verification
  // Exempt: 4 internal supplier IDs (admin/Madmona/Madmona-internal/بيلرز)
  // Skip OTP if already verified in last 30 days OR if editing already-published
  // ========================================
  const EXEMPT_SUPPLIERS = [
    '147cd904-c8d7-4234-86d4-388b5e1f5694',
    '7310f6ef-e474-4ef8-8b8a-388b5e1f5694',
    'c8b7b9d7-0000-0000-0000-000000000000',
    '69ccb608-151d-46e0-9bc4-9b023cab529e',
  ]

  const handlePublishClick = async () => {
    setOtpError(null)

    // Exempt internal suppliers — publish directly
    if (EXEMPT_SUPPLIERS.includes(supplierId)) {
      return handleSubmit(false)
    }

    // Editing an already-published listing? No OTP needed (already verified).
    if (isEditing && initialData?.status === 'published') {
      return handleSubmit(false)
    }

    // Check if phone is already verified in last 30 days
    if (otpPhone) {
      try {
        const { data: alreadyVerified } = await supabaseBrowser.rpc('is_phone_verified', {
          p_phone: otpPhone,
        })
        if (alreadyVerified === true) {
          // Skip OTP modal — just publish (server will set phone_verified_at via trigger logic)
          return publishVerifiedListing()
        }
      } catch (e) {
        // RPC error — fall through to OTP modal
      }
    }

    // Save as draft first (this ALWAYS works — no publish gate)
    setSubmitting(true)
    setError(null)
    try {
      const draftId = await persistListingAsDraft()
      setOtpDraftListingId(draftId)
      setShowOTP(true)
      setOtpStep('phone')
      setSubmitting(false)
    } catch (e: any) {
      setError(e?.message || 'فشل حفظ المسودة، حاول تاني')
      setSubmitting(false)
    }
  }

  // 📸 (٢٥/٨/٢٠٢٦ — محمد: «بيطلب من سامية الصور بترفع الصور بيجيب لها خطأ»)
  // حفظ الصور بمسار مزدوج — مصدر واحد للفلوّين (الحفظ كمسودة والنشر):
  //   • جلسة Supabase موجودة → رفع مباشر للستوريج (زي الأول)، ولو الرفع
  //     المباشر فشل بنقع تلقائيًا على API اللوحة.
  //   • مفيش جلسة (موظف داخل بكوكي اللوحة بس) → الرفع كله عبر
  //     /api/admin/listing-photo (بترفع وتسجل الصف بنفسها)، ومن غير
  //     مسح/إعادة إدخال للصور القديمة (مش هينفع من غير جلسة).
  const persistPhotos = async (listingId: string) => {
    const { data: { session } } = await supabaseBrowser.auth.getSession()
    const hasSession = !!session?.user

    const uploadViaApi = async (photo: (typeof form.photos)[number], i: number) => {
      const fd = new FormData()
      fd.append('listing_id', listingId)
      fd.append('file', photo.file as File)
      fd.append('display_order', String(i))
      fd.append('is_primary', String(photo.is_primary))
      const r = await fetch('/api/admin/listing-photo', { method: 'POST', body: fd })
      const j = await r.json().catch(() => null)
      if (!r.ok || j?.ok === false) {
        throw new Error(`فشل رفع صورة ${i + 1}: ${j?.error || `HTTP ${r.status}`}`)
      }
    }

    if (!hasSession) {
      // كوكي اللوحة بس: نرفع الملفات الجديدة عبر الـAPI ونسيب القديم زي ما هو
      for (let i = 0; i < form.photos.length; i++) {
        const photo = form.photos[i]
        if (photo.file) await uploadViaApi(photo, i)
      }
      return
    }

    // جلسة موجودة — نفس السلوك القديم (مسح + إعادة إدخال) مع فولباك API
    if (isEditing) {
      await supabaseBrowser.from('listing_photos').delete().eq('listing_id', listingId)
    }
    const rows: any[] = []
    for (let i = 0; i < form.photos.length; i++) {
      const photo = form.photos[i]
      let photoUrl = photo.url
      let storagePath: string | null = photo.storage_path || null
      if (photo.file) {
        const ext = (photo.file.name.split('.').pop() || 'jpg').toLowerCase()
        const path = `${session!.user.id}/${listingId}/${Date.now()}-${i}.${ext}`
        const { error: uploadErr } = await supabaseBrowser.storage
          .from('listing-photos')
          .upload(path, photo.file, { cacheControl: '3600', upsert: false })
        if (uploadErr) {
          console.error('Upload failed, falling back to admin API:', uploadErr)
          await uploadViaApi(photo, i)
          continue // الـAPI سجلت الصف بنفسها
        }
        const { data: { publicUrl } } = supabaseBrowser.storage
          .from('listing-photos')
          .getPublicUrl(path)
        photoUrl = publicUrl
        storagePath = path
      }
      rows.push({
        listing_id: listingId,
        url: photoUrl,
        storage_path: storagePath,
        caption: photo.caption || null,
        is_primary: photo.is_primary,
        display_order: i,
      })
    }
    if (rows.length > 0) {
      const { error: photosErr } = await supabaseBrowser.from('listing_photos').insert(rows)
      if (photosErr) throw photosErr
    }
  }

  // Helper: save listing as draft + photos/attrs/pricing, return listingId
  const persistListingAsDraft = async (): Promise<string> => {
    const slug = isEditing
      ? undefined
      : `listing-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`

    const listingPayload: any = {
      supplier_id: supplierId,
      category_id: form.category_id,
      title: form.title.trim(),
      description: form.description.trim() || null,
      city: form.city.trim() || null,
      district: form.district.trim() || null,
      address: form.address.trim() || null,
      status: 'draft',
    }
    if (form.requires_id_verification) listingPayload.requires_id_verification = true
    if (slug) listingPayload.slug = slug
    if (form.min_booking_hours !== null) listingPayload.min_booking_hours = form.min_booking_hours
    if (form.max_booking_hours !== null) listingPayload.max_booking_hours = form.max_booking_hours
    applyDisplayParityFields(listingPayload, form)
    // 💰 (٢٥/٨) إعلانات البيع: السعر الثابت يتكتب في price_egp كمان — العرض
    //    وفحص «النشر متوقف: مفيش سعر» بيبصوا عليه.
    {
      const flat = form.pricing.find(p => p.price && parseFloat(p.price) > 0)
      if (isFlatSale && flat) listingPayload.price_egp = parseFloat(flat.price)
    }
    // 🚗 (٢٥/٨) حقول التصنيف make/model هي المصدر — بننسخها لخانات العرض
    //    العامة (brand/model_name) عشان صفحة الإعلان تعرض نفس القيم.
    {
      const mk = form.attributeValues['make']; const md = form.attributeValues['model']
      if (attributes.some(a => a.field_key === 'make') && mk) listingPayload.brand = String(mk)
      if (attributes.some(a => a.field_key === 'model') && md) listingPayload.model_name = String(md)
    }

    let listingId = existingId

    if (isEditing) {
      const { error: updateErr } = await supabaseBrowser
        .from('listings')
        .update(listingPayload)
        .eq('id', existingId)
      if (updateErr) throw updateErr
    } else {
      const { data: newListing, error: insertErr } = await supabaseBrowser
        .from('listings')
        .insert(listingPayload)
        .select('id')
        .single()
      if (insertErr) throw insertErr
      listingId = newListing.id
    }

    if (!listingId) throw new Error('فشل إنشاء المنتج')

    // 📸 (٢٥/٨) الصور — مسار موحّد مع فولباك API اللوحة (شوف persistPhotos)
    await persistPhotos(listingId)

    // Save attribute values
    if (isEditing) {
      await supabaseBrowser.from('listing_values').delete().eq('listing_id', listingId)
    }
    const valuesToInsert: any[] = []
    for (const attr of attributes) {
      const v = form.attributeValues[attr.field_key]
      if (v !== undefined && v !== '' && v !== null) {
        valuesToInsert.push({ listing_id: listingId, attribute_id: attr.id, value: v })
      }
    }
    if (valuesToInsert.length > 0) {
      // 🐛 (١٤ أغسطس ٢٠٢٦) الفشل هنا كان **بيتبلع**: الـdelete فوق بيمسح
      // القديم، وبعدين لو الـinsert فشل الإعلان بيفضل من غير مواصفات ولا
      // أسعار — والمورد يشوف «تم الحفظ». `handleSubmit` كان بيفحص الأخطاء
      // دي فعلًا، والمسار ده (نشر بعد OTP) لأ. بقوا متساويين.
      const { error: valuesErr } = await supabaseBrowser.from('listing_values').insert(valuesToInsert)
      if (valuesErr) throw valuesErr
    }

    // Save pricing rules
    if (isEditing) {
      await supabaseBrowser.from('pricing_rules').delete().eq('listing_id', listingId)
    }
    const pricingToInsert = form.pricing
      .filter(p => p.is_active && parseFloat(p.price) > 0)
      .map((p, idx) => {
        const row: any = {
          listing_id: listingId,
          period_type: p.period_type,
          period_count: 1,
          price: parseFloat(p.price),
          currency: 'EGP',
          is_active: true,
          display_order: idx,
        }
        if (p.min_periods !== null && p.min_periods !== undefined) row.min_periods = p.min_periods
        return row
      })
    if (pricingToInsert.length > 0) {
      // نفس الحكاية: الأسعار بتتمسح الأول، فلو الإضافة فشلت الإعلان بيتنشر
      // **من غير سعر خالص** والمورد مش عارف.
      const { error: pricingErr } = await supabaseBrowser.from('pricing_rules').insert(pricingToInsert)
      if (pricingErr) throw pricingErr
    }

    return listingId
  }

  // Helper: publish a listing where phone is already verified (skip OTP)
  const publishVerifiedListing = async () => {
    setSubmitting(true)
    setError(null)
    try {
      // Persist as draft first to make sure all rows exist
      const listingId = await persistListingAsDraft()
      // Flip to published — set contact_phone + phone_verified_at
      const { error: pubErr } = await supabaseBrowser
        .from('listings')
        .update({
          status: 'published',
          published_at: new Date().toISOString(),
          contact_phone: otpPhone,
          phone_verified_at: new Date().toISOString(),
        })
        .eq('id', listingId)
      if (pubErr) throw pubErr
      router.push(redirectAfterSubmit || '/supplier/marketplace?success=1')
    } catch (e: any) {
      setError(e?.message || 'فشل النشر، حاول تاني')
      setSubmitting(false)
    }
  }

  const sendOTP = async () => {
    setOtpError(null)
    if (!otpPhone || otpPhone.length < 11) {
      setOtpError('اكتب رقم واتساب صحيح (11 رقم، يبدأ بـ 01)')
      return
    }
    setOtpSending(true)
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      const res = await fetch(
        '/api/auth/otp',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token || ''}`,
          },
          body: JSON.stringify({ phone: otpPhone, listing_id: otpDraftListingId }),
        }
      )
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || body.message || 'فشل إرسال الكود')
      setOtpStep('code')
    } catch (e: any) {
      setOtpError(e?.message || 'فشل إرسال الكود')
    } finally {
      setOtpSending(false)
    }
  }

  const verifyOTP = async () => {
    setOtpError(null)
    if (!otpCode || otpCode.length !== 6) {
      setOtpError('اكتب الكود الـ 6 أرقام')
      return
    }
    // 🐛 (١٣ أغسطس ٢٠٢٦) مكانش فيه حارس هنا: لو الحالة اتصفّرت (إعادة تحميل
    // أو رجوع خطوة)، الكود كان بيبعت `null` كـ listing_id للـRPC وبعدين يعمل
    // `update … .eq('id', null)` — يعني **مفيش صف بيتحدّث** والمستخدم يشوف
    // نجاح كاذب والإعلان يفضل مش منشور. دلوقتي بيقف برسالة واضحة.
    if (!otpDraftListingId) {
      setOtpError('حصلت مشكلة في الجلسة — اقفل وافتح الخطوة تاني')
      return
    }
    setOtpVerifying(true)
    try {
      // Call verify_phone_otp RPC — it sets contact_phone + phone_verified_at on the listing
      const { data: verifyResult, error: verifyErr } = await supabaseBrowser.rpc(
        'verify_phone_otp',
        {
          p_phone: otpPhone,
          p_code: otpCode,
          p_listing_id: otpDraftListingId,
        }
      )
      if (verifyErr) throw verifyErr
      // بترجّع jsonb: { verified, error? }
      const vr = jsonObj<{ verified: boolean; error: string }>(verifyResult)
      if (vr.verified !== true) {
        throw new Error(vr.error || 'الكود غلط')
      }
      // Now update status to 'published' — trigger will pass
      const { error: pubErr } = await supabaseBrowser
        .from('listings')
        .update({ status: 'published', published_at: new Date().toISOString() })
        .eq('id', otpDraftListingId)
      if (pubErr) throw pubErr
      setOtpStep('success')
      setTimeout(() => {
        setShowOTP(false)
        router.push(redirectAfterSubmit || '/supplier/marketplace?success=1')
      }, 1500)
    } catch (e: any) {
      setOtpError(e?.message || 'فشل التحقق من الكود')
    } finally {
      setOtpVerifying(false)
    }
  }

  const handleSubmit = async (saveAsDraft = false) => {
    setError(null)
    setSubmitting(true)

    try {
      const status = saveAsDraft ? 'draft' : 'published'
      const slug = isEditing
        ? undefined
        : `listing-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`

      const listingPayload: any = {
        supplier_id: supplierId,
        category_id: form.category_id,
        title: form.title.trim(),
        description: form.description.trim() || null,
        city: form.city.trim() || null,
        district: form.district.trim() || null,
        address: form.address.trim() || null,
        status,
      }
      if (form.requires_id_verification) {
        listingPayload.requires_id_verification = true
      }
      if (slug) listingPayload.slug = slug
      if (form.min_booking_hours !== null) listingPayload.min_booking_hours = form.min_booking_hours
      if (form.max_booking_hours !== null) listingPayload.max_booking_hours = form.max_booking_hours
      applyDisplayParityFields(listingPayload, form)
      // 💰 (٢٥/٨) نفس قاعدة persistListingAsDraft: سعر البيع الثابت → price_egp
      {
        const flat = form.pricing.find(p => p.price && parseFloat(p.price) > 0)
        if (isFlatSale && flat) listingPayload.price_egp = parseFloat(flat.price)
      }
      // 🚗 (٢٥/٨) نفس القاعدة: make/model من حقول التصنيف → brand/model_name
      {
        const mk = form.attributeValues['make']; const md = form.attributeValues['model']
        if (attributes.some(a => a.field_key === 'make') && mk) listingPayload.brand = String(mk)
        if (attributes.some(a => a.field_key === 'model') && md) listingPayload.model_name = String(md)
      }
      // 📅 (٢٠ أغسطس ٢٠٢٦) تاريخ النشر يتحط **مرة واحدة** وقت النشر الأول بس.
      //    كان بيتحدّث في كل حفظ — يعني تعديل صورة كان بيرجّع الإعلان لأول
      //    الماركتبليس كإنه جديد، وبيضيّع تاريخ نشره الحقيقي.
      if (status === 'published' && !isEditing) {
        listingPayload.published_at = new Date().toISOString()
      }

      let listingId = existingId

      if (isEditing) {
        const { error: updateErr } = await supabaseBrowser
          .from('listings')
          .update(listingPayload)
          .eq('id', existingId)
        if (updateErr) throw updateErr
      } else {
        const { data: newListing, error: insertErr } = await supabaseBrowser
          .from('listings')
          .insert(listingPayload)
          .select('id')
          .single()
        if (insertErr) throw insertErr
        listingId = newListing.id
      }

      // 3. 📸 (٢٥/٨) الصور — مسار موحّد مع فولباك API اللوحة (persistPhotos)
      if (!listingId) throw new Error('فشل إنشاء المنتج')
      await persistPhotos(listingId)

      // 5. Save attribute values
      if (isEditing) {
        await supabaseBrowser.from('listing_values').delete().eq('listing_id', listingId)
      }
      const valuesToInsert: any[] = []
      for (const attr of attributes) {
        const v = form.attributeValues[attr.field_key]
        if (v !== undefined && v !== '' && v !== null) {
          valuesToInsert.push({
            listing_id: listingId,
            attribute_id: attr.id,
            value: v,
          })
        }
      }
      if (valuesToInsert.length > 0) {
        const { error: valuesErr } = await supabaseBrowser.from('listing_values').insert(valuesToInsert)
        if (valuesErr) throw valuesErr
      }

      // 6. Save pricing rules
      if (isEditing) {
        await supabaseBrowser.from('pricing_rules').delete().eq('listing_id', listingId)
      }
      const pricingToInsert = form.pricing
        .filter(p => p.is_active && parseFloat(p.price) > 0)
        .map((p, idx) => {
          const row: any = {
            listing_id: listingId,
            period_type: p.period_type,
            period_count: 1,
            price: parseFloat(p.price),
            currency: 'EGP',
            is_active: true,
            display_order: idx,
          }
          if (p.min_periods !== null && p.min_periods !== undefined) {
            row.min_periods = p.min_periods
          }
          return row
        })
      if (pricingToInsert.length > 0) {
        const { error: pricingErr } = await supabaseBrowser.from('pricing_rules').insert(pricingToInsert)
        if (pricingErr) throw pricingErr
      }

      router.push(redirectAfterSubmit || '/supplier/marketplace?success=1')
    } catch (e: any) {
      console.error('Submit error:', e)
      setError(e.message || 'حصل خطأ، حاول تاني')
      setSubmitting(false)
    }
  }

  // ============================================================================
  // Render
  // ============================================================================

  const rootCats = categories.filter(c => !c.parent_id)
  const subCats = (parentId: string) => categories.filter(c => c.parent_id === parentId)
  const selectedCat = categories.find(c => c.id === form.category_id)
  // 🚗 (18 Jul 2026) شجرة 3 مستويات (مركبات ونقل → زيرو/مستعمل → سيارة): اطلع لأعلى أب
  const selectedRoot = (() => {
    let cur = selectedCat
    let guard = 0
    while (cur?.parent_id && guard++ < 5) {
      const p = categories.find(c => c.id === cur!.parent_id)
      if (!p) break
      cur = p
    }
    return cur
  })()
  // المستوى التاني المختار (نفس الفئة لو تانية، أو أبوها لو المختارة تالتة)
  const selectedL2 = selectedCat && selectedCat.parent_id
    ? (selectedCat.parent_id === selectedRoot?.id ? selectedCat : categories.find(c => c.id === selectedCat.parent_id))
    : undefined

  // 🗂️ (٢٥ يوليو ٢٠٢٦ — محمد) نفس منطق الماركت بليس بالظبط: فلترة بالمجال،
  //    وبعدين تجميع بـ`group_slug`. قبل كده كانت الخطوة دي بتفرد **كل** الفئات
  //    الجذر (٩٠+) في حيطة واحدة — نفس الزحمة اللي شيلناها من صفحة الإضافة.
  //    ولو المجال فيه مجموعة واحدة بس، بنعدّي مستوى المجموعات على طول
  //    عشان مانحطّش خطوة فاضية (زي `StepCategory` في صفحة الإضافة).
  const trackCats = rootCats.filter(c => catInTrack(c.track, pickTrack))

  const rootGroups = (() => {
    const map = new Map<string, { key: string; name_ar: string; emoji: string; order: number; cats: Category[] }>()
    for (const c of trackCats) {
      const key = c.group_slug || c.slug
      if (!map.has(key)) {
        map.set(key, {
          key,
          name_ar: c.group_name_ar || c.name_ar,
          emoji: c.group_emoji || c.icon || '🏷️',
          order: c.group_display_order ?? 999,
          cats: [],
        })
      }
      map.get(key)!.cats.push(c)
    }
    // Array.from مش [...spread] — التارجت هنا ماعندوش downlevelIteration
    return Array.from(map.values()).sort((a, b) => a.order - b.order)
  })()

  const grouped = rootGroups.length > 1
  const openGroup = grouped ? rootGroups.find(g => g.key === pickGroup) : undefined
  const visibleRootCats: Category[] = grouped ? (openGroup?.cats ?? []) : trackCats

  return (
    <div className="max-w-2xl mx-auto" dir="rtl">
      <div className="flex items-center justify-between mb-6 px-2">
        {[1, 2, 3, 4, 5].map((s) => (
          <div key={s} className="flex items-center flex-1">
            <button
              type="button"
              onClick={() => { if (isEditing) setStep(s) }}
              disabled={!isEditing}
              title={isEditing ? `الخطوة ${s}` : undefined}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 transition-colors ${
                isEditing ? 'cursor-pointer hover:ring-2 hover:ring-[#059669]/40' : 'cursor-default'
              } ${
                s < step
                  ? 'bg-[#34D399] text-[#04352A]'
                  : s === step
                  ? 'bg-[#34D399]/10 text-[#059669] ring-2 ring-[#059669]'
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              {s < step ? <Check className="w-4 h-4" /> : s}
            </button>
            {s < 5 && <div className={`flex-1 h-0.5 mx-1 ${s < step ? 'bg-[#34D399]' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        {error && (
          <div className="mb-4 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-900">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Step 1: Category */}
        {step === 1 && (
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
              <FolderTree className="w-5 h-5 text-[#059669]" /> اختار الفئة
            </h2>
            <p className="text-sm text-gray-500 mb-4">إيه نوع المنتج اللي بتضيفه؟</p>

            {loadingCategories ? (
              <div className="text-center py-12"><Loader2 className="w-6 h-6 text-gray-400 animate-spin mx-auto" /></div>
            ) : (
              <div className="space-y-3">
                {/* تابات المجالات — نفس الترتيب والأسماء اللي في الماركت بليس */}
                <div className="flex gap-2 overflow-x-auto pb-1 -mx-6 px-6">
                  {FORM_TRACKS.map(tt => {
                    const n = rootCats.filter(c => catInTrack(c.track, tt.key)).length
                    const on = pickTrack === tt.key
                    return (
                      <button
                        key={tt.key}
                        type="button"
                        onClick={() => { setPickTrack(tt.key); setPickGroup(null) }}
                        className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold border transition-all flex items-center gap-1.5 ${
                          on
                            ? 'bg-[#34D399] border-[#059669] text-[#04352A]'
                            : 'bg-white border-gray-100 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <span>{tt.emoji}</span>
                        <span>{tt.ar}</span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none ${
                            on ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {n}
                        </span>
                      </button>
                    )
                  })}
                </div>

                {/* المستوى الأول: كروت المجموعات (زي الماركت بليس بالظبط) */}
                {grouped && !openGroup && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {rootGroups.map(g => (
                      <button
                        key={g.key}
                        type="button"
                        onClick={() => setPickGroup(g.key)}
                        className="p-4 rounded-xl border-2 border-gray-100 bg-white text-center transition-all hover:border-gray-200 hover:-translate-y-0.5"
                      >
                        <div className="text-3xl mb-1">{g.emoji}</div>
                        <div className="text-sm font-bold text-gray-900">{g.name_ar}</div>
                        <div className="text-[11px] text-gray-400 mt-0.5">{g.cats.length} قسم</div>
                      </button>
                    ))}
                  </div>
                )}

                {/* زر الرجوع لمستوى المجموعات */}
                {grouped && openGroup && (
                  <button
                    type="button"
                    onClick={() => setPickGroup(null)}
                    className="text-xs font-bold text-[#059669] hover:underline"
                  >
                    ← كل الأقسام
                  </button>
                )}

                {visibleRootCats.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {visibleRootCats.map(rc => {
                      const isSelected = selectedRoot?.id === rc.id
                      return (
                        <button
                          key={rc.id}
                          type="button"
                          onClick={() => setForm(f => ({ ...f, category_id: rc.id, attributeValues: {} }))}
                          className={`p-4 rounded-xl border-2 text-center transition-colors ${
                            isSelected
                              ? 'border-[#059669] bg-[#34D399]/5'
                              : 'border-gray-100 hover:border-gray-200 bg-white'
                          }`}
                        >
                          <div className="text-3xl mb-1">{rc.icon}</div>
                          <div className="text-sm font-medium text-gray-900">{rc.name_ar}</div>
                        </button>
                      )
                    })}
                  </div>
                )}

                {selectedRoot && subCats(selectedRoot.id).length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mt-4 mb-2">اختار النوع تحديداً:</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {subCats(selectedRoot.id).map(sc => {
                        const isSelected = form.category_id === sc.id || selectedL2?.id === sc.id
                        return (
                          <button
                            key={sc.id}
                            type="button"
                            onClick={() => setForm(f => ({ ...f, category_id: sc.id, attributeValues: {} }))}
                            className={`p-3 rounded-lg border text-center transition-colors ${
                              isSelected
                                ? 'border-[#059669] bg-[#34D399]/5 text-[#059669]'
                                : 'border-gray-100 hover:border-gray-200 text-gray-700'
                            }`}
                          >
                            <div className="text-xl mb-0.5">{sc.icon}</div>
                            <div className="text-xs font-medium">{sc.name_ar}</div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* 🚗 (18 Jul 2026) المستوى التالت: زيرو/مستعمل → سيارة */}
                {selectedL2 && subCats(selectedL2.id).length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mt-4 mb-2">اختار الفئة تحديداً:</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {subCats(selectedL2.id).map(sc => {
                        const isSelected = form.category_id === sc.id
                        return (
                          <button
                            key={sc.id}
                            type="button"
                            onClick={() => setForm(f => ({ ...f, category_id: sc.id, attributeValues: {} }))}
                            className={`p-3 rounded-lg border text-center transition-colors ${
                              isSelected
                                ? 'border-[#059669] bg-[#34D399]/5 text-[#059669]'
                                : 'border-gray-100 hover:border-gray-200 text-gray-700'
                            }`}
                          >
                            <div className="text-xl mb-0.5">{sc.icon}</div>
                            <div className="text-xs font-medium">{sc.name_ar}</div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Basic info */}
        {step === 2 && (
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
              <Info className="w-5 h-5 text-[#059669]" /> المعلومات الأساسية
            </h2>
            <p className="text-sm text-gray-500 mb-4">عرّف المنتج بشكل واضح</p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">العنوان *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  maxLength={300}
                  required
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#059669]/30 focus:border-[#059669]"
                  placeholder="مثلاً: شاليه فاخر بإطلالة على البحر - مرسى علم"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">الوصف</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={4}
                  maxLength={2000}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#059669]/30 focus:border-[#059669]"
                  placeholder="وصف تفصيلي يساعد العميل يفهم المنتج"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">المدينة *</label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                    required
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#059669]/30 focus:border-[#059669]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">المنطقة/الحي *</label>
                  <input
                    type="text"
                    value={form.district}
                    onChange={e => setForm(f => ({ ...f, district: e.target.value }))}
                    required
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#059669]/30 focus:border-[#059669]"
                    placeholder="مصر الجديدة"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">العنوان التفصيلي</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#059669]/30 focus:border-[#059669]"
                  placeholder="(اختياري)"
                />
              </div>

              {/* 🗺️ الموقع على الخريطة — بيغذّي تبويب «الموقع» في صفحة الإعلان */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">الموقع على الخريطة</label>
                <LocationPicker
                  value={{ latitude: form.latitude, longitude: form.longitude }}
                  onChange={v => setForm(f => ({ ...f, latitude: v.latitude, longitude: v.longitude }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">أقل عدد ساعات حجز</label>
                  <input
                    type="number"
                    value={form.min_booking_hours ?? ''}
                    onChange={e => setForm(f => ({ ...f, min_booking_hours: e.target.value ? parseInt(e.target.value) : null }))}
                    min={1}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#059669]/30 focus:border-[#059669]"
                    placeholder="(اختياري)"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">أقصى عدد ساعات حجز</label>
                  <input
                    type="number"
                    value={form.max_booking_hours ?? ''}
                    onChange={e => setForm(f => ({ ...f, max_booking_hours: e.target.value ? parseInt(e.target.value) : null }))}
                    min={1}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#059669]/30 focus:border-[#059669]"
                    placeholder="(اختياري)"
                  />
                </div>
              </div>

              {/* ── تفاصيل المنتج ────────────────────────────────────────
                  نفس عنوان وترتيب القسم في صفحة العرض («تفاصيل المنتج»:
                  الحالة ← الماركة ← الموديل ← المتاح ← التوصيل)، وبنفس
                  الشرط (المسار products أو sales). */}
              {isProductTrack && (
                <div className="pt-3 border-t border-gray-100 space-y-3">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-[#2FA084]" />
                    <span className="text-sm font-bold text-gray-900">تفاصيل المنتج</span>
                    <span className="text-[11px] text-gray-400">— بتظهر في صفحة الإعلان</span>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">حالة المنتج</label>
                    <div className="flex flex-wrap gap-2">
                      {CONDITION_OPTIONS.map(o => (
                        <button
                          key={o.value}
                          type="button"
                          onClick={() => setForm(f => ({ ...f, product_condition: f.product_condition === o.value ? null : o.value }))}
                          className={`px-3 py-1.5 rounded-full border text-xs font-bold transition-all ${
                            form.product_condition === o.value
                              ? 'border-[#2FA084] bg-[#2FA084]/10 text-[#0f6b57]'
                              : 'border-gray-200 text-gray-600 hover:border-gray-300'
                          }`}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 🚗 (٢٥/٨/٢٠٢٦) محمد: «تعديل الاعلان لسة واخد مسار مختلف عن
                      الاضافة في عربيات». الماركة والموديل كانوا موجودين مرتين:
                      مرة كحقول تصنيف (attributes: make/model — بقوايم و«أخرى»)
                      ومرة كخانتين نص عامتين هنا. لما التصنيف عنده حقوله،
                      حقول التصنيف هي المصدر الوحيد والخانتين دول بيختفوا —
                      فالإضافة والتعديل بيسألوا نفس الأسئلة بالظبط. */}
                  {!attributes.some(a => a.field_key === 'make' || a.field_key === 'model') && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">الماركة</label>
                      <input
                        type="text"
                        value={form.brand}
                        onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#059669]/30 focus:border-[#059669]"
                        placeholder="(اختياري)"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">الموديل</label>
                      <input
                        type="text"
                        value={form.model_name}
                        onChange={e => setForm(f => ({ ...f, model_name: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#059669]/30 focus:border-[#059669]"
                        placeholder="(اختياري)"
                      />
                    </div>
                  </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">المتاح (عدد القطع)</label>
                      <input
                        type="number"
                        value={form.stock_quantity ?? ''}
                        onChange={e => setForm(f => ({ ...f, stock_quantity: e.target.value ? parseInt(e.target.value) : null }))}
                        min={0}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#059669]/30 focus:border-[#059669]"
                        placeholder="(اختياري)"
                      />
                      <p className="text-[11px] text-gray-400 mt-1">صفر = «نفد المخزون» في صفحة الإعلان</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">التوصيل</label>
                      <select
                        value={form.shipping_available === null ? '' : form.shipping_available ? '1' : '0'}
                        onChange={e => setForm(f => ({
                          ...f,
                          shipping_available: e.target.value === '' ? null : e.target.value === '1',
                          shipping_cost: e.target.value === '1' ? f.shipping_cost : null,
                        }))}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#059669]/30 focus:border-[#059669]"
                      >
                        <option value="">(مش محدد)</option>
                        <option value="1">متاح</option>
                        <option value="0">استلام من المحل فقط</option>
                      </select>
                    </div>
                  </div>

                  {form.shipping_available === true && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">تكلفة التوصيل (جنيه)</label>
                      <input
                        type="number"
                        value={form.shipping_cost ?? ''}
                        onChange={e => setForm(f => ({ ...f, shipping_cost: e.target.value ? Number(e.target.value) : null }))}
                        min={0}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#059669]/30 focus:border-[#059669]"
                        placeholder="سيبها فاضية لو التوصيل مجاني"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* ── فروعنا ──────────────────────────────────────────────
                  نفس عنوان القسم في صفحة العرض ونفس حقوله (الاسم، العنوان،
                  المدينة، التليفون). كان موجود في /add-listing العام بس. */}
              <div className="pt-3 border-t border-gray-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#2FA084]" />
                    <span className="text-sm font-bold text-gray-900">فروعنا</span>
                    <span className="text-[11px] text-gray-400">— بتظهر في صفحة الإعلان</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, branches: [...f.branches, { name: '', city: '', address: '', phone: '' }] }))}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-[#059669] hover:bg-[#059669]/5 rounded-lg"
                  >
                    <Plus className="w-3.5 h-3.5" /> ضيف فرع
                  </button>
                </div>

                {form.branches.length === 0 ? (
                  <p className="text-xs text-gray-400">مفيش فروع — سيبها فاضية لو مكان واحد بس.</p>
                ) : (
                  <div className="space-y-2">
                    {form.branches.map((b, i) => (
                      <div key={i} className="bg-gray-50 rounded-xl p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-gray-500">فرع {i + 1}</span>
                          <button
                            type="button"
                            onClick={() => setForm(f => ({ ...f, branches: f.branches.filter((_, j) => j !== i) }))}
                            className="text-gray-400 hover:text-red-500"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={b.name}
                            onChange={e => setForm(f => ({ ...f, branches: f.branches.map((x, j) => j === i ? { ...x, name: e.target.value } : x) }))}
                            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                            placeholder="اسم الفرع"
                          />
                          <input
                            type="text"
                            value={b.city}
                            onChange={e => setForm(f => ({ ...f, branches: f.branches.map((x, j) => j === i ? { ...x, city: e.target.value } : x) }))}
                            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                            placeholder="المدينة"
                          />
                        </div>
                        <input
                          type="text"
                          value={b.address}
                          onChange={e => setForm(f => ({ ...f, branches: f.branches.map((x, j) => j === i ? { ...x, address: e.target.value } : x) }))}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                          placeholder="العنوان"
                        />
                        <input
                          type="tel"
                          value={b.phone}
                          onChange={e => setForm(f => ({ ...f, branches: f.branches.map((x, j) => j === i ? { ...x, phone: e.target.value } : x) }))}
                          dir="ltr"
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                          placeholder="تليفون الفرع"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-gray-100">
                <label
                  className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                    form.requires_id_verification
                      ? 'border-[#2FA084] bg-[#2FA084]/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={form.requires_id_verification}
                    onChange={e => setForm(f => ({ ...f, requires_id_verification: e.target.checked }))}
                    className="w-4 h-4 mt-0.5 accent-[#2FA084]"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className={`w-4 h-4 ${form.requires_id_verification ? 'text-[#2FA084]' : 'text-gray-400'}`} />
                      <span className="text-sm font-bold text-gray-900">
                        محتاج رقم بطاقة من العميل عند الحجز؟
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                      فعّل دي لو المنتج/الخدمة جالية (زي عربيات، عقارات، معدات غالية). العميل هيبعتلك بياناته والحجز ما يتأكدش غير لما توافق أنت.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Dynamic attributes */}
        {step === 3 && (
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
              <Tag className="w-5 h-5 text-[#059669]" /> الخصائص
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              تفاصيل خاصة بالفئة اللي اخترتها ({selectedCat?.name_ar})
            </p>

            {loadingAttrs ? (
              <div className="text-center py-12"><Loader2 className="w-6 h-6 text-gray-400 animate-spin mx-auto" /></div>
            ) : attributes.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-xl text-sm text-gray-500">
                مفيش خصائص خاصة للفئة دي. تقدر تكمل.
              </div>
            ) : (
              <div className="space-y-3">
                {attributes.map(attr => (
                  <DynamicField
                    key={attr.id}
                    attribute={attr}
                    value={form.attributeValues[attr.field_key]}
                    onChange={(val) => setForm(f => ({
                      ...f,
                      attributeValues: { ...f.attributeValues, [attr.field_key]: val }
                    }))}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 4: Photos — UPGRADED with auto-compression */}
        {step === 4 && (
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-[#059669]" /> الصور
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              ارفع على الأقل صورة واحدة. الصور الكبيرة بيتم ضغطها تلقائياً (محتفظين بجودة عالية).
            </p>

            <input
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => handlePhotoUpload(e.target.files)}
              className="hidden"
              id="photo-upload"
              disabled={processingImages}
            />

            <label
              htmlFor="photo-upload"
              className={`block border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                processingImages
                  ? 'border-[#2FA084] bg-[#2FA084]/5 cursor-wait'
                  : 'border-gray-300 hover:border-[#059669] hover:bg-[#34D399]/5 cursor-pointer'
              }`}
            >
              {processingImages ? (
                <>
                  <Loader2 className="w-8 h-8 text-[#2FA084] mx-auto mb-2 animate-spin" />
                  <p className="text-sm font-medium text-[#2FA084]">جاري معالجة الصور...</p>
                  <p className="text-xs text-gray-500 mt-1">الصور الكبيرة بيتم ضغطها لتحسين السرعة</p>
                </>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-700">اضغط لرفع صور</p>
                  <p className="text-xs text-gray-500 mt-1">JPG, PNG, WebP — حتى {MAX_FILE_SIZE_MB}MB لكل صورة (هيتم ضغطها تلقائياً)</p>
                </>
              )}
            </label>

            {form.photos.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
                {form.photos.map((photo, idx) => {
                  const compressed = photo.originalSize && photo.compressedSize && photo.compressedSize < photo.originalSize
                  return (
                    <div key={idx} className="relative group rounded-lg overflow-hidden border border-gray-200">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photo.url} alt="" className="w-full h-32 object-cover" />
                      {photo.is_primary && (
                        <div className="absolute top-2 right-2 bg-[#2FA084] text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Star className="w-3 h-3 fill-white" /> رئيسية
                        </div>
                      )}
                      {compressed && (
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] px-2 py-1 text-center">
                          ضُغطت من {formatBytes(photo.originalSize!)} إلى {formatBytes(photo.compressedSize!)}
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        {!photo.is_primary && (
                          <button
                            type="button"
                            onClick={() => setPrimary(idx)}
                            className="p-2 bg-white rounded-full hover:bg-gray-100"
                            title="اجعلها الصورة الرئيسية"
                          >
                            <Star className="w-4 h-4 text-[#2FA084]" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => removePhoto(idx)}
                          className="p-2 bg-white rounded-full hover:bg-red-50"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Step 5: Pricing */}
        {step === 5 && (
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-[#059669]" /> الأسعار
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              {isFlatSale ? 'ده إعلان بيع — سعر واحد ثابت للوحدة.' : 'حدد السعر بفترات مختلفة (الأقل سعراً هيظهر للعميل)'}
            </p>

            <div className="space-y-3">
              {form.pricing.map((rule, idx) => (
                <div key={idx} className="bg-gray-50 rounded-xl p-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    {/* 💰 (٢٥/٨) الوحدات بتتفلتر على allowed_pricing_periods بتاعة
                        التصنيف — عربية بيع مش هتشوف «الساعة» تاني. */}
                    <select
                      value={rule.period_type}
                      onChange={e => updatePricingRule(idx, { period_type: e.target.value as PeriodType })}
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                      disabled={!!allowedPeriods && allowedPeriods.length === 1}
                    >
                      {periodOptions('ar')
                        .map(g => ({ ...g, options: g.options.filter(o => !allowedPeriods || allowedPeriods.includes(o.value)) }))
                        .filter(g => g.options.length > 0)
                        .map(g => (
                        <optgroup key={g.group} label={g.group}>
                          {g.options.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    <div className="relative">
                      <input
                        type="number"
                        value={rule.price}
                        onChange={e => updatePricingRule(idx, { price: e.target.value })}
                        min={0}
                        step="0.01"
                        placeholder="السعر"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm pr-12"
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">ج.م</span>
                    </div>
                  </div>
                  {form.pricing.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePricingRule(idx)}
                      className="text-xs text-red-600 hover:underline flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" /> حذف
                    </button>
                  )}
                </div>
              ))}

              {!isFlatSale && (
                <button
                  type="button"
                  onClick={addPricingRule}
                  className="w-full py-2 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-600 hover:border-[#059669] hover:text-[#059669] flex items-center justify-center gap-1"
                >
                  <Plus className="w-4 h-4" /> ضيف فترة سعر تانية
                </button>
              )}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={() => setStep(s => Math.max(1, s - 1))}
            disabled={step === 1 || submitting}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" /> رجوع
          </button>

          {step < TOTAL_STEPS ? (
            <div className="flex gap-2">
              {/* 💾 في التعديل الحفظ متاح من أي خطوة — مش مستني الخطوة ٥ */}
              {isEditing && (
                <button
                  type="button"
                  onClick={() => handleSubmit(false)}
                  disabled={submitting || processingImages}
                  className="px-5 py-2 bg-[#34D399] text-[#04352A] rounded-lg text-sm font-semibold hover:bg-[#34D399]/90 disabled:opacity-50 flex items-center gap-1"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {submitting ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                </button>
              )}
              <button
                type="button"
                onClick={() => setStep(s => s + 1)}
                disabled={!canGoNext() || processingImages}
                className={`px-5 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 ${
                  isEditing
                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    : 'bg-[#34D399] text-[#04352A] hover:bg-[#34D399]/90'
                }`}
              >
                التالي <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleSubmit(true)}
                disabled={submitting || !canGoNext()}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50"
              >
                {submitting ? '...' : 'حفظ كمسودة'}
              </button>
              <button
                type="button"
                onClick={() => handleSubmit(false)}
                disabled={submitting || !canGoNext()}
                className="px-5 py-2 bg-[#34D399] text-[#04352A] rounded-lg text-sm font-semibold hover:bg-[#34D399]/90 disabled:opacity-50 flex items-center gap-1"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {submitting ? 'جاري النشر...' : (isEditing ? 'حفظ التعديلات' : 'نشر المنتج')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Dynamic field renderer
// ============================================================================

function DynamicField({
  attribute,
  value,
  onChange,
}: {
  attribute: Attribute
  value: any
  onChange: (val: any) => void
}) {
  const label = (
    <label className="block text-xs font-medium text-gray-700 mb-1">
      {attribute.name_ar}
      {attribute.is_required && <span className="text-red-600 mr-1">*</span>}
      {attribute.unit && <span className="text-gray-400 mr-1">({attribute.unit})</span>}
    </label>
  )

  switch (attribute.field_type) {
    case 'text':
      return (
        <div>
          {label}
          <input
            type="text"
            value={value || ''}
            onChange={e => onChange(e.target.value)}
            placeholder={attribute.placeholder || ''}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#059669]/30"
          />
        </div>
      )

    case 'number':
      return (
        <div>
          {label}
          <input
            type="number"
            value={value ?? ''}
            onChange={e => onChange(e.target.value === '' ? null : parseFloat(e.target.value))}
            placeholder={attribute.placeholder || ''}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#059669]/30"
          />
        </div>
      )

    case 'boolean':
      return (
        <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100">
          <input
            type="checkbox"
            checked={!!value}
            onChange={e => onChange(e.target.checked)}
            className="w-4 h-4"
          />
          <span className="text-sm text-gray-900">{attribute.name_ar}</span>
        </label>
      )

    case 'select':
      // 📝 (٢٥/٨/٢٠٢٦) محمد: «في حالة ان الماركة مش موجودة محتاجين نضيفها
      //    تيكست — أخرى = تيكست». أي قايمة اختيار بقى فيها «أخرى…» بتفتح
      //    خانة كتابة حرة — والقيمة المكتوبة بتتحفظ زي ما هي.
      return <SelectWithOther attribute={attribute} value={value} onChange={onChange} label={label} />

    case 'multi_select':
      const arr = Array.isArray(value) ? value : []
      return (
        <div>
          {label}
          <div className="space-y-1">
            {(attribute.options || []).map(opt => (
              <label key={opt.key} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded">
                <input
                  type="checkbox"
                  checked={arr.includes(opt.key)}
                  onChange={e => {
                    if (e.target.checked) onChange([...arr, opt.key])
                    else onChange(arr.filter(v => v !== opt.key))
                  }}
                />
                <span className="text-sm">{opt.label_ar || opt.key}</span>
              </label>
            ))}
          </div>
        </div>
      )

    case 'date':
      return (
        <div>
          {label}
          <input
            type="date"
            value={value || ''}
            onChange={e => onChange(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#059669]/30"
          />
        </div>
      )

    default:
      return null
  }
}

// 📝 (٢٥/٨/٢٠٢٦) قايمة اختيار بخيار «أخرى…» بيفتح خانة كتابة حرة.
//    محمد: «الدروب ليست في اضافة او تعديل السيارات — في حالة ان الماركة
//    مش موجودة محتاجين نضيفها تيكست، أخرى = تيكست».
//    عامة لأي attribute من نوع select في المشروع كله (مش الماركة بس):
//    لو القيمة المحفوظة مش من ضمن الخيارات (اتكتبت حرة قبل كده أو جاية
//    من الويزارد) بتفتح على وضع الكتابة أوتوماتيك وبتعرضها زي ما هي.
function SelectWithOther({
  attribute,
  value,
  onChange,
  label,
}: {
  attribute: Attribute
  value: any
  onChange: (val: any) => void
  label: JSX.Element
}) {
  const opts = attribute.options || []
  const known = !value || opts.some(o => o.key === value)
  const [otherMode, setOtherMode] = useState<boolean>(!!value && !known)
  return (
    <div>
      {label}
      <select
        value={otherMode ? '__other' : (value || '')}
        onChange={e => {
          if (e.target.value === '__other') { setOtherMode(true); onChange('') }
          else { setOtherMode(false); onChange(e.target.value) }
        }}
        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#059669]/30"
      >
        <option value="">— اختر —</option>
        {opts.map(opt => (
          <option key={opt.key} value={opt.key}>{opt.label_ar || opt.key}</option>
        ))}
        <option value="__other">أخرى…</option>
      </select>
      {otherMode && (
        <input
          type="text"
          autoFocus
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder={`اكتب ${attribute.name_ar}`}
          className="mt-2 w-full px-4 py-2.5 border border-[#059669]/40 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#059669]/30"
        />
      )}
    </div>
  )
}
