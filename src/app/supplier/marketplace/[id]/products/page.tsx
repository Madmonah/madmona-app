'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'
import {
  ArrowRight, Loader2, AlertCircle, Plus, Edit3, Trash2, ToggleLeft, ToggleRight,
  Package, Image as ImageIcon, X, CheckCircle, FileSpreadsheet, Link2,
} from 'lucide-react'
import ExcelImportModal from '@/components/supplier/ExcelImportModal'

// ============================================================================
// /supplier/marketplace/[id]/products
// Supplier products catalog (mart_products) under ONE listing — like the
// restaurant menu but for products. Shows in the marketplace listing page,
// and auto-syncs to the ERP inventory for CRM+ERP subscribers.
// ============================================================================

type Stage = 'loading' | 'unauthenticated' | 'not-found' | 'is-restaurant' | 'no-permission' | 'ready'

interface ListingMin {
  id: string
  title: string
  supplier_id: string
  track: string | null
}

interface Product {
  id: string
  listing_id: string
  name_ar: string
  name_en: string | null
  description_ar: string | null
  price: number
  compare_at_price: number | null
  category: string | null
  subcategory: string | null
  unit: string | null
  brand: string | null
  barcode: string | null
  photo_url: string | null
  in_stock: boolean
  is_available: boolean
  display_order: number
  erp_product_id: string | null
}

interface FormState {
  id: string | null
  name_ar: string
  price: string
  compare_at_price: string
  category: string
  unit: string
  brand: string
  barcode: string
  description_ar: string
  photo_url: string
  in_stock: boolean
}

const EMPTY_FORM: FormState = {
  id: null, name_ar: '', price: '', compare_at_price: '', category: '',
  unit: '', brand: '', barcode: '', description_ar: '', photo_url: '', in_stock: true,
}

export default function SupplierProductsPage() {
  const params = useParams()
  const listingId = params?.id as string

  const [stage, setStage] = useState<Stage>('loading')
  const [listing, setListing] = useState<ListingMin | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [hasErp, setHasErp] = useState(false)

  const [showForm, setShowForm] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  // 🐛 (١٢ أغسطس ٢٠٢٦ — المراجعة الشاملة) uploadingPhoto/uploadPhoto كانوا
  // مستخدمين في فورم المنتج ومش معرّفين خالص — فتح الفورم كان بيضرب
  // ReferenceError ويكسر الصفحة. الرفع بيمر بـ/api/supplier/upload-media
  // (بتوكن المستخدم — السيرفر بيتأكد إنه صاحب السبلاير).
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  const uploadPhoto = async (file: File) => {
    if (!listing) return
    setUploadingPhoto(true)
    setFormError(null)
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session) throw new Error('سجّل دخولك تاني وجرّب')
      const fd = new FormData()
      fd.append('file', file)
      fd.append('supplierId', listing.supplier_id)
      fd.append('kind', 'inventory')
      const res = await fetch('/api/supplier/upload-media', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: fd,
      })
      const j = await res.json().catch(() => null)
      if (!j?.success || !j?.url) throw new Error(j?.error || 'فشل رفع الصورة')
      setForm((f) => ({ ...f, photo_url: j.url as string }))
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'فشل رفع الصورة')
    } finally {
      setUploadingPhoto(false)
    }
  }

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session?.user) { setStage('unauthenticated'); return }

      const { data: l } = await supabaseBrowser
        .from('listings')
        .select('id, title, supplier_id, category:categories(track)')
        .eq('id', listingId)
        .maybeSingle()

      if (!l) { setStage('not-found'); return }

      const track = (l as { category?: { track?: string | null } | null }).category?.track ?? null
      if (track === 'restaurants') {
        setListing({ id: l.id, title: l.title, supplier_id: l.supplier_id, track })
        setStage('is-restaurant')
        return
      }

      // Ownership: supplier owner OR staff with can_manage_listings
      const { data: ownerSup } = await supabaseBrowser
        .from('marketplace_suppliers')
        .select('id')
        .eq('profile_id', session.user.id)
        .eq('id', l.supplier_id)
        .maybeSingle()

      let allowed = !!ownerSup
      if (!allowed) {
        const { data: staff } = await supabaseBrowser
          .from('supplier_staff')
          .select('can_manage_listings, supplier_id')
          .eq('profile_id', session.user.id)
          .eq('supplier_id', l.supplier_id)
          .eq('is_active', true)
          .maybeSingle()
        if (staff?.can_manage_listings) allowed = true
      }

      if (!allowed) { setStage('no-permission'); return }

      // ERP subscriber? (products auto-sync)
      const { data: erp } = await supabaseBrowser
        .from('erp_settings')
        .select('supplier_id')
        .eq('supplier_id', l.supplier_id)
        .maybeSingle()
      setHasErp(!!erp)

      setListing({ id: l.id, title: l.title, supplier_id: l.supplier_id, track })
      await loadProducts(l.id)
      setStage('ready')
    }
    init()
  }, [listingId])

  const loadProducts = async (lid: string) => {
    const { data } = await supabaseBrowser
      .from('mart_products')
      .select('*')
      .eq('listing_id', lid)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true })
    setProducts(((data || []) as Product[]).map((p) => ({
      ...p,
      price: Number(p.price),
      compare_at_price: p.compare_at_price != null ? Number(p.compare_at_price) : null,
    })))
  }

  const openNew = () => { setForm(EMPTY_FORM); setFormError(null); setShowForm(true) }

  const openEdit = (p: Product) => {
    setForm({
      id: p.id,
      name_ar: p.name_ar,
      price: String(p.price),
      compare_at_price: p.compare_at_price != null ? String(p.compare_at_price) : '',
      category: p.category || '',
      unit: p.unit || '',
      brand: p.brand || '',
      barcode: p.barcode || '',
      description_ar: p.description_ar || '',
      photo_url: p.photo_url || '',
      in_stock: p.in_stock,
    })
    setFormError(null)
    setShowForm(true)
  }

  // Save via the bulk RPC (1-row import) → ERP sync happens automatically
  const save = async () => {
    setFormError(null)
    if (!form.name_ar.trim()) { setFormError('اسم المنتج مطلوب'); return }
    const priceNum = Number(form.price)
    if (!Number.isFinite(priceNum) || priceNum < 0) { setFormError('السعر لازم رقم صحيح'); return }

    setSaving(true)
    try {
      const item: Record<string, unknown> = {
        name_ar: form.name_ar.trim(),
        price: priceNum,
        compare_at_price: form.compare_at_price ? Number(form.compare_at_price) : null,
        category: form.category.trim() || null,
        unit: form.unit.trim() || null,
        brand: form.brand.trim() || null,
        barcode: form.barcode.trim() || null,
        description_ar: form.description_ar.trim() || null,
        photo_url: form.photo_url.trim() || null,
      }
      const { data, error } = await supabaseBrowser.rpc('supplier_bulk_import_products', {
        p_listing_id: listingId,
        p_items: [item],
      })
      if (error) throw error
      const res = data as { ok: boolean; errors: { error: string }[] }
      if (res?.errors?.length) throw new Error(res.errors[0].error)

      // in_stock toggle is a direct field (not part of import semantics)
      if (form.id) {
        await supabaseBrowser.from('mart_products')
          .update({ in_stock: form.in_stock, updated_at: new Date().toISOString() })
          .eq('id', form.id)
      }

      setShowForm(false)
      await loadProducts(listingId)
    } catch (e) {
      console.error('[products/save]', e)
      setFormError(e instanceof Error ? e.message : 'حصل خطأ')
    } finally {
      setSaving(false)
    }
  }

  const toggleStock = async (p: Product) => {
    await supabaseBrowser.from('mart_products')
      .update({ in_stock: !p.in_stock, updated_at: new Date().toISOString() })
      .eq('id', p.id)
    await loadProducts(listingId)
  }

  const toggleAvailable = async (p: Product) => {
    await supabaseBrowser.from('mart_products')
      .update({ is_available: !p.is_available, updated_at: new Date().toISOString() })
      .eq('id', p.id)
    await loadProducts(listingId)
  }

  const doDelete = async (id: string) => {
    setDeletingId(id)
    try {
      await supabaseBrowser.from('mart_products').delete().eq('id', id)
      await loadProducts(listingId)
    } finally {
      setDeletingId(null)
      setConfirmDelete(null)
    }
  }

  if (stage === 'loading') {
    return (
      <div className="min-h-screen gradient-mesh flex items-center justify-center" dir="rtl">
        <Loader2 className="w-8 h-8 text-[#FA8125] animate-spin" />
      </div>
    )
  }
  if (stage === 'unauthenticated') {
    return <ErrorBlock title="سجل دخول الأول" subtitle="محتاج تسجل دخول كمورد عشان تدير المنتجات" href="/auth/login" hrefLabel="سجل دخول" />
  }
  if (stage === 'not-found') {
    return <ErrorBlock title="المنتج مش لاقيه" subtitle="" href="/supplier/marketplace" hrefLabel="رجوع للوحة المورد" />
  }
  if (stage === 'is-restaurant') {
    return <ErrorBlock title="ده مطعم 🍕" subtitle="للمطاعم استخدم إدارة المنيو بدل المنتجات" href={`/supplier/marketplace/${listingId}/menu`} hrefLabel="افتح إدارة المنيو" />
  }
  if (stage === 'no-permission') {
    return <ErrorBlock title="مفيش صلاحية" subtitle="مش مالك أو فريق المنتج ده" href="/supplier/marketplace" hrefLabel="رجوع" />
  }

  return (
    <div className="min-h-screen gradient-mesh pb-12" dir="rtl">
      <header className="sticky top-0 z-40 glass border-b border-white/40">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-2">
          <Link href="/supplier/marketplace" className="w-9 h-9 bg-white shadow-soft hover:shadow-card rounded-full flex items-center justify-center transition-all">
            <ArrowRight className="w-4 h-4 text-gray-700" />
          </Link>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">إدارة المنتجات</p>
            <h1 className="text-sm font-bold text-gray-700 truncate">{listing?.title}</h1>
          </div>
          <button
            onClick={() => setShowImport(true)}
            className="inline-flex items-center gap-1.5 bg-white border border-[#FA8125]/30 text-[#FA8125] px-3 py-2 rounded-xl font-bold text-xs shadow-soft hover:shadow-card hover:-translate-y-0.5 transition-all"
            title="استيراد المنتجات من ملف Excel"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Excel
          </button>
          <button
            onClick={openNew}
            className="inline-flex items-center gap-1.5 bg-[#FA8125] text-white px-4 py-2 rounded-xl font-bold text-xs shadow-soft hover:shadow-card hover:-translate-y-0.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            منتج جديد
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {hasErp && (
          <div className="mb-4 flex items-center gap-2 bg-purple-50 border border-purple-100 rounded-2xl px-4 py-3">
            <Link2 className="w-4 h-4 text-purple-600 flex-shrink-0" />
            <p className="text-xs font-bold text-purple-700">
              حسابك مشترك في نظام الإدارة (CRM+ERP) — أي منتج تضيفه هنا بيتسجل تلقائياً في مخزون الـERP والاتنين متزامنين.
            </p>
          </div>
        )}

        {products.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-card p-10 text-center max-w-md mx-auto">
            <div className="w-20 h-20 mx-auto mb-5 bg-gray-100 rounded-3xl flex items-center justify-center">
              <Package className="w-10 h-10 text-gray-400" />
            </div>
            <h2 className="text-xl font-black text-gray-900 mb-2">لسه مفيش منتجات</h2>
            <p className="text-sm text-gray-500 mb-6">
              ضيف منتجاتك واحد واحد، أو ارفعهم كلهم مرة واحدة من ملف Excel
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setShowImport(true)}
                className="inline-flex items-center gap-2 bg-white border-2 border-[#FA8125] text-[#FA8125] px-5 py-3 rounded-2xl font-bold shadow-soft hover:-translate-y-0.5 transition-all"
              >
                <FileSpreadsheet className="w-4 h-4" />
                استيراد Excel
              </button>
              <button
                onClick={openNew}
                className="inline-flex items-center gap-2 bg-[#FA8125] text-white px-5 py-3 rounded-2xl font-bold shadow-elevated hover:-translate-y-0.5 hover:shadow-luxe transition-all"
              >
                <Plus className="w-4 h-4" />
                منتج جديد
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-soft overflow-hidden">
            <div className="divide-y divide-gray-100">
              {products.map((p) => (
                <div key={p.id} className={`p-4 flex gap-3 transition-all ${!p.is_available ? 'opacity-60' : ''}`}>
                  <div className="w-16 h-16 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {p.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.photo_url} alt={p.name_ar} className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-gray-300" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <h3 className="font-bold text-sm text-gray-900 truncate">{p.name_ar}</h3>
                      {!p.in_stock && (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">نفد المخزون</span>
                      )}
                      {!p.is_available && (
                        <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">مخفي</span>
                      )}
                      {p.erp_product_id && (
                        <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">ERP ✓</span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#2FA084] font-bold mb-0.5">
                      {[p.category, p.brand, p.unit].filter(Boolean).join(' · ')}
                    </p>
                    <p className="text-sm font-black text-[#FA8125] tabular mt-1">
                      {p.price.toLocaleString('ar-EG')} <span className="text-[10px] font-medium text-gray-500">ج.م</span>
                      {p.compare_at_price && p.compare_at_price > p.price && (
                        <span className="text-[11px] text-gray-400 line-through mr-2 tabular">{p.compare_at_price.toLocaleString('ar-EG')}</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 self-center flex-shrink-0">
                    <button
                      onClick={() => toggleStock(p)}
                      className={`px-2 h-9 hover:bg-gray-100 rounded-xl flex items-center justify-center transition-all text-[10px] font-black ${p.in_stock ? 'text-green-600' : 'text-amber-600'}`}
                      title={p.in_stock ? 'علّم نفد المخزون' : 'علّم متوفر'}
                    >
                      {p.in_stock ? 'متوفر' : 'نافد'}
                    </button>
                    <button
                      onClick={() => toggleAvailable(p)}
                      className="w-9 h-9 hover:bg-gray-100 rounded-xl flex items-center justify-center transition-all"
                      title={p.is_available ? 'إخفاء من الماركت' : 'إظهار في الماركت'}
                    >
                      {p.is_available ? (
                        <ToggleRight className="w-5 h-5 text-green-600" />
                      ) : (
                        <ToggleLeft className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                    <button
                      onClick={() => openEdit(p)}
                      className="w-9 h-9 hover:bg-gray-100 rounded-xl flex items-center justify-center transition-all"
                      title="تعديل"
                    >
                      <Edit3 className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      onClick={() => setConfirmDelete(p.id)}
                      className="w-9 h-9 hover:bg-red-50 rounded-xl flex items-center justify-center transition-all group"
                      title="حذف"
                    >
                      <Trash2 className="w-4 h-4 text-gray-400 group-hover:text-red-600" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Add/Edit modal */}
      {showForm && (
        <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-0 md:p-4" dir="rtl">
          <div className="bg-white w-full md:max-w-md rounded-t-3xl md:rounded-3xl shadow-luxe max-h-[92vh] overflow-y-auto animate-slide-up">
            <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex items-center justify-between">
              <h3 className="font-black text-base text-gray-900">
                {form.id ? 'تعديل منتج' : 'منتج جديد'}
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="w-9 h-9 hover:bg-gray-100 rounded-full flex items-center justify-center"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <Field label="اسم المنتج *" value={form.name_ar} onChange={(v) => setForm({ ...form, name_ar: v })} placeholder="مثلا: أرز مصري 1 كجم" />
              <div className="grid grid-cols-2 gap-2">
                <Field label="السعر (ج.م) *" value={form.price} onChange={(v) => setForm({ ...form, price: v.replace(/[^\d.]/g, '') })} placeholder="55" type="tel" />
                <Field label="قبل الخصم (اختياري)" value={form.compare_at_price} onChange={(v) => setForm({ ...form, compare_at_price: v.replace(/[^\d.]/g, '') })} placeholder="65" type="tel" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field label="القسم" value={form.category} onChange={(v) => setForm({ ...form, category: v })} placeholder="بقالة / أدوات / قطع غيار" />
                <Field label="الوحدة" value={form.unit} onChange={(v) => setForm({ ...form, unit: v })} placeholder="قطعة / كيس / علبة" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field label="الماركة" value={form.brand} onChange={(v) => setForm({ ...form, brand: v })} placeholder="اختياري" />
                <Field label="الباركود" value={form.barcode} onChange={(v) => setForm({ ...form, barcode: v })} placeholder="اختياري" dir="ltr" />
              </div>
              <Field label="الوصف (اختياري)" value={form.description_ar} onChange={(v) => setForm({ ...form, description_ar: v })} placeholder="تفاصيل تساعد العميل" multiline />

              {/* 📸 (13 Jul 2026) رفع الصورة من الموبايل — قبل كده كان لينك بس،
                  والمورّد اللي واقف في محله مش هيلاقي لينك للمنتج بتاعه. */}
              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1.5">صورة المنتج (اختياري)</label>
                {form.photo_url ? (
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={form.photo_url} alt="" className="w-full h-32 object-cover rounded-2xl border border-gray-200" />
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, photo_url: '' })}
                      className="absolute top-2 left-2 w-7 h-7 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-black/80"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>
                ) : (
                  <label className={`flex flex-col items-center justify-center gap-1.5 w-full h-24 border-2 border-dashed rounded-2xl cursor-pointer transition-colors ${
                    uploadingPhoto ? 'border-gray-200 bg-gray-50' : 'border-gray-200 hover:border-[#2FA084] hover:bg-[#2FA084]/5'
                  }`}>
                    {uploadingPhoto ? (
                      <Loader2 className="w-5 h-5 text-[#FA8125] animate-spin" />
                    ) : (
                      <>
                        <ImageIcon className="w-5 h-5 text-gray-400" />
                        <span className="text-xs font-bold text-gray-500">صوّر المنتج أو ارفع صورة</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingPhoto}
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        if (f) uploadPhoto(f)
                      }}
                    />
                  </label>
                )}
              </div>

              <label className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl cursor-pointer">
                <span className="text-sm font-bold text-gray-700">متوفر في المخزون</span>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, in_stock: !form.in_stock })}
                  className="flex items-center"
                >
                  {form.in_stock ? (
                    <ToggleRight className="w-7 h-7 text-green-600" />
                  ) : (
                    <ToggleLeft className="w-7 h-7 text-gray-400" />
                  )}
                </button>
              </label>

              {hasErp && (
                <p className="text-[10px] text-purple-600 font-bold bg-purple-50 rounded-xl p-2.5">
                  ⚡ هيتسجل تلقائياً في مخزون الـERP بتاعك
                </p>
              )}

              {formError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs font-medium text-red-700">{formError}</p>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-100 p-4 flex gap-2">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-2xl font-bold text-sm hover:bg-gray-200 transition-all"
              >
                إلغاء
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="flex-1 bg-[#FA8125] text-white py-3 rounded-2xl font-bold text-sm shadow-elevated hover:shadow-luxe disabled:opacity-60 transition-all flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                {saving ? 'جاري الحفظ...' : 'حفظ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Excel import */}
      {showImport && (
        <ExcelImportModal
          mode="products"
          listingId={listingId}
          onClose={() => setShowImport(false)}
          onDone={() => loadProducts(listingId)}
        />
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" dir="rtl">
          <div className="bg-white rounded-3xl shadow-luxe p-6 max-w-sm w-full animate-scale-in">
            <div className="w-12 h-12 mx-auto mb-3 bg-red-100 rounded-2xl flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-black text-gray-900 mb-2 text-center">تمسح المنتج؟</h3>
            <p className="text-sm text-gray-500 mb-5 text-center">
              مش هينفع تسترجعه. لو متأكد كمّل.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-2xl font-bold text-sm hover:bg-gray-200 transition-all"
              >
                لأ ابقى
              </button>
              <button
                onClick={() => doDelete(confirmDelete)}
                disabled={deletingId === confirmDelete}
                className="flex-1 bg-red-600 text-white py-3 rounded-2xl font-bold text-sm shadow-card hover:bg-red-700 disabled:opacity-60 transition-all"
              >
                {deletingId === confirmDelete ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'امسح'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text', multiline = false, dir }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; multiline?: boolean; dir?: 'ltr' | 'rtl';
}) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-600 mb-1.5">{label}</label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          dir={dir}
          className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-[#FA8125] focus:ring-2 focus:ring-[#FA8125]/20 outline-none transition-all text-sm font-medium resize-none"
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          dir={dir}
          className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-[#FA8125] focus:ring-2 focus:ring-[#FA8125]/20 outline-none transition-all text-sm font-medium"
        />
      )}
    </div>
  )
}

function ErrorBlock({ title, subtitle, href, hrefLabel }: { title: string; subtitle?: string; href: string; hrefLabel: string }) {
  return (
    <div className="min-h-screen gradient-mesh flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-3xl shadow-card p-10 text-center max-w-sm">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-2xl flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-gray-400" />
        </div>
        <h1 className="font-black text-xl mb-2">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mb-5">{subtitle}</p>}
        <Link
          href={href}
          className="inline-flex items-center gap-2 bg-[#FA8125] text-white px-5 py-2.5 rounded-xl font-bold shadow-soft hover:shadow-card transition-all"
        >
          {hrefLabel}
        </Link>
      </div>
    </div>
  )
}
