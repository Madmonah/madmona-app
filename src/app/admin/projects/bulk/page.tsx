'use client'

// src/app/admin/projects/bulk/page.tsx
// =====================================================================
// 🏗️ سكريبت إضافة عقارات ريسيل/إيجار بالجملة — طلب محمد ١٩ أغسطس ٢٠٢٦:
// "عايز اسكريبت اضيف بيه اصحاب العقارات (ريسيل - ايجار)".
// نفس نمط BulkExcelDrafts.tsx (تحميل قالب إكسيل → رفع → معاينة → إرسال)
// بس هنا لعقارات (property_market_items) بدل إعلانات الماركت بليس
// العادية، وبتنادي /api/projects/bulk (أدمن بس).
// =====================================================================
import { useRef, useState } from 'react'
import Link from 'next/link'
import {
  ChevronLeft, FileSpreadsheet, Download, Upload, Loader2,
  CheckCircle2, AlertCircle, RefreshCw,
} from 'lucide-react'

type Row = {
  __row: number
  __error?: string | null
  title: string | null
  segment: string | null
  area_label: string | null
  city: string | null
  developer: string | null
  unit_label: string | null
  price_from: string | null
  price_to: string | null
  contact_phone: string | null
  note: string | null
  cover_url: string | null
}

const norm = (s: unknown) =>
  String(s ?? '').trim().toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/\s+/g, ' ')

const HEADERS: Record<string, string[]> = {
  title: ['العنوان', 'اسم العقار', 'الاسم', 'title'],
  segment: ['النوع', 'ريسيل ولا ايجار', 'segment'],
  area_label: ['المنطقة', 'المنطقه', 'area'],
  city: ['المدينة', 'المدينه', 'city'],
  developer: ['صاحب العقار', 'المالك', 'السمسار', 'developer'],
  unit_label: ['الوصف/المساحة', 'المساحة', 'unit_label'],
  price_from: ['السعر', 'السعر من', 'price'],
  price_to: ['السعر لحد', 'price_to'],
  contact_phone: ['رقم التواصل', 'الموبايل', 'phone'],
  note: ['ملاحظات', 'تفاصيل إضافية', 'note'],
  cover_url: ['رابط الصورة', 'الصورة', 'photo', 'cover_url'],
}

const TEMPLATE_HEADER = [
  'العنوان', 'النوع', 'المنطقة', 'المدينة', 'صاحب العقار', 'الوصف/المساحة',
  'السعر', 'السعر لحد', 'رقم التواصل', 'ملاحظات', 'رابط الصورة',
]

const SAMPLE_ROWS: (string | number)[][] = [
  ['شقة 150م تشطيب سوبر لوكس', 'resale', 'مدينة نصر', 'القاهرة', 'أحمد حسن', '150م - 3 غرف', 2800000, '', '01001234567', 'دور رابع بأسانسير', ''],
  ['شقة مفروشة للإيجار', 'rent', 'المعادي', 'القاهرة', 'سمسار المعادي', '120م مفروشة بالكامل', 15000, '', '01109876543', 'إيجار شهري', ''],
  ['فيلا مستقلة للبيع', 'resale', 'الشيخ زايد', 'الجيزة', 'شركة العقارات الحديثة', '400م أرض + 300م مباني', 8500000, 9500000, '01234567890', '', ''],
]

function normSegment(v: unknown): string {
  const s = norm(v)
  if (['rent', 'ايجار', 'اجار', 'إيجار'].includes(s)) return 'rent'
  return 'resale'
}

function detect(headerRow: unknown[]): Record<number, string> {
  const map: Record<number, string> = {}
  headerRow.forEach((cell, idx) => {
    const h = norm(cell)
    if (!h) return
    for (const [field, cands] of Object.entries(HEADERS)) {
      if (cands.some((c) => norm(c) === h)) {
        if (!Object.values(map).includes(field)) map[idx] = field
        return
      }
    }
  })
  return map
}

async function downloadTemplate() {
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()
  const aoa = [TEMPLATE_HEADER, ...SAMPLE_ROWS]
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  ws['!cols'] = aoa[0].map(() => ({ wch: 20 }))
  XLSX.utils.book_append_sheet(wb, ws, 'عقارات')
  XLSX.writeFile(wb, 'madmona-عقارات-قالب.xlsx')
}

export default function BulkPropertiesPage() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<'pick' | 'preview' | 'sending' | 'done'>('pick')
  const [rows, setRows] = useState<Row[]>([])
  const [fileName, setFileName] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [publishNow, setPublishNow] = useState(false)
  const [result, setResult] = useState<{ inserted: number; failed: number; results: { row: number; ok: boolean; title?: string; error?: string }[] } | null>(null)

  const valid = rows.filter((r) => !r.__error)
  const bad = rows.filter((r) => r.__error)

  async function handleFile(f: File) {
    setErr(null)
    setFileName(f.name)
    try {
      const buf = await f.arrayBuffer()
      const XLSX = await import('xlsx')
      const wb = XLSX.read(buf, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: false, defval: '' })
      const hIdx = aoa.findIndex((r) => Array.isArray(r) && r.some((c) => norm(c)))
      if (hIdx < 0) throw new Error('الملف فاضي')
      const cols = detect(aoa[hIdx] as unknown[])
      if (!Object.values(cols).includes('title')) throw new Error('مش لاقي عمود "العنوان" — نزّل القالب واملأه')
      if (!Object.values(cols).includes('area_label')) throw new Error('مش لاقي عمود "المنطقة" — نزّل القالب واملأه')

      const out: Row[] = []
      for (let i = hIdx + 1; i < aoa.length; i++) {
        const raw = aoa[i] as unknown[]
        if (!raw || raw.every((c) => !String(c ?? '').trim())) continue
        const item: Row = {
          __row: i + 1, title: null, segment: null, area_label: null, city: null,
          developer: null, unit_label: null, price_from: null, price_to: null,
          contact_phone: null, note: null, cover_url: null,
        }
        for (const [idx, field] of Object.entries(cols)) {
          const v = String(raw[Number(idx)] ?? '').trim()
          if (field === 'segment') item.segment = normSegment(v)
          else (item as unknown as Record<string, string | null>)[field] = v || null
        }
        if (!item.title) item.__error = 'العنوان فاضي'
        else if (!item.area_label) item.__error = 'المنطقة فاضية'
        out.push(item)
      }
      if (out.length === 0) throw new Error('مفيش صفوف بيانات')
      if (out.length > 500) throw new Error('الحد الأقصى 500 صف في المرة')
      setRows(out)
      setStep('preview')
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'مقدرتش أقرأ الملف')
    }
  }

  async function submit() {
    setErr(null)
    setStep('sending')
    try {
      const res = await fetch('/api/projects/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publish: publishNow,
          rows: valid.map((r) => ({
            __row: r.__row,
            title: r.title,
            segment: r.segment,
            area_label: r.area_label,
            city: r.city,
            developer: r.developer,
            unit_label: r.unit_label,
            price_from: r.price_from,
            price_to: r.price_to,
            contact_phone: r.contact_phone,
            note: r.note,
            cover_url: r.cover_url,
          })),
        }),
      })
      const j = await res.json()
      if (!res.ok || !j.ok) throw new Error(j.error || 'حصل خطأ')
      setResult({ inserted: j.inserted, failed: j.failed, results: j.results || [] })
      setStep('done')
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'حصل خطأ في الإرسال')
      setStep('preview')
    }
  }

  function reset() {
    setRows([]); setResult(null); setErr(null); setFileName(''); setStep('pick')
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <Link href="/admin/projects" className="text-xs font-bold text-[#6B7280] hover:text-[#059669] flex items-center gap-1 mb-2 transition-colors">
            <ChevronLeft className="w-3.5 h-3.5" /> رجوع لبورصة العقارات
          </Link>
          <h1 className="text-2xl md:text-3xl font-black text-[#1A2E26] tracking-tight">
            إضافة عقارات بالجملة — ريسيل/إيجار
          </h1>
          <p className="text-sm text-[#6B7280] mt-1">
            نزّل القالب، املأه بعقارات الريسيل والإيجار، وارفعه — كل الصفوف بتتحفظ draft للمراجعة قبل النشر (إلا لو فعّلت &quot;انشر فورًا&quot;).
          </p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        {step === 'pick' && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <button
              onClick={downloadTemplate}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-[#059669]/30 text-[#059669] font-bold text-sm hover:bg-[#34D399]/5 transition-colors"
            >
              <Download className="w-4 h-4" /> نزّل قالب Excel
            </button>

            <label className="block">
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
              />
              <div
                onClick={() => fileRef.current?.click()}
                className="cursor-pointer flex flex-col items-center justify-center gap-2 px-4 py-8 rounded-xl bg-[#FAFAF7] border border-gray-200 hover:border-[#059669] transition-colors"
              >
                <Upload className="w-6 h-6 text-[#6B7280]" />
                <p className="text-sm font-bold text-[#1A2E26]">ارفع ملف الإكسيل بعد ما تملاه</p>
                <p className="text-xs text-[#6B7280]">xlsx / xls / csv — لغاية 500 عقار</p>
              </div>
            </label>

            {err && (
              <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 rounded-lg p-3">
                <AlertCircle className="w-4 h-4 flex-shrink-0" /> {err}
              </div>
            )}
          </div>
        )}

        {step === 'preview' && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-[#059669]" />
              <p className="text-sm font-bold text-[#1A2E26]">{fileName}</p>
            </div>

            <div className="flex items-center gap-4 text-sm">
              <span className="text-[#059669] font-bold">{valid.length} صف صحيح</span>
              {bad.length > 0 && <span className="text-red-600 font-bold">{bad.length} صف فيه مشكلة</span>}
            </div>

            <div className="max-h-72 overflow-y-auto border border-gray-100 rounded-xl">
              <table className="w-full text-xs">
                <thead className="bg-[#FAFAF7] sticky top-0">
                  <tr>
                    <th className="p-2 text-right">صف</th>
                    <th className="p-2 text-right">العنوان</th>
                    <th className="p-2 text-right">النوع</th>
                    <th className="p-2 text-right">المنطقة</th>
                    <th className="p-2 text-right">السعر</th>
                    <th className="p-2 text-right">ملاحظة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {rows.map((r) => (
                    <tr key={r.__row} className={r.__error ? 'bg-red-50' : ''}>
                      <td className="p-2 text-[#6B7280]">{r.__row}</td>
                      <td className="p-2 font-bold text-[#1A2E26]">{r.title || '—'}</td>
                      <td className="p-2">{r.segment === 'rent' ? 'إيجار' : 'ريسيل'}</td>
                      <td className="p-2">{r.area_label || '—'}</td>
                      <td className="p-2">{r.price_from || '—'}</td>
                      <td className="p-2 text-red-600">{r.__error || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <label className="flex items-center gap-2 text-sm text-[#1A2E26] bg-amber-50 rounded-lg p-3">
              <input type="checkbox" checked={publishNow} onChange={(e) => setPublishNow(e.target.checked)} />
              انشر فورًا بدون مراجعة (غير كده هتتحفظ draft وتراجعها من /admin/projects)
            </label>

            {err && (
              <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 rounded-lg p-3">
                <AlertCircle className="w-4 h-4 flex-shrink-0" /> {err}
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={submit}
                disabled={valid.length === 0}
                className="flex-1 px-4 py-3 rounded-xl bg-[#34D399] text-[#04352A] font-bold text-sm hover:opacity-90 disabled:opacity-40 transition-opacity"
              >
                ضيف {valid.length} عقار
              </button>
              <button onClick={reset} className="px-4 py-3 rounded-xl border border-gray-200 text-sm font-bold text-[#6B7280] hover:bg-gray-50 transition-colors">
                إلغاء
              </button>
            </div>
          </div>
        )}

        {step === 'sending' && (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-[#059669] animate-spin" />
            <p className="text-sm font-bold text-[#1A2E26]">بيضيف العقارات...</p>
          </div>
        )}

        {step === 'done' && result && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-[#059669]" />
              <p className="font-bold text-[#1A2E26]">
                اتضاف {result.inserted} عقار{result.failed > 0 ? ` — ${result.failed} فشل` : ''}
              </p>
            </div>
            {result.failed > 0 && (
              <div className="max-h-48 overflow-y-auto border border-gray-100 rounded-xl">
                <table className="w-full text-xs">
                  <tbody className="divide-y divide-gray-50">
                    {result.results.filter((r) => !r.ok).map((r) => (
                      <tr key={r.row} className="bg-red-50">
                        <td className="p-2 text-[#6B7280]">صف {r.row}</td>
                        <td className="p-2 text-red-600">{r.error}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Link href="/admin/projects" className="flex-1 text-center px-4 py-3 rounded-xl bg-[#34D399] text-[#04352A] font-bold text-sm hover:opacity-90 transition-opacity">
                روح لبورصة العقارات
              </Link>
              <button onClick={reset} className="px-4 py-3 rounded-xl border border-gray-200 text-sm font-bold text-[#6B7280] hover:bg-gray-50 transition-colors flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5" /> دفعة تانية
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
