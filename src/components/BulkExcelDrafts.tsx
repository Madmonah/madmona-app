'use client'

// ============================================================
// src/components/BulkExcelDrafts.tsx
// Excel bulk upload INSIDE the public /add-listing funnel (no auth).
// Parses the sheet client-side → POST /api/listing-drafts/bulk →
// creates N submitted drafts that enter the normal review pipeline.
// ============================================================

import { useRef, useState } from 'react'
// PERF: xlsx is ~430KB raw / ~110KB gzipped. A static import put it in the
// initial bundle of every page that renders this component (/add-listing was
// 316KB First Load JS). It is only ever needed AFTER the user clicks
// "download template" or picks a file, so we load it on demand instead.
import {
  X, FileSpreadsheet, Download, Upload, Loader2, CheckCircle, AlertCircle, ArrowRight,
} from 'lucide-react'

type Row = Record<string, string | number | null> & { __row: number; __error?: string | null }

const norm = (s: unknown) =>
  String(s ?? '').trim().toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/\s+/g, ' ')

const HEADERS: Record<string, string[]> = {
  title: ['العنوان', 'اسم الاعلان', 'الاسم', 'اسم الصنف', 'title'],
  category: ['الفئه', 'القسم', 'التصنيف', 'category'],
  price: ['السعر', 'السعر (ج)', 'price'],
  price_on_request: ['اتصل للسعر', 'بدون سعر', 'on request'],
  description: ['الوصف', 'التفاصيل', 'description'],
  district: ['المنطقه', 'الحي', 'district'],
  city: ['المدينه', 'city'],
  photo_url: ['رابط الصوره', 'الصوره', 'photo', 'photo_url', 'image'],
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

// Jul 24 2026 (Task 17): the sample rows adapt to the activity type so a
// دكتور/مقدّم خدمة/صاحب معدّات إيجار يلاقي أمثلة من مجاله بدل عفش وموتوسيكلات.
// المهم: نفس الأعمدة بالظبط في كل الحالات — الـparser و POST /bulk مااتغيروش.
const TEMPLATE_HEADER = ['العنوان', 'الفئة', 'السعر', 'اتصل للسعر', 'الوصف', 'المنطقة', 'المدينة', 'رابط الصورة']

function sampleRows(track?: string | null): (string | number)[][] {
  if (track === 'services') {
    return [
      ['كشف باطنة', 'عيادات', 300, '', 'كشف + متابعة أسبوع', 'مدينة نصر', 'القاهرة', ''],
      ['غيار زيت وفلتر', 'صيانة سيارات', 450, '', 'شامل الزيت', 'فيصل', 'الجيزة', ''],
      ['جلسة تنظيف بشرة', 'تجميل وعناية', 350, '', '', '', 'القاهرة', ''],
    ]
  }
  if (track === 'rentals') {
    return [
      ['كاميرا Canon R5', 'كاميرات', 800, '', 'إيجار يومي + عدسة', 'الدقي', 'الجيزة', ''],
      ['كرسي زفاف مذهّب', 'أثاث أفراح', 40, '', 'سعر القطعة / اليوم', '', 'القاهرة', ''],
      ['بروجيكتور Full HD', 'أجهزة عرض', 350, '', '', 'وسط البلد', 'القاهرة', ''],
    ]
  }
  // products / sale-* / غير محدد: سلع للبيع
  return [
    ['ركنة مودرن 5 قطع', 'أثاث منزلي', 25000, '', 'خشب زان + قماش مستورد', 'مدينة نصر', 'القاهرة', ''],
    ['مكتب مدير + كرسي', 'أثاث مكتبي', 18500, '', '', 'وسط البلد', 'القاهرة', ''],
    ['BMW S1000RR 2020', 'موتوسيكل', '', 'نعم', 'حالة ممتازة', '', 'القاهرة', ''],
  ]
}

async function template(track?: string | null) {
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()
  const aoa = [TEMPLATE_HEADER, ...sampleRows(track)]
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  ws['!cols'] = aoa[0].map(() => ({ wch: 20 }))
  const sheetName = track === 'services' ? 'الخدمات' : 'الأصناف'
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, 'madmona-bulk-template.xlsx')
}

const isPor = (v: unknown) => ['نعم', 'اه', 'آه', 'yes', 'true', '1', 'y'].includes(String(v ?? '').trim().toLowerCase())

export default function BulkExcelDrafts({
  initialName = '',
  initialPhone = '',
  track = null,
  onClose,
}: {
  initialName?: string
  initialPhone?: string
  track?: string | null
  onClose: () => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<'pick' | 'preview' | 'sending' | 'done'>('pick')
  const [rows, setRows] = useState<Row[]>([])
  const [fileName, setFileName] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [name, setName] = useState(initialName)
  const [phone, setPhone] = useState(initialPhone)
  const [biz, setBiz] = useState('')
  const [result, setResult] = useState<{ created: number; failed: number; errors: { row: number; error: string }[] } | null>(null)

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
      const out: Row[] = []
      for (let i = hIdx + 1; i < aoa.length; i++) {
        const raw = aoa[i] as unknown[]
        if (!raw || raw.every((c) => !String(c ?? '').trim())) continue
        const item: Row = { __row: i + 1 }
        for (const [idx, field] of Object.entries(cols)) {
          const v = String(raw[Number(idx)] ?? '').trim()
          item[field] = v || null
        }
        if (!item.title) item.__error = 'العنوان فاضي'
        else if (!isPor(item.price_on_request) && (!item.price || isNaN(Number(String(item.price).replace(/[,٬\s]/g, ''))))) {
          item.__error = 'السعر ناقص (أو اكتب "نعم" في اتصل للسعر)'
        }
        out.push(item)
      }
      if (out.length === 0) throw new Error('مفيش صفوف بيانات')
      if (out.length > 200) throw new Error('الحد الأقصى 200 صف')
      setRows(out)
      setStep('preview')
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'مقدرتش أقرأ الملف')
    }
  }

  async function submit() {
    setErr(null)
    if (!name.trim()) { setErr('اكتب اسمك'); return }
    if (!/^01\d{9}$/.test(phone.replace(/\D/g, '')) && !/^201\d{9}$/.test(phone.replace(/\D/g, ''))) {
      setErr('رقم واتساب غير صحيح (01xxxxxxxxx)'); return
    }
    setStep('sending')
    try {
      const res = await fetch('/api/listing-drafts/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact_name: name.trim(),
          contact_phone: phone.trim(),
          business_name: biz.trim() || null,
          items: valid.map((r) => ({
            title: r.title,
            category: r.category,
            price: r.price,
            price_on_request: r.price_on_request,
            description: r.description,
            district: r.district,
            city: r.city,
            photo_url: r.photo_url,
          })),
        }),
      })
      const j = await res.json()
      if (!res.ok || !j.success) throw new Error(j.error || 'حصل خطأ')
      setResult({ created: j.created, failed: j.failed, errors: j.errors || [] })
      setStep('done')
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'حصل خطأ في الإرسال')
      setStep('preview')
    }
  }

  return (
    <div className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" dir="rtl">
      <div className="bg-white w-full sm:max-w-2xl sm:rounded-3xl rounded-t-3xl shadow-2xl max-h-[92vh] flex flex-col">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <div className="w-10 h-10 rounded-2xl bg-[#2B4521]/10 flex items-center justify-center">
            <FileSpreadsheet className="w-5 h-5 text-[#2B4521]" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-black text-gray-900">ضيف كل أصنافك مرة واحدة (Excel)</h2>
            <p className="text-[11px] text-gray-500 font-bold">شيت واحد لحد ٢٠٠ صنف — فريقنا يراجع ويفعّل ويتواصل واتساب</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {step === 'pick' && (
            <div className="space-y-4">
              <button onClick={() => template(track)} className="w-full flex items-center gap-3 p-4 rounded-2xl border-2 border-dashed border-[#2B4521]/30 bg-[#2B4521]/5 hover:bg-[#2B4521]/10 transition">
                <Download className="w-5 h-5 text-[#2B4521]" />
                <span className="text-sm font-bold text-[#2B4521]">
                  {track === 'services' ? 'نزّل قالب الخدمات الجاهز (Excel)' : 'نزّل القالب الجاهز (Excel)'}
                </span>
              </button>
              <p className="text-[11px] text-gray-500 font-bold -mt-1 px-1">
                {track === 'services'
                  ? 'القالب فيه أمثلة خدمات (عيادات، صيانة، تجميل…) — كل صف = خدمة تتنشر لوحدها. غيّرهم ببياناتك.'
                  : track === 'rentals'
                    ? 'القالب فيه أمثلة معدّات إيجار — كل صف = صنف يتنشر لوحده. غيّرهم ببياناتك.'
                    : 'كل صف = إعلان يتنشر لوحده. غيّر الأمثلة اللي في القالب ببياناتك.'}
              </p>
              <div
                onClick={() => fileRef.current?.click()}
                className="cursor-pointer border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center hover:border-[#2B4521]/40 hover:bg-gray-50 transition"
              >
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm font-bold text-gray-700">اضغط لاختيار ملف Excel</p>
                <p className="text-[11px] text-gray-400 font-bold mt-1">.xlsx / .csv — الأعمدة: العنوان · الفئة · السعر · الوصف · المنطقة · الصورة</p>
                <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }} />
              </div>
              {err && <p className="flex items-center gap-2 text-red-600 bg-red-50 rounded-xl p-3 text-xs font-bold"><AlertCircle className="w-4 h-4" /> {err}</p>}
            </div>
          )}

          {(step === 'preview' || step === 'sending') && (
            <div className="space-y-4">
              <p className="text-xs font-bold text-gray-600">
                <FileSpreadsheet className="inline w-4 h-4 text-[#2B4521] ml-1" />
                {fileName} — <span className="text-[#2B4521]">{valid.length} صنف جاهز</span>
                {bad.length > 0 && <span className="text-red-500"> · {bad.length} صف فيه مشكلة (هيتخطى)</span>}
              </p>

              <div className="border border-gray-100 rounded-2xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-[#FAFAF7]"><tr>
                    <th className="px-3 py-2 text-right font-black text-gray-500">العنوان</th>
                    <th className="px-3 py-2 text-right font-black text-gray-500">الفئة</th>
                    <th className="px-3 py-2 text-right font-black text-gray-500">السعر</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {rows.slice(0, 6).map((r, i) => (
                      <tr key={i} className={r.__error ? 'bg-red-50/60' : ''}>
                        <td className="px-3 py-2 font-bold text-gray-700 max-w-[220px] truncate">{String(r.title ?? '—')}</td>
                        <td className="px-3 py-2 font-bold text-gray-700">{String(r.category ?? '—')}</td>
                        <td className="px-3 py-2 font-bold text-gray-700">{isPor(r.price_on_request) ? 'اتصل للسعر' : String(r.price ?? '—')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length > 6 && <p className="text-[10px] text-gray-400 font-bold text-center py-2 bg-gray-50">+ {rows.length - 6} صف كمان</p>}
              </div>

              {/* contact block */}
              <div className="bg-[#FAFAF7] rounded-2xl p-4 space-y-3">
                <p className="text-xs font-black text-gray-700">بيانات التواصل (عشان نفعّل الأصناف ونبعتلك)</p>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسمك *"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#2B4521] outline-none text-sm font-bold bg-white" />
                <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^\d+]/g, ''))} placeholder="رقم الواتساب * (01xxxxxxxxx)" dir="ltr"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#2B4521] outline-none text-sm font-bold bg-white text-left" />
                <input value={biz} onChange={(e) => setBiz(e.target.value)} placeholder="اسم النشاط / المعرض (اختياري)"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#2B4521] outline-none text-sm font-bold bg-white" />
              </div>

              {err && <p className="flex items-center gap-2 text-red-600 bg-red-50 rounded-xl p-3 text-xs font-bold"><AlertCircle className="w-4 h-4" /> {err}</p>}
            </div>
          )}

          {step === 'done' && result && (
            <div className="text-center py-6 space-y-3">
              <div className="w-16 h-16 mx-auto rounded-full bg-[#2B4521]/10 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-[#2B4521]" />
              </div>
              <h3 className="text-lg font-black text-gray-900">استلمنا {result.created} صنف 🎉</h3>
              <p className="text-sm font-bold text-gray-500 leading-relaxed">
                فريقنا هيراجعهم ويفعّلهم ويتواصل معاك على الواتساب خلال ساعات قليلة.
              </p>
              {result.failed > 0 && (
                <p className="text-[11px] font-bold text-amber-600 bg-amber-50 rounded-xl p-3">{result.failed} صف اتخطى (ناقص بيانات)</p>
              )}
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
          {step === 'pick' && (
            <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-600 text-sm font-black">إلغاء</button>
          )}
          {(step === 'preview' || step === 'sending') && (
            <>
              <button onClick={() => { setRows([]); setErr(null); setStep('pick') }} disabled={step === 'sending'}
                className="py-3 px-4 rounded-xl bg-gray-100 text-gray-600 text-sm font-black disabled:opacity-50">غيّر الملف</button>
              <button onClick={submit} disabled={step === 'sending' || valid.length === 0}
                className="flex-1 py-3 rounded-xl bg-[#2B4521] text-white text-sm font-black disabled:opacity-50 flex items-center justify-center gap-2">
                {step === 'sending' ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري الإرسال...</> : <><ArrowRight className="w-4 h-4" /> ابعت {valid.length} صنف</>}
              </button>
            </>
          )}
          {step === 'done' && (
            <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-[#2B4521] text-white text-sm font-black">تمام</button>
          )}
        </div>
      </div>
    </div>
  )
}
