'use client'

// ============================================================
// src/components/supplier/ExcelImportModal.tsx
// Shared Excel (.xlsx/.csv) bulk-import modal for suppliers.
//   mode='menu'     → restaurant_menu_items (+ sizes) via supplier_bulk_import_menu_items
//   mode='products' → mart_products (+ ERP sync) via supplier_bulk_import_products
// Uses the `xlsx` package (already a project dependency).
// ============================================================

import { useRef, useState } from 'react'
// PERF: xlsx is ~430KB raw / ~110KB gzipped. Statically importing it here put
// it in the initial bundle of every supplier page that mounts this modal
// (/supplier/marketplace/[id]/products & /menu were 309KB First Load JS).
// It is only needed after a click, so it is imported on demand below.
import { supabaseBrowser } from '@/lib/supabase-browser'
import {
  X, FileSpreadsheet, Download, Upload, Loader2, CheckCircle,
  AlertCircle, ArrowRight,
} from 'lucide-react'

type Mode = 'menu' | 'products' | 'listings'

type ParsedRow = Record<string, string | number | null> & {
  __row: number
  __error?: string | null
}

type ImportResult = {
  ok: boolean
  inserted: number
  updated?: number
  sizes_added?: number
  erp_synced?: number
  erp_enabled?: boolean
  published?: number
  drafts?: number
  skipped_duplicate?: number
  errors: { row: number; error: string }[]
}

// ---------- header detection ----------
const norm = (s: unknown) =>
  String(s ?? '')
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')

const HEADER_MAP: Record<string, string[]> = {
  title: ['العنوان', 'اسم الاعلان', 'اسم الليستنج', 'title'],
  price_on_request: ['اتصل للسعر', 'بدون سعر', 'on request', 'price_on_request'],
  district: ['المنطقه', 'الحي', 'district'],
  city: ['المدينه', 'city'],
  name_ar: ['الاسم', 'اسم الصنف', 'اسم المنتج', 'الصنف', 'المنتج', 'name', 'name_ar', 'الاسم بالعربي'],
  name_en: ['الاسم بالانجليزي', 'الاسم بالانجليزيه', 'name_en', 'english name', 'الاسم الانجليزي'],
  category: ['القسم', 'الفئه', 'التصنيف', 'category'],
  subcategory: ['القسم الفرعي', 'التصنيف الفرعي', 'subcategory'],
  description_ar: ['الوصف', 'التفاصيل', 'description', 'description_ar'],
  price: ['السعر', 'السعر (ج)', 'السعر بالجنيه', 'price'],
  compare_at_price: ['السعر قبل الخصم', 'قبل الخصم', 'compare_at_price', 'old price'],
  unit: ['الوحده', 'unit'],
  brand: ['الماركه', 'البراند', 'brand'],
  barcode: ['الباركود', 'barcode', 'sku'],
  stock_qty: ['المخزون', 'الكميه', 'الرصيد', 'stock', 'stock_qty', 'quantity'],
  photo_url: ['رابط الصوره', 'الصوره', 'photo', 'photo_url', 'image', 'image_url'],
  sizes: ['الاحجام', 'الحجم', 'sizes', 'الاحجام والاسعار'],
}

function detectColumns(headerRow: unknown[]): Record<number, string> {
  const map: Record<number, string> = {}
  headerRow.forEach((cell, idx) => {
    const h = norm(cell)
    if (!h) return
    for (const [field, candidates] of Object.entries(HEADER_MAP)) {
      if (candidates.some((c) => norm(c) === h)) {
        if (!Object.values(map).includes(field)) map[idx] = field
        return
      }
    }
  })
  return map
}

// "صغير:50 | وسط:65 | كبير:80" → [{name_ar, price}]
function parseSizes(raw: unknown): { name_ar: string; price: number }[] {
  const s = String(raw ?? '').trim()
  if (!s) return []
  return s
    .split(/[|،,؛;\n]+/)
    .map((part) => {
      const m = part.split(/[:：=\-–]+/)
      if (m.length < 2) return null
      const name = m[0].trim()
      const price = Number(String(m.slice(1).join('').trim()).replace(/[^\d.]/g, ''))
      if (!name || isNaN(price) || price < 0) return null
      return { name_ar: name, price }
    })
    .filter(Boolean) as { name_ar: string; price: number }[]
}

const cleanNum = (v: unknown): number | null => {
  const s = String(v ?? '').trim().replace(/[,٬\s]/g, '').replace(/ج\.?م?\.?/g, '')
  if (!s) return null
  const n = Number(s)
  return isNaN(n) ? null : n
}

const cleanStr = (v: unknown): string | null => {
  const s = String(v ?? '').trim()
  return s || null
}

// ---------- templates ----------
async function downloadTemplate(mode: Mode) {
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()
  let aoa: (string | number)[][]
  if (mode === 'menu') {
    aoa = [
      ['الاسم', 'القسم', 'الوصف', 'السعر', 'الأحجام', 'رابط الصورة'],
      ['بيتزا مارجريتا', 'بيتزا', 'صوص طماطم وموتزاريلا', '', 'صغير:90 | وسط:120 | كبير:150', ''],
      ['كولا كانز', 'مشروبات', '', 25, '', ''],
    ]
  } else if (mode === 'listings') {
    aoa = [
      ['العنوان', 'الفئة', 'السعر', 'اتصل للسعر', 'الوصف', 'المنطقة', 'المدينة', 'رابط الصورة'],
      ['ركنة مودرن 5 قطع قماش مستورد', 'أثاث منزلي', 25000, '', 'خشب زان أحمر + قماش مستورد ضد البقع', 'مدينة نصر', 'القاهرة', ''],
      ['مكتب مدير خشب زان + كرسي', 'أثاث مكتبي', 18500, '', '', 'وسط البلد', 'القاهرة', ''],
      ['BMW S1000RR 2020', 'موتوسيكل', '', 'نعم', 'حالة ممتازة', '', 'القاهرة', ''],
    ]
  } else {
    aoa = [
      ['اسم المنتج', 'القسم', 'الوصف', 'السعر', 'السعر قبل الخصم', 'الوحدة', 'الماركة', 'الباركود', 'المخزون', 'رابط الصورة'],
      ['أرز مصري 1 كجم', 'بقالة', 'أرز حبة عريضة', 55, 65, 'كيس', 'الضحى', '6221024000123', 40, ''],
      ['زيت عباد الشمس 1 لتر', 'بقالة', '', 95, '', 'زجاجة', 'كريستال', '', 25, ''],
    ]
  }
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  ws['!cols'] = aoa[0].map(() => ({ wch: 22 }))
  const sheetName = mode === 'menu' ? 'المنيو' : mode === 'listings' ? 'الإعلانات' : 'المنتجات'
  const fileName = mode === 'menu' ? 'madmona-menu-template.xlsx' : mode === 'listings' ? 'madmona-listings-template.xlsx' : 'madmona-products-template.xlsx'
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, fileName)
}

// ============================================================
export default function ExcelImportModal({
  mode,
  listingId,
  defaultCategoryId,
  onClose,
  onDone,
}: {
  mode: Mode
  listingId?: string
  defaultCategoryId?: string | null
  onClose: () => void
  onDone: () => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<'pick' | 'preview' | 'importing' | 'done'>('pick')
  const [fileName, setFileName] = useState('')
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [parseError, setParseError] = useState<string | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)

  const validRows = rows.filter((r) => !r.__error)
  const badRows = rows.filter((r) => r.__error)

  async function handleFile(f: File) {
    setParseError(null)
    setFileName(f.name)
    try {
      const buf = await f.arrayBuffer()
      const XLSX = await import('xlsx')
      const wb = XLSX.read(buf, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: false, defval: '' })
      const headerIdx = aoa.findIndex((r) => Array.isArray(r) && r.some((c) => norm(c)))
      if (headerIdx < 0) throw new Error('الملف فاضي')
      const cols = detectColumns(aoa[headerIdx] as unknown[])
      const requiredCol = mode === 'listings' ? 'title' : 'name_ar'
      if (!Object.values(cols).includes(requiredCol)) {
        throw new Error(mode === 'listings' ? 'مش لاقي عمود "العنوان". نزّل القالب الجاهز واملأه.' : 'مش لاقي عمود "الاسم". نزّل القالب الجاهز واملأه.')
      }
      const out: ParsedRow[] = []
      for (let i = headerIdx + 1; i < aoa.length; i++) {
        const raw = aoa[i] as unknown[]
        if (!raw || raw.every((c) => !String(c ?? '').trim())) continue
        const item: ParsedRow = { __row: i + 1 }
        for (const [idxStr, field] of Object.entries(cols)) {
          const v = raw[Number(idxStr)]
          if (field === 'price' || field === 'compare_at_price' || field === 'stock_qty') {
            item[field] = cleanNum(v)
          } else if (field === 'sizes') {
            const sizes = parseSizes(v)
            item.sizes = sizes.length ? (JSON.stringify(sizes) as string) : null
          } else {
            item[field] = cleanStr(v)
          }
        }
        // validation
        if (mode === 'listings') {
          const isPor = ['نعم', 'اه', 'آه', 'yes', 'true', '1', 'y'].includes(String(item.price_on_request ?? '').trim().toLowerCase())
          if (!item.title) item.__error = 'العنوان فاضي'
          else if (!isPor && (item.price == null || Number(item.price) < 0)) item.__error = 'السعر ناقص (أو اكتب "نعم" في عمود اتصل للسعر)'
        } else if (!item.name_ar) item.__error = 'الاسم فاضي'
        else if (mode === 'menu') {
          const hasSizes = !!item.sizes
          if (!hasSizes && (item.price == null || Number(item.price) < 0)) item.__error = 'السعر ناقص (أو ضيف أحجام)'
        } else {
          if (item.price == null || Number(item.price) < 0) item.__error = 'السعر ناقص'
        }
        out.push(item)
      }
      if (out.length === 0) throw new Error('مفيش صفوف بيانات في الملف')
      if (out.length > 500) throw new Error('الحد الأقصى 500 صف في المرة الواحدة')
      setRows(out)
      setStep('preview')
    } catch (e) {
      setParseError(e instanceof Error ? e.message : 'مقدرتش أقرأ الملف')
    }
  }

  async function runImport() {
    setStep('importing')
    const items = validRows.map((r) => {
      if (mode === 'listings') {
        return {
          title: r.title,
          category: r.category ?? null,
          price: r.price,
          price_on_request: r.price_on_request ?? null,
          description: r.description_ar ?? null,
          district: r.district ?? null,
          city: r.city ?? null,
          photo_url: r.photo_url ?? null,
        } as Record<string, unknown>
      }
      const base: Record<string, unknown> = {
        name_ar: r.name_ar,
        name_en: r.name_en ?? null,
        category: r.category ?? null,
        description_ar: r.description_ar ?? null,
        price: r.price,
        photo_url: r.photo_url ?? null,
      }
      if (mode === 'menu') {
        base.sizes = r.sizes ? JSON.parse(String(r.sizes)) : null
      } else {
        base.subcategory = r.subcategory ?? null
        base.compare_at_price = r.compare_at_price ?? null
        base.unit = r.unit ?? null
        base.brand = r.brand ?? null
        base.barcode = r.barcode ?? null
        base.stock_qty = r.stock_qty ?? null
      }
      return base
    })

    const rpc = mode === 'menu' ? 'supplier_bulk_import_menu_items' : mode === 'listings' ? 'supplier_bulk_import_listings' : 'supplier_bulk_import_products'
    const agg: ImportResult = { ok: true, inserted: 0, updated: 0, sizes_added: 0, erp_synced: 0, erp_enabled: false, errors: [] }
    try {
      const chunkSize = mode === 'listings' ? 100 : 200
      for (let i = 0; i < items.length; i += chunkSize) {
        const chunk = items.slice(i, i + chunkSize)
        const args: Record<string, unknown> = mode === 'listings'
          ? { p_items: chunk, p_default_category_id: defaultCategoryId ?? null }
          : { p_listing_id: listingId, p_items: chunk }
        // @ts-expect-error rpc typing
        const { data, error } = await supabaseBrowser.rpc(rpc, args)
        if (error) throw error
        const d = data as ImportResult
        agg.inserted += d.inserted || 0
        agg.updated = (agg.updated || 0) + (d.updated || 0)
        agg.sizes_added = (agg.sizes_added || 0) + (d.sizes_added || 0)
        agg.erp_synced = (agg.erp_synced || 0) + (d.erp_synced || 0)
        agg.erp_enabled = agg.erp_enabled || !!d.erp_enabled
        agg.published = (agg.published || 0) + (d.published || 0)
        agg.drafts = (agg.drafts || 0) + (d.drafts || 0)
        agg.skipped_duplicate = (agg.skipped_duplicate || 0) + (d.skipped_duplicate || 0)
        agg.errors.push(...(d.errors || []))
      }
      setResult(agg)
      setStep('done')
      onDone()
    } catch (e) {
      setParseError(e instanceof Error ? e.message : 'حصل خطأ في الاستيراد')
      setStep('preview')
    }
  }

  const previewCols =
    mode === 'menu'
      ? [['name_ar', 'الاسم'], ['category', 'القسم'], ['price', 'السعر'], ['sizes', 'الأحجام']]
      : mode === 'listings'
      ? [['title', 'العنوان'], ['category', 'الفئة'], ['price', 'السعر'], ['district', 'المنطقة']]
      : [['name_ar', 'الاسم'], ['category', 'القسم'], ['price', 'السعر'], ['barcode', 'الباركود'], ['stock_qty', 'المخزون']]

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" dir="rtl">
      <div className="bg-white w-full sm:max-w-2xl sm:rounded-3xl rounded-t-3xl shadow-2xl max-h-[92vh] flex flex-col">
        {/* header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <div className="w-10 h-10 rounded-2xl bg-[#34D399]/10 flex items-center justify-center">
            <FileSpreadsheet className="w-5 h-5 text-[#059669]" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-black text-gray-900">
              {mode === 'menu' ? 'استيراد المنيو من Excel' : mode === 'listings' ? 'استيراد إعلانات بالجملة من Excel' : 'استيراد المنتجات من Excel'}
            </h2>
            <p className="text-[11px] text-gray-500 font-bold">
              {mode === 'menu'
                ? 'ضيف أصنافك كلها مرة واحدة — بالأحجام والأسعار'
                : mode === 'listings'
                ? 'كل صف في الشيت = إعلان منفصل على الماركت بليس — لحد ٢٠٠ إعلان'
                : 'ضيف منتجاتك كلها مرة واحدة — وهتتزامن مع نظام الـERP تلقائياً لو مشترك'}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {/* STEP: pick */}
          {step === 'pick' && (
            <div className="space-y-4">
              <button
                onClick={() => downloadTemplate(mode)}
                className="w-full flex items-center gap-3 p-4 rounded-2xl border-2 border-dashed border-[#059669]/30 bg-[#34D399]/5 hover:bg-[#34D399]/10 transition"
              >
                <Download className="w-5 h-5 text-[#059669]" />
                <span className="text-sm font-bold text-[#059669]">نزّل القالب الجاهز (Excel)</span>
              </button>

              <div
                onClick={() => fileRef.current?.click()}
                className="cursor-pointer border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center hover:border-[#059669]/40 hover:bg-gray-50 transition"
              >
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm font-bold text-gray-700">اضغط لاختيار ملف Excel</p>
                <p className="text-[11px] text-gray-400 font-bold mt-1">.xlsx / .xls / .csv — لحد 500 صف</p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) handleFile(f)
                    e.target.value = ''
                  }}
                />
              </div>

              {mode === 'menu' && (
                <p className="text-[11px] text-gray-500 leading-relaxed bg-amber-50 border border-amber-100 rounded-xl p-3">
                  💡 عمود <b>الأحجام</b> اختياري — اكتبه بالشكل ده: <b>صغير:90 | وسط:120 | كبير:150</b>.
                  لو الصنف مالوش أحجام سيب العمود فاضي واكتب السعر في عمود السعر.
                </p>
              )}
              {mode === 'products' && (
                <p className="text-[11px] text-gray-500 leading-relaxed bg-amber-50 border border-amber-100 rounded-xl p-3">
                  💡 لو حسابك مشترك في نظام الإدارة (CRM+ERP)، المنتجات هتتسجل تلقائياً في مخزون الـERP
                  وهيتربط المنتج بالماركت بليس — تحديث واحد يظهر في الاتنين.
                </p>
              )}
              {mode === 'listings' && (
                <p className="text-[11px] text-gray-500 leading-relaxed bg-amber-50 border border-amber-100 rounded-xl p-3">
                  💡 عمود <b>الفئة</b>: اكتب اسم الفئة زي ما هي على الموقع (مثلاً: أثاث منزلي / أثاث مكتبي / موتوسيكل).
                  الصفوف اللي من غير فئة هتاخد الفئة الافتراضية اللي اخترتها. الإعلان اللي ليه <b>صورة</b> بينزل مباشرة،
                  واللي من غيرها بيتسجل مسودة لحد ما تضيفله صورة. مفيش إعلان من غير سعر — أو اكتب "نعم" في عمود اتصل للسعر.
                </p>
              )}
              {parseError && (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-xl p-3 text-xs font-bold">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" /> {parseError}
                </div>
              )}
            </div>
          )}

          {/* STEP: preview */}
          {(step === 'preview' || step === 'importing') && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-600">
                <FileSpreadsheet className="w-4 h-4 text-[#059669]" />
                {fileName} — <span className="text-[#059669]">{validRows.length} صف جاهز</span>
                {badRows.length > 0 && <span className="text-red-500">· {badRows.length} صف فيه مشكلة</span>}
              </div>

              <div className="border border-gray-100 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-[#FAFAF7]">
                      <tr>
                        {previewCols.map(([k, label]) => (
                          <th key={k} className="px-3 py-2 text-right font-black text-gray-500">{label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {rows.slice(0, 8).map((r, i) => (
                        <tr key={i} className={r.__error ? 'bg-red-50/60' : ''}>
                          {previewCols.map(([k]) => (
                            <td key={k} className="px-3 py-2 font-bold text-gray-700 whitespace-nowrap max-w-[160px] truncate">
                              {k === 'sizes' && r.sizes
                                ? (JSON.parse(String(r.sizes)) as { name_ar: string; price: number }[])
                                    .map((s) => `${s.name_ar} ${s.price}`)
                                    .join(' · ')
                                : String(r[k] ?? '—')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {rows.length > 8 && (
                  <p className="text-[10px] text-gray-400 font-bold text-center py-2 bg-gray-50">+ {rows.length - 8} صف كمان</p>
                )}
              </div>

              {badRows.length > 0 && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-3 space-y-1 max-h-28 overflow-y-auto">
                  {badRows.slice(0, 10).map((r, i) => (
                    <p key={i} className="text-[11px] font-bold text-red-600">صف {r.__row}: {r.__error}</p>
                  ))}
                </div>
              )}

              {parseError && (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-xl p-3 text-xs font-bold">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" /> {parseError}
                </div>
              )}
            </div>
          )}

          {/* STEP: done */}
          {step === 'done' && result && (
            <div className="text-center py-6 space-y-3">
              <div className="w-16 h-16 mx-auto rounded-full bg-[#34D399]/10 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-[#059669]" />
              </div>
              <h3 className="text-lg font-black text-gray-900">تم الاستيراد 🎉</h3>
              <div className="flex items-center justify-center gap-2 flex-wrap text-xs font-black">
                <span className="bg-[#34D399]/10 text-[#059669] px-3 py-1.5 rounded-full">{result.inserted} جديد</span>
                {mode !== 'listings' && (
                  <span className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-full">{result.updated || 0} اتحدث</span>
                )}
                {mode === 'listings' && (
                  <>
                    <span className="bg-green-50 text-green-700 px-3 py-1.5 rounded-full">{result.published || 0} منشور</span>
                    <span className="bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full">{result.drafts || 0} مسودة (ناقص صورة)</span>
                    {(result.skipped_duplicate || 0) > 0 && (
                      <span className="bg-amber-50 text-amber-600 px-3 py-1.5 rounded-full">{result.skipped_duplicate} مكرر اتخطى</span>
                    )}
                  </>
                )}
                {mode === 'menu' && (result.sizes_added || 0) > 0 && (
                  <span className="bg-amber-50 text-amber-600 px-3 py-1.5 rounded-full">{result.sizes_added} حجم</span>
                )}
                {mode === 'products' && result.erp_enabled && (
                  <span className="bg-purple-50 text-purple-600 px-3 py-1.5 rounded-full">ERP ✓ {result.erp_synced}</span>
                )}
              </div>
              {result.errors.length > 0 && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-3 space-y-1 max-h-28 overflow-y-auto text-right">
                  {result.errors.slice(0, 10).map((e, i) => (
                    <p key={i} className="text-[11px] font-bold text-red-600">صف {e.row}: {e.error}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* footer */}
        <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
          {step === 'pick' && (
            <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-600 text-sm font-black">إلغاء</button>
          )}
          {(step === 'preview' || step === 'importing') && (
            <>
              <button
                onClick={() => { setRows([]); setParseError(null); setStep('pick') }}
                disabled={step === 'importing'}
                className="py-3 px-4 rounded-xl bg-gray-100 text-gray-600 text-sm font-black disabled:opacity-50"
              >
                غيّر الملف
              </button>
              <button
                onClick={runImport}
                disabled={step === 'importing' || validRows.length === 0}
                className="flex-1 py-3 rounded-xl bg-[#34D399] text-[#04352A] text-sm font-black disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {step === 'importing' ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> جاري الاستيراد...</>
                ) : (
                  <><ArrowRight className="w-4 h-4" /> استورد {validRows.length} صف</>
                )}
              </button>
            </>
          )}
          {step === 'done' && (
            <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-[#34D399] text-[#04352A] text-sm font-black">تمام</button>
          )}
        </div>
      </div>
    </div>
  )
}
