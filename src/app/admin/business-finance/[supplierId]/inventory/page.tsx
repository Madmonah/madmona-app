'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import {
  Package, Search, ChevronLeft, Loader2, AlertTriangle, TrendingUp,
  RefreshCw, Filter, DollarSign, Box, AlertCircle, FileSpreadsheet, Upload, X,
  Plus, Image as ImageIcon,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { extractRowImages, uploadExtractedImage } from '@/lib/xlsxImages'
// 🔐 admin_import_inventory محميّة بصلاحية — لازم تعدّي من بوابة الأدمن
// مش من المتصفح مباشرة، وإلا بترجع forbidden. شوف src/lib/adminRpc.ts
import { adminRpc } from '@/lib/adminRpc'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Product = {
  id: string
  name_ar: string
  name_en: string | null
  category: string
  product_type: string
  unit: string
  current_stock: number
  stock_unknown: boolean
  reorder_threshold: number
  cost_price_egp: number | null
  selling_price_egp: number | null
  recent_usage: number | null
  photo_url: string | null
  base_unit: string | null
  units_per_pack: number | null
  warehouse_name: string | null
  margin_pct: number | null
  stock_value: number | null
}

type Stats = {
  total_products: number
  low_stock_count: number
  out_of_stock_count: number
  total_inventory_value: number
  categories: Record<string, number>
}

const CATEGORY_LABELS: Record<string, string> = {
  hair_color: 'صبغات',
  bleach: 'تفتيح/اكسجين',
  hair_treatment: 'علاجات شعر',
  styling: 'تصفيف',
  retail: 'بيع للعميل',
  nails: 'أظافر',
  spa: 'سبا',
  tools: 'أدوات',
  cleaning: 'تنظيف',
  accessories: 'إكسسوارات',
  general: 'عام',
  spare_parts: 'قطع غيار',
  lubricants: 'زيوت وشحوم',
  tires: 'إطارات / كاوتش',
  vehicle: 'مركبات',
  equipment: 'معدات',
  supplies: 'مستلزمات',
  office: 'مكتب',
  electronics: 'إلكترونيات',
  other: 'أخرى',
}

const CATEGORY_COLORS: Record<string, string> = {
  hair_color: 'bg-[#1F6F5F]/10 text-[#1F6F5F]',
  bleach: 'bg-amber-50 text-amber-800',
  hair_treatment: 'bg-blue-50 text-blue-800',
  styling: 'bg-purple-50 text-purple-800',
  retail: 'bg-[#1A2E26]/10 text-[#1A2E26]',
  nails: 'bg-pink-50 text-pink-800',
  spa: 'bg-emerald-50 text-emerald-800',
  tools: 'bg-gray-100 text-gray-700',
  cleaning: 'bg-cyan-50 text-cyan-800',
  accessories: 'bg-orange-50 text-orange-800',
  general: 'bg-gray-100 text-gray-600',
  spare_parts: 'bg-[#1F6F5F]/10 text-[#1F6F5F]',
  lubricants: 'bg-amber-50 text-amber-800',
  tires: 'bg-gray-100 text-gray-700',
  vehicle: 'bg-[#1A2E26]/10 text-[#1A2E26]',
  equipment: 'bg-blue-50 text-blue-800',
  supplies: 'bg-purple-50 text-purple-800',
  office: 'bg-gray-100 text-gray-600',
  electronics: 'bg-cyan-50 text-cyan-800',
  other: 'bg-gray-100 text-gray-600',
}

export default function InventoryPage({ params }: { params: { supplierId: string } }) {
  const { supplierId } = params
  const [supplier, setSupplier] = useState<{ business_name: string } | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  // 🆕 (13 Jul 2026) إضافة منتج يدوي — قبل كده كان Excel بس، ومحدش هيعمل ملف
  // عشان يضيف منتج واحد.
  const [addOpen, setAddOpen] = useState(false)

  async function load() {
    setLoading(true)
    const { data: sup } = await supabase.from('suppliers').select('business_name').eq('id', supplierId).single()
    setSupplier(sup as any)

    const { data } = await supabase.rpc('admin_list_inventory', {
      p_supplier_id: supplierId,
      p_filter: search || null,
      p_category: categoryFilter,
      p_low_stock_only: lowStockOnly,
    })
    if (data) {
      setProducts((data.products || []) as Product[])
      setStats(data.stats as Stats)
    }
    setLoading(false)
  }

  useEffect(() => { load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [supplierId, categoryFilter, lowStockOnly])
  useEffect(() => {
    const t = setTimeout(() => load(), 400)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const sortedCategories = useMemo(() => {
    if (!stats?.categories) return []
    return Object.entries(stats.categories).sort((a, b) => b[1] - a[1])
  }, [stats])

  if (!supplier && loading) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl">
        <Loader2 className="w-8 h-8 text-[#1F6F5F] animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link href={`/admin/business-finance/${supplierId}`} className="text-xs font-bold text-[#6B7280] hover:text-[#1F6F5F] flex items-center gap-1 mb-2">
            <ChevronLeft className="w-3.5 h-3.5" /> رجوع للـ finance
          </Link>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#1F6F5F] mb-1">B2B PARTNER · INVENTORY</p>
              <h1 className="text-2xl md:text-3xl font-black text-[#1A2E26] tracking-tight">المخزون · {supplier?.business_name}</h1>
              {stats && (
                <p className="text-sm text-[#6B7280] mt-1">
                  {stats.total_products} منتج · قيمة المخزون {Number(stats.total_inventory_value).toLocaleString()} ج
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* 🆕 إضافة منتج واحد يدوي — من غير Excel */}
              <button onClick={() => setAddOpen(true)} className="px-4 py-2 rounded-xl bg-[#1F6F5F] hover:bg-[#1A5D4F] text-sm font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4" /> منتج جديد
              </button>
              <button onClick={() => setImportOpen(true)} className="px-4 py-2 rounded-xl bg-white border border-[#1F6F5F]/30 hover:bg-[#1F6F5F]/5 text-sm font-bold text-[#1F6F5F] flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4" /> استيراد Excel
              </button>
              <button onClick={load} className="px-4 py-2 rounded-xl bg-[#FAFAF7] hover:bg-gray-100 text-sm font-bold text-[#1A2E26] flex items-center gap-2">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> تحديث
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Stats Cards */}
        {stats && (
          <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="إجمالي المنتجات" value={stats.total_products} icon={<Package className="w-4 h-4" />} />
            <StatCard label="قيمة المخزون" value={`${Number(stats.total_inventory_value).toLocaleString()} ج`} icon={<DollarSign className="w-4 h-4" />} primary />
            <StatCard label="مخزون قليل" value={stats.low_stock_count} icon={<AlertTriangle className="w-4 h-4" />} tone="warning" />
            <StatCard label="نفد المخزون" value={stats.out_of_stock_count} icon={<AlertCircle className="w-4 h-4" />} tone="danger" />
          </section>
        )}

        {/* Filters */}
        <section className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <div className="flex items-center gap-2 px-3 py-2 bg-[#FAFAF7] rounded-xl">
            <Search className="w-4 h-4 text-[#6B7280]" />
            <input
              type="text"
              placeholder="ابحث باسم المنتج..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm text-[#1A2E26] focus:outline-none placeholder-[#6B7280]"
            />
          </div>

          {/* Category Pills */}
          <div className="flex gap-2 flex-wrap items-center">
            <Filter className="w-3.5 h-3.5 text-[#6B7280]" />
            <button
              onClick={() => setCategoryFilter(null)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                categoryFilter === null ? 'bg-[#1F6F5F] text-white' : 'bg-[#FAFAF7] text-[#1A2E26] hover:bg-gray-100'
              }`}
            >
              الكل ({stats?.total_products ?? 0})
            </button>
            {sortedCategories.map(([cat, count]) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                  categoryFilter === cat ? 'bg-[#1F6F5F] text-white' : 'bg-[#FAFAF7] text-[#1A2E26] hover:bg-gray-100'
                }`}
              >
                {CATEGORY_LABELS[cat] || cat} ({count})
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input
              type="checkbox"
              checked={lowStockOnly}
              onChange={(e) => setLowStockOnly(e.target.checked)}
              className="w-4 h-4 rounded accent-[#1F6F5F]"
            />
            <span className="text-[#1A2E26] font-medium">⚠️ المخزون القليل والنافد بس</span>
          </label>
        </section>

        {/* Products list */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-[#1F6F5F] animate-spin" />
          </div>
        ) : products.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
            <Package className="w-10 h-10 text-[#6B7280] opacity-30 mx-auto mb-2" />
            <p className="text-sm font-bold text-[#1A2E26]">مفيش منتجات</p>
          </div>
        ) : (
          <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="grid grid-cols-12 gap-3 px-4 py-3 bg-[#FAFAF7] border-b border-gray-100 text-[10px] font-bold tracking-wider uppercase text-[#6B7280]">
              <div className="col-span-5">المنتج</div>
              <div className="col-span-2 text-center">المخزون</div>
              <div className="col-span-2 text-center">تكلفة / بيع</div>
              <div className="col-span-2 text-center">قيمة المخزون</div>
              <div className="col-span-1 text-center">الربح %</div>
            </div>
            <div className="divide-y divide-gray-100">
              {products.map((p) => <ProductRow key={p.id} p={p} />)}
            </div>
          </section>
        )}
      </main>

      {importOpen && (
        <ImportModal
          supplierId={supplierId}
          onClose={() => setImportOpen(false)}
          onDone={() => { setImportOpen(false); load() }}
        />
      )}

      {addOpen && (
        <AddProductModal
          supplierId={supplierId}
          onClose={() => setAddOpen(false)}
          onDone={() => { setAddOpen(false); load() }}
        />
      )}
    </div>
  )
}

/* ============ 🆕 (13 Jul 2026) إضافة منتج واحد يدوي ============ */
/* بيستخدم نفس الـRPC بتاع الاستيراد (admin_import_inventory) بصف واحد،
   عشان نفس المنطق والمزامنة مع الماركت تشتغل بالظبط. */

/* 🐛 لازم يفضل برّه الكومبوننت. لو اتعرّف جوّه، React بيشوفه نوع جديد كل
   re-render فبيهدم الـ<input> ويبنيه من الأول → الفوكس بيضيع والمستخدم
   يكتب حرف واحد بس. */
function Fld({
  label, value, onChange, ph, num,
}: { label: string; value: string; onChange: (v: string) => void; ph?: string; num?: boolean }) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-[#6B7280] mb-1">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={ph}
        inputMode={num ? 'decimal' : undefined}
        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:border-[#2FA084] outline-none"
      />
    </div>
  )
}

function AddProductModal({
  supplierId, onClose, onDone,
}: { supplierId: string; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({
    name_ar: '', sku: '', category: '', unit: 'قطعة',
    current_stock: '', reorder_threshold: '', cost_price_egp: '', selling_price_egp: '',
    warehouse: '', notes: '', photo_url: '',
  })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [ok, setOk] = useState(false)

  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }))
  const num = (v: string) => (v.trim() === '' ? null : Number(v))

  async function uploadPhoto(file: File) {
    setUploading(true); setErr(null)
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
      const path = `inventory/${supplierId}/${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('listing-photos')
        .upload(path, file, { upsert: true, contentType: file.type })
      if (error) throw error
      const { data } = supabase.storage.from('listing-photos').getPublicUrl(path)
      set('photo_url', data.publicUrl)
    } catch {
      setErr('مقدرناش نرفع الصورة — جرّب تاني')
    }
    setUploading(false)
  }

  async function save() {
    setErr(null)
    if (!f.name_ar.trim()) { setErr('اسم المنتج مطلوب'); return }
    setSaving(true)
    try {
      // 🔐 عن طريق بوابة الأدمن — النداء المباشر من المتصفح بيرجع forbidden
      await adminRpc('admin_import_inventory', {
        p_supplier_id: supplierId,
        p_rows: [{
          name_ar: f.name_ar.trim(),
          sku: f.sku.trim() || null,
          category: f.category.trim() || null,
          unit: f.unit.trim() || null,
          current_stock: num(f.current_stock),
          reorder_threshold: num(f.reorder_threshold),
          cost_price_egp: num(f.cost_price_egp),
          selling_price_egp: num(f.selling_price_egp),
          warehouse: f.warehouse.trim() || null,
          photo_url: f.photo_url || null,
          notes: f.notes.trim() || null,
        }],
      })
      setOk(true)
      setTimeout(onDone, 900)
    } catch (e: any) {
      setErr(e?.message || 'حصلت مشكلة في الحفظ — جرّب تاني')
    }
    setSaving(false)
  }

  // 🐛 (13 Jul 2026) كان فيه كومبوننت `In` معرّف جوه الـmodal — كل حرف بيعمل
  // re-render فالـinput بيتولد من الأول والفوكس بيضيع → المستخدم بيكتب حرف واحد بس.
  // الحل: `Fld` كومبوننت ثابت برّه (تحت الملف) وبنستخدمه مباشرة.

  return (
    <div className="fixed inset-0 z-[80] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-4" dir="rtl">
      <div className="bg-white w-full md:max-w-lg rounded-t-3xl md:rounded-3xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex items-center justify-between">
          <h2 className="text-lg font-black text-[#1A2E26] flex items-center gap-2">
            <Plus className="w-5 h-5 text-[#1F6F5F]" /> منتج جديد
          </h2>
          <button onClick={onClose} className="w-9 h-9 hover:bg-gray-100 rounded-full flex items-center justify-center">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <Fld label="اسم المنتج *" value={f.name_ar} onChange={(v) => set('name_ar', v)} ph="مثلاً: قاطع كهربا شنايدر 32A" />

          <div className="grid grid-cols-2 gap-2">
            <Fld label="سعر البيع (ج)" value={f.selling_price_egp} onChange={(v) => set('selling_price_egp', v)} ph="550" num />
            <Fld label="سعر التكلفة (ج)" value={f.cost_price_egp} onChange={(v) => set('cost_price_egp', v)} ph="400" num />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Fld label="الكمية بالمخزن" value={f.current_stock} onChange={(v) => set('current_stock', v)} ph="20" num />
            <Fld label="حد إعادة الطلب" value={f.reorder_threshold} onChange={(v) => set('reorder_threshold', v)} ph="5" num />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Fld label="التصنيف" value={f.category} onChange={(v) => set('category', v)} ph="كهرباء / بقالة" />
            <Fld label="الوحدة" value={f.unit} onChange={(v) => set('unit', v)} ph="قطعة / علبة" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Fld label="SKU / باركود" value={f.sku} onChange={(v) => set('sku', v)} ph="اختياري" />
            <Fld label="المخزن" value={f.warehouse} onChange={(v) => set('warehouse', v)} ph="اختياري" />
          </div>

          {/* 📸 صورة المنتج — رفع من الموبايل */}
          <div>
            <label className="block text-[11px] font-bold text-[#6B7280] mb-1">صورة المنتج (اختياري)</label>
            {f.photo_url ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.photo_url} alt="" className="w-full h-32 object-cover rounded-xl border border-gray-200" />
                <button
                  onClick={() => set('photo_url', '')}
                  className="absolute top-2 left-2 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center hover:bg-black/80"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-1.5 w-full h-24 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-[#2FA084] hover:bg-[#2FA084]/5 transition-colors">
                {uploading ? (
                  <Loader2 className="w-5 h-5 text-[#1F6F5F] animate-spin" />
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
                  disabled={uploading}
                  onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadPhoto(file) }}
                />
              </label>
            )}
          </div>

          <Fld label="ملاحظات" value={f.notes} onChange={(v) => set('notes', v)} ph="اختياري" />

          {err && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <p className="text-xs font-bold text-red-700">{err}</p>
            </div>
          )}
          {ok && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
              <p className="text-xs font-bold text-emerald-700">✅ المنتج اتضاف — بيتزامن مع ماركت مضمونة</p>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-100 p-4 flex gap-2">
          <button onClick={onClose} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold text-sm hover:bg-gray-200">
            إلغاء
          </button>
          <button
            onClick={save}
            disabled={saving || uploading}
            className="flex-1 bg-[#1F6F5F] text-white py-3 rounded-xl font-bold text-sm hover:bg-[#1A5D4F] disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {saving ? 'جاري الحفظ...' : 'أضف المنتج'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ============ استيراد Excel للمخزون ============ */
const IMPORT_FIELDS: { key: string; label: string; aliases: string[] }[] = [
  { key: 'name_ar',           label: 'اسم المنتج *',   aliases: ['name_ar', 'name', 'اسم المنتج', 'الاسم', 'المنتج', 'product'] },
  { key: 'sku',               label: 'SKU / الكود',    aliases: ['sku', 'code', 'الكود', 'كود', 'باركود', 'barcode'] },
  { key: 'category',          label: 'التصنيف',        aliases: ['category', 'التصنيف', 'الفئة', 'القسم'] },
  { key: 'unit',              label: 'الوحدة',         aliases: ['unit', 'الوحدة', 'وحدة'] },
  { key: 'current_stock',     label: 'الكمية بالمخزن', aliases: ['current_stock', 'stock', 'qty', 'quantity', 'المخزون', 'الكمية', 'الرصيد'] },
  { key: 'reorder_threshold', label: 'حد إعادة الطلب', aliases: ['reorder_threshold', 'reorder', 'حد الطلب', 'حد اعادة الطلب', 'الحد الأدنى'] },
  { key: 'cost_price_egp',    label: 'سعر التكلفة',    aliases: ['cost_price_egp', 'cost', 'التكلفة', 'سعر التكلفة', 'سعر الشراء'] },
  { key: 'selling_price_egp', label: 'سعر البيع',      aliases: ['selling_price_egp', 'price', 'selling_price', 'سعر البيع', 'السعر'] },
  { key: 'base_unit',         label: 'وحدة التقسيم',   aliases: ['base_unit', 'وحدة التقسيم', 'الوحدة الأساسية', 'الوحدة الاساسية', 'وحدة فرعية', 'تقسيم'] },
  { key: 'units_per_pack',    label: 'معامل التحويل',  aliases: ['units_per_pack', 'factor', 'معامل التحويل', 'التحويل', 'معامل', 'كام وحدة'] },
  { key: 'warehouse',         label: 'المخزن',         aliases: ['warehouse', 'المخزن', 'مخزن', 'المستودع', 'الفرع', 'branch', 'store'] },
  { key: 'photo_url',         label: 'رابط الصورة',    aliases: ['photo', 'photo_url', 'image', 'img', 'الصورة', 'صورة', 'رابط الصورة', 'لينك الصورة'] },
  { key: 'notes',             label: 'ملاحظات',        aliases: ['notes', 'ملاحظات', 'ملاحظة'] },
]

function ImportModal({ supplierId, onClose, onDone }: { supplierId: string; onClose: () => void; onDone: () => void }) {
  const [rows, setRows] = useState<Record<string, any>[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [fileName, setFileName] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<string | null>(null)
  const [rowImages, setRowImages] = useState<Map<number, Blob>>(new Map())

  const norm = (s: string) => String(s || '').trim().toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه')

  // تحويلات معروفة تلقائي: طن→كجم ١٠٠٠ · كجم→جم ١٠٠٠ · لتر→مل ١٠٠٠
  function autoConversion(unit: string): { base: string; factor: number } | null {
    const u = norm(unit)
    if (['طن', 'ton', 'tonne'].includes(u)) return { base: 'كجم', factor: 1000 }
    if (['كجم', 'كيلو', 'كيلوجرام', 'kg'].includes(u)) return { base: 'جم', factor: 1000 }
    if (['لتر', 'liter', 'litre', 'l'].includes(u)) return { base: 'مل', factor: 1000 }
    if (['كرتونه', 'كرتونة', 'كرتون', 'carton', 'box'].includes(u)) return { base: 'قطعة', factor: 12 }
    return null
  }

  async function onFile(file: File) {
    setError(null); setResult(null); setProgress('بقرا الشيت…')
    const buf = await file.arrayBuffer()
    const wb = XLSX.read(buf)
    const ws = wb.Sheets[wb.SheetNames[0]]
    const json: Record<string, any>[] = XLSX.utils.sheet_to_json(ws, { defval: null })
    if (!json.length) { setError('الشيت فاضي'); setProgress(null); return }
    const hs = Object.keys(json[0])
    const m: Record<string, string> = {}
    for (const fld of IMPORT_FIELDS) {
      const hit = hs.find(h => fld.aliases.some(a => norm(a) === norm(h)))
      if (hit) m[fld.key] = hit
    }
    // الصور المدفونة جوه الشيت نفسه
    const imgs = await extractRowImages(buf)
    setRowImages(imgs)
    setProgress(imgs.size > 0 ? `لقيت ${imgs.size} صورة مدفونة في الشيت ✓` : null)
    setFileName(file.name); setHeaders(hs); setRows(json); setMapping(m)
  }

  async function doImport() {
    if (!mapping.name_ar) { setError('لازم تحدد عمود "اسم المنتج"'); return }
    setBusy(true); setError(null)
    try {
      const payload: Record<string, any>[] = []
      for (let idx = 0; idx < rows.length; idx++) {
        const r = rows[idx]
        const o: Record<string, any> = {}
        for (const fld of IMPORT_FIELDS) {
          const h = mapping[fld.key]
          if (h && r[h] !== null && r[h] !== undefined) o[fld.key] = String(r[h])
        }
        if (!o.name_ar) continue
        // تحويل تلقائي للوحدات المعروفة لو مش متحددة في الشيت
        if (o.unit && (!o.base_unit || !o.units_per_pack)) {
          const auto = autoConversion(o.unit)
          if (auto) {
            if (!o.base_unit) o.base_unit = auto.base
            if (!o.units_per_pack) o.units_per_pack = String(auto.factor)
          }
        }
        // الصورة المدفونة في نفس الصف (لو مفيش لينك صورة في الشيت)
        const img = rowImages.get(idx + 1)
        if (!o.photo_url && img) {
          setProgress(`بترفع صورة ${o.name_ar}…`)
          const url = await uploadExtractedImage(img, supplierId, 'inventory', o.name_ar)
          if (url) o.photo_url = url
        }
        payload.push(o)
      }
      setProgress(null)
      let inserted = 0, updated = 0, skipped = 0
      for (let i = 0; i < payload.length; i += 500) {
        // 🔐 عن طريق بوابة الأدمن — النداء المباشر بيرجع forbidden
        const data: any = await adminRpc('admin_import_inventory', {
          p_supplier_id: supplierId, p_rows: payload.slice(i, i + 500),
        })
        inserted += Number(data?.inserted || 0); updated += Number(data?.updated || 0); skipped += Number(data?.skipped || 0)
      }
      setResult(`✅ تم: ${inserted} منتج جديد · ${updated} اتحدّث · ${skipped} اتخطى`)
      setTimeout(onDone, 1800)
    } catch (e: any) {
      setError(e?.message === 'not allowed' ? 'مفيش صلاحية للاستيراد' : (e?.message || 'حصل خطأ في الاستيراد'))
    } finally { setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6" dir="rtl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black text-[#1A2E26] flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-[#1F6F5F]" /> استيراد مخزون من Excel
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-4 h-4" /></button>
        </div>

        <p className="text-xs text-[#6B7280] mb-4">
          ارفع شيت (.xlsx / .csv) فيه عمود اسم المنتج على الأقل — الأعمدة بتتقري تلقائي، وتقدر تظبط الماب يدوي.
          المنتج الموجود بنفس الاسم/الـ SKU بيتحدّث، والجديد بيتضاف.
          <br />📸 <b>الصور المدفونة جوه الشيت بتتقري تلقائي</b> وبتترفع مع كل صنف.
          ⚖️ الوحدات المعروفة بتتحول لوحدها (طن → كجم · كجم → جم · لتر → مل) أو حدد "وحدة التقسيم" و"معامل التحويل" في الشيت.
          🏬 عمود "المخزن": اكتب "رئيسي" أو اسم الفرع.
        </p>

        <input
          type="file" accept=".xlsx,.xls,.csv"
          className="w-full text-sm mb-4 file:ml-3 file:px-4 file:py-2 file:rounded-xl file:border-0 file:bg-[#1F6F5F] file:text-white file:font-bold file:cursor-pointer"
          onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
        />

        {rows.length > 0 && (
          <>
            <p className="text-sm font-bold text-[#1A2E26] mb-2">📄 {fileName} — {rows.length} صف</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
              {IMPORT_FIELDS.map((fld) => (
                <label key={fld.key} className="flex items-center justify-between gap-2 text-xs bg-[#FAFAF7] rounded-xl px-3 py-2">
                  <span className="font-bold text-[#1A2E26]">{fld.label}</span>
                  <select
                    value={mapping[fld.key] || ''}
                    onChange={(e) => setMapping((m) => ({ ...m, [fld.key]: e.target.value }))}
                    className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs max-w-[50%]"
                  >
                    <option value="">— تجاهل —</option>
                    {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </label>
              ))}
            </div>
            <button
              onClick={doImport} disabled={busy}
              className="w-full py-3 rounded-xl bg-[#1F6F5F] hover:bg-[#1A5D4F] text-white font-bold flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {busy ? 'جاري الاستيراد…' : `استيراد ${rows.length} صف`}
            </button>
          </>
        )}

        {progress && <p className="mt-3 text-xs font-bold text-[#6B7280] flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin" /> {progress}</p>}
        {result && <p className="mt-3 text-sm font-bold text-[#1F6F5F]">{result}</p>}
        {error && <p className="mt-3 text-sm font-bold text-red-600">{error}</p>}
      </div>
    </div>
  )
}

function ProductRow({ p }: { p: Product }) {
  const catColor = CATEGORY_COLORS[p.category] || CATEGORY_COLORS.general
  const catLabel = CATEGORY_LABELS[p.category] || p.category
  const isLowStock = !p.stock_unknown && p.current_stock <= p.reorder_threshold && p.current_stock > 0
  const isOutOfStock = !p.stock_unknown && p.current_stock === 0
  
  return (
    <div className="grid grid-cols-12 gap-3 px-4 py-3 hover:bg-[#FAFAF7] transition-colors items-center text-sm">
      <div className="col-span-5">
        <div className="flex items-start gap-2">
          {p.photo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.photo_url} alt="" className="w-10 h-10 rounded-lg object-cover border border-gray-100 flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
          )}
          <div className="flex-1 min-w-0">
            <p className="font-bold text-[#1A2E26] leading-tight truncate">{p.name_ar}</p>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${catColor}`}>{catLabel}</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-gray-100 text-gray-600">🏬 {p.warehouse_name || 'المخزن الرئيسي'}</span>
              {p.base_unit && p.units_per_pack && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-50 text-blue-700">⚖️ 1 {p.unit} = {Number(p.units_per_pack).toLocaleString()} {p.base_unit}</span>
              )}
              {p.product_type === 'retail' && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#1A2E26]/10 text-[#1A2E26]">🏷 بيع</span>
              )}
              {p.recent_usage && (
                <span className="text-[10px] text-[#6B7280]">استهلاك أخير: {p.recent_usage}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="col-span-2 text-center">
        {p.stock_unknown ? (
          <span className="text-[10px] font-bold text-[#6B7280] bg-gray-100 px-2 py-1 rounded">غير محدد</span>
        ) : (
          <div>
            <div className="flex items-center justify-center gap-1.5">
              <span className={`text-lg font-black ${
                isOutOfStock ? 'text-red-600' :
                isLowStock ? 'text-amber-700' :
                'text-[#1A2E26]'
              }`}>{p.current_stock}</span>
              <span className="text-[10px] text-[#6B7280]">{p.unit !== 'piece' ? p.unit : ''}</span>
              {isOutOfStock && <AlertCircle className="w-3.5 h-3.5 text-red-600" />}
              {isLowStock && <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />}
            </div>
            {p.base_unit && p.units_per_pack && p.current_stock > 0 && (
              <p className="text-[10px] text-blue-700 font-bold mt-0.5">= {(p.current_stock * Number(p.units_per_pack)).toLocaleString()} {p.base_unit}</p>
            )}
          </div>
        )}
      </div>

      <div className="col-span-2 text-center">
        <p className="text-xs text-[#6B7280]">{p.cost_price_egp ? Number(p.cost_price_egp).toLocaleString() : '—'} <span className="opacity-50">/</span> <span className="text-[#1A2E26] font-bold">{p.selling_price_egp ? Number(p.selling_price_egp).toLocaleString() : '—'} ج</span></p>
      </div>

      <div className="col-span-2 text-center">
        {p.stock_value && p.stock_value > 0 ? (
          <p className="text-sm font-black text-[#1F6F5F]">{Number(p.stock_value).toLocaleString()} ج</p>
        ) : (
          <span className="text-xs text-[#6B7280]">—</span>
        )}
      </div>

      <div className="col-span-1 text-center">
        {p.margin_pct !== null ? (
          <span className={`text-xs font-bold ${
            p.margin_pct < 0 ? 'text-red-600' :
            p.margin_pct === 0 ? 'text-[#6B7280]' :
            'text-[#1F6F5F]'
          }`}>{p.margin_pct}%</span>
        ) : (
          <span className="text-xs text-[#6B7280]">—</span>
        )}
      </div>
    </div>
  )
}

function StatCard({
  label, value, icon, tone, primary,
}: {
  label: string
  value: number | string
  icon: React.ReactNode
  tone?: 'warning' | 'danger' | 'positive'
  primary?: boolean
}) {
  const toneClass = 
    tone === 'warning' ? 'text-amber-700' :
    tone === 'danger' ? 'text-red-600' :
    tone === 'positive' ? 'text-[#1F6F5F]' :
    'text-[#1A2E26]'
  return (
    <div className={`rounded-2xl p-4 border ${primary ? 'bg-[#1F6F5F] border-[#1F6F5F] text-white' : 'bg-white border-gray-100'}`}>
      <div className={`flex items-center gap-2 mb-1.5 ${primary ? 'text-white/90' : 'text-[#6B7280]'}`}>
        {icon}
        <p className="text-[10px] font-bold tracking-wider uppercase">{label}</p>
      </div>
      <p className={`text-xl md:text-2xl font-black ${primary ? 'text-white' : toneClass}`}>{value}</p>
    </div>
  )
}
