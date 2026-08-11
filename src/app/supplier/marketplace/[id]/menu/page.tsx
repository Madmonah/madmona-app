'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'
import {
  ArrowRight, Loader2, AlertCircle, Plus, Edit3, Trash2, ToggleLeft, ToggleRight,
  ChefHat, Image as ImageIcon, X, CheckCircle, GripVertical, FileSpreadsheet,
} from 'lucide-react'
import ExcelImportModal from '@/components/supplier/ExcelImportModal'

// ============================================================================
// /supplier/marketplace/[id]/menu
// Restaurant menu management. Only available when listing.category.track === 'restaurants'.
// CRUD on restaurant_menu_items. Direct supabase writes (no RPC needed since
// supplier is verified as owner before any mutation).
// ============================================================================

type Stage = 'loading' | 'unauthenticated' | 'not-found' | 'not-restaurant' | 'no-permission' | 'ready'

interface ListingMin {
  id: string
  title: string
  supplier_id: string
  track: string | null
}

interface MenuItemSize {
  id: string
  menu_item_id: string
  name_ar: string
  price: number
  display_order: number
  is_available: boolean
}

interface MenuItem {
  id: string
  listing_id: string
  name_ar: string
  name_en: string | null
  description_ar: string | null
  description_en: string | null
  price: number
  currency: string
  category: string | null
  photo_url: string | null
  is_available: boolean
  display_order: number
  sizes?: MenuItemSize[]
}

interface FormSize { name_ar: string; price: string }

interface FormState {
  id: string | null
  name_ar: string
  name_en: string
  description_ar: string
  price: string
  category: string
  photo_url: string
  is_available: boolean
  sizes: FormSize[]
}

const EMPTY_FORM: FormState = {
  id: null, name_ar: '', name_en: '', description_ar: '',
  price: '', category: '', photo_url: '', is_available: true,
  sizes: [],
}

const SIZE_PRESETS = ['صغير', 'وسط', 'كبير']

export default function SupplierMenuPage() {
  const router = useRouter()
  const params = useParams()
  const listingId = params?.id as string

  const [stage, setStage] = useState<Stage>('loading')
  const [listing, setListing] = useState<ListingMin | null>(null)
  const [items, setItems] = useState<MenuItem[]>([])

  const [showForm, setShowForm] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session?.user) { setStage('unauthenticated'); return }

      // Load listing (with track + supplier_id) to verify ownership + category type
      // @ts-expect-error
      const { data: l } = await supabaseBrowser
        .from('listings')
        .select('id, title, supplier_id, category:categories(track)')
        .eq('id', listingId)
        .maybeSingle()

      if (!l) { setStage('not-found'); return }

      const track = (l as { category?: { track?: string | null } | null }).category?.track ?? null
      if (track !== 'restaurants') {
        setListing({ id: l.id, title: l.title, supplier_id: l.supplier_id, track })
        setStage('not-restaurant')
        return
      }

      // Ownership check: either supplier owner OR staff with can_manage_listings
      // @ts-expect-error
      const { data: ownerSup } = await supabaseBrowser
        .from('marketplace_suppliers')
        .select('id')
        .eq('profile_id', session.user.id)
        .eq('id', l.supplier_id)
        .maybeSingle()

      let allowed = !!ownerSup
      if (!allowed) {
        // @ts-expect-error
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

      setListing({ id: l.id, title: l.title, supplier_id: l.supplier_id, track })
      await loadItems(l.id)
      setStage('ready')
    }
    init()
  }, [listingId])

  const loadItems = async (lid: string) => {
    // @ts-expect-error
    const { data } = await supabaseBrowser
      .from('restaurant_menu_items')
      .select('*')
      .eq('listing_id', lid)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true })
    const arr = (data || []) as MenuItem[]
    if (arr.length > 0) {
      // @ts-expect-error
      const { data: szs } = await supabaseBrowser
        .from('restaurant_menu_item_sizes')
        .select('*')
        .in('menu_item_id', arr.map((x) => x.id))
        .order('display_order', { ascending: true })
      const map = new Map<string, MenuItemSize[]>()
      for (const s of (szs || []) as MenuItemSize[]) {
        const a = map.get(s.menu_item_id) || []
        a.push({ ...s, price: Number(s.price) })
        map.set(s.menu_item_id, a)
      }
      setItems(arr.map((x) => ({ ...x, price: Number(x.price), sizes: map.get(x.id) || [] })))
    } else {
      setItems(arr)
    }
  }

  const openNew = () => {
    setForm(EMPTY_FORM)
    setFormError(null)
    setShowForm(true)
  }

  const openEdit = (it: MenuItem) => {
    setForm({
      id: it.id,
      name_ar: it.name_ar,
      name_en: it.name_en || '',
      description_ar: it.description_ar || '',
      price: String(it.price),
      category: it.category || '',
      photo_url: it.photo_url || '',
      is_available: it.is_available,
      sizes: (it.sizes || []).map((s) => ({ name_ar: s.name_ar, price: String(s.price) })),
    })
    setFormError(null)
    setShowForm(true)
  }

  const save = async () => {
    setFormError(null)
    if (!form.name_ar.trim()) { setFormError('اسم الصنف مطلوب'); return }

    // sizes: keep only complete rows
    const cleanSizes = form.sizes
      .map((s) => ({ name_ar: s.name_ar.trim(), price: Number(s.price) }))
      .filter((s) => s.name_ar && Number.isFinite(s.price) && s.price >= 0)
    const hasSizes = cleanSizes.length > 0

    // base price: manual, or auto = cheapest size
    let priceNum = Number(form.price)
    if (hasSizes) priceNum = Math.min(...cleanSizes.map((s) => s.price))
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      setFormError(hasSizes ? 'اكتب سعر صحيح لكل حجم' : 'السعر لازم رقم صحيح')
      return
    }

    setSaving(true)
    try {
      const payload = {
        listing_id: listingId,
        name_ar: form.name_ar.trim(),
        name_en: form.name_en.trim() || null,
        description_ar: form.description_ar.trim() || null,
        price: priceNum,
        category: form.category.trim() || null,
        photo_url: form.photo_url.trim() || null,
        is_available: form.is_available,
      }

      let itemId = form.id
      if (form.id) {
        // @ts-expect-error
        const { error } = await supabaseBrowser
          .from('restaurant_menu_items')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', form.id)
        if (error) throw error
      } else {
        // assign next display_order
        const nextOrder = items.length === 0 ? 1 : Math.max(...items.map(i => i.display_order)) + 1
        // @ts-expect-error
        const { data: inserted, error } = await supabaseBrowser
          .from('restaurant_menu_items')
          .insert({ ...payload, display_order: nextOrder })
          .select('id')
          .single()
        if (error) throw error
        itemId = (inserted as { id: string } | null)?.id ?? null
      }

      // sizes: full replace
      if (itemId) {
        // @ts-expect-error
        await supabaseBrowser.from('restaurant_menu_item_sizes').delete().eq('menu_item_id', itemId)
        if (hasSizes) {
          // @ts-expect-error
          const { error: szErr } = await supabaseBrowser
            .from('restaurant_menu_item_sizes')
            .insert(cleanSizes.map((s, i) => ({
              menu_item_id: itemId,
              name_ar: s.name_ar,
              price: s.price,
              display_order: i + 1,
              is_available: true,
            })))
          if (szErr) throw szErr
        }
      }

      setShowForm(false)
      await loadItems(listingId)
    } catch (e) {
      console.error('[menu/save]', e)
      setFormError(e instanceof Error ? e.message : 'حصل خطأ')
    } finally {
      setSaving(false)
    }
  }

  const toggleAvailable = async (it: MenuItem) => {
    // @ts-expect-error
    await supabaseBrowser
      .from('restaurant_menu_items')
      .update({ is_available: !it.is_available, updated_at: new Date().toISOString() })
      .eq('id', it.id)
    await loadItems(listingId)
  }

  const doDelete = async (id: string) => {
    setDeletingId(id)
    try {
      // @ts-expect-error
      await supabaseBrowser.from('restaurant_menu_items').delete().eq('id', id)
      await loadItems(listingId)
    } finally {
      setDeletingId(null)
      setConfirmDelete(null)
    }
  }

  // ---- Stage handlers ----
  if (stage === 'loading') {
    return (
      <div className="min-h-screen gradient-mesh flex items-center justify-center" dir="rtl">
        <Loader2 className="w-8 h-8 text-[#FA8125] animate-spin" />
      </div>
    )
  }
  if (stage === 'unauthenticated') {
    return <ErrorBlock title="سجل دخول الأول" subtitle="محتاج تسجل دخول كمورد عشان تدير المنيو" href="/auth/login" hrefLabel="سجل دخول" />
  }
  if (stage === 'not-found') {
    return <ErrorBlock title="المنتج مش لاقيه" subtitle="" href="/supplier/marketplace" hrefLabel="رجوع للوحة المورد" />
  }
  if (stage === 'not-restaurant') {
    return <ErrorBlock title="ده مش منتج مطعم" subtitle="إدارة المنيو متاحة فقط للمطاعم (track=restaurants)" href="/supplier/marketplace" hrefLabel="رجوع للوحة المورد" />
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
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">إدارة المنيو</p>
            <h1 className="text-sm font-bold text-gray-700 truncate">{listing?.title}</h1>
          </div>
          <button
            onClick={() => setShowImport(true)}
            className="inline-flex items-center gap-1.5 bg-white border border-[#FA8125]/30 text-[#FA8125] px-3 py-2 rounded-xl font-bold text-xs shadow-soft hover:shadow-card hover:-translate-y-0.5 transition-all"
            title="استيراد المنيو من ملف Excel"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Excel
          </button>
          <button
            onClick={openNew}
            className="inline-flex items-center gap-1.5 bg-[#FA8125] text-white px-4 py-2 rounded-xl font-bold text-xs shadow-soft hover:shadow-card hover:-translate-y-0.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            صنف جديد
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {items.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-card p-10 text-center max-w-md mx-auto">
            <div className="w-20 h-20 mx-auto mb-5 bg-gray-100 rounded-3xl flex items-center justify-center">
              <ChefHat className="w-10 h-10 text-gray-400" />
            </div>
            <h2 className="text-xl font-black text-gray-900 mb-2">المنيو لسه فاضي</h2>
            <p className="text-sm text-gray-500 mb-6">
              ضيف أصناف عشان العملاء يقدروا يطلبوا
            </p>
            <button
              onClick={openNew}
              className="inline-flex items-center gap-2 bg-[#FA8125] text-white px-6 py-3 rounded-2xl font-bold shadow-elevated hover:-translate-y-0.5 hover:shadow-luxe transition-all"
            >
              <Plus className="w-4 h-4" />
              ضيف صنف أول
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-soft overflow-hidden">
            <div className="divide-y divide-gray-100">
              {items.map((it) => (
                <div key={it.id} className={`p-4 flex gap-3 transition-all ${!it.is_available ? 'opacity-60' : ''}`}>
                  <GripVertical className="w-4 h-4 text-gray-300 self-center flex-shrink-0" />
                  <div className="w-16 h-16 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {it.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={it.photo_url} alt={it.name_ar} className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-gray-300" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-bold text-sm text-gray-900 truncate">{it.name_ar}</h3>
                      {!it.is_available && (
                        <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                          متوقّف
                        </span>
                      )}
                    </div>
                    {it.category && (
                      <p className="text-[11px] text-[#2FA084] font-bold mb-0.5">{it.category}</p>
                    )}
                    {it.description_ar && (
                      <p className="text-xs text-gray-500 line-clamp-1">{it.description_ar}</p>
                    )}
                    {(it.sizes && it.sizes.length > 0) ? (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {it.sizes.map((s) => (
                          <span key={s.id} className="text-[10px] font-black bg-[#FA8125]/8 text-[#FA8125] px-2 py-0.5 rounded-full tabular">
                            {s.name_ar} {s.price.toLocaleString('ar-EG')}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm font-black text-[#FA8125] tabular mt-1">
                        {it.price.toLocaleString('ar-EG')} <span className="text-[10px] font-medium text-gray-500">ج.م</span>
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 self-center flex-shrink-0">
                    <button
                      onClick={() => toggleAvailable(it)}
                      className="w-9 h-9 hover:bg-gray-100 rounded-xl flex items-center justify-center transition-all"
                      title={it.is_available ? 'إيقاف الصنف' : 'تفعيل الصنف'}
                    >
                      {it.is_available ? (
                        <ToggleRight className="w-5 h-5 text-green-600" />
                      ) : (
                        <ToggleLeft className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                    <button
                      onClick={() => openEdit(it)}
                      className="w-9 h-9 hover:bg-gray-100 rounded-xl flex items-center justify-center transition-all"
                      title="تعديل"
                    >
                      <Edit3 className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      onClick={() => setConfirmDelete(it.id)}
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
                {form.id ? 'تعديل صنف' : 'صنف جديد'}
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="w-9 h-9 hover:bg-gray-100 rounded-full flex items-center justify-center"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <Field label="اسم الصنف *" value={form.name_ar} onChange={(v) => setForm({ ...form, name_ar: v })} placeholder="مثلا: كبدة إسكندراني" />

              {/* ===== الأحجام ===== */}
              <div className="bg-gray-50 rounded-2xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-gray-700">الأحجام (اختياري)</span>
                  {form.sizes.length === 0 && (
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, sizes: SIZE_PRESETS.map((n) => ({ name_ar: n, price: '' })) })}
                        className="text-[10px] font-black text-[#FA8125] bg-[#FA8125]/10 px-2.5 py-1 rounded-full"
                      >
                        صغير/وسط/كبير
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, sizes: [{ name_ar: '', price: '' }] })}
                        className="text-[10px] font-black text-gray-600 bg-gray-200 px-2.5 py-1 rounded-full"
                      >
                        + حجم مخصص
                      </button>
                    </div>
                  )}
                </div>

                {form.sizes.length > 0 && (
                  <>
                    {form.sizes.map((s, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          value={s.name_ar}
                          onChange={(e) => {
                            const next = [...form.sizes]; next[i] = { ...next[i], name_ar: e.target.value }
                            setForm({ ...form, sizes: next })
                          }}
                          placeholder="اسم الحجم (صغير)"
                          className="flex-1 px-3 py-2 rounded-xl border border-gray-200 focus:border-[#FA8125] outline-none text-xs font-bold"
                        />
                        <input
                          value={s.price}
                          onChange={(e) => {
                            const next = [...form.sizes]; next[i] = { ...next[i], price: e.target.value.replace(/[^\d.]/g, '') }
                            setForm({ ...form, sizes: next })
                          }}
                          placeholder="السعر"
                          type="tel"
                          dir="ltr"
                          className="w-20 px-3 py-2 rounded-xl border border-gray-200 focus:border-[#FA8125] outline-none text-xs font-bold text-center tabular"
                        />
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, sizes: form.sizes.filter((_, j) => j !== i) })}
                          className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center flex-shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, sizes: [...form.sizes, { name_ar: '', price: '' }] })}
                      className="text-[11px] font-black text-[#FA8125] flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> ضيف حجم
                    </button>
                    <p className="text-[10px] text-gray-400 font-bold">العميل هيختار الحجم والسعر بيتحسب تلقائياً — مش محتاج تكتب سعر أساسي.</p>
                  </>
                )}
              </div>

              {form.sizes.length === 0 && (
                <Field label="السعر (ج.م) *" value={form.price} onChange={(v) => setForm({ ...form, price: v.replace(/[^\d.]/g, '') })} placeholder="85" type="tel" />
              )}
              <Field label="القسم (اختياري)" value={form.category} onChange={(v) => setForm({ ...form, category: v })} placeholder="الأطباق الرئيسية / الفطار / المشروبات" />
              <Field label="الوصف (اختياري)" value={form.description_ar} onChange={(v) => setForm({ ...form, description_ar: v })} placeholder="مكوّنات + ملاحظات تساعد العميل" multiline />
              <Field label="لينك صورة (اختياري)" value={form.photo_url} onChange={(v) => setForm({ ...form, photo_url: v })} placeholder="https://..." dir="ltr" />

              <label className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl cursor-pointer">
                <span className="text-sm font-bold text-gray-700">متاح للطلب الآن</span>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, is_available: !form.is_available })}
                  className="flex items-center"
                >
                  {form.is_available ? (
                    <ToggleRight className="w-7 h-7 text-green-600" />
                  ) : (
                    <ToggleLeft className="w-7 h-7 text-gray-400" />
                  )}
                </button>
              </label>

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
          mode="menu"
          listingId={listingId}
          onClose={() => setShowImport(false)}
          onDone={() => loadItems(listingId)}
        />
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" dir="rtl">
          <div className="bg-white rounded-3xl shadow-luxe p-6 max-w-sm w-full animate-scale-in">
            <div className="w-12 h-12 mx-auto mb-3 bg-red-100 rounded-2xl flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-black text-gray-900 mb-2 text-center">تمسح الصنف؟</h3>
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
