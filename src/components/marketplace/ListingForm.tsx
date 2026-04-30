'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'
import {
  ChevronLeft, ChevronRight, Check, X, Plus, Upload, Trash2, Star,
  Loader2, AlertCircle, Tag, MapPin, DollarSign, Image as ImageIcon,
  FolderTree, Info,
} from 'lucide-react'

// ============================================================================
// Types
// ============================================================================

type FieldType = 'text' | 'number' | 'boolean' | 'select' | 'multi_select' | 'date' | 'file'

interface Category {
  id: string
  parent_id: string | null
  name_ar: string
  name_en: string | null
  slug: string
  icon: string | null
  is_active: boolean
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
  period_type: 'hour' | 'day' | 'week' | 'month' | 'one_time'
  price: string
  min_quantity: number
  is_active: boolean
}

interface Photo {
  id?: string
  url: string
  caption_ar: string
  is_primary: boolean
  display_order: number
  // For new uploads, we keep the file too
  file?: File
  uploading?: boolean
}

export interface ListingFormData {
  // Basic
  category_id: string | null
  title_ar: string
  title_en: string
  description_ar: string
  description_en: string
  city: string
  district: string
  address_ar: string
  // Capacity
  min_capacity: number | null
  max_capacity: number | null
  // Status
  status: 'draft' | 'published'
  // Dynamic
  attributeValues: Record<string, any>
  // Photos
  photos: Photo[]
  // Pricing
  pricing: PricingRule[]
}

interface ListingFormProps {
  supplierId: string
  userId: string
  existingId?: string  // if editing
  initialData?: Partial<ListingFormData> & {
    existingPhotos?: Photo[]
    existingPricing?: PricingRule[]
    existingAttributes?: { attribute_id: string; value: any }[]
  }
}

const PERIOD_LABELS: Record<PricingRule['period_type'], string> = {
  hour: 'بالساعة',
  day: 'باليوم',
  week: 'بالأسبوع',
  month: 'بالشهر',
  one_time: 'مرة واحدة',
}

// ============================================================================
// Component
// ============================================================================

export default function ListingForm({ supplierId, userId, existingId, initialData }: ListingFormProps) {
  const router = useRouter()
  const isEditing = !!existingId

  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Categories tree
  const [categories, setCategories] = useState<Category[]>([])
  const [loadingCategories, setLoadingCategories] = useState(true)

  // Form state
  const [form, setForm] = useState<ListingFormData>({
    category_id: initialData?.category_id || null,
    title_ar: initialData?.title_ar || '',
    title_en: initialData?.title_en || '',
    description_ar: initialData?.description_ar || '',
    description_en: initialData?.description_en || '',
    city: initialData?.city || 'القاهرة',
    district: initialData?.district || '',
    address_ar: initialData?.address_ar || '',
    min_capacity: initialData?.min_capacity ?? null,
    max_capacity: initialData?.max_capacity ?? null,
    status: initialData?.status || 'draft',
    attributeValues: {},
    photos: initialData?.existingPhotos || [],
    pricing: initialData?.existingPricing && initialData.existingPricing.length > 0
      ? initialData.existingPricing
      : [{ period_type: 'day', price: '', min_quantity: 1, is_active: true }],
  })

  // Attributes for the selected category
  const [attributes, setAttributes] = useState<Attribute[]>([])
  const [loadingAttrs, setLoadingAttrs] = useState(false)

  // Load categories
  useEffect(() => {
    const load = async () => {
      // @ts-expect-error new schema not in types
      const { data } = await supabaseBrowser
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
      setCategories(data || [])
      setLoadingCategories(false)
    }
    load()
  }, [])

  // Load attributes when category changes
  useEffect(() => {
    if (!form.category_id) {
      setAttributes([])
      return
    }
    const load = async () => {
      setLoadingAttrs(true)
      // @ts-expect-error
      const { data } = await supabaseBrowser
        .from('attributes')
        .select('*')
        .eq('category_id', form.category_id)
        .order('display_order', { ascending: true })
      setAttributes(data || [])

      // Pre-fill values from existing listing if editing
      if (initialData?.existingAttributes && Object.keys(form.attributeValues).length === 0) {
        const valuesMap: Record<string, any> = {}
        for (const ea of initialData.existingAttributes) {
          const attr = (data || []).find((a: Attribute) => a.id === ea.attribute_id)
          if (attr) valuesMap[attr.field_key] = ea.value
        }
        setForm(f => ({ ...f, attributeValues: valuesMap }))
      }
      setLoadingAttrs(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.category_id])

  // ----- Step navigation -----
  const TOTAL_STEPS = 5

  const canGoNext = () => {
    if (step === 1) return !!form.category_id
    if (step === 2) return form.title_ar.trim().length > 0 && form.district.trim().length > 0
    if (step === 3) {
      // Check required attributes
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

  // ----- Photo upload -----
  const handlePhotoUpload = async (files: FileList | null) => {
    if (!files) return
    const newPhotos: Photo[] = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (!file.type.startsWith('image/')) continue
      if (file.size > 5 * 1024 * 1024) {
        setError(`الصورة "${file.name}" أكبر من 5 ميجا`)
        continue
      }
      newPhotos.push({
        url: URL.createObjectURL(file),
        caption_ar: '',
        is_primary: form.photos.length === 0 && newPhotos.length === 0,
        display_order: form.photos.length + newPhotos.length,
        file,
        uploading: false,
      })
    }
    setForm(f => ({ ...f, photos: [...f.photos, ...newPhotos] }))
  }

  const removePhoto = (idx: number) => {
    setForm(f => {
      const newPhotos = f.photos.filter((_, i) => i !== idx)
      // If we removed the primary, make the first one primary
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

  // ----- Pricing -----
  const addPricingRule = () => {
    setForm(f => ({
      ...f,
      pricing: [...f.pricing, { period_type: 'day', price: '', min_quantity: 1, is_active: true }],
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

  // ----- Submit -----
  const handleSubmit = async (saveAsDraft = false) => {
    setError(null)
    setSubmitting(true)

    try {
      const status = saveAsDraft ? 'draft' : 'published'

      // 1. Generate slug from title_ar (transliterated) or use existing
      const slug = `${form.title_ar.trim().slice(0, 50).replace(/\s+/g, '-')}-${Date.now()}`
        .replace(/[^a-z0-9\u0600-\u06FF-]/gi, '')
        .toLowerCase()

      // 2. Calculate starting_price from active pricing rules (lowest price)
      const activePrices = form.pricing
        .filter(p => p.is_active && parseFloat(p.price) > 0)
        .map(p => parseFloat(p.price))
      const startingPrice = activePrices.length > 0 ? Math.min(...activePrices) : 0

      const listingPayload: any = {
        supplier_id: supplierId,
        category_id: form.category_id,
        title_ar: form.title_ar.trim(),
        slug: existingId ? undefined : slug,
        description_ar: form.description_ar.trim() || null,
        city: form.city.trim() || null,
        district: form.district.trim() || null,
        address_ar: form.address_ar.trim() || null,
        starting_price: startingPrice,
        currency: 'EGP',
        status,
      }
      if (form.title_en) listingPayload.title_en = form.title_en.trim()
      if (form.description_en) listingPayload.description_en = form.description_en.trim()
      if (form.min_capacity !== null) listingPayload.min_capacity = form.min_capacity
      if (form.max_capacity !== null) listingPayload.max_capacity = form.max_capacity

      let listingId = existingId

      if (isEditing) {
        // @ts-expect-error
        const { error: updateErr } = await supabaseBrowser
          .from('listings')
          .update(listingPayload)
          .eq('id', existingId)
        if (updateErr) throw updateErr
      } else {
        // @ts-expect-error
        const { data: newListing, error: insertErr } = await supabaseBrowser
          .from('listings')
          .insert(listingPayload)
          .select('id')
          .single()
        if (insertErr) throw insertErr
        listingId = newListing.id
      }

      // 3. Upload new photos to Supabase Storage
      const photosToInsert: any[] = []
      for (let i = 0; i < form.photos.length; i++) {
        const photo = form.photos[i]
        let photoUrl = photo.url

        if (photo.file) {
          // Upload to storage
          const ext = photo.file.name.split('.').pop() || 'jpg'
          const path = `${userId}/${listingId}/${Date.now()}-${i}.${ext}`
          const { error: uploadErr } = await supabaseBrowser.storage
            .from('listing-photos')
            .upload(path, photo.file, { cacheControl: '3600', upsert: false })
          if (uploadErr) {
            console.error('Upload failed:', uploadErr)
            throw new Error(`فشل رفع صورة ${i + 1}: ${uploadErr.message}`)
          }
          const { data: { publicUrl } } = supabaseBrowser.storage
            .from('listing-photos')
            .getPublicUrl(path)
          photoUrl = publicUrl
        }

        photosToInsert.push({
          listing_id: listingId,
          photo_url: photoUrl,
          caption_ar: photo.caption_ar || null,
          is_primary: photo.is_primary,
          display_order: i,
        })
      }

      // 4. Replace photos: delete existing + insert new
      if (isEditing) {
        // @ts-expect-error
        await supabaseBrowser.from('listing_photos').delete().eq('listing_id', listingId)
      }
      if (photosToInsert.length > 0) {
        // @ts-expect-error
        const { error: photosErr } = await supabaseBrowser.from('listing_photos').insert(photosToInsert)
        if (photosErr) throw photosErr
      }

      // 5. Save attribute values (listing_values)
      if (isEditing) {
        // @ts-expect-error
        await supabaseBrowser.from('listing_values').delete().eq('listing_id', listingId)
      }
      const valuesToInsert: any[] = []
      for (const attr of attributes) {
        const v = form.attributeValues[attr.field_key]
        if (v !== undefined && v !== '' && v !== null) {
          valuesToInsert.push({
            listing_id: listingId,
            attribute_id: attr.id,
            value: typeof v === 'object' ? v : v,
          })
        }
      }
      if (valuesToInsert.length > 0) {
        // @ts-expect-error
        const { error: valuesErr } = await supabaseBrowser.from('listing_values').insert(valuesToInsert)
        if (valuesErr) throw valuesErr
      }

      // 6. Save pricing rules
      if (isEditing) {
        // @ts-expect-error
        await supabaseBrowser.from('pricing_rules').delete().eq('listing_id', listingId)
      }
      const pricingToInsert = form.pricing
        .filter(p => p.is_active && parseFloat(p.price) > 0)
        .map(p => ({
          listing_id: listingId,
          period_type: p.period_type,
          price: parseFloat(p.price),
          min_quantity: p.min_quantity,
          is_active: true,
        }))
      if (pricingToInsert.length > 0) {
        // @ts-expect-error
        const { error: pricingErr } = await supabaseBrowser.from('pricing_rules').insert(pricingToInsert)
        if (pricingErr) throw pricingErr
      }

      // Done! Redirect to dashboard
      router.push('/supplier/marketplace?success=1')
    } catch (e: any) {
      console.error('Submit error:', e)
      setError(e.message || 'حصل خطأ، حاول تاني')
      setSubmitting(false)
    }
  }

  // ============================================================================
  // Render
  // ============================================================================

  // Build category tree
  const rootCats = categories.filter(c => !c.parent_id)
  const subCats = (parentId: string) => categories.filter(c => c.parent_id === parentId)
  const selectedCat = categories.find(c => c.id === form.category_id)
  const selectedRoot = selectedCat?.parent_id
    ? categories.find(c => c.id === selectedCat.parent_id)
    : selectedCat

  return (
    <div className="max-w-2xl mx-auto" dir="rtl">
      {/* Step indicator */}
      <div className="flex items-center justify-between mb-6 px-2">
        {[1, 2, 3, 4, 5].map((s) => (
          <div key={s} className="flex items-center flex-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 transition-colors ${
                s < step
                  ? 'bg-[#1F5F3F] text-white'
                  : s === step
                  ? 'bg-[#1F5F3F]/10 text-[#1F5F3F] ring-2 ring-[#1F5F3F]'
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              {s < step ? <Check className="w-4 h-4" /> : s}
            </div>
            {s < 5 && <div className={`flex-1 h-0.5 mx-1 ${s < step ? 'bg-[#1F5F3F]' : 'bg-gray-200'}`} />}
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
              <FolderTree className="w-5 h-5 text-[#1F5F3F]" /> اختار الفئة
            </h2>
            <p className="text-sm text-gray-500 mb-4">إيه نوع الـlisting اللي بتضيفه؟</p>

            {loadingCategories ? (
              <div className="text-center py-12"><Loader2 className="w-6 h-6 text-gray-400 animate-spin mx-auto" /></div>
            ) : (
              <div className="space-y-3">
                {/* Root categories */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {rootCats.map(rc => {
                    const isSelected = selectedRoot?.id === rc.id
                    return (
                      <button
                        key={rc.id}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, category_id: rc.id, attributeValues: {} }))}
                        className={`p-4 rounded-xl border-2 text-center transition-colors ${
                          isSelected
                            ? 'border-[#1F5F3F] bg-[#1F5F3F]/5'
                            : 'border-gray-100 hover:border-gray-200 bg-white'
                        }`}
                      >
                        <div className="text-3xl mb-1">{rc.icon}</div>
                        <div className="text-sm font-medium text-gray-900">{rc.name_ar}</div>
                      </button>
                    )
                  })}
                </div>

                {/* Sub-categories of selected root */}
                {selectedRoot && subCats(selectedRoot.id).length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mt-4 mb-2">اختار النوع تحديداً:</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {subCats(selectedRoot.id).map(sc => {
                        const isSelected = form.category_id === sc.id
                        return (
                          <button
                            key={sc.id}
                            type="button"
                            onClick={() => setForm(f => ({ ...f, category_id: sc.id, attributeValues: {} }))}
                            className={`p-3 rounded-lg border text-center transition-colors ${
                              isSelected
                                ? 'border-[#1F5F3F] bg-[#1F5F3F]/5 text-[#1F5F3F]'
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
              <Info className="w-5 h-5 text-[#1F5F3F]" /> المعلومات الأساسية
            </h2>
            <p className="text-sm text-gray-500 mb-4">عرّف الـlisting بشكل واضح</p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">العنوان بالعربي *</label>
                <input
                  type="text"
                  value={form.title_ar}
                  onChange={e => setForm(f => ({ ...f, title_ar: e.target.value }))}
                  maxLength={300}
                  required
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1F5F3F]/30 focus:border-[#1F5F3F]"
                  placeholder="مثلاً: شاليه فاخر بإطلالة على البحر - مرسى علم"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Title (English)</label>
                <input
                  type="text"
                  value={form.title_en}
                  onChange={e => setForm(f => ({ ...f, title_en: e.target.value }))}
                  maxLength={300}
                  dir="ltr"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1F5F3F]/30 focus:border-[#1F5F3F]"
                  placeholder="(اختياري)"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">الوصف</label>
                <textarea
                  value={form.description_ar}
                  onChange={e => setForm(f => ({ ...f, description_ar: e.target.value }))}
                  rows={4}
                  maxLength={2000}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1F5F3F]/30 focus:border-[#1F5F3F]"
                  placeholder="وصف تفصيلي يساعد العميل يفهم الـlisting"
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
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1F5F3F]/30 focus:border-[#1F5F3F]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">المنطقة/الحي *</label>
                  <input
                    type="text"
                    value={form.district}
                    onChange={e => setForm(f => ({ ...f, district: e.target.value }))}
                    required
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1F5F3F]/30 focus:border-[#1F5F3F]"
                    placeholder="مصر الجديدة"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">العنوان التفصيلي</label>
                <input
                  type="text"
                  value={form.address_ar}
                  onChange={e => setForm(f => ({ ...f, address_ar: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1F5F3F]/30 focus:border-[#1F5F3F]"
                  placeholder="(اختياري)"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">سعة دنيا</label>
                  <input
                    type="number"
                    value={form.min_capacity ?? ''}
                    onChange={e => setForm(f => ({ ...f, min_capacity: e.target.value ? parseInt(e.target.value) : null }))}
                    min={1}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1F5F3F]/30 focus:border-[#1F5F3F]"
                    placeholder="(اختياري)"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">سعة قصوى</label>
                  <input
                    type="number"
                    value={form.max_capacity ?? ''}
                    onChange={e => setForm(f => ({ ...f, max_capacity: e.target.value ? parseInt(e.target.value) : null }))}
                    min={1}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1F5F3F]/30 focus:border-[#1F5F3F]"
                    placeholder="(اختياري)"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Dynamic attributes */}
        {step === 3 && (
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
              <Tag className="w-5 h-5 text-[#1F5F3F]" /> الخصائص
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

        {/* Step 4: Photos */}
        {step === 4 && (
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-[#1F5F3F]" /> الصور
            </h2>
            <p className="text-sm text-gray-500 mb-4">ارفع على الأقل صورة واحدة (الصور بتفرق جداً!)</p>

            <input
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => handlePhotoUpload(e.target.files)}
              className="hidden"
              id="photo-upload"
            />

            <label
              htmlFor="photo-upload"
              className="block border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-[#1F5F3F] hover:bg-[#1F5F3F]/5 cursor-pointer transition-colors"
            >
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-700">اضغط لرفع صور</p>
              <p className="text-xs text-gray-500 mt-1">JPG, PNG, WebP — حد أقصى 5MB لكل صورة</p>
            </label>

            {form.photos.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
                {form.photos.map((photo, idx) => (
                  <div key={idx} className="relative group rounded-lg overflow-hidden border border-gray-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo.url} alt="" className="w-full h-32 object-cover" />
                    {photo.is_primary && (
                      <div className="absolute top-2 right-2 bg-[#B8860B] text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Star className="w-3 h-3 fill-white" /> رئيسية
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
                          <Star className="w-4 h-4 text-[#B8860B]" />
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
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 5: Pricing */}
        {step === 5 && (
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-[#1F5F3F]" /> الأسعار
            </h2>
            <p className="text-sm text-gray-500 mb-4">حدد السعر بفترات مختلفة (الأقل سعراً هيظهر للعميل في الـlistings)</p>

            <div className="space-y-3">
              {form.pricing.map((rule, idx) => (
                <div key={idx} className="bg-gray-50 rounded-xl p-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={rule.period_type}
                      onChange={e => updatePricingRule(idx, { period_type: e.target.value as any })}
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                    >
                      {Object.entries(PERIOD_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
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

              <button
                type="button"
                onClick={addPricingRule}
                className="w-full py-2 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-600 hover:border-[#1F5F3F] hover:text-[#1F5F3F] flex items-center justify-center gap-1"
              >
                <Plus className="w-4 h-4" /> ضيف فترة سعر تانية
              </button>
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
            <button
              type="button"
              onClick={() => setStep(s => s + 1)}
              disabled={!canGoNext()}
              className="px-5 py-2 bg-[#1F5F3F] text-white rounded-lg text-sm font-semibold hover:bg-[#1F5F3F]/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              التالي <ChevronLeft className="w-4 h-4" />
            </button>
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
                className="px-5 py-2 bg-[#1F5F3F] text-white rounded-lg text-sm font-semibold hover:bg-[#1F5F3F]/90 disabled:opacity-50 flex items-center gap-1"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {submitting ? 'جاري النشر...' : (isEditing ? 'حفظ التعديلات' : 'نشر الـlisting')}
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
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1F5F3F]/30"
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
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1F5F3F]/30"
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
      return (
        <div>
          {label}
          <select
            value={value || ''}
            onChange={e => onChange(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1F5F3F]/30"
          >
            <option value="">— اختر —</option>
            {(attribute.options || []).map(opt => (
              <option key={opt.key} value={opt.key}>{opt.label_ar || opt.key}</option>
            ))}
          </select>
        </div>
      )

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
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1F5F3F]/30"
          />
        </div>
      )

    default:
      return null
  }
}
